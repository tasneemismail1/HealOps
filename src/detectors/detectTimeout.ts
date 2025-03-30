
import { simple as walkSimple } from 'acorn-walk';

export function detectTimeoutIssues(ast: any, file: string): string[] {
    const issues: string[] = [];
    let hasAxiosCall = false;  // ✅ Track if axios API calls exist
    // let hasTimeout = false;

    walkSimple(ast, {
        CallExpression(node) {
            if (node.callee.type === 'MemberExpression' && node.callee.object.type === 'Identifier' && node.callee.object.name === 'axios') {
                // const configArg = node.arguments[1];
                // Check all arguments

                hasAxiosCall = true; // ✅ Mark that an axios call exists
                
                let hasTimeout = false;
                for (const configArg of node.arguments) {
                    if (configArg && configArg.type === 'ObjectExpression') {
                        const hasTimeoutProp = configArg.properties.some((prop: any) =>
                            prop.type === 'Property' && prop.key.type === 'Identifier' && prop.key.name === 'timeout'
                        );
                        if (hasTimeoutProp) {
                            hasTimeout = true;
                            break; // Exit loop once timeout is found
                        }
                    }
                }
                if (!hasTimeout) {
                    issues.push(`${file} - No timeout configuration in axios API calls.`);
                }
            }
        }
    });

    // if (!hasTimeout) {
    //     issues.push(`${file} - No timeout configuration in axios API calls.`);
    // }

    //return issues;

    // ✅ Only report missing timeout if at least one axios call exists
    return hasAxiosCall ? issues : [];
}