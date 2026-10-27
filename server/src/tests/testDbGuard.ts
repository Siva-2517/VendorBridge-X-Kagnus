/**
 * Fail-Closed Database Protection Guard for Integration Tests
 * Re-exports core guard logic from src/db/dbGuard
 */
export {
  DatabaseValidationResult,
  validateTestDatabaseUrl,
  assertSafeTestDatabase,
  isSafeTestDatabaseConfigured,
  resolveDatabaseUrl,
  configureTestDatabaseEnv,
} from '../db/dbGuard';
