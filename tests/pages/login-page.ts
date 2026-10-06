import type { Locator, Page } from '@playwright/test';

export class LoginPage {
  readonly heading: Locator;
  readonly username: Locator;
  readonly password: Locator;
  readonly signInButton: Locator;
  readonly errorMessage: Locator;
  readonly necessaryCookiesButton: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: /^(Sign in to Gremlin Bank|Welcome back)$/ });
    this.username = page.getByRole('textbox', { name: /^(Username|User ID)$/ });
    this.password = page.getByRole('textbox', { name: 'Password' });
    this.signInButton = page.getByRole('button', { name: /^(Sign in|Log in)$/ });
    this.errorMessage = page.getByText('Wrong username or password.');
    this.necessaryCookiesButton = page.getByRole('button', { name: 'Only necessary' });
  }

  async goto(): Promise<void> {
    await this.page.goto('/login');
    if (await this.necessaryCookiesButton.isVisible()) {
      await this.necessaryCookiesButton.click();
    }
  }

  async fillCredentials(username: string, password: string): Promise<void> {
    await this.username.fill(username);
    await this.password.fill(password);
  }

  async submit(): Promise<void> {
    await this.signInButton.click();
  }

  async signIn(username: string, password: string): Promise<void> {
    await this.fillCredentials(username, password);
    await this.submit();
  }
}
