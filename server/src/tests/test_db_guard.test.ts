import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  validateTestDatabaseUrl,
  isSafeTestDatabaseConfigured,
  resolveDatabaseUrl,
} from '../db/dbGuard';

describe('Database Safety Guard Fail-Closed Unit Tests (Non-Mutating)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('1. should fail closed when TEST_DATABASE_URL is missing or empty', () => {
    expect(validateTestDatabaseUrl(undefined).valid).toBe(false);
    expect(validateTestDatabaseUrl('').valid).toBe(false);
    expect(validateTestDatabaseUrl('   ').valid).toBe(false);

    process.env.TEST_DATABASE_URL = '';
    expect(isSafeTestDatabaseConfigured()).toBe(false);
  });

  it('2. should fail closed when TEST_DATABASE_URL is malformed or not a valid postgres URI', () => {
    const malformed1 = validateTestDatabaseUrl('not-a-valid-url');
    expect(malformed1.valid).toBe(false);
    expect(malformed1.reason).toContain('malformed');

    const invalidProto = validateTestDatabaseUrl('http://localhost:5432/testdb');
    expect(invalidProto.valid).toBe(false);
    expect(invalidProto.reason).toContain('protocol must be postgresql: or postgres:');

    const mysqlProto = validateTestDatabaseUrl('mysql://localhost:3306/testdb');
    expect(mysqlProto.valid).toBe(false);
  });

  it('3. should reject ANY Neon cloud database endpoint regardless of endpoint ID, branch, or query params', () => {
    const neonUrls = [
      'postgresql://neondb_owner:npg_secret123@ep-bold-sunset-a5abcd.us-east-2.aws.neon.tech/neondb?sslmode=require',
      'postgresql://user:pass@ep-other-branch-123.neon.tech/isolated_test?sslmode=require',
      'postgresql://user:pass@my-project.aws.neon.tech/test',
      'postgres://neondb_owner:secret@ep-custom.ap-southeast-1.aws.neon.tech/testdb',
    ];

    for (const url of neonUrls) {
      const res = validateTestDatabaseUrl(url, 'postgresql://other:pass@localhost:5432/main');
      expect(res.valid).toBe(false);
      expect(res.reason).toContain('All Neon cloud database endpoints are prohibited');
    }
  });

  it('4. should fail closed when TEST_DATABASE_URL matches production DATABASE_URL host and database', () => {
    const prodUrl = 'postgresql://app_user:strong_password@db.internal.corp:5432/vendorbridge_prod?sslmode=require';
    const sameUrlWithDifferentParams = 'postgresql://app_user:strong_password@db.internal.corp:5432/vendorbridge_prod?sslmode=verify-full&connect_timeout=10';

    const res = validateTestDatabaseUrl(sameUrlWithDifferentParams, prodUrl);
    expect(res.valid).toBe(false);
    expect(res.reason).toContain('matches production DATABASE_URL');
  });

  it('5. should validate successfully for a dedicated, isolated non-production PostgreSQL URL', () => {
    const validTestUrls = [
      'postgresql://testuser:testpass@localhost:5432/isolated_test_db',
      'postgresql://testuser:testpass@127.0.0.1:5433/vendorbridge_ci_test?sslmode=disable',
      'postgres://postgres:postgres@ci-postgres-container:5432/test_erp',
    ];

    const prodUrl = 'postgresql://neondb_owner:pass@ep-placeholder.us-east-2.aws.neon.tech/neondb?sslmode=require';

    for (const testUrl of validTestUrls) {
      const res = validateTestDatabaseUrl(testUrl, prodUrl);
      expect(res.valid).toBe(true);
      expect(res.normalizedTestUrl).toBe(testUrl);
    }
  });

  it('6. should redirect resolveDatabaseUrl in test mode to safe local sink when TEST_DATABASE_URL is not configured', () => {
    process.env.NODE_ENV = 'test';
    delete process.env.TEST_DATABASE_URL;
    process.env.DATABASE_URL = 'postgresql://neondb_owner:pass@ep-placeholder.us-east-2.aws.neon.tech/neondb?sslmode=require';

    const resolved = resolveDatabaseUrl();
    expect(resolved).toContain('127.0.0.1:5432/blocked_test_sink');
    expect(resolved).not.toContain('neon.tech');
  });

  it('7. should resolve to TEST_DATABASE_URL in test mode when a valid isolated test database is provided', () => {
    process.env.NODE_ENV = 'test';
    const isolatedUrl = 'postgresql://testrunner:secret@localhost:5432/isolated_test_suite';
    process.env.TEST_DATABASE_URL = isolatedUrl;
    process.env.DATABASE_URL = 'postgresql://neondb_owner:pass@ep-placeholder.us-east-2.aws.neon.tech/neondb?sslmode=require';

    const resolved = resolveDatabaseUrl();
    expect(resolved).toBe(isolatedUrl);
  });
});
