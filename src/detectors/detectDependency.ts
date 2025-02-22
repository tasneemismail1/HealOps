import { ancestor as walkAncestor } from "acorn-walk";

export function detectDependencyIssues(ast: any, file: string): string[] {
    const issues: string[] = [];
    walkAncestor(ast, {
        NewExpression(node: any, ancestors: any[]) {
            if (node.callee.type === 'Identifier') {
                // Check if the `new` expression is inside a class or function
                const insideClassOrFunction = ancestors.some(
                    (ancestor) =>
                        ancestor.type === "ClassDeclaration" ||
                        ancestor.type === "FunctionDeclaration" ||
                        ancestor.type === "FunctionExpression" ||
                        ancestor.type === "ArrowFunctionExpression"
                );
                if (insideClassOrFunction) {
                    issues.push(`${file} - Hardcoded dependency detected: ${node.callee.name}. Consider using dependency injection.`);
                }
            }
        }
    });
    return issues;
}