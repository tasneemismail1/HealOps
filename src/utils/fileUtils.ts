import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export function getAllJsTsFiles(dir: string): string[] {
    let filesList: string[] = [];
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            filesList = filesList.concat(getAllJsTsFiles(filePath));
        } else if (file.endsWith('.js') || file.endsWith('.ts')) {
            filesList.push(filePath);
        }
    }

    return filesList;
}

export async function readFileContent(filePath: string): Promise<string | null> {
    try {
        const document = await vscode.workspace.openTextDocument(filePath);
        return document.getText();
    } catch (error) {
        vscode.window.showErrorMessage(`❌ Error reading file: ${filePath}`);
        return null;
    }
}

export async function writeFileContent(filePath: string, newContent: string) {
    try {
        fs.writeFileSync(filePath, newContent, 'utf8');
        vscode.window.showInformationMessage(`✅ Successfully updated ${filePath}`);
    } catch (error) {
        vscode.window.showErrorMessage(`❌ Failed to update ${filePath}: ${error}`);
    }
}
