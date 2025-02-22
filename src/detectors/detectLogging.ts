import { simple as walkSimple } from 'acorn-walk';

export function detectLoggingIssues(ast: any, file: string): string[] {
    const issues: string[] = [];
    walkSimple(ast, {
        TryStatement(node) {
            if (node.handler) {
                let hasLogging = false;
                walkSimple(node.handler.body, {
                    CallExpression(innerNode) {
                        if (innerNode.callee.type === 'MemberExpression' &&
                            innerNode.callee.object.type === 'Identifier' &&
                            innerNode.callee.object.name === 'console') {
                            hasLogging = true;
                        }
                    }
                });
                if (!hasLogging) {
                    issues.push(`${file} - Missing logging in try-catch block.`);
                }
            }
        }
    });
    return issues;
}