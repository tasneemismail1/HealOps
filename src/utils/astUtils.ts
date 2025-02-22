import * as acorn from 'acorn';
import * as escodegen from 'escodegen';
import { simple as walkSimple } from 'acorn-walk';

/**
 * Parses JavaScript/TypeScript code into an AST.
 * @param code The source code to parse.
 * @returns Parsed AST.
 */
export function parseAst(code: string) {
    return acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'module' });
}

/**
 * Modifies the AST and regenerates the modified code.
 * @param ast The parsed AST.
 * @param modifier A function that modifies nodes and returns true if a modification was made.
 * @returns The modified code if changes were made, otherwise an empty string.
 */
export function modifyAstAndGenerateCode(ast: any, modifier: (node: any) => boolean): string {
    let modified = false; // Track whether any modification was made

    walkSimple(ast, {
        CallExpression(node) {
            if (modifier(node)) {
                modified = true;
            }
        }
    });

    return modified ? escodegen.generate(ast) : ''; // Return modified code or empty string if unchanged
}
