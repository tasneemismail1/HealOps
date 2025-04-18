//Identifies the type of issue based on the issue description text.

export function detectIssueType(issueText: string): string | null {
    // Normalize text: lowercase and replace dashes/underscores with spaces for consistent matching
    const lower = issueText.toLowerCase().replace(/[-_]/g, ' ');

    // Sequential keyword checks to determine issue category
    if (lower.includes('retry')) {return 'retry';}
    if (lower.includes('circuit breaker')) {return 'circuitBreaker';}
    if (lower.includes('health check')) {return 'healthCheck';}
    if (lower.includes('timeout')) {return 'timeout';}
    if (lower.includes('dependency')) {return 'dependency';}
    if (lower.includes('logging')) {return 'logging';}
    if (lower.includes('rate limit')) {return 'rateLimiting';}
    if (lower.includes('secure header')) {return 'secureHeaders';}
    if (lower.includes('input validation')) {return 'inputValidation';}

    // Return null if no match is found
    return null;
}
