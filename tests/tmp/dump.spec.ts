import { test, expect, env } from '../fixtures';
import { DashboardPage } from '../pages/dashboard-page';
import { LoginPage } from '../pages/login-page';
import { ReviewPage } from '../pages/review-page';
import { TransferPage } from '../pages/transfer-page';

test('dump', async ({ page }) => {
  const loginPage = new LoginPage(page);
  const dashboardPage = new DashboardPage(page);
  const transferPage = new TransferPage(page);
  const reviewPage = new ReviewPage(page);

  await loginPage.goto();
  await loginPage.signIn(env('GREMLIN_USER'), env('GREMLIN_PASSWORD'));
  await expect(dashboardPage.heading).toBeVisible();
  console.log(await page.locator('body').ariaSnapshot());
  await transferPage.goto();
  await transferPage.useSavedPayee('Kiss Péter');
  await transferPage.checkIban();
  await expect(transferPage.ibanVerification).toBeVisible();
  await transferPage.fillAmount('100333');
  await transferPage.continue();
  await expect(reviewPage.heading).toBeVisible();
  console.log(page.url());
  console.log(await page.locator('body').ariaSnapshot());
});
