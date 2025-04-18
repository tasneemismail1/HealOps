import * as acorn from 'acorn';
import * as escodegen from 'escodegen';
import { simple as walkSimple } from 'acorn-walk';

//Parses JavaScript/TypeScript code into an AST.
export function parseAst(code: string) {
    return acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'module' });
}

//Modifies the AST and regenerates the modified code.
//modifier A function that modifies nodes and returns true if a modification was made.
export function modifyAstAndGenerateCode(ast: any, modifier: (node: any) => boolean): string {
    let modified = false; 

    walkSimple(ast, {
        CallExpression(node) {
            if (modifier(node)) {
                modified = true;
            }
        }
    });

    return modified ? escodegen.generate(ast) : '';
}
