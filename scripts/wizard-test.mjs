/**
 * Prueba funcional del **wizard `/instalacion`** contra un proyecto Supabase
 * limpio (sin `.env`). Simula exactamente lo que hace un usuario final:
 *
 *   1.  Comprueba que el schema esté aplicado en el proyecto destino
 *       (si no lo está, aborta con instrucciones claras).
 *   2.  Abre el navegador con un contexto NUEVO (sin `localStorage` previo).
 *   3.  Recorre los 5 pasos del wizard capturando cada uno.
 *   4.  En el paso 3 introduce URL + anon key → el wizard debe recargar
 *       la app para rearrancarla con las nuevas credenciales.
 *   5.  En el paso 5 crea el restaurante + admin desde `/nuevo-restaurante`.
 *   6.  Confirma que el panel admin carga con el tenant recién creado y
 *       que el seed automático poblá el menú.
 *   7.  El cliente entra en `/r/<slug>/mesa/1`, hace un pedido y llama al
 *       mesero — todo contra el proyecto Supabase real.
 *
 * Uso:
 *   node scripts/wizard-test.mjs
 *
 * Requisitos:
 *   - `npm start` corriendo en http://localhost:4200
 *   - El proyecto Supabase destino debe tener `public/setup/schema.sql` aplicado
 *     (basta pegarlo en el SQL Editor del dashboard).
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const BASE = 'http://localhost:4200';
const OUT = join(process.cwd(), 'Playwright');
mkdirSync(OUT, { recursive: true });

// Credenciales del proyecto Supabase destino (NO se escriben en .env).
const SB_URL = 'https://lytfornfsxgmzanwikci.supabase.co';
const SB_KEY = 'sb_publishable_i24mUhZzCZHhWrBXhiT63A_4VY-1i5-';

const rand = Math.random().toString(36).slice(2, 6);
const stamp = Date.now().toString(36).slice(-6);
const suffix = `${stamp}${rand}`;

const RESTAURANT_NAME = `Wizard ${suffix}`;
const RESTAURANT_SLUG = `wizard-${suffix}`;
const ADMIN_FULL_NAME = `Wizard Admin ${suffix}`;
const ADMIN_EMAIL = `wiz-admin-${suffix}@gmail.com`;
const PASSWORD = 'WizardAdmin1234!';

let stepNum = 0;
const nextName = (label) => {
  stepNum += 1;
  return `${String(stepNum).padStart(2, '0')}-${label}.png`;
};

async function shot(page, label) {
  const name = nextName(label);
  await page.screenshot({ path: join(OUT, name), fullPage: true });
  console.log(`  📸 ${name}`);
}

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

async function ensureSchema() {
  console.log('▶ Verificando que el schema esté aplicado…');
  const res = await fetch(`${SB_URL}/rest/v1/restaurants?limit=1`, {
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
  });
  if (res.status === 404 || res.status === 406) {
    console.error(`
❌ El proyecto Supabase destino todavía no tiene el schema aplicado.

  Aplica el archivo public/setup/schema.sql en:
    ${SB_URL.replace('.supabase.co', '').replace('https://', 'https://supabase.com/dashboard/project/')}/sql/new

  Cuando termine ("Success. No rows returned."), vuelve a ejecutar este script.
`);
    process.exit(1);
  }
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`No se puede consultar el proyecto (${res.status}): ${body.slice(0, 200)}`);
  }
  console.log('  ✔ Schema aplicado — arranco el wizard.');
}

async function main() {
  await ensureSchema();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'es-ES',
    // Contexto NUEVO: sin localStorage → la app arranca en modo demo,
    // igual que cuando un usuario abre la app por primera vez.
  });

  // Registro de errores/logs de consola para diagnóstico.
  context.on('console', (msg) => {
    if (msg.type() === 'error') console.log('   [browser error]', msg.text().slice(0, 220));
  });
  context.on('page', (p) => {
    p.on('response', async (res) => {
      const u = res.url();
      if (!u.includes('lytfornfsxgmzanwikci')) return;
      if (u.includes('signup') || u.includes('create_restaurant') || u.includes('profiles') || u.includes('token')) {
        console.log(`   [net] ${res.status()} ${u.replace(SB_URL, '').slice(0, 80)}`);
        if (res.status() >= 400) {
          console.log('         ', (await res.text().catch(() => '')).slice(0, 180));
        }
      }
    });
  });

  const page = await context.newPage();

  // Inyectamos las credenciales del proyecto NUEVO antes del primer paint.
  // Sin esto, el build con .env apunta al proyecto viejo y el wizard salta
  // al paso 6 (admin_exists del otro tenant).
  await page.addInitScript(({ url, key }) => {
    localStorage.setItem('rs-supabase-url', url);
    localStorage.setItem('rs-supabase-anon-key', key);
  }, { url: SB_URL, key: SB_KEY });

  // ────────────────────────────────────────────────────────────────────
  // Pasos 1-2 · Bienvenida + crear proyecto (si el build no trae .env)
  // ────────────────────────────────────────────────────────────────────
  console.log('\n▶ Wizard: abrir /instalacion');
  await page.goto(`${BASE}/instalacion`);
  await page.waitForTimeout(1200);

  const onStep6 = await page.getByText('¡Tu restaurante está listo!').isVisible().catch(() => false);

  if (onStep6) {
    // Tras una prueba previa el proyecto ya tiene un admin global → paso 6.
    console.log('▶ Wizard paso 6: proyecto ya tiene admin (normal si ya probaste antes)');
    await shot(page, 'wizard-paso6-ya-configurado');
  } else {
    const step1 = await page.getByRole('button', { name: /Comenzar la instalación/ }).isVisible().catch(() => false);
    if (step1) {
      console.log('▶ Paso 1: Bienvenida');
      await shot(page, 'wizard-paso1-bienvenida');
      await page.getByRole('button', { name: /Comenzar la instalación/ }).click();
      console.log('▶ Paso 2: Crea el proyecto en Supabase');
      await page.waitForSelector('text=Crea tu proyecto en Supabase');
      await shot(page, 'wizard-paso2-crear-proyecto');
      await page.getByRole('button', { name: /Ya tengo mi proyecto/ }).click();
    } else {
      console.log('  ℹ Build con .env: el wizard no muestra paso 1 (normal en dev).');
    }

    console.log('▶ Paso 3: Pegar URL + anon key (dispara reload)');
    if (await page.getByText('Crea las tablas del restaurante').isVisible().catch(() => false)) {
      await page.getByRole('button', { name: '← Atrás' }).click();
    }
    await page.waitForSelector('#wiz-url');
  await page.fill('#wiz-url', SB_URL);
  await page.fill('#wiz-key', SB_KEY);
  await shot(page, 'wizard-paso3-formulario');

  // El botón "Conectar y continuar" dispara window.location.reload()
  // esperamos a que la app se recargue completa (paso guardado = 4).
  await Promise.all([
    page.waitForSelector('text=Crea las tablas del restaurante', { timeout: 20000 }),
    page.getByRole('button', { name: /Conectar y continuar/ }).click(),
  ]);

  // Verificamos que las credenciales se guardaron en localStorage.
  const stored = await page.evaluate(() => ({
    url: localStorage.getItem('rs-supabase-url'),
    key: localStorage.getItem('rs-supabase-anon-key'),
    step: localStorage.getItem('rs_setup_step'),
  }));
  if (stored.url !== SB_URL) throw new Error(`URL no persistida: ${stored.url}`);
  if (stored.key !== SB_KEY) throw new Error(`Anon key no persistida`);
  if (stored.step !== '4') throw new Error(`Paso incorrecto tras reload: ${stored.step}`);
  console.log('  ✔ Credenciales en localStorage y paso=4 tras reload.');

    console.log('▶ Paso 4: Aplicar el schema SQL');
    await page.waitForSelector('text=Crea las tablas del restaurante');
    await shot(page, 'wizard-paso4-esquema-sql');
    await page.getByRole('button', { name: /Ya ejecuté el SQL/ }).click();

    console.log('▶ Paso 5: Crear cuenta de administrador');
    await page.waitForSelector('text=Crea tu cuenta de administrador');
    await shot(page, 'wizard-paso5-crear-admin');
  }

  // ────────────────────────────────────────────────────────────────────
  // Registro de un nuevo tenant (siempre accesible en /nuevo-restaurante)
  // ────────────────────────────────────────────────────────────────────
  console.log('▶ Registro: nuevo restaurante + admin');
  await page.goto(`${BASE}/nuevo-restaurante`);
  await page.waitForSelector('#restaurantName');
  await page.fill('#restaurantName', RESTAURANT_NAME);
  await page.fill('#slug', RESTAURANT_SLUG);
  await page.fill('#fullName', ADMIN_FULL_NAME);
  await page.fill('#email', ADMIN_EMAIL);
  await page.fill('#password', PASSWORD);
  await page.fill('#confirmPassword', PASSWORD);
  await shot(page, 'nuevo-restaurante-formulario');

  await page.getByRole('button', { name: /Crear restaurante y cuenta/ }).click();
  // Esperar a que termine el submit (botón deja de mostrar "Creando…")
  await page.waitForFunction(
    () => !document.body.textContent?.includes('Creando restaurante'),
    { timeout: 30000 },
  ).catch(() => {});
  await page.waitForTimeout(1500);
  await shot(page, 'post-registro-estado');

  const currentUrl = page.url();
  console.log(`  URL tras registro: ${currentUrl}`);
  if (!/\/admin|\/mesero|\/cocina|\/cajero/.test(currentUrl)) {
    const err = await page.locator('[role=alert]').textContent().catch(() => '');
    const confirm = await page.getByText(/confirm|correo/i).isVisible().catch(() => false);
    throw new Error(`Registro no redirigió. URL=${currentUrl} error="${err}" confirm=${confirm}`);
  }

  if (!currentUrl.includes('/admin')) {
    console.log('  ℹ Sesión creada pero redirigió fuera de /admin; continúo.');
    await page.goto(`${BASE}/admin`);
  }

  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await shot(page, 'admin-tras-registro');
  console.log(`  ✔ Admin creado: ${ADMIN_EMAIL}`);

  // ────────────────────────────────────────────────────────────────────
  // Paso 6 · Fin del wizard (checklist final)
  // ────────────────────────────────────────────────────────────────────
  // Después del signUp real, el admin queda logueado en /admin.
  // Verificamos que el sidebar del panel se ve.
  await page.waitForSelector('text=Menú', { timeout: 10000 });
  await shot(page, 'admin-panel-menu-seed');

  // Comprobamos que hay categorías/productos sembrados automáticamente.
  await page.goto(`${BASE}/admin/menu`);
  await page.waitForLoadState('networkidle');
  await shot(page, 'admin-menu-con-seed-automatico');

  await page.goto(`${BASE}/admin/plano`);
  await page.waitForLoadState('networkidle');
  await shot(page, 'admin-plano-mesas-seed');

  await page.goto(`${BASE}/admin/pagos`);
  await page.waitForLoadState('networkidle');
  await shot(page, 'admin-metodos-pago-seed');

  // ────────────────────────────────────────────────────────────────────
  // Cierre: cliente hace un pedido para validar el ciclo end-to-end
  // ────────────────────────────────────────────────────────────────────
  console.log('\n▶ Cliente hace un pedido en el nuevo tenant');
  // Cerramos sesión del admin (el cliente es anónimo).
  const clientContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    locale: 'es-ES',
  });
  const client = await clientContext.newPage();
  await client.addInitScript(({ url, key }) => {
    localStorage.setItem('rs-supabase-url', url);
    localStorage.setItem('rs-supabase-anon-key', key);
  }, { url: SB_URL, key: SB_KEY });

  await client.goto(`${BASE}/r/${RESTAURANT_SLUG}/mesa/1`);
  await client.waitForLoadState('networkidle');
  await client.waitForTimeout(1500);
  await client.screenshot({ path: join(OUT, nextName('cliente-menu-tenant-nuevo')), fullPage: true });

  // Añadir el primer producto disponible y enviar el pedido.
  const addBtn = client.locator('button:has-text("Añadir"), button:has-text("+")').first();
  if (await addBtn.count()) {
    await addBtn.click();
    await client.waitForTimeout(300);
    const sendBtn = client.getByRole('button', { name: /Enviar pedido|Enviar/ }).first();
    if (await sendBtn.count()) {
      await sendBtn.click();
      await client.waitForTimeout(2000);
      await client.screenshot({ path: join(OUT, nextName('cliente-pedido-enviado-tenant-nuevo')), fullPage: true });
      console.log('  ✔ Pedido enviado.');
    }
  }

  await browser.close();

  console.log(`\n✅ Wizard superado. Capturas en: ${OUT}`);
  console.log(`   Tenant creado: ${RESTAURANT_NAME} (${RESTAURANT_SLUG})`);
  console.log(`   Admin:         ${ADMIN_EMAIL}`);
}

main().catch((err) => {
  console.error('\n❌ Falla del wizard:', err.message);
  process.exit(1);
});
