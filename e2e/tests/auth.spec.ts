import { test, expect } from '@playwright/test';

test.describe('Flujo de Autenticación SIPA', () => {
  
  test('Debería cargar la página principal', async ({ page }) => {
    // Ir a la página
    await page.goto('/'); 
    
    // Tomar captura para ver qué carga (luego la borramos)
    await page.screenshot({ path: 'screenshot-inicial.png' });
  });
});
