# Gremlin Bank Test Plan

## Application Overview

Gremlin Bank (https://gremlin.shiwa.io) is a fictional demo bank. Covered: sign in/out (/login), dashboard (/dashboard: accounts, spending chart data, recent transactions) and domestic HUF transfer (/transfer -> /transfer/review -> PIN confirmation). Credentials come from env vars GREMLIN_USER, GREMLIN_PASSWORD, GREMLIN_PIN (never hardcode). Every scenario starts from a fresh browser context.

Observed rules (from UI only):
- Limits text on /transfer: "up to 10,000,000 HUF per transfer and 2,000,000 HUF per day."
- Business rule (the oracle for the tests, not the page output): fee = 0.3% of the amount, rounded to the nearest HUF, at least 200 HUF and at most 6,000 HUF. Total = amount + fee. Expected values in the scenarios are computed from this rule and the limits. Where the page disagrees, that is a defect, not a reason to change the expectation. Exploration matched the rule: 200 for amounts <=66,700; 300 at 99,999 and 100,000; 301 at 100,333; 450 at 150,000; 1,500 at 500,000; 3,000 at 1,000,000. The cap is not reachable above 2,000,000 HUF because of the daily limit, so 2,000,000 -> 6,000 is the highest observable fee.
- Risk tags: every scenario title carries [high], [medium] or [low]. Money movement and money validation are [high].
- Random data (tip of the day, EUR/HUF rate, GRM-... codes) is never asserted by value, only by format or presence.
- Funds check includes the fee: with a 1,250,000 HUF balance, 1,246,000 is accepted (fee 3,738) while 1,247,000 shows "Insufficient funds." Validation order observed: 'Enter an amount greater than 0.' / 'Insufficient funds.' / 'Daily limit of 2,000,000 HUF exceeded.' / 'The maximum single transfer is 10,000,000 HUF.' (the funds message wins for amounts <=2,000,000 with the default account).
- Beneficiary IBAN must be verified via the 'Check IBAN' button (status 'IBAN verified: <code>' / 'Invalid IBAN'); the 'Use' buttons on saved payees fill name and IBAN but still require 'Check IBAN'. The format of codes such as GRM-... is random-looking: assert format only (/^GRM-[A-Z0-9]+-[A-Z0-9]{4}$/), never exact values.
- Confirmation: 'Confirm transfer' is expected to open a 'Gremlin Secure' PIN dialog (iframe, title 'Gremlin Secure', src /secure/challenge). In exploration the dialog did not open and 'Wrong PIN.' (data-testid pin-error) appeared instead; the PIN iframe content could not be observed, so the happy-path confirmation steps are best-effort and must be verified when authoring tests. Some elements (accounts, chart data, status) render asynchronously ('Loading accounts...'): use web-first assertions/auto-waiting, no fixed sleeps.
Seed: seed.spec.ts (signs in and lands on /dashboard).

## Test Scenarios

### 1. Authentication

**Seed:** `seed.spec.ts`

#### 1.1. Sign in with valid credentials and sign out [high]
**File:** `tests/auth/sign-in-out.spec.ts`

**Steps:**
  1. Open /login in a fresh context (no session). Verify heading 'Sign in to Gremlin Bank' and Username, Password fields and 'Sign in' button.
    - expect: Login form is visible
  2. Fill Username with GREMLIN_USER and Password with GREMLIN_PASSWORD, click 'Sign in'.
    - expect: URL becomes /dashboard
    - expect: Page title 'Accounts - Gremlin Bank'; heading 'Accounts' visible
    - expect: Header shows 'Signed in as' followed by the signed-in user name
  3. Click 'Sign out'.
    - expect: Redirected to /login
    - expect: Sign in form visible again
  4. Navigate directly to /dashboard, then to /transfer.
    - expect: Both redirect to /login (session ended)

#### 1.2. Sign in rejected for invalid or empty credentials [high]
**File:** `tests/auth/sign-in-negative.spec.ts`

**Steps:**
  1. On /login click 'Sign in' with both fields empty.
    - expect: Stays on /login
    - expect: Alert 'Wrong username or password.' shown
  2. Enter an unknown username with a wrong password (non-secret placeholder values) and submit.
    - expect: Stays on /login
    - expect: 'Wrong username or password.' shown; no hint which field is wrong
  3. Enter GREMLIN_USER with an incorrect password and submit.
    - expect: Same generic error, no session created
  4. Without signing in, open /dashboard, /transfer and /transfer/review directly.
    - expect: Each redirects to /login

### 2. Dashboard

**Seed:** `seed.spec.ts`

#### 2.1. Dashboard accounts overview [medium]
**File:** `tests/dashboard/accounts.spec.ts`

**Steps:**
  1. Sign in and wait for 'Loading accounts...' to disappear.
    - expect: Two account regions: 'Everyday Account' and 'Savings Account'
  2. Inspect each account region.
    - expect: Each shows an IBAN matching /^HU\d{2}( \d{4}){6}$/ (28 chars grouped by 4)
    - expect: Balance matches /^[\d,]+ HUF$/ with thousands separators
    - expect: Everyday balance equals 'Available' on /transfer for that account
  3. Verify page extras.
    - expect: 'Security check passed. Code GRM-...' image has the code format only
    - expect: 'Session code: GRM-...' matches format
    - expect: Exchange rate card shows EUR/HUF with a positive decimal number
    - expect: 'New transfer' link points to /transfer
    - expect: Tip of the day card is visible

#### 2.2. Recent transactions table [medium]
**File:** `tests/dashboard/recent-transactions.spec.ts`

**Steps:**
  1. Locate table 'Recent transactions'.
    - expect: Column headers Date, Description, Amount
  2. Read all rows.
    - expect: Rows are non-empty (observed 5)
    - expect: Dates match YYYY-MM-DD and are in descending order
    - expect: Amounts match /^[+-][\d,]+ HUF$/; credits start with '+', debits with '-'
    - expect: Descriptions are non-empty

#### 2.3. Spending chart data toggle and consistency [low]
**File:** `tests/dashboard/chart-data.spec.ts`

**Steps:**
  1. Locate 'Spending in the last 30 days' section; confirm chart data table is hidden and button reads 'Show chart data'.
    - expect: No data table visible initially
  2. Click 'Show chart data'.
    - expect: Button becomes 'Hide chart data'
    - expect: Table with Date/Amount columns appears with caption containing a code matching GRM-CHART-xxxx format (do not assert exact value)
  3. Validate the table contents.
    - expect: 30 consecutive daily rows ending at today's date, ascending, YYYY-MM-DD
    - expect: Each amount matches /^[\d,]+ HUF$/ and is >= 0 (0 HUF allowed)
  4. Click 'Hide chart data'.
    - expect: Table hidden again; button text returns to 'Show chart data'

### 3. Domestic transfer

**Seed:** `seed.spec.ts`

#### 3.1. Transfer form layout, saved payees and empty-submit validation [medium]
**File:** `tests/transfer/form-validation.spec.ts`

**Steps:**
  1. From dashboard click 'New transfer'.
    - expect: URL /transfer, heading 'New transfer', 'Back to accounts' link to /dashboard
    - expect: Fields: From account (Everyday default, Savings option), Beneficiary name, IBAN + 'Check IBAN', Amount (HUF), Reference (optional), 'Continue'
    - expect: 'Available: 1,250,000 HUF' style text for the selected account
    - expect: Three saved payees with 'Use' buttons and the limits text
  2. Click 'Continue' with all fields empty.
    - expect: 'Enter a beneficiary name.'
    - expect: 'Check the IBAN first.'
    - expect: 'Enter an amount greater than 0.'
    - expect: Stays on /transfer; Reference has no error
  3. Isolated empty beneficiary: click 'Use Kiss Péter', click 'Check IBAN', clear Beneficiary name (also try whitespace only), enter Amount 1000, click 'Continue'.
    - expect: Only 'Enter a beneficiary name.' is shown; no IBAN or amount error
    - expect: Stays on /transfer; no review page
  4. Change From account to Savings Account.
    - expect: Available text updates to the savings balance shown on the dashboard

#### 3.2. Use saved payee fills fields; IBAN check valid and invalid [high]
**File:** `tests/transfer/iban-check.spec.ts`

**Steps:**
  1. Click 'Use Kiss Péter'.
    - expect: Beneficiary name and IBAN filled with the payee's values
  2. Click 'Check IBAN'.
    - expect: Status 'IBAN verified: GRM-...-xxxx' (assert format only)
  3. Replace IBAN with HU00 0000 0000 0000 0000 0000 0000 and click 'Check IBAN'.
    - expect: Status 'Invalid IBAN'; IBAN field marked invalid
  4. Try malformed IBANs: empty, too short, letters only, non-HU country prefix with bad checksum; submit form with the unchecked IBAN.
    - expect: Each yields 'Invalid IBAN' (or 'Check the IBAN first.' on submit)
    - expect: Editing a previously verified IBAN invalidates the check (submit blocked again) - verify
  5. Repeat verification for the other two saved payees.
    - expect: Each is verified

#### 3.3. Amount input validation (non-numeric, zero, negative, decimal, whitespace) [high]
**File:** `tests/transfer/amount-validation.spec.ts`

**Steps:**
  1. Select a saved payee, click 'Check IBAN', then for each amount value 0, -5, abc, 1.5 click 'Continue'.
    - expect: Each shows 'Enter an amount greater than 0.' and stays on /transfer
  2. Enter '1 000' (space as thousands separator).
    - expect: Accepted: review shows Amount '1,000 HUF', Fee '200 HUF', Total '1,200 HUF'
  3. Enter amount 1 (minimum valid).
    - expect: Review shows Amount 1 HUF, Fee 200 HUF, Total 201 HUF

#### 3.4. Fee calculation: minimum fee, percentage band and rounding [high]
**File:** `tests/transfer/fees.spec.ts`

**Steps:**
  1. Parameterised: for each amount submit the form with a verified saved payee from Everyday Account and read the review page. Amounts: 1, 999, 10,000, 66,666, 66,667, 66,700 -> expected fee 200 (minimum fee applies).
    - expect: Fee = 200 HUF; Total = amount + fee
  2. Amounts 99,999 and 100,000 and 100,001 -> fee 300 (0.3%, rounded to nearest HUF).
    - expect: Fee 300 HUF; Total = amount + 300
  3. Amounts 100,333 and 100,334 -> 301; 150,000 -> 450; 500,000 -> 1,500; 1,000,000 -> 3,000.
    - expect: Fee = round(0.3% x amount) and never less than 200
    - expect: Total = amount + fee; numbers formatted with thousands separators and ' HUF'
  4. Maximum fee, from Savings Account (balance 5,400,000 HUF): amount 2,000,000 -> fee 6,000, total 2,006,000 (0.3% equals the 6,000 cap exactly).
    - expect: Fee 6,000 HUF; Fee never exceeds 6,000 HUF for any accepted amount
    - expect: Amounts above 2,000,000 are rejected by the daily limit before a fee above 6,000 could show (see 3.6)
  5. Expected fees are hard-coded from the business rule in the test table, not computed from the page.
    - expect: Any mismatch is reported as a defect, not silently accepted

#### 3.5. Funds boundary includes fee (insufficient funds) [high]
**File:** `tests/transfer/insufficient-funds.spec.ts`

**Steps:**
  1. With Everyday Account (balance shown on form, 1,250,000 HUF) enter 1,246,000 and Continue.
    - expect: Review page: Fee 3,738 HUF, Total 1,249,738 HUF (within balance)
  2. Go back, enter 1,247,000 (amount < balance but amount+fee > balance).
    - expect: 'Insufficient funds.' shown on Amount; stays on /transfer
  3. Enter 1,250,000 and 1,250,001.
    - expect: 'Insufficient funds.' for both
  4. Switch to Savings Account and enter an amount above its balance, then one just within.
    - expect: Same funds rule applied relative to the savings balance

#### 3.6. Per-transfer and daily limit boundaries [high]
**File:** `tests/transfer/limits.spec.ts`

**Steps:**
  1. Minimum boundary: from Savings Account (balance 5,400,000 HUF) enter 1 and Continue.
    - expect: Accepted: review shows Amount 1 HUF, Fee 200 HUF, Total 201 HUF
  2. Daily limit boundary: enter 2,000,000 (the limit applies to the amount, the fee is not part of it) and Continue.
    - expect: Accepted: review shows Amount 2,000,000 HUF, Fee 6,000 HUF, Total 2,006,000 HUF - if rejected, report as a defect (verify whether the daily limit counts the fee)
  3. Enter 2,000,001.
    - expect: 'Daily limit of 2,000,000 HUF exceeded.' stays on /transfer
  4. Single-transfer boundary: enter 10,000,000 and 10,000,001.
    - expect: 10,000,000: accepted by the single limit but 'Daily limit of 2,000,000 HUF exceeded.' (daily limit is stricter)
    - expect: 10,000,001: 'The maximum single transfer is 10,000,000 HUF.' (the single-limit message is expected only above 10,000,000)
  5. Repeat 2,000,001 from Everyday Account (balance 1,250,000 HUF).
    - expect: 'Insufficient funds.' wins over the limit messages (observed validation order); record as an expected behaviour
  6. Confirm that the limits text 'up to 10,000,000 HUF per transfer and 2,000,000 HUF per day' is present on the page.
    - expect: Messages quote the same numbers as the limits text

#### 3.7. Review page content and navigation [high]
**File:** `tests/transfer/review.spec.ts`

**Steps:**
  1. Fill the form: Everyday Account, saved payee 'Nagy Eszter' (verified), amount 1,000, reference as a free-text value; click 'Continue'.
    - expect: URL /transfer/review, heading 'Review transfer'
  2. Read table 'Transfer details'.
    - expect: From = Everyday Account; To = Nagy Eszter; IBAN equals the payee IBAN
    - expect: Amount 1,000 HUF; Fee 200 HUF; Total 1,200 HUF
    - expect: 'Confirm transfer' button and 'Change details' link (/transfer?edit=1) visible
  3. Click 'Change details'.
    - expect: Back on /transfer with previously entered values preserved (verify)
  4. Open /transfer/review directly with no transfer in progress.
    - expect: No review of stale data: redirect to /transfer or an error (verify)

#### 3.8. Confirm transfer with PIN: success and balance/transactions update [high]
**File:** `tests/transfer/confirm-success.spec.ts`

**Steps:**
  1. Create a 1,000 HUF transfer to a saved payee up to the review page and record the Everyday balance on the dashboard beforehand.
    - expect: Review shows Total 1,200 HUF
  2. Click 'Confirm transfer'; in the 'Gremlin Secure' dialog (iframe title 'Gremlin Secure') enter GREMLIN_PIN and submit.
    - expect: Dialog closes; a confirmation page/message is shown with transfer details and a reference/confirmation code (assert format only)
    - expect: NOTE: dialog did not open during exploration; verify actual behaviour and adjust
  3. Return to /dashboard.
    - expect: Everyday balance decreased by exactly the Total (1,200 HUF) relative to the recorded value
    - expect: A new debit row for the transfer may appear in Recent transactions (verify)

#### 3.9. Confirm transfer with wrong PIN and cancel [high]
**File:** `tests/transfer/confirm-negative.spec.ts`

**Steps:**
  1. Reach the review page with a valid transfer and click 'Confirm transfer' without a valid PIN (or enter an incorrect PIN, never a real one, in the secure dialog).
    - expect: Alert 'Wrong PIN.' (data-testid pin-error) shown on the review page
    - expect: Transfer not executed; balance on the dashboard unchanged; still on /transfer/review
  2. If the secure dialog opens, click its 'Cancel' button.
    - expect: Dialog closes, review page remains, nothing is submitted
  3. Submit an empty PIN and a PIN of wrong length if the field is available.
    - expect: Rejected with a PIN error; no transfer
