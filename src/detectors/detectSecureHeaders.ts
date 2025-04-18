import { simple as walkSimple } from 'acorn-walk'; //traverse AST nodes

//Detects whether the Helmet middleware is properly imported and used.
//helps secure Express apps by setting HTTP headers appropriately.

export function detectSecureHeadersIssues(ast: any, file: string): string[] {
    const issues: string[] = [];
    let foundHelmetImport = false;  //if `helmet` is imported via require or ES6 import
    let foundHelmetUsage = false;   //f `helmet()` is actually applied via app.use()

    walkSimple(ast, {
        //Check for `const helmet = require('helmet')`
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

        //Check for `import helmet from 'helmet'`
        ImportDeclaration(node) {
            if (node.source.value === 'helmet') {
                foundHelmetImport = true;
            }
        },

        //Step 3: Check for the actual middleware usage: `app.use(helmet())`

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

    //Final Check: If either the import or usage is missing, flag a security issue.
    if (!foundHelmetImport || !foundHelmetUsage) {
        issues.push(`${file} - Secure headers middleware (helmet) is missing.`);
    }

    return issues;
}
