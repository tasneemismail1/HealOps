import { simple as walkSimple } from 'acorn-walk';//traverse AST nodes

//Detects whether rate limiting middleware is used in an Express application 
//to prevent abuse like brute-force attacks or DoS.

export function detectRateLimitingIssues(ast: any, file: string): string[] {
    const issues: string[] = [];
    let foundRateLimit = false;

    walkSimple(ast, {
        CallExpression(node) {
            // Look for app.use(...) calls
            if (
                node.callee.type === 'MemberExpression' &&
                node.callee.object.type === 'Identifier' &&
                node.callee.object.name === 'app' &&
                node.callee.property.type === 'Identifier' &&
                node.callee.property.name === 'use'
            ) {
                const args = node.arguments;

                //Look through all arguments passed to app.use(...) appears as: `app.use(rateLimit({ ... }))`
                if (
                    args.some(arg =>
                        arg.type === 'CallExpression' &&
                        arg.callee &&
                        arg.callee.type === 'Identifier' &&
                        arg.callee.name === 'rateLimit'
                    )
                ) {
                    foundRateLimit = true;
                }
            }
        }
    });

    // If no rate limiting was found
    if (!foundRateLimit) {
        console.log(`❌ Scanner found missing rate limiting in: ${file}`);
        issues.push(`${file} - Rate limiting middleware is missing.`);
    } else {
        console.log(`✅ Scanner detected rate limiting is already present in: ${file}`);
    }

    return issues;
}
