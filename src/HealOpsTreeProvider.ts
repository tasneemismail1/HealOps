import * as vscode from 'vscode';

export class HealOpsTreeProvider implements vscode.TreeDataProvider<HealOpsItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<HealOpsItem | undefined | null | void> = new vscode.EventEmitter();
  readonly onDidChangeTreeData: vscode.Event<HealOpsItem | undefined | null | void> = this._onDidChangeTreeData.event;

  private issueMap: Map<string, string[]> = new Map();

  refresh(issuesByFile: Record<string, string[]>) {
    this.issueMap = new Map(Object.entries(issuesByFile));
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: HealOpsItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: HealOpsItem): Thenable<HealOpsItem[]> {
    if (!element) {
      // Root level: file names
      return Promise.resolve([...this.issueMap.keys()].map(file =>
        new HealOpsItem(file, vscode.TreeItemCollapsibleState.Collapsed, undefined, true)
      ));
    }

    if (element.isFile) {
      const file = element.label;
      const issues = this.issueMap.get(file) || [];

      return Promise.resolve(
        issues.map(issue => {
          const item = new HealOpsItem(
            issue,
            vscode.TreeItemCollapsibleState.None,
            {
              command: 'healops.previewFix',
              title: 'Preview Fix',
              arguments: [file, issue]
            },
            false
          );

          // ✅ Explicitly set fields for use in package.json args
          (item as any).fileName = file;
          (item as any).issueText = issue;

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
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly command?: vscode.Command,
    public readonly isFile: boolean = false
  ) {
    super(label, collapsibleState);
    this.contextValue = isFile ? 'healopsFile' : 'healopsIssue';
  }
}
