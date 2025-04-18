import { simple as walkSimple } from 'acorn-walk'; //traverse AST nodes

//Detects missing input validation middleware in POST and PUT routes.
//preventing injection, type errors, or malformed requests.

export function detectInputValidationIssues(ast: any, file: string): string[] {
    const issues: string[] = [];

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

                    //Look for common validation middlewares used in Express.js, 
                    //such as `check()`, `body()`, `param()`, `query()` (e.g., from express-validator)
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

                    // If no validation logic was found in middleware
                    if (!hasValidation) {
                        issues.push(`${file} - Missing input validation middleware for route: ${routePath.value}`);
                    }
                }
            }
        }
    });

    return issues;
}