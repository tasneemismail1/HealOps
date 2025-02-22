import { simple as walkSimple } from 'acorn-walk';



export function detectInputValidationIssues(ast: any, file: string): string[] {
    const issues: string[] = [];

    walkSimple(ast, {
        CallExpression(node) {
            if (
                node.callee.type === 'MemberExpression' &&
                node.callee.object.type === 'Identifier' &&
                node.callee.object.name === 'app' &&
                node.callee.property.type === 'Identifier' &&
                ['post', 'put'].includes(node.callee.property.name) // Only check POST & PUT requests
            ) {
                const routePath = node.arguments[0]; // First argument (route path)
                const middlewareArg = node.arguments[1]; // Middleware or route handler

                if (routePath && routePath.type === 'Literal' && typeof routePath.value === 'string') {
                    let hasValidation = false;

                    // Ensure middleware argument exists and contains validation
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

                    // If no validation middleware is found, report the issue
                    if (!hasValidation) {
                        issues.push(`${file} - Missing input validation middleware for route: ${routePath.value}`);
                    }
                }
            }
        }
    });

    return issues;
}