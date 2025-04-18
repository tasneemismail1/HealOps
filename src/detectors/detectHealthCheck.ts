import { simple as walkSimple } from 'acorn-walk';//traverse the AST


 //Detects whether the code includes a proper health-check endpoint, such as `app.get('/health')` or `app.get('/status')`

export function detectHealthCheckIssues(ast: any, file: string): string[] {
    const issues: string[] = []; 
    let hasHealthCheck = false;

    //Traverse the AST looking for `app.get('/health')` or `app.get('/status')`
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
                // Retrieve the first argument of app.get(), (the route path)
                const arg = node.arguments[0];

                // If the path is '/health' or '/status', it's a valid health-check endpoint
                if (arg.type === 'Literal' && (arg.value === '/health' || arg.value === '/status')) {
                    hasHealthCheck = true;
                }
            }
        }
    });

    //If no health-check endpoint was found in this file, it is flages as an issue.
    if (!hasHealthCheck) {
        issues.push(`${file} - No health-check endpoint detected.`);
    }

    return issues;
}
