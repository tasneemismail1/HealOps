import { simple as walkSimple } from 'acorn-walk';

// export function detectSecureHeadersIssues(ast: any, file: string): string[] {
//     const issues: string[] = [];
//     let foundHelmet = false;
//     walkSimple(ast, {
//         CallExpression(node) {
//             if (node.callee.type === 'Identifier' && node.callee.name === 'helmet') {
//                 foundHelmet = true;
//             }
//         }
//     });
//     if (!foundHelmet) {
//         issues.push(`${file} - Secure headers middleware (helmet) is missing.`);
//     }
//     return issues;
// }

export function detectSecureHeadersIssues(ast: any, file: string): string[] {
    const issues: string[] = [];
    let foundHelmetImport = false;
    let foundHelmetUsage = false;

    walkSimple(ast, {
        // Detect if helmet is imported or required
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
        ImportDeclaration(node) {
            if (node.source.value === 'helmet') {
                foundHelmetImport = true;
            }
        },

        // Detect if `app.use(helmet())` is present
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

    if (!foundHelmetImport || !foundHelmetUsage) {
        issues.push(`${file} - Secure headers middleware (helmet) is missing.`);
    }

    return issues;
}
