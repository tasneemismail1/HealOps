// Import the "simple" walker from acorn-walk to traverse the AST without ancestor tracking
import { simple as walkSimple } from 'acorn-walk';

/**
 * Detects whether the code includes a proper health-check endpoint,
 * such as `app.get('/health')` or `app.get('/status')`, commonly used in microservices.
 * 
 * Health endpoints are essential for system observability and uptime monitoring.
 * 
 * @param ast - Abstract Syntax Tree of the JavaScript/TypeScript file
 * @param file - Filename to help contextualize any reported issue
 * @returns string[] - Array of issue descriptions (if any)
 */
export function detectHealthCheckIssues(ast: any, file: string): string[] {
    const issues: string[] = []; // Container for storing issues
    let hasHealthCheck = false;  // Boolean flag to track health endpoint presence

    /**
     * Traverse the AST looking for `app.get('/health')` or `app.get('/status')`
     * This is a typical pattern for health-check routes in Node.js Express apps.
     */
    walkSimple(ast, {
        CallExpression(node) {
            // Check if the call is of the form: app.get(...)
            if (
                node.callee.type === 'MemberExpression' &&
                node.callee.object.type === 'Identifier' &&
                node.callee.object.name === 'app' &&
                node.callee.property.type === 'Identifier' &&
                node.callee.property.name === 'get'
            ) {
                // Retrieve the first argument of app.get(), which should be the route path
                const arg = node.arguments[0];

                // If the path is '/health' or '/status', we assume it's a valid health-check endpoint
                if (arg.type === 'Literal' && (arg.value === '/health' || arg.value === '/status')) {
                    hasHealthCheck = true;
                }
            }
        }
    });

    /**
     * If no health-check endpoint was found in this file, flag it as an issue.
     * Health-checks are vital for service discovery and load balancer integrations.
     */
    if (!hasHealthCheck) {
        issues.push(`${file} - No health-check endpoint detected.`);
    }

    return issues; // Return any issues found (or an empty list if none)
}
