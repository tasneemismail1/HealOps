import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

import { getAllJsTsFiles } from '../utils/fileUtils';
import { modifyAstAndGenerateCode, parseAst } from '../utils/astUtils';

//apply fixes for missing input validation logic.
//Injects express-validator usage in POST/PUT routes if it's missing.
export async function applyFixInputValidationIssue(issue: string) {
    console.log("Applying input validation fix for:", issue);

    // Extract the filename from the issue string (e.g., "user.js - Missing input validation")
    const match = issue.match(/^(.+?) - /);
    if (!match) {
        vscode.window.showErrorMessage('❌ Invalid issue format.');
        return;
    }

    const fileName = match[1].trim();
    console.log(`📌 Extracted file name: ${fileName}`);

    // Ensure a project is open in VS Code
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showErrorMessage("❌ No workspace found.");
        return;
    }

    // Locate the target file inside the workspace
    const projectRoot = workspaceFolders[0].uri.fsPath;
    const allFiles = getAllJsTsFiles(projectRoot);
    const filePath = allFiles.find(file => path.basename(file) === fileName);

    if (!filePath) {
        vscode.window.showErrorMessage(`❌ Error: File not found in workspace - ${fileName}`);
        return;
    }

    console.log(`✅ Target file for fix: ${filePath}`);

    // Read original file content
    let text = fs.readFileSync(filePath, "utf8");
    console.log(`📄 Original Content:\n${text}`);

    // Generate modified code with input validation fixes applied
    const fixedCode = fixInputValidationIssues(text);

    // Notify user if no changes were necessary
    if (fixedCode === text) {
        vscode.window.showInformationMessage(`✅ No changes needed in ${filePath}.`);
        return;
    }

    // Write modified content back to file and refresh it in VS Code
    try {
        fs.writeFileSync(filePath, fixedCode, "utf8");
        console.log(`✅ Successfully updated ${filePath}`);

        const document = await vscode.workspace.openTextDocument(filePath);
        await vscode.window.showTextDocument(document);
        await document.save();

        vscode.window.showInformationMessage(`✅ Input validation issue fixed in ${filePath}`);
    } catch (error) {
        vscode.window.showErrorMessage(`❌ Failed to update ${filePath} - ${error}`);
    }
}

//Injects express-validator-based input validation into Express.js POST/PUT routes
//if it's missing. Also ensures necessary middleware and import statements are present.

function fixInputValidationIssues(fileContent: string): string {
    let modified = false;

    // Ensure express-validator import is included
    if (!fileContent.includes("const { check, validationResult } = require('express-validator');")) {
        fileContent = "const { check, validationResult } = require('express-validator');\n" + fileContent;
        modified = true;
    }

    // Ensure express.json() middleware is applied
    if (!fileContent.includes("app.use(express.json())")) {
        fileContent = fileContent.replace(
            /const app = express\(\);/,
            "const app = express();\napp.use(express.json());"
        );
        modified = true;
    }

    //Regex to match app.post(...) or app.put(...) route declarations for inject validation middleware into applicable routes.
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

export async function applyFix(filePath: string): Promise<string> {
    const document = await vscode.workspace.openTextDocument(filePath);
    const text = document.getText();

    const fixedCode = fixInputValidationIssues
        ? fixInputValidationIssues(text)
        : text;

    return fixedCode || text;
}
