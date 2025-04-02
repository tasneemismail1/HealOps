import * as vscode from 'vscode';
import * as path from 'path';
import * as acorn from 'acorn';
import { simple as walkSimple } from 'acorn-walk';
import * as escodegen from "escodegen";
import { modifyAstAndGenerateCode, parseAst } from '../utils/astUtils';

export function getFixedCodeTimeout(originalCode: string): string {
    const ast = parseAst(originalCode);
  
    const modifiedCode = modifyAstAndGenerateCode(ast, (node: any) => {
      // TODO: Replace this condition with real logic for timeout
      return false;
    });
  
    return modifiedCode || originalCode;
  }
  

export async function applyFixTimeoutIssue(issue: string) {
    // Log the issue being processed
    console.log(issue);

    // Extract the filename from the issue report (everything before " - ")
    const file = issue.split(" - ")[0].trim();
    console.log("File:", file);

    const fileName = path.basename(file);
    console.log("File name:", fileName);

    // Ensure a workspace is open
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        return null;
    }

    // Get the workspace directory
    const directory = workspaceFolders[0].uri.fsPath;
    console.log("Directory:", directory);

    // Construct the full file path
    const filePath = path.join(directory, fileName);
    console.log("File path:", filePath);

    try {
        // Open and read the file content
        const document = await vscode.workspace.openTextDocument(filePath);
        const text = document.getText();

        // Parse the file content into an AST (Abstract Syntax Tree) using Acorn
        const ast = acorn.parse(text, { ecmaVersion: 'latest', sourceType: 'module' });

        // Apply the timeout fix
        const fixedCode = fixTimeoutIssues(ast, filePath);

        // If no modifications were made, inform the user
        if (fixedCode.length === 0) {
            vscode.window.showInformationMessage(`No changes needed in ${filePath}.`);
            return;
        }

        // Apply the fixed code to the document in VSCode
        const edit = new vscode.WorkspaceEdit();
        const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(text.length));
        edit.replace(document.uri, fullRange, fixedCode);

        await vscode.workspace.applyEdit(edit);
        vscode.window.showInformationMessage(`✅ Timeout issue fixed in ${filePath}.`);
    } catch (error) {
        // Handle any errors that occur during the process
        vscode.window.showErrorMessage(`❌ Error fixing timeout issue: ${error}`);
    }
}


function fixTimeoutIssues(ast: any, file: string): string {
    let codeModified = false; // Track if any modifications were made

    // Traverse the AST to detect Axios calls
    walkSimple(ast, {
        CallExpression(node) {
            // Check if the function call is an Axios request
            if (node.callee.type === "MemberExpression" &&
                node.callee.object.type === "Identifier" &&
                node.callee.object.name === "axios") {

                let hasTimeout = false;
                let configObject = null;

                // If Axios request has more than one argument, check the second argument (config object)
                if (node.arguments.length > 1) {
                    configObject = node.arguments[1];

                    // Check if the config object contains a "timeout" property
                    if (configObject.type === "ObjectExpression" &&
                        configObject.properties.some((prop) =>
                            prop.type === "Property" &&
                            prop.key.type === "Identifier" &&
                            prop.key.name === "timeout")) {
                        hasTimeout = true;
                    }
                }

                // If timeout is missing, add it to the request configuration
                if (!hasTimeout) {
                    // Infer `start` and `end` values from existing nodes to maintain structure
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
                    codeModified = true; // Mark modification as true
                }
            }
        },
    });

    // If modifications were made, return the updated code; otherwise, return an empty string
    return codeModified ? escodegen.generate(ast, { format: { indent: { style: "  " } } }) : "";
}