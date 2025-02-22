import { simple as walkSimple } from 'acorn-walk';

export function detectSecureHeadersIssues(ast: any, file: string): string[] {
    const issues: string[] = [];
    let foundHelmet = false;
    walkSimple(ast, {
        CallExpression(node) {
            if (node.callee.type === 'Identifier' && node.callee.name === 'helmet') {
                foundHelmet = true;
            }
        }
    });
    if (!foundHelmet) {
        issues.push(`${file} - Secure headers middleware (helmet) is missing.`);
    }
    return issues;
}