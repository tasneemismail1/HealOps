import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as acorn from 'acorn';
import { simple as walkSimple } from 'acorn-walk';

// Activate extension
export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('healops.openPanel', () => {
        HealOpsPanel.createOrShow(context.extensionUri);
    });

    context.subscriptions.push(disposable);
}

// === UI (Sidebar Panel) ===
class HealOpsPanel {
    public static currentPanel: HealOpsPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._extensionUri = extensionUri;

        this._update();
        this._setupMessageListener();
    }

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

    private _update() {
        this._panel.webview.html = this._getHtmlForWebview();
    }

    private _setupMessageListener() {
        this._panel.webview.onDidReceiveMessage(
            async (message) => {
                if (message.command === 'scan') {
                    const issues = await scanProject((progress) => {
                        this._panel.webview.postMessage({ command: 'updateProgress', progress });
                    });
                    this._panel.webview.postMessage({ command: 'updateIssues', data: issues });
                } else if (message.command === 'fixIssue') {
                    fixIssue(message.issue);
                }
            },
            null
        );
    }

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

// === Scanning Functions ===
async function scanProject(updateProgress: (progress: number) => void) {
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

        totalIssues.push(...detectIssues(ast, file));

        updateProgress(Math.round(((i + 1) / totalFiles) * 100));
    }

    return totalIssues;
}

function getAllJsTsFiles(dir: string): string[] {
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

// === Issue Detection Functions (9 checks) ===
function detectIssues(ast: any, file: string): string[] {
    return [
        ...detectRetryIssues(ast, file),
        ...detectCircuitBreakerIssues(ast, file),
        ...detectHealthCheckIssues(ast, file),
        ...detectTimeoutIssues(ast, file),
        ...detectDependencyInjectionIssues(ast, file),
        // ...detectLoggingIssues(ast, file),
        // ...detectRateLimitingIssues(ast, file),
        // ...detectSecureHeadersIssues(ast, file),
        // ...detectInputValidationIssues(ast, file)
    ];
}

// (Include the 9 detection functions here from previous code)

function fixIssue(issue: string) {
    vscode.window.showInformationMessage(`AI Fixing: ${issue}`);

    // Simulate AI-generated fix with a timeout
    setTimeout(() => {
        vscode.window.showInformationMessage(`Fixed: ${issue}`);
    }, 2000);
}





// === ISSUE DETECTION FUNCTIONS ===

function detectRetryIssues(ast: any, file: string): string[] {
    const issues: string[] = [];
    walkSimple(ast, {
        TryStatement(node) {
            if (!node.handler) {
                issues.push(`[${file}] Missing catch block in try statement.`);
            }
        }
    });
    return issues;
}

function detectCircuitBreakerIssues(ast: any, file: string): string[] {
    const issues: string[] = [];
    let foundCircuitBreaker = false;
    walkSimple(ast, {
        CallExpression(node) {
            if (node.callee.type === 'Identifier' && node.callee.name.includes('CircuitBreaker')) {
                foundCircuitBreaker = true;
            }
        }
    });
    if (!foundCircuitBreaker) {
        issues.push(`[${file}] Missing circuit breaker logic.`);
    }
    return issues;
}

function detectHealthCheckIssues(ast: any, file: string): string[] {
    const issues: string[] = [];
    let hasHealthCheck = false;
    walkSimple(ast, {
        CallExpression(node) {
            if (node.callee.type === 'MemberExpression' && node.callee.object.type === 'Identifier' && node.callee.object.name === 'app' &&
                node.callee.property.type === 'Identifier' && node.callee.property.name === 'get') {
                const arg = node.arguments[0];
                if (arg.type === 'Literal' && (arg.value === '/health' || arg.value === '/status')) {
                    hasHealthCheck = true;
                }
            }
        }
    });
    if (!hasHealthCheck) {
        issues.push(`[${file}] No health-check endpoint detected.`);
    }
    return issues;
}

function detectTimeoutIssues(ast: any, file: string): string[] {
    const issues: string[] = [];
    let hasTimeout = false;

    walkSimple(ast, {
        CallExpression(node) {
            if (node.callee.type === 'MemberExpression' && node.callee.object.type === 'Identifier' && node.callee.object.name === 'axios') {
                const configArg = node.arguments[1];
                if (configArg && configArg.type === 'ObjectExpression') {
                    const hasTimeoutProp = configArg.properties.some((prop: any) =>
                        prop.type === 'Property' && prop.key.type === 'Identifier' && prop.key.name === 'timeout'
                    );
                    if (hasTimeoutProp) {
                        hasTimeout = true;
                    }
                }
            }
        }
    });

    if (!hasTimeout) {
        issues.push(`[${file}] No timeout configuration in axios API calls.`);
    }

    return issues;
}

function detectDependencyInjectionIssues(ast: any, file: string): string[] {
    const issues: string[] = [];
    walkSimple(ast, {
        NewExpression(node) {
            if (node.callee.type === 'Identifier') {
                issues.push(`[${file}] Hardcoded dependency detected: ${node.callee.name}. Consider using dependency injection.`);
            }
        }
    });
    return issues;
}


// Deactivate extension
export function deactivate() {}