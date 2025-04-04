// VS Code APIs to manipulate documents and provide user feedback
import * as vscode from 'vscode';
import * as path from 'path';

// AST parsing and traversal tools
import * as acorn from 'acorn';
import { simple as walkSimple } from 'acorn-walk';
import * as escodegen from "escodegen";

// Custom AST utilities
import { parseAst, modifyAstAndGenerateCode } from '../utils/astUtils';

/**
 * Safely wraps fetch/axios calls inside retry logic using AST manipulation.
 * Detects if a retry label or argument is missing and modifies accordingly.
 * 
 * @param originalCode - The raw source code string
 * @returns Modified code with retry enhancement if needed
 */
export function getFixedCodeRetry(originalCode: string): string {
  const ast = parseAst(originalCode);

  const modifiedCode = modifyAstAndGenerateCode(ast, (node: any) => {
    return (
      node.type === 'CallExpression' &&
      node.callee.name === 'fetchData' &&
      !node.arguments.some((arg: { type: string; value: string; }) =>
        arg.type === 'Literal' && arg.value === 'retry'
      )
    );
  });

  return modifiedCode || originalCode;
}

/**
 * Applies the retry logic fix to a file where the issue was detected.
 * Looks for axios/fetch inside try-catch blocks and wraps them in retry loops.
 * 
 * @param issue - The issue string in the format "filename - description"
 */
export async function applyFixRetryIssue(issue: string) {
    console.log("Fixing retry issue for:", issue);

    // Extract file path and name from the issue
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
        // Open the target file and get its content
        const document = await vscode.workspace.openTextDocument(filePath);
        const text = document.getText();

        // Parse into an AST for modification
        const ast = acorn.parse(text, { ecmaVersion: 'latest', sourceType: 'module' });

        // Generate the modified code with retry logic
        const fixedCode = fixRetryIssues(ast, filePath);

        if (fixedCode.length === 0) {
            vscode.window.showInformationMessage(`No changes needed in ${filePath}.`);
            return;
        }

        // Apply the changes to the file inside VS Code
        const edit = new vscode.WorkspaceEdit();
        const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(text.length));
        edit.replace(document.uri, fullRange, fixedCode);

        await vscode.workspace.applyEdit(edit);
        vscode.window.showInformationMessage(`✅ Retry issue fixed in ${filePath}.`);
    } catch (error) {
        vscode.window.showErrorMessage(`❌ Error fixing retry issue: ${error}`);
    }
}

/**
 * Rewrites the AST to wrap fetch/axios calls inside retry loops if missing.
 * This provides fault tolerance by retrying the API call 3 times before failing.
 * 
 * @param ast - Parsed AST object from Acorn
 * @param file - The file name (used only for logging)
 * @returns string - Modified JavaScript code with retry logic injected
 */
function fixRetryIssues(ast: any, file: string): string {
    let codeModified = false;

    walkSimple(ast, {
        TryStatement(node) {
            if (node.block?.body) {
                node.block.body.forEach((statement: any, index: number, bodyArray: any[]) => {
                    // Look for API calls within try blocks
                    if (statement.type === "ExpressionStatement" && statement.expression.type === "CallExpression") {
                        const isApiCall =
                            statement.expression.callee.type === "MemberExpression" &&
                            (statement.expression.callee.object.name === "fetch" ||
                             statement.expression.callee.object.name === "axios");

                        if (isApiCall) {
                            console.log(`Adding retry logic to API call in ${file}`);

                            // Declare `let retries = 3;`
                            const retryVariable = {
                                type: "VariableDeclaration",
                                declarations: [{
                                    type: "VariableDeclarator",
                                    id: { type: "Identifier", name: "retries" },
                                    init: { type: "Literal", value: 3 }
                                }],
                                kind: "let"
                            };

                            // Create retry loop: while (retries > 0) { try { ... } catch { ... } }
                            const retryLoop = {
                                type: "WhileStatement",
                                test: {
                                    type: "BinaryExpression",
                                    operator: ">",
                                    left: { type: "Identifier", name: "retries" },
                                    right: { type: "Literal", value: 0 }
                                },
                                body: {
                                    type: "BlockStatement",
                                    body: [
                                        {
                                            type: "TryStatement",
                                            block: {
                                                type: "BlockStatement",
                                                body: [
                                                    statement, // insert API call
                                                    { type: "BreakStatement" } // exit loop on success
                                                ]
                                            },
                                            handler: {
                                                type: "CatchClause",
                                                param: { type: "Identifier", name: "err" },
                                                body: {
                                                    type: "BlockStatement",
                                                    body: [
                                                        {
                                                            type: "ExpressionStatement",
                                                            expression: {
                                                                type: "AssignmentExpression",
                                                                operator: "-=",
                                                                left: { type: "Identifier", name: "retries" },
                                                                right: { type: "Literal", value: 1 }
                                                            }
                                                        },
                                                        {
                                                            type: "ExpressionStatement",
                                                            expression: {
                                                                type: "CallExpression",
                                                                callee: {
                                                                    type: "MemberExpression",
                                                                    object: { type: "Identifier", name: "console" },
                                                                    property: { type: "Identifier", name: "log" }
                                                                },
                                                                arguments: [
                                                                    { type: "Literal", value: "Retrying API call..." },
                                                                    { type: "Identifier", name: "retries" }
                                                                ]
                                                            }
                                                        }
                                                    ]
                                                }
                                            }
                                        }
                                    ]
                                }
                            };

                            // Inject before the current statement
                            bodyArray.splice(index, 0, retryVariable, retryLoop);
                            bodyArray.splice(index + 2, 1); // Remove original API call

                            codeModified = true;
                        }
                    }
                });
            }
        }
    });

    if (!codeModified) {
        console.log(`No modifications made for retry logic in ${file}`);
        return "";
    }

    return escodegen.generate(ast, { format: { indent: { style: "  " } } });
}

/**
 * Utility method used by dispatcher to apply retry fix from a raw file path.
 */
export async function applyFix(filePath: string): Promise<string> {
    const document = await vscode.workspace.openTextDocument(filePath);
    const text = document.getText();

    const fixedCode = fixRetryIssues
        ? fixRetryIssues(acorn.parse(text, { ecmaVersion: 'latest', sourceType: 'module' }), filePath)
        : text;

    return fixedCode || text;
}
