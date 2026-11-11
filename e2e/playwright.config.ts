import { defineConfig, devices } from '@playwright/test';

// El frontend (Vite) corre en el puerto 5173 (ver frontend/vite.config.js).
const FRONT_URL = process.env.E2E_BASE_URL ?? 'http://localhost:5173';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: FRONT_URL,
    trace: 'on-first-retry',
  },
  // Levanta el frontend automáticamente si no está corriendo.
  webServer: {
    command: 'npm --prefix ../frontend run dev',
    url: FRONT_URL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
