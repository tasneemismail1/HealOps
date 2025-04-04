import * as vscode from 'vscode';
import * as fs from 'fs';

// Importing custom UI components
import { HealOpsPanel } from '../ui/HealOpsPanel';
import { PreviewFixPanel } from '../ui/PreviewFixPanel';

// Core logic to scan the codebase and identify issues
import { scanProject } from './scanProject';

// Tree view and item interfaces for displaying issues in the VS Code sidebar
import { HealOpsItem, HealOpsTreeProvider } from '../HealOpsTreeProvider';

// Utility to recursively retrieve all JS/TS files in the project
import { getAllJsTsFiles } from '../utils/fileUtils';

// Dispatcher to get the appropriate fix module based on the detected issue
import { getFixModule } from '../fixes/fixDispatcher';

// Utility to detect the type of issue from its text description
import { detectIssueType } from '../utils/issueUtils';


/**
 * Registers all HealOps-related commands that will be exposed to the user through VS Code.
 * This function is the entry point for command registration in the extension lifecycle.
 * It follows good separation of concerns and contributes to a maintainable plugin architecture.
 */
export function registerHealOpsCommands(context: vscode.ExtensionContext) {
    // Initialize a tree view provider to visually list issues in a dedicated sidebar
    const treeDataProvider = new HealOpsTreeProvider();
    vscode.window.createTreeView('healopsIssuesView', { treeDataProvider });

    // Register all extension commands and attach them to the extension context
    context.subscriptions.push(

        // Command to open the main HealOps information panel
        vscode.commands.registerCommand('healops.openPanel', () => {
            HealOpsPanel.createOrShow(context.extensionUri);
        }),

        /**
         * Command to scan the entire workspace for known microservice anti-patterns.
         * Detected issues are grouped and displayed in the sidebar tree view.
         */
        vscode.commands.registerCommand('healops.scanMicroservices', async () => {

            // Perform the scan and show real-time progress in the status bar
            const issues = await scanProject(progress =>
                vscode.window.setStatusBarMessage(`Scanning: ${progress}%`)
            );

            // Retrieve the root path of the current project/workspace
            const workspaceRoot = vscode.workspace.workspaceFolders![0].uri.fsPath;

            // Get a list of all relevant JavaScript/TypeScript files
            const allFiles = getAllJsTsFiles(workspaceRoot);

            // Group issues by file path to display them in the tree view
            const grouped: Record<string, string[]> = {};
            for (const full of issues) {
                const [file, message] = full.split(' - ');
                const fullPath = allFiles.find(f => f.endsWith(file));
                if (fullPath) {
                    if (!grouped[fullPath]) grouped[fullPath] = [];
                    grouped[fullPath].push(message);
                }
            }

            // Update the UI tree with newly scanned issues
            treeDataProvider.refresh(grouped);
            vscode.window.showInformationMessage(`Scan completed! Detected ${issues.length} issues.`);
        }),

        /**
         * Command to preview how a suggested fix would alter the code.
         * This allows the developer to verify changes before applying them.
         */
        vscode.commands.registerCommand('healops.previewFix', async (item: HealOpsItem) => {
            if (!item.fileName || !item.issueText) {
                vscode.window.showErrorMessage('Missing file or issue.');
                return;
            }

            // Load the source file's content
            const originalCode = fs.readFileSync(item.fileName, 'utf-8');

            // Infer the type of issue to determine which fix to preview
            const issueType = detectIssueType(item.issueText);
            if (!issueType) {
                vscode.window.showWarningMessage(`⚠️ No preview logic found for: ${item.issueText}`);
                return;
            }

            try {
                // Dynamically load the appropriate fix logic
                const fixModule = getFixModule(issueType);

                // Apply the fix (non-destructively) and capture the updated version
                const fixedCode = await fixModule.applyFix(item.fileName);

                // Open a visual diff view to compare original and fixed code
                PreviewFixPanel.show(item.label, item.issueText, originalCode, fixedCode);
            } catch (error) {
                vscode.window.showErrorMessage(`❌ Error generating fix preview: ${error}`);
            }
        }),

        /**
         * Command to apply a code fix directly to the source file.
         * This permanently replaces the code with the fixed version.
         */
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
                // Retrieve the fix logic and generate the corrected code
                const fixModule = getFixModule(issueType);
                const updatedCode = await fixModule.applyFix(item.fileName);

                // Open the file in VS Code's editor
                const uri = vscode.Uri.file(item.fileName);
                const document = await vscode.workspace.openTextDocument(uri);

                // Define a range covering the entire file content
                const fullRange = new vscode.Range(
                    document.positionAt(0),
                    document.positionAt(document.getText().length)
                );

                // Replace the original content with the updated code
                const edit = new vscode.WorkspaceEdit();
                edit.replace(uri, fullRange, updatedCode);
                await vscode.workspace.applyEdit(edit);
                await document.save();

                vscode.window.showInformationMessage(`✅ Fix applied: ${item.issueText}`);
            } catch (error) {
                vscode.window.showErrorMessage(`❌ Error fixing ${item.issueText}: ${error}`);
            }
        }),

        /**
         * Command to ignore a flagged issue.
         * This is useful when the developer decides that a fix is not applicable.
         */
        vscode.commands.registerCommand('healops.ignoreFix', (item: HealOpsItem) => {

            // Fetch existing issues for the file from the tree provider
            const issues = treeDataProvider.getIssueMap().get(item.fileName!) || [];

            // Modify the specific issue label to indicate it was ignored
            const updated = issues.map(i => (i === item.issueText ? `⚠️ Ignored: ${i}` : i));

            // Update the tree UI with the modified issue list
            treeDataProvider.refresh({ [item.fileName!]: updated });

            vscode.window.showWarningMessage(`⚠️ Ignored fix: ${item.issueText}`);
        })
    );
}
