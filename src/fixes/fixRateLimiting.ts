// VS Code APIs for reading, editing, and refreshing workspace files
import * as vscode from 'vscode';
// Node.js utilities for working with files and paths
import * as fs from 'fs';
import * as path from 'path';

// Utility function to fetch all JS/TS files in the workspace
import { getAllJsTsFiles } from '../utils/fileUtils';
// AST helpers (not used in this fix but included for future expansion)
import { modifyAstAndGenerateCode, parseAst } from '../utils/astUtils';

/**
 * Entry point to apply fixes for missing rate limiting logic in an Express.js app.
 * The fix includes importing `express-rate-limit` and adding the middleware to `app`.
 *
 * @param issue - A string in the format "<filename> - <issue description>"
 */
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

    // If nothing changed, inform the user
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

/**
 * Core logic to add rate limiting to Express.js files if it's missing.
 * - Adds the import for `express-rate-limit` if needed.
 * - Adds `app.use(rateLimit(...))` after app initialization.
 *
 * @param fileContent - Original JavaScript/TypeScript file content
 * @returns Modified code with rate limiting applied
 */
function fixRateLimitingIssues(fileContent: string): string {
    let modified = false;

    // Add import for express-rate-limit if not found
    if (!fileContent.includes("const rateLimit")) {
        fileContent = "const rateLimit = require('express-rate-limit');\n" + fileContent;
        modified = true;
    }

    // Add middleware if not already applied
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

/**
 * Programmatic interface to apply this fix logic to any file path.
 * Can be used by the dispatcher or for testing purposes.
 */
export async function applyFix(filePath: string): Promise<string> {
    const document = await vscode.workspace.openTextDocument(filePath);
    const text = document.getText();

    const fixedCode = fixRateLimitingIssues
        ? fixRateLimitingIssues(text)
        : text;

    return fixedCode || text;
}
