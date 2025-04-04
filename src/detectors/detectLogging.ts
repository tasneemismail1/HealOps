// Import the simple walker from acorn-walk for basic AST traversal
import { simple as walkSimple } from 'acorn-walk';

/**
 * Detects missing logging inside try-catch blocks.
 * Logging in catch blocks is a key practice for debugging and monitoring failures,
 * especially in production-grade microservices and applications.
 * 
 * @param ast - Abstract Syntax Tree representing the parsed source code
 * @param file - The file name being analyzed (used for reporting)
 * @returns string[] - List of issues describing missing logging cases
 */
export function detectLoggingIssues(ast: any, file: string): string[] {
    const issues: string[] = [];

    /**
     * Step 1: Traverse the AST to find all try-catch statements.
     * We focus on the `handler` block (i.e., the catch block) to check for logging usage.
     */
    walkSimple(ast, {
        TryStatement(node) {
            if (node.handler) {
                let hasLogging = false;

                /**
                 * Step 2: Inspect the contents of the catch block.
                 * We're looking for `console.log`, `console.error`, or any `console` method,
                 * which typically indicates that an error is at least being reported.
                 */
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

                /**
                 * Step 3: If the catch block contains no logging, we flag it as a potential issue.
                 * This promotes better observability and debugging capability.
                 */
                if (!hasLogging) {
                    issues.push(`${file} - Missing logging in try-catch block.`);
                }
            }
        }
    });

    return issues;
}
