import { simple as walkSimple } from 'acorn-walk'; //AST traversal

//Detects missing logging inside try-catch blocks.
export function detectLoggingIssues(ast: any, file: string): string[] {
    const issues: string[] = [];

     //focus on the `handler` block (i.e., the catch block) to check for logging
    walkSimple(ast, {
        TryStatement(node) {
            if (node.handler) {
                let hasLogging = false;

                walkSimple(node.handler.body, {
                    CallExpression(innerNode) {
                        if (
                            innerNode.callee.type === 'MemberExpression' &&
                            innerNode.callee.object.type === 'Identifier' &&
                            innerNode.callee.object.name === 'console' // Matches `console.log(...)`, etc.
                        ) {
                            hasLogging = true;
                        }
                    }
                });

                //If the catch block contains no logging
                if (!hasLogging) {
                    issues.push(`${file} - Missing logging in try-catch block.`);
                }
            }
        }
    });

    return issues;
}
