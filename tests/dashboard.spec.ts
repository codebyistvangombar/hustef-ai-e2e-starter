// spec: specs/gremlin-bank.md
// seed: seed.spec.ts
import { test, expect, env } from './fixtures';
import { DashboardPage } from './pages/dashboard-page';
import { LoginPage } from './pages/login-page';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);
    await loginPage.goto();
    await loginPage.signIn(env('GREMLIN_USER'), env('GREMLIN_PASSWORD'));
    await expect(dashboardPage.heading).toBeVisible();
  });

  test('Dashboard accounts overview', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    // 1. Wait for the accounts to load
    await expect(dashboard.loadingMessage).toBeHidden();
    await expect(dashboard.account('Everyday Account')).toBeVisible();
    await expect(dashboard.account('Savings Account')).toBeVisible();

    // 2. IBAN and balance formats
    for (const accountName of ['Everyday Account', 'Savings Account'] as const) {
      await expect(dashboard.accountIban(accountName)).toBeVisible();
      await expect(dashboard.accountBalance(accountName)).toBeVisible();
    }

    // 3. Page extras
    await expect(dashboard.newTransferLink).toHaveAttribute('href', '/transfer');
  });

  test('Recent transactions table', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    // 1. Locate the table
    await expect(dashboard.transactionsTable.getByRole('columnheader')).toHaveText([
      'Date',
      'Description',
      'Amount',
    ]);

    // 2. Rows
    const rows = dashboard.transactionRows();
    await expect(rows.first()).toBeVisible();
    await expect(rows.first().getByRole('cell').first()).toHaveText(/^\d{4}-\d{2}-\d{2}$/);
    for (const amount of await dashboard.transactionAmountCells().all()) {
      await expect(amount).toHaveText(/^[+-][\d,]+ HUF$/);
    }
  });

  test('Spending chart data toggle', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    // 1. Data table hidden initially
    await expect(dashboard.showChartDataButton).toBeVisible();
    await expect(dashboard.chartDataTableAny).toBeHidden();

    // 2. Show chart data
    await dashboard.showChartData();
    await expect(dashboard.hideChartDataButton).toBeVisible();
    const table = dashboard.chartDataTable;
    await expect(table).toBeVisible();

    // 3. 30 daily rows
    await expect(table.getByRole('row')).toHaveCount(31);

    // 4. Hide again
    await dashboard.hideChartData();
    await expect(table).toBeHidden();
    await expect(dashboard.showChartDataButton).toBeVisible();
  });
});
