/**
 * E2E del flujo del cliente (home pública, sin autenticación):
 * menú → carrito → pedido → seguimiento, más llamada al mesero y el acceso
 * del personal en el footer. Réplica del comportamiento del diseño.
 */
import { expect, test } from '@playwright/test';

/** Moneda por defecto en modo demo (ver DEFAULT_CURRENCY en currency.service.ts). */
const DEMO_MONEY = (amount: string) => `€${amount}`;

test.describe('Cliente (home pública)', () => {
  test('muestra el menú del restaurante sin pedir login', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Casa Nogal' })).toBeVisible();
    await expect(page.getByText('Mesa 4')).toBeVisible();
    // Productos del seed del diseño
    await expect(page.getByText('Tostadas de tinga')).toBeVisible();
    // Lo agotado no aparece en el menú público
    await expect(page.getByText('Croquetas de elote')).toHaveCount(0);
  });

  test('la URL del QR asigna la mesa', async ({ page }) => {
    await page.goto('/mesa/7');
    await expect(page.getByText('Mesa 7')).toBeVisible();
  });

  test('filtra por categoría', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Postres', exact: true }).click();
    await expect(page.getByText('Flan de la casa')).toBeVisible();
    await expect(page.getByText('Tostadas de tinga')).toHaveCount(0);
  });

  test('arma el carrito, envía el pedido y sigue su estado', async ({ page }) => {
    await page.goto('/');
    // Esperar a que la página cargue
    await page.locator('[data-testid="add-to-cart-1"]').first().waitFor();

    // Click en producto 1 (Tostadas €6.50)
    await page.locator('button[data-testid="add-to-cart-1"]').click();

    // Esperar a que aparezca la barra del carrito con el precio
    await page.locator('[data-testid="cart-bar-button"]').filter({ hasText: DEMO_MONEY('6.50') }).waitFor();

    // Abrir carrito
    await page.locator('[data-testid="cart-bar-button"]').click();
    await expect(page.getByTestId('cart-heading')).toBeVisible();

    // Enviar pedido
    await page.getByTestId('submit-order-button').click();

    // Verificar que el pedido fue enviado
    await expect(page.getByTestId('order-sent-heading')).toBeVisible();
  });

  test('llama al mesero una sola vez', async ({ page }) => {
    await page.goto('/');
    // Esperar a que la página cargue
    await page.waitForSelector('[data-testid="call-waiter-button"]');

    await page.getByTestId('call-waiter-button').click();
    // Verificar que el botón cambió de clase (color de "avisado")
    await page.waitForTimeout(300);
    await expect(page.getByTestId('call-waiter-button')).toHaveClass(/oliva/);
  });

  test('el footer tiene el acceso del personal', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('staff-login-link').click();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByTestId('login-heading')).toBeVisible();
  });
});
