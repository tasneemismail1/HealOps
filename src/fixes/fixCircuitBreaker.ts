import * as vscode from 'vscode';
import * as path from 'path';
import * as acorn from 'acorn';
import { simple as walkSimple } from 'acorn-walk';
import { ancestor as walkAncestor } from "acorn-walk";
import * as escodegen from "escodegen";

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
    let codeModified = false;
    let hasCircuitBreakerImport = false;
    let breakerVar: string | null = null;

    // Step 1: Check for existing import of `opossum`
    walkAncestor(ast, {
        ImportDeclaration(node: any) {
            if (node.source.value === "opossum") {
                hasCircuitBreakerImport = true;
            }
        }
    });

    // Step 2: Detect API calls inside functions and wrap with CircuitBreaker
    walkAncestor(ast, {
        FunctionDeclaration(node: any, ancestors: any[]) {
            let functionName = node.id.name;
            breakerVar = `${functionName}Breaker`;

            walkSimple(node, {
                CallExpression(innerNode) {
                    if (
                        innerNode.callee.type === "Identifier" &&
                        (innerNode.callee.name === "fetch" || innerNode.callee.name === "axios")
                    ) {
                        console.log(`Found API call (${innerNode.callee.name}) in ${file}`);

                        // Step 3: Define CircuitBreaker instance **outside function scope**
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
                                            {
                                                type: "ArrowFunctionExpression",
                                                params: [],
                                                body: innerNode, // Preserve the existing API call
                                                async: true,
                                            },
                                            {
                                                type: "ObjectExpression",
                                                properties: [
                                                    { type: "Property", key: { type: "Identifier", name: "timeout" }, value: { type: "Literal", value: 5000 } },
                                                    { type: "Property", key: { type: "Identifier", name: "errorThresholdPercentage" }, value: { type: "Literal", value: 50 } },
                                                    { type: "Property", key: { type: "Identifier", name: "resetTimeout" }, value: { type: "Literal", value: 10000 } },
                                                ],
                                            },
                                        ],
                                    },
                                },
                            ],
                            kind: "const",
                        };

                        if (!codeModified) {
                            ast.body.unshift(breakerDeclaration);
                        }

                        // Step 4: Replace API call with breaker.fire()
                        const circuitBreakerCall = {
                            type: "AwaitExpression",
                            argument: {
                                type: "CallExpression",
                                callee: {
                                    type: "MemberExpression",
                                    object: { type: "Identifier", name: breakerVar },
                                    property: { type: "Identifier", name: "fire" },
                                },
                                arguments: [],
                            },
                        };

                        Object.assign(innerNode, circuitBreakerCall);
                        codeModified = true;
                    }
                }
            });
        }
    });

    // Step 5: Add `opossum` import if missing
    if (!hasCircuitBreakerImport) {
        return `const CircuitBreaker = require('opossum');\n\n` + escodegen.generate(ast);
    }

    return escodegen.generate(ast);
}
