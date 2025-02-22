import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as acorn from 'acorn';

import { getAllJsTsFiles, readFileContent } from '../utils/fileUtils';

// Import detection functions
import { detectRetryIssues } from '../detectors/detectRetry';
import { detectCircuitBreakerIssues } from '../detectors/detectCircuitBreaker';
import { detectHealthCheckIssues } from '../detectors/detectHealthCheck';
import { detectTimeoutIssues } from '../detectors/detectTimeout';
import { detectDependencyIssues } from '../detectors/detectDependency';
import { detectLoggingIssues } from '../detectors/detectLogging';
import { detectRateLimitingIssues } from '../detectors/detectRateLimiting';
import { detectSecureHeadersIssues } from '../detectors/detectSecureHeaders';
import { detectInputValidationIssues } from '../detectors/detectInputValidation';



export async function scanProject(updateProgress: (progress: number) => void) {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showErrorMessage('No workspace found.');
        return [];
    }

    const projectRoot = workspaceFolders[0].uri.fsPath;
    const jsTsFiles = getAllJsTsFiles(projectRoot);

    if (jsTsFiles.length === 0) {
        vscode.window.showInformationMessage('No JavaScript or TypeScript files found.');
        return [];
    }

    let totalIssues: string[] = [];
    const totalFiles = jsTsFiles.length;

    for (let i = 0; i < totalFiles; i++) {
        const file = jsTsFiles[i];
        const fileContent = fs.readFileSync(file, 'utf8');
        const ast = acorn.parse(fileContent, { ecmaVersion: 'latest', sourceType: 'module' });

        const fileName = path.basename(file);
        totalIssues.push(...detectIssues(ast, fileName));

        // totalIssues.push(...detectIssues(ast, file));

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
