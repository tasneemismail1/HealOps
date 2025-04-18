// Import all fix modules responsible for resolving specific issue types
import * as fixRetry from './fixRetry';
import * as fixTimeout from './fixTimeout';
import * as fixSecureHeaders from './fixSecureHeaders';
import * as fixLogging from './fixLogging';
import * as fixInputValidation from './fixInputValidation';
import * as fixRateLimiting from './fixRateLimiting';
import * as fixCircuitBreaker from './fixCircuitBreaker';
import * as fixHealthCheck from './fixHealthCheck';
import * as fixDependency from './fixDependency';

//fixMap is a centralized mapping between issue types (as strings) and their corresponding fix modules.

const fixMap: { [key: string]: { applyFix: (filePath: string) => Promise<string> } } = {
  retry: fixRetry,
  timeout: fixTimeout,
  secureHeaders: fixSecureHeaders,
  logging: fixLogging,
  inputValidation: fixInputValidation,
  rateLimiting: fixRateLimiting,
  circuitBreaker: fixCircuitBreaker,
  healthCheck: fixHealthCheck,
  dependency: fixDependency,
};

//Retrieves the appropriate fix module based on the issue type.
//Throws an error if the issue type is not registered in the fixMap.

export function getFixModule(issueType: string) {
  const fix = fixMap[issueType];
  if (!fix) {
    throw new Error(`Unknown issue type: ${issueType}`);
  }
  return fix;
}
