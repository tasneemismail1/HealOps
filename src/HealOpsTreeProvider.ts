// VS Code APIs for building custom tree views
import * as vscode from 'vscode';
import { basename } from 'path';

/**
 * HealOpsTreeProvider supplies data to the custom "Issues" view in the sidebar.
 * It supports two levels: files (collapsible) and individual issues (leaf nodes).
 */
export class HealOpsTreeProvider implements vscode.TreeDataProvider<HealOpsItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<HealOpsItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  // Maps file paths to lists of issues (e.g., { 'src/app.js': ['Missing retry logic', ...] })
  private issueMap = new Map<string, string[]>();

  //Updates the tree with new scan results and triggers UI refresh.
  //issuesByFile - A record mapping file paths to arrays of detected issues
  refresh(issuesByFile: Record<string, string[]>) {
    this.issueMap = new Map(Object.entries(issuesByFile));
    this._onDidChangeTreeData.fire(undefined); // Refresh whole tree
  }

  //Converts a HealOpsItem into a TreeItem displayed in the UI.
  getTreeItem(element: HealOpsItem): vscode.TreeItem {
    return element;
  }

  //Resolves the children of a given item.
  //If no parent is provided, top-level nodes (files) are returned.

  //element - Optional parent item (undefined if root level)
  //returns A list of HealOpsItem (files or issues)
  getChildren(element?: HealOpsItem): Thenable<HealOpsItem[]> {
  
    if (!element) {
      //To always show display generate report button at the top of the sidebar
      const generateReportItem = new HealOpsItem(
        'Generate Report',
        vscode.TreeItemCollapsibleState.None
      );
      generateReportItem.command = {
          command: 'healops.generateReport',
          title: 'Generate Report'
      };
      generateReportItem.iconPath = new vscode.ThemeIcon('save');

      // Return top-level files with collapsible indicators (root-level)

      const fileItems = [...this.issueMap.keys()].map(file =>
        new HealOpsItem(
            basename(file), // Display just the file name
            vscode.TreeItemCollapsibleState.Collapsed,
            undefined,
            true,  // isFile = true
            file   // Store full file path for later use
        )
    );

    return Promise.resolve([generateReportItem, ...fileItems]);
      // return Promise.resolve(
      //   [...this.issueMap.keys()].map(file =>
      //     new HealOpsItem(
      //       basename(file), // Display just the file name
      //       vscode.TreeItemCollapsibleState.Collapsed,
      //       undefined,
      //       true, // Is file
      //       file  // Store full file path for later use
      //     )
      //   )
      // );
    }

    //If a file node is expanded
    if (element.isFile) {
      const filePath = element.filePath!;
      const issues = this.issueMap.get(filePath) || [];

      // Return each issue as a child node under the file
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

    return Promise.resolve([]); // No children for leaf nodes (empty list)
  }

  //Getter for the internal issue map (used in ignoreFix logic, etc.).
  getIssueMap(): Map<string, string[]> {
    return this.issueMap;
  }
}

//Represents a single item in the HealOps issues tree.
//Can either be a file node (collapsible) or an individual issue (leaf).
export class HealOpsItem extends vscode.TreeItem {
  fileName?: string;    // Full path to the file this item belongs to
  issueText?: string;   // issue description (for leaf nodes)

  constructor(
    public readonly label: string, // Text shown in the tree view
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    command?: vscode.Command,
    public readonly isFile = false,
    public readonly filePath?: string
  ) {
    super(label, collapsibleState);

    this.command = command;

    // Used in context menu conditions (e.g., applyFix only on issue nodes)
    //this.contextValue = isFile ? 'healopsFile' : 'healopsIssue';

    if (label === 'Generate Report') {
      this.contextValue = 'generateReport';
    } else if (isFile) {
        this.contextValue = 'healopsFile';
    } else {
        this.contextValue = 'healopsIssue';
    }
  }
}
