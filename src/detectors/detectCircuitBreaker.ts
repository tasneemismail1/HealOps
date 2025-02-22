import { simple as walkSimple } from 'acorn-walk';
import { ancestor as walkAncestor } from "acorn-walk";
import * as estree from "estree";

export function detectCircuitBreakerIssues(ast: any, file: string): string[] {
    const issues: string[] = [];
    let breakerVariables: Set<string> = new Set(); // Stores CircuitBreaker variables

    // Step 1: Detect CircuitBreaker instances
    walkAncestor(ast, {
        NewExpression(node, state, ancestors) {
            if (node.callee.type === "Identifier" && node.callee.name === "CircuitBreaker") {
                // Find variable name storing the breaker instance
                for (let i = ancestors.length - 1; i >= 0; i--) {
                    const ancestor = ancestors[i] as estree.Node;
                    if (ancestor.type === "VariableDeclarator" && ancestor.id.type === "Identifier") {
                        breakerVariables.add(ancestor.id.name);
                        break;
                    }
                }
            }
        }
    });

    // Step 2: Ensure `.fire()` is called on a CircuitBreaker variable
    let foundCircuitBreaker = false;
    walkSimple(ast, {
        CallExpression(node) {
            if (
                node.callee.type === "MemberExpression" &&
                node.callee.object.type === "Identifier" &&
                breakerVariables.has(node.callee.object.name) &&
                node.callee.property.type === "Identifier" &&
                node.callee.property.name === "fire"
            ) {
                foundCircuitBreaker = true;
            }
        }
    });

    // Step 3: Report issue if no CircuitBreaker usage is found
    if (!foundCircuitBreaker) {
        issues.push(`${file} - Missing circuit breaker logic.`);
    }

    return issues;
}
