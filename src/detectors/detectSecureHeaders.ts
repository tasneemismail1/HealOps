// Import the simple walker from acorn-walk to traverse AST nodes
import { simple as walkSimple } from 'acorn-walk';

/**
 * Detects whether the Helmet middleware is properly imported and used.
 * Helmet helps secure Express apps by setting HTTP headers appropriately.
 * Its presence is considered a best practice for Node.js application security.
 * 
 * @param ast - The Abstract Syntax Tree representing the code file
 * @param file - The file name for which this analysis is performed
 * @returns string[] - List of issues indicating missing Helmet usage
 */
export function detectSecureHeadersIssues(ast: any, file: string): string[] {
    const issues: string[] = [];
    let foundHelmetImport = false;  // Tracks if `helmet` is imported via require or ES6 import
    let foundHelmetUsage = false;   // Tracks if `helmet()` is actually applied via app.use()

    walkSimple(ast, {
        /**
         * Step 1: Check for `const helmet = require('helmet')`
         * This is common in CommonJS-style Express projects.
         */
        VariableDeclaration(node) {
            node.declarations.forEach(declaration => {
                if (
                    declaration.init &&
                    declaration.init.type === 'CallExpression' &&
                    declaration.init.callee &&
                    declaration.init.callee.type === 'Identifier' &&
                    declaration.init.callee.name === 'require' &&
                    declaration.init.arguments.length > 0 &&
                    declaration.init.arguments[0].type === 'Literal' &&
                    declaration.init.arguments[0].value === 'helmet'
                ) {
                    foundHelmetImport = true;
                }
            });
        },

        /**
         * Step 2: Check for `import helmet from 'helmet'`
         * This is common in ESModule-style Express projects.
         */
        ImportDeclaration(node) {
            if (node.source.value === 'helmet') {
                foundHelmetImport = true;
            }
        },

        /**
         * Step 3: Check for the actual middleware usage:
         * `app.use(helmet())`
         * This is essential to confirm the imported Helmet middleware is actually applied.
         */
        CallExpression(node) {
            if (
                node.callee.type === 'MemberExpression' &&
                node.callee.object.type === 'Identifier' &&
                node.callee.property.type === 'Identifier' &&
                node.callee.property.name === 'use' &&
                node.arguments.length > 0 &&
                node.arguments[0].type === 'CallExpression' &&
                node.arguments[0].callee.type === 'Identifier' &&
                node.arguments[0].callee.name === 'helmet'
            ) {
                foundHelmetUsage = true;
            }
        }
    });

    /**
     * Final Check: If either the import or usage is missing, flag a security issue.
     * Simply importing Helmet without applying it doesn't provide protection.
     */
    if (!foundHelmetImport || !foundHelmetUsage) {
        issues.push(`${file} - Secure headers middleware (helmet) is missing.`);
    }

    return issues;
}
