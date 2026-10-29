import { test, expect } from '@playwright/test';

test.describe('Pruebas E2E con page.route (Semana 5)', () => {
  
  test('Debe mostrar error si el login falla (500)', async ({ page }) => {
    await page.route('**/auth/login', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Error simulado del servidor' })
      });
    });

    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@test.com');
    await page.fill('input[type="password"]', '123456');
    await page.click('button[type="submit"]');

    await expect(page.locator('body')).toContainText('Error'); 
  });

  test('Debe redirigir al dashboard si el login es exitoso', async ({ page }) => {
    await page.route('**/auth/login', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ access_token: 'token-falso-123', token_type: 'bearer' })
      });
    });

    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@test.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');

    await expect(page).not.toHaveURL(/.*login/);
  });
});
