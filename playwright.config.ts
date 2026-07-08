import { defineConfig, devices } from '@playwright/test';

/**
 * Configuración de Playwright: levanta `ng serve` automáticamente y corre las
 * pruebas E2E contra el modo demo (sin claves), de modo que cualquier
 * contribuidor y el CI las ejecuten sin credenciales de Supabase.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env['CI'] ? 2 : 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'on-first-retry',
    // Locale fijo para que la detección de idioma sea determinista: los specs
    // están escritos con los textos en español (la app detecta el idioma del
    // navegador, y el Chromium de Playwright reportaría 'en' por defecto).
    locale: 'es-ES',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // El menú del cliente es mobile-first: se prueba también en viewport móvil
    // (Pixel 7 usa Chromium, el único navegador instalado en CI).
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testMatch: /client\.spec\.ts/ },
  ],
  webServer: {
    // RS_FORCE_DEMO garantiza que las E2E corran en modo demo (en memoria),
    // deterministas y sin mutar la base real aunque exista un .env con claves.
    command: 'npm start',
    env: { RS_FORCE_DEMO: '1' },
    url: 'http://localhost:4200',
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
});
