import * as assert from 'assert';
import * as acorn from 'acorn';

// Detection imports
import { detectRetryIssues } from '../src/detectors/detectRetry';
import { detectTimeoutIssues } from '../src/detectors/detectTimeout';
import { detectSecureHeadersIssues } from '../src/detectors/detectSecureHeaders';
import { detectCircuitBreakerIssues } from '../src/detectors/detectCircuitBreaker';
import { detectHealthCheckIssues } from '../src/detectors/detectHealthCheck';
import { detectDependencyIssues } from '../src/detectors/detectDependency';
import { detectLoggingIssues } from '../src/detectors/detectLogging';
import { detectRateLimitingIssues } from '../src/detectors/detectRateLimiting';
import { detectInputValidationIssues } from '../src/detectors/detectInputValidation';

function parse(code: string): any {
	return acorn.parse(code, { ecmaVersion: 2020, sourceType: 'module' });
}

describe('HealOps Detector Tests (Full Coverage)', () => {
	it('detectRetryIssues passes when retry logic is present', () => {
		const code = `try { axios.get('/api'); } catch (e) { retry(); }`;
		const issues = detectRetryIssues(parse(code), 'file.ts');
		assert.strictEqual(issues.length, 0);
	});

	it('detectTimeoutIssues passes when timeout is set', () => {
		const code = `axios.get('/api', { timeout: 1000 });`;
		const issues = detectTimeoutIssues(parse(code), 'file.ts');
		assert.strictEqual(issues.length, 0);
	});

	it('detectSecureHeadersIssues passes when helmet is used', () => {
		const code = `const helmet = require('helmet'); app.use(helmet());`;
		const issues = detectSecureHeadersIssues(parse(code), 'file.ts');
		assert.strictEqual(issues.length, 0);
	});

	it('detectCircuitBreakerIssues passes when circuitBreaker keyword is used', () => {
		const code = `function f() { circuitBreaker(); }`;
		const issues = detectCircuitBreakerIssues(parse(code), 'file.ts');
		assert.strictEqual(issues.length, 0);
	});

	it('detectHealthCheckIssues passes when /health endpoint exists', () => {
		const code = `app.get('/health', (req, res) => res.send('OK'));`;
		const issues = detectHealthCheckIssues(parse(code), 'file.ts');
		assert.strictEqual(issues.length, 0);
	});

	it('detectDependencyIssues passes when using injected dependencies', () => {
		const code = `const logger = container.resolve('Logger');`;
		const issues = detectDependencyIssues(parse(code), 'file.ts');
		assert.strictEqual(issues.length, 0);
	});

	it('detectLoggingIssues passes when console logging is used in catch', () => {
		const code = `try { x(); } catch (e) { console.error(e); }`;
		const issues = detectLoggingIssues(parse(code), 'file.ts');
		assert.strictEqual(issues.length, 0);
	});

	it('detectRateLimitingIssues passes when express-rate-limit is used', () => {
		const code = `const rl = require('express-rate-limit'); app.use(rl());`;
		const issues = detectRateLimitingIssues(parse(code), 'file.ts');
		assert.strictEqual(issues.length, 0);
	});

	it('detectInputValidationIssues passes when validate middleware is used', () => {
		const code = `app.post('/user', validate, handler);`;
		const issues = detectInputValidationIssues(parse(code), 'file.ts');
		assert.strictEqual(issues.length, 0);
	});
});
