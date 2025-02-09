import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as acorn from 'acorn';
import { simple as walkSimple } from 'acorn-walk';
import { ancestor as walkAncestor } from "acorn-walk";
import * as escodegen from "escodegen";
import * as estraverse from 'estraverse';

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
                    }else {
                        vscode.window.showInformationMessage('Fixing still under work');
                    }
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

        const fileName = path.basename(file);
        totalIssues.push(...detectIssues(ast, fileName));

        // totalIssues.push(...detectIssues(ast, file));

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
        ...detectDependencyIssues(ast, file),
        ...detectLoggingIssues(ast, file),
        ...detectRateLimitingIssues(ast, file),
        ...detectSecureHeadersIssues(ast, file),
        ...detectInputValidationIssues(ast, file)
    ];
}

// (Include the 9 detection functions here from previous code)

function fixIssue(issue: string) {
    vscode.window.showInformationMessage(`AI Fixing still under work: ${issue}`);

    // Simulate AI-generated fix with a timeout
    setTimeout(() => {
        vscode.window.showInformationMessage(`AI Fixing still under work: ${issue}`);
    }, 2000);
}
//1 fix time out
async function applyFixTimeoutIssue(issue: string) {

    console.log(issue);
    const file = issue.split(" - ")[0].trim(); // Get everything before ' - '
    console.log("File:", file);

    const fileName = path.basename(file);
    console.log("File name:", fileName);

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) { 
        return null; 
    }
    const directory = workspaceFolders[0].uri.fsPath;
    console.log("directory", directory);

    const filePath = path.join(directory, fileName);
    console.log("File path:", filePath);

    try {
        const document = await vscode.workspace.openTextDocument(filePath);
        const text = document.getText();
        const ast = acorn.parse(text, { ecmaVersion: 'latest', sourceType: 'module' });

        const fixedCode = fixTimeoutIssues(ast, filePath);

        if (fixedCode.length === 0) {
            vscode.window.showInformationMessage(`No changes needed in ${filePath}.`);
            return;
        }

        const edit = new vscode.WorkspaceEdit();
        const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(text.length));

        edit.replace(document.uri, fullRange, fixedCode);
        await vscode.workspace.applyEdit(edit);

        vscode.window.showInformationMessage(`✅ Timeout issue fixed in ${filePath}.`);
    } catch (error) {
        vscode.window.showErrorMessage(`❌ Error fixing timeout issue: ${error}`);
    }

}
        
function fixTimeoutIssues(ast: any, file: string): string {
    let codeModified = false;

    walkSimple(ast, {
        CallExpression(node) {
            if (node.callee.type === "MemberExpression" && node.callee.object.type === "Identifier" && node.callee.object.name === "axios") {
                let hasTimeout = false;
                let configObject = null;

                if (node.arguments.length > 1) {
                    configObject = node.arguments[1];

                    if (configObject.type === "ObjectExpression" && configObject.properties.some((prop) =>
                        prop.type === "Property" && prop.key.type === "Identifier" && prop.key.name === "timeout")) {
                        hasTimeout = true;
                    }
                }

                if (!hasTimeout) {
                    // Infer `start` and `end` values from existing nodes
                    const start = node.start ?? 0;
                    const end = node.end ?? 0;

                    if (!configObject || configObject.type !== "ObjectExpression") {
                        // Create a new config object with a timeout
                        node.arguments.push({
                            type: "ObjectExpression",
                            properties: [
                                {
                                    type: "Property",
                                    key: { type: "Identifier", name: "timeout", start, end },
                                    value: { type: "Literal", value: 5000, start, end },
                                    kind: "init",
                                    method: false,
                                    shorthand: false,
                                    computed: false,
                                    start,
                                    end,
                                },
                            ],
                            start,
                            end,
                        });
                    } else {
                        // Add timeout to existing config object
                        configObject.properties.push({
                            type: "Property",
                            key: { type: "Identifier", name: "timeout", start, end },
                            value: { type: "Literal", value: 5000, start, end },
                            kind: "init",
                            method: false,
                            shorthand: false,
                            computed: false,
                            start,
                            end,
                        });
                    }
                    codeModified = true;
                }
            }
        },
    });

    return codeModified ? escodegen.generate(ast, { format: { indent: { style: "  " } } }) : "";
}
//2 fix logging 
async function applyFixLoggingIssue(issue: string) {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showErrorMessage('No workspace found.');
        return;
    }

    const match = issue.match(/^(.+?) - /);
    if (!match) {
        vscode.window.showErrorMessage('❌ Invalid issue format.');
        return;
    }

    const fileName = match[1].trim();
    const projectRoot = workspaceFolders[0].uri.fsPath;
    const allFiles = getAllJsTsFiles(projectRoot);
    const filePath = allFiles.find(file => path.basename(file) === fileName);

    if (!filePath) {
        vscode.window.showErrorMessage(`❌ Error: File not found in workspace - ${fileName}`);
        return;
    }

    try {
        const document = await vscode.workspace.openTextDocument(filePath);
        const text = document.getText();
        const fixedCode = fixLoggingIssues(text);

        if (fixedCode === text) {
            vscode.window.showInformationMessage(`✅ No changes needed in ${filePath}.`);
            return;
        }

        const edit = new vscode.WorkspaceEdit();
        const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(text.length));
        edit.replace(document.uri, fullRange, fixedCode);

        await vscode.workspace.applyEdit(edit);
        vscode.window.showInformationMessage(`✅ Logging issue fixed in ${filePath}.`);
    } catch (error) {
        vscode.window.showErrorMessage(`❌ Error fixing logging issue: ${error}`);
    }
}

function fixLoggingIssues(fileContent: string): string {
    let modifiedCode = fileContent;
    let changesMade = false;

    modifiedCode = modifiedCode.replace(
        /catch\s*\(([^)]+)\)\s*{([^}]*)}/g,
        (match, errorVar, body) => {
            if (!body.includes("console.error")) {
                changesMade = true;
                return `catch (${errorVar}) { console.error('Error:', ${errorVar}); ${body} }`;
            }
            return match;
        }
    );

    return changesMade ? modifiedCode : fileContent;
}

//3 fix rate limitation
async function applyFixRateLimitingIssue(issue: string) {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showErrorMessage('No workspace found.');
        return;
    }

    vscode.window.showInformationMessage(`Applying fix for rate limiting in ${issue}`);

    // Extract the correct filename from the issue message
    const match = issue.match(/^(.+?) - /);
    if (!match) {
        vscode.window.showErrorMessage('❌ Invalid issue format.');
        return;
    }

    const fileName = match[1].trim();
    console.log(`📌 Extracted file name from issue: ${fileName}`);

    // Get the correct file path from the project
    const projectRoot = workspaceFolders[0].uri.fsPath;
    const allFiles = getAllJsTsFiles(projectRoot);
    const filePath = allFiles.find(file => path.basename(file) === fileName);

    if (!filePath) {
        vscode.window.showErrorMessage(`❌ Error: File not found in workspace - ${fileName}`);
        return;
    }

    console.log(`✅ Targeting file for fix: ${filePath}`);

    let text = fs.readFileSync(filePath, 'utf8');
    console.log(`📄 Original Content:\n${text}`);

    const fixedCode = fixRateLimitingIssues(text);

    if (fixedCode === text) {
        vscode.window.showInformationMessage(`✅ No changes were needed in ${filePath}.`);
        return;
    }

    // Save the modified content
    try {
        fs.writeFileSync(filePath, fixedCode, 'utf8');
        console.log(`✅ Successfully updated ${filePath}`);
    } catch (error) {
        vscode.window.showErrorMessage(`❌ Failed to update ${filePath} - ${error}`);
        return;
    }

    // Reload the updated document in VS Code
    const document = await vscode.workspace.openTextDocument(filePath);
    await vscode.window.showTextDocument(document);

    vscode.window.showInformationMessage(`✅ Rate limiting middleware added in ${filePath}`);
}

function fixRateLimitingIssues(fileContent: string): string {
    let modified = false;

    if (!fileContent.includes("const rateLimit")) {
        fileContent = "const rateLimit = require('express-rate-limit');\n" + fileContent;
        modified = true;
    }

    if (!fileContent.includes("app.use(rateLimit")) {
        fileContent = fileContent.replace(
            /const app = express\(\);/,
            `const app = express();\napp.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));`
        );
        modified = true;
    }

    console.log(`🔧 Fix Applied: ${modified}`);
    return modified ? fileContent : fileContent; 
}

// 4 fix dependency
async function applyFixDependencyIssue(issue: string) {

    console.log(issue);
    const file = issue.split(" - ")[0].trim(); // Get everything before ' - '
    console.log("File:", file);
    const fileName = path.basename(file);
    console.log("File name:",fileName); 
    
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        return null;
    }
    const directory = workspaceFolders[0].uri.fsPath;
    console.log("directory", directory); 

    const filePath = path.join(directory, fileName);

    console.log("File path:", filePath); 

    try {
        const document = await vscode.workspace.openTextDocument(filePath);
        const text = document.getText();
        const ast = acorn.parse(text, { ecmaVersion: 'latest', sourceType: 'module' });

        const fixedCode = fixDependencyIssues(ast, filePath);

        if (fixedCode.length === 0) {
            vscode.window.showInformationMessage(`No changes needed in ${filePath}.`);
            return;
        }

        const edit = new vscode.WorkspaceEdit();
        const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(text.length));

        edit.replace(document.uri, fullRange, fixedCode);
        await vscode.workspace.applyEdit(edit);

        vscode.window.showInformationMessage(`✅ Dependency injection applied in ${filePath}.`);
    } catch (error) {
        vscode.window.showErrorMessage(`❌ Error fixing Dependency injection issue: ${error}`);
    }

}

function fixDependencyIssues(ast: any, file: string): string {
    let codeModified = false;

    walkAncestor(ast, {
        NewExpression(node: any, state: any, ancestors: any[]) {
            if (node.callee.type === 'Identifier') {
                const className = node.callee.name;
                const paramName = `inject${className}`;

                // Find the parent function/class where the `new` is used
                const parentClassNode = ancestors.find(ancestor => ancestor.type === 'ClassDeclaration');
                const parentFunctionNode = ancestors.find(ancestor => ancestor.type === 'FunctionDeclaration' || ancestor.type === 'FunctionExpression' || ancestor.type === 'ArrowFunctionExpression');

                if (parentClassNode) {
                    // Convert `this.db = new Database();` → Inject in constructor
                    let constructorNode = parentClassNode.body.body.find((method: any) => method.kind === 'constructor');

                    if (!constructorNode) {
                        // Create a constructor if it doesn't exist
                        constructorNode = {
                            type: 'MethodDefinition',
                            kind: 'constructor',
                            key: { type: 'Identifier', name: 'constructor' },
                            value: { type: 'FunctionExpression', params: [], body: { type: 'BlockStatement', body: [] },},
                        };
                        parentClassNode.body.body.unshift(constructorNode);
                    }

                    // Ensure the constructor has a `params` array
                    if (!constructorNode.value.params) {
                        constructorNode.value.params = [];
                    }

                    // Ensure constructor takes the dependency as a parameter
                    if (!constructorNode.value.params.some((param: any) => param.type === 'Identifier' && param.name === paramName)) {
                        constructorNode.value.params.unshift({type: 'Identifier', name: paramName,});
                    }

                    // Replace `new ClassName()` with the injected parameter
                    const assignmentNode = ancestors.find(ancestor => ancestor.type === 'AssignmentExpression');

                    if (assignmentNode && assignmentNode.right === node) {
                        assignmentNode.right = {type: 'Identifier', name: paramName};
                    }

                    codeModified = true;
                } else if (parentFunctionNode) {
                    // Handle function-level injection
                    if (!Array.isArray(parentFunctionNode.params)) {
                        parentFunctionNode.params = [];
                    }

                    if (!parentFunctionNode.params.some((param: any) => param.type === 'Identifier' && param.name === paramName)) {
                        parentFunctionNode.params.unshift({type: 'Identifier', name: paramName,});
                    }

                    // Replace `new ClassName()` with the injected parameter
                    const assignmentNode = ancestors.find(ancestor => ancestor.type === 'AssignmentExpression');

                    if (assignmentNode && assignmentNode.right === node) {
                        assignmentNode.right = {type: 'Identifier', name: paramName,};
                    }

                    codeModified = true;
                }
            }
        },
    });

    return codeModified ? escodegen.generate(ast) : "";
}

// 5 fix retry
async function applyFixRetryIssue(issue: string) {
    console.log("Fixing retry issue for:", issue);

    const file = issue.split(" - ")[0].trim();
    console.log("Extracted File Path:", file);

    const fileName = path.basename(file);
    console.log("Extracted File Name:", fileName);

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        console.error("No workspace folders found.");
        return null;
    }
    const directory = workspaceFolders[0].uri.fsPath;
    console.log("Workspace Directory:", directory);

    const filePath = path.join(directory, fileName);
    console.log("Final File Path:", filePath);

    try {
        const document = await vscode.workspace.openTextDocument(filePath);
        const text = document.getText();
        console.log("Original Code:", text);

        const ast = acorn.parse(text, { ecmaVersion: 'latest', sourceType: 'module' });
        const fixedCode = fixRetryIssues(ast, filePath);

        if (fixedCode.length === 0) {
            vscode.window.showInformationMessage(`No changes needed in ${filePath}.`);
            console.log("No modifications detected.");
            return;
        }

        const edit = new vscode.WorkspaceEdit();
        const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(text.length));

        edit.replace(document.uri, fullRange, fixedCode);
        await vscode.workspace.applyEdit(edit);

        vscode.window.showInformationMessage(`Retry issue fixed in ${filePath}.`);
        console.log("Fix applied successfully.");
    } catch (error) {
        vscode.window.showErrorMessage(`Error fixing retry issue: ${error}`);
        console.error("Error fixing retry issue:", error);
    }
}


function fixRetryIssues(ast: any, file: string): string {
    let codeModified = false;

    walkSimple(ast, {
        TryStatement(node) {
            if (node.block && node.block.body) {
                node.block.body.forEach((statement: any) => {
                    if (statement.type === "ExpressionStatement" && statement.expression.type === "CallExpression") {
                        const isApiCall =
                            statement.expression.callee.type === "MemberExpression" &&
                            (statement.expression.callee.object.name === "fetch" ||
                                statement.expression.callee.object.name === "axios");

                        if (isApiCall) {
                            console.log(`Adding retry logic to API call in ${file}`);

                            const retryLogic = {
                                type: "WhileStatement",
                                test: {
                                    type: "Literal",
                                    value: true,
                                    start: node.start,
                                    end: node.end,
                                },
                                body: {
                                    type: "BlockStatement",
                                    body: [
                                        {
                                            type: "ExpressionStatement",
                                            expression: statement.expression,
                                        },
                                    ],
                                },
                                start: node.start,
                                end: node.end,
                            };

                            statement.expression = retryLogic;
                            codeModified = true;
                        }
                    }
                });
            }
        },
    });

    if (!codeModified) {
        console.log(`No modifications made for retry logic in ${file}`);
        return "";
    }

    console.log("Generated fixed code:", escodegen.generate(ast, { format: { indent: { style: "  " } } }));
    return escodegen.generate(ast, { format: { indent: { style: "  " } } });
}



// === ISSUE DETECTION FUNCTIONS ===
//1 detectRetryIssues
function detectRetryIssues(ast: any, file: string): string[] {
    const issues: string[] = [];

    estraverse.traverse(ast as any, {
        enter(node: any, parent: any) {
            console.log(`Inspecting node of type: ${node.type} in file: ${file}`);

            // Detect API calls (fetch or axios)
            if (
                node.type === 'CallExpression' &&
                node.callee.type === 'Identifier' &&
                (node.callee.name === 'fetch' || node.callee.name === 'axios')
            ) {
                let hasRetryLoop = false;
                let hasTryCatch = false;
                let identifierName = 'UnknownVariable';

                console.log(`Found API call (${node.callee.name}) in file: ${file}`);

                // Check if this API call is assigned to a variable
                if (parent && parent.type === 'VariableDeclarator' && parent.id.type === 'Identifier') {
                    identifierName = parent.id.name;
                    console.log(`API call result stored in variable: ${identifierName}`);
                }

                // Check if it's inside a try-catch block
                let ancestor = parent;
                while (ancestor) {
                    if (ancestor.type === 'TryStatement') {
                        hasTryCatch = true;
                        console.log(`API call (${node.callee.name}) inside try-catch in file: ${file}`);
                        break;
                    }
                    ancestor = ancestor.parent;
                }

                // Check for retry mechanisms (loop or recursive call)
                estraverse.traverse(node, {
                    enter(subNode: any) {
                        if (subNode.type === 'WhileStatement' || subNode.type === 'ForStatement') {
                            hasRetryLoop = true;
                            console.log(`Found retry loop in file: ${file}`);
                        }
                    }
                });

                // If API call is found without a retry mechanism, flag it with identifier
                if (!hasRetryLoop) {
                    issues.push(
                        `${file} - API call (${node.callee.name}) stored in "${identifierName}" is missing retry logic.`
                    );
                    console.log(
                        `Missing retry logic detected in file: ${file} for variable "${identifierName}".`
                    );
                }
            }
        }
    });

    console.log(`Issues detected: ${issues.length}`);
    return issues;
}



//2 detectCircuitBreakerIssues
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
        issues.push(`${file} - Missing circuit breaker logic.`);
    }
    return issues;
}
//3 detectHealthCheckIssues
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
        issues.push(`${file} - No health-check endpoint detected.`);
    }
    return issues;
}
//4 detectTimeoutIssues
function detectTimeoutIssues(ast: any, file: string): string[] {
    const issues: string[] = [];
    let hasTimeout = false;

    walkSimple(ast, {
        CallExpression(node) {
            if (node.callee.type === 'MemberExpression' && node.callee.object.type === 'Identifier' && node.callee.object.name === 'axios') {
                // const configArg = node.arguments[1];
                // Check all arguments
                for (const configArg of node.arguments) {
                    if (configArg && configArg.type === 'ObjectExpression') {
                        const hasTimeoutProp = configArg.properties.some((prop: any) =>
                            prop.type === 'Property' && prop.key.type === 'Identifier' && prop.key.name === 'timeout'
                        );
                        if (hasTimeoutProp) {
                            hasTimeout = true;
                            break; // Exit loop once timeout is found
                        }
                    }
                }
            }
        }
    });

    if (!hasTimeout) {
        issues.push(`${file} - No timeout configuration in axios API calls.`);
    }

    return issues;
}
//5 detectDependencyInjectionIssues
function detectDependencyIssues(ast: any, file: string): string[] {
    const issues: string[] = [];
    walkAncestor(ast, {
        NewExpression(node: any, ancestors: any[]) {
            if (node.callee.type === 'Identifier') {
                // Check if the `new` expression is inside a class or function
                const insideClassOrFunction = ancestors.some(
                    (ancestor) =>
                        ancestor.type === "ClassDeclaration" ||
                        ancestor.type === "FunctionDeclaration" ||
                        ancestor.type === "FunctionExpression" ||
                        ancestor.type === "ArrowFunctionExpression"
                );
                if (insideClassOrFunction) {
                    issues.push(`${file} - Hardcoded dependency detected: ${node.callee.name}. Consider using dependency injection.`);
                }
            }
        }
    });
    return issues;
}
//6 detectLoggingIssues
function detectLoggingIssues(ast: any, file: string): string[] {
    const issues: string[] = [];
    walkSimple(ast, {
        TryStatement(node) {
            if (node.handler) {
                let hasLogging = false;
                walkSimple(node.handler.body, {
                    CallExpression(innerNode) {
                        if (innerNode.callee.type === 'MemberExpression' &&
                            innerNode.callee.object.type === 'Identifier' &&
                            innerNode.callee.object.name === 'console') {
                            hasLogging = true;
                        }
                    }
                });
                if (!hasLogging) {
                    issues.push(`${file} - Missing logging in try-catch block.`);
                }
            }
        }
    });
    return issues;
}
//7 detectRateLimitingIssues
function detectRateLimitingIssues(ast: any, file: string): string[] {
    const issues: string[] = [];
    let foundRateLimit = false;

    walkSimple(ast, {
        CallExpression(node) {
            if (
                node.callee.type === 'MemberExpression' &&
                node.callee.object.type === 'Identifier' &&
                node.callee.object.name === 'app' &&
                node.callee.property.type === 'Identifier' &&
                node.callee.property.name === 'use'
            ) {
                const args = node.arguments;

                if (
                    args.some(arg =>
                        arg.type === 'CallExpression' &&
                        arg.callee &&
                        arg.callee.type === 'Identifier' &&
                        arg.callee.name === 'rateLimit'
                    )
                ) {
                    foundRateLimit = true;
                }
            }
        }
    });

    if (!foundRateLimit) {
        console.log(`❌ Scanner found missing rate limiting in: ${file}`);
        issues.push(`${file} - Rate limiting middleware is missing.`);
    } else {
        console.log(`✅ Scanner detected rate limiting is already present in: ${file}`);
    }

    return issues;
}


// 8 detectSecureHeadersIssues
function detectSecureHeadersIssues(ast: any, file: string): string[] {
    const issues: string[] = [];
    let foundHelmet = false;
    walkSimple(ast, {
        CallExpression(node) {
            if (node.callee.type === 'Identifier' && node.callee.name === 'helmet') {
                foundHelmet = true;
            }
        }
    });
    if (!foundHelmet) {
        issues.push(`${file} - Secure headers middleware (helmet) is missing.`);
    }
    return issues;
}
//9 detectInputValidationIssues
function detectInputValidationIssues(ast: any, file: string): string[] {
    const issues: string[] = [];

    walkSimple(ast, {
        CallExpression(node) {
            if (
                node.callee.type === 'MemberExpression' &&
                node.callee.object.type === 'Identifier' &&
                node.callee.object.name === 'app' &&
                node.callee.property.type === 'Identifier' && // Ensure property is an Identifier
                ['get', 'post', 'put', 'delete'].includes(node.callee.property.name) // Check HTTP method
            ) {
                const routePath = node.arguments[0]; // First argument (route path)
                const routeHandler = node.arguments[1]; // Second argument (route handler)

                // Ensure routePath is a Literal (string)
                if (routePath && routePath.type === 'Literal' && typeof routePath.value === 'string') {
                    if (routeHandler?.type === 'Identifier' && !routeHandler.name.includes('validate')) {
                        issues.push(`${file} - Missing input validation middleware for route: ${routePath.value}`);
                    }
                }
            }
        }
    });

    return issues;
}


// Deactivate extension
export function deactivate() { }