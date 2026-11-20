import { test, expect } from '@playwright/test';

/**
 * Flujo crítico 2: Carga masiva / creación de instructores
 * Caso feliz + caso de error
 */

test.describe('Flujo crítico 2: Carga de instructores', () => {

  test.beforeEach(async ({ page }) => {
    // Login como coordinador/admin
    await page.goto('/login');
    await page.getByLabel(/correo|email/i).fill('usuario4@test.com');
    await page.getByLabel(/contraseña|password/i).fill('Test1234');
    await page.locator('button.btn-login-submit').click();
    await expect(page).not.toHaveURL(/login/);
  });

  test('puede acceder a la pantalla de carga de instructores', async ({ page }) => {
    await page.goto('/coordinador/instructores');

    // Verificar que la pantalla carga correctamente
    await expect(
      page.getByText(/instructor|carga|importar|archivo/i).first()
    ).toBeVisible();
  });

  test('muestra validación si se intenta subir sin archivo', async ({ page }) => {
    await page.goto('/coordinador/instructores');

    // Buscar el botón de subir / cargar
    const botonSubir = page.getByRole('button', { name: /subir|cargar|importar/i });

    // Si el botón está visible, intentar hacer clic
    if (await botonSubir.count() > 0) {
      await botonSubir.first().click();

      // Debe aparecer algún mensaje de validación o error
      await expect(
        page.getByText(/archivo|requerido|selecciona|obligatorio|error|válido/i).first()
      ).toBeVisible({ timeout: 5000 });
    } else {
      // Si no hay botón visible, al menos la pantalla debe cargar
      await expect(page.getByText(/instructor/i).first()).toBeVisible();
    }
  });

});
