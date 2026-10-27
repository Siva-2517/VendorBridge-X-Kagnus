import { configureTestDatabaseEnv } from './testDbGuard';

// Configure test database environment safely before any module loads
configureTestDatabaseEnv();
