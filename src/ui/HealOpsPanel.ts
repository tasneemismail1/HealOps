import * as vscode from 'vscode';
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


    // HTML content for the webview panel
    private _getHtmlForWebview() {
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>HealOps Scanner</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                button { padding: 10px; background: #007acc; color: white; border: none; cursor: pointer; margin-bottom: 10px; }
                #progress { width: 100%; background: #ccc; height: 10px; }
                #progress-bar { height: 10px; width: 0%; background: #007acc; }
                #issues { margin-top: 20px; }
                .issue-item { border-bottom: 1px solid #ddd; padding: 10px; }
                .fix-btn { background: green; color: white; padding: 5px; cursor: pointer; border: none; }
            </style>
        </head>
        <body>
            <h2>HealOps - Microservices Scanner</h2>
            <button id="scanButton">🔍 Scan Project</button>
            <div id="progress"><div id="progress-bar"></div></div>
            <div id="issues"></div>

            <script>
                const vscode = acquireVsCodeApi();

                document.getElementById('scanButton').addEventListener('click', () => {
                    vscode.postMessage({ command: 'scan' });
                });

                window.addEventListener('message', event => {
                    const { command, data, progress } = event.data;
                    if (command === 'updateIssues') {
                        document.getElementById('issues').innerHTML =
                            data.map(issue =>
                                \`<div class="issue-item">\${issue}
                                <button class="fix-btn" onclick="fixIssue('\${issue}')">Fix</button></div>\`
                            ).join('');
                    } else if (command === 'updateProgress') {
                        document.getElementById('progress-bar').style.width = progress + '%';
                    }
                });

                function fixIssue(issue) {
                    vscode.postMessage({ command: 'fixIssue', issue });
                }
            </script>
        </body>
        </html>`;
    }
}
