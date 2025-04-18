import * as estraverse from 'estraverse'; //AST traversal

//Detects fetch/axios API calls not wrapped with retry logic.
export function detectRetryIssues(ast: any, file: string): string[] {
    const issues: string[] = [];

    // Track parent references for upward context traversal
    const parentMap = new WeakMap();

    // First: attach parent info
    estraverse.traverse(ast, {
        enter(node, parent) {
            if (parent) {
                parentMap.set(node, parent);
            }
        }
    });

    // Second: analyze and detect retry issues
    estraverse.traverse(ast, {
        enter(node) {
            if (
                node.type === 'CallExpression' &&
                (
                    (node.callee.type === 'Identifier' && node.callee.name === 'fetch') ||
                    (node.callee.type === 'MemberExpression' &&
                        node.callee.object?.type === 'Identifier' &&
                        node.callee.object.name === 'axios' &&
                        node.callee.property?.type === 'Identifier')
                )
            ) {
                let hasRetryLoop = false;
                let identifierName = 'UnknownVariable';
                let apiCall = 'unknown';

                if (node.callee.type === 'Identifier') {
                    apiCall = node.callee.name; // e.g., fetch
                } else if (
                    node.callee.type === 'MemberExpression' &&
                    node.callee.object?.type === 'Identifier' &&
                    node.callee.object.name === 'axios' &&
                    node.callee.property?.type === 'Identifier'
                ) {
                    apiCall = `axios.${node.callee.property.name}`; // e.g., axios.get
                }

                // Get variable name if it's assigned
                let current = parentMap.get(node);
                while (current) {
                    if (current.type === 'VariableDeclarator' && current.id.type === 'Identifier') {
                        identifierName = current.id.name;
                        break;
                    }
                    if (current.type === 'AssignmentExpression' && current.left.type === 'Identifier') {
                        identifierName = current.left.name;
                        break;
                    }
                    current = parentMap.get(current);
                }

                // Climb up the parent chain to detect retry wrapper
                current = parentMap.get(node);
                while (current) {
                    if (
                        current.type === 'WhileStatement' &&
                        current.test?.type === 'BinaryExpression' &&
                        current.test.left?.name === 'retries'
                    ) {
                        hasRetryLoop = true;
                        break;
                    }
                    current = parentMap.get(current);
                }

                if (!hasRetryLoop) {
                    const message = `${file} - API call (${apiCall}) stored in "${identifierName}" is missing retry logic.`;
                    issues.push(message);
                    console.log('🔍 Retry issue found:', message);
                }
            }
        }
    });

    return issues;
}
