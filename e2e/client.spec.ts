/**
 * E2E del flujo del cliente (home pública, sin autenticación):
 * menú → carrito → pedido → seguimiento, más llamada al mesero y el acceso
 * del personal en el footer. Réplica del comportamiento del diseño.
 */
import { expect, test } from '@playwright/test';

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
    await page.getByRole('button', { name: 'Agregar Tostadas de tinga' }).click();
    await page.getByRole('button', { name: 'Agregar Sopa de tortilla' }).click();
    await page.getByRole('button', { name: 'Agregar Sopa de tortilla' }).click();

    // Barra flotante con total: 6.50 + 2×7.00 = 20.50
    const cartBar = page.getByRole('button', { name: /Ver pedido · 3 artículos/ });
    await expect(cartBar).toContainText('$20.50');
    await cartBar.click();

    await expect(page.getByRole('heading', { name: 'Tu pedido' })).toBeVisible();
    await page.getByRole('button', { name: 'Enviar pedido a la mesa' }).click();

    await expect(page.getByRole('heading', { name: 'Pedido enviado' })).toBeVisible();
    await expect(page.getByText('Pedido recibido')).toBeVisible();
    await expect(page.getByText('Tu mesero esta noche')).toBeVisible();
  });

  test('llama al mesero una sola vez', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Llamar mesero' }).click();
    await expect(page.getByRole('button', { name: 'Mesero avisado ✓' })).toBeVisible();
  });

  test('el footer tiene el acceso del personal', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('staff-login-link').click();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: 'Acceso del personal' })).toBeVisible();
  });
});
