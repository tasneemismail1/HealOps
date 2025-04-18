import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { getAllJsTsFiles } from '../utils/fileUtils';
import { modifyAstAndGenerateCode, parseAst } from '../utils/astUtils';

//apply fixes for missing rate limiting logic in an Express.js app.
//importing `express-rate-limit` and adding the middleware to `app`.
export async function applyFixRateLimitingIssue(issue: string) {
    // Ensure the workspace is open
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showErrorMessage('No workspace found.');
        return;
    }

    vscode.window.showInformationMessage(`Applying fix for rate limiting in ${issue}`);

    // Extract filename from issue text (e.g., "server.js - Rate limiting middleware is missing.")
    const match = issue.match(/^(.+?) - /);
    if (!match) {
        vscode.window.showErrorMessage('❌ Invalid issue format.');
        return;
    }

    const fileName = match[1].trim();
    console.log(`📌 Extracted file name from issue: ${fileName}`);

    // Find the full path of the file
    const projectRoot = workspaceFolders[0].uri.fsPath;
    const allFiles = getAllJsTsFiles(projectRoot);
    const filePath = allFiles.find(file => path.basename(file) === fileName);

    if (!filePath) {
        vscode.window.showErrorMessage(`❌ Error: File not found in workspace - ${fileName}`);
        return;
    }

    console.log(`✅ Targeting file for fix: ${filePath}`);

    // Read the original file content
    let text = fs.readFileSync(filePath, 'utf8');
    console.log(`📄 Original Content:\n${text}`);

    // Apply the actual fix logic
    const fixedCode = fixRateLimitingIssues(text);

    // If nothing changed, display a message
    if (fixedCode === text) {
        vscode.window.showInformationMessage(`✅ No changes were needed in ${filePath}.`);
        return;
    }

    // Write modified content back to the file
    try {
        fs.writeFileSync(filePath, fixedCode, 'utf8');
        console.log(`✅ Successfully updated ${filePath}`);
    } catch (error) {
        vscode.window.showErrorMessage(`❌ Failed to update ${filePath} - ${error}`);
        return;
    }

    // Open the updated file in the editor
    const document = await vscode.workspace.openTextDocument(filePath);
    await vscode.window.showTextDocument(document);

    vscode.window.showInformationMessage(`✅ Rate limiting middleware added in ${filePath}`);
}

//add rate limiting to Express.js files if it's missing.
function fixRateLimitingIssues(fileContent: string): string {
    let modified = false;

    // Add import for express-rate-limit if not found
    if (!fileContent.includes("const rateLimit")) {
        fileContent = "const rateLimit = require('express-rate-limit');\n" + fileContent;
        modified = true;
    }

    // Add `app.use(rateLimit(...))` middleware if not applied
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

//apply this fix logic to any file path
export async function applyFix(filePath: string): Promise<string> {
    const document = await vscode.workspace.openTextDocument(filePath);
    const text = document.getText();

    const fixedCode = fixRateLimitingIssues
        ? fixRateLimitingIssues(text)
        : text;

    return fixedCode || text;
}
