import * as vscode from 'vscode';
// please dont changethis function
export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('healops.scanMicroservices', () => {
        vscode.window.showInformationMessage('Scanning your Microservices...');
        scanCodebase();
    });

    context.subscriptions.push(disposable);
}
//here u can change 3ady
function scanCodebase() {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
        const document = editor.document;
        const code = document.getText();

        // Analyze code
        const retryIssues = detectRetryIssues(code);
        const circuitBreakerIssues = detectCircuitBreakerIssues(code);
        const healthCheckIssues = detectHealthCheckIssues(code);
        const timeoutIssues = detectTimeoutIssues(code);
        const dependencyInjectionIssues = detectDependencyInjectionIssues(code);
        const loggingIssues = detectLoggingIssues(code);
        const rateLimitingIssues = detectRateLimitingIssues(code);

        // Aggregate and display results
        const issues = [
            ...retryIssues,
            ...circuitBreakerIssues,
            ...healthCheckIssues,
            ...timeoutIssues,
            ...dependencyInjectionIssues,
            ...loggingIssues,
            ...rateLimitingIssues
        ];
        
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

function detectTimeoutIssues(code: string): string[] {
    const issues: string[] = [];
    const timeoutPattern = /axios\.(get|post|put|delete)\([\s\S]?{[\s\S]?timeout:/g;
    if (!timeoutPattern.test(code)) {
        issues.push('No timeout configuration in axios API calls.');
    }
    return issues;
}

function detectDependencyInjectionIssues(code: string): string[] {
    const issues: string[] = [];
    const hardcodedPattern = /new\s+[A-Z]\w+\(/g; // Detect 'new ClassName()'
    const matches = code.match(hardcodedPattern) || [];
    if (matches.length > 0) {
        issues.push(`Found ${matches.length} hardcoded dependencies. Consider using dependency injection.`);
    }
    return issues;
}

function detectLoggingIssues(code: string): string[] {
    const issues: string[] = [];
    const tryCatchPattern = /try\s*{[\s\S]*?}\s*catch\s*\([\s\S]*?\)\s*{[\s\S]*?}/g;
    const loggingPattern = /(console\.log|console\.error|logger\.)/;
    const matches = code.match(tryCatchPattern) || [];
    
    matches.forEach((block, index) => {
        if (!loggingPattern.test(block)) {
            issues.push(`Missing logging in try-catch block #${index + 1}.`);
        }
    });

    return issues;
}

function detectRateLimitingIssues(code: string): string[] {
    const issues: string[] = [];
    if (!code.includes('express-rate-limit')) {
        issues.push('Rate limiting middleware is missing.');
    }
    return issues;
}

// please do not change this command
export function deactivate() {}
