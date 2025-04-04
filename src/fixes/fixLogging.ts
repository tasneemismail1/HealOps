// Import required modules from VS Code, Node, and AST libraries
import * as vscode from 'vscode';
import * as path from 'path';
import { simple as walkSimple } from 'acorn-walk';
import * as acorn from 'acorn';
import * as escodegen from 'escodegen';
import { getAllJsTsFiles } from '../utils/fileUtils';
import { modifyAstAndGenerateCode, parseAst } from '../utils/astUtils';

/**
 * Main function to fix missing logging inside catch blocks of try-catch statements.
 * Ensures that every catch block logs the caught error using `console.error(...)`.
 *
 * @param issue - A string describing the issue (e.g. "file.js - Missing logging in try-catch block.")
 */
export async function applyFixLoggingIssue(issue: string) {
    // Check if VS Code workspace is open
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showErrorMessage('No workspace found.');
        return;
    }

    // Extract file name from issue message
    const match = issue.match(/^(.+?) - /);
    if (!match) {
        vscode.window.showErrorMessage('❌ Invalid issue format.');
        return;
    }

    const fileName = match[1].trim();
    const projectRoot = workspaceFolders[0].uri.fsPath;

    // Find the full path of the file using our utility
    const allFiles = getAllJsTsFiles(projectRoot);
    const filePath = allFiles.find(file => path.basename(file) === fileName);

    if (!filePath) {
        vscode.window.showErrorMessage(`❌ Error: File not found in workspace - ${fileName}`);
        return;
    }

    try {
        // Read and parse the file
        const document = await vscode.workspace.openTextDocument(filePath);
        const text = document.getText();

        // Apply fix to inject logging into catch blocks
        const fixedCode = fixLoggingIssues(text);

        // If nothing changed, notify the user
        if (fixedCode === text) {
            vscode.window.showInformationMessage(`✅ No changes needed in ${filePath}.`);
            return;
        }

        // Replace the file's content with the modified version
        const edit = new vscode.WorkspaceEdit();
        const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(text.length));
        edit.replace(document.uri, fullRange, fixedCode);

        await vscode.workspace.applyEdit(edit);
        vscode.window.showInformationMessage(`✅ Logging issue fixed in ${filePath}.`);
    } catch (error) {
        vscode.window.showErrorMessage(`❌ Error fixing logging issue: ${error}`);
    }
}

/**
 * Modifies the AST of the provided file content to ensure all catch blocks include logging.
 * If a catch block does not contain any console logging, it injects `console.error(...)`.
 * 
 * @param fileContent - The original source code as a string
 * @returns string - Modified code with logging fixes applied, or original if unchanged
 */
export function fixLoggingIssues(fileContent: string): string {
    const ast = acorn.parse(fileContent, { ecmaVersion: 'latest', sourceType: 'module' });
    let codeModified = false;

    // Traverse the AST to find TryStatements and inspect their catch blocks
    walkSimple(ast, {
        TryStatement(node: any) {
            const catchBlock = node.handler;

            if (catchBlock && catchBlock.body?.body) {
                // Check if the catch block already includes a console logging call
                const hasLogging = catchBlock.body.body.some((stmt: any) =>
                    stmt.type === 'ExpressionStatement' &&
                    stmt.expression.type === 'CallExpression' &&
                    stmt.expression.callee.type === 'MemberExpression' &&
                    stmt.expression.callee.object.name === 'console'
                );

                if (!hasLogging) {
                    const errVar = catchBlock.param?.name || 'error';

                    // Inject `console.error('Error:', error);` at the beginning of the catch block
                    catchBlock.body.body.unshift({
                        type: 'ExpressionStatement',
                        expression: {
                            type: 'CallExpression',
                            callee: {
                                type: 'MemberExpression',
                                object: { type: 'Identifier', name: 'console' },
                                property: { type: 'Identifier', name: 'error' },
                                computed: false,
                            },
                            arguments: [
                                { type: 'Literal', value: 'Error:' },
                                { type: 'Identifier', name: errVar }
                            ]
                        }
                    });

                    codeModified = true;
                }
            }
        }
    });

    // Return the modified code, or the original if no changes were made
    return codeModified ? escodegen.generate(ast, { comment: true }) : fileContent;
}

/**
 * Generic function used by the dispatcher to apply the logging fix to any file path.
 *
 * @param filePath - Full path of the file to be fixed
 * @returns string - The updated code, or the original if no fix was applied
 */
export async function applyFix(filePath: string): Promise<string> {
    const document = await vscode.workspace.openTextDocument(filePath);
    const text = document.getText();

    const fixedCode = fixLoggingIssues
        ? fixLoggingIssues(text)
        : text;

    return fixedCode || text;
}
