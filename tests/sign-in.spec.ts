// spec: specs/gremlin-bank.md
// seed: seed.spec.ts
import { test, expect, env } from './fixtures';
import { DashboardPage } from './pages/dashboard-page';
import { LoginPage } from './pages/login-page';
import { TransferPage } from './pages/transfer-page';

test.describe('Authentication', () => {
  test('Sign in with valid credentials and sign out', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);
    const transferPage = new TransferPage(page);

    // 1. Open /login in a fresh context
    await loginPage.goto();
    await expect(loginPage.heading).toBeVisible();
    await expect(loginPage.username).toBeVisible();
    await expect(loginPage.password).toBeVisible();
    await expect(loginPage.signInButton).toBeVisible();

    // 2. Fill Username and Password, click 'Sign in'
    await loginPage.signIn(env('GREMLIN_USER'), env('GREMLIN_PASSWORD'));
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page).toHaveTitle('Accounts - Gremlin Bank');
    await expect(dashboardPage.heading).toBeVisible();
    await expect(dashboardPage.signedInMessage).toBeVisible();

    // 3. Click 'Sign out'
    await dashboardPage.signOut();
    await expect(page).toHaveURL(/\/login$/);
    await expect(loginPage.signInButton).toBeVisible();

    // 4. Protected pages redirect to /login after sign out
    await dashboardPage.goto();
    await expect(page).toHaveURL(/\/login$/);
    await transferPage.goto();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('Sign in rejected for empty and wrong credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);
    const transferPage = new TransferPage(page);

    await loginPage.goto();

    // 1. Submit with both fields empty
    await loginPage.submit();
    await expect(page).toHaveURL(/\/login$/);
    await expect(loginPage.errorMessage).toBeVisible();

    // 3. Correct user with an incorrect password
    await loginPage.fillCredentials(env('GREMLIN_USER'), 'not-the-password');
    await loginPage.submit();
    await expect(page).toHaveURL(/\/login$/);
    await expect(loginPage.errorMessage).toBeVisible();

    // 4. No session was created
    await dashboardPage.goto();
    await expect(page).toHaveURL(/\/login$/);
    await transferPage.goto();
    await expect(page).toHaveURL(/\/login$/);
  });
});
