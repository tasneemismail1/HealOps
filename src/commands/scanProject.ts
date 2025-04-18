import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as acorn from 'acorn'; // Parser for analyzing JS/TS code structure
import { getAllJsTsFiles, readFileContent } from '../utils/fileUtils';

// Issue detectors
import { detectRetryIssues } from '../detectors/detectRetry';
import { detectCircuitBreakerIssues } from '../detectors/detectCircuitBreaker';
import { detectHealthCheckIssues } from '../detectors/detectHealthCheck';
import { detectTimeoutIssues } from '../detectors/detectTimeout';
import { detectDependencyIssues } from '../detectors/detectDependency';
import { detectLoggingIssues } from '../detectors/detectLogging';
import { detectRateLimitingIssues } from '../detectors/detectRateLimiting';
import { detectSecureHeadersIssues } from '../detectors/detectSecureHeaders';
import { detectInputValidationIssues } from '../detectors/detectInputValidation';



//scanning the entire user workspace to identify issues across files.

//updateProgress - Callback to visually update progress in the UI (e.g., status bar)
// Promise<string[]> - List of human-readable issue descriptions
export async function scanProject(updateProgress: (progress: number) => void) {
    const workspaceFolders = vscode.workspace.workspaceFolders;

    // Ensure a project is open before proceeding
    if (!workspaceFolders) {
        vscode.window.showErrorMessage('No workspace found.');
        return [];
    }

    // Get the absolute root path of the project
    const projectRoot = workspaceFolders[0].uri.fsPath;

    // Recursively scan the entire workspace for .js and .ts files
    const jsTsFiles = getAllJsTsFiles(projectRoot);

    // If no relevant files are found, return
    if (jsTsFiles.length === 0) {
        vscode.window.showInformationMessage('No JavaScript or TypeScript files found.');
        return [];
    }

    //issues detected across all scanned files
    let totalIssues: string[] = [];

    const totalFiles = jsTsFiles.length;

    // Loop through each source file to perform AST parsing and issue detection
    for (let i = 0; i < totalFiles; i++) {
        const file = jsTsFiles[i];

        const fileContent = fs.readFileSync(file, 'utf8');

        //Convert the code into an Abstract Syntax Tree (AST)
        const ast = acorn.parse(fileContent, {
            ecmaVersion: 'latest', // Support the latest ECMAScript syntax
            sourceType: 'module'   // Enable support for ES modules (import/export)
        });

        const fileName = path.basename(file);

        // Run all detectors
        totalIssues.push(...detectIssues(ast, fileName));

        // Update UI progress indicator for real-time feedback
        updateProgress(Math.round(((i + 1) / totalFiles) * 100));
    }

    return totalIssues;
}


function detectIssues(ast: any, file: string): string[] {
    return [
        ...detectRetryIssues(ast, file),
        ...detectCircuitBreakerIssues(ast, file),
        ...detectHealthCheckIssues(ast, file),
        ...detectTimeoutIssues(ast, file),
        ...detectDependencyIssues(ast, file),
        ...detectLoggingIssues(ast, file),
        ...detectRateLimitingIssues(ast, file),
        ...detectSecureHeadersIssues(ast, file),
        ...detectInputValidationIssues(ast, file)
    ];
}
