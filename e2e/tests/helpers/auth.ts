import { request } from '@playwright/test';

const API_URL = 'http://localhost:8000';

export async function loginViaAPI(email: string, password: string) {
  const apiContext = await request.newContext({
    baseURL: API_URL,
  });

  const response = await apiContext.post('/auth/login', {
    data: { email, password },
  });

  if (!response.ok()) {
    throw new Error(`Login falló: ${response.status()} ${await response.text()}`);
  }

  const data = await response.json();
  return data.access_token || data.token;
}