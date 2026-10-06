# Gremlin Bank – Test Plan (run 2)

## Application Overview

Gremlin Bank (https://gremlin.shiwa.io) is a fictional demo bank. Explored in-browser only (no source read). Scope: sign in/out, dashboard, domestic HUF transfer.

OBSERVED FACTS / BUSINESS RULES
- Seed signs in as user "demo" (credentials come from the seed/env; never hard-code or paste them in specs or chat). Lands on /dashboard ("Accounts - Gremlin Bank").
- Unauthenticated access to /dashboard, /transfer, /transfer/review redirects to /login. Sign out (data-testid=sign-out) -> /login. Login form: login-username, login-password, login-submit. Empty submit shows "Wrong username or password." (generic message, no field-level hints).
- Dashboard loads async ("Loading accounts..." status first). Accounts: Everyday Account (IBAN HU39 9992 0265 3141 5926 5358 9797, 1,250,000 HUF), Savings Account (IBAN HU03 9992 0265 2718 2818 2845 9043, 5,400,000 HUF). Recent transactions table (Date/Description/Amount), 5 rows: 2026-09-30 Grocery store, Budapest -18,450 HUF; 2026-09-29 Salary, Gremlin Works Ltd. +685,000 HUF; 2026-09-27 Mobile phone bill -7,990 HUF; 2026-09-25 Card payment, bookshop -12,300 HUF; 2026-09-24 Transfer from Savings Account +50,000 HUF. "Spending in the last 30 days" chart has a "Show chart data" toggle (becomes "Hide chart data") revealing a Date/Amount table with 30 daily rows (2026-09-07 .. 2026-10-06), amounts in HUF with thousands separator, zero-days shown as "0 HUF". Dates are relative to today, so assert format/row count, not literal dates. Exchange rate EUR/HUF is random per page load -> assert format ^\d+\.\d{2}$ only. Session code / security codes (GRM-...) are decorative tokens; do not assert them as business data.
- Transfer form (/transfer): From account select (everyday default, savings; "Available:" hint updates per account), Beneficiary name (maxlength 70), IBAN (custom web component <gb-iban-input> with open shadow DOM, requires clicking its "Check IBAN" button; success message "IBAN verified: ..."; failure "Invalid IBAN"), Amount (HUF, text input), Reference (optional, maxlength 140), Continue. Saved payees with "Use" buttons fill name+IBAN: Kiss Péter HU72 9990 1017 1618 0339 8874 9892; Nagy Eszter HU71 9990 2025 1414 2135 6237 3099; Tóth Bence HU03 9990 3033 1732 0508 0756 8879.
- Limits shown in UI: up to 10,000,000 HUF per transfer and 2,000,000 HUF per day.
- Validation messages: "Enter a beneficiary name.", "Check the IBAN first.", "Enter an amount greater than 0.", "Insufficient funds.", "The maximum single transfer is 10,000,000 HUF.", "Daily limit of 2,000,000 HUF exceeded."
- FEE RULE (derived from observations): fee = max(200 HUF, 0.3% of amount, rounded to whole HUF). Observed: 1/999/1,000/10,000/50,000/66,666/66,667/66,700 -> 200; 75,000 -> 225; 100,000 and 100,001 -> 300; 500,000 -> 1,500; 1,000,000 -> 3,000; 1,246,000 -> 3,738; 2,000,000 -> 6,000. Total = amount + fee. Funds check is against amount + fee (1,246,000 + 3,738 = 1,249,738 passes on 1,250,000 balance; 1,246,500 and 1,250,000 fail with Insufficient funds).
- Amount parsing: accepts "1,000", "1 000", " 500 ", "00100"(=100); rejects "abc", "-5", "0", "0.5", "1.5", "1e3", empty with "Enter an amount greater than 0.".
- Review page (/transfer/review): table (data-testid review-table, review-amount, review-fee, review-total) shows From, To, IBAN, Amount, Fee, Total; buttons "Confirm transfer" (confirm-transfer) and "Change details" (/transfer?edit=1, which restores all entered values incl. reference). Reference is NOT shown on the review page. Confirm requires a PIN entered in <gb-secure-pin> (CLOSED shadow root, data-testid=secure-pin) and a payment dialog (data-testid=payment-dialog) containing a "Gremlin Secure" iframe (/secure/challenge, which standalone says "There is no payment to approve."). Confirm with empty PIN POSTs /transfer/confirm and shows role=alert "Wrong PIN." The valid PIN/approval flow could NOT be completed during exploration (PIN not disclosed in UI, closed shadow DOM and iframe block normal locators) -> confirmation-success scenarios are marked BLOCKED/PARTIAL and need the PIN from env var (e.g. process.env.GREMLIN_PIN) and a keyboard-based or frame-based approach. Never commit the PIN.

SUSPECTED APP BUGS / OBSERVATIONS
1. Transfer to the user's OWN account IBAN (Everyday -> HU39... own IBAN, and Savings IBAN from Everyday) is accepted and reaches the review page with a fee; likely should be rejected or treated as an internal transfer (needs product confirmation).
2. Daily-limit check seems to be per-transfer only so far (a 2,000,001 transfer is rejected; 2,000,000 passes); cumulative daily tracking could not be verified because confirmation could not be completed.
3. Message precedence: for Savings, amounts 5,400,000 and 10,000,000 show "Daily limit exceeded" while 10,000,001 shows "maximum single transfer". Reasonable, but for Everyday, 1,250,000 shows "Insufficient funds" (not the daily limit) — document the precedence order.
4. Chart data does not reconcile with recent transactions (e.g. 2026-09-30 chart 11,800 HUF vs grocery -18,450 HUF; 2026-09-25 chart 14,250 vs -12,300; 2026-09-24 chart 9,900 vs a +50,000 incoming). Could be intentional (chart covers all spending incl. other items) but worth raising: 09-30 chart value is lower than a single logged expense that day.
5. Typing invalid IBAN then Continue without pressing "Check IBAN": validation shows "Check the IBAN first." but the visible name error disappears/IBAN flow is non-obvious; also a draft persists server-side/session: visiting /transfer/review directly shows the last draft (stale "Test" beneficiary) instead of redirecting to /transfer.
6. Reference is entered but not displayed on the review page.
7. Amount "999999999999999999999" shows the max single transfer message (OK); "00100" and "1,000" are silently normalised (acceptable but note).
8. Empty-credential login gives the same generic "Wrong username or password." (acceptable; no field hints, possible a11y gap: no per-field required messages).
9. Name field: whitespace-only / special characters / 71+ chars not yet exercised beyond maxlength attr.

TESTING NOTES: use data-testid selectors (transfer-from, transfer-beneficiary, transfer-iban, transfer-amount, transfer-reference, transfer-continue). For IBAN use page.getByTestId('transfer-iban').locator('input') and getByRole('button',{name:'Check IBAN'}). Dashboard data renders asynchronously: wait for the 'Loading accounts...' status to disappear. Assume each scenario starts from the seed (signed in, fresh state) unless it is the sign-in suite.

## Test Scenarios

### 1. Authentication

**Seed:** `seed.spec.ts`

#### 1.1. Seeded sign-in lands on dashboard and sign-out returns to login

**File:** `tests/auth/sign-in-out.spec.ts`

**Steps:**
  1. Start from seed (signed in). Observe header.
    - expect: URL /dashboard, title 'Accounts - Gremlin Bank'
    - expect: Header shows 'Signed in as' with the demo username
    - expect: 'Accounts' h1 visible
  2. Click Sign out (data-testid=sign-out).
    - expect: Redirected to /login
    - expect: Heading 'Sign in to Gremlin Bank', Username/Password fields and Sign in button shown
    - expect: Header no longer shows 'Signed in as'
  3. Navigate to /dashboard, /transfer and /transfer/review directly.
    - expect: Each redirects to /login (no account data leaks)
  4. Press browser Back after sign-out.
    - expect: Protected page is not shown with data; user ends on /login

#### 1.2. Login form negative cases

**File:** `tests/auth/login-negative.spec.ts`

**Steps:**
  1. Open /login unauthenticated (new context without storage state). Click Sign in with both fields empty.
    - expect: Stays on /login
    - expect: Alert text 'Wrong username or password.'
  2. Enter obviously fake username 'nobody' and fake password 'invalid-pass' (never real credentials) and submit.
    - expect: Same generic 'Wrong username or password.' message
    - expect: Password field not echoed; no indication which field is wrong
  3. Submit a valid username with an empty password, and SQL/HTML-like text '<script>x</script>' as username.
    - expect: Generic error; no script execution, no server error page

### 2. Dashboard

**Seed:** `seed.spec.ts`

#### 2.1. Accounts overview shows both accounts with IBAN and balance

**File:** `tests/dashboard/accounts.spec.ts`

**Steps:**
  1. Load /dashboard and wait for 'Loading accounts...' to disappear.
    - expect: Everyday Account: IBAN HU39 9992 0265 3141 5926 5358 9797, balance 1,250,000 HUF
    - expect: Savings Account: IBAN HU03 9992 0265 2718 2818 2845 9043, balance 5,400,000 HUF
    - expect: 'New transfer' link points to /transfer
  2. Check exchange rate and tip widgets.
    - expect: EUR/HUF value matches /^\d+\.\d{2}$/ (random per load, do not assert exact)
    - expect: Tip of the day text present and non-empty

#### 2.2. Recent transactions table content and format

**File:** `tests/dashboard/recent-transactions.spec.ts`

**Steps:**
  1. Read 'Recent transactions' table.
    - expect: Columns Date, Description, Amount
    - expect: 5 rows in descending date order
    - expect: Rows: 2026-09-30 Grocery store, Budapest -18,450 HUF; 2026-09-29 Salary, Gremlin Works Ltd. +685,000 HUF; 2026-09-27 Mobile phone bill -7,990 HUF; 2026-09-25 Card payment, bookshop -12,300 HUF; 2026-09-24 Transfer from Savings Account +50,000 HUF
    - expect: Date matches ^\d{4}-\d{2}-\d{2}$; amount matches ^[+-][\d,]+ HUF$; credits have '+', debits '-'

#### 2.3. Spending chart data toggle and table

**File:** `tests/dashboard/chart-data.spec.ts`

**Steps:**
  1. Click 'Show chart data'.
    - expect: Button text becomes 'Hide chart data'
    - expect: Table appears with 30 rows (Date, Amount)
    - expect: Every date matches ISO format, consecutive and ascending; last row is today's date
    - expect: Every amount matches ^[\d,]+ HUF$ (zero days '0 HUF'), none negative
  2. Click 'Hide chart data'.
    - expect: Data table hidden; button reverts to 'Show chart data'
  3. Compare chart values with Recent transactions (see suspected bug 4).
    - expect: Record any mismatch (e.g. 2026-09-30: chart 11,800 vs grocery 18,450) as a finding; do not fail the main toggle test on it

### 3. Domestic transfer - form

**Seed:** `seed.spec.ts`

#### 3.1. Transfer page layout, saved payees and 'Use' autofill

**File:** `tests/transfer/form-layout-payees.spec.ts`

**Steps:**
  1. Click 'New transfer' on dashboard.
    - expect: URL /transfer, h1 'New transfer', 'Back to accounts' link
    - expect: From account defaults to Everyday with 'Available: 1,250,000 HUF'
    - expect: Limits text 'up to 10,000,000 HUF per transfer and 2,000,000 HUF per day'
  2. Switch From to Savings Account.
    - expect: Hint becomes 'Available: 5,400,000 HUF'
  3. Click 'Use' for each of Kiss Péter, Nagy Eszter, Tóth Bence.
    - expect: Beneficiary and IBAN inputs filled with the payee's name/IBAN listed in the overview

#### 3.2. Required-field validation on empty submit

**File:** `tests/transfer/validation-required.spec.ts`

**Steps:**
  1. Open /transfer and click Continue with all fields empty.
    - expect: Stays on /transfer
    - expect: 'Enter a beneficiary name.', 'Check the IBAN first.', 'Enter an amount greater than 0.' shown; reference has no error
    - expect: Inputs aria-invalid=true
  2. Fill name and amount only (no IBAN check) and Continue.
    - expect: Only 'Check the IBAN first.' remains; no navigation to review
  3. Fill IBAN via Use but do NOT click Check IBAN, amount 1000, Continue.
    - expect: Document behaviour: observed 'Check the IBAN first.' blocks submit until verified

#### 3.3. IBAN verification valid and invalid values

**File:** `tests/transfer/iban-check.spec.ts`

**Steps:**
  1. For each valid value: HU72 9990 1017 1618 0339 8874 9892; same without spaces and lowercase 'hu72999010171618033988749892'; with trailing space - click Check IBAN.
    - expect: Message starts 'IBAN verified'
  2. For each invalid value: empty; 'HU72'; HU72 9990 1017 1618 0339 8874 9893 (bad checksum); DE89 3704 0044 0532 0130 00 (non-HU); HU72 9990 1017 1618 0339 8874 989X - click Check IBAN.
    - expect: Message 'Invalid IBAN'; submit remains blocked
  3. Verify a valid IBAN, then edit one digit and submit without re-checking.
    - expect: Verification should be invalidated (record actual behaviour; potential bug if review is reached)
  4. Enter the user's own IBANs (HU39... Everyday, HU03... Savings) as beneficiary from Everyday and Check/Continue.
    - expect: Observed: verified and accepted, review reached -> SUSPECTED BUG 1 (own-account transfer)

#### 3.4. Amount parsing: invalid and normalised inputs

**File:** `tests/transfer/amount-parsing.spec.ts`

**Steps:**
  1. With a verified payee and name, enter each invalid amount and Continue: 'abc', '-5', '0', '0.5', '1.5', '1e3', empty.
    - expect: Stay on /transfer with 'Enter an amount greater than 0.'
  2. Enter each tolerated amount: '1,000', '1 000', ' 500 ', '00100'.
    - expect: Review reached; amounts shown as 1,000 / 1,000 / 500 / 100 HUF respectively with fee 200 HUF
  3. Enter '1' (minimum).
    - expect: Review: Amount 1 HUF, Fee 200 HUF, Total 201 HUF

#### 3.5. Beneficiary name and reference field limits

**File:** `tests/transfer/text-fields.spec.ts`

**Steps:**
  1. Type 71 characters into Beneficiary name.
    - expect: Only 70 accepted (maxlength=70)
  2. Type 141 characters into Reference.
    - expect: Only 140 accepted
  3. Enter whitespace-only name, then a name with accents 'Kiss Péter', then HTML '<b>x</b> & é' as reference; continue to review.
    - expect: Whitespace-only name rejected with 'Enter a beneficiary name.' (verify; record if accepted)
    - expect: Accents preserved on review
    - expect: HTML in reference is escaped / never rendered as markup; reference is not displayed on review (suspected bug 6)

### 4. Domestic transfer - fees and limits

**Seed:** `seed.spec.ts`

#### 4.1. Fee table: boundary examples (Everyday, Kiss Péter)

**File:** `tests/transfer/fees.spec.ts`

**Steps:**
  1. For each amount submit the form and read review-amount/review-fee/review-total. Rule: fee = max(200, round(0.3% of amount)). Cases: 1->200/201; 999->200/1,199; 1,000->200/1,200; 50,000->200/50,200; 66,666->200/66,866; 66,667->200/66,867; 66,700->200/66,900; 75,000->225/75,225; 100,000->300/100,300; 100,001->300/100,301; 500,000->1,500/501,500; 1,000,000->3,000/1,003,000.
    - expect: Fee and Total equal the listed values; thousands separators and ' HUF' suffix on all three
    - expect: Total = Amount + Fee for every row
    - expect: Review From = Everyday Account, To = Kiss Péter, IBAN = HU72 9990 1017 1618 0339 8874 9892
  2. Savings account, amount 2,000,000.
    - expect: Fee 6,000 HUF, Total 2,006,000 HUF

#### 4.2. Balance check includes the fee (Everyday 1,250,000 HUF)

**File:** `tests/transfer/insufficient-funds.spec.ts`

**Steps:**
  1. Submit 1,246,000 HUF (fee 3,738, total 1,249,738).
    - expect: Review reached with Total 1,249,738 HUF
  2. Submit 1,246,500 HUF, 1,250,000 HUF and 1,250,001 HUF.
    - expect: Stay on /transfer with 'Insufficient funds.' (amount+fee exceeds balance, even when amount <= balance)
  3. Find the exact boundary: largest amount where amount+fee <= 1,250,000 (≈1,246,261) and +1.
    - expect: Largest passes, next fails with 'Insufficient funds.' (confirms fee is included)

#### 4.3. Per-transfer (10,000,000) and daily (2,000,000) limits

**File:** `tests/transfer/limits.spec.ts`

**Steps:**
  1. From Savings (5,400,000 balance) submit 2,000,000.
    - expect: Review reached (limit is inclusive)
  2. From Savings submit 2,000,001, 5,400,000 and 10,000,000.
    - expect: 'Daily limit of 2,000,000 HUF exceeded.'
  3. From Savings submit 10,000,001 and 999999999999999999999.
    - expect: 'The maximum single transfer is 10,000,000 HUF.'
  4. From Everyday submit 2,000,000 (balance 1,250,000).
    - expect: Document which message shows first (observed 'Insufficient funds.' for Everyday 1,250,000) - message precedence note, suspected bug 3

### 5. Domestic transfer - review and confirmation

**Seed:** `seed.spec.ts`

#### 5.1. Review page content and 'Change details' round trip

**File:** `tests/transfer/review.spec.ts`

**Steps:**
  1. Use Nagy Eszter, Check IBAN, amount 100000, reference 'Rent', Continue.
    - expect: URL /transfer/review, h1 'Review transfer'
    - expect: Table: From Everyday Account; To Nagy Eszter; IBAN HU71 9990 2025 1414 2135 6237 3099; Amount 100,000 HUF; Fee 300 HUF; Total 100,300 HUF
    - expect: Confirm transfer and Change details controls present
  2. Click 'Change details'.
    - expect: URL /transfer?edit=1; name, IBAN, amount (100000) and reference restored; IBAN remains verified (or record if re-check required)
  3. Change amount to 50000 and Continue.
    - expect: Review shows Amount 50,000 HUF, Fee 200 HUF, Total 50,200 HUF (no stale values)
  4. Navigate directly to /transfer/review in a fresh session with no draft.
    - expect: Should redirect to /transfer (record actual); observed stale draft shown in same session -> suspected bug 5

#### 5.2. Confirm transfer requires correct PIN (negative)

**File:** `tests/transfer/confirm-wrong-pin.spec.ts`

**Steps:**
  1. Reach review for Kiss Péter, 1000 HUF. Click 'Confirm transfer' without entering a PIN.
    - expect: Remains on /transfer/review
    - expect: Alert (data-testid=pin-error) 'Wrong PIN.'
    - expect: No balance change: dashboard Everyday still 1,250,000 HUF
  2. Enter an obviously wrong PIN (e.g. 0000 - only if the PIN widget is operable via keyboard) and confirm.
    - expect: 'Wrong PIN.' again; transfer not executed
  3. Click Cancel in the payment dialog if it opens.
    - expect: Dialog closes, review page unchanged

#### 5.3. Successful confirmation and post-transfer state (BLOCKED - needs PIN from env)

**File:** `tests/transfer/confirm-success.spec.ts`

**Steps:**
  1. Reach review for Kiss Péter, 1000 HUF (fee 200, total 1,200). Provide PIN from process.env.GREMLIN_PIN into gb-secure-pin (closed shadow DOM: focus the component and use keyboard.type) and complete the 'Gremlin Secure' iframe step if prompted. Test is skipped when GREMLIN_PIN is unset.
    - expect: Confirmation page/message shows amount 1,000 HUF, fee 200 HUF, total 1,200 HUF, beneficiary and a reference/transaction id matching a loose format (assert format, not value)
    - expect: Dashboard Everyday balance = 1,250,000 - 1,200 = 1,248,800 HUF
    - expect: Review page can't be re-submitted via Back/refresh (no double debit)
  2. After success, make another transfer pushing cumulative daily total over 2,000,000 (from Savings).
    - expect: 'Daily limit of 2,000,000 HUF exceeded.' based on cumulative amount (verifies suspected bug 2 area)
