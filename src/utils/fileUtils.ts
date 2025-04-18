import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

//Recursively collects all `.js` and `.ts` files in a given directory.
export function getAllJsTsFiles(dir: string): string[] {
    let filesList: string[] = []; 
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

//Reads the content of a file as a string using VS Code’s API.
export async function readFileContent(filePath: string): Promise<string | null> {
    try {
        const document = await vscode.workspace.openTextDocument(filePath);
        return document.getText();
    } catch (error) {
        vscode.window.showErrorMessage(`❌ Error reading file: ${filePath}`);
        return null;
    }
}

//Writes new content to a specified file
export async function writeFileContent(filePath: string, newContent: string) {
    try {
        fs.writeFileSync(filePath, newContent, 'utf8');
        vscode.window.showInformationMessage(`✅ Successfully updated ${filePath}`);
    } catch (error) {
        vscode.window.showErrorMessage(`❌ Failed to update ${filePath}: ${error}`);
    }
}
