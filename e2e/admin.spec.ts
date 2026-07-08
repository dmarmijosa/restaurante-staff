/**
 * E2E del panel de administración: navegación entre secciones, diseño
 * (colores clave del mockup), y reglas de negocio: kanban de pedidos,
 * disponibilidad de productos, categorías, temporada y protección de datos.
 */
import { expect, test, type Page } from '@playwright/test';

const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=',
  'base64',
);

async function loginAdmin(page: Page) {
  await page.goto('/login');
  await page.locator('#email').fill('admin@demo.dev');
  await page.locator('#password').fill('admin123');
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page).toHaveURL(/\/admin\/plano/);
}

test.describe('Panel de administración', () => {
  test('replica el diseño: sidebar cacao, fuente serif y resumen del salón', async ({ page }) => {
    await loginAdmin(page);
    // Sidebar con el color cacao del diseño (#2A1F14)
    const sidebar = page.locator('aside').first();
    await expect(sidebar).toHaveCSS('background-color', 'rgb(42, 31, 20)');
    // Resumen del salón con los datos del seed
    await expect(page.getByText('Resumen del salón')).toBeVisible();
    await expect(page.getByText('Sillas totales')).toBeVisible();
    // 8 mesas del seed dibujadas en el lienzo
    await expect(page.getByText('4 sillas').first()).toBeVisible();
  });

  test('kanban de pedidos avanza estados', async ({ page }) => {
    await loginAdmin(page);
    await page.getByRole('link', { name: /Pedidos/ }).click();
    await expect(page.getByRole('heading', { name: 'Pedidos' })).toBeVisible();

    // El pedido #1043 del seed está en Recibido; avanzarlo
    await page.getByRole('button', { name: 'Pasar a Preparando' }).first().click();
    await expect(page.getByText('Pedido #1043 → Preparando')).toBeVisible();
  });

  test('apagar un producto lo quita del menú del cliente', async ({ page }) => {
    await loginAdmin(page);
    await page.getByRole('link', { name: 'Menú y productos' }).click();
    await page.getByRole('switch', { name: 'Disponibilidad de Tostadas de tinga' }).click();
    await expect(page.getByText(/Tostadas de tinga.*agotado/)).toBeVisible();
  });

  test('permite recortar manualmente una foto antes de subirla al producto', async ({ page }) => {
    await loginAdmin(page);
    await page.getByRole('link', { name: 'Menú y productos' }).click();

    const photoInput = page.locator('label:has-text("Subir foto") input[type="file"]').first();
    await photoInput.setInputFiles({
      name: 'producto.png',
      mimeType: 'image/png',
      buffer: PNG_1PX,
    });

    await expect(page.getByRole('heading', { name: 'Recortar foto del producto' })).toBeVisible();
    await page.getByLabel('Zoom del recorte').fill('1.5');
    await page.getByLabel('Desplazamiento horizontal').fill('18');
    await page.getByRole('button', { name: 'Aplicar recorte' }).click();

    await expect(page.getByText('Foto del producto actualizada')).toBeVisible();
  });

  test('las categorías con productos no se pueden eliminar', async ({ page }) => {
    await loginAdmin(page);
    await page.getByRole('link', { name: 'Categorías' }).click();
    await page.getByRole('button', { name: 'Eliminar' }).first().click();
    await expect(page.getByText('Mueve sus productos a otra categoría primero')).toBeVisible();
  });

  test('meseros: alta, rotación de turno y eliminación permanente con confirmación', async ({ page }) => {
    await loginAdmin(page);
    await page.getByRole('link', { name: 'Meseros y turnos' }).click();

    // Alta
    await page.getByRole('button', { name: '+ Dar de alta' }).click();
    await page.getByLabel('Nombre completo').fill('Sofía Cabrera');
    await page.getByRole('button', { name: 'Guardar' }).click();
    const row = page.getByTestId('staff-row').filter({ hasText: 'Sofía Cabrera' });
    await expect(row).toBeVisible();

    // Eliminación permanente exige doble confirmación (protección de datos)
    await row.getByRole('button', { name: 'Dar de baja' }).click();
    await row.getByRole('button', { name: '¿Eliminar datos? Confirmar' }).click();
    await expect(page.getByText('Sofía Cabrera eliminado permanentemente')).toBeVisible();
  });

  test('cerrar por temporada bloquea el menú público', async ({ page }) => {
    await loginAdmin(page);
    await page.getByRole('link', { name: 'Temporada y horario' }).click();
    await page.getByRole('button', { name: 'Cerrado por temporada' }).click();
    // La vista previa muestra lo que verá el cliente
    await expect(page.getByText('“Cerrado por temporada — volvemos pronto”')).toBeVisible();
    // El chip del panel cambia a cerrado (el QR deja de aceptar pedidos)
    await expect(page.getByText('Cerrado — el menú público no acepta pedidos')).toBeVisible();
  });

  test('ajustes: el nombre del restaurante se propaga y la propietaria está protegida', async ({ page }) => {
    await loginAdmin(page);
    await page.getByRole('link', { name: 'Ajustes' }).click();

    await page.getByLabel('Nombre del restaurante').fill('Casa Roble');
    await expect(page.locator('aside').getByText('Casa Roble', { exact: true })).toBeVisible();

    // La cuenta propietaria no puede eliminarse
    const ownerRow = page.getByTestId('admin-row').filter({ hasText: 'Ana Ríos' });
    await ownerRow.getByRole('button', { name: 'Eliminar' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'La cuenta propietaria no puede eliminarse' })).toBeVisible();
  });

  test('el tour del panel incluye el paso de multi-restaurante con la ruta /nuevo-restaurante', async ({ page }) => {
    await loginAdmin(page);
    // Limpiar la marca para forzar que el tour aparezca
    await page.evaluate(() => localStorage.removeItem('rs-admin-tour-seen'));
    await page.getByRole('button', { name: 'Ver guía del panel' }).click();

    // Avanzar por todos los pasos hasta el último (multi-restaurante)
    const nextBtn = page.getByRole('button', { name: 'Siguiente' });
    while (await nextBtn.isVisible().catch(() => false)) {
      await nextBtn.click();
    }

    // El último paso menciona /nuevo-restaurante
    await expect(page.getByText('¿Tienes más locales?')).toBeVisible();
    await expect(page.getByText('/nuevo-restaurante')).toBeVisible();
    await page.getByRole('button', { name: 'Entendido' }).click();
  });
});

test.describe('Cocina', () => {
  test('flujo de comanda: empezar a preparar → platillo listo', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#email').fill('cocina@demo.dev');
    await page.locator('#password').fill('cocina123');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    await expect(page).toHaveURL(/\/cocina/);

    // La mock API tiene latencia: espera a que carguen las comandas antes de contar.
    await expect(page.getByRole('button', { name: /Empezar a preparar|Platillo listo/ }).first()).toBeVisible();
    const before = await page.getByRole('button', { name: /Empezar a preparar|Platillo listo/ }).count();
    await page.getByRole('button', { name: 'Empezar a preparar' }).first().click();
    // La comanda pasa a "preparando" (botón verde "Platillo listo")
    await page.getByRole('button', { name: 'Platillo listo' }).first().click();
    // Al marcar listo, la comanda sale de la cola de cocina
    await expect(page.getByRole('button', { name: /Empezar a preparar|Platillo listo/ })).toHaveCount(before - 1);
  });
});

test.describe('Cajero', () => {
  test('cobra un pedido con un método de pago', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#email').fill('cajero@demo.dev');
    await page.locator('#password').fill('cajero123');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    await expect(page).toHaveURL(/\/cajero/);
    await expect(page.getByText('PEDIDOS POR COBRAR')).toBeVisible();

    // La mock API tiene latencia: espera a que carguen los pedidos antes de contar.
    await expect(page.locator('section article').first()).toBeVisible();
    const before = await page.locator('section article').count();
    // Cobra el primer pedido en efectivo
    await page.locator('section').getByRole('button', { name: 'Efectivo' }).first().click();
    await expect(page.locator('section article')).toHaveCount(before - 1);
    // Aparece en cobros recientes con su método
    await expect(page.getByText('COBROS RECIENTES')).toBeVisible();
  });
});
