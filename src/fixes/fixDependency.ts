import * as vscode from 'vscode';
import * as path from 'path';
import * as acorn from 'acorn';
import { ancestor as walkAncestor } from "acorn-walk";
import * as escodegen from "escodegen";
import { modifyAstAndGenerateCode, parseAst } from '../utils/astUtils';


export function getFixedCodeDependency(originalCode: string): string {
    const ast = parseAst(originalCode);
  
    const modifiedCode = modifyAstAndGenerateCode(ast, (node: any) => {
      // TODO: Replace this condition with real logic for dependency
      return false;
    });
  
    return modifiedCode || originalCode;
  }
  

export async function applyFixDependencyIssue(issue: string) {
    // Log the issue being processed
    console.log(issue);

    // Extract the filename from the issue report (everything before " - ")
    const file = issue.split(" - ")[0].trim();
    console.log("File:", file);

    const fileName = path.basename(file);
    console.log("File name:", fileName);

    // Ensure a workspace is open
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        return null;
    }

    // Get the workspace directory
    const directory = workspaceFolders[0].uri.fsPath;
    console.log("Directory:", directory);

    // Construct the full file path
    const filePath = path.join(directory, fileName);
    console.log("File path:", filePath);

    try {
        // Open and read the file content
        const document = await vscode.workspace.openTextDocument(filePath);
        const text = document.getText();

        // Parse the file content into an AST (Abstract Syntax Tree) using Acorn
        const ast = acorn.parse(text, { ecmaVersion: 'latest', sourceType: 'module' });

        // Apply the dependency injection fix
        const fixedCode = fixDependencyIssues(ast, filePath);

        // If no modifications were made, inform the user
        if (fixedCode.length === 0) {
            vscode.window.showInformationMessage(`No changes needed in ${filePath}.`);
            return;
        }

        // Apply the fixed code to the document in VSCode
        const edit = new vscode.WorkspaceEdit();
        const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(text.length));
        edit.replace(document.uri, fullRange, fixedCode);

        await vscode.workspace.applyEdit(edit);
        vscode.window.showInformationMessage(`✅ Dependency injection applied in ${filePath}.`);
    } catch (error) {
        // Handle any errors that occur during the process
        vscode.window.showErrorMessage(`❌ Error fixing Dependency injection issue: ${error}`);
    }
}


function fixDependencyIssues(ast: any, file: string): string {
    let codeModified = false;

    walkAncestor(ast, {
        NewExpression(node: any, state: any, ancestors: any[]) {
            if (node.callee.type === 'Identifier') {
                const className = node.callee.name;
                const paramName = `inject${className}`;

                // Find the parent function/class where the `new` is used
                const parentClassNode = ancestors.find(ancestor => ancestor.type === 'ClassDeclaration');
                const parentFunctionNode = ancestors.find(ancestor => ancestor.type === 'FunctionDeclaration' || ancestor.type === 'FunctionExpression' || ancestor.type === 'ArrowFunctionExpression');

                if (parentClassNode) {
                    // Convert `this.db = new Database();` → Inject in constructor
                    let constructorNode = parentClassNode.body.body.find((method: any) => method.kind === 'constructor');

                    if (!constructorNode) {
                        // Create a constructor if it doesn't exist
                        constructorNode = {
                            type: 'MethodDefinition',
                            kind: 'constructor',
                            key: { type: 'Identifier', name: 'constructor' },
                            value: { type: 'FunctionExpression', params: [], body: { type: 'BlockStatement', body: [] }, },
                        };
                        parentClassNode.body.body.unshift(constructorNode);
                    }

                    // Ensure the constructor has a `params` array
                    if (!constructorNode.value.params) {
                        constructorNode.value.params = [];
                    }

                    // Ensure constructor takes the dependency as a parameter
                    if (!constructorNode.value.params.some((param: any) => param.type === 'Identifier' && param.name === paramName)) {
                        constructorNode.value.params.unshift({ type: 'Identifier', name: paramName, });
                    }

                    // Replace `new ClassName()` with the injected parameter
                    const assignmentNode = ancestors.find(ancestor => ancestor.type === 'AssignmentExpression');

                    if (assignmentNode && assignmentNode.right === node) {
                        assignmentNode.right = { type: 'Identifier', name: paramName };
                    }

                    codeModified = true;
                } else if (parentFunctionNode) {
                    // Handle function-level injection
                    if (!Array.isArray(parentFunctionNode.params)) {
                        parentFunctionNode.params = [];
                    }

                    if (!parentFunctionNode.params.some((param: any) => param.type === 'Identifier' && param.name === paramName)) {
                        parentFunctionNode.params.unshift({ type: 'Identifier', name: paramName, });
                    }

                    // Replace `new ClassName()` with the injected parameter
                    const assignmentNode = ancestors.find(ancestor => ancestor.type === 'AssignmentExpression');

                    if (assignmentNode && assignmentNode.right === node) {
                        assignmentNode.right = { type: 'Identifier', name: paramName, };
                    }

                    codeModified = true;
                }
            }
        },
    });

    return codeModified ? escodegen.generate(ast) : "";
}

export async function applyFix(filePath: string): Promise<string> {
    const document = await vscode.workspace.openTextDocument(filePath);
    const text = document.getText();

    // Modify this call to reuse your existing fix logic
    const fixedCode = fixDependencyIssues
        ? fixDependencyIssues(text, filePath)
        : text;

    return fixedCode || text;
}