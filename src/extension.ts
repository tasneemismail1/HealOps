import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('healops.scanMicroservices', () => {
        vscode.window.showInformationMessage('Scanning your Microservices...');
        scanCodebase();
    });

    context.subscriptions.push(disposable);
}

function scanCodebase() {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
        const document = editor.document;
        const code = document.getText();

        // Analyze code
        const retryIssues = detectRetryIssues(code);
        const circuitBreakerIssues = detectCircuitBreakerIssues(code);
        const healthCheckIssues = detectHealthCheckIssues(code);

        // Aggregate and display results
        const issues = [...retryIssues, ...circuitBreakerIssues, ...healthCheckIssues];
        if (issues.length > 0) {
            vscode.window.showWarningMessage(`Found ${issues.length} issues in your code.`);
            vscode.window.showInformationMessage('Detailed Issues:', { modal: true });
            issues.forEach((issue) => vscode.window.showInformationMessage(issue));
        } else {
            vscode.window.showInformationMessage('No issues found! 🎉');
        }
    } else {
        vscode.window.showErrorMessage('No active editor found!');
    }
}

function detectRetryIssues(code: string): string[] {
    const issues: string[] = [];
    const retryPattern = /try\s*{[\s\S]*?}\s*catch\s*\(.*\)\s*{[\s\S]*?}/g; // Detect try-catch blocks
    if (!retryPattern.test(code)) {
        issues.push('Missing try-catch block for retry logic.');
    } else {
        // Check if retries (e.g., attempts, while loop) are implemented
        const retryCheck = /(attempts|while).*retry/g; // Look for "retry" keywords
        if (!retryCheck.test(code)) {
            issues.push('Retry mechanism not found inside try-catch block.');
        }
    }
    return issues;
}

function detectCircuitBreakerIssues(code: string): string[] {
    const issues: string[] = [];
    const circuitBreakerPattern = /CircuitBreaker|open|close|failureThreshold|resetTimeout/g; // Basic circuit breaker terms
    if (!circuitBreakerPattern.test(code)) {
        issues.push('Missing circuit breaker logic.');
    }
    return issues;
}

function detectHealthCheckIssues(code: string): string[] {
    const issues: string[] = [];
    const healthCheckPattern = /app\.get\(['"`](\/health|\/status)['"`],/g; // Match `/health` or `/status` routes
    if (!healthCheckPattern.test(code)) {
        issues.push('No health-check endpoint detected.');
    }
    return issues;
}

export function deactivate() {}
