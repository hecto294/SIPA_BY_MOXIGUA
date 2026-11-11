import { test, expect } from '@playwright/test';

test.describe('Ruta inexistente', () => {
  test('una URL que no existe redirige a la página principal', async ({ page }) => {
    // Arrange: una ruta que la app no define
    const rutaInventada = '/esta-pagina-no-existe';

    // Act
    await page.goto(rutaInventada);

    // Assert
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { name: '¿Qué puedes hacer con SIPA?' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Iniciar sesión/ }).first()).toBeVisible();
  });
});
