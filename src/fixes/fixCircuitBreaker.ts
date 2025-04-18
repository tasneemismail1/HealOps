import * as vscode from 'vscode';
import * as path from 'path';

// Acorn to parse JavaScript/TypeScript into AST
import * as acorn from 'acorn';
import { ancestor as walkAncestor } from "acorn-walk";

// ESTree-compliant code generator for turning AST back into JS code
import * as escodegen from "escodegen";
import * as estree from 'estree';
import { modifyAstAndGenerateCode, parseAst } from '../utils/astUtils';

//apply a circuit breaker fix on a given issue.
export async function applyFixCircuitBreakerIssue(issue: string) {
    console.log("Fixing circuit breaker issue for:", issue);

    // Extract file name from issue string
    const file = issue.split(" - ")[0].trim();
    const fileName = path.basename(file);

    // Validate workspace context
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        console.error("No workspace folders found.");
        return null;
    }

    // Build full path to the target file
    const directory = workspaceFolders[0].uri.fsPath;
    const filePath = path.join(directory, fileName);

    try {
        // Open and parse the target file
        const document = await vscode.workspace.openTextDocument(filePath);
        const text = document.getText();
        const ast = acorn.parse(text, { ecmaVersion: 'latest', sourceType: 'module' });

        // Apply transformation and generate updated code
        const fixedCode = fixCircuitBreakerIssues(ast, filePath);

        if (fixedCode.length === 0) {
            vscode.window.showInformationMessage(`No changes needed in ${filePath}.`);
            return;
        }

        // Replace the entire file content with the new code
        const edit = new vscode.WorkspaceEdit();
        const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(text.length));
        edit.replace(document.uri, fullRange, fixedCode);

        await vscode.workspace.applyEdit(edit);
        vscode.window.showInformationMessage(`✅ Circuit breaker applied in ${filePath}.`);
    } catch (error) {
        vscode.window.showErrorMessage(`❌ Error fixing circuit breaker issue: ${error}`);
    }
}

//Applies circuit breaker transformation logic to axios/fetch calls
function fixCircuitBreakerIssues(ast: any, file: string): string {
    let breakerCount = 1;
    let hasCircuitBreakerImport = false;
    let codeModified = false;
    const axiosMethods = ['get', 'post', 'put', 'delete', 'patch'];

    const breakerDeclarations: estree.Statement[] = [];
    const breakerFnDeclarations: estree.Statement[] = [];

    // Step 1: Check if 'opossum' is already imported
    walkAncestor(ast, {
        ImportDeclaration(node: any) {
            if (node.source.value === "opossum") {
                hasCircuitBreakerImport = true;
            }
        }
    });

    // Step 2: Look for axios/fetch API calls to wrap
    walkAncestor(ast, {
        CallExpression(node: any, ancestors: any[]) {
            // Skip calls already wrapped with breaker.fire()
            if (
                node.callee?.type === "MemberExpression" &&
                node.callee.property?.type === "Identifier" &&
                node.callee.property.name === "fire"
            ) {
                return;
            }

            let shouldWrap = false;
            let label = '';

            // Detect axios.<method>()
            if (
                node.callee?.type === "MemberExpression" &&
                node.callee.object?.name === "axios" &&
                axiosMethods.includes(node.callee.property?.name)
            ) {
                shouldWrap = true;
                label = `axios.${node.callee.property.name}`;
            }

            // Detect fetch()
            if (node.callee?.type === "Identifier" && node.callee.name === "fetch") {
                shouldWrap = true;
                label = "fetch";
            }

            if (!shouldWrap) {return;}

            // Generate unique circuit breaker and function identifiers
            const breakerVar = `breaker${breakerCount++}`;
            const breakerFn = `${breakerVar}Fn`;

            // Generate fire() call
            const fireCall = {
                type: "AwaitExpression",
                argument: {
                    type: "CallExpression",
                    callee: {
                        type: "MemberExpression",
                        object: { type: "Identifier", name: breakerVar },
                        property: { type: "Identifier", name: "fire" }
                    },
                    arguments: []
                }
            };

            // Create arrow function that wraps the original API call
            const apiFnDeclaration = {
                type: "VariableDeclaration",
                declarations: [
                    {
                        type: "VariableDeclarator",
                        id: { type: "Identifier", name: breakerFn },
                        init: {
                            type: "ArrowFunctionExpression",
                            async: true,
                            params: [],
                            body: node
                        }
                    }
                ],
                kind: "const"
            };

            // Create breaker instance using opossum configuration
            const breakerDeclaration = {
                type: "VariableDeclaration",
                declarations: [
                    {
                        type: "VariableDeclarator",
                        id: { type: "Identifier", name: breakerVar },
                        init: {
                            type: "NewExpression",
                            callee: { type: "Identifier", name: "CircuitBreaker" },
                            arguments: [
                                { type: "Identifier", name: breakerFn },
                                {
                                    type: "ObjectExpression",
                                    properties: [
                                        {
                                            type: "Property",
                                            key: { type: "Identifier", name: "timeout" },
                                            value: { type: "Literal", value: 5000 },
                                            kind: "init"
                                        },
                                        {
                                            type: "Property",
                                            key: { type: "Identifier", name: "errorThresholdPercentage" },
                                            value: { type: "Literal", value: 50 },
                                            kind: "init"
                                        },
                                        {
                                            type: "Property",
                                            key: { type: "Identifier", name: "resetTimeout" },
                                            value: { type: "Literal", value: 10000 },
                                            kind: "init"
                                        }
                                    ]
                                }
                            ]
                        }
                    }
                ],
                kind: "const"
            };

            // Collect generated AST nodes for insertion
            breakerFnDeclarations.push(apiFnDeclaration as estree.VariableDeclaration);
            breakerDeclarations.push(breakerDeclaration as estree.VariableDeclaration);

            // Step 3: Replace the original API call with breaker.fire()
            const parent = ancestors[ancestors.length - 2];
            const grandParent = ancestors[ancestors.length - 3];

            if (parent?.type === "VariableDeclarator") {
                parent.init = fireCall;
                codeModified = true;
            } else if (parent?.type === "AwaitExpression") {
                Object.assign(parent, fireCall);
                codeModified = true;
            } else if (parent?.type === "ExpressionStatement") {
                parent.expression = fireCall;
                codeModified = true;
            } else if (parent?.type === "ArrowFunctionExpression") {
                parent.body = fireCall;
                codeModified = true;
            } else if (parent?.type === "BlockStatement" && Array.isArray(parent.body)) {
                const targetIndex = parent.body.findIndex((n: any) => n === grandParent);
                if (targetIndex !== -1) {
                    parent.body[targetIndex] = {
                        type: "ExpressionStatement",
                        expression: fireCall
                    };
                    codeModified = true;
                }
            } else {
                console.warn(`⚠️ Unhandled parent type for ${label}: ${parent?.type}`);
            }
        }
    });

    // Step 4: Insert circuit breaker declarations before non-import statements
    const firstNonImportIndex = ast.body.findIndex((stmt: any) => stmt.type !== "ImportDeclaration");
    ast.body.splice(firstNonImportIndex, 0, ...breakerFnDeclarations, ...breakerDeclarations);

    // Step 5: Generate final JavaScript code from the modified AST
    let generatedCode = "";
    try {
        generatedCode = escodegen.generate(ast);
    } catch (err) {
        console.error("❌ Code generation error:", err);
        return "";
    }

    // Step 6: Add require statement for opossum if it's not already present
    const hasRequireOpossum = generatedCode.includes("require('opossum')");
    const hasImportOpossum = generatedCode.includes("from 'opossum'");

    if (!hasCircuitBreakerImport && !hasRequireOpossum && !hasImportOpossum) {
        generatedCode = `const CircuitBreaker = require('opossum');\n\n${generatedCode}`;
    }

    return codeModified ? generatedCode : "";
}


//Applies circuit breaker fix logic to a given file.
export async function applyFix(filePath: string): Promise<string> {
    const document = await vscode.workspace.openTextDocument(filePath);
    const text = document.getText();

    const fixedCode = fixCircuitBreakerIssues
        ? fixCircuitBreakerIssues(parseAst(text), filePath)
        : text;

    return fixedCode || text;
}
