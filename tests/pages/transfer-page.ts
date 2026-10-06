import type { Locator, Page } from '@playwright/test';

export class TransferPage {
  readonly heading: Locator;
  readonly fromAccount: Locator;
  readonly beneficiaryName: Locator;
  readonly iban: Locator;
  readonly amount: Locator;
  readonly reference: Locator;
  readonly checkIbanButton: Locator;
  readonly ibanVerification: Locator;
  readonly continueButton: Locator;
  readonly beneficiaryNameError: Locator;
  readonly ibanError: Locator;
  readonly amountError: Locator;
  readonly insufficientFundsError: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { level: 1, name: 'New transfer' });
    this.fromAccount = page.getByLabel('From account');
    this.beneficiaryName = page.getByLabel('Beneficiary name');
    this.iban = page.getByLabel('IBAN');
    this.amount = page.getByLabel('Amount (HUF)');
    this.reference = page.getByLabel('Reference (optional)');
    this.checkIbanButton = page.getByRole('button', { name: 'Check IBAN' });
    this.ibanVerification = page.getByText(/IBAN verified: GRM-/);
    this.continueButton = page.getByRole('button', { name: 'Continue' });
    this.beneficiaryNameError = page.getByText('Enter a beneficiary name.');
    this.ibanError = page.getByText('Check the IBAN first.');
    this.amountError = page.getByText('Enter an amount greater than 0.');
    this.insufficientFundsError = page.getByText('Insufficient funds.');
  }

  async goto(): Promise<void> {
    await this.page.goto('/transfer');
  }

  async selectFromAccount(account: 'Everyday Account' | 'Savings Account'): Promise<void> {
    await this.fromAccount.selectOption({ label: account });
  }

  async useSavedPayee(name: string): Promise<void> {
    await this.page.getByRole('button', { name: `Use ${name}` }).click();
  }

  async checkIban(): Promise<void> {
    await this.checkIbanButton.click();
  }

  async fillAmount(amount: string): Promise<void> {
    await this.amount.fill(amount);
  }

  async continue(): Promise<void> {
    await this.continueButton.click();
  }
}
