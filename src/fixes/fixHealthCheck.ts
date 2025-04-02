import * as vscode from 'vscode';
import * as path from 'path';
import { getAllJsTsFiles } from '../utils/fileUtils';
import { modifyAstAndGenerateCode, parseAst } from '../utils/astUtils';

export function getFixedCodeHealthCheck(originalCode: string): string {
    const ast = parseAst(originalCode);
  
    const modifiedCode = modifyAstAndGenerateCode(ast, (node: any) => {
      // TODO: Replace this condition with real logic for healthCheck
      return false;
    });
  
    return modifiedCode || originalCode;
  }
  

export async function applyFixHealthCheckIssue(issue: string) {
    console.log("Fixing health check issue for:", issue);

    // Extract the filename from the issue report
    const file = issue.split(" - ")[0].trim();
    console.log("Extracted File Name:", file);

    // Ensure a workspace is open
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showErrorMessage("No workspace found.");
        return;
    }

    // Get the workspace directory and find the correct file
    const projectRoot = workspaceFolders[0].uri.fsPath;
    const allFiles = getAllJsTsFiles(projectRoot);
    const filePath = allFiles.find(filePath => path.basename(filePath) === file);

    if (!filePath) {
        vscode.window.showErrorMessage(`❌ Error: File not found in workspace - ${file}`);
        return;
    }

    try {
        // Open and read the file
        const document = await vscode.workspace.openTextDocument(filePath);
        let text = document.getText();

        // Apply the health check fix
        const fixedCode = fixHealthCheckIssues(text);

        // If no modifications were made, inform the user
        if (fixedCode === text) {
            vscode.window.showInformationMessage(`✅ No changes needed in ${filePath}.`);
            return;
        }

        // Apply the fixed code to the document in VSCode
        const edit = new vscode.WorkspaceEdit();
        const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(text.length));
        edit.replace(document.uri, fullRange, fixedCode);

        await vscode.workspace.applyEdit(edit);
        vscode.window.showInformationMessage(`✅ Health check endpoint added in ${filePath}.`);
    } catch (error) {
        vscode.window.showErrorMessage(`❌ Error fixing health check issue: ${error}`);
    }
}


function fixHealthCheckIssues(fileContent: string): string {
    let modified = false;

    // Check if `app.get('/health')` already exists
    if (!fileContent.includes("app.get('/health'")) {
        console.log("Adding health check endpoint...");

        // Insert the health check route
        const healthCheckCode = `
app.get('/health', (req, res) => {
    res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
});
`;
        // Add the route before `app.listen`
        fileContent = fileContent.replace(/app.listen\(\d+.*,/, match => healthCheckCode + "\n" + match);

        modified = true;
    }

    return modified ? fileContent : fileContent;
}