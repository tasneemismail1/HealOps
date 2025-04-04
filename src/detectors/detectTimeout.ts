// Import basic AST traversal utility from acorn-walk
import { simple as walkSimple } from 'acorn-walk';

/**
 * Detects axios API calls that do not include a timeout configuration.
 * 
 * Timeout settings are important for preventing indefinitely hanging requests and improving system resilience.
 * This check helps enforce best practices in network communication.
 * 
 * @param ast - Abstract Syntax Tree representation of the code
 * @param file - Name of the file being analyzed (for tagging issues)
 * @returns string[] - Array of warning messages for missing timeouts
 */
export function detectTimeoutIssues(ast: any, file: string): string[] {
    const issues: string[] = [];
    let hasAxiosCall = false; // Track whether any axios call was found in this file

    /**
     * Traverse the AST and look for axios calls like:
     * - axios.get(...)
     * - axios.post(..., { timeout: 5000 })
     * - axios({ method: 'get', timeout: 5000 })
     */
    walkSimple(ast, {
        CallExpression(node) {
            if (
                node.callee.type === 'MemberExpression' &&
                node.callee.object.type === 'Identifier' &&
                node.callee.object.name === 'axios'
            ) {
                hasAxiosCall = true; // At least one axios call was detected

                let hasTimeout = false;

                /**
                 * Step 1: Check all arguments passed to axios.
                 * Axios config can appear as the second argument or as a full object in axios({...}).
                 */
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
                            break; // No need to check further once found
                        }
                    }
                }

                /**
                 * Step 2: If no timeout setting was found in this axios call, report it.
                 * Unbounded requests can lead to performance degradation and blocked threads.
                 */
                if (!hasTimeout) {
                    issues.push(`${file} - No timeout configuration in axios API calls.`);
                }
            }
        }
    });

    /**
     * Only return results if axios was used in the file.
     * If no axios call exists, there's nothing to report about timeout.
     */
    return hasAxiosCall ? issues : [];
}
