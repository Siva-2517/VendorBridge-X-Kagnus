import { defineConfig } from 'vitest/config';
import dns from 'dns';

// Ensure IPv4 resolution priority for Neon AWS pooler connectivity on Windows
dns.setDefaultResultOrder('ipv4first');

export default defineConfig({
  test: {
    testTimeout: 25000,
    hookTimeout: 25000,
  },
});
