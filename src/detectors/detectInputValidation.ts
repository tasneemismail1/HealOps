// Import simple walker from acorn-walk to traverse AST nodes without tracking ancestors
import { simple as walkSimple } from 'acorn-walk';

/**
 * Detects missing input validation middleware in POST and PUT routes.
 * This is crucial for API security and preventing injection, type errors, or malformed requests.
 * 
 * @param ast - Parsed AST of a JavaScript/TypeScript file
 * @param file - The file name, used to associate detected issues
 * @returns string[] - A list of warning messages for routes lacking validation
 */
export function detectInputValidationIssues(ast: any, file: string): string[] {
    const issues: string[] = [];

    /**
     * Traverse the AST and inspect every function call.
     * We're specifically looking for:
     * - `app.post(...)`
     * - `app.put(...)`
     * These are routes where user input is commonly handled.
     */
    walkSimple(ast, {
        CallExpression(node) {
            if (
                node.callee.type === 'MemberExpression' &&
                node.callee.object.type === 'Identifier' &&
                node.callee.object.name === 'app' &&
                node.callee.property.type === 'Identifier' &&
                ['post', 'put'].includes(node.callee.property.name) // Target only POST & PUT routes
            ) {
                const routePath = node.arguments[0];     // Expected to be a literal string (e.g., "/api/login")
                const middlewareArg = node.arguments[1]; // Expected to be an array of middlewares or handlers

                // Validate the route path is a literal (e.g., '/register')
                if (routePath && routePath.type === 'Literal' && typeof routePath.value === 'string') {
                    let hasValidation = false;

                    /**
                     * Look for common validation middlewares used in Express.js,
                     * such as `check()`, `body()`, `param()`, `query()` (e.g., from express-validator).
                     * These are usually passed as part of an array of middleware.
                     */
                    if (middlewareArg && middlewareArg.type === 'ArrayExpression' && middlewareArg.elements) {
                        hasValidation = middlewareArg.elements.some(
                            (element) =>
                                element &&
                                element.type === 'CallExpression' &&
                                element.callee &&
                                element.callee.type === 'Identifier' &&
                                ['check', 'body', 'param', 'query'].includes(element.callee.name)
                        );
                    }

                    // If no validation logic was found in middleware, push a warning message
                    if (!hasValidation) {
                        issues.push(`${file} - Missing input validation middleware for route: ${routePath.value}`);
                    }
                }
            }
        }
    });

    return issues;
}