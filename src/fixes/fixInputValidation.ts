import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { getAllJsTsFiles } from '../utils/fileUtils';

export async function applyFixInputValidationIssue(issue: string) {
    console.log("Applying input validation fix for:", issue);

    // Extract the file name from the issue message
    const match = issue.match(/^(.+?) - /);
    if (!match) {
        vscode.window.showErrorMessage('❌ Invalid issue format.');
        return;
    }

    const fileName = match[1].trim();
    console.log(`📌 Extracted file name: ${fileName}`);

    // Ensure a workspace is open
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showErrorMessage("❌ No workspace found.");
        return;
    }

    const projectRoot = workspaceFolders[0].uri.fsPath;
    const allFiles = getAllJsTsFiles(projectRoot);
    const filePath = allFiles.find(file => path.basename(file) === fileName);

    if (!filePath) {
        vscode.window.showErrorMessage(`❌ Error: File not found in workspace - ${fileName}`);
        return;
    }

    console.log(`✅ Target file for fix: ${filePath}`);

    // Read the file content
    let text = fs.readFileSync(filePath, "utf8");
    console.log(`📄 Original Content:\n${text}`);

    // Apply fix for input validation
    const fixedCode = fixInputValidationIssues(text);

    // If no changes were made, inform the user
    if (fixedCode === text) {
        vscode.window.showInformationMessage(`✅ No changes needed in ${filePath}.`);
        return;
    }

    // Save the modified content back to the file
    try {
        fs.writeFileSync(filePath, fixedCode, "utf8");
        console.log(`✅ Successfully updated ${filePath}`);

        // Ensure VSCode refreshes the document to reflect changes
        const document = await vscode.workspace.openTextDocument(filePath);
        await vscode.window.showTextDocument(document);
        await document.save();

        vscode.window.showInformationMessage(`✅ Input validation issue fixed in ${filePath}`);
    } catch (error) {
        vscode.window.showErrorMessage(`❌ Failed to update ${filePath} - ${error}`);
        return;
    }
}






function fixInputValidationIssues(fileContent: string): string {
    let modified = false;

    // Ensure express-validator import is present
    if (!fileContent.includes("const { check, validationResult } = require('express-validator');")) {
        fileContent = "const { check, validationResult } = require('express-validator');\n" + fileContent;
        modified = true;
    }

    // Ensure express.json() middleware is present
    if (!fileContent.includes("app.use(express.json())")) {
        fileContent = fileContent.replace(
            /const app = express\(\);/,
            "const app = express();\napp.use(express.json());"
        );
        modified = true;
    }

    // Fix missing validation in routes
    const routeRegex = /(app\.(post|put)\(['"`]\/[^'"`]+['"`],\s*\[?)/g;
    fileContent = fileContent.replace(routeRegex, (match, prefix) => {
        if (!match.includes("[check(")) {
            modified = true;
            return `${prefix}[check('param').notEmpty().withMessage('Parameter is required')], `;
        }
        return match;
    });

    return modified ? fileContent : fileContent;
}
