import * as vscode from 'vscode';

export class PreviewFixPanel {
  public static show(file: string, issue: string, original: string, fixed: string) {
    const panel = vscode.window.createWebviewPanel(
      'previewFix',
      `Preview Fix: ${issue}`,
      vscode.ViewColumn.One,
      { enableScripts: true }
    );

    panel.webview.html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <style>
          body { font-family: monospace; padding: 10px; background-color: #282c34; color: white; }
          .container { display: flex; gap: 20px; }
          .code-box { flex: 1; padding: 10px; overflow: auto; height: 90vh; }
          .original { background-color: #ffdddd; color: #000; }
          .fixed { background-color: #ddffdd; color: #000; }
          pre { white-space: pre-wrap; word-wrap: break-word; }
          h2 { border-bottom: 1px solid gray; }
        </style>
      </head>
      <body>
        <h2>Fix Preview: ${issue}</h2>
        <div class="container">
          <div class="code-box original">
            <h3>🟥 Original</h3>
            <pre>${original.replace(/</g, '&lt;')}</pre>
          </div>
          <div class="code-box fixed">
            <h3>🟩 Fixed</h3>
            <pre>${fixed.replace(/</g, '&lt;')}</pre>
          </div>
        </div>
      </body>
    </html>`;
  }
}
