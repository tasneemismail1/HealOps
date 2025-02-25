import * as vscode from 'vscode';
import { HealOpsPanel } from './ui/HealOpsPanel';
import { scanProject } from './commands/scanProject';

// Import fixing functions
import { applyFixRetryIssue } from './fixes/fixRetry';
import { applyFixCircuitBreakerIssue } from './fixes/fixCircuitBreaker';
import { applyFixHealthCheckIssue } from './fixes/fixHealthCheck';
import { applyFixTimeoutIssue } from './fixes/fixTimeout';
import { applyFixDependencyIssue } from './fixes/fixDependency';
import { applyFixLoggingIssue } from './fixes/fixLogging';
import { applyFixRateLimitingIssue } from './fixes/fixRateLimiting';
import { applyFixSecureHeadersIssue } from './fixes/fixSecureHeaders';
import { applyFixInputValidationIssue } from './fixes/fixInputValidation';

/**
 * Activates the VSCode extension
 */
export function activate(context: vscode.ExtensionContext) {
    console.log('✅ HealOps extension activated');

    // Register the command for opening the UI panel
    let openPanelCommand = vscode.commands.registerCommand('healops.openPanel', () => {
        HealOpsPanel.createOrShow(context.extensionUri);
    });

    // Register the command for scanning the project
    let scanCommand = vscode.commands.registerCommand('healops.scanProject', async () => {
        const issues = await scanProject((progress) => {
            vscode.window.setStatusBarMessage(`Scanning: ${progress}%`);
        });

        vscode.window.showInformationMessage(`Scan completed! Detected ${issues.length} issues.`);
    });

    // Register the commands for applying fixes
    let fixCommands = [
        vscode.commands.registerCommand('healops.fixRetry', applyFixRetryIssue),
        vscode.commands.registerCommand('healops.fixCircuitBreaker', applyFixCircuitBreakerIssue),
        vscode.commands.registerCommand('healops.fixHealthCheck', applyFixHealthCheckIssue),
        vscode.commands.registerCommand('healops.fixTimeout', applyFixTimeoutIssue),
        vscode.commands.registerCommand('healops.fixDependency', applyFixDependencyIssue),
        vscode.commands.registerCommand('healops.fixLogging', applyFixLoggingIssue),
        vscode.commands.registerCommand('healops.fixRateLimiting', applyFixRateLimitingIssue),
        vscode.commands.registerCommand('healops.fixSecureHeaders', applyFixSecureHeadersIssue),
        vscode.commands.registerCommand('healops.fixInputValidation', applyFixInputValidationIssue),
    ];

    // Store commands in subscriptions
    context.subscriptions.push(openPanelCommand, scanCommand, ...fixCommands);
}

/**
 * Deactivates the extension (cleanup if needed)
 */
export function deactivate() {
    console.log('❌ HealOps extension deactivated');
}
