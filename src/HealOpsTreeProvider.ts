import * as vscode from 'vscode';
import { basename } from 'path';

export class HealOpsTreeProvider implements vscode.TreeDataProvider<HealOpsItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<HealOpsItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private issueMap = new Map<string, string[]>();

  refresh(issuesByFile: Record<string, string[]>) {
    this.issueMap = new Map(Object.entries(issuesByFile));
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: HealOpsItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: HealOpsItem): Thenable<HealOpsItem[]> {
    if (!element) {
      return Promise.resolve(
        [...this.issueMap.keys()].map(
          file => new HealOpsItem(
            basename(file), 
            vscode.TreeItemCollapsibleState.Collapsed, 
            undefined,
            true,
            file // ✅ store full path here explicitly
          )
        )
      );
    }

    if (element.isFile) {
      const filePath = element.filePath!;
      const issues = this.issueMap.get(filePath) || [];

      return Promise.resolve(
        issues.map(issue => {
          const item = new HealOpsItem(
            issue,
            vscode.TreeItemCollapsibleState.None,
            undefined,
            false,
            filePath
          );
          item.fileName = filePath;
          item.issueText = issue;
          return item;
        })
      );
    }

    return Promise.resolve([]);
  }

  getIssueMap(): Map<string, string[]> {
    return this.issueMap;
  }
}

export class HealOpsItem extends vscode.TreeItem {
  fileName?: string;
  issueText?: string;

  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    command?: vscode.Command,
    public readonly isFile = false,
    public readonly filePath?: string
  ) {
    super(label, collapsibleState);
    this.command = command;
    this.contextValue = isFile ? 'healopsFile' : 'healopsIssue';
  }
}
