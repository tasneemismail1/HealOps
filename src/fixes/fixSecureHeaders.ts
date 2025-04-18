import * as vscode from 'vscode';
import * as path from 'path';

import { getAllJsTsFiles } from '../utils/fileUtils';
import { modifyAstAndGenerateCode, parseAst } from '../utils/astUtils';

//Fixes missing secure headers in Express apps by injecting helmet middleware.
//Adds both the required `require('helmet')` statement and `app.use(helmet())` call.
export async function applyFixSecureHeadersIssue(issue: string) {
    console.log("Fixing secure headers issue for:", issue);

    // Extract the filename from the issue text
    const file = issue.split(" - ")[0].trim();
    console.log("Extracted File Name:", file);

    // Check if a workspace is open
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showErrorMessage("No workspace found.");
        return;
    }

    // Locate the target file from all JS/TS files
    const projectRoot = workspaceFolders[0].uri.fsPath;
    const allFiles = getAllJsTsFiles(projectRoot);
    const filePath = allFiles.find(filePath => path.basename(filePath) === file);

    if (!filePath) {
        vscode.window.showErrorMessage(`❌ Error: File not found in workspace - ${file}`);
        return;
    }

    try {
        // Load file content and apply fix
        const document = await vscode.workspace.openTextDocument(filePath);
        let text = document.getText();

        const fixedCode = fixSecureHeadersIssues(text);

        // Skip if no changes were needed
        if (fixedCode === text) {
            vscode.window.showInformationMessage(`✅ No changes needed in ${filePath}.`);
            return;
        }

        // Apply the edited content
        const edit = new vscode.WorkspaceEdit();
        const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(text.length));
        edit.replace(document.uri, fullRange, fixedCode);

        await vscode.workspace.applyEdit(edit);
        vscode.window.showInformationMessage(`✅ Secure headers (helmet) added in ${filePath}.`);
    } catch (error) {
        vscode.window.showErrorMessage(`❌ Error fixing secure headers issue: ${error}`);
    }
}

//Injects the helmet middleware into the Express app if it's not already included.
function fixSecureHeadersIssues(fileContent: string): string {
    let modified = false;

    // Step 1: Ensure helmet is imported
    if (!/const helmet = require\(['"]helmet['"]\);/.test(fileContent)) {
        fileContent = `const helmet = require('helmet');\n` + fileContent;
        modified = true;
    }

    // Step 2: Add middleware right after app initialization
    const appInitRegex = /const (\w+) = express\(\);/; // Detect variable name (e.g., app, server)
    const match = fileContent.match(appInitRegex);

    if (match) {
        const appVariable = match[1]; // Example: `app`
        const middlewareRegex = new RegExp(`${appVariable}\\.use\\(helmet\\(\\)\\);`);

        if (!middlewareRegex.test(fileContent)) {
            fileContent = fileContent.replace(appInitRegex, match => match + `\n${appVariable}.use(helmet());`);
            modified = true;
        }
    }

    return modified ? fileContent : fileContent;
}

//Dispatcher-compatible method for invoking the secure headers fix.
export async function applyFix(filePath: string): Promise<string> {
    const document = await vscode.workspace.openTextDocument(filePath);
    const text = document.getText();

    const fixedCode = fixSecureHeadersIssues
        ? fixSecureHeadersIssues(text)
        : text;

    return fixedCode || text;
}
