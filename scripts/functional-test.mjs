/**
 * Prueba funcional end-to-end contra Supabase real.
 *
 * Cubre el ciclo de vida COMPLETO de un pedido: cliente → cocina → mesero →
 * cajero → historial del admin. Cada rol ejecuta sus acciones críticas y se
 * verifica en la DB que el estado transiciona correctamente.
 *
 * Flujo:
 *   1.  Crea el tenant nuevo + admin propietario (API)
 *   2.  Crea las 3 cuentas de staff: mesero / cocina / cajero (API)
 *   3.  Seed con el token del admin: 1 categoría, 2 productos, 1 mesa,
 *       3 métodos de pago (efectivo / tarjeta / transferencia)
 *   4.  Cliente entra a `/:slug/mesa/1`, añade productos y envía el pedido
 *   5.  Cliente llama al mesero
 *   6.  Admin logueado — captura las 11 secciones del panel
 *   7.  Cocina logueada — "Empezar a preparar" → "Platillo listo", verificando
 *       la transición recibido → preparando → listo en la DB
 *   8.  Mesero logueado — atiende la llamada (attended=true) y marca el pedido
 *       como Entregado (listo → entregado)
 *   9.  Cajero logueado — cobra el pedido con Efectivo (paid=true, payment_method)
 *   10. Admin logueado (segunda pasada) — historial y resumen ya reflejan el
 *       cobro y las métricas
 *   11. Wizard `/instalacion` + captura del cliente en móvil
 *
 * Las capturas se guardan en /Playwright (gitignored).
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const BASE = 'http://localhost:4200';
const OUT = join(process.cwd(), 'Playwright');
mkdirSync(OUT, { recursive: true });

const SB_URL = process.env.SUPABASE_URL ?? 'https://lytfornfsxgmzanwikci.supabase.co';
const SB_KEY = process.env.SUPABASE_ANON_KEY ?? 'sb_publishable_i24mUhZzCZHhWrBXhiT63A_4VY-1i5-';

if (!SB_URL || !SB_KEY) {
  console.error('Faltan SUPABASE_URL y/o SUPABASE_ANON_KEY (variables de entorno o .env local del script).');
  process.exit(1);
}

const rand = Math.random().toString(36).slice(2, 6);
const stamp = Date.now().toString(36).slice(-6);
const suffix = `${stamp}${rand}`;

const RESTAURANT_NAME = `QA ${suffix}`;
const RESTAURANT_SLUG = `qa-${suffix}`;
const ADMIN_EMAIL   = `qa-admin-${suffix}@gmail.com`;
const WAITER_EMAIL  = `qa-mesero-${suffix}@gmail.com`;
const KITCHEN_EMAIL = `qa-cocina-${suffix}@gmail.com`;
const CASHIER_EMAIL = `qa-cajero-${suffix}@gmail.com`;
const PASSWORD      = 'QaAdmin1234!';

let stepNum = 0;
const results = [];

const log = (m) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${m}`);

async function shot(page, name) {
  stepNum += 1;
  const filename = `${String(stepNum).padStart(2, '0')}-${name}.png`;
  await page.screenshot({ path: join(OUT, filename), fullPage: true });
  log(`  📸 ${filename}`);
}

async function safe(fn, label) {
  try { await fn(); log(`✅ ${label}`); results.push({ name: label, ok: true }); }
  catch (e) { log(`❌ ${label} — ${e.message?.split('\n')[0]}`); results.push({ name: label, ok: false, error: e.message }); }
}

/** Wrapper sobre la REST/Auth API de Supabase. Parsea correctamente escalares JSON. */
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
  try { return JSON.parse(text); } catch { return text; }
}

async function loginUI(page, email, password) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 20000 });
  await page.locator('input[type="email"], input#email').first().fill(email);
  await page.locator('input[type="password"], input#password').first().fill(password);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(2500);
}

async function signOutUI(page) {
  await page.evaluate(() => localStorage.clear()).catch(() => {});
  await page.context().clearCookies();
}

(async () => {
  log(`🚀 Prueba E2E contra ${BASE} (Supabase: ${SB_URL})`);
  log(`   Tenant: ${RESTAURANT_NAME} (${RESTAURANT_SLUG})`);

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'es-ES' });
  const page = await ctx.newPage();
  page.on('pageerror', (err) => log(`⚠️  JS: ${err.message}`));

  // ─── 1. Crear tenant + admin ────────────────────────────────────────────
  let restaurantId = null;
  let adminToken = null;
  await safe(async () => {
    restaurantId = await sb('/rest/v1/rpc/create_restaurant', {
      method: 'POST',
      body: JSON.stringify({ p_name: RESTAURANT_NAME, p_slug: RESTAURANT_SLUG }),
    });
    log(`   restaurant_id: ${restaurantId}`);

    const signup = await sb('/auth/v1/signup', {
      method: 'POST',
      body: JSON.stringify({
        email: ADMIN_EMAIL, password: PASSWORD,
        data: { full_name: 'Admin QA', role: 'admin', restaurant_id: restaurantId },
      }),
    });
    adminToken = signup?.access_token ?? signup?.session?.access_token ?? null;
    if (!adminToken) {
      const login = await sb('/auth/v1/token?grant_type=password', {
        method: 'POST',
        body: JSON.stringify({ email: ADMIN_EMAIL, password: PASSWORD }),
      });
      adminToken = login.access_token;
    }
    log(`   admin token: ${adminToken ? 'sí' : 'no'}`);
  }, 'Crear tenant + admin');

  // ─── 1b. Verificar el seed automático de create_restaurant() ────────────
  // Desde la migración 19 la función siembra 4 categorías + 6 productos +
  // 4 mesas + 3 métodos de pago. El test se limita a comprobar el estado.
  await safe(async () => {
    const [cats, prods, tables, methods] = await Promise.all([
      sb(`/rest/v1/categories?restaurant_id=eq.${restaurantId}&select=id,name`, { token: adminToken }),
      sb(`/rest/v1/products?restaurant_id=eq.${restaurantId}&select=id,name,price`, { token: adminToken }),
      sb(`/rest/v1/tables?restaurant_id=eq.${restaurantId}&select=id,number`, { token: adminToken }),
      sb(`/rest/v1/payment_methods?restaurant_id=eq.${restaurantId}&select=id,name`, { token: adminToken }),
    ]);
    log(`   seed: ${cats?.length ?? 0} categorías · ${prods?.length ?? 0} productos · ${tables?.length ?? 0} mesas · ${methods?.length ?? 0} métodos`);
    if (!cats?.length || !prods?.length || !tables?.length || !methods?.length) {
      throw new Error('create_restaurant() no sembró el catálogo mínimo — revisar migración 19');
    }
  }, 'Seed automático del tenant');

  // ─── 2. Crear staff ─────────────────────────────────────────────────────
  const staff = [
    { email: WAITER_EMAIL,  role: 'mesero',  name: 'Ana Mesera'    },
    { email: KITCHEN_EMAIL, role: 'cocina',  name: 'Carlos Cocina' },
    { email: CASHIER_EMAIL, role: 'cajero',  name: 'Julia Caja'    },
  ];
  for (const s of staff) {
    await safe(async () => {
      await sb('/auth/v1/signup', {
        method: 'POST',
        body: JSON.stringify({
          email: s.email, password: PASSWORD,
          data: { full_name: s.name, role: s.role, restaurant_id: restaurantId },
        }),
      });
    }, `Crear ${s.role} (${s.email})`);
  }

  // ─── 3. Cliente entra en el tenant nuevo y hace pedido ──────────────────
  await safe(async () => {
    // Vamos a mesa 1 (existe por seed en cada tenant). Con slug la app usa este tenant.
    await page.goto(`${BASE}/${RESTAURANT_SLUG}/mesa/1`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForSelector('h1', { timeout: 15000 });
    await shot(page, 'client-home-tenant');
  }, 'Cliente entra al tenant');

  await safe(async () => {
    await page.locator('[data-testid^="add-to-cart-"]').first().waitFor({ timeout: 15000 });
    await page.locator('[data-testid^="add-to-cart-"]').first().click();
    await page.waitForTimeout(300);
    await page.locator('[data-testid^="add-to-cart-"]').nth(1).click().catch(() => {});
    await page.waitForTimeout(300);
    await shot(page, 'client-menu-with-items');
  }, 'Añadir 2 productos');

  await safe(async () => {
    await page.locator('[data-testid="cart-bar-button"]').click();
    await page.waitForSelector('[data-testid="cart-heading"]');
    await shot(page, 'client-cart');
  }, 'Abrir carrito');

  await safe(async () => {
    await page.locator('[data-testid="submit-order-button"]').click();
    await page.waitForSelector('[data-testid="order-sent-heading"]', { timeout: 20000 });
    await shot(page, 'client-order-sent');
  }, 'Enviar pedido (llega al tenant)');

  await safe(async () => {
    // Capturar console y network para diagnosticar el bug de "llamar mesero"
    const consoleLogs = [];
    const networkErrors = [];
    const consoleHandler = (msg) => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
      }
    };
    const responseHandler = (res) => {
      if (res.url().includes('/waiter_calls') && !res.ok()) {
        res.text().then((body) => networkErrors.push(`${res.status()} ${res.url()} → ${body.slice(0, 200)}`)).catch(() => {});
      }
    };
    page.on('console', consoleHandler);
    page.on('response', responseHandler);

    await page.goto(`${BASE}/${RESTAURANT_SLUG}/mesa/1`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    const btn = page.locator('[data-testid="call-waiter-button"]');
    if (await btn.count()) {
      await btn.click();
      await page.waitForTimeout(2500);
      await shot(page, 'client-waiter-called');
    }
    const calls = await sb(`/rest/v1/waiter_calls?restaurant_id=eq.${restaurantId}&select=id,table_number,attended,created_at`, { token: adminToken });
    log(`   waiter_calls del tenant: ${JSON.stringify(calls)}`);
    if (consoleLogs.length) log(`   console: ${consoleLogs.join(' | ')}`);
    if (networkErrors.length) log(`   network: ${networkErrors.join(' | ')}`);
    page.off('console', consoleHandler);
    page.off('response', responseHandler);

    if (!Array.isArray(calls) || calls.length === 0) {
      throw new Error('La llamada al mesero no se persistió en la DB');
    }
  }, 'Cliente llama al mesero');

  // ─── 4. Login como admin y verifica pedido ──────────────────────────────
  await safe(async () => {
    await signOutUI(page);
    await loginUI(page, ADMIN_EMAIL, PASSWORD);
    await shot(page, 'login-admin-post');
  }, 'Login UI admin');

  const adminSections = [
    ['resumen', 'admin-resumen'],
    ['plano', 'admin-plano'],
    ['pedidos', 'admin-pedidos-con-comanda'],
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
      // Cierra el tour de driver.js si aparece
      const closeTour = page.locator('.driver-popover-close-btn, [aria-label="Close"]').first();
      if (await closeTour.count().catch(() => 0)) {
        await closeTour.click({ timeout: 1000 }).catch(() => {});
      }
      await page.waitForTimeout(1500);
      await shot(page, name);
    }, `Admin — ${path}`);
  }

  // Helper: consulta el estado del último pedido del tenant vía REST + token admin.
  async function fetchOrderStatus() {
    const rows = await sb(`/rest/v1/orders?restaurant_id=eq.${restaurantId}&select=id,status,paid,payment_method&order=id.desc&limit=1`, { token: adminToken });
    return rows?.[0] ?? null;
  }

  // ─── 5. Cocina: pendiente → preparando → listo ──────────────────────────
  await safe(async () => {
    await signOutUI(page);
    await loginUI(page, KITCHEN_EMAIL, PASSWORD);
    await page.goto(`${BASE}/cocina`, { waitUntil: 'networkidle', timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(2500);
    await shot(page, 'kitchen-recibido');

    // Click "Empezar a preparar"
    const startBtn = page.locator('button', { hasText: /Empezar a preparar/i }).first();
    await startBtn.waitFor({ timeout: 10000 });
    await startBtn.click();
    await page.waitForTimeout(2000);
    await shot(page, 'kitchen-preparando');

    const afterStart = await fetchOrderStatus();
    log(`   estado en DB tras "Empezar a preparar": ${afterStart?.status}`);
    if (afterStart?.status !== 'preparando') throw new Error(`Esperaba estado 'preparando', encontré '${afterStart?.status}'`);

    // Click "Platillo listo"
    const readyBtn = page.locator('button', { hasText: /Platillo listo/i }).first();
    await readyBtn.waitFor({ timeout: 10000 });
    await readyBtn.click();
    await page.waitForTimeout(2000);
    await shot(page, 'kitchen-listo');

    const afterReady = await fetchOrderStatus();
    log(`   estado en DB tras "Platillo listo": ${afterReady?.status}`);
    if (afterReady?.status !== 'listo') throw new Error(`Esperaba estado 'listo', encontré '${afterReady?.status}'`);
  }, 'Cocina prepara y marca listo');

  // ─── 6. Mesero: atiende llamada + marca entregado ───────────────────────
  await safe(async () => {
    await signOutUI(page);
    await loginUI(page, WAITER_EMAIL, PASSWORD);
    await page.goto(`${BASE}/mesero`, { waitUntil: 'networkidle', timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(2500);
    await shot(page, 'waiter-con-llamada-y-listo');

    // Atender llamada — botón "Atender mesa" (waiter.attend_btn)
    const attendBtn = page.locator('button', { hasText: /Atender mesa/i }).first();
    if (await attendBtn.count()) {
      await attendBtn.click();
      await page.waitForTimeout(1500);
    }
    const callsAfter = await sb(`/rest/v1/waiter_calls?restaurant_id=eq.${restaurantId}&select=id,attended`, { token: adminToken });
    log(`   waiter_calls tras atender: ${JSON.stringify(callsAfter)}`);
    if (!callsAfter?.every((c) => c.attended === true)) throw new Error('La llamada no quedó atendida');

    // Marcar entregado — botón "Marcar Entregado" (listo_next)
    const deliverBtn = page.locator('button', { hasText: /Marcar Entregado/i }).first();
    await deliverBtn.waitFor({ timeout: 10000 });
    await deliverBtn.click();
    await page.waitForTimeout(2000);
    await shot(page, 'waiter-entregado');

    const afterDeliver = await fetchOrderStatus();
    log(`   estado en DB tras "Marcar Entregado": ${afterDeliver?.status}`);
    if (afterDeliver?.status !== 'entregado') throw new Error(`Esperaba 'entregado', encontré '${afterDeliver?.status}'`);
  }, 'Mesero atiende y entrega');

  // ─── 7. Cajero cobra el pedido ──────────────────────────────────────────
  await safe(async () => {
    await signOutUI(page);
    await loginUI(page, CASHIER_EMAIL, PASSWORD);
    await page.goto(`${BASE}/cajero`, { waitUntil: 'networkidle', timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(2500);
    await shot(page, 'cashier-por-cobrar');

    // Click en el método "Efectivo …" (nombre sufijado en el seed)
    const cashBtn = page.locator('button', { hasText: /Efectivo/i }).first();
    await cashBtn.waitFor({ timeout: 10000 });
    await cashBtn.click();
    await page.waitForTimeout(2000);
    await shot(page, 'cashier-cobrado');

    const afterCharge = await fetchOrderStatus();
    log(`   pedido tras cobro: paid=${afterCharge?.paid} method=${afterCharge?.payment_method}`);
    if (!afterCharge?.paid) throw new Error('El pedido no quedó marcado como pagado');
    if (!afterCharge?.payment_method?.startsWith('Efectivo')) throw new Error(`Método de pago inesperado: ${afterCharge?.payment_method}`);
  }, 'Cajero cobra con Efectivo');

  // ─── 8. Admin (segunda pasada): historial + resumen con datos reales ───
  await safe(async () => {
    await signOutUI(page);
    await loginUI(page, ADMIN_EMAIL, PASSWORD);
    await page.goto(`${BASE}/admin/historial`, { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(2000);
    await shot(page, 'admin-historial-con-cobro');

    await page.goto(`${BASE}/admin/resumen`, { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(2000);
    await shot(page, 'admin-resumen-con-metricas');
  }, 'Admin ve historial y resumen actualizados');

  // ─── 9. Extras: wizard + cliente móvil ──────────────────────────────────
  await safe(async () => {
    await page.goto(`${BASE}/instalacion`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1500);
    await shot(page, 'instalacion-wizard');
  }, 'Wizard /instalacion');

  await safe(async () => {
    const mobile = await browser.newContext({
      viewport: { width: 390, height: 844 }, locale: 'es-ES', isMobile: true, hasTouch: true,
    });
    const mPage = await mobile.newPage();
    await mPage.goto(`${BASE}/${RESTAURANT_SLUG}/mesa/1`, { waitUntil: 'networkidle', timeout: 20000 });
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
    log('Fallos:');
    results.filter((r) => !r.ok).forEach((r) => log(`  · ${r.name} — ${r.error?.split('\n')[0]}`));
  }
})();
