// Core VS Code APIs for workspace, notifications, and utilities
import * as vscode from 'vscode';
// File system module to read project files
import * as fs from 'fs';
// Path module to handle and manipulate file paths
import * as path from 'path';
// Acorn: a lightweight JavaScript parser that converts code into an Abstract Syntax Tree (AST)
import * as acorn from 'acorn'; // Parser for analyzing JS/TS code structure

// Utility functions for file reading and recursive JS/TS file collection
import { getAllJsTsFiles, readFileContent } from '../utils/fileUtils';

// Issue detectors for various microservice resilience and security concerns
import { detectRetryIssues } from '../detectors/detectRetry';
import { detectCircuitBreakerIssues } from '../detectors/detectCircuitBreaker';
import { detectHealthCheckIssues } from '../detectors/detectHealthCheck';
import { detectTimeoutIssues } from '../detectors/detectTimeout';
import { detectDependencyIssues } from '../detectors/detectDependency';
import { detectLoggingIssues } from '../detectors/detectLogging';
import { detectRateLimitingIssues } from '../detectors/detectRateLimiting';
import { detectSecureHeadersIssues } from '../detectors/detectSecureHeaders';
import { detectInputValidationIssues } from '../detectors/detectInputValidation';


/**
 * Main function responsible for scanning the entire user workspace to identify
 * architectural, security, and performance issues across JavaScript/TypeScript files.
 * 
 * @param updateProgress - Callback to visually update progress in the UI (e.g., status bar)
 * @returns Promise<string[]> - List of human-readable issue descriptions
 */
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

    // If no relevant files are found, inform the user and exit early
    if (jsTsFiles.length === 0) {
        vscode.window.showInformationMessage('No JavaScript or TypeScript files found.');
        return [];
    }

    // Initialize an array to collect issues detected across all scanned files
    let totalIssues: string[] = [];

    const totalFiles = jsTsFiles.length;

    // Loop through each source file to perform AST parsing and issue detection
    for (let i = 0; i < totalFiles; i++) {
        const file = jsTsFiles[i];

        // Read file content into memory
        const fileContent = fs.readFileSync(file, 'utf8');

        /**
         * Convert the code into an Abstract Syntax Tree (AST)
         * This enables static analysis of patterns like retry, logging, validation, etc.
         * 
         * AST parsing allows for accurate, language-aware inspection compared to regex or string matching.
         */
        const ast = acorn.parse(fileContent, {
            ecmaVersion: 'latest', // Support the latest ECMAScript syntax
            sourceType: 'module'   // Enable support for ES modules (import/export)
        });

        // Extract filename for display or logging in UI
        const fileName = path.basename(file);

        // Run all detectors on this AST and append their results to the issue list
        totalIssues.push(...detectIssues(ast, fileName));

        // Update UI progress indicator for real-time feedback
        updateProgress(Math.round(((i + 1) / totalFiles) * 100));
    }

    // Return a complete list of all detected issues
    return totalIssues;
}


/**
 * A helper function that centralizes all individual static analysis detectors.
 * Each detector is specialized in recognizing a particular bad practice or missing pattern.
 * 
 * @param ast - Parsed AST of the current file
 * @param file - File name for labeling issues
 * @returns string[] - List of issues found in this specific file
 */
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
