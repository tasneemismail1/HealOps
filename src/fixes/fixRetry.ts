// VS Code API and required Node modules
import * as vscode from 'vscode';
import * as path from 'path';
import * as acorn from 'acorn';
import { ancestor as walkAncestor } from 'acorn-walk';
import * as escodegen from 'escodegen';
import { parseAst } from '../utils/astUtils';

/**
 * Fixes missing retry logic in the specified file based on a reported issue.
 * 
 * @param issue - The string in the format "filePath - Issue description"
 */
export async function applyFixRetryIssue(issue: string) {
    console.log("Fixing retry logic for:", issue);

    const filePath = issue.split(" - ")[0].trim();
    const fileUri = vscode.Uri.file(filePath);

    try {
        // Open the file and parse its content into AST
        const document = await vscode.workspace.openTextDocument(fileUri);
        const originalCode = document.getText();
        const ast = acorn.parse(originalCode, { ecmaVersion: 'latest', sourceType: 'module' });

        // Attempt to fix retry logic
        const fixedCode = fixRetryIssues(ast, filePath);

        // If no changes are made, notify the user
        if (fixedCode.length === 0 || fixedCode.trim() === originalCode.trim()) {
            vscode.window.showInformationMessage(`✅ No retry logic needed in ${filePath}.`);
            return;
        }

        // Apply the updated code in VS Code
        const edit = new vscode.WorkspaceEdit();
        const fullRange = new vscode.Range(
            document.positionAt(0),
            document.positionAt(originalCode.length)
        );
        edit.replace(document.uri, fullRange, fixedCode);

        await vscode.workspace.applyEdit(edit);
        await document.save();

        vscode.window.showInformationMessage(`✅ Retry logic applied in ${filePath}.`);
    } catch (error) {
        vscode.window.showErrorMessage(`❌ Error fixing retry issue: ${error}`);
    }
}

/**
 * Walks the AST and wraps eligible API calls (fetch/axios) with retry logic.
 * 
 * @param ast - Parsed JavaScript AST
 * @param file - Filename for logging/debugging
 * @returns Updated code string if modified, else an empty string
 */
function fixRetryIssues(ast: any, file: string): string {
    let codeModified = false;

    walkAncestor(ast, {
        CallExpression(node: any, ancestors: any[]) {
            if (!isApiCall(node.callee)) return;

            // Find the block where this call resides
            const block = ancestors.find(a => a.type === 'BlockStatement');
            const statement = ancestors.find(a =>
                ['ExpressionStatement', 'VariableDeclaration'].includes(a.type)
            );

            // Inject retry logic before this statement
            if (block?.body && statement) {
                const index = block.body.findIndex((n: any) => n === statement);
                if (index !== -1) {
                    injectRetryLogic(block.body, index, statement);
                    codeModified = true;
                }
            }
        }
    });

    return codeModified ? escodegen.generate(ast) : "";
}

/**
 * Determines whether the given callee is a retry-worthy API call (fetch/axios).
 */
function isApiCall(callee: any): boolean {
    const axiosMethods = ['get', 'post', 'put', 'delete', 'patch'];
    return (
        (callee?.type === 'Identifier' && callee.name === 'fetch') ||
        (callee?.type === 'MemberExpression' &&
            callee.object?.name === 'axios' &&
            axiosMethods.includes(callee.property?.name))
    );
}

/**
 * Inserts retry logic for an API call at a specific index in a code block.
 * The retry pattern uses a while-loop + try-catch with retry decrement.
 */
function injectRetryLogic(bodyArray: any[], index: number, statement: any) {
    const retryVariable = {
        type: 'VariableDeclaration',
        declarations: [{
            type: 'VariableDeclarator',
            id: { type: 'Identifier', name: 'retries' },
            init: { type: 'Literal', value: 3 }
        }],
        kind: 'let'
    };

    const retryLoop = {
        type: 'WhileStatement',
        test: {
            type: 'BinaryExpression',
            operator: '>',
            left: { type: 'Identifier', name: 'retries' },
            right: { type: 'Literal', value: 0 }
        },
        body: {
            type: 'BlockStatement',
            body: [
                {
                    type: 'TryStatement',
                    block: {
                        type: 'BlockStatement',
                        body: [
                            statement, // Original API call
                            { type: 'BreakStatement' } // Exit loop on success
                        ]
                    },
                    handler: {
                        type: 'CatchClause',
                        param: { type: 'Identifier', name: 'err' },
                        body: {
                            type: 'BlockStatement',
                            body: [
                                {
                                    type: 'ExpressionStatement',
                                    expression: {
                                        type: 'AssignmentExpression',
                                        operator: '-=',
                                        left: { type: 'Identifier', name: 'retries' },
                                        right: { type: 'Literal', value: 1 }
                                    }
                                },
                                {
                                    type: 'ExpressionStatement',
                                    expression: {
                                        type: 'CallExpression',
                                        callee: {
                                            type: 'MemberExpression',
                                            object: { type: 'Identifier', name: 'console' },
                                            property: { type: 'Identifier', name: 'log' }
                                        },
                                        arguments: [
                                            { type: 'Literal', value: 'Retrying API call...' },
                                            { type: 'Identifier', name: 'retries' }
                                        ]
                                    }
                                }
                            ]
                        }
                    }
                }
            ]
        }
    };

    // Replace the original API call with retry-enhanced logic
    bodyArray.splice(index, 0, retryVariable, retryLoop);
    bodyArray.splice(index + 2, 1); // Remove the unwrapped statement
}

/**
 * Dispatcher-compatible fix function to apply retry logic to a file path.
 */
export async function applyFix(filePath: string): Promise<string> {
    const document = await vscode.workspace.openTextDocument(filePath);
    const text = document.getText();
    const fixedCode = fixRetryIssues(parseAst(text), filePath);
    return fixedCode || text;
}
