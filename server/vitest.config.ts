import { defineConfig } from 'vitest/config';
import dns from 'dns';

// Ensure IPv4 resolution priority for Neon AWS pooler connectivity on Windows
dns.setDefaultResultOrder('ipv4first');

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    exclude: ['dist/**', 'node_modules/**'],
    setupFiles: ['./src/tests/setupEnv.ts'],
    fileParallelism: false,
    testTimeout: 45000,
    hookTimeout: 45000,
  },
});
