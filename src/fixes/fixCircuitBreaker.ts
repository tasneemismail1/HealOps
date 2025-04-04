import * as vscode from 'vscode';
import * as path from 'path';
import * as acorn from 'acorn';
import { ancestor as walkAncestor } from "acorn-walk";
import * as escodegen from "escodegen";
import * as estree from 'estree';
import { modifyAstAndGenerateCode, parseAst } from '../utils/astUtils';

export async function applyFixCircuitBreakerIssue(issue: string) {
    console.log("Fixing circuit breaker issue for:", issue);

    const file = issue.split(" - ")[0].trim();
    const fileName = path.basename(file);

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        console.error("No workspace folders found.");
        return null;
    }

    const directory = workspaceFolders[0].uri.fsPath;
    const filePath = path.join(directory, fileName);

    try {
        const document = await vscode.workspace.openTextDocument(filePath);
        const text = document.getText();
        const ast = acorn.parse(text, { ecmaVersion: 'latest', sourceType: 'module' });

        const fixedCode = fixCircuitBreakerIssues(ast, filePath);

        if (fixedCode.length === 0) {
            vscode.window.showInformationMessage(`No changes needed in ${filePath}.`);
            return;
        }

        const edit = new vscode.WorkspaceEdit();
        const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(text.length));
        edit.replace(document.uri, fullRange, fixedCode);

        await vscode.workspace.applyEdit(edit);
        vscode.window.showInformationMessage(`✅ Circuit breaker applied in ${filePath}.`);
    } catch (error) {
        vscode.window.showErrorMessage(`❌ Error fixing circuit breaker issue: ${error}`);
    }
}

function fixCircuitBreakerIssues(ast: any, file: string): string {
    let breakerCount = 1;
    let hasCircuitBreakerImport = false;
    let codeModified = false;
    const axiosMethods = ['get', 'post', 'put', 'delete', 'patch'];

    const breakerDeclarations: estree.Statement[] = [];
    const breakerFnDeclarations: estree.Statement[] = [];

    // Step 1: Check if opossum is already imported
    walkAncestor(ast, {
        ImportDeclaration(node: any) {
            if (node.source.value === "opossum") {
                hasCircuitBreakerImport = true;
            }
        }
    });

    // Step 2: Walk through CallExpressions
    walkAncestor(ast, {
        CallExpression(node: any, ancestors: any[]) {
            // ❌ Skip if already breaker.fire()
            if (
                node.callee?.type === "MemberExpression" &&
                node.callee.property?.type === "Identifier" &&
                node.callee.property.name === "fire"
            ) {
                return;
            }

            let shouldWrap = false;
            let label = '';

            // ✅ axios call
            if (
                node.callee?.type === "MemberExpression" &&
                node.callee.object?.name === "axios" &&
                axiosMethods.includes(node.callee.property?.name)
            ) {
                shouldWrap = true;
                label = `axios.${node.callee.property.name}`;
            }

            // ✅ fetch call
            if (node.callee?.type === "Identifier" && node.callee.name === "fetch") {
                shouldWrap = true;
                label = "fetch";
            }

            if (!shouldWrap) return;

            const breakerVar = `breaker${breakerCount++}`;
            const breakerFn = `${breakerVar}Fn`;

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

            // Breaker function
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

            // Breaker instance
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

            // Collect for ordered insertion
            breakerFnDeclarations.push(apiFnDeclaration as estree.VariableDeclaration);
breakerDeclarations.push(breakerDeclaration as estree.VariableDeclaration);

            

            // Replace API call with breaker.fire()
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

    // Step 3: Insert all breaker declarations in order
    const firstNonImportIndex = ast.body.findIndex((stmt: any) => stmt.type !== "ImportDeclaration");
    ast.body.splice(firstNonImportIndex, 0, ...breakerFnDeclarations, ...breakerDeclarations);

    // Step 4: Generate output
    // Step 5: Generate final code
let generatedCode = "";
try {
    generatedCode = escodegen.generate(ast);
} catch (err) {
    console.error("❌ Code generation error:", err);
    return "";
}

// ✅ Add require statement if not imported yet
const hasRequireOpossum = generatedCode.includes("require('opossum')");
const hasImportOpossum = generatedCode.includes("from 'opossum'");

if (!hasCircuitBreakerImport && !hasRequireOpossum && !hasImportOpossum) {
    generatedCode = `const CircuitBreaker = require('opossum');\n\n${generatedCode}`;
}

return codeModified ? generatedCode : "";

    
}









export function getFixedCodeCircuitBreaker(originalCode: string): string {
    const ast = parseAst(originalCode);

    const modifiedCode = modifyAstAndGenerateCode(ast, (node: any) => {
        return false;
    });

    return modifiedCode || originalCode;
}

export async function applyFix(filePath: string): Promise<string> {
    const document = await vscode.workspace.openTextDocument(filePath);
    const text = document.getText();

    const fixedCode = fixCircuitBreakerIssues
        ? fixCircuitBreakerIssues(parseAst(text), filePath)
        : text;

    return fixedCode || text;
}