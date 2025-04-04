// Import simple walker from acorn-walk to traverse AST nodes easily
import { simple as walkSimple } from 'acorn-walk';

/**
 * Detects whether rate limiting middleware is used in an Express application.
 * Rate limiting is a crucial security and performance control, especially in public APIs,
 * to prevent abuse like brute-force attacks or DoS.
 * 
 * @param ast - Abstract Syntax Tree of the parsed JavaScript/TypeScript file
 * @param file - Name of the file being scanned (used for tagging issues)
 * @returns string[] - List of detected issues related to missing rate limiting
 */
export function detectRateLimitingIssues(ast: any, file: string): string[] {
    const issues: string[] = [];
    let foundRateLimit = false;

    /**
     * Traverse the AST to find calls to `app.use(...)`,
     * which is where Express middleware is registered.
     */
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

                /**
                 * Look through all arguments passed to app.use(...)
                 * We are specifically checking if the rateLimit middleware is used.
                 * This typically appears as: `app.use(rateLimit({ ... }))`
                 */
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

    // If no rate limiting was found, report it as a potential vulnerability
    if (!foundRateLimit) {
        console.log(`❌ Scanner found missing rate limiting in: ${file}`);
        issues.push(`${file} - Rate limiting middleware is missing.`);
    } else {
        console.log(`✅ Scanner detected rate limiting is already present in: ${file}`);
    }

    return issues;
}
