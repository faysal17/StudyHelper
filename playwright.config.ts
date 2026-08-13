import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import dotenv from 'dotenv';

// Load the same env vars the app itself reads (Supabase URL/key, R2 public
// URL, and TEST_USER_EMAIL/PASSWORD for logging in during smoke tests).
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Run against a production build, not `next dev`: dev-mode Fast Refresh
  // repeatedly remounts components, which fires the app's several
  // independent per-component auth.getUser()/getSession() calls (Navbar,
  // each page) concurrently on every hot-reload. That occasionally races
  // Supabase's rotating refresh token and throws spurious 400s that have
  // nothing to do with the app's actual correctness.
  webServer: {
    command: 'npm run build && npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
