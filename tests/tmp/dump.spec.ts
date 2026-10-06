import { test, env } from '../fixtures';
test('dump', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Username' }).fill(env('GREMLIN_USER'));
  await page.getByRole('textbox', { name: 'Password' }).fill(env('GREMLIN_PASSWORD'));
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByRole('heading', { name: 'Accounts' }).waitFor();
  await page.waitForTimeout(1500);
  console.log(await page.locator('body').ariaSnapshot());
  await page.goto('/transfer');
  await page.getByRole('button', { name: 'Use Kiss Péter' }).click();
  await page.getByRole('button', { name: 'Check IBAN' }).click();
  await page.getByLabel('Amount').fill('100333');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.waitForTimeout(1000);
  console.log(page.url());
  console.log(await page.locator('body').ariaSnapshot());
});
