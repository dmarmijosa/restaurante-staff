/**
 * E2E de autenticación y autorización por rol: guards, redirecciones y
 * accesos cruzados (mesero no entra al panel de admin, etc.).
 */
import { expect, test } from '@playwright/test';

async function login(page: import('@playwright/test').Page, email: string, password: string) {
  await page.goto('/login');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
}

test.describe('Autenticación por roles', () => {
  test('las rutas de personal exigen sesión', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login/);
    await page.goto('/mesero');
    await expect(page).toHaveURL(/\/login/);
    // Cocina usa PIN en tablet → redirige a acceso, no al login de correo
    await page.goto('/cocina');
    await expect(page).toHaveURL(/\/cocina\/acceso/);
  });

  test('el registro legacy permanece abierto en demo (sin admin en Supabase)', async ({ page }) => {
    // En demo no hay bootstrap real en la base → bootstrapGuard no redirige.
    await page.goto('/registro-inicial');
    await expect(page).toHaveURL(/\/registro-inicial/);
    await expect(page.getByRole('heading', { name: 'Crea tu restaurante' })).toBeVisible();
  });

  test('rechaza credenciales inválidas', async ({ page }) => {
    await login(page, 'admin@demo.dev', 'incorrecta');
    await expect(page.getByRole('alert')).toContainText('Credenciales incorrectas');
  });

  test('admin entra al panel completo', async ({ page }) => {
    await login(page, 'admin@demo.dev', 'admin123');
    await expect(page).toHaveURL(/\/admin\/plano/);
    await expect(page.getByRole('heading', { name: 'Plano del salón' })).toBeVisible();
    await expect(page.getByText('Panel de administración')).toBeVisible();
  });

  test('mesero va a su tablet y no puede entrar al admin', async ({ page }) => {
    await login(page, 'mesero@demo.dev', 'mesero123');
    await expect(page).toHaveURL(/\/mesero/);
    await expect(page.getByText('PEDIDOS ACTIVOS', { exact: true })).toBeVisible();

    await page.goto('/admin');
    await expect(page).toHaveURL(/\/mesero/);
  });

  test('cocina ve su pantalla de comandas', async ({ page }) => {
    await login(page, 'cocina@demo.dev', 'cocina123');
    await expect(page).toHaveURL(/\/cocina/);
    await expect(page.getByRole('heading', { name: 'Cocina' })).toBeVisible();
    await expect(page.getByText('comandas en cola')).toBeVisible();
  });
});
