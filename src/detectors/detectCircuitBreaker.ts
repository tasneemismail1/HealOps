// Acorn-walk allows us to traverse the Abstract Syntax Tree (AST) easily
import { simple as walkSimple } from 'acorn-walk';
import { ancestor as walkAncestor } from "acorn-walk";
// ESTree defines standardized AST node types for JavaScript
import * as estree from "estree";

/**
 * Detects whether Circuit Breaker logic is missing in a given JS/TS file.
 * The logic involves checking if any instance of CircuitBreaker is created
 * and whether the `.fire()` method is properly invoked.
 *
 * @param ast - The parsed AST of a JS/TS file
 * @param file - The file name for referencing the issue
 * @returns string[] - List of issues detected
 */
export function detectCircuitBreakerIssues(ast: any, file: string): string[] {
    const issues: string[] = [];

    // A set to track variables that are assigned a new CircuitBreaker instance
    let breakerVariables: Set<string> = new Set();

    /**
     * Phase 1: Identify where CircuitBreaker is instantiated
     * 
     * We walk through ancestor nodes to capture not only the `new CircuitBreaker()` calls,
     * but also the variable names to which these instances are assigned.
     */
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

    /**
     * Phase 2: Check if any of the CircuitBreaker variables call `.fire()`
     * 
     * This step ensures that the CircuitBreaker is not just created,
     * but also used to wrap a potentially unstable function call via `.fire()`.
     */
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

    /**
     * Phase 3: If `.fire()` is never called on any CircuitBreaker instance,
     * report the issue so the developer knows their resilience pattern is incomplete.
     */
    if (!foundCircuitBreaker) {
        issues.push(`${file} - Missing circuit breaker logic.`);
    }

    return issues;
}
