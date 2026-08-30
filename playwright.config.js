// @ts-check
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:8080',
    trace: 'retain-on-failure'
  },
  webServer: {
    command: 'python3 -m http.server 8080',
    url: 'http://localhost:8080',
    reuseExistingServer: !process.env.CI
  },
  projects: [
    {
      name: 'chromium-portrait',
      use: { ...devices['Pixel 7'] }
    },
    {
      name: 'webkit-portrait',
      use: { ...devices['iPhone 13'] }
    }
  ]
});
