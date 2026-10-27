/**
 * Fail-Closed Database Protection Guard
 *
 * Ensures that mutating tests NEVER connect to or mutate
 * the production/live Neon PostgreSQL database.
 * An isolated test database must be explicitly provided via TEST_DATABASE_URL.
 */

export interface DatabaseValidationResult {
  valid: boolean;
  reason?: string;
  normalizedTestUrl?: string;
}

let initialProductionDatabaseUrl = process.env.DATABASE_URL || '';

export function validateTestDatabaseUrl(
  testDbUrl: string | undefined,
  mainDbUrl?: string
): DatabaseValidationResult {
  const prodDbUrl = mainDbUrl !== undefined ? mainDbUrl : (initialProductionDatabaseUrl || process.env.DATABASE_URL || '');

  // 1. Missing URL check
  if (!testDbUrl || typeof testDbUrl !== 'string' || testDbUrl.trim() === '') {
    return {
      valid: false,
      reason: 'TEST_DATABASE_URL is missing or empty. An isolated test database must be explicitly configured.',
    };
  }

  const trimmed = testDbUrl.trim();

  // 2. Syntax & protocol parsing
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(trimmed);
  } catch {
    return {
      valid: false,
      reason: 'TEST_DATABASE_URL is malformed or not a valid URI.',
    };
  }

  if (parsedUrl.protocol !== 'postgresql:' && parsedUrl.protocol !== 'postgres:') {
    return {
      valid: false,
      reason: `TEST_DATABASE_URL protocol must be postgresql: or postgres:, got ${parsedUrl.protocol}`,
    };
  }

  // 3. Reject ALL Neon-hosted database endpoints
  const hostname = parsedUrl.hostname.toLowerCase();
  if (
    hostname.includes('neon.tech') ||
    trimmed.toLowerCase().includes('.neon.tech') ||
    trimmed.toLowerCase().includes('aws.neon.tech')
  ) {
    return {
      valid: false,
      reason: 'FAIL-CLOSED: All Neon cloud database endpoints are prohibited as test databases.',
    };
  }

  // 4. Reject if identical to or pointing to main/production DATABASE_URL
  if (prodDbUrl && typeof prodDbUrl === 'string' && prodDbUrl.trim() !== '') {
    // Ignore if prodDbUrl is already redirected to blocked_test_sink
    if (!prodDbUrl.includes('blocked_test_sink')) {
      try {
        const parsedMain = new URL(prodDbUrl.trim());
        if (
          parsedUrl.hostname.toLowerCase() === parsedMain.hostname.toLowerCase() &&
          parsedUrl.port === parsedMain.port &&
          parsedUrl.pathname.toLowerCase() === parsedMain.pathname.toLowerCase()
        ) {
          return {
            valid: false,
            reason: 'FAIL-CLOSED: TEST_DATABASE_URL matches production DATABASE_URL host and database.',
          };
        }
      } catch {
        if (trimmed === prodDbUrl.trim()) {
          return {
            valid: false,
            reason: 'FAIL-CLOSED: TEST_DATABASE_URL is identical to DATABASE_URL.',
          };
        }
      }
    }
  }

  return {
    valid: true,
    normalizedTestUrl: trimmed,
  };
}

export function assertSafeTestDatabase(): void {
  const result = validateTestDatabaseUrl(process.env.TEST_DATABASE_URL, initialProductionDatabaseUrl);
  if (!result.valid) {
    throw new Error(`FAIL-CLOSED GUARD: ${result.reason}`);
  }
}

export function isSafeTestDatabaseConfigured(): boolean {
  return validateTestDatabaseUrl(process.env.TEST_DATABASE_URL, initialProductionDatabaseUrl).valid;
}

export function resolveDatabaseUrl(): string | undefined {
  if (process.env.NODE_ENV === 'test') {
    if (isSafeTestDatabaseConfigured() && process.env.TEST_DATABASE_URL) {
      return process.env.TEST_DATABASE_URL.trim();
    }
    // Fail-closed sink: tests must never connect to live Neon
    return 'postgresql://guard:blocked@127.0.0.1:5432/blocked_test_sink?sslmode=disable';
  }
  return process.env.DATABASE_URL;
}

export function configureTestDatabaseEnv(): void {
  if (process.env.NODE_ENV !== 'test') {
    return;
  }

  if (!initialProductionDatabaseUrl && process.env.DATABASE_URL) {
    initialProductionDatabaseUrl = process.env.DATABASE_URL;
  }

  const result = validateTestDatabaseUrl(process.env.TEST_DATABASE_URL, initialProductionDatabaseUrl);
  if (result.valid && result.normalizedTestUrl) {
    process.env.DATABASE_URL = result.normalizedTestUrl;
  } else {
    // Fail-closed sink: tests must never connect to live Neon
    process.env.DATABASE_URL = 'postgresql://guard:blocked@127.0.0.1:5432/blocked_test_sink?sslmode=disable';
  }
}
