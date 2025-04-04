// Import estraverse for a more flexible AST traversal that includes parent/child relationships
import * as estraverse from 'estraverse';

/**
 * Detects API calls (like fetch or axios) that are not wrapped with retry mechanisms.
 * Retry logic is important for building resilient applications that handle temporary network failures.
 *
 * @param ast - The Abstract Syntax Tree of the parsed source code
 * @param file - File name, used for reporting and logging
 * @returns string[] - List of issues found in the file
 */
export function detectRetryIssues(ast: any, file: string): string[] {
    const issues: string[] = [];

    // Traverse the AST with access to parent nodes for contextual checks
    estraverse.traverse(ast as any, {
        enter(node: any, parent: any) {
            console.log(`Inspecting node of type: ${node.type} in file: ${file}`);

            /**
             * Step 1: Detect API calls like `fetch(...)` or `axios(...)`.
             * These are common network request methods in JS/TS, especially in microservices and frontends.
             */
            if (
                node.type === 'CallExpression' &&
                node.callee.type === 'Identifier' &&
                (node.callee.name === 'fetch' || node.callee.name === 'axios')
            ) {
                let hasRetryLoop = false;
                let hasTryCatch = false;
                let identifierName = 'UnknownVariable'; // Default if not assigned to a variable

                console.log(`Found API call (${node.callee.name}) in file: ${file}`);

                // Step 2: If assigned to a variable, capture the variable name for better issue messages
                if (parent && parent.type === 'VariableDeclarator' && parent.id.type === 'Identifier') {
                    identifierName = parent.id.name;
                    console.log(`API call result stored in variable: ${identifierName}`);
                }

                /**
                 * Step 3: Check if the API call is inside a try-catch block,
                 * which shows at least a basic error handling mechanism.
                 */
                let ancestor = parent;
                while (ancestor) {
                    if (ancestor.type === 'TryStatement') {
                        hasTryCatch = true;
                        console.log(`API call (${node.callee.name}) inside try-catch in file: ${file}`);
                        break;
                    }
                    ancestor = ancestor.parent; // Use parent tracking to walk upward
                }

                /**
                 * Step 4: Check whether retry logic is implemented using loops.
                 * Retry logic typically appears in `for`, `while`, or recursive patterns.
                 */
                estraverse.traverse(node, {
                    enter(subNode: any) {
                        if (subNode.type === 'WhileStatement' || subNode.type === 'ForStatement') {
                            hasRetryLoop = true;
                            console.log(`Found retry loop in file: ${file}`);
                        }
                    }
                });

                /**
                 * Step 5: If retry logic is absent, flag this as a resilience issue.
                 * These kinds of missed patterns can cause services to fail under unstable network conditions.
                 */
                if (!hasRetryLoop) {
                    issues.push(
                        `${file} - API call (${node.callee.name}) stored in "${identifierName}" is missing retry logic.`
                    );
                    console.log(
                        `Missing retry logic detected in file: ${file} for variable "${identifierName}".`
                    );
                }
            }
        }
    });

    console.log(`Issues detected: ${issues.length}`);
    return issues;
}
