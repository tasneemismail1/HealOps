import * as vscode from 'vscode';
import * as path from 'path';
import * as acorn from 'acorn';
import { simple as walkSimple } from 'acorn-walk';
import * as escodegen from "escodegen";

export async function applyFixRetryIssue(issue: string) {
    console.log("Fixing retry issue for:", issue);

    // Extract the file path from the reported issue
    const file = issue.split(" - ")[0].trim();
    console.log("Extracted File Path:", file);

    const fileName = path.basename(file);
    console.log("Extracted File Name:", fileName);

    // Ensure a workspace is open
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        console.error("No workspace folders found.");
        return null;
    }

    // Get the workspace directory
    const directory = workspaceFolders[0].uri.fsPath;
    console.log("Workspace Directory:", directory);

    // Construct the full file path
    const filePath = path.join(directory, fileName);
    console.log("Final File Path:", filePath);

    try {
        // Open and read the file content
        const document = await vscode.workspace.openTextDocument(filePath);
        const text = document.getText();
        console.log("Original Code:", text);

        // Parse the file content into an AST (Abstract Syntax Tree) using Acorn
        const ast = acorn.parse(text, { ecmaVersion: 'latest', sourceType: 'module' });

        // Apply the retry logic fix
        const fixedCode = fixRetryIssues(ast, filePath);

        // If no modifications were made, inform the user
        if (fixedCode.length === 0) {
            vscode.window.showInformationMessage(`No changes needed in ${filePath}.`);
            console.log("No modifications detected.");
            return;
        }

        // Apply the fixed code to the document in VSCode
        const edit = new vscode.WorkspaceEdit();
        const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(text.length));
        edit.replace(document.uri, fullRange, fixedCode);

        await vscode.workspace.applyEdit(edit);
        vscode.window.showInformationMessage(`✅ Retry issue fixed in ${filePath}.`);
        console.log("Fix applied successfully.");
    } catch (error) {
        // Handle any errors that occur during the process
        vscode.window.showErrorMessage(`❌ Error fixing retry issue: ${error}`);
        console.error("Error fixing retry issue:", error);
    }
}

/**
 * Adds retry logic around detected API calls.
 */
function fixRetryIssues(ast: any, file: string): string {
    let codeModified = false; // Track if any modifications were made

    walkSimple(ast, {
        TryStatement(node) {
            if (node.block && node.block.body) {
                // Iterate through the statements inside the try block
                node.block.body.forEach((statement: any, index: number, bodyArray: any[]) => {
                    // Ensure the statement is a function call (API request)
                    if (statement.type === "ExpressionStatement" && statement.expression.type === "CallExpression") {
                        const isApiCall =
                            statement.expression.callee.type === "MemberExpression" &&
                            (statement.expression.callee.object.name === "fetch" ||
                                statement.expression.callee.object.name === "axios"); // Detect fetch or axios API calls

                        if (isApiCall) {
                            console.log(`Adding retry logic to API call in ${file}`);

                            // Create a variable to store retry attempts
                            const retryVariable = {
                                type: "VariableDeclaration",
                                declarations: [
                                    {
                                        type: "VariableDeclarator",
                                        id: { type: "Identifier", name: "retries" },
                                        init: { type: "Literal", value: 3 }
                                    }
                                ],
                                kind: "let"
                            };

                            // Construct the retry loop
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
                                                    statement, // Place the existing API call inside the try block
                                                    {
                                                        type: "BreakStatement" // Exit loop on success
                                                    }
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

                            // Insert retry logic before the API call
                            bodyArray.splice(index, 0, retryVariable, retryLoop);

                            // Remove the original API call (since it's inside the loop now)
                            bodyArray.splice(index + 2, 1);

                            codeModified = true;
                        }
                    }
                });
            }
        }
    });

    // If no modifications were made, return an empty string (no changes)
    if (!codeModified) {
        console.log(`No modifications made for retry logic in ${file}`);
        return "";
    }

    // Generate and return the modified code with retry logic added
    console.log("Generated fixed code:", escodegen.generate(ast, { format: { indent: { style: "  " } } }));
    return escodegen.generate(ast, { format: { indent: { style: "  " } } });
}
