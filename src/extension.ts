import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

import { HealOpsPanel } from './ui/HealOpsPanel';
import { PreviewFixPanel } from './ui/PreviewFixPanel';
import { scanProject } from './commands/scanProject';
import { HealOpsItem, HealOpsTreeProvider } from './HealOpsTreeProvider';
import { getAllJsTsFiles } from './utils/fileUtils';

// AST-based fix imports
import {
  applyFixRetryIssue, getFixedCodeRetry
} from './fixes/fixRetry';
import {
  applyFixCircuitBreakerIssue, getFixedCodeCircuitBreaker
} from './fixes/fixCircuitBreaker';
import {
  applyFixHealthCheckIssue, getFixedCodeHealthCheck
} from './fixes/fixHealthCheck';
import {
  applyFixTimeoutIssue, getFixedCodeTimeout
} from './fixes/fixTimeout';
import {
  applyFixDependencyIssue, getFixedCodeDependency
} from './fixes/fixDependency';
import {
  applyFixLoggingIssue, getFixedCodeLogging
} from './fixes/fixLogging';
import {
  applyFixRateLimitingIssue, getFixedCodeRateLimiting
} from './fixes/fixRateLimiting';
import {
  applyFixSecureHeadersIssue, getFixedCodeSecureHeaders
} from './fixes/fixSecureHeaders';
import {
  applyFixInputValidationIssue, getFixedCodeInputValidation
} from './fixes/fixInputValidation';

// export function activate(context: vscode.ExtensionContext) {
//   console.log('✅ HealOps extension activated');

//   const treeDataProvider = new HealOpsTreeProvider();
//   vscode.window.createTreeView('healopsIssuesView', { treeDataProvider });

//   context.subscriptions.push(
//     vscode.commands.registerCommand('healops.openPanel', () => {
//       HealOpsPanel.createOrShow(context.extensionUri);
//     })
//   );

//   context.subscriptions.push(
//     vscode.commands.registerCommand('healops.scanMicroservices', async () => {
//       const issues = await scanProject(progress =>
//         vscode.window.setStatusBarMessage(`Scanning: ${progress}%`)
//       );

//       const grouped: Record<string, string[]> = {};
//       for (const full of issues) {
//         const [file, message] = full.split(' - ');
//         if (!grouped[file]) grouped[file] = [];
//         grouped[file].push(message);
//       }

//       treeDataProvider.refresh(grouped);

//       vscode.window.showInformationMessage(
//         issues.length
//           ? `Scan completed! Detected ${issues.length} issues.`
//           : 'Scan completed! No issues found 🎉'
//       );
//     })
//   );

//   context.subscriptions.push(
//     vscode.commands.registerCommand('healops.previewFix', async (file: string, issue: string) => {
//       if (!file || !issue) {
//         vscode.window.showErrorMessage('Missing file or issue.');
//         return;
//       }

//       const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
//       if (!workspaceRoot) return;

//       const allFiles = getAllJsTsFiles(workspaceRoot);
//       const filePath = allFiles.find(f => f.endsWith(path.sep + file));

//       if (!filePath || !fs.existsSync(filePath)) {
//         vscode.window.showErrorMessage(`❌ File not found: ${file}`);
//         return;
//       }

//       const originalCode = fs.readFileSync(filePath, 'utf-8');
//       let fixedCode = '';

//       if (issue.toLowerCase().includes('retry')) {
//         fixedCode = getFixedCodeRetry(originalCode);
//       } else if (issue.toLowerCase().includes('circuit breaker')) {
//         fixedCode = getFixedCodeCircuitBreaker(originalCode);
//       } else if (issue.toLowerCase().includes('health check')) {
//         fixedCode = getFixedCodeHealthCheck(originalCode);
//       } else if (issue.toLowerCase().includes('timeout')) {
//         fixedCode = getFixedCodeTimeout(originalCode);
//       } else if (issue.toLowerCase().includes('dependency')) {
//         fixedCode = getFixedCodeDependency(originalCode);
//       } else if (issue.toLowerCase().includes('logging')) {
//         fixedCode = getFixedCodeLogging(originalCode);
//       } else if (issue.toLowerCase().includes('rate limit')) {
//         fixedCode = getFixedCodeRateLimiting(originalCode);
//       } else if (issue.toLowerCase().includes('secure header')) {
//         fixedCode = getFixedCodeSecureHeaders(originalCode);
//       } else if (issue.toLowerCase().includes('input validation')) {
//         fixedCode = getFixedCodeInputValidation(originalCode);
//       }

//       if (!fixedCode || fixedCode === originalCode) {
//         vscode.window.showInformationMessage('ℹ️ No changes suggested by the fix logic.');
//         return;
//       }

//       PreviewFixPanel.show(file, issue, originalCode, fixedCode);
//     })
//   );

//   context.subscriptions.push(
//     vscode.commands.registerCommand('healops.openFile', async (file: string) => {
//       const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
//       if (!workspaceRoot) return;

//       const allFiles = getAllJsTsFiles(workspaceRoot);
//       const filePath = allFiles.find(f => f.endsWith(path.sep + file));

//       if (!filePath || !fs.existsSync(filePath)) {
//         vscode.window.showErrorMessage(`❌ File not found: ${file}`);
//         return;
//       }

//       const doc = await vscode.workspace.openTextDocument(filePath);
//       vscode.window.showTextDocument(doc);
//     })
//   );

//   context.subscriptions.push(
//     vscode.commands.registerCommand('healops.ignoreFix', (file: string, issue: string) => {
//       if (!file || !issue) return vscode.window.showErrorMessage('Missing file or issue.');
//       const map = treeDataProvider.getIssueMap();
//       const updated = (map.get(file) || []).map(i => (i === issue ? `⚠️ Ignored: ${i}` : i));
//       map.set(file, updated);
//       treeDataProvider.refresh(Object.fromEntries(map));
//       vscode.window.showWarningMessage(`❌ Ignored fix: ${issue}`);
//     })
//   );

//   /////appplyyyyyyy
//   context.subscriptions.push(
//     vscode.commands.registerCommand('healops.applyFix', async (file: string, issue: string) => {
//         if (!file || !issue) {
//           vscode.window.showErrorMessage('❌ Missing file or issue.');
//           return;
//         }
      
//         const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
//         if (!workspaceRoot) return;
      
//         const allFiles = getAllJsTsFiles(workspaceRoot);
//         const filePath = allFiles.find(f => f.endsWith(path.sep + file));
      
//         if (!filePath || !fs.existsSync(filePath)) {
//           vscode.window.showErrorMessage(`❌ File not found: ${file}`);
//           return;
//         }
      
//         // Compose issue line exactly like the scanner output (needed by fix functions)
//         const issueLine = `${file} - ${issue}`;
      
//         // Dispatch fix based on keyword
//         if (issue.toLowerCase().includes('retry')) {
//           await applyFixRetryIssue(issueLine);
//         } else if (issue.toLowerCase().includes('circuit breaker')) {
//           await applyFixCircuitBreakerIssue(issueLine);
//         } else if (issue.toLowerCase().includes('health check')) {
//           await applyFixHealthCheckIssue(issueLine);
//         } else if (issue.toLowerCase().includes('timeout')) {
//           await applyFixTimeoutIssue(issueLine);
//         } else if (issue.toLowerCase().includes('dependency')) {
//           await applyFixDependencyIssue(issueLine);
//         } else if (issue.toLowerCase().includes('logging')) {
//           await applyFixLoggingIssue(issueLine);
//         } else if (issue.toLowerCase().includes('rate limit')) {
//           await applyFixRateLimitingIssue(issueLine);
//         } else if (issue.toLowerCase().includes('secure header')) {
//           await applyFixSecureHeadersIssue(issueLine);
//         } else if (issue.toLowerCase().includes('input validation')) {
//           await applyFixInputValidationIssue(issueLine);
//         } else {
//           vscode.window.showWarningMessage(`⚠️ No matching fix logic found for: ${issue}`);
//         }
//       })
      
//     );
//   context.subscriptions.push(
//     vscode.commands.registerCommand('healops.fixRetry', applyFixRetryIssue),
//     vscode.commands.registerCommand('healops.fixCircuitBreaker', applyFixCircuitBreakerIssue),
//     vscode.commands.registerCommand('healops.fixHealthCheck', applyFixHealthCheckIssue),
//     vscode.commands.registerCommand('healops.fixTimeout', applyFixTimeoutIssue),
//     vscode.commands.registerCommand('healops.fixDependency', applyFixDependencyIssue),
//     vscode.commands.registerCommand('healops.fixLogging', applyFixLoggingIssue),
//     vscode.commands.registerCommand('healops.fixRateLimiting', applyFixRateLimitingIssue),
//     vscode.commands.registerCommand('healops.fixSecureHeaders', applyFixSecureHeadersIssue),
//     vscode.commands.registerCommand('healops.fixInputValidation', applyFixInputValidationIssue)
//   );
// }

// export function deactivate() {
//   console.log('❌ HealOps extension deactivated');
// }


export function activate(context: vscode.ExtensionContext) {
    const treeDataProvider = new HealOpsTreeProvider();
    vscode.window.createTreeView('healopsIssuesView', { treeDataProvider });
  
    context.subscriptions.push(
      vscode.commands.registerCommand('healops.openPanel', () => {
        HealOpsPanel.createOrShow(context.extensionUri);
      }),
  
      vscode.commands.registerCommand('healops.scanMicroservices', async () => {
        const issues = await scanProject(progress =>
          vscode.window.setStatusBarMessage(`Scanning: ${progress}%`)
        );
  
        const workspaceRoot = vscode.workspace.workspaceFolders![0].uri.fsPath;
        const allFiles = getAllJsTsFiles(workspaceRoot);
  
        const grouped: Record<string, string[]> = {};
        for (const full of issues) {
          const [file, message] = full.split(' - ');
          const fullPath = allFiles.find(f => f.endsWith(file));
          if (fullPath) {
            if (!grouped[fullPath]) grouped[fullPath] = [];
            grouped[fullPath].push(message);
          }
        }
  
        treeDataProvider.refresh(grouped);
        vscode.window.showInformationMessage(`Scan completed! Detected ${issues.length} issues.`);
      }),
  
      vscode.commands.registerCommand('healops.previewFix', (item: HealOpsItem) => {
        const originalCode = fs.readFileSync(item.fileName!, 'utf-8');
        const issue = item.issueText!;
        let fixedCode = originalCode;
  
        if (issue.includes('retry')) fixedCode = getFixedCodeRetry(originalCode);
        else if (issue.includes('circuit breaker')) fixedCode = getFixedCodeCircuitBreaker(originalCode);
        else if (issue.includes('health check')) fixedCode = getFixedCodeHealthCheck(originalCode);
        else if (issue.includes('timeout')) fixedCode = getFixedCodeTimeout(originalCode);
        else if (issue.includes('dependency')) fixedCode = getFixedCodeDependency(originalCode);
        else if (issue.includes('logging')) fixedCode = getFixedCodeLogging(originalCode);
        else if (issue.includes('rate limit')) fixedCode = getFixedCodeRateLimiting(originalCode);
        else if (issue.includes('secure header')) fixedCode = getFixedCodeSecureHeaders(originalCode);
        else if (issue.includes('input validation')) fixedCode = getFixedCodeInputValidation(originalCode);
  
        PreviewFixPanel.show(item.label, issue, originalCode, fixedCode);
      }),
  
      vscode.commands.registerCommand('healops.applyFix', async (item: HealOpsItem) => {
        if (!item.fileName || !item.issueText) {
          vscode.window.showErrorMessage('❌ Missing file or issue.');
          return;
        }
      
        const issueLine = `${item.fileName} - ${item.issueText}`;
      
        try {
          if (item.issueText.includes('retry')) await applyFixRetryIssue(issueLine);
          else if (item.issueText.includes('circuit breaker')) await applyFixCircuitBreakerIssue(issueLine);
          else if (item.issueText.includes('health check')) await applyFixHealthCheckIssue(issueLine);
          else if (item.issueText.includes('timeout')) await applyFixTimeoutIssue(issueLine);
          else if (item.issueText.includes('dependency')) await applyFixDependencyIssue(issueLine);
          else if (item.issueText.includes('logging')) await applyFixLoggingIssue(issueLine);
          else if (item.issueText.includes('rate limit')) await applyFixRateLimitingIssue(issueLine);
          else if (item.issueText.includes('secure header')) await applyFixSecureHeadersIssue(issueLine);
          else if (item.issueText.includes('input validation')) await applyFixInputValidationIssue(issueLine);
          else {
            vscode.window.showWarningMessage(`⚠️ No matching fix logic found for: ${item.issueText}`);
            return;
          }
      
          vscode.window.showInformationMessage(`✅ Fix applied: ${item.issueText}`);
        } catch (error) {
          vscode.window.showErrorMessage(`❌ Error fixing ${item.issueText}: ${error}`);
        }
      }),      
  
      vscode.commands.registerCommand('healops.ignoreFix', (item: HealOpsItem) => {
        const issues = treeDataProvider.getIssueMap().get(item.fileName!) || [];
        const updated = issues.map(i => (i === item.issueText ? `⚠️ Ignored: ${i}` : i));
        treeDataProvider.refresh({ [item.fileName!]: updated });
  
        vscode.window.showWarningMessage(`⚠️ Ignored fix: ${item.issueText}`);
      })
    );
  }
  
  export function deactivate() {}