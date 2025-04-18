// import * as fs from 'fs';
// import * as path from 'path';

// interface Issue {
//     projectName: string;
//     filePath: string;
//     issueType: string;
//     fixStatus: 'Fixed' | 'Not Fixed';
//     detectedAt: string;
//     fixedAt?: string;
// }

// export class HealOpsReport {
//     private issues: Issue[] = [];
//     private reportPath: string;

//     constructor(reportDir: string, projectName: string) {
//         this.reportPath = path.join(reportDir, `${projectName}_HealOps_Report.csv`);
//         this.initializeReport();
//     }

//     private initializeReport() {
//         if (!fs.existsSync(this.reportPath)) {
//             const headers = 'Project Name,File Path,Issue Type,Fix Status,Detected At,Fixed At\n';
//             fs.writeFileSync(this.reportPath, headers, 'utf8');
//         }
//     }

//     public addIssue(issue: Issue) {
//         this.issues.push(issue);
//     }

//     public generateReport() {
//         const csvContent = this.issues.map(issue => 
//             `${issue.projectName},${issue.filePath},${issue.issueType},${issue.fixStatus},${issue.detectedAt},${issue.fixedAt || ''}`
//         ).join('\n');
        
//         fs.appendFileSync(this.reportPath, csvContent + '\n', 'utf8');
//         console.log(`Report updated: ${this.reportPath}`);
//     }
// }

// // Example usage
// const report = new HealOpsReport('./reports', 'SampleProject');
// report.addIssue({
//     projectName: 'SampleProject',
//     filePath: 'src/services/authService.ts',
//     issueType: 'Timeout Error',
//     fixStatus: 'Fixed',
//     detectedAt: new Date().toISOString(),
//     fixedAt: new Date().toISOString(),
// });
// report.addIssue({
//     projectName: 'SampleProject',
//     filePath: 'src/config/database.ts',
//     issueType: 'Missing Health Check',
//     fixStatus: 'Not Fixed',
//     detectedAt: new Date().toISOString(),
// });
// report.generateReport();

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export async function generateHealOpsReport(issueMap: Map<string, string[]>) {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showErrorMessage('No workspace folder open!');
        return;
    }

    const projectName = path.basename(workspaceFolders[0].uri.fsPath);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(workspaceFolders[0].uri.fsPath, `HealOps-Report-${timestamp}.csv`);

    const header = ['Project Name', 'File', 'Issue Detected', 'Status'].join(',') + '\n';
    let body = '';

    issueMap.forEach((issues, filePath) => {
        issues.forEach(issue => {
            body += [projectName, path.basename(filePath), issue, 'Fixed/Unfixed'].join(',') + '\n';
        });
    });

    fs.writeFileSync(reportPath, header + body);
    vscode.window.showInformationMessage(`HealOps Report generated: ${reportPath}`);
}
