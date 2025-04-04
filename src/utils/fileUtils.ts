// Import necessary modules from Node.js and VS Code API
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Recursively collects all `.js` and `.ts` files in a given directory.
 *
 * @param dir - The root directory to begin the scan
 * @returns A flat array of full paths to all JavaScript and TypeScript files
 */
export function getAllJsTsFiles(dir: string): string[] {
    let filesList: string[] = []; // Stores matching file paths
    const files = fs.readdirSync(dir); // Read current directory contents

    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath); // Check if it's a file or folder

        if (stat.isDirectory()) {
            // Recursively scan subdirectories
            filesList = filesList.concat(getAllJsTsFiles(filePath));
        } else if (file.endsWith('.js') || file.endsWith('.ts')) {
            // Include only JS and TS files
            filesList.push(filePath);
        }
    }

    return filesList;
}

/**
 * Reads the content of a file as a string using VS Code’s API.
 * This ensures proper encoding and integration with the editor.
 *
 * @param filePath - Full path to the target file
 * @returns File content as a string or null if reading fails
 */
export async function readFileContent(filePath: string): Promise<string | null> {
    try {
        const document = await vscode.workspace.openTextDocument(filePath);
        return document.getText();
    } catch (error) {
        vscode.window.showErrorMessage(`❌ Error reading file: ${filePath}`);
        return null;
    }
}

/**
 * Writes new content to a specified file and shows a success or error message.
 *
 * @param filePath - Full path to the file to be updated
 * @param newContent - Updated source code to be saved
 */
export async function writeFileContent(filePath: string, newContent: string) {
    try {
        fs.writeFileSync(filePath, newContent, 'utf8');
        vscode.window.showInformationMessage(`✅ Successfully updated ${filePath}`);
    } catch (error) {
        vscode.window.showErrorMessage(`❌ Failed to update ${filePath}: ${error}`);
    }
}
