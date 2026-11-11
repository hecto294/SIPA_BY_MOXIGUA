import { test, expect } from '@playwright/test';

test.describe('Flujo Landing → Registro', () => {
  test('desde la página principal, "Registrarse" abre el formulario de creación de cuenta', async ({ page }) => {
    // Arrange
    await page.goto('/');

    // Act
    await page.getByRole('link', { name: /Registrarse/i }).first().click();

    // Assert
    await expect(page).toHaveURL(/\/register$/);
    await expect(page.getByRole('heading', { name: 'Crear cuenta en SIPA' })).toBeVisible();
    await expect(page.getByPlaceholder('Ingresa tus nombres')).toBeVisible();
    await expect(page.getByRole('button', { name: /Registrarme/ })).toBeVisible();
  });
});
