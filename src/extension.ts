import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

import { HealOpsPanel } from './ui/HealOpsPanel';
import { PreviewFixPanel } from './ui/PreviewFixPanel';
import { scanProject } from './commands/scanProject';
import { HealOpsItem, HealOpsTreeProvider } from './HealOpsTreeProvider';
import { getAllJsTsFiles } from './utils/fileUtils';
import { getFixModule } from './fixes/fixDispatcher';


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

        vscode.commands.registerCommand('healops.previewFix', async (item: HealOpsItem) => {
            if (!item.fileName || !item.issueText) {
                vscode.window.showErrorMessage('Missing file or issue.');
                return;
            }

            const originalCode = fs.readFileSync(item.fileName, 'utf-8');
            let issueType = detectIssueType(item.issueText);
            if (!issueType) {
                vscode.window.showWarningMessage(`⚠️ No preview logic found for: ${item.issueText}`);
                return;
            }

            try {
                const fixModule = getFixModule(issueType);
                const fixedCode = await fixModule.applyFix(item.fileName);
                PreviewFixPanel.show(item.label, item.issueText, originalCode, fixedCode);
            } catch (error) {
                vscode.window.showErrorMessage(`❌ Error generating fix preview: ${error}`);
            }
        }),

        vscode.commands.registerCommand('healops.applyFix', async (item: HealOpsItem) => {
            if (!item.fileName || !item.issueText) {
                vscode.window.showErrorMessage('❌ Missing file or issue.');
                return;
            }

            const issueType = detectIssueType(item.issueText);
            if (!issueType) {
                vscode.window.showWarningMessage(`⚠️ No matching fix logic found for: ${item.issueText}`);
                return;
            }

            try {
                const fixModule = getFixModule(issueType);
                const updatedCode = await fixModule.applyFix(item.fileName);

                const uri = vscode.Uri.file(item.fileName);
                const document = await vscode.workspace.openTextDocument(uri);

                const fullRange = new vscode.Range(
                    document.positionAt(0),
                    document.positionAt(document.getText().length)
                );

                const edit = new vscode.WorkspaceEdit();
                edit.replace(uri, fullRange, updatedCode);

                await vscode.workspace.applyEdit(edit);
                await document.save();

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

function detectIssueType(issueText: string): string | null {
    const lower = issueText.toLowerCase().replace(/[-_]/g, ' '); // normalize hyphens & underscores

    if (lower.includes('retry')) return 'retry';
    if (lower.includes('circuit breaker')) return 'circuitBreaker';
    if (lower.includes('health check')) return 'healthCheck';
    if (lower.includes('timeout')) return 'timeout';
    if (lower.includes('dependency')) return 'dependency';
    if (lower.includes('logging')) return 'logging';
    if (lower.includes('rate limit')) return 'rateLimiting';
    if (lower.includes('secure header')) return 'secureHeaders';
    if (lower.includes('input validation')) return 'inputValidation';

    return null;
}


export function deactivate() {
    console.log('❌ HealOps extension deactivated');
}