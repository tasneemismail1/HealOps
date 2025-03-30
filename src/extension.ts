import * as vscode from 'vscode';
import * as path from 'path';

import { HealOpsPanel } from './ui/HealOpsPanel';
import { PreviewFixPanel } from './ui/PreviewFixPanel';
import { scanProject } from './commands/scanProject';
import { HealOpsTreeProvider } from './HealOpsTreeProvider';

// AST-based fix imports
import { applyFixRetryIssue } from './fixes/fixRetry';
import { applyFixCircuitBreakerIssue } from './fixes/fixCircuitBreaker';
import { applyFixHealthCheckIssue } from './fixes/fixHealthCheck';
import { applyFixTimeoutIssue } from './fixes/fixTimeout';
import { applyFixDependencyIssue } from './fixes/fixDependency';
import { applyFixLoggingIssue } from './fixes/fixLogging';
import { applyFixRateLimitingIssue } from './fixes/fixRateLimiting';
import { applyFixSecureHeadersIssue } from './fixes/fixSecureHeaders';
import { applyFixInputValidationIssue } from './fixes/fixInputValidation';

export function activate(context: vscode.ExtensionContext) {
    console.log('✅ HealOps extension activated');

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

            const grouped: Record<string, string[]> = {};
            for (const full of issues) {
                const [file, message] = full.split(' - ');
                if (!grouped[file]) grouped[file] = [];
                grouped[file].push(message);
            }

            treeDataProvider.refresh(grouped);

            vscode.window.showInformationMessage(
                issues.length
                    ? `Scan completed! Detected ${issues.length} issues.`
                    : 'Scan completed! No issues found 🎉'
            );
        }),

        vscode.commands.registerCommand('healops.previewFix', async (file: string, issue: string) => {
            if (!file || !issue) return vscode.window.showErrorMessage('Missing file or issue.');
            const filePath = path.join(vscode.workspace.workspaceFolders![0].uri.fsPath, file);
            const doc = await vscode.workspace.openTextDocument(filePath);
            const editor = await vscode.window.showTextDocument(doc);
            await editor.edit(editBuilder => {
                editBuilder.insert(new vscode.Position(0, 0), `// 🔧 Suggested Fix: ${issue}\n`);
            });
        }),

        // In activate()
        // vscode.commands.registerCommand('healops.applyFix', (file: string, issue: string) => {
        //     if (!file || !issue) {
        //         vscode.window.showErrorMessage("Invalid fix target.");
        //         return;
        //     }

        //     // 👇 Use the preview panel for now until Apply logic is implemented
        //     PreviewFixPanel.show(file, issue);
        // });


    vscode.commands.registerCommand('healops.ignoreFix', (file: string, issue: string) => {
        if (!file || !issue) return vscode.window.showErrorMessage('Missing file or issue.');
        const map = treeDataProvider.getIssueMap();
        const updated = (map.get(file) || []).map(i => (i === issue ? `⚠️ Ignored: ${i}` : i));
        map.set(file, updated);
        treeDataProvider.refresh(Object.fromEntries(map));
        vscode.window.showWarningMessage(`❌ Ignored fix: ${issue}`);
    }),

        vscode.commands.registerCommand('healops.fixRetry', applyFixRetryIssue),
        vscode.commands.registerCommand('healops.fixCircuitBreaker', applyFixCircuitBreakerIssue),
        vscode.commands.registerCommand('healops.fixHealthCheck', applyFixHealthCheckIssue),
        vscode.commands.registerCommand('healops.fixTimeout', applyFixTimeoutIssue),
        vscode.commands.registerCommand('healops.fixDependency', applyFixDependencyIssue),
        vscode.commands.registerCommand('healops.fixLogging', applyFixLoggingIssue),
        vscode.commands.registerCommand('healops.fixRateLimiting', applyFixRateLimitingIssue),
        vscode.commands.registerCommand('healops.fixSecureHeaders', applyFixSecureHeadersIssue),
        vscode.commands.registerCommand('healops.fixInputValidation', applyFixInputValidationIssue)
  );
}

export function deactivate() {
    console.log('❌ HealOps extension deactivated');
}
