import { test, expect, env } from './tests/fixtures';
import { LoginPage } from './tests/pages/login-page';

// Seed for the Playwright Test Agents. The planner and the generator run this test first
// and continue from the page it leaves open: the Gremlin Bank dashboard, signed in.
// The user and password come from .env (GREMLIN_USER, GREMLIN_PASSWORD).

test.describe('Gremlin Bank', () => {
  test('seed', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.signIn(env('GREMLIN_USER'), env('GREMLIN_PASSWORD'));
    await expect(page.getByRole('heading', { level: 1, name: 'Accounts' })).toBeVisible();
  });
});
