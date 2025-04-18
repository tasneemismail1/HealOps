import { ancestor as walkAncestor } from "acorn-walk";

//Detects hardcoded dependencies inside classes or functions by inspecting 'new' expressions.
export function detectDependencyIssues(ast: any, file: string): string[] {
    const issues: string[] = [];

    walkAncestor(ast, {
        NewExpression(node: any, ancestors: any[]) {
            //focused on direct class constructors like `new Service()`, not computed or dynamic
            if (node.callee.type === 'Identifier') {

                //Check if `new` statement is declared within the scope of a class or function (declaration, expression, arrow).
                const insideClassOrFunction = ancestors.some(
                    (ancestor) =>
                        ancestor.type === "ClassDeclaration" ||
                        ancestor.type === "FunctionDeclaration" ||
                        ancestor.type === "FunctionExpression" ||
                        ancestor.type === "ArrowFunctionExpression"
                );

                // If a hardcoded dependency is detected
                if (insideClassOrFunction) {
                    issues.push(`${file} - Hardcoded dependency detected: ${node.callee.name}. Consider using dependency injection.`);
                }
            }
        }
    });

    return issues;
}
