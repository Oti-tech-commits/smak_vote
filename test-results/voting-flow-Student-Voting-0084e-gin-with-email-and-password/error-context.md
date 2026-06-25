# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: voting-flow.spec.ts >> Student Voting Flow >> should login with email and password
- Location: playwright\voting-flow.spec.ts:28:7

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /vote/
Received string:  "http://localhost:3000/login"
Timeout: 10000ms

Call log:
  - Expect "toHaveURL" with timeout 10000ms
    20 × unexpected value "http://localhost:3000/login"

```

```yaml
- banner:
  - link "St. Mark’s S.S. Naminya crest St. Mark’s S.S. Naminya Desire to Excel":
    - /url: /
    - img "St. Mark’s S.S. Naminya crest"
    - text: St. Mark’s S.S. Naminya Desire to Excel
  - navigation:
    - link "Home":
      - /url: /
    - link "Login":
      - /url: /login
    - link "Register":
      - /url: /register
- main:
  - img "St. Mark’s S.S. Naminya crest"
  - paragraph: St. Mark’s S.S. Naminya
  - paragraph: Desire to Excel
  - heading "Student Login" [level=1]
  - paragraph: Use your student number, school email, or voting token.
  - button "Student Number"
  - button "School Email"
  - button "Voting Token"
  - text: School Email
  - textbox "School Email":
    - /placeholder: student@stmark.com
    - text: student@stmark.com
  - text: Password
  - textbox "Password":
    - /placeholder: Enter your password
    - text: StudentPass123!
  - button "Login" [disabled]
- contentinfo:
  - img "St. Mark’s S.S. Naminya crest"
  - paragraph: St. Mark’s S.S. Naminya
  - paragraph: Desire to Excel
  - paragraph: © 2026 St. Mark’s S.S. Naminya. Secure prefect voting platform.
- alert
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';
  4   | 
  5   | test.describe('Student Voting Flow', () => {
  6   |   test.beforeEach(async ({ page }) => {
  7   |     await page.goto(BASE_URL);
  8   |   });
  9   | 
  10  |   test('should register a new student', async ({ page }) => {
  11  |     await page.click('a:text("Register as Student")');
  12  |     await expect(page).toHaveURL(/register/);
  13  | 
  14  |     // Fill registration form
  15  |     await page.fill('input#full_name', 'Test Student');
  16  |     await page.fill('input#student_number', 'TS2024001');
  17  |     await page.fill('input#class_name', 'SS3A');
  18  |     await page.fill('input#email', 'student.test@stmark.com');
  19  |     await page.fill('input#password', 'TestPassword123!');
  20  | 
  21  |     // Submit form
  22  |     await page.click('button:text("Create Account")');
  23  | 
  24  |     // Should show success message
  25  |     await expect(page.locator('text=Registration successful')).toBeVisible();
  26  |   });
  27  | 
  28  |   test('should login with email and password', async ({ page }) => {
  29  |     await page.click('a:text("Login to Vote")');
  30  |     await expect(page).toHaveURL(/login/);
  31  | 
  32  |     // Select email mode
  33  |     await page.click('button:text("School Email")');
  34  | 
  35  |     // Fill login form
  36  |     await page.fill('input#email', 'student@stmark.com');
  37  |     await page.fill('input#password', 'StudentPass123!');
  38  | 
  39  |     // Submit form
  40  |     await page.click('button:text("Login")');
  41  | 
  42  |     // Should redirect to vote page on success
> 43  |     await expect(page).toHaveURL(/vote/, { timeout: 10000 });
      |                        ^ Error: expect(page).toHaveURL(expected) failed
  44  |   });
  45  | 
  46  |   test('should login with student number', async ({ page }) => {
  47  |     await page.click('a:text("Login to Vote")');
  48  | 
  49  |     // Select student number mode
  50  |     await page.click('button:text("Student Number")');
  51  | 
  52  |     // Fill login form
  53  |     await page.fill('input#studentNumber', 'S12345');
  54  |     await page.fill('input#password', 'StudentPass123!');
  55  | 
  56  |     // Submit form
  57  |     await page.click('button:text("Login")');
  58  | 
  59  |     // Should redirect to vote page on success
  60  |     await expect(page).toHaveURL(/vote/, { timeout: 10000 });
  61  |   });
  62  | 
  63  |   test('should validate login with voting token', async ({ page }) => {
  64  |     await page.click('a:text("Login to Vote")');
  65  | 
  66  |     // Select voting token mode
  67  |     await page.click('button:text("Voting Token")');
  68  | 
  69  |     // Fill token form
  70  |     await page.fill('input#token', 'valid-voting-token-here');
  71  | 
  72  |     // Submit form
  73  |     await page.click('button:text("Validate Token")');
  74  | 
  75  |     // Error expected if token is invalid
  76  |     await expect(page.locator('text=Invalid voting token')).toBeVisible();
  77  |   });
  78  | 
  79  |   test('should display active election and candidates', async ({ page }) => {
  80  |     // Navigate to vote page
  81  |     await page.goto(`${BASE_URL}/vote`);
  82  | 
  83  |     // Wait for election to load
  84  |     const election = page.locator('h1').first();
  85  |     await expect(election).not.toHaveText('No active election available');
  86  | 
  87  |     // Check that positions are visible
  88  |     const positions = page.locator('h2');
  89  |     const count = await positions.count();
  90  |     expect(count).toBeGreaterThan(0);
  91  | 
  92  |     // Check that candidates are displayed
  93  |     const candidates = page.locator('button[type="button"]');
  94  |     const candidateCount = await candidates.count();
  95  |     expect(candidateCount).toBeGreaterThan(0);
  96  |   });
  97  | 
  98  |   test('should select candidates and submit vote', async ({ page, context }) => {
  99  |     // Login first
  100 |     const cookie = await context.cookies();
  101 |     // Add auth token cookie if available
  102 |     
  103 |     // Navigate to vote page
  104 |     await page.goto(`${BASE_URL}/vote`);
  105 | 
  106 |     // Wait for election to load
  107 |     await expect(page.locator('text=Select up to').first()).toBeVisible();
  108 | 
  109 |     // Select first candidate
  110 |     const firstCandidate = page.locator('button[type="button"]').first();
  111 |     await firstCandidate.click();
  112 | 
  113 |     // Check that candidate is selected
  114 |     await expect(firstCandidate).toHaveClass(/border-brand-500/);
  115 | 
  116 |     // Submit vote
  117 |     await page.click('button:text("Submit Vote")');
  118 | 
  119 |     // Should see success message
  120 |     await expect(page.locator('text=successfully voted')).toBeVisible({ timeout: 10000 });
  121 |   });
  122 | 
  123 |   test('should prevent duplicate voting', async ({ page }) => {
  124 |     // Assuming student already voted
  125 |     await page.goto(`${BASE_URL}/vote`);
  126 | 
  127 |     // Try to select candidate
  128 |     const firstCandidate = page.locator('button[type="button"]').first();
  129 |     if (await firstCandidate.isVisible()) {
  130 |       await firstCandidate.click();
  131 |     }
  132 | 
  133 |     // Submit vote
  134 |     await page.click('button:text("Submit Vote")');
  135 | 
  136 |     // Should see error message
  137 |     await expect(page.locator('text=already voted')).toBeVisible({ timeout: 10000 });
  138 |   });
  139 | });
  140 | 
  141 | test.describe('Results Page', () => {
  142 |   test('should display published results', async ({ page }) => {
  143 |     await page.goto(`${BASE_URL}/results`);
```