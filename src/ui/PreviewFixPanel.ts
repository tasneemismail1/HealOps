import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class PreviewFixPanel {
  public static show(file: string, issue: string) {
    const workspacePath = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
    if (!workspacePath) return;

    const filePath = path.join(workspacePath, file);
    const originalCode = fs.readFileSync(filePath, 'utf-8');

    const fixedCode = `// 🔧 Suggested fix: ${issue}\n\n${originalCode}`;

    const panel = vscode.window.createWebviewPanel(
      'previewFix',
      `Preview Fix: ${issue}`,
      vscode.ViewColumn.One,
      { enableScripts: false }
    );

    panel.webview.html = PreviewFixPanel.getWebviewContent(originalCode, fixedCode);
  }

  private static getWebviewContent(original: string, fixed: string): string {
    return `
      <html>
        <body style="font-family: monospace;">
          <h2>Preview Fix</h2>
          <div style="display: flex; gap: 20px;">
            <div style="width: 50%;">
              <h3>🟥 Original</h3>
              <pre>${original.replace(/</g, '&lt;')}</pre>
            </div>
            <div style="width: 50%;">
              <h3>🟩 With Suggested Fix</h3>
              <pre>${fixed.replace(/</g, '&lt;')}</pre>
            </div>
          </div>
        </body>
      </html>
    `;
  }
}
