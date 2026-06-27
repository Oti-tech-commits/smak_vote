# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: voting-flow.spec.ts >> Student Voting Flow >> should register a new student
- Location: playwright\voting-flow.spec.ts:10:5

# Error details

```
Error: Missing SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD env vars for admin login
```

# Page snapshot

```yaml
- generic [ref=e1]:
  - banner [ref=e2]:
    - generic [ref=e3]:
      - link "St. Mark’s S.S. Naminya crest St. Mark’s S.S. Naminya Desire to Excel" [ref=e4] [cursor=pointer]:
        - /url: /
        - img "St. Mark’s S.S. Naminya crest" [ref=e5]
        - generic [ref=e6]:
          - generic [ref=e7]: St. Mark’s S.S. Naminya
          - generic [ref=e8]: Desire to Excel
      - navigation [ref=e9]:
        - link "Home" [ref=e10] [cursor=pointer]:
          - /url: /
        - link "Login" [ref=e11] [cursor=pointer]:
          - /url: /login
  - main [ref=e12]:
    - generic [ref=e13]:
      - generic [ref=e14]:
        - img "St. Mark’s S.S. Naminya crest" [ref=e15]
        - paragraph [ref=e16]: St. Mark’s S.S. Naminya
        - paragraph [ref=e17]: Desire to Excel
      - generic [ref=e19]:
        - generic [ref=e20]:
          - heading "Student Login" [level=1] [ref=e21]
          - paragraph [ref=e22]: Use your student number, school email, or voting token.
        - generic [ref=e23]:
          - button "Student Number" [ref=e24] [cursor=pointer]
          - button "School Email" [active] [ref=e25] [cursor=pointer]
          - button "Voting Token" [ref=e26] [cursor=pointer]
        - generic [ref=e27]:
          - generic [ref=e28]:
            - generic [ref=e29]: Student Number
            - textbox "Student Number" [ref=e30]:
              - /placeholder: e.g. S12345
          - generic [ref=e31]:
            - generic [ref=e32]: Password
            - textbox "Password" [ref=e33]:
              - /placeholder: Enter your password
          - button "Login" [ref=e34] [cursor=pointer]
  - contentinfo [ref=e35]:
    - generic [ref=e36]:
      - generic [ref=e37]:
        - img "St. Mark’s S.S. Naminya crest" [ref=e38]
        - generic [ref=e39]:
          - paragraph [ref=e40]: St. Mark’s S.S. Naminya
          - paragraph [ref=e41]: Desire to Excel
      - paragraph [ref=e42]: © 2026 St. Mark’s S.S. Naminya. Secure prefect voting platform.
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
  10  | test('should register a new student', async ({ page }) => {
  11  |     // Login as admin/officer so AuthGuard allows /register
  12  |     await page.click('a:text("Login to Vote")');
  13  |     await expect(page).toHaveURL(/login/);
  14  | 
  15  |     // Email/password mode
  16  |     await page.click('button:text("School Email")');
  17  | 
  18  |     const adminEmail = process.env.SEED_ADMIN_EMAIL;
  19  |     const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  20  |     if (!adminEmail || !adminPassword) {
> 21  |       throw new Error('Missing SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD env vars for admin login');
      |             ^ Error: Missing SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD env vars for admin login
  22  |     }
  23  | 
  24  |     await page.fill('input#email', adminEmail);
  25  |     await page.fill('input#password', adminPassword);
  26  |     await page.click('button:text("Login")');
  27  | 
  28  |     // After admin login, go to registration page
  29  |     await page.goto(`${BASE_URL}/register`);
  30  |     await page.waitForURL(/register|login/);
  31  | 
  32  |     if (!page.url().includes('/register')) {
  33  |       throw new Error(`AuthGuard blocked /register. Landed on: ${page.url()}`);
  34  |     }
  35  | 
  36  |     // Fill registration form
  37  |     await page.waitForSelector('input#full_name', { timeout: 30000 });
  38  |     await page.fill('input#full_name', 'Test Student');
  39  |     await page.fill('input#student_number', 'TS2024001');
  40  |     await page.fill('input#class_name', 'SS3A');
  41  |     await page.fill('input#email', 'student.test@stmark.com');
  42  |     await page.fill('input#password', 'TestPassword123!');
  43  | 
  44  |     // Submit form
  45  |     await page.click('button:text("Register Account")');
  46  | 
  47  |     // Should show success message
  48  |     await expect(page.locator('text=account created successfully')).toBeVisible({ timeout: 10000 });
  49  |   });
  50  | 
  51  |   test('should login with email and password', async ({ page }) => {
  52  |     await page.click('a:text("Login to Vote")');
  53  |     await expect(page).toHaveURL(/login/);
  54  | 
  55  |     // Select email mode
  56  |     await page.click('button:text("School Email")');
  57  | 
  58  |     // Fill login form
  59  |     await page.fill('input#email', 'student@stmark.com');
  60  |     await page.fill('input#password', 'StudentPass123!');
  61  | 
  62  |     // Submit form
  63  |     await page.click('button:text("Login")');
  64  | 
  65  |     // Should redirect to vote page on success
  66  |     await expect(page).toHaveURL(/vote/, { timeout: 10000 });
  67  |   });
  68  | 
  69  |   test('should login with student number', async ({ page }) => {
  70  |     await page.click('a:text("Login to Vote")');
  71  | 
  72  |     // Select student number mode
  73  |     await page.click('button:text("Student Number")');
  74  | 
  75  |     // Fill login form
  76  |     await page.fill('input#studentNumber', 'S12345');
  77  |     await page.fill('input#password', 'StudentPass123!');
  78  | 
  79  |     // Submit form
  80  |     await page.click('button:text("Login")');
  81  | 
  82  |     // Should redirect to vote page on success
  83  |     await expect(page).toHaveURL(/vote/, { timeout: 10000 });
  84  |   });
  85  | 
  86  |   test('should validate login with voting token', async ({ page }) => {
  87  |     await page.click('a:text("Login to Vote")');
  88  | 
  89  |     // Select voting token mode
  90  |     await page.click('button:text("Voting Token")');
  91  | 
  92  |     // Fill token form
  93  |     await page.fill('input#token', 'valid-voting-token-here');
  94  | 
  95  |     // Submit form
  96  |     await page.click('button:text("Validate Token")');
  97  | 
  98  |     // Error expected if token is invalid
  99  |     await expect(page.locator('text=Invalid voting token')).toBeVisible();
  100 |   });
  101 | 
  102 |   test('should display active election and candidates', async ({ page }) => {
  103 |     // Navigate to vote page
  104 |     await page.goto(`${BASE_URL}/vote`);
  105 | 
  106 |     // Wait for election to load
  107 |     const election = page.locator('h1').first();
  108 |     await expect(election).not.toHaveText('No active election available');
  109 | 
  110 |     // Check that positions are visible
  111 |     const positions = page.locator('h2');
  112 |     const count = await positions.count();
  113 |     expect(count).toBeGreaterThan(0);
  114 | 
  115 |     // Check that candidates are displayed
  116 |     const candidates = page.locator('button[type="button"]');
  117 |     const candidateCount = await candidates.count();
  118 |     expect(candidateCount).toBeGreaterThan(0);
  119 |   });
  120 | 
  121 |   test('should select candidates and submit vote', async ({ page, context }) => {
```