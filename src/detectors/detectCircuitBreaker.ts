//traverse AST
import { simple as walkSimple } from 'acorn-walk';
import { ancestor as walkAncestor } from "acorn-walk";
// ESTree defines standardized AST node types for JavaScript
import * as estree from "estree";


export function detectCircuitBreakerIssues(ast: any, file: string): string[] {
    const issues: string[] = [];

    // A set to track variables that are assigned a new CircuitBreaker instance
    let breakerVariables: Set<string> = new Set();

    walkAncestor(ast, {
        NewExpression(node, state, ancestors) {
            // Look for `new CircuitBreaker(...)`
            if (node.callee.type === "Identifier" && node.callee.name === "CircuitBreaker") {

                // Traverse ancestor nodes to find the associated variable name
                for (let i = ancestors.length - 1; i >= 0; i--) {
                    const ancestor = ancestors[i] as estree.Node;

                    // Capture the variable name used in the declaration
                    if (ancestor.type === "VariableDeclarator" && ancestor.id.type === "Identifier") {
                        breakerVariables.add(ancestor.id.name);
                        break;
                    }
                }
            }
        }
    });

     //ensures that the CircuitBreaker is not just created, but also used to wrap a potentially unstable function call via `.fire()`.

    let foundCircuitBreaker = false;

    walkSimple(ast, {
        CallExpression(node) {
            // Match patterns like `breaker.fire(...)`
            if (
                node.callee.type === "MemberExpression" &&
                node.callee.object.type === "Identifier" &&
                breakerVariables.has(node.callee.object.name) && // Must be one of the CircuitBreaker instances
                node.callee.property.type === "Identifier" &&
                node.callee.property.name === "fire"
            ) {
                foundCircuitBreaker = true;
            }
        }
    });

    //Phase 3: If `.fire()` is never called on any CircuitBreaker instance, there is an issue
    if (!foundCircuitBreaker) {
        issues.push(`${file} - Missing circuit breaker logic.`);
    }

    return issues;
}
