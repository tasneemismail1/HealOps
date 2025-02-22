import { simple as walkSimple } from 'acorn-walk';


export function detectHealthCheckIssues(ast: any, file: string): string[] {
    const issues: string[] = []; // Array to store detected issues
    let hasHealthCheck = false; // Flag to check if a health check endpoint exists

    // Traverse the AST to detect function calls
    walkSimple(ast, {
        CallExpression(node) {
            // Check if the function call is an Express.js route handler (app.get)
            if (
                node.callee.type === 'MemberExpression' &&
                node.callee.object.type === 'Identifier' &&
                node.callee.object.name === 'app' &&
                node.callee.property.type === 'Identifier' &&
                node.callee.property.name === 'get'
            ) {
                // Check if the route path is '/health' or '/status'
                const arg = node.arguments[0];
                if (arg.type === 'Literal' && (arg.value === '/health' || arg.value === '/status')) {
                    hasHealthCheck = true;
                }
            }
        }
    });

    // If no health-check route was detected, report an issue
    if (!hasHealthCheck) {
        issues.push(`${file} - No health-check endpoint detected.`);
    }

    return issues; // Return the list of detected issues
}