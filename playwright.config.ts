import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

// Values from .env. Variables already set in your shell win (GREMLIN_RELEASE=2 npx playwright test ...).
// .env.example then fills in keys your .env does not have yet (for example a key added after you
// created .env). It never overrides a value you set.
dotenv.config({ path: path.resolve(__dirname, '.env'), quiet: true });
dotenv.config({ path: path.resolve(__dirname, '.env.example'), quiet: true });

// Optional: a Chromium binary to use instead of the one `npx playwright install chromium` downloads.
// Only for machines where the download is impossible. Never hardcode a path here.
const executablePath = process.env.PW_CHROMIUM_PATH || undefined;

// Optional: a proxy for Playwright's browser, when it cannot use the system proxy settings
// (see docs/TROUBLESHOOTING.md). Usually the same value as HTTPS_PROXY.
const proxy = process.env.PW_PROXY_SERVER
  ? { server: process.env.PW_PROXY_SERVER, bypass: process.env.PW_PROXY_BYPASS || undefined }
  : undefined;

// examples/ and tests/walls/ only run when you name them on the command line, for example
//   npx playwright test examples/brittle-css.spec.ts
//   npx playwright test tests/walls/totp.spec.ts
// so the brittle example and the unsolved walls do not show up as failures in your own suite.
// PW_RUN_ALL=1 includes them in a full run. The decision is made once in the main process and
// passed to the worker processes through the environment.
if (process.env.PW_NAMED_FOLDERS === undefined) {
  const args = process.argv.slice(2).map((arg) => arg.replace(/\\/g, '/'));
  const named = ['examples/', 'tests/walls'].filter((folder) => args.some((arg) => arg.includes(folder)));
  process.env.PW_NAMED_FOLDERS = named.join(',');
  // Lab 5 (push-login.spec.ts) needs to know whether a human is in the loop: --debug=cli or --debug.
  const debugArg = args.find((arg) => arg === '--debug' || arg.startsWith('--debug='));
  const debugMode = debugArg ? (debugArg === '--debug' ? (args[args.indexOf(debugArg) + 1] === 'cli' ? 'cli' : 'inspector') : debugArg.slice('--debug='.length)) : '';
  process.env.PW_DEBUG_MODE = debugMode;
}
const runAll = process.env.PW_RUN_ALL === '1';
const namedFolders = process.env.PW_NAMED_FOLDERS.split(',').filter(Boolean);
const optIn = (folder: string, glob: string) => (runAll || namedFolders.includes(folder) ? [] : [glob]);
// Written by tests/walls/auth.setup.ts, read by the with-auth project. Ignored by git.
const DEMO_AUTH_FILE = path.resolve(__dirname, 'playwright/.auth/demo.json');

const ignored = ['node_modules/**', 'labs/**', ...optIn('examples/', 'examples/**'), ...optIn('tests/walls', 'tests/walls/**')];

export default defineConfig({
  testDir: '.',
  testIgnore: ignored,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // One retry in CI. A test that passes only on the retry is reported as "flaky": treat that as a
  // signal to quarantine and fix the test, not as a pass (the job summary shows the flaky count).
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: 30_000,
  expect: { timeout: 7_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.GREMLIN_URL || 'https://gremlin.shiwa.io',
    // Playwright 1.63: record aria and screen snapshots in every trace ("Display Aria" in the trace viewer).
    // 'on' is deliberate for the workshop: Lab 3 reads a trace and Lab 6 keeps traces of green runs as
    // evidence. Playwright recommends 'on-first-retry' for everyday CI, because 'on' is slower.
    trace: { mode: 'on', snapshots: { dom: true, aria: true, screen: true } },
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
    launchOptions: executablePath ? { executablePath } : {},
    proxy,
  },
  projects: [
    // The default project: seed.spec.ts and everything you add under tests/.
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: [...ignored, '**/*.setup.ts'],
    },
    // Lab 5, wall 1: sign in once and save the browser state...
    {
      name: 'setup',
      testMatch: 'tests/walls/auth.setup.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    // ...then start these tests already signed in.
    {
      name: 'with-auth',
      dependencies: ['setup'],
      testMatch: 'tests/walls/auth.spec.ts',
      use: { ...devices['Desktop Chrome'], storageState: DEMO_AUTH_FILE },
    },
  ],
});
