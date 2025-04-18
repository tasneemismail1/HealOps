import { simple as walkSimple } from 'acorn-walk'; //AST traversal


//Detects axios API calls that do not include a timeout configuration.
export function detectTimeoutIssues(ast: any, file: string): string[] {
    const issues: string[] = [];
    let hasAxiosCall = false;

    walkSimple(ast, {
        CallExpression(node) {
            if (
                node.callee.type === 'MemberExpression' &&
                node.callee.object.type === 'Identifier' &&
                node.callee.object.name === 'axios'
            ) {
                hasAxiosCall = true;

                let hasTimeout = false;

                //Check all arguments passed to axios
                for (const configArg of node.arguments) {
                    if (configArg && configArg.type === 'ObjectExpression') {
                        // Search for a property with key `timeout`
                        const hasTimeoutProp = configArg.properties.some((prop: any) =>
                            prop.type === 'Property' &&
                            prop.key.type === 'Identifier' &&
                            prop.key.name === 'timeout'
                        );
                        if (hasTimeoutProp) {
                            hasTimeout = true;
                            break;
                        }
                    }
                }

                //If no timeout found in axios call
                if (!hasTimeout) {
                    issues.push(`${file} - No timeout configuration in axios API calls.`);
                }
            }
        }
    });

    return hasAxiosCall ? issues : [];
}
