import type { Locator, Page } from '@playwright/test';

export class DashboardPage {
  readonly heading: Locator;
  readonly loadingMessage: Locator;
  readonly newTransferLink: Locator;
  readonly paymentsButton: Locator;
  readonly transactionsTable: Locator;
  readonly showChartDataButton: Locator;
  readonly hideChartDataButton: Locator;
  readonly chartDataTableAny: Locator;
  readonly chartDataTable: Locator;
  readonly signedInMessage: Locator;
  readonly signOutButton: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { level: 1, name: 'Accounts' });
    this.loadingMessage = page.getByText('Loading accounts...');
    this.newTransferLink = page
      .getByRole('link', { name: 'New transfer' })
      .or(page.getByRole('menuitem', { name: 'New transfer' }));
    this.paymentsButton = page.getByRole('button', { name: 'Payments' });
    this.transactionsTable = page.getByRole('table', { name: 'Recent transactions' });
    this.showChartDataButton = page.getByRole('button', { name: 'Show chart data' });
    this.hideChartDataButton = page.getByRole('button', { name: 'Hide chart data' });
    this.chartDataTableAny = page.getByRole('table', { name: /GRM-CHART-/ });
    this.chartDataTable = page.getByRole('table', { name: /GRM-CHART-[A-Z0-9]+/ });
    this.signedInMessage = page.getByText('Signed in as');
    this.signOutButton = page.getByRole('button', { name: 'Sign out' });
  }

  account(name: 'Everyday Account' | 'Savings Account'): Locator {
    const accountRegion = this.page.getByRole('region', { name });
    const accountRow = this.page
      .getByRole('row')
      .filter({ has: this.page.getByRole('rowheader', { name, exact: true }) });
    return accountRegion.or(accountRow);
  }

  accountIban(name: 'Everyday Account' | 'Savings Account'): Locator {
    return this.account(name).getByText(/^HU\d{2}( \d{4}){6}$/);
  }

  accountBalance(name: 'Everyday Account' | 'Savings Account'): Locator {
    return this.account(name).getByText(/^[\d,]+ HUF$/);
  }

  transactionRows(): Locator {
    return this.transactionsTable.getByRole('row').filter({ has: this.page.getByRole('cell') });
  }

  transactionAmountCells(): Locator {
    return this.transactionRows().getByRole('cell').filter({ hasText: /HUF/ });
  }

  async goto(): Promise<void> {
    await this.page.goto('/dashboard');
  }

  async showChartData(): Promise<void> {
    await this.showChartDataButton.click();
  }

  async openPayments(): Promise<void> {
    await this.paymentsButton.click();
  }

  async hideChartData(): Promise<void> {
    await this.hideChartDataButton.click();
  }

  async signOut(): Promise<void> {
    await this.signOutButton.click();
  }
}
