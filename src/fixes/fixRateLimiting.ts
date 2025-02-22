import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { getAllJsTsFiles } from '../utils/fileUtils';

export async function applyFixRateLimitingIssue(issue: string) {
    // Ensure that a workspace is open
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showErrorMessage('No workspace found.');
        return;
    }

    vscode.window.showInformationMessage(`Applying fix for rate limiting in ${issue}`);

    // Extract the filename from the issue message using regex
    const match = issue.match(/^(.+?) - /);
    if (!match) {
        vscode.window.showErrorMessage('❌ Invalid issue format.');
        return;
    }

    const fileName = match[1].trim(); // Extract the file name
    console.log(`📌 Extracted file name from issue: ${fileName}`);

    // Locate the file in the workspace
    const projectRoot = workspaceFolders[0].uri.fsPath;
    const allFiles = getAllJsTsFiles(projectRoot);
    const filePath = allFiles.find(file => path.basename(file) === fileName);

    // If file is not found, notify the user
    if (!filePath) {
        vscode.window.showErrorMessage(`❌ Error: File not found in workspace - ${fileName}`);
        return;
    }

    console.log(`✅ Targeting file for fix: ${filePath}`);

    let text = fs.readFileSync(filePath, 'utf8');
    console.log(`📄 Original Content:\n${text}`);

    // Apply fix for rate limiting
    const fixedCode = fixRateLimitingIssues(text);

    // If no changes were needed, notify the user
    if (fixedCode === text) {
        vscode.window.showInformationMessage(`✅ No changes were needed in ${filePath}.`);
        return;
    }

    // Save the modified content back to the file
    try {
        fs.writeFileSync(filePath, fixedCode, 'utf8');
        console.log(`✅ Successfully updated ${filePath}`);
    } catch (error) {
        vscode.window.showErrorMessage(`❌ Failed to update ${filePath} - ${error}`);
        return;
    }

    // Reload the updated document in VS Code to reflect changes
    const document = await vscode.workspace.openTextDocument(filePath);
    await vscode.window.showTextDocument(document);

    vscode.window.showInformationMessage(`✅ Rate limiting middleware added in ${filePath}`);
}

function fixRateLimitingIssues(fileContent: string): string {
    let modified = false;

    // If rateLimit is not imported, add the required import statement
    if (!fileContent.includes("const rateLimit")) {
        fileContent = "const rateLimit = require('express-rate-limit');\n" + fileContent;
        modified = true;
    }

    // If rate limiting middleware is not applied, add `app.use(rateLimit(...))`
    if (!fileContent.includes("app.use(rateLimit")) {
        fileContent = fileContent.replace(
            /const app = express\(\);/,
            `const app = express();\napp.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));`
        );
        modified = true;
    }

    console.log(`🔧 Fix Applied: ${modified}`);
    return modified ? fileContent : fileContent;
}