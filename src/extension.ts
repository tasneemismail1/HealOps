// Import VS Code API and internal command registration logic
import * as vscode from 'vscode';
import { registerHealOpsCommands } from './commands/registerCommands';

/**
 * Entry point of the HealOps extension.
 * This method is called automatically by VS Code when the extension is activated.
 *
 * @param context - VS Code extension context containing lifecycle and environment info
 */
export function activate(context: vscode.ExtensionContext) {
    // Register all HealOps-related commands (e.g., scan, apply fix, preview fix)
    registerHealOpsCommands(context);
}

/**
 * Optional cleanup logic (if needed) when the extension is deactivated.
 * Currently logs a message to the VS Code console.
 */
export function deactivate() {
    console.log('❌ HealOps extension deactivated');
}
