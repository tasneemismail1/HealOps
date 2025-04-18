// Import VS Code API and internal command registration logic
import * as vscode from 'vscode';
import { registerHealOpsCommands } from './commands/registerCommands';

/**
  Entry point of the HealOps extension.
  This method is called automatically by VS Code when the extension is activated.
 */
export function activate(context: vscode.ExtensionContext) {
    // Register all HealOps-related commands (e.g., scan, apply fix, preview fix)
    registerHealOpsCommands(context);
}


export function deactivate() {
    console.log('❌ HealOps extension deactivated');
}
