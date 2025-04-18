import * as vscode from 'vscode';
import * as path from 'path';

// AST libraries for code parsing and generation
import * as acorn from 'acorn';
import { simple as walkSimple } from 'acorn-walk';
import * as escodegen from "escodegen";

import { modifyAstAndGenerateCode, parseAst } from '../utils/astUtils';


export async function applyFixTimeoutIssue(issue: string) {
    console.log(issue);

    const file = issue.split(" - ")[0].trim(); // Extract filename
    const fileName = path.basename(file);

    // Ensure a workspace is open before proceeding
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {return null;}

    const directory = workspaceFolders[0].uri.fsPath;
    const filePath = path.join(directory, fileName);

    try {
        // Open and read the file
        const document = await vscode.workspace.openTextDocument(filePath);
        const text = document.getText();

        // Convert the code to an AST
        const ast = acorn.parse(text, { ecmaVersion: 'latest', sourceType: 'module' });

        // Modify the AST if timeout is missing
        const fixedCode = fixTimeoutIssues(ast, filePath);

        if (fixedCode.length === 0) {
            vscode.window.showInformationMessage(`No changes needed in ${filePath}.`);
            return;
        }

        // Apply and save the updated content in VS Code
        const edit = new vscode.WorkspaceEdit();
        const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(text.length));
        edit.replace(document.uri, fullRange, fixedCode);
        await vscode.workspace.applyEdit(edit);

        vscode.window.showInformationMessage(`✅ Timeout issue fixed in ${filePath}.`);
    } catch (error) {
        vscode.window.showErrorMessage(`❌ Error fixing timeout issue: ${error}`);
    }
}

//Detects and adds `timeout` to Axios request configurations if missing.
function fixTimeoutIssues(ast: any, file: string): string {
    let codeModified = false;

    //find Axios calls
    walkSimple(ast, {
        CallExpression(node) {
            if (
                node.callee.type === "MemberExpression" &&
                node.callee.object.type === "Identifier" &&
                node.callee.object.name === "axios"
            ) {
                let hasTimeout = false;
                let configObject = null;

                // Check if second argument is a config object
                if (node.arguments.length > 1) {
                    configObject = node.arguments[1];

                    if (
                        configObject.type === "ObjectExpression" &&
                        configObject.properties.some(
                            (prop) =>
                                prop.type === "Property" &&
                                prop.key.type === "Identifier" &&
                                prop.key.name === "timeout"
                        )
                    ) {
                        hasTimeout = true;
                    }
                }

                if (!hasTimeout) {
                    const start = node.start ?? 0;
                    const end = node.end ?? 0;

                    if (!configObject || configObject.type !== "ObjectExpression") {
                        // If there is no config object, create a new one with the timeout property
                        node.arguments.push({
                            type: "ObjectExpression",
                            properties: [
                                {
                                    type: "Property",
                                    key: { type: "Identifier", name: "timeout", start, end },
                                    value: { type: "Literal", value: 5000, start, end },
                                    kind: "init",
                                    method: false,
                                    shorthand: false,
                                    computed: false,
                                    start,
                                    end,
                                },
                            ],
                            start,
                            end,
                        });
                    } else {
                        // If a config object exists, append the timeout property to it
                        configObject.properties.push({
                            type: "Property",
                            key: { type: "Identifier", name: "timeout", start, end },
                            value: { type: "Literal", value: 5000, start, end },
                            kind: "init",
                            method: false,
                            shorthand: false,
                            computed: false,
                            start,
                            end,
                        });
                    }

                    codeModified = true;
                }
            }
        },
    });

    return codeModified ? escodegen.generate(ast) : "";
}

//Dispatcher-compatible entry point to apply timeout fix logic from a file path.
export async function applyFix(filePath: string): Promise<string> {
    const document = await vscode.workspace.openTextDocument(filePath);
    const text = document.getText();

    const fixedCode = fixTimeoutIssues
        ? fixTimeoutIssues(parseAst(text), filePath)
        : text;

    return fixedCode || text;
}
