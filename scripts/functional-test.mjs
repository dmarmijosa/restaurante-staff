/**
 * Prueba funcional end-to-end contra Supabase real.
 *
 * Flujo:
 *   1. Cliente sin sesión: home → carrito → enviar pedido → llamar mesero
 *   2. Registro del primer admin (nuevo tenant por corrida)
 *   3. Login como admin y recorrer las 11 secciones del panel
 *   4. Crear cuentas de mesero, cocina y cajero desde el admin (vía Supabase Auth)
 *   5. Login por cada rol y capturar su vista
 *   6. Extras: wizard `/instalacion` + captura móvil del cliente
 *
 * Las capturas se guardan en /Playwright (gitignored).
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const BASE = 'http://localhost:4200';
const OUT = join(process.cwd(), 'Playwright');
mkdirSync(OUT, { recursive: true });

const SB_URL = 'https://vtkdvxrocemdyybynegs.supabase.co';
const SB_KEY = 'sb_publishable_mr-6bgxKwhOOazfMUMXGrg_PflZ07kh';

/** Identificador único por corrida, evita choques de slug/email en Supabase Auth. */
const rand = Math.random().toString(36).slice(2, 8);
const stamp = Date.now().toString(36);
const suffix = `${stamp}-${rand}`;

const ADMIN_EMAIL   = `qa-admin-${suffix}@example.com`;
const WAITER_EMAIL  = `qa-mesero-${suffix}@example.com`;
const KITCHEN_EMAIL = `qa-cocina-${suffix}@example.com`;
const CASHIER_EMAIL = `qa-cajero-${suffix}@example.com`;
const PASSWORD = 'QaAdmin1234!';
const RESTAURANT_NAME = `QA ${suffix}`;
const RESTAURANT_SLUG = `qa-${suffix}`;

let stepNum = 0;
const results = [];

function log(msg) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
}

async function shot(page, name) {
  stepNum += 1;
  const filename = `${String(stepNum).padStart(2, '0')}-${name}.png`;
  await page.screenshot({ path: join(OUT, filename), fullPage: true });
  log(`  📸 ${filename}`);
  results.push({ step: stepNum, name, filename, ok: true });
}

async function safe(fn, label) {
  try {
    await fn();
    log(`✅ ${label}`);
    return true;
  } catch (err) {
    log(`❌ ${label} — ${err.message?.split('\n')[0]}`);
    results.push({ name: label, ok: false, error: err.message });
    return false;
  }
}

/** Wrapper minimalista sobre la API REST de Supabase (Auth + RPC). */
async function sb(path, opts = {}) {
  const res = await fetch(`${SB_URL}${path}`, {
    ...opts,
    headers: {
      apikey: SB_KEY,
      Authorization: opts.token ? `Bearer ${opts.token}` : `Bearer ${SB_KEY}`,
      'Content-Type': 'application/json',
      ...(opts.headers ?? {}),
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 250)}`);
  if (!text) return null;
  const first = text[0];
  // RPCs escalares (uuid, text, etc.) devuelven JSON válido pero primitivo — parseamos siempre.
  if (first === '{' || first === '[' || first === '"' || first === 't' || first === 'f' || first === 'n' || (first >= '0' && first <= '9') || first === '-') {
    try { return JSON.parse(text); } catch { /* cae al return text */ }
  }
  return text;
}

async function loginUI(page, email, password) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 20000 });
  await page.locator('input[type="email"], input[name="email"], input#email').first().fill(email);
  await page.locator('input[type="password"], input[name="password"], input#password').first().fill(password);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(3000);
}

async function signOutUI(page) {
  // El botón "Salir" está en el topbar. Si no está, forzar recarga del login limpia sesión.
  await page.goto(`${BASE}/login?logout=1`, { waitUntil: 'networkidle', timeout: 20000 }).catch(() => {});
  await page.evaluate(() => localStorage.clear());
  await page.context().clearCookies();
}

(async () => {
  log(`🚀 Prueba funcional contra ${BASE} (Supabase: ${SB_URL})`);
  log(`   Restaurante: ${RESTAURANT_NAME} (${RESTAURANT_SLUG})`);
  log(`   Admin: ${ADMIN_EMAIL}`);

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'es-ES' });
  const page = await ctx.newPage();
  page.on('pageerror', (err) => log(`⚠️  JS: ${err.message}`));

  // ─── 1. Cliente sin sesión ──────────────────────────────────────────────
  await safe(async () => {
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForSelector('h1', { timeout: 15000 });
    await shot(page, 'client-home');
  }, 'Home del cliente');

  await safe(async () => {
    await page.locator('[data-testid^="add-to-cart-"]').first().waitFor({ timeout: 15000 });
    await page.locator('[data-testid^="add-to-cart-"]').first().click();
    await page.waitForTimeout(300);
    await page.locator('[data-testid^="add-to-cart-"]').nth(1).click().catch(() => {});
    await page.waitForTimeout(300);
    await shot(page, 'client-menu-with-items');
  }, 'Añadir productos');

  await safe(async () => {
    await page.locator('[data-testid="cart-bar-button"]').click();
    await page.waitForSelector('[data-testid="cart-heading"]');
    await shot(page, 'client-cart');
  }, 'Abrir carrito');

  await safe(async () => {
    await page.locator('[data-testid="submit-order-button"]').click();
    await page.waitForSelector('[data-testid="order-sent-heading"]', { timeout: 20000 });
    await shot(page, 'client-order-sent');
  }, 'Enviar pedido');

  await safe(async () => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const callBtn = page.locator('[data-testid="call-waiter-button"]');
    if (await callBtn.count()) {
      await callBtn.click();
      await page.waitForTimeout(1500);
      await shot(page, 'client-waiter-called');
    }
  }, 'Llamar al mesero');

  // ─── 2. Registrar admin nuevo (nuevo restaurante) ──────────────────────
  let restaurantId = null;
  let adminToken = null;
  await safe(async () => {
    // 2a) Crear el restaurante vía RPC público
    restaurantId = await sb('/rest/v1/rpc/create_restaurant', {
      method: 'POST',
      body: JSON.stringify({ p_name: RESTAURANT_NAME, p_slug: RESTAURANT_SLUG }),
    });
    log(`   restaurant_id creado: ${restaurantId}`);

    // 2b) SignUp del primer usuario (el trigger lo hace admin+propietario)
    const signup = await sb('/auth/v1/signup', {
      method: 'POST',
      body: JSON.stringify({
        email: ADMIN_EMAIL,
        password: PASSWORD,
        data: { full_name: 'Admin QA', role: 'admin', restaurant_id: restaurantId },
      }),
    });
    if (signup?.access_token) adminToken = signup.access_token;
    if (signup?.session?.access_token) adminToken = signup.session.access_token;
    log(`   Signup OK · session: ${adminToken ? 'sí' : 'no'} · confirm: ${!signup?.confirmed_at ? 'requerida' : 'auto'}`);

    // Sign-in por si el proyecto exige confirmar email (para tener token)
    if (!adminToken) {
      const login = await sb('/auth/v1/token?grant_type=password', {
        method: 'POST',
        body: JSON.stringify({ email: ADMIN_EMAIL, password: PASSWORD }),
      });
      adminToken = login.access_token;
    }
  }, 'Crear restaurante + admin (API)');

  // ─── 3. Login como admin (UI) y recorrer paneles ───────────────────────
  await safe(async () => {
    await loginUI(page, ADMIN_EMAIL, PASSWORD);
    await shot(page, 'login-admin-post');
  }, 'Login UI admin');

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
      await page.goto(`${BASE}/admin/${path}`, { waitUntil: 'networkidle', timeout: 20000 });
      await page.waitForTimeout(1500);
      await shot(page, name);
    }, `Admin — ${path}`);
  }

  // ─── 4. Crear staff (mesero/cocina/cajero) vía API con token de admin ─
  const staff = [
    { email: WAITER_EMAIL,  role: 'mesero',  name: 'Ana Mesera',   label: 'mesero' },
    { email: KITCHEN_EMAIL, role: 'cocina',  name: 'Carlos Cocina', label: 'cocina' },
    { email: CASHIER_EMAIL, role: 'cajero',  name: 'Julia Caja',   label: 'cajero' },
  ];
  for (const s of staff) {
    await safe(async () => {
      await sb('/auth/v1/signup', {
        method: 'POST',
        body: JSON.stringify({
          email: s.email,
          password: PASSWORD,
          data: { full_name: s.name, role: s.role, restaurant_id: restaurantId },
        }),
      });
      log(`   ${s.label} creado: ${s.email}`);
    }, `Crear ${s.label} (API)`);
  }

  // ─── 5. Login por cada rol y capturar su vista principal ───────────────
  const roleViews = [
    { email: WAITER_EMAIL,  path: '/mesero',  name: 'waiter-view'  },
    { email: KITCHEN_EMAIL, path: '/cocina',  name: 'kitchen-view' },
    { email: CASHIER_EMAIL, path: '/cajero',  name: 'cashier-view' },
  ];
  for (const rv of roleViews) {
    await safe(async () => {
      await signOutUI(page);
      await loginUI(page, rv.email, PASSWORD);
      await page.goto(`${BASE}${rv.path}`, { waitUntil: 'networkidle', timeout: 20000 }).catch(() => {});
      await page.waitForTimeout(2500);
      await shot(page, rv.name);
    }, `Login + ${rv.path}`);
  }

  // ─── 6. Wizard de instalación + captura móvil del cliente ──────────────
  await safe(async () => {
    await page.goto(`${BASE}/instalacion`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1500);
    await shot(page, 'instalacion-wizard');
  }, 'Wizard de instalación');

  await safe(async () => {
    const mobile = await browser.newContext({
      viewport: { width: 390, height: 844 }, locale: 'es-ES', isMobile: true, hasTouch: true,
    });
    const mPage = await mobile.newPage();
    await mPage.goto(BASE, { waitUntil: 'networkidle', timeout: 20000 });
    await mPage.waitForTimeout(1500);
    stepNum += 1;
    await mPage.screenshot({ path: join(OUT, `${String(stepNum).padStart(2, '0')}-client-mobile.png`), fullPage: true });
    log(`  📸 ${String(stepNum).padStart(2, '0')}-client-mobile.png`);
    await mobile.close();
  }, 'Cliente en móvil');

  await browser.close();

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  log('');
  log('═══════════════════════════════════════');
  log(`  Capturas: ${stepNum}  ·  OK: ${passed}  ·  Fallos: ${failed}`);
  log('═══════════════════════════════════════');
  if (failed) {
    log('');
    log('Con problemas:');
    results.filter((r) => !r.ok).forEach((r) => log(`  · ${r.name} — ${r.error?.split('\n')[0]}`));
  }
})();
