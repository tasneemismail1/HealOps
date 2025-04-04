// Import the "ancestor" walker to analyze a node along with its hierarchical context in the AST
import { ancestor as walkAncestor } from "acorn-walk";

/**
 * Detects hardcoded dependencies inside classes or functions by inspecting 'new' expressions.
 * This check is useful for identifying violations of dependency injection principles.
 * 
 * @param ast - Parsed Abstract Syntax Tree (AST) of the code
 * @param file - The filename for tagging the detected issue
 * @returns string[] - List of identified dependency issues with descriptions
 */
export function detectDependencyIssues(ast: any, file: string): string[] {
    const issues: string[] = [];

    /**
     * Traverse the AST to find instances of 'new ClassName()'.
     * Using 'ancestor' traversal allows us to access parent nodes and understand context,
     * such as whether the instantiation is happening inside a class or function.
     */
    walkAncestor(ast, {
        NewExpression(node: any, ancestors: any[]) {
            // We're only interested in direct class constructors like `new Service()`, not computed or dynamic
            if (node.callee.type === 'Identifier') {

                /**
                 * Check if this `new` statement is declared within the scope of a class
                 * or any kind of function (declaration, expression, arrow).
                 * If so, it's likely a tightly-coupled dependency that violates clean architecture.
                 */
                const insideClassOrFunction = ancestors.some(
                    (ancestor) =>
                        ancestor.type === "ClassDeclaration" ||
                        ancestor.type === "FunctionDeclaration" ||
                        ancestor.type === "FunctionExpression" ||
                        ancestor.type === "ArrowFunctionExpression"
                );

                // If a hardcoded dependency is detected, report it with context
                if (insideClassOrFunction) {
                    issues.push(`${file} - Hardcoded dependency detected: ${node.callee.name}. Consider using dependency injection.`);
                }
            }
        }
    });

    return issues;
}
