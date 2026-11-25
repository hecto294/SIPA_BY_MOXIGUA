import { test, expect } from '@playwright/test';

test.describe('Flujo crítico 1: Login por roles', () => {
  test('Usuario válido puede iniciar sesión y es redirigido', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel(/correo|email/i).fill('usuario4@test.com');
    await page.getByLabel(/contraseña|password/i).fill('Test1234');

    // Selector específico del botón de submit
    await page.locator('button.btn-login-submit').click();

    // Esperamos que salga de la página de login
    await expect(page).not.toHaveURL(/.*login.*/);
  });

  test('Credenciales incorrectas muestran error', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel(/correo|email/i).fill('usuario_invalido@test.com');
    await page.getByLabel(/contraseña|password/i).fill('clave_mala');

    await page.locator('button.btn-login-submit').click();

    // Debe quedarse en login
    await expect(page).toHaveURL(/.*login.*/);
  });
});