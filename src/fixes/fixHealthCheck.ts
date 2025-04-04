// VS Code APIs for reading, editing, and writing to open files
import * as vscode from 'vscode';
// Node path module to help resolve and compare file paths
import * as path from 'path';

// Helper utilities for scanning JS/TS files and working with ASTs
import { getAllJsTsFiles } from '../utils/fileUtils';
import { modifyAstAndGenerateCode, parseAst } from '../utils/astUtils';

/**
 * Main function to fix missing health-check endpoint issues.
 * This adds a default GET /health route to the appropriate Express.js file.
 * 
 * @param issue - A string representing the issue, typically "<file> - <message>"
 */
export async function applyFixHealthCheckIssue(issue: string) {
    console.log("Fixing health check issue for:", issue);

    // Extract the file name from the issue string
    const file = issue.split(" - ")[0].trim();
    console.log("Extracted File Name:", file);

    // Ensure a workspace is open before continuing
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showErrorMessage("No workspace found.");
        return;
    }

    // Find the full path of the reported file from all scanned JS/TS files
    const projectRoot = workspaceFolders[0].uri.fsPath;
    const allFiles = getAllJsTsFiles(projectRoot);
    const filePath = allFiles.find(filePath => path.basename(filePath) === file);

    if (!filePath) {
        vscode.window.showErrorMessage(`❌ Error: File not found in workspace - ${file}`);
        return;
    }

    try {
        // Load file contents
        const document = await vscode.workspace.openTextDocument(filePath);
        let text = document.getText();

        // Apply logic to inject health-check endpoint if missing
        const fixedCode = fixHealthCheckIssues(text);

        // If the file was unchanged, notify the user
        if (fixedCode === text) {
            vscode.window.showInformationMessage(`✅ No changes needed in ${filePath}.`);
            return;
        }

        // Apply modified content into the file using VS Code API
        const edit = new vscode.WorkspaceEdit();
        const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(text.length));
        edit.replace(document.uri, fullRange, fixedCode);

        await vscode.workspace.applyEdit(edit);
        vscode.window.showInformationMessage(`✅ Health check endpoint added in ${filePath}.`);
    } catch (error) {
        vscode.window.showErrorMessage(`❌ Error fixing health check issue: ${error}`);
    }
}

/**
 * Modifies the file content to add a health-check endpoint if it's missing.
 * The endpoint is added just before the first occurrence of `app.listen(...)`.
 * 
 * @param fileContent - Original file content as a string
 * @returns string - Updated file content with health-check added (if needed)
 */
function fixHealthCheckIssues(fileContent: string): string {
    let modified = false;

    // Check whether health-check route already exists
    if (!fileContent.includes("app.get('/health'")) {
        console.log("Adding health check endpoint...");

        // Define the health-check route to be injected
        const healthCheckCode = `
        app.get('/health', (req, res) => {
            res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
        });
        `;

        // Insert health-check code before the `app.listen(...)` call
        fileContent = fileContent.replace(/app.listen\(\d+.*,/, match => healthCheckCode + "\n" + match);

        modified = true;
    }

    return modified ? fileContent : fileContent;
}

/**
 * Generic applyFix function used by the system to apply the fix logic.
 * 
 * @param filePath - Full path to the file to be fixed
 * @returns string - Final fixed code (or original if unchanged)
 */
export async function applyFix(filePath: string): Promise<string> {
    const document = await vscode.workspace.openTextDocument(filePath);
    const text = document.getText();

    // Run the specific fix function
    const fixedCode = fixHealthCheckIssues
        ? fixHealthCheckIssues(text)
        : text;

    return fixedCode || text;
}
