import * as estraverse from 'estraverse';


//1 detectRetryIssues
export function detectRetryIssues(ast: any, file: string): string[] {
    const issues: string[] = [];

    estraverse.traverse(ast as any, {
        enter(node: any, parent: any) {
            console.log(`Inspecting node of type: ${node.type} in file: ${file}`);

            // Detect API calls (fetch or axios)
            if (
                node.type === 'CallExpression' &&
                node.callee.type === 'Identifier' &&
                (node.callee.name === 'fetch' || node.callee.name === 'axios')
            ) {
                let hasRetryLoop = false;
                let hasTryCatch = false;
                let identifierName = 'UnknownVariable';

                console.log(`Found API call (${node.callee.name}) in file: ${file}`);

                // Check if this API call is assigned to a variable
                if (parent && parent.type === 'VariableDeclarator' && parent.id.type === 'Identifier') {
                    identifierName = parent.id.name;
                    console.log(`API call result stored in variable: ${identifierName}`);
                }

                // Check if it's inside a try-catch block
                let ancestor = parent;
                while (ancestor) {
                    if (ancestor.type === 'TryStatement') {
                        hasTryCatch = true;
                        console.log(`API call (${node.callee.name}) inside try-catch in file: ${file}`);
                        break;
                    }
                    ancestor = ancestor.parent;
                }

                // Check for retry mechanisms (loop or recursive call)
                estraverse.traverse(node, {
                    enter(subNode: any) {
                        if (subNode.type === 'WhileStatement' || subNode.type === 'ForStatement') {
                            hasRetryLoop = true;
                            console.log(`Found retry loop in file: ${file}`);
                        }
                    }
                });

                // If API call is found without a retry mechanism, flag it with identifier
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



