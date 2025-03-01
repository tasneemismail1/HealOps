import * as vscode from 'vscode';
import * as path from 'path';
import { getAllJsTsFiles } from '../utils/fileUtils';



export async function applyFixSecureHeadersIssue(issue: string) {
    console.log("Fixing secure headers issue for:", issue);

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

        // Apply the secure headers fix
        const fixedCode = fixSecureHeadersIssues(text);

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
        vscode.window.showInformationMessage(`✅ Secure headers (helmet) added in ${filePath}.`);
    } catch (error) {
        vscode.window.showErrorMessage(`❌ Error fixing secure headers issue: ${error}`);
    }
}


function fixSecureHeadersIssues(fileContent: string): string {
    let modified = false;

    // Check if `helmet()` is already being used
    if (!fileContent.includes("helmet()")) {
        console.log("Adding secure headers middleware (helmet)...");

        // Insert the helmet import
        if (!fileContent.includes("const helmet = require('helmet');")) {
            fileContent = "const helmet = require('helmet');\n" + fileContent;
        }

        // Add `app.use(helmet())` after `express()` initialization
        fileContent = fileContent.replace(/const app = express\(\);/, match => match + "\napp.use(helmet());");

        modified = true;
    }

    return modified ? fileContent : fileContent;
}