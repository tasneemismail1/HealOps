import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { scanProject } from '../commands/scanProject';

// Import only `applyFixIssue` functions
import { applyFixRetryIssue } from '../fixes/fixRetry';
import { applyFixCircuitBreakerIssue } from '../fixes/fixCircuitBreaker';
import { applyFixHealthCheckIssue } from '../fixes/fixHealthCheck';
import { applyFixTimeoutIssue } from '../fixes/fixTimeout';
import { applyFixDependencyIssue } from '../fixes/fixDependency';
import { applyFixLoggingIssue } from '../fixes/fixLogging';
import { applyFixRateLimitingIssue } from '../fixes/fixRateLimiting';
import { applyFixSecureHeadersIssue } from '../fixes/fixSecureHeaders';
import { applyFixInputValidationIssue } from '../fixes/fixInputValidation';

export class HealOpsPanel {
    public static currentPanel: HealOpsPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._extensionUri = extensionUri;

        this._update();
        this._setupMessageListener();
    }

    // Function to create or show the webview panel
    public static createOrShow(extensionUri: vscode.Uri) {
        if (HealOpsPanel.currentPanel) {
            HealOpsPanel.currentPanel._panel.reveal(vscode.ViewColumn.One);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'healOpsPanel',
            'HealOps - Microservices Scanner',
            vscode.ViewColumn.One,
            { enableScripts: true }
        );

        HealOpsPanel.currentPanel = new HealOpsPanel(panel, extensionUri);

        panel.onDidDispose(() => {
            HealOpsPanel.currentPanel = undefined;
        }, null);
    }

    // Updates the content of the webview panel
    private _update() {
        this._panel.webview.html = this._getHtmlForWebview();
    }

    // Setup message listener for communication between UI and extension
    private _setupMessageListener() {
        this._panel.webview.onDidReceiveMessage(
            async (message) => {
                if (message.command === 'scan') {
                    // Scan project and update UI
                    const issues = await scanProject((progress) => {
                        this._panel.webview.postMessage({ command: 'updateProgress', progress });
                    });
                    this._panel.webview.postMessage({ command: 'updateIssues', data: issues });
                } else if (message.command === 'fixIssue') {
                    // Apply fixes based on detected issues
                    if (message.issue.includes('No timeout configuration in axios API calls.')) {
                        applyFixTimeoutIssue(message.issue);
                    } else if (message.issue.includes('Missing logging in try-catch block')) {
                        applyFixLoggingIssue(message.issue);
                    } else if (message.issue.includes('Rate limiting middleware is missing')) {
                        applyFixRateLimitingIssue(message.issue);
                    } else if (message.issue.includes('Hardcoded dependency detected')) {
                        applyFixDependencyIssue(message.issue);
                    } else if (message.issue.includes('is missing retry logic')) {
                        console.log("Calling applyFixRetryIssue...");
                        applyFixRetryIssue(message.issue);
                    } else if (message.issue.includes('Missing circuit breaker logic')) {
                        applyFixCircuitBreakerIssue(message.issue);
                    } else if (message.issue.includes('No health-check endpoint detected')) {
                        applyFixHealthCheckIssue(message.issue);
                    } else if (message.issue.includes('Secure headers middleware (helmet) is missing')) {
                        applyFixSecureHeadersIssue(message.issue);
                    } else if (message.issue.includes('Missing input validation middleware')) {
                        applyFixInputValidationIssue(message.issue);
                    }
                    else {
                        vscode.window.showInformationMessage('Fixing still under work');
                    }
                }
            },
            null
        );
    }

    // Load HTML from panel.html dynamically
    private _getHtmlForWebview(): string {
        const filePath = path.join(this._extensionUri.fsPath, 'webviews', 'panel.html');

        try {
            let htmlContent = fs.readFileSync(filePath, 'utf8');

            // Inject URIs for styles and scripts
            const cssUri = this._panel.webview.asWebviewUri(
                vscode.Uri.joinPath(this._extensionUri, 'webviews', 'panel.css')
            );

            htmlContent = htmlContent.replace('{{styleUri}}', cssUri.toString());

            return htmlContent;
        } catch (error) {
            vscode.window.showErrorMessage(`❌ Failed to load HealOps webview: ${error}`);
            return `<h1>Error loading HealOps UI</h1>`;
        }
    }
}
