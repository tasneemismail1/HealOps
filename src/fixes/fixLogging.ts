import * as vscode from 'vscode';
import * as path from 'path';
import { getAllJsTsFiles } from '../utils/fileUtils';
import { modifyAstAndGenerateCode, parseAst } from '../utils/astUtils';


export function getFixedCodeLogging(originalCode: string): string {
    const ast = parseAst(originalCode);
  
    const modifiedCode = modifyAstAndGenerateCode(ast, (node: any) => {
      // TODO: Replace this condition with real logic for logging
      return false;
    });
  
    return modifiedCode || originalCode;
  }
  

export async function applyFixLoggingIssue(issue: string) {
    // Ensure that the workspace is available
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showErrorMessage('No workspace found.');
        return;
    }

    // Extract file name from the issue description
    const match = issue.match(/^(.+?) - /);
    if (!match) {
        vscode.window.showErrorMessage('❌ Invalid issue format.');
        return;
    }

    const fileName = match[1].trim(); // Extract filename from issue report
    const projectRoot = workspaceFolders[0].uri.fsPath; // Get workspace root directory
    const allFiles = getAllJsTsFiles(projectRoot); // Get all JavaScript and TypeScript files
    const filePath = allFiles.find(file => path.basename(file) === fileName); // Find file path

    // If file is not found, show an error message
    if (!filePath) {
        vscode.window.showErrorMessage(`❌ Error: File not found in workspace - ${fileName}`);
        return;
    }

    try {
        // Open the file as a VSCode document
        const document = await vscode.workspace.openTextDocument(filePath);
        const text = document.getText(); // Read file content
        const fixedCode = fixLoggingIssues(text); // Apply fix to missing logging

        // If no changes are needed, notify the user
        if (fixedCode === text) {
            vscode.window.showInformationMessage(`✅ No changes needed in ${filePath}.`);
            return;
        }

        // Apply the fix to the document in VSCode
        const edit = new vscode.WorkspaceEdit();
        const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(text.length));
        edit.replace(document.uri, fullRange, fixedCode);

        await vscode.workspace.applyEdit(edit);
        vscode.window.showInformationMessage(`✅ Logging issue fixed in ${filePath}.`);
    } catch (error) {
        vscode.window.showErrorMessage(`❌ Error fixing logging issue: ${error}`);
    }
}

function fixLoggingIssues(fileContent: string): string {
    let modifiedCode = fileContent; // Store the original file content
    let changesMade = false; // Track whether any changes are made

    // Regular expression to detect try-catch blocks without console.error
    modifiedCode = modifiedCode.replace(
        /catch\s*\(([^)]+)\)\s*{([^}]*)}/g, // Match `catch(error) { /*code*/ }`
        (match, errorVar, body) => {
            if (!body.includes("console.error")) { // Check if logging is missing
                changesMade = true;
                return `catch (${errorVar}) { console.error('Error:', ${errorVar}); ${body} }`;
            }
            return match; // Return unchanged if logging already exists
        }
    );

    return changesMade ? modifiedCode : fileContent; // Return modified or original content
}

export async function applyFix(filePath: string): Promise<string> {
    const document = await vscode.workspace.openTextDocument(filePath);
    const text = document.getText();

    // Modify this call to reuse your existing fix logic
    const fixedCode = fixLoggingIssues
        ? fixLoggingIssues(text)
        : text;

    return fixedCode || text;
}