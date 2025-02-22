
import { simple as walkSimple } from 'acorn-walk';


export function detectRateLimitingIssues(ast: any, file: string): string[] {
    const issues: string[] = [];
    let foundRateLimit = false;

    walkSimple(ast, {
        CallExpression(node) {
            if (
                node.callee.type === 'MemberExpression' &&
                node.callee.object.type === 'Identifier' &&
                node.callee.object.name === 'app' &&
                node.callee.property.type === 'Identifier' &&
                node.callee.property.name === 'use'
            ) {
                const args = node.arguments;

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

    if (!foundRateLimit) {
        console.log(`❌ Scanner found missing rate limiting in: ${file}`);
        issues.push(`${file} - Rate limiting middleware is missing.`);
    } else {
        console.log(`✅ Scanner detected rate limiting is already present in: ${file}`);
    }

    return issues;
}