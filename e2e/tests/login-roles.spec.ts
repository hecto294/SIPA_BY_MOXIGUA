import { test, expect } from '@playwright/test';

/**
 * Flujo crítico 1: Login + redirección según rol
 * Caso feliz + caso de error
 */

test.describe('Login y redirección por rol', () => {

  test('login exitoso redirige según el rol del usuario', async ({ page }) => {
    // Ir a la página de login
    await page.goto('/login');

    // Llenar credenciales (ajusta email/password si son diferentes en tu BD de pruebas)
    await page.getByLabel(/correo|email/i).fill('usuario4@test.com');
    await page.getByLabel(/contraseña|password/i).fill('password123'); // cambia si es otra

    // Clic en el botón de iniciar sesión
    await page.getByRole('button', { name: /iniciar sesión|ingresar|entrar/i }).click();

    // Verificar que redirigió (no estamos en /login)
    await expect(page).not.toHaveURL(/login/);

    // Verificar que aparece algo del dashboard / layout del rol
    // Ajusta este selector según lo que vea el usuario después de loguearse
    await expect(page.getByRole('navigation').or(page.getByText(/dashboard|inicio|bienvenido/i))).toBeVisible();
  });

  test('login con credenciales incorrectas muestra error', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel(/correo|email/i).fill('correo-inexistente@test.com');
    await page.getByLabel(/contraseña|password/i).fill('clave-mala-123');

    await page.getByRole('button', { name: /iniciar sesión|ingresar|entrar/i }).click();

    // Debe mostrar mensaje de error visible para el usuario
    await expect(page.getByText(/incorrecto|inválido|error|credenciales/i)).toBeVisible();

    // Debe seguir en la página de login
    await expect(page).toHaveURL(/login/);
  });

});