//----------OLD MAIN FILE----------------
// import * as vscode from 'vscode';
// import * as fs from 'fs';
// import * as path from 'path';
// import * as acorn from 'acorn';
// import { simple as walkSimple } from 'acorn-walk';
// import { ancestor as walkAncestor } from "acorn-walk";
// import * as escodegen from "escodegen";
// import * as estraverse from 'estraverse';
// import * as estree from "estree";

// // === Activation of the VSCode Extension ===
// export function activate(context: vscode.ExtensionContext) {
//     let disposable = vscode.commands.registerCommand('healops.openPanel', () => {
//         HealOpsPanel.createOrShow(context.extensionUri);
//     });

//     context.subscriptions.push(disposable);
// }

// // === UI (Sidebar Panel) ===
// class HealOpsPanel {
//     public static currentPanel: HealOpsPanel | undefined;
//     private readonly _panel: vscode.WebviewPanel;
//     private readonly _extensionUri: vscode.Uri;

//     private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
//         this._panel = panel;
//         this._extensionUri = extensionUri;

//         this._update();
//         this._setupMessageListener();
//     }

//     // Function to create or show the webview panel
//     public static createOrShow(extensionUri: vscode.Uri) {
//         if (HealOpsPanel.currentPanel) {
//             HealOpsPanel.currentPanel._panel.reveal(vscode.ViewColumn.One);
//             return;
//         }

//         const panel = vscode.window.createWebviewPanel(
//             'healOpsPanel',
//             'HealOps - Microservices Scanner',
//             vscode.ViewColumn.One,
//             { enableScripts: true }
//         );

//         HealOpsPanel.currentPanel = new HealOpsPanel(panel, extensionUri);

//         panel.onDidDispose(() => {
//             HealOpsPanel.currentPanel = undefined;
//         }, null);
//     }

//     // Updates the content of the webview panel
//     private _update() {
//         this._panel.webview.html = this._getHtmlForWebview();
//     }

//     // Setup message listener for communication between UI and extension
//     private _setupMessageListener() {
//         this._panel.webview.onDidReceiveMessage(
//             async (message) => {
//                 if (message.command === 'scan') {
//                     // Scan project and update UI
//                     const issues = await scanProject((progress) => {
//                         this._panel.webview.postMessage({ command: 'updateProgress', progress });
//                     });
//                     this._panel.webview.postMessage({ command: 'updateIssues', data: issues });
//                 } else if (message.command === 'fixIssue') {
//                     // Apply fixes based on detected issues
//                     if (message.issue.includes('No timeout configuration in axios API calls.')) {
//                         applyFixTimeoutIssue(message.issue);
//                     } else if (message.issue.includes('Missing logging in try-catch block')) {
//                         applyFixLoggingIssue(message.issue);
//                     } else if (message.issue.includes('Rate limiting middleware is missing')) {
//                         applyFixRateLimitingIssue(message.issue);
//                     } else if (message.issue.includes('Hardcoded dependency detected')) {
//                         applyFixDependencyIssue(message.issue);
//                     } else if (message.issue.includes('is missing retry logic')) {
//                         console.log("Calling applyFixRetryIssue...");
//                         applyFixRetryIssue(message.issue);
//                     } else if (message.issue.includes('Missing circuit breaker logic')) {
//                         applyFixCircuitBreakerIssue(message.issue);
//                     } else if (message.issue.includes('No health-check endpoint detected')) {
//                         applyFixHealthCheckIssue(message.issue);
//                     } else if (message.issue.includes('Secure headers middleware (helmet) is missing')) {
//                         applyFixSecureHeadersIssue(message.issue);
//                     } else if (message.issue.includes('Missing input validation middleware')) {
//                         applyFixInputValidationIssue(message.issue);
//                     }
//                     else {
//                         vscode.window.showInformationMessage('Fixing still under work');
//                     }
//                 }
//             },
//             null
//         );
//     }


//     // HTML content for the webview panel
//     private _getHtmlForWebview() {
//         return `<!DOCTYPE html>
//         <html lang="en">
//         <head>
//             <meta charset="UTF-8">
//             <meta name="viewport" content="width=device-width, initial-scale=1.0">
//             <title>HealOps Scanner</title>
//             <style>
//                 body { font-family: Arial, sans-serif; padding: 20px; }
//                 button { padding: 10px; background: #007acc; color: white; border: none; cursor: pointer; margin-bottom: 10px; }
//                 #progress { width: 100%; background: #ccc; height: 10px; }
//                 #progress-bar { height: 10px; width: 0%; background: #007acc; }
//                 #issues { margin-top: 20px; }
//                 .issue-item { border-bottom: 1px solid #ddd; padding: 10px; }
//                 .fix-btn { background: green; color: white; padding: 5px; cursor: pointer; border: none; }
//             </style>
//         </head>
//         <body>
//             <h2>HealOps - Microservices Scanner</h2>
//             <button id="scanButton">🔍 Scan Project</button>
//             <div id="progress"><div id="progress-bar"></div></div>
//             <div id="issues"></div>

//             <script>
//                 const vscode = acquireVsCodeApi();

//                 document.getElementById('scanButton').addEventListener('click', () => {
//                     vscode.postMessage({ command: 'scan' });
//                 });

//                 window.addEventListener('message', event => {
//                     const { command, data, progress } = event.data;
//                     if (command === 'updateIssues') {
//                         document.getElementById('issues').innerHTML =
//                             data.map(issue =>
//                                 \`<div class="issue-item">\${issue}
//                                 <button class="fix-btn" onclick="fixIssue('\${issue}')">Fix</button></div>\`
//                             ).join('');
//                     } else if (command === 'updateProgress') {
//                         document.getElementById('progress-bar').style.width = progress + '%';
//                     }
//                 });

//                 function fixIssue(issue) {
//                     vscode.postMessage({ command: 'fixIssue', issue });
//                 }
//             </script>
//         </body>
//         </html>`;
//     }
// }

// // === Scanning Functions ===
// async function scanProject(updateProgress: (progress: number) => void) {
//     const workspaceFolders = vscode.workspace.workspaceFolders;
//     if (!workspaceFolders) {
//         vscode.window.showErrorMessage('No workspace found.');
//         return [];
//     }

//     const projectRoot = workspaceFolders[0].uri.fsPath;
//     const jsTsFiles = getAllJsTsFiles(projectRoot);

//     if (jsTsFiles.length === 0) {
//         vscode.window.showInformationMessage('No JavaScript or TypeScript files found.');
//         return [];
//     }

//     let totalIssues: string[] = [];
//     const totalFiles = jsTsFiles.length;

//     for (let i = 0; i < totalFiles; i++) {
//         const file = jsTsFiles[i];
//         const fileContent = fs.readFileSync(file, 'utf8');
//         const ast = acorn.parse(fileContent, { ecmaVersion: 'latest', sourceType: 'module' });

//         const fileName = path.basename(file);
//         totalIssues.push(...detectIssues(ast, fileName));

//         // totalIssues.push(...detectIssues(ast, file));

//         updateProgress(Math.round(((i + 1) / totalFiles) * 100));
//     }

//     return totalIssues;
// }

// // Function to get all JavaScript and TypeScript files in a project
// function getAllJsTsFiles(dir: string): string[] {
//     let filesList: string[] = [];
//     const files = fs.readdirSync(dir);

//     for (const file of files) {
//         const filePath = path.join(dir, file);
//         const stat = fs.statSync(filePath);

//         if (stat.isDirectory()) {
//             filesList = filesList.concat(getAllJsTsFiles(filePath));
//         } else if (file.endsWith('.js') || file.endsWith('.ts')) {
//             filesList.push(filePath);
//         }
//     }

//     return filesList;
// }

// // === Issue Detection Functions (9 checks) ===
// function detectIssues(ast: any, file: string): string[] {
//     return [
//         ...detectRetryIssues(ast, file),
//         ...detectCircuitBreakerIssues(ast, file),
//         ...detectHealthCheckIssues(ast, file),
//         ...detectTimeoutIssues(ast, file),
//         ...detectDependencyIssues(ast, file),
//         ...detectLoggingIssues(ast, file),
//         ...detectRateLimitingIssues(ast, file),
//         ...detectSecureHeadersIssues(ast, file),
//         ...detectInputValidationIssues(ast, file)
//     ];
// }


// function fixIssue(issue: string) {
//     vscode.window.showInformationMessage(`AI Fixing still under work: ${issue}`);

//     // Simulate AI-generated fix with a timeout
//     setTimeout(() => {
//         vscode.window.showInformationMessage(`AI Fixing still under work: ${issue}`);
//     }, 2000);
// }


// //1 fix time out
// async function applyFixTimeoutIssue(issue: string) {
//     // Log the issue being processed
//     console.log(issue);

//     // Extract the filename from the issue report (everything before " - ")
//     const file = issue.split(" - ")[0].trim();
//     console.log("File:", file);

//     const fileName = path.basename(file);
//     console.log("File name:", fileName);

//     // Ensure a workspace is open
//     const workspaceFolders = vscode.workspace.workspaceFolders;
//     if (!workspaceFolders) {
//         return null;
//     }

//     // Get the workspace directory
//     const directory = workspaceFolders[0].uri.fsPath;
//     console.log("Directory:", directory);

//     // Construct the full file path
//     const filePath = path.join(directory, fileName);
//     console.log("File path:", filePath);

//     try {
//         // Open and read the file content
//         const document = await vscode.workspace.openTextDocument(filePath);
//         const text = document.getText();

//         // Parse the file content into an AST (Abstract Syntax Tree) using Acorn
//         const ast = acorn.parse(text, { ecmaVersion: 'latest', sourceType: 'module' });

//         // Apply the timeout fix
//         const fixedCode = fixTimeoutIssues(ast, filePath);

//         // If no modifications were made, inform the user
//         if (fixedCode.length === 0) {
//             vscode.window.showInformationMessage(`No changes needed in ${filePath}.`);
//             return;
//         }

//         // Apply the fixed code to the document in VSCode
//         const edit = new vscode.WorkspaceEdit();
//         const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(text.length));
//         edit.replace(document.uri, fullRange, fixedCode);

//         await vscode.workspace.applyEdit(edit);
//         vscode.window.showInformationMessage(`✅ Timeout issue fixed in ${filePath}.`);
//     } catch (error) {
//         // Handle any errors that occur during the process
//         vscode.window.showErrorMessage(`❌ Error fixing timeout issue: ${error}`);
//     }
// }


// function fixTimeoutIssues(ast: any, file: string): string {
//     let codeModified = false; // Track if any modifications were made

//     // Traverse the AST to detect Axios calls
//     walkSimple(ast, {
//         CallExpression(node) {
//             // Check if the function call is an Axios request
//             if (node.callee.type === "MemberExpression" &&
//                 node.callee.object.type === "Identifier" &&
//                 node.callee.object.name === "axios") {

//                 let hasTimeout = false;
//                 let configObject = null;

//                 // If Axios request has more than one argument, check the second argument (config object)
//                 if (node.arguments.length > 1) {
//                     configObject = node.arguments[1];

//                     // Check if the config object contains a "timeout" property
//                     if (configObject.type === "ObjectExpression" &&
//                         configObject.properties.some((prop) =>
//                             prop.type === "Property" &&
//                             prop.key.type === "Identifier" &&
//                             prop.key.name === "timeout")) {
//                         hasTimeout = true;
//                     }
//                 }

//                 // If timeout is missing, add it to the request configuration
//                 if (!hasTimeout) {
//                     // Infer `start` and `end` values from existing nodes to maintain structure
//                     const start = node.start ?? 0;
//                     const end = node.end ?? 0;

//                     if (!configObject || configObject.type !== "ObjectExpression") {
//                         // If there is no config object, create a new one with the timeout property
//                         node.arguments.push({
//                             type: "ObjectExpression",
//                             properties: [
//                                 {
//                                     type: "Property",
//                                     key: { type: "Identifier", name: "timeout", start, end },
//                                     value: { type: "Literal", value: 5000, start, end },
//                                     kind: "init",
//                                     method: false,
//                                     shorthand: false,
//                                     computed: false,
//                                     start,
//                                     end,
//                                 },
//                             ],
//                             start,
//                             end,
//                         });
//                     } else {
//                         // If a config object exists, append the timeout property to it
//                         configObject.properties.push({
//                             type: "Property",
//                             key: { type: "Identifier", name: "timeout", start, end },
//                             value: { type: "Literal", value: 5000, start, end },
//                             kind: "init",
//                             method: false,
//                             shorthand: false,
//                             computed: false,
//                             start,
//                             end,
//                         });
//                     }
//                     codeModified = true; // Mark modification as true
//                 }
//             }
//         },
//     });

//     // If modifications were made, return the updated code; otherwise, return an empty string
//     return codeModified ? escodegen.generate(ast, { format: { indent: { style: "  " } } }) : "";
// }

// //2 fix logging
// async function applyFixLoggingIssue(issue: string) {
//     // Ensure that the workspace is available
//     const workspaceFolders = vscode.workspace.workspaceFolders;
//     if (!workspaceFolders) {
//         vscode.window.showErrorMessage('No workspace found.');
//         return;
//     }

//     // Extract file name from the issue description
//     const match = issue.match(/^(.+?) - /);
//     if (!match) {
//         vscode.window.showErrorMessage('❌ Invalid issue format.');
//         return;
//     }

//     const fileName = match[1].trim(); // Extract filename from issue report
//     const projectRoot = workspaceFolders[0].uri.fsPath; // Get workspace root directory
//     const allFiles = getAllJsTsFiles(projectRoot); // Get all JavaScript and TypeScript files
//     const filePath = allFiles.find(file => path.basename(file) === fileName); // Find file path

//     // If file is not found, show an error message
//     if (!filePath) {
//         vscode.window.showErrorMessage(`❌ Error: File not found in workspace - ${fileName}`);
//         return;
//     }

//     try {
//         // Open the file as a VSCode document
//         const document = await vscode.workspace.openTextDocument(filePath);
//         const text = document.getText(); // Read file content
//         const fixedCode = fixLoggingIssues(text); // Apply fix to missing logging

//         // If no changes are needed, notify the user
//         if (fixedCode === text) {
//             vscode.window.showInformationMessage(`✅ No changes needed in ${filePath}.`);
//             return;
//         }

//         // Apply the fix to the document in VSCode
//         const edit = new vscode.WorkspaceEdit();
//         const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(text.length));
//         edit.replace(document.uri, fullRange, fixedCode);

//         await vscode.workspace.applyEdit(edit);
//         vscode.window.showInformationMessage(`✅ Logging issue fixed in ${filePath}.`);
//     } catch (error) {
//         vscode.window.showErrorMessage(`❌ Error fixing logging issue: ${error}`);
//     }
// }

// function fixLoggingIssues(fileContent: string): string {
//     let modifiedCode = fileContent; // Store the original file content
//     let changesMade = false; // Track whether any changes are made

//     // Regular expression to detect try-catch blocks without console.error
//     modifiedCode = modifiedCode.replace(
//         /catch\s*\(([^)]+)\)\s*{([^}]*)}/g, // Match `catch(error) { /*code*/ }`
//         (match, errorVar, body) => {
//             if (!body.includes("console.error")) { // Check if logging is missing
//                 changesMade = true;
//                 return `catch (${errorVar}) { console.error('Error:', ${errorVar}); ${body} }`;
//             }
//             return match; // Return unchanged if logging already exists
//         }
//     );

//     return changesMade ? modifiedCode : fileContent; // Return modified or original content
// }


// //3 fix rate limitation
// async function applyFixRateLimitingIssue(issue: string) {
//     // Ensure that a workspace is open
//     const workspaceFolders = vscode.workspace.workspaceFolders;
//     if (!workspaceFolders) {
//         vscode.window.showErrorMessage('No workspace found.');
//         return;
//     }

//     vscode.window.showInformationMessage(`Applying fix for rate limiting in ${issue}`);

//     // Extract the filename from the issue message using regex
//     const match = issue.match(/^(.+?) - /);
//     if (!match) {
//         vscode.window.showErrorMessage('❌ Invalid issue format.');
//         return;
//     }

//     const fileName = match[1].trim(); // Extract the file name
//     console.log(`📌 Extracted file name from issue: ${fileName}`);

//     // Locate the file in the workspace
//     const projectRoot = workspaceFolders[0].uri.fsPath;
//     const allFiles = getAllJsTsFiles(projectRoot);
//     const filePath = allFiles.find(file => path.basename(file) === fileName);

//     // If file is not found, notify the user
//     if (!filePath) {
//         vscode.window.showErrorMessage(`❌ Error: File not found in workspace - ${fileName}`);
//         return;
//     }

//     console.log(`✅ Targeting file for fix: ${filePath}`);

//     let text = fs.readFileSync(filePath, 'utf8');
//     console.log(`📄 Original Content:\n${text}`);

//     // Apply fix for rate limiting
//     const fixedCode = fixRateLimitingIssues(text);

//     // If no changes were needed, notify the user
//     if (fixedCode === text) {
//         vscode.window.showInformationMessage(`✅ No changes were needed in ${filePath}.`);
//         return;
//     }

//     // Save the modified content back to the file
//     try {
//         fs.writeFileSync(filePath, fixedCode, 'utf8');
//         console.log(`✅ Successfully updated ${filePath}`);
//     } catch (error) {
//         vscode.window.showErrorMessage(`❌ Failed to update ${filePath} - ${error}`);
//         return;
//     }

//     // Reload the updated document in VS Code to reflect changes
//     const document = await vscode.workspace.openTextDocument(filePath);
//     await vscode.window.showTextDocument(document);

//     vscode.window.showInformationMessage(`✅ Rate limiting middleware added in ${filePath}`);
// }

// function fixRateLimitingIssues(fileContent: string): string {
//     let modified = false;

//     // If rateLimit is not imported, add the required import statement
//     if (!fileContent.includes("const rateLimit")) {
//         fileContent = "const rateLimit = require('express-rate-limit');\n" + fileContent;
//         modified = true;
//     }

//     // If rate limiting middleware is not applied, add `app.use(rateLimit(...))`
//     if (!fileContent.includes("app.use(rateLimit")) {
//         fileContent = fileContent.replace(
//             /const app = express\(\);/,
//             `const app = express();\napp.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));`
//         );
//         modified = true;
//     }

//     console.log(`🔧 Fix Applied: ${modified}`);
//     return modified ? fileContent : fileContent;
// }


// // 4 fix dependency
// async function applyFixDependencyIssue(issue: string) {
//     // Log the issue being processed
//     console.log(issue);

//     // Extract the filename from the issue report (everything before " - ")
//     const file = issue.split(" - ")[0].trim();
//     console.log("File:", file);

//     const fileName = path.basename(file);
//     console.log("File name:", fileName);

//     // Ensure a workspace is open
//     const workspaceFolders = vscode.workspace.workspaceFolders;
//     if (!workspaceFolders) {
//         return null;
//     }

//     // Get the workspace directory
//     const directory = workspaceFolders[0].uri.fsPath;
//     console.log("Directory:", directory);

//     // Construct the full file path
//     const filePath = path.join(directory, fileName);
//     console.log("File path:", filePath);

//     try {
//         // Open and read the file content
//         const document = await vscode.workspace.openTextDocument(filePath);
//         const text = document.getText();

//         // Parse the file content into an AST (Abstract Syntax Tree) using Acorn
//         const ast = acorn.parse(text, { ecmaVersion: 'latest', sourceType: 'module' });

//         // Apply the dependency injection fix
//         const fixedCode = fixDependencyIssues(ast, filePath);

//         // If no modifications were made, inform the user
//         if (fixedCode.length === 0) {
//             vscode.window.showInformationMessage(`No changes needed in ${filePath}.`);
//             return;
//         }

//         // Apply the fixed code to the document in VSCode
//         const edit = new vscode.WorkspaceEdit();
//         const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(text.length));
//         edit.replace(document.uri, fullRange, fixedCode);

//         await vscode.workspace.applyEdit(edit);
//         vscode.window.showInformationMessage(`✅ Dependency injection applied in ${filePath}.`);
//     } catch (error) {
//         // Handle any errors that occur during the process
//         vscode.window.showErrorMessage(`❌ Error fixing Dependency injection issue: ${error}`);
//     }
// }


// function fixDependencyIssues(ast: any, file: string): string {
//     let codeModified = false;

//     walkAncestor(ast, {
//         NewExpression(node: any, state: any, ancestors: any[]) {
//             if (node.callee.type === 'Identifier') {
//                 const className = node.callee.name;
//                 const paramName = `inject${className}`;

//                 // Find the parent function/class where the `new` is used
//                 const parentClassNode = ancestors.find(ancestor => ancestor.type === 'ClassDeclaration');
//                 const parentFunctionNode = ancestors.find(ancestor => ancestor.type === 'FunctionDeclaration' || ancestor.type === 'FunctionExpression' || ancestor.type === 'ArrowFunctionExpression');

//                 if (parentClassNode) {
//                     // Convert `this.db = new Database();` → Inject in constructor
//                     let constructorNode = parentClassNode.body.body.find((method: any) => method.kind === 'constructor');

//                     if (!constructorNode) {
//                         // Create a constructor if it doesn't exist
//                         constructorNode = {
//                             type: 'MethodDefinition',
//                             kind: 'constructor',
//                             key: { type: 'Identifier', name: 'constructor' },
//                             value: { type: 'FunctionExpression', params: [], body: { type: 'BlockStatement', body: [] }, },
//                         };
//                         parentClassNode.body.body.unshift(constructorNode);
//                     }

//                     // Ensure the constructor has a `params` array
//                     if (!constructorNode.value.params) {
//                         constructorNode.value.params = [];
//                     }

//                     // Ensure constructor takes the dependency as a parameter
//                     if (!constructorNode.value.params.some((param: any) => param.type === 'Identifier' && param.name === paramName)) {
//                         constructorNode.value.params.unshift({ type: 'Identifier', name: paramName, });
//                     }

//                     // Replace `new ClassName()` with the injected parameter
//                     const assignmentNode = ancestors.find(ancestor => ancestor.type === 'AssignmentExpression');

//                     if (assignmentNode && assignmentNode.right === node) {
//                         assignmentNode.right = { type: 'Identifier', name: paramName };
//                     }

//                     codeModified = true;
//                 } else if (parentFunctionNode) {
//                     // Handle function-level injection
//                     if (!Array.isArray(parentFunctionNode.params)) {
//                         parentFunctionNode.params = [];
//                     }

//                     if (!parentFunctionNode.params.some((param: any) => param.type === 'Identifier' && param.name === paramName)) {
//                         parentFunctionNode.params.unshift({ type: 'Identifier', name: paramName, });
//                     }

//                     // Replace `new ClassName()` with the injected parameter
//                     const assignmentNode = ancestors.find(ancestor => ancestor.type === 'AssignmentExpression');

//                     if (assignmentNode && assignmentNode.right === node) {
//                         assignmentNode.right = { type: 'Identifier', name: paramName, };
//                     }

//                     codeModified = true;
//                 }
//             }
//         },
//     });

//     return codeModified ? escodegen.generate(ast) : "";
// }

// // 5 fix retry
// async function applyFixRetryIssue(issue: string) {
//     console.log("Fixing retry issue for:", issue);

//     // Extract the file path from the reported issue
//     const file = issue.split(" - ")[0].trim();
//     console.log("Extracted File Path:", file);

//     const fileName = path.basename(file);
//     console.log("Extracted File Name:", fileName);

//     // Ensure a workspace is open
//     const workspaceFolders = vscode.workspace.workspaceFolders;
//     if (!workspaceFolders) {
//         console.error("No workspace folders found.");
//         return null;
//     }

//     // Get the workspace directory
//     const directory = workspaceFolders[0].uri.fsPath;
//     console.log("Workspace Directory:", directory);

//     // Construct the full file path
//     const filePath = path.join(directory, fileName);
//     console.log("Final File Path:", filePath);

//     try {
//         // Open and read the file content
//         const document = await vscode.workspace.openTextDocument(filePath);
//         const text = document.getText();
//         console.log("Original Code:", text);

//         // Parse the file content into an AST (Abstract Syntax Tree) using Acorn
//         const ast = acorn.parse(text, { ecmaVersion: 'latest', sourceType: 'module' });

//         // Apply the retry logic fix
//         const fixedCode = fixRetryIssues(ast, filePath);

//         // If no modifications were made, inform the user
//         if (fixedCode.length === 0) {
//             vscode.window.showInformationMessage(`No changes needed in ${filePath}.`);
//             console.log("No modifications detected.");
//             return;
//         }

//         // Apply the fixed code to the document in VSCode
//         const edit = new vscode.WorkspaceEdit();
//         const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(text.length));
//         edit.replace(document.uri, fullRange, fixedCode);

//         await vscode.workspace.applyEdit(edit);
//         vscode.window.showInformationMessage(`✅ Retry issue fixed in ${filePath}.`);
//         console.log("Fix applied successfully.");
//     } catch (error) {
//         // Handle any errors that occur during the process
//         vscode.window.showErrorMessage(`❌ Error fixing retry issue: ${error}`);
//         console.error("Error fixing retry issue:", error);
//     }
// }



// function fixRetryIssues(ast: any, file: string): string {
//     let codeModified = false; // Track if any modifications were made

//     // Traverse the AST to detect try-catch blocks containing API calls
//     walkSimple(ast, {
//         TryStatement(node) {
//             if (node.block && node.block.body) {
//                 // Iterate through the statements inside the try block
//                 node.block.body.forEach((statement: any) => {
//                     // Ensure the statement is a function call (API request)
//                     if (statement.type === "ExpressionStatement" && statement.expression.type === "CallExpression") {
//                         const isApiCall =
//                             statement.expression.callee.type === "MemberExpression" &&
//                             (statement.expression.callee.object.name === "fetch" ||
//                                 statement.expression.callee.object.name === "axios"); // Detect fetch or axios API calls

//                         if (isApiCall) {
//                             console.log(`Adding retry logic to API call in ${file}`);

//                             // Construct a basic while loop for retrying the API call
//                             const retryLogic = {
//                                 type: "WhileStatement",
//                                 test: {
//                                     type: "Literal",
//                                     value: true, // Infinite loop until the condition is manually handled
//                                     start: node.start,
//                                     end: node.end,
//                                 },
//                                 body: {
//                                     type: "BlockStatement",
//                                     body: [
//                                         {
//                                             type: "ExpressionStatement",
//                                             expression: statement.expression, // Reuse the existing API call
//                                         },
//                                     ],
//                                 },
//                                 start: node.start,
//                                 end: node.end,
//                             };

//                             // Replace the original expression with the retry logic
//                             statement.expression = retryLogic;
//                             codeModified = true;
//                         }
//                     }
//                 });
//             }
//         },
//     });

//     // If no modifications were made, return an empty string (no changes)
//     if (!codeModified) {
//         console.log(`No modifications made for retry logic in ${file}`);
//         return "";
//     }

//     // Generate and return the modified code with retry logic added
//     console.log("Generated fixed code:", escodegen.generate(ast, { format: { indent: { style: "  " } } }));
//     return escodegen.generate(ast, { format: { indent: { style: "  " } } });
// }

// // 6 fix circuit
// async function applyFixCircuitBreakerIssue(issue: string) {
//     console.log("Fixing circuit breaker issue for:", issue);

//     // Extract the file path from the reported issue
//     const file = issue.split(" - ")[0].trim();
//     console.log("Extracted File Path:", file);

//     const fileName = path.basename(file);
//     console.log("Extracted File Name:", fileName);

//     // Ensure a workspace is open
//     const workspaceFolders = vscode.workspace.workspaceFolders;
//     if (!workspaceFolders) {
//         console.error("No workspace folders found.");
//         return null;
//     }

//     // Get the workspace directory
//     const directory = workspaceFolders[0].uri.fsPath;
//     console.log("Workspace Directory:", directory);

//     // Construct the full file path
//     const filePath = path.join(directory, fileName);
//     console.log("Final File Path:", filePath);

//     try {
//         // Open and read the file content
//         const document = await vscode.workspace.openTextDocument(filePath);
//         const text = document.getText();
//         console.log("Original Code:", text);

//         // Parse the file content into an AST (Abstract Syntax Tree) using Acorn
//         const ast = acorn.parse(text, { ecmaVersion: 'latest', sourceType: 'module' });

//         // Apply the circuit breaker fix
//         const fixedCode = fixCircuitBreakerIssues(ast, filePath);

//         // If no modifications were made, inform the user
//         if (fixedCode.length === 0) {
//             vscode.window.showInformationMessage(`No changes needed in ${filePath}.`);
//             console.log("No modifications detected.");
//             return;
//         }

//         // Apply the fixed code to the document in VSCode
//         const edit = new vscode.WorkspaceEdit();
//         const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(text.length));
//         edit.replace(document.uri, fullRange, fixedCode);

//         await vscode.workspace.applyEdit(edit);
//         vscode.window.showInformationMessage(`✅ Circuit breaker applied in ${filePath}.`);
//         console.log("Fix applied successfully.");
//     } catch (error) {
//         // Handle any errors that occur during the process
//         vscode.window.showErrorMessage(`❌ Error fixing circuit breaker issue: ${error}`);
//         console.error("Error fixing circuit breaker issue:", error);
//     }
// }

// function fixCircuitBreakerIssues(ast: any, file: string): string {
//     let codeModified = false;
//     let hasCircuitBreakerImport = false;
//     let breakerVar: string | null = null; // ✅ Ensure it is a string


//     // Check for existing `opossum` import
//     walkAncestor(ast, {
//         ImportDeclaration(node: any) {
//             if (node.source.value === "opossum") {
//                 hasCircuitBreakerImport = true;
//             }
//         }
//     });

//     walkAncestor(ast, {
//         FunctionDeclaration(node: any, ancestors: any[]) {
//             let functionName = node.id.name;
//             breakerVar = `${functionName}Breaker`;

//             // Find API calls inside function
//             walkSimple(node, {
//                 CallExpression(innerNode, parentNode) {
//                     if (
//                         innerNode.callee.type === "Identifier" &&
//                         (innerNode.callee.name === "fetch" || innerNode.callee.name === "axios")
//                     ) {
//                         console.log(`Found API call (${innerNode.callee.name}) in ${file}`);

//                         // Define CircuitBreaker instance **outside function scope**
//                         const breakerDeclaration = {
//                             type: "VariableDeclaration",
//                             declarations: [
//                                 {
//                                     type: "VariableDeclarator",
//                                     id: { type: "Identifier", name: breakerVar },
//                                     init: {
//                                         type: "NewExpression",
//                                         callee: { type: "Identifier", name: "CircuitBreaker" },
//                                         arguments: [
//                                             {
//                                                 type: "ArrowFunctionExpression",
//                                                 params: [],
//                                                 body: innerNode, // Preserve the existing API call
//                                                 async: true,
//                                             },
//                                             {
//                                                 type: "ObjectExpression",
//                                                 properties: [
//                                                     {
//                                                         type: "Property",
//                                                         key: { type: "Identifier", name: "timeout" },
//                                                         value: { type: "Literal", value: 5000 },
//                                                         kind: "init",
//                                                     },
//                                                     {
//                                                         type: "Property",
//                                                         key: { type: "Identifier", name: "errorThresholdPercentage" },
//                                                         value: { type: "Literal", value: 50 },
//                                                         kind: "init",
//                                                     },
//                                                     {
//                                                         type: "Property",
//                                                         key: { type: "Identifier", name: "resetTimeout" },
//                                                         value: { type: "Literal", value: 10000 },
//                                                         kind: "init",
//                                                     },
//                                                 ],
//                                             },
//                                         ],
//                                     },
//                                 },
//                             ],
//                             kind: "const",
//                         };

//                         // Ensure the breaker instance is declared at the top of the AST
//                         if (!codeModified) {
//                             ast.body.unshift(breakerDeclaration);
//                         }

//                         // **Correct way to replace the API call with breaker.fire()**
//                         const circuitBreakerCall = {
//                             type: "AwaitExpression",
//                             argument: {
//                                 type: "CallExpression",
//                                 callee: {
//                                     type: "MemberExpression",
//                                     object: { type: "Identifier", name: breakerVar },
//                                     property: { type: "Identifier", name: "fire" },
//                                 },
//                                 arguments: [], // Ensure no duplicate URL arguments
//                             },
//                         };

//                         // Replace API call with circuit breaker invocation
//                         Object.assign(innerNode, circuitBreakerCall);

//                         codeModified = true;
//                     }
//                 }
//             });
//         }
//     });

//     if (!codeModified) {
//         console.log(`No modifications made for circuit breaker logic in ${file}`);
//         return "";
//     }

//     if (!hasCircuitBreakerImport) {
//         return `const CircuitBreaker = require('opossum');\n\n` + escodegen.generate(ast);
//     }

//     return escodegen.generate(ast);
// }


// // 7 fix health check
// async function applyFixHealthCheckIssue(issue: string) {
//     console.log("Fixing health check issue for:", issue);

//     // Extract the filename from the issue report
//     const file = issue.split(" - ")[0].trim();
//     console.log("Extracted File Name:", file);

//     // Ensure a workspace is open
//     const workspaceFolders = vscode.workspace.workspaceFolders;
//     if (!workspaceFolders) {
//         vscode.window.showErrorMessage("No workspace found.");
//         return;
//     }

//     // Get the workspace directory and find the correct file
//     const projectRoot = workspaceFolders[0].uri.fsPath;
//     const allFiles = getAllJsTsFiles(projectRoot);
//     const filePath = allFiles.find(filePath => path.basename(filePath) === file);

//     if (!filePath) {
//         vscode.window.showErrorMessage(`❌ Error: File not found in workspace - ${file}`);
//         return;
//     }

//     try {
//         // Open and read the file
//         const document = await vscode.workspace.openTextDocument(filePath);
//         let text = document.getText();

//         // Apply the health check fix
//         const fixedCode = fixHealthCheckIssues(text);

//         // If no modifications were made, inform the user
//         if (fixedCode === text) {
//             vscode.window.showInformationMessage(`✅ No changes needed in ${filePath}.`);
//             return;
//         }

//         // Apply the fixed code to the document in VSCode
//         const edit = new vscode.WorkspaceEdit();
//         const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(text.length));
//         edit.replace(document.uri, fullRange, fixedCode);

//         await vscode.workspace.applyEdit(edit);
//         vscode.window.showInformationMessage(`✅ Health check endpoint added in ${filePath}.`);
//     } catch (error) {
//         vscode.window.showErrorMessage(`❌ Error fixing health check issue: ${error}`);
//     }
// }


// function fixHealthCheckIssues(fileContent: string): string {
//     let modified = false;

//     // Check if `app.get('/health')` already exists
//     if (!fileContent.includes("app.get('/health'")) {
//         console.log("Adding health check endpoint...");

//         // Insert the health check route
//         const healthCheckCode = `
// app.get('/health', (req, res) => {
//     res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
// });
// `;
//         // Add the route before `app.listen`
//         fileContent = fileContent.replace(/app.listen\(\d+.*,/, match => healthCheckCode + "\n" + match);

//         modified = true;
//     }

//     return modified ? fileContent : fileContent;
// }

// //8 fix secure headers
// async function applyFixSecureHeadersIssue(issue: string) {
//     console.log("Fixing secure headers issue for:", issue);

//     // Extract the filename from the issue report
//     const file = issue.split(" - ")[0].trim();
//     console.log("Extracted File Name:", file);

//     // Ensure a workspace is open
//     const workspaceFolders = vscode.workspace.workspaceFolders;
//     if (!workspaceFolders) {
//         vscode.window.showErrorMessage("No workspace found.");
//         return;
//     }

//     // Get the workspace directory and find the correct file
//     const projectRoot = workspaceFolders[0].uri.fsPath;
//     const allFiles = getAllJsTsFiles(projectRoot);
//     const filePath = allFiles.find(filePath => path.basename(filePath) === file);

//     if (!filePath) {
//         vscode.window.showErrorMessage(`❌ Error: File not found in workspace - ${file}`);
//         return;
//     }

//     try {
//         // Open and read the file
//         const document = await vscode.workspace.openTextDocument(filePath);
//         let text = document.getText();

//         // Apply the secure headers fix
//         const fixedCode = fixSecureHeadersIssues(text);

//         // If no modifications were made, inform the user
//         if (fixedCode === text) {
//             vscode.window.showInformationMessage(`✅ No changes needed in ${filePath}.`);
//             return;
//         }

//         // Apply the fixed code to the document in VSCode
//         const edit = new vscode.WorkspaceEdit();
//         const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(text.length));
//         edit.replace(document.uri, fullRange, fixedCode);

//         await vscode.workspace.applyEdit(edit);
//         vscode.window.showInformationMessage(`✅ Secure headers (helmet) added in ${filePath}.`);
//     } catch (error) {
//         vscode.window.showErrorMessage(`❌ Error fixing secure headers issue: ${error}`);
//     }
// }


// function fixSecureHeadersIssues(fileContent: string): string {
//     let modified = false;

//     // Check if `helmet()` is already being used
//     if (!fileContent.includes("helmet()")) {
//         console.log("Adding secure headers middleware (helmet)...");

//         // Insert the helmet import
//         if (!fileContent.includes("const helmet = require('helmet');")) {
//             fileContent = "const helmet = require('helmet');\n" + fileContent;
//         }

//         // Add `app.use(helmet())` after `express()` initialization
//         fileContent = fileContent.replace(/const app = express\(\);/, match => match + "\napp.use(helmet());");

//         modified = true;
//     }

//     return modified ? fileContent : fileContent;
// }

// //9 fix input validation
// async function applyFixInputValidationIssue(issue: string) {
//     console.log("Applying input validation fix for:", issue);

//     // Extract the file name from the issue message
//     const match = issue.match(/^(.+?) - /);
//     if (!match) {
//         vscode.window.showErrorMessage('❌ Invalid issue format.');
//         return;
//     }

//     const fileName = match[1].trim();
//     console.log(`📌 Extracted file name: ${fileName}`);

//     // Ensure a workspace is open
//     const workspaceFolders = vscode.workspace.workspaceFolders;
//     if (!workspaceFolders) {
//         vscode.window.showErrorMessage("❌ No workspace found.");
//         return;
//     }

//     const projectRoot = workspaceFolders[0].uri.fsPath;
//     const allFiles = getAllJsTsFiles(projectRoot);
//     const filePath = allFiles.find(file => path.basename(file) === fileName);

//     if (!filePath) {
//         vscode.window.showErrorMessage(`❌ Error: File not found in workspace - ${fileName}`);
//         return;
//     }

//     console.log(`✅ Target file for fix: ${filePath}`);

//     // Read the file content
//     let text = fs.readFileSync(filePath, "utf8");
//     console.log(`📄 Original Content:\n${text}`);

//     // Apply fix for input validation
//     const fixedCode = fixInputValidationIssues(text);

//     // If no changes were made, inform the user
//     if (fixedCode === text) {
//         vscode.window.showInformationMessage(`✅ No changes needed in ${filePath}.`);
//         return;
//     }

//     // Save the modified content back to the file
//     try {
//         fs.writeFileSync(filePath, fixedCode, "utf8");
//         console.log(`✅ Successfully updated ${filePath}`);

//         // Ensure VSCode refreshes the document to reflect changes
//         const document = await vscode.workspace.openTextDocument(filePath);
//         await vscode.window.showTextDocument(document);
//         await document.save();

//         vscode.window.showInformationMessage(`✅ Input validation issue fixed in ${filePath}`);
//     } catch (error) {
//         vscode.window.showErrorMessage(`❌ Failed to update ${filePath} - ${error}`);
//         return;
//     }
// }






// function fixInputValidationIssues(fileContent: string): string {
//     let modified = false;

//     // Ensure express-validator import is present
//     if (!fileContent.includes("const { check, validationResult } = require('express-validator');")) {
//         fileContent = "const { check, validationResult } = require('express-validator');\n" + fileContent;
//         modified = true;
//     }

//     // Ensure express.json() middleware is present
//     if (!fileContent.includes("app.use(express.json())")) {
//         fileContent = fileContent.replace(
//             /const app = express\(\);/,
//             "const app = express();\napp.use(express.json());"
//         );
//         modified = true;
//     }

//     // Fix missing validation in routes
//     const routeRegex = /(app\.(post|put)\(['"`]\/[^'"`]+['"`],\s*\[?)/g;
//     fileContent = fileContent.replace(routeRegex, (match, prefix) => {
//         if (!match.includes("[check(")) {
//             modified = true;
//             return `${prefix}[check('param').notEmpty().withMessage('Parameter is required')], `;
//         }
//         return match;
//     });

//     return modified ? fileContent : fileContent;
// }








// // === ISSUE DETECTION FUNCTIONS ===
// //1 detectRetryIssues
// function detectRetryIssues(ast: any, file: string): string[] {
//     const issues: string[] = [];

//     estraverse.traverse(ast as any, {
//         enter(node: any, parent: any) {
//             console.log(`Inspecting node of type: ${node.type} in file: ${file}`);

//             // Detect API calls (fetch or axios)
//             if (
//                 node.type === 'CallExpression' &&
//                 node.callee.type === 'Identifier' &&
//                 (node.callee.name === 'fetch' || node.callee.name === 'axios')
//             ) {
//                 let hasRetryLoop = false;
//                 let hasTryCatch = false;
//                 let identifierName = 'UnknownVariable';

//                 console.log(`Found API call (${node.callee.name}) in file: ${file}`);

//                 // Check if this API call is assigned to a variable
//                 if (parent && parent.type === 'VariableDeclarator' && parent.id.type === 'Identifier') {
//                     identifierName = parent.id.name;
//                     console.log(`API call result stored in variable: ${identifierName}`);
//                 }

//                 // Check if it's inside a try-catch block
//                 let ancestor = parent;
//                 while (ancestor) {
//                     if (ancestor.type === 'TryStatement') {
//                         hasTryCatch = true;
//                         console.log(`API call (${node.callee.name}) inside try-catch in file: ${file}`);
//                         break;
//                     }
//                     ancestor = ancestor.parent;
//                 }

//                 // Check for retry mechanisms (loop or recursive call)
//                 estraverse.traverse(node, {
//                     enter(subNode: any) {
//                         if (subNode.type === 'WhileStatement' || subNode.type === 'ForStatement') {
//                             hasRetryLoop = true;
//                             console.log(`Found retry loop in file: ${file}`);
//                         }
//                     }
//                 });

//                 // If API call is found without a retry mechanism, flag it with identifier
//                 if (!hasRetryLoop) {
//                     issues.push(
//                         `${file} - API call (${node.callee.name}) stored in "${identifierName}" is missing retry logic.`
//                     );
//                     console.log(
//                         `Missing retry logic detected in file: ${file} for variable "${identifierName}".`
//                     );
//                 }
//             }
//         }
//     });

//     console.log(`Issues detected: ${issues.length}`);
//     return issues;
// }



// //2 detectCircuitBreakerIssues
// function detectCircuitBreakerIssues(ast: any, file: string): string[] {
//     const issues: string[] = [];
//     let foundCircuitBreaker = false;
//     let breakerVariables: Set<string> = new Set(); // Stores variable names that are CircuitBreaker instances

//     // Step 1: Traverse to find any CircuitBreaker instances and store their variable names


//     // Step 1: Traverse to find any CircuitBreaker instances and store their variable names
//     walkAncestor(ast, {
//         NewExpression(node, state, ancestors) {
//             if (node.callee.type === "Identifier" && node.callee.name === "CircuitBreaker") {
//                 // Find the closest ancestor that is a variable declaration
//                 for (let i = ancestors.length - 1; i >= 0; i--) {
//                     const ancestor = ancestors[i] as estree.Node; // Explicitly type as Node

//                     // ✅ Type-check: Ensure ancestor is a VariableDeclarator
//                     if (
//                         ancestor &&
//                         ancestor.type === "VariableDeclarator"
//                     ) {
//                         const declarator = ancestor as estree.VariableDeclarator;

//                         // ✅ Ensure `id` exists and is an `Identifier`
//                         if (
//                             declarator.id &&
//                             declarator.id.type === "Identifier"
//                         ) {
//                             breakerVariables.add(declarator.id.name); // Store the variable name
//                             break;
//                         }
//                     }
//                 }
//             }
//         }
//     });


//     // Step 2: Traverse again to check if breaker.fire() is being used
//     walkSimple(ast, {
//         CallExpression(node) {
//             if (
//                 node.callee.type === "MemberExpression" &&
//                 node.callee.object.type === "Identifier" &&
//                 breakerVariables.has(node.callee.object.name) && // Check if it's a known CircuitBreaker variable
//                 node.callee.property.type === "Identifier" &&
//                 node.callee.property.name === "fire"
//             ) {
//                 foundCircuitBreaker = true; // ✅ CircuitBreaker instance is being used
//             }
//         }
//     });

//     // Step 3: Report an issue only if no CircuitBreaker logic is found
//     if (!foundCircuitBreaker) {
//         issues.push(`${file} - Missing circuit breaker logic.`);
//     }

//     return issues;
// }





// //3 detectHealthCheckIssues
// function detectHealthCheckIssues(ast: any, file: string): string[] {
//     const issues: string[] = []; // Array to store detected issues
//     let hasHealthCheck = false; // Flag to check if a health check endpoint exists

//     // Traverse the AST to detect function calls
//     walkSimple(ast, {
//         CallExpression(node) {
//             // Check if the function call is an Express.js route handler (app.get)
//             if (
//                 node.callee.type === 'MemberExpression' &&
//                 node.callee.object.type === 'Identifier' &&
//                 node.callee.object.name === 'app' &&
//                 node.callee.property.type === 'Identifier' &&
//                 node.callee.property.name === 'get'
//             ) {
//                 // Check if the route path is '/health' or '/status'
//                 const arg = node.arguments[0];
//                 if (arg.type === 'Literal' && (arg.value === '/health' || arg.value === '/status')) {
//                     hasHealthCheck = true;
//                 }
//             }
//         }
//     });

//     // If no health-check route was detected, report an issue
//     if (!hasHealthCheck) {
//         issues.push(`${file} - No health-check endpoint detected.`);
//     }

//     return issues; // Return the list of detected issues
// }

// //4 detectTimeoutIssues
// function detectTimeoutIssues(ast: any, file: string): string[] {
//     const issues: string[] = [];
//     let hasTimeout = false;

//     walkSimple(ast, {
//         CallExpression(node) {
//             if (node.callee.type === 'MemberExpression' && node.callee.object.type === 'Identifier' && node.callee.object.name === 'axios') {
//                 // const configArg = node.arguments[1];
//                 // Check all arguments
//                 for (const configArg of node.arguments) {
//                     if (configArg && configArg.type === 'ObjectExpression') {
//                         const hasTimeoutProp = configArg.properties.some((prop: any) =>
//                             prop.type === 'Property' && prop.key.type === 'Identifier' && prop.key.name === 'timeout'
//                         );
//                         if (hasTimeoutProp) {
//                             hasTimeout = true;
//                             break; // Exit loop once timeout is found
//                         }
//                     }
//                 }
//             }
//         }
//     });

//     if (!hasTimeout) {
//         issues.push(`${file} - No timeout configuration in axios API calls.`);
//     }

//     return issues;
// }
// //5 detectDependencyInjectionIssues
// function detectDependencyIssues(ast: any, file: string): string[] {
//     const issues: string[] = [];
//     walkAncestor(ast, {
//         NewExpression(node: any, ancestors: any[]) {
//             if (node.callee.type === 'Identifier') {
//                 // Check if the `new` expression is inside a class or function
//                 const insideClassOrFunction = ancestors.some(
//                     (ancestor) =>
//                         ancestor.type === "ClassDeclaration" ||
//                         ancestor.type === "FunctionDeclaration" ||
//                         ancestor.type === "FunctionExpression" ||
//                         ancestor.type === "ArrowFunctionExpression"
//                 );
//                 if (insideClassOrFunction) {
//                     issues.push(`${file} - Hardcoded dependency detected: ${node.callee.name}. Consider using dependency injection.`);
//                 }
//             }
//         }
//     });
//     return issues;
// }
// //6 detectLoggingIssues
// function detectLoggingIssues(ast: any, file: string): string[] {
//     const issues: string[] = [];
//     walkSimple(ast, {
//         TryStatement(node) {
//             if (node.handler) {
//                 let hasLogging = false;
//                 walkSimple(node.handler.body, {
//                     CallExpression(innerNode) {
//                         if (innerNode.callee.type === 'MemberExpression' &&
//                             innerNode.callee.object.type === 'Identifier' &&
//                             innerNode.callee.object.name === 'console') {
//                             hasLogging = true;
//                         }
//                     }
//                 });
//                 if (!hasLogging) {
//                     issues.push(`${file} - Missing logging in try-catch block.`);
//                 }
//             }
//         }
//     });
//     return issues;
// }
// //7 detectRateLimitingIssues
// function detectRateLimitingIssues(ast: any, file: string): string[] {
//     const issues: string[] = [];
//     let foundRateLimit = false;

//     walkSimple(ast, {
//         CallExpression(node) {
//             if (
//                 node.callee.type === 'MemberExpression' &&
//                 node.callee.object.type === 'Identifier' &&
//                 node.callee.object.name === 'app' &&
//                 node.callee.property.type === 'Identifier' &&
//                 node.callee.property.name === 'use'
//             ) {
//                 const args = node.arguments;

//                 if (
//                     args.some(arg =>
//                         arg.type === 'CallExpression' &&
//                         arg.callee &&
//                         arg.callee.type === 'Identifier' &&
//                         arg.callee.name === 'rateLimit'
//                     )
//                 ) {
//                     foundRateLimit = true;
//                 }
//             }
//         }
//     });

//     if (!foundRateLimit) {
//         console.log(`❌ Scanner found missing rate limiting in: ${file}`);
//         issues.push(`${file} - Rate limiting middleware is missing.`);
//     } else {
//         console.log(`✅ Scanner detected rate limiting is already present in: ${file}`);
//     }

//     return issues;
// }


// // 8 detectSecureHeadersIssues
// function detectSecureHeadersIssues(ast: any, file: string): string[] {
//     const issues: string[] = [];
//     let foundHelmet = false;
//     walkSimple(ast, {
//         CallExpression(node) {
//             if (node.callee.type === 'Identifier' && node.callee.name === 'helmet') {
//                 foundHelmet = true;
//             }
//         }
//     });
//     if (!foundHelmet) {
//         issues.push(`${file} - Secure headers middleware (helmet) is missing.`);
//     }
//     return issues;
// }
// //9 detectInputValidationIssues
// function detectInputValidationIssues(ast: any, file: string): string[] {
//     const issues: string[] = [];

//     walkSimple(ast, {
//         CallExpression(node) {
//             if (
//                 node.callee.type === 'MemberExpression' &&
//                 node.callee.object.type === 'Identifier' &&
//                 node.callee.object.name === 'app' &&
//                 node.callee.property.type === 'Identifier' &&
//                 ['post', 'put'].includes(node.callee.property.name) // Only check POST & PUT requests
//             ) {
//                 const routePath = node.arguments[0]; // First argument (route path)
//                 const middlewareArg = node.arguments[1]; // Middleware or route handler

//                 if (routePath && routePath.type === 'Literal' && typeof routePath.value === 'string') {
//                     let hasValidation = false;

//                     // Ensure middleware argument exists and contains validation
//                     if (middlewareArg && middlewareArg.type === 'ArrayExpression' && middlewareArg.elements) {
//                         hasValidation = middlewareArg.elements.some(
//                             (element) =>
//                                 element &&
//                                 element.type === 'CallExpression' &&
//                                 element.callee &&
//                                 element.callee.type === 'Identifier' &&
//                                 ['check', 'body', 'param', 'query'].includes(element.callee.name)
//                         );
//                     }

//                     // If no validation middleware is found, report the issue
//                     if (!hasValidation) {
//                         issues.push(`${file} - Missing input validation middleware for route: ${routePath.value}`);
//                     }
//                 }
//             }
//         }
//     });

//     return issues;
// }





// // Deactivate extension
// export function deactivate() { }


// ----------------------------- folder detection issue -------------------------------

// async function applyFixTimeoutIssue(issue: string) {
// //4
// // console.log("Original issue string:", JSON.stringify(issue));

// //     let filePath: string | null = null;

// //     // === 1️⃣ Extract File Path (Before ' - ' Separator) ===
// //     filePath = issue.split(" - ")[0].trim(); // Get everything before ' - '
// //     let fileName = path.basename(filePath);
// //     console.log("File name:", fileName);

// //     if (!fileName) {
// //         vscode.window.showErrorMessage(`Could not extract file path from issue: ${issue}`);
// //         return;
// //     }

// //     console.log("Extracted file path (before fix):", fileName);

// //     // === 2️⃣ Fix Windows-Specific Issues ===
// //     if (/^[a-zA-Z]:/.test(fileName)) {
// //         fileName = fileName.replace(/\\/g, "/"); // Ensure forward slashes
// //     }

// //     // === 3️⃣ Remove Any Newline Issues ===
// //     fileName = fileName.replace(/\n/g, "").trim(); // Removes any accidental line breaks

// //     // === 4️⃣ Ensure Absolute Path Resolution ===
// //     fileName = path.resolve(fileName);
// //     console.log("Final normalized file path:", fileName);

// //     // === 5️⃣ Verify File Exists Before Proceeding ===
// //     if (!fs.existsSync(fileName)) {
// //         vscode.window.showErrorMessage(`File not found: ${fileName}`);
// //         return;
// //     }
// //3
// // console.log("Original issue string:", JSON.stringify(issue)); // Log exact issue string

// // let filePath: string | null = null;

// // // === 1️⃣ Extract Path from Issue String ===
// // if (issue.startsWith("[")) {
// //     filePath = issue.substring(1, issue.indexOf("]")).trim(); // Remove square brackets [ ]
// // }

// // // === 2️⃣ Ensure Path is Correctly Formatted ===
// // if (!filePath) {
// //     vscode.window.showErrorMessage(`Could not extract file path from issue: ${issue}`);
// //     return;
// // }

// // // Remove any accidental newline characters from the path
// // filePath = filePath.replace(/\n/g, "").trim();

// // console.log("Extracted file path (before fix):", filePath);

// // // === 3️⃣ Fix Windows-Specific Issues ===
// // if (/^[a-zA-Z]:/.test(filePath)) {
// //     filePath = filePath.replace(/\\/g, "/"); // Ensure forward slashes
// // }

// // // === 4️⃣ Ensure Absolute Path Resolution ===
// // if (!path.isAbsolute(filePath)) {
// //     filePath = path.resolve(filePath); // Convert relative to absolute
// // }

// // console.log("Final normalized file path:", filePath);

// // // === 5️⃣ Verify File Exists Before Proceeding ===
// // if (!fs.existsSync(filePath)) {
// //     vscode.window.showErrorMessage(`File not found: ${filePath}`);
// //     return;
// // }


// //2
// // const issue = "[c:\\Users\\HP\\Desktop\\HealOps_Test_Project\\src\\no_timeout.js] Missing circuit breaker logic.";
//     // console.log(issue);
//     // // Extract file path using regex
//     // const match = issue.match(/\[(.*?)\]/);
//     // console.log(match);
//     // const filePath = match ? match[1] : 'Unknown Path';

//     // console.log(filePath);
// // Output: "c:\Users\HP\Desktop\HealOps_Test_Project\src\no_timeout.js"

// //1
//     // console.log(issue);
//     // const match = issue.match(/\[(.*?)\]/);
//     // console.log(match);
//     // const filePath = match ? match[1] : 'Unknown File';
//     // console.log(filePath);

//  //5>>>>>>>>>>>>>>>>>>>>>>>>>>>.
//     console.log(issue);
//     const file = issue.split(" - ")[0].trim(); // Get everything before ' - '
//     console.log("File:", file);
//     // const match = issue.match(/\[(.*?)\]/);
//     // console.log(match);
//     // const filePath = match ? match[1] : 'Unknown File';
//     const fileName = path.basename(file);
//     console.log("File name:",fileName); 
//     // const directory = "C:\\Users\\HP\\Desktop\\HealOps_Test_Project\\src";
//     // const filePath = path.join(directory, fileName);

// //6
//     // const files = await vscode.workspace.findFiles(`**/${fileName}`, '**/node_modules/**');
//     // let filePath;
//     // if (files.length > 0) {
//     //     const Path = files[0].fsPath;
//     //     const directory = path.dirname(Path);
//     //     console.log("Directory:", directory);
//     //     filePath = path.join(directory, fileName);
//     //     //return directory;
//     // } else {
//     //     vscode.window.showErrorMessage(`${fileName} not found in workspace.`);
//     //     //return null;
//     // }


//     // const workspaceFolders = vscode.workspace.workspaceFolders;
//     // if (!workspaceFolders) {
//     //     vscode.window.showErrorMessage('No workspace found.');
//     //     return;
//     // }
    
//     // const workspacePath = workspaceFolders[0].uri.fsPath;
//     // console.log("File workspacePath:",workspacePath); 
//     // const files = fs.readdirSync(workspacePath);
//     // const filePath = path.join(workspacePath, fileName);
//     //     console.log("File Path:",filePath);
//     //     const stat = fs.statSync(filePath);
//     //     console.log("File stat:",stat);
    

    

//     const workspaceFolders = vscode.workspace.workspaceFolders;
//     if (!workspaceFolders) {return null;}
//     const directory = workspaceFolders[0].uri.fsPath;
//     console.log("directory", directory); 
//     // const files = fs.readdirSync(directory);
//     const filePath = path.join(directory, fileName);
//     // const stat = fs.statSync(filePath);
//     console.log("File path:", filePath); 


//     try {
//         const document = await vscode.workspace.openTextDocument(filePath);
//         const text = document.getText();
//         const ast = acorn.parse(text, { ecmaVersion: 'latest', sourceType: 'module' });

//         const fixedCode = fixTimeoutIssues(ast, filePath);

//         if (fixedCode.length === 0) {
//             vscode.window.showInformationMessage(`No changes needed in ${filePath}.`);
//             return;
//         }

//         const edit = new vscode.WorkspaceEdit();
//         const fullRange = new vscode.Range(
//             document.positionAt(0),
//             document.positionAt(text.length)
//         );

//         edit.replace(document.uri, fullRange, fixedCode);
//         await vscode.workspace.applyEdit(edit);

//         vscode.window.showInformationMessage(`Timeout issue fixed in ${filePath}.`);
//     } catch (error) {
//         vscode.window.showErrorMessage(`Error fixing timeout issue: ${error}`);
//     }

// }
//------------------------------ applying modified code without the rest of the file ----------------- 

// async function applyFixTimeoutIssue(issue: string) {
//     console.log(issue);
//     const file = issue.split(" - ")[0].trim(); // Get everything before ' - '
//     console.log("File:", file);

//     const fileName = path.basename(file);
//     console.log("File name:",fileName); 

//     const workspaceFolders = vscode.workspace.workspaceFolders;
//     if (!workspaceFolders) {return null;}
//     const directory = workspaceFolders[0].uri.fsPath;
//     console.log("directory", directory); 
//     // const files = fs.readdirSync(directory);
//     const filePath = path.join(directory, fileName);
//     // const stat = fs.statSync(filePath);
//     console.log("File path:", filePath); 


//     try {
//         const document = await vscode.workspace.openTextDocument(filePath);
//         const text = document.getText();
//         const ast = acorn.parse(text, { ecmaVersion: 'latest', sourceType: 'module' });


//         const fixedCode = fixTimeoutIssues(ast, filePath);

//         if (fixedCode.length === 0) {
//             vscode.window.showInformationMessage(`No changes needed in ${filePath}.`);
//             return;
//         }

//         const edit = new vscode.WorkspaceEdit();
//     //2
//         // Find differences and update only the modified sections
//         // const diffs = diffLines(text, fixedCode); // Use `diff-lines` to compute the changes
//         // const edit = new vscode.WorkspaceEdit();

//         // let positionOffset = 0;
//         // diffs.forEach((diff) => {
//         //     if (diff.added || diff.removed) {
//         //         const start = document.positionAt(positionOffset);
//         //         const end = document.positionAt(
//         //             positionOffset + diff.value.length
//         //         );

//         //         if (diff.added) {
//         //             // Replace only added text
//         //             edit.replace(document.uri, new vscode.Range(start, end), diff.value);
//         //         }
//         //     }
//         //     if (!diff.removed) {
//         //         positionOffset += diff.value.length;
//         //     }
//         // });
//     //1
//         const fullRange = new vscode.Range(
//             document.positionAt(0),
//             document.positionAt(text.length)
//         );

//         edit.replace(document.uri, fullRange, fixedCode);
//         await vscode.workspace.applyEdit(edit);

//         // fs.writeFileSync(filePath, fixedCode, 'utf8');
//         // console.log(`✅ Successfully updated ${filePath}`);
//         // await vscode.window.showTextDocument(document);

//         vscode.window.showInformationMessage(`Timeout issue fixed in ${filePath}.`);
//     } catch (error) {
//         vscode.window.showErrorMessage(`Error fixing timeout issue: ${error}`);
//     }

// }