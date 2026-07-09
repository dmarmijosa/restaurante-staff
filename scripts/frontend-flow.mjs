/**
 * Recorrido funcional completo solo por frontend contra Supabase real.
 *
 * - Lee SUPABASE_URL y SUPABASE_ANON_KEY de `.env` (o variables de entorno).
 * - Levanta la app en el puerto E2E_PORT (default 5000).
 * - Guarda capturas en /Playwright.
 *
 * Modos:
 *   1. Bootstrap (default): crea un tenant nuevo en /nuevo-restaurante y recorre todo.
 *   2. Existente: E2E_EXISTING=1 + E2E_ADMIN_EMAIL + E2E_ADMIN_PASSWORD (+ E2E_SLUG opcional).
 *
 * Uso:
 *   node scripts/frontend-flow.mjs
 *   E2E_EXISTING=1 E2E_ADMIN_EMAIL=... E2E_ADMIN_PASSWORD=... node scripts/frontend-flow.mjs
 */
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawn, execSync } from 'node:child_process';

const OUT = join(process.cwd(), 'Playwright');
mkdirSync(OUT, { recursive: true });

const KITCHEN_PIN = process.env.E2E_KITCHEN_PIN ?? '123456';
const STAFF_PASSWORD = process.env.E2E_STAFF_PASSWORD ?? 'Staff1234!';

function loadDotEnv() {
  const envPath = join(process.cwd(), '.env');
  if (!existsSync(envPath)) return {};
  return Object.fromEntries(
    readFileSync(envPath, 'utf8')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const idx = line.indexOf('=');
        return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
      }),
  );
}

const dotEnv = loadDotEnv();
const SB_URL = process.env.SUPABASE_URL ?? dotEnv.SUPABASE_URL ?? '';
const SB_KEY = process.env.SUPABASE_ANON_KEY ?? dotEnv.SUPABASE_ANON_KEY ?? '';

if (!SB_URL || !SB_KEY) {
  console.error('Faltan SUPABASE_URL y/o SUPABASE_ANON_KEY en .env o entorno.');
  process.exit(1);
}

const useExisting = ['1', 'true', 'yes'].includes(String(process.env.E2E_EXISTING ?? '').toLowerCase());
const existingAdminEmail = process.env.E2E_ADMIN_EMAIL ?? '';
const existingAdminPassword = process.env.E2E_ADMIN_PASSWORD ?? '';

const rand = Math.random().toString(36).slice(2, 6);
const stamp = Date.now().toString(36).slice(-6);
const suffix = `${stamp}${rand}`;

let restaurantSlug = process.env.E2E_SLUG ?? '';
let adminEmail = existingAdminEmail;
let adminPassword = existingAdminPassword;
let waiterEmail = process.env.E2E_WAITER_EMAIL ?? `qa-mesero-${suffix}@gmail.com`;
let cashierEmail = process.env.E2E_CASHIER_EMAIL ?? `qa-cajero-${suffix}@gmail.com`;

let stepNum = 0;
const results = [];
let serverProc = null;

const log = (m) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${m}`);

let PORT = process.env.E2E_PORT ?? '5000';
let BASE = `http://127.0.0.1:${PORT}`;

async function resolvePort() {
  const preferred = process.env.E2E_PORT ?? '5000';
  try {
    const res = await fetch(`http://127.0.0.1:${preferred}`, { signal: AbortSignal.timeout(2000) });
    const server = res.headers.get('server') ?? '';
    if (server.includes('AirTunes') || (preferred === '5000' && res.status === 403)) {
      log('⚠️  Puerto 5000 reservado por AirPlay en macOS → usando 5001 (desactiva «Receptor AirPlay» en Ajustes o define E2E_PORT).');
      return '5001';
    }
    if (res.ok || res.status === 304) return preferred;
  } catch {
    /* puerto libre */
  }
  return preferred;
}

async function shot(page, name) {
  stepNum += 1;
  const filename = `${String(stepNum).padStart(2, '0')}-${name}.png`;
  await page.screenshot({ path: join(OUT, filename), fullPage: true });
  log(`  📸 ${filename}`);
}

async function safe(fn, label) {
  try {
    await fn();
    log(`✅ ${label}`);
    results.push({ name: label, ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log(`❌ ${label} — ${msg.split('\n')[0]}`);
    results.push({ name: label, ok: false, error: msg });
  }
}

async function waitForServer(maxMs = 120_000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const res = await fetch(BASE, { signal: AbortSignal.timeout(3000) });
      if (res.ok || res.status === 304) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error(`La app no respondió en ${BASE} tras ${maxMs / 1000}s`);
}

function startDevServer() {
  execSync('node scripts/set-env.mjs', { cwd: process.cwd(), stdio: 'inherit' });
  serverProc = spawn('npx', ['ng', 'serve', '--port', PORT, '--host', '127.0.0.1'], {
    cwd: process.cwd(),
    env: { ...process.env, RS_FORCE_DEMO: '0' },
    stdio: 'ignore',
    detached: false,
  });
  serverProc.on('error', (err) => log(`ng serve error: ${err.message}`));
}

async function stopDevServer() {
  if (!serverProc) return;
  serverProc.kill('SIGTERM');
  await new Promise((r) => setTimeout(r, 800));
  serverProc = null;
}

async function injectSupabaseConfig(context) {
  await context.addInitScript(({ url, key }) => {
    localStorage.setItem('rs-supabase-url', url);
    localStorage.setItem('rs-supabase-anon-key', key);
    localStorage.setItem('rs-admin-tour-seen', '1');
  }, { url: SB_URL, key: SB_KEY });
}

async function closeTour(page) {
  const closeTour = page.locator('.driver-popover-close-btn, [aria-label="Close"]').first();
  if (await closeTour.count().catch(() => 0)) {
    await closeTour.click({ timeout: 1000 }).catch(() => {});
  }
}

async function loginUI(page, email, password) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 30_000 });
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await page.waitForURL(/\/(admin|mesero|cocina|cajero)/, { timeout: 20_000 });
}

async function signOutUI(page) {
  const signOut = page.getByRole('button', { name: 'Salir' });
  if (await signOut.count()) {
    await signOut.click();
    await page.waitForTimeout(1000);
  }
  await page.context().clearCookies();
}

async function registerRestaurantUI(page) {
  const name = `QA Flow ${suffix}`;
  restaurantSlug = `qa-flow-${suffix}`;
  adminEmail = `qa-admin-${suffix}@gmail.com`;
  adminPassword = 'QaAdmin1234!';
  waiterEmail = `qa-mesero-${suffix}@gmail.com`;
  cashierEmail = `qa-cajero-${suffix}@gmail.com`;

  await page.goto(`${BASE}/nuevo-restaurante`, { waitUntil: 'networkidle', timeout: 30_000 });
  await shot(page, 'nuevo-restaurante-formulario');

  await page.locator('#restaurantName').fill(name);
  await page.locator('#slug').fill(restaurantSlug);
  await page.locator('#fullName').fill('Admin QA Flow');
  await page.locator('#email').fill(adminEmail);
  await page.locator('#password').fill(adminPassword);
  await page.locator('#confirmPassword').fill(adminPassword);
  await page.getByRole('button', { name: 'Crear restaurante y cuenta' }).click();
  await page.waitForURL(/\/admin/, { timeout: 45_000 });
  await page.waitForTimeout(2000);
  await shot(page, 'admin-tras-registro');
}

async function detectSingleRestaurantSlug() {
  const res = await fetch(`${SB_URL}/rest/v1/restaurants?select=slug&limit=2`, {
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
  });
  const rows = await res.json();
  if (Array.isArray(rows) && rows.length === 1) return rows[0].slug;
  return null;
}

async function ensureStaffMember(page, { name, email, roleLabel }) {
  await page.goto(`${BASE}/admin/meseros`, { waitUntil: 'networkidle', timeout: 25_000 });
  await closeTour(page);

  const existing = page.getByTestId('staff-row').filter({ hasText: email });
  if (await existing.count()) {
    await existing.getByRole('button', { name: 'Contraseña' }).click();
    await page.locator('#pwd-new').fill(STAFF_PASSWORD);
    await page.locator('#pwd-confirm').fill(STAFF_PASSWORD);
    await page.getByRole('button', { name: 'Guardar' }).click();
    await page.waitForTimeout(1000);
    return;
  }

  await page.getByRole('button', { name: '+ Dar de alta' }).click();
  await page.getByLabel('Nombre completo').fill(name);
  await page.getByLabel('Correo del empleado').fill(email);
  await page.locator('#staff-draft-password').fill(STAFF_PASSWORD);
  await page.getByRole('button', { name: roleLabel, exact: true }).click();
  await page.getByRole('button', { name: 'Guardar' }).click();
  await page.waitForTimeout(1500);
}

async function setKitchenPinUI(page) {
  await page.goto(`${BASE}/admin/ajustes`, { waitUntil: 'networkidle', timeout: 25_000 });
  await closeTour(page);
  await page.locator('#kitchen-pin').fill(KITCHEN_PIN);
  await page.getByRole('button', { name: /Guardar PIN|Rotar PIN/ }).click();
  await page.waitForTimeout(1500);
  await shot(page, 'admin-pin-cocina-configurado');
}

async function enterKitchenPin(page, pin) {
  for (const digit of pin) {
    await page.getByRole('button', { name: digit, exact: true }).click();
    await page.waitForTimeout(120);
  }
}

(async () => {
  PORT = await resolvePort();
  BASE = `http://127.0.0.1:${PORT}`;
  log(`🚀 Flujo frontend completo → ${BASE}`);
  log(`   Supabase: ${SB_URL}`);

  if (useExisting) {
    if (!adminEmail || !adminPassword) {
      console.error('E2E_EXISTING=1 requiere E2E_ADMIN_EMAIL y E2E_ADMIN_PASSWORD.');
      process.exit(1);
    }
    if (!restaurantSlug) {
      restaurantSlug = (await detectSingleRestaurantSlug()) ?? '';
      if (!restaurantSlug) {
        console.error('No se pudo detectar el slug. Define E2E_SLUG.');
        process.exit(1);
      }
    }
    log(`   Modo existente: /${restaurantSlug}`);
  } else {
    log('   Modo bootstrap: nuevo tenant en /nuevo-restaurante');
  }

  const skipServer = ['1', 'true', 'yes'].includes(String(process.env.E2E_SKIP_SERVER ?? '').toLowerCase());
  const serverAlreadyUp = await fetch(BASE, { signal: AbortSignal.timeout(2000) }).then((r) => r.ok).catch(() => false);

  if (serverAlreadyUp) {
    log(`   Reutilizando servidor en ${BASE}`);
  } else if (!skipServer) {
    log('   Arrancando ng serve…');
    await startDevServer();
    await waitForServer();
  } else {
    await waitForServer();
  }

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'es-ES' });
  await injectSupabaseConfig(ctx);
  const page = await ctx.newPage();
  page.on('pageerror', (err) => log(`⚠️  JS: ${err.message}`));

  if (!useExisting) {
    await safe(() => registerRestaurantUI(page), 'Bootstrap — crear restaurante y admin');
  } else {
    await safe(async () => {
      await loginUI(page, adminEmail, adminPassword);
      await shot(page, 'login-admin');
    }, 'Login admin existente');
  }

  await safe(async () => {
    await ensureStaffMember(page, { name: 'Mesero QA', email: waiterEmail, roleLabel: 'Mesero' });
    await ensureStaffMember(page, { name: 'Cajero QA', email: cashierEmail, roleLabel: 'Cajero' });
    await shot(page, 'admin-meseros-staff-listo');
  }, 'Admin — alta mesero y cajero');

  await safe(() => setKitchenPinUI(page), 'Admin — configurar PIN de cocina');

  const adminSections = [
    ['resumen', 'admin-resumen'],
    ['plano', 'admin-plano'],
    ['pedidos', 'admin-pedidos'],
    ['historial', 'admin-historial'],
    ['menu', 'admin-menu'],
    ['categorias', 'admin-categorias'],
    ['meseros', 'admin-meseros'],
    ['horarios', 'admin-horarios'],
    ['pagos', 'admin-pagos'],
    ['temporada', 'admin-temporada'],
    ['ajustes', 'admin-ajustes'],
  ];
  for (const [path, name] of adminSections) {
    await safe(async () => {
      await page.goto(`${BASE}/admin/${path}`, { waitUntil: 'networkidle', timeout: 25_000 });
      await closeTour(page);
      await page.waitForTimeout(1200);
      await shot(page, name);
    }, `Admin — ${path}`);
  }

  await safe(async () => {
    await page.goto(`${BASE}/${restaurantSlug}/mesa/1`, { waitUntil: 'networkidle', timeout: 30_000 });
    await page.waitForSelector('h1', { timeout: 15_000 });
    await shot(page, 'client-home-tenant');
  }, 'Cliente — menú mesa 1');

  await safe(async () => {
    await page.locator('[data-testid^="add-to-cart-"]').first().waitFor({ timeout: 15_000 });
    await page.locator('[data-testid^="add-to-cart-"]').first().click();
    await page.waitForTimeout(300);
    await page.locator('[data-testid^="add-to-cart-"]').nth(1).click().catch(() => {});
    await shot(page, 'client-menu-with-items');
  }, 'Cliente — añadir productos');

  await safe(async () => {
    await page.locator('[data-testid="cart-bar-button"]').click();
    await page.waitForSelector('[data-testid="cart-heading"]');
    await shot(page, 'client-cart');
  }, 'Cliente — carrito');

  await safe(async () => {
    await page.locator('[data-testid="submit-order-button"]').click();
    await page.waitForSelector('[data-testid="order-sent-heading"]', { timeout: 20_000 });
    await shot(page, 'client-order-sent');
  }, 'Cliente — pedido enviado');

  await safe(async () => {
    await page.goto(`${BASE}/${restaurantSlug}/mesa/1`, { waitUntil: 'networkidle' });
    const btn = page.locator('[data-testid="call-waiter-button"]');
    if (await btn.count()) {
      await btn.click();
      await page.waitForTimeout(2000);
      await shot(page, 'client-waiter-called');
    }
  }, 'Cliente — llamar mesero');

  await safe(async () => {
    await signOutUI(page);
    await page.goto(`${BASE}/cocina/acceso`, { waitUntil: 'networkidle', timeout: 25_000 });
    await page.waitForTimeout(1500);
    await shot(page, 'kitchen-acceso-pin');
    await enterKitchenPin(page, KITCHEN_PIN);
    await page.waitForURL(/\/cocina(?!\/acceso)/, { timeout: 20_000 });
    await page.waitForTimeout(2000);
    await shot(page, 'kitchen-recibido');

    const startBtn = page.getByRole('button', { name: /Empezar a preparar/i }).first();
    await startBtn.waitFor({ timeout: 15_000 });
    await startBtn.click();
    await page.waitForTimeout(2000);
    await shot(page, 'kitchen-preparando');

    const readyBtn = page.getByRole('button', { name: /Platillo listo/i }).first();
    await readyBtn.waitFor({ timeout: 15_000 });
    await readyBtn.click();
    await page.waitForTimeout(2000);
    await shot(page, 'kitchen-listo');
  }, 'Cocina — PIN, preparar y marcar listo');

  await safe(async () => {
    await signOutUI(page);
    await loginUI(page, waiterEmail, STAFF_PASSWORD);
    await page.goto(`${BASE}/mesero`, { waitUntil: 'networkidle', timeout: 25_000 });
    await page.waitForTimeout(2000);
    await shot(page, 'waiter-con-llamada-y-listo');

    const attendBtn = page.getByRole('button', { name: /Atender mesa/i }).first();
    if (await attendBtn.count()) {
      await attendBtn.click();
      await page.waitForTimeout(1500);
    }

    const deliverBtn = page.getByRole('button', { name: /Marcar Entregado/i }).first();
    await deliverBtn.waitFor({ timeout: 15_000 });
    await deliverBtn.click();
    await page.waitForTimeout(2000);
    await shot(page, 'waiter-entregado');
  }, 'Mesero — atender y entregar');

  await safe(async () => {
    await signOutUI(page);
    await loginUI(page, cashierEmail, STAFF_PASSWORD);
    await page.goto(`${BASE}/cajero`, { waitUntil: 'networkidle', timeout: 25_000 });
    await page.waitForTimeout(2000);
    await shot(page, 'cashier-por-cobrar');

    const cashBtn = page.locator('button', { hasText: /Efectivo/i }).first();
    await cashBtn.waitFor({ timeout: 15_000 });
    await cashBtn.click();
    await page.waitForTimeout(2000);
    await shot(page, 'cashier-cobrado');
  }, 'Cajero — cobrar con Efectivo');

  await safe(async () => {
    await signOutUI(page);
    await loginUI(page, adminEmail, adminPassword);
    await page.goto(`${BASE}/admin/historial`, { waitUntil: 'networkidle', timeout: 25_000 });
    await page.waitForTimeout(2000);
    await shot(page, 'admin-historial-con-cobro');
    await page.goto(`${BASE}/admin/resumen`, { waitUntil: 'networkidle', timeout: 25_000 });
    await page.waitForTimeout(2000);
    await shot(page, 'admin-resumen-con-metricas');
  }, 'Admin — historial y resumen final');

  await safe(async () => {
    const mobile = await browser.newContext({
      viewport: { width: 390, height: 844 },
      locale: 'es-ES',
      isMobile: true,
      hasTouch: true,
    });
    await injectSupabaseConfig(mobile);
    const mPage = await mobile.newPage();
    await mPage.goto(`${BASE}/${restaurantSlug}/mesa/1`, { waitUntil: 'networkidle', timeout: 25_000 });
    await mPage.waitForTimeout(1500);
    stepNum += 1;
    const mobileFile = `${String(stepNum).padStart(2, '0')}-client-mobile.png`;
    await mPage.screenshot({ path: join(OUT, mobileFile), fullPage: true });
    log(`  📸 ${mobileFile}`);
    await mobile.close();
  }, 'Cliente móvil');

  await browser.close();
  if (serverProc) await stopDevServer();

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  log('');
  log('═══════════════════════════════════════');
  log(`  Capturas: ${stepNum}  ·  OK: ${passed}  ·  Fallos: ${failed}`);
  log(`  Tenant: ${restaurantSlug}`);
  log('═══════════════════════════════════════');
  if (failed) {
    log('');
    log('Fallos:');
    results.filter((r) => !r.ok).forEach((r) => log(`  · ${r.name} — ${r.error?.split('\n')[0]}`));
    process.exit(1);
  }
})().catch(async (e) => {
  console.error(e);
  await stopDevServer();
  process.exit(1);
});
