import type { Locator, Page } from '@playwright/test';

export class ReviewPage {
  readonly heading: Locator;
  readonly transferDetails: Locator;
  readonly confirmButton: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Review transfer' });
    this.transferDetails = page.getByRole('table', { name: 'Transfer details' });
    this.confirmButton = page.getByRole('button', { name: 'Confirm transfer' });
  }

  detailsRow(name: string | RegExp): Locator {
    return this.transferDetails.getByRole('row', { name });
  }

  async goto(): Promise<void> {
    await this.page.goto('/transfer/review');
  }
}
