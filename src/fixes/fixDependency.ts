// VS Code API modules to manipulate workspace and documents
import * as vscode from 'vscode';
import * as path from 'path';

// Acorn for JavaScript parsing into AST
import * as acorn from 'acorn';
import { ancestor as walkAncestor } from "acorn-walk";

// Code generator to convert modified AST back to code
import * as escodegen from "escodegen";

// Utilities for parsing AST with comment support
import { modifyAstAndGenerateCode, parseAst } from '../utils/astUtils';

/**
 * Applies a fix to replace hardcoded dependency instantiation (`new ClassName()`)
 * with proper constructor or function parameter injection.
 * 
 * This fix promotes clean architecture and makes the code more testable and modular.
 */
export async function applyFixDependencyIssue(issue: string) {
    console.log(issue); // Log issue details for debugging

    // Extract the file name from the issue description
    const file = issue.split(" - ")[0].trim();
    const fileName = path.basename(file);

    // Ensure VS Code workspace is open
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) return null;

    // Build full file path to access and modify it
    const directory = workspaceFolders[0].uri.fsPath;
    const filePath = path.join(directory, fileName);

    try {
        // Load the file contents
        const document = await vscode.workspace.openTextDocument(filePath);
        const text = document.getText();

        // Parse into AST for structural modification
        const ast = acorn.parse(text, { ecmaVersion: 'latest', sourceType: 'module' });

        // Apply the dependency injection transformation
        const fixedCode = fixDependencyIssues(ast, filePath);

        // If no code was changed, show a notice
        if (fixedCode.length === 0) {
            vscode.window.showInformationMessage(`No changes needed in ${filePath}.`);
            return;
        }

        // Replace original code with the modified version
        const edit = new vscode.WorkspaceEdit();
        const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(text.length));
        edit.replace(document.uri, fullRange, fixedCode);

        await vscode.workspace.applyEdit(edit);
        vscode.window.showInformationMessage(`✅ Dependency injection applied in ${filePath}.`);
    } catch (error) {
        vscode.window.showErrorMessage(`❌ Error fixing Dependency injection issue: ${error}`);
    }
}

/**
 * Transforms hardcoded `new ClassName()` dependencies into constructor or function parameters
 * to follow the dependency injection principle.
 * 
 * Supports both class and function scopes.
 */
function fixDependencyIssues(ast: any, file: string): string {
    let codeModified = false;

    walkAncestor(ast, {
        NewExpression(node: any, state: any, ancestors: any[]) {
            if (node.callee.type === 'Identifier') {
                const className = node.callee.name;
                const paramName = `inject${className}`;

                // Detect enclosing class declaration
                const parentClassNode = ancestors.find(a => a.type === 'ClassDeclaration');

                // Detect enclosing function
                const parentFunctionNode = ancestors.find(a =>
                    a.type === 'FunctionDeclaration' ||
                    a.type === 'FunctionExpression' ||
                    a.type === 'ArrowFunctionExpression'
                );

                if (parentClassNode) {
                    // Case 1: Class-scoped injection

                    // Find or create the constructor
                    let constructorNode = parentClassNode.body.body.find(
                        (method: any) => method.kind === 'constructor'
                    );

                    if (!constructorNode) {
                        constructorNode = {
                            type: 'MethodDefinition',
                            kind: 'constructor',
                            key: { type: 'Identifier', name: 'constructor' },
                            value: {
                                type: 'FunctionExpression',
                                params: [],
                                body: { type: 'BlockStatement', body: [] }
                            },
                        };
                        parentClassNode.body.body.unshift(constructorNode);
                    }

                    // Inject dependency as constructor parameter if missing
                    if (!constructorNode.value.params.some((p: any) => p.name === paramName)) {
                        constructorNode.value.params.unshift({ type: 'Identifier', name: paramName });
                    }

                    // Replace `new ClassName()` with injected parameter
                    const assignmentNode = ancestors.find(a => a.type === 'AssignmentExpression');
                    const originalCode = escodegen.generate(node);
                    if (assignmentNode && assignmentNode.right === node) {
                        assignmentNode.right = { type: 'Identifier', name: paramName };
                        assignmentNode.leadingComments ??= [];
                        assignmentNode.leadingComments.push({
                            type: 'Line',
                            value: ` original: ${originalCode}`
                        });
                    }

                    codeModified = true;

                } else if (parentFunctionNode) {
                    // Case 2: Function-level injection

                    // Inject as function parameter if missing
                    if (!parentFunctionNode.params.some((p: any) => p.name === paramName)) {
                        parentFunctionNode.params.unshift({ type: 'Identifier', name: paramName });
                    }

                    // Replace `new ClassName()` with injected parameter
                    const assignmentNode = ancestors.find(a => a.type === 'AssignmentExpression');
                    const originalCode = escodegen.generate(node);
                    if (assignmentNode && assignmentNode.right === node) {
                        assignmentNode.right = { type: 'Identifier', name: paramName };
                        assignmentNode.leadingComments ??= [];
                        assignmentNode.leadingComments.push({
                            type: 'Line',
                            value: ` original: ${originalCode}`
                        });
                    }

                    codeModified = true;
                }
            }
        },
    });

    // Generate updated code if modifications were made
    return codeModified ? escodegen.generate(ast, { comment: true }) : "";
}

/**
 * Wrapper function to apply dependency injection fix from any file path.
 * Useful for testing or command-based use.
 */
export async function applyFix(filePath: string): Promise<string> {
    const document = await vscode.workspace.openTextDocument(filePath);
    const text = document.getText();

    const fixedCode = fixDependencyIssues
        ? fixDependencyIssues(parseAst(text), filePath)
        : text;

    return fixedCode || text;
}
