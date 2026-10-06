// spec: specs/gremlin-bank.md
// seed: seed.spec.ts
import { test, expect, env } from './fixtures';
import { DashboardPage } from './pages/dashboard-page';
import { LoginPage } from './pages/login-page';
import { ReviewPage } from './pages/review-page';
import { TransferPage } from './pages/transfer-page';

async function fillTransfer(
  transferPage: TransferPage,
  amount: string,
  account?: 'Everyday Account' | 'Savings Account',
) {
  if (account) {
    await transferPage.selectFromAccount(account);
  }
  await transferPage.useSavedPayee('Kiss Péter');
  await transferPage.checkIban();
  await expect(transferPage.ibanVerification).toBeVisible();
  await transferPage.fillAmount(amount);
  await transferPage.continue();
}

test.describe('Domestic transfer', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);
    await loginPage.goto();
    await loginPage.signIn(env('GREMLIN_USER'), env('GREMLIN_PASSWORD'));
    await expect(dashboardPage.heading).toBeVisible();
    await new TransferPage(page).goto();
  });

  test('Empty transfer form shows required-field errors', async ({ page }) => {
    const transferPage = new TransferPage(page);
    await transferPage.continue();
    await expect(transferPage.beneficiaryNameError).toBeVisible();
    await expect(transferPage.ibanError).toBeVisible();
    await expect(transferPage.amountError).toBeVisible();
    await expect(page).toHaveURL(/\/transfer$/);
  });

  test('Transfer of 1,000 HUF reaches the review page with fee 200 and total 1,200', async ({ page }) => {
    const transferPage = new TransferPage(page);
    const reviewPage = new ReviewPage(page);
    await fillTransfer(transferPage, '1000');
    await expect(page).toHaveURL(/\/transfer\/review/);
    await expect(reviewPage.heading).toBeVisible();
    await expect(reviewPage.detailsRow(/Amount/)).toContainText('1,000 HUF');
    await expect(reviewPage.detailsRow(/Fee/)).toContainText('200 HUF');
    await expect(reviewPage.detailsRow(/Total/)).toContainText('1,200 HUF');
    await expect(reviewPage.confirmButton).toBeVisible();
  });

  test('Insufficient funds when amount plus fee exceeds the balance', async ({ page }) => {
    const transferPage = new TransferPage(page);
    await fillTransfer(transferPage, '1247000');
    await expect(transferPage.insufficientFundsError).toBeVisible();
    await expect(page).toHaveURL(/\/transfer$/);
  });

  const fees = [
    {
      amount: '66700',
      fee: '200 HUF',
      release3Fee: '2,001 HUF',
      total: '66,900 HUF',
      name: 'minimum fee applies up to 66,700',
    },
    {
      amount: '100000',
      fee: '300 HUF',
      release3Fee: '3,000 HUF',
      total: '100,300 HUF',
      name: 'percentage band at 100,000',
    },
    {
      amount: '100333',
      fee: '301 HUF',
      release3Fee: '3,010 HUF',
      total: '100,634 HUF',
      name: 'rounding to nearest HUF at 100,333',
    },
  ];
  for (const { amount, fee, release3Fee, total, name } of fees) {
    test(`Fee boundary: ${name}`, async ({ page, gremlinRelease }) => {
      // BUG: Release 3 charges 3% instead of the expected 0.3% fee; the marker message gives this case's expected and observed values.
      test.fail(
        gremlinRelease === 3,
        `BUG: expected ${fee} under the 0.3% rule, observed ${release3Fee}. Not healed, see heal-report.json.`,
      );
      const transferPage = new TransferPage(page);
      const reviewPage = new ReviewPage(page);
      await fillTransfer(transferPage, amount);
      await expect(page).toHaveURL(/\/transfer\/review/);
      await expect(reviewPage.detailsRow(/Fee/)).toContainText(fee);
      await expect(reviewPage.detailsRow(/Total/)).toContainText(total);
    });
  }

  test(
    'Fee boundary: maximum fee 6,000 for 2,000,000 from Savings Account',
    async ({ page, gremlinRelease }) => {
      // BUG: fee on Release 3 is 3%: expected 6,000 HUF at 2,000,000 HUF (0.3%), observed 60,000 HUF. Not healed, see heal-report.json.
      test.fail(gremlinRelease === 3, 'BUG: Release 3 fee calculation differs from the 0.3% business rule.');
      const transferPage = new TransferPage(page);
      const reviewPage = new ReviewPage(page);
      await fillTransfer(transferPage, '2000000', 'Savings Account');
      await expect(page).toHaveURL(/\/transfer\/review/);
      await expect(reviewPage.detailsRow(/Fee/)).toContainText('6,000 HUF');
      await expect(reviewPage.detailsRow(/Total/)).toContainText('2,006,000 HUF');
    },
  );
});
