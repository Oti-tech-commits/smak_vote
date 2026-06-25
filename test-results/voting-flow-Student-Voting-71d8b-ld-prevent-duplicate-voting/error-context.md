# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: voting-flow.spec.ts >> Student Voting Flow >> should prevent duplicate voting
- Location: playwright\voting-flow.spec.ts:123:7

# Error details

```
TimeoutError: page.click: Timeout 10000ms exceeded.
Call log:
  - waiting for locator('button:text("Submit Vote")')

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
        - link "Register" [ref=e12] [cursor=pointer]:
          - /url: /register
  - main [ref=e13]:
    - generic [ref=e14]:
      - generic [ref=e15]:
        - img "St. Mark’s S.S. Naminya crest" [ref=e16]
        - paragraph [ref=e17]: St. Mark’s S.S. Naminya
        - paragraph [ref=e18]: Desire to Excel
      - generic [ref=e20]:
        - generic [ref=e21]:
          - heading "Student Login" [level=1] [ref=e22]
          - paragraph [ref=e23]: Use your student number, school email, or voting token.
        - generic [ref=e24]:
          - button "Student Number" [active] [ref=e25] [cursor=pointer]
          - button "School Email" [ref=e26] [cursor=pointer]
          - button "Voting Token" [ref=e27] [cursor=pointer]
        - generic [ref=e28]:
          - generic [ref=e29]:
            - generic [ref=e30]: Student Number
            - textbox "Student Number" [ref=e31]:
              - /placeholder: e.g. S12345
          - generic [ref=e32]:
            - generic [ref=e33]: Password
            - textbox "Password" [ref=e34]:
              - /placeholder: Enter your password
          - button "Login" [ref=e35] [cursor=pointer]
  - contentinfo [ref=e36]:
    - generic [ref=e37]:
      - generic [ref=e38]:
        - img "St. Mark’s S.S. Naminya crest" [ref=e39]
        - generic [ref=e40]:
          - paragraph [ref=e41]: St. Mark’s S.S. Naminya
          - paragraph [ref=e42]: Desire to Excel
      - paragraph [ref=e43]: © 2026 St. Mark’s S.S. Naminya. Secure prefect voting platform.
  - alert [ref=e44]
```

# Test source

```ts
  34  | 
  35  |     // Fill login form
  36  |     await page.fill('input#email', 'student@stmark.com');
  37  |     await page.fill('input#password', 'StudentPass123!');
  38  | 
  39  |     // Submit form
  40  |     await page.click('button:text("Login")');
  41  | 
  42  |     // Should redirect to vote page on success
  43  |     await expect(page).toHaveURL(/vote/, { timeout: 10000 });
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
> 134 |     await page.click('button:text("Submit Vote")');
      |                ^ TimeoutError: page.click: Timeout 10000ms exceeded.
  135 | 
  136 |     // Should see error message
  137 |     await expect(page.locator('text=already voted')).toBeVisible({ timeout: 10000 });
  138 |   });
  139 | });
  140 | 
  141 | test.describe('Results Page', () => {
  142 |   test('should display published results', async ({ page }) => {
  143 |     await page.goto(`${BASE_URL}/results`);
  144 | 
  145 |     // Check for results heading
  146 |     const title = page.locator('h1');
  147 |     await expect(title).toContainText(/results|election/i);
  148 | 
  149 |     // Should show published elections
  150 |     const elections = page.locator('h2');
  151 |     const count = await elections.count();
  152 |     expect(count).toBeGreaterThanOrEqual(0);
  153 |   });
  154 | 
  155 |   test('should show election details', async ({ page }) => {
  156 |     await page.goto(`${BASE_URL}/results`);
  157 | 
  158 |     // Check if any published election is shown
  159 |     const publishedBadge = page.locator('text=Published');
  160 |     if (await publishedBadge.isVisible()) {
  161 |       // Verify election information is displayed
  162 |       await expect(page.locator('text=Election Window')).toBeVisible();
  163 |       await expect(page.locator('text=Status')).toBeVisible();
  164 |     }
  165 |   });
  166 | });
  167 | 
  168 | test.describe('Admin Dashboard', () => {
  169 |   test.beforeEach(async ({ page }) => {
  170 |     // Assuming admin is already logged in
  171 |     await page.goto(`${BASE_URL}/admin`);
  172 |   });
  173 | 
  174 |   test('should display admin statistics', async ({ page }) => {
  175 |     // Check for stat cards
  176 |     await expect(page.locator('text=Total Students')).toBeVisible();
  177 |     await expect(page.locator('text=Votes Cast')).toBeVisible();
  178 |     await expect(page.locator('text=Active Elections')).toBeVisible();
  179 | 
  180 |     // Check that stat values are displayed
  181 |     const statValues = page.locator('[class*="text-4xl"]');
  182 |     const count = await statValues.count();
  183 |     expect(count).toBeGreaterThanOrEqual(3);
  184 |   });
  185 | 
  186 |   test('should allow creating an election', async ({ page }) => {
  187 |     // Find create election form
  188 |     const titleInput = page.locator('input#title');
  189 |     await titleInput.fill('Test Election 2024');
  190 | 
  191 |     const descInput = page.locator('textarea#description');
  192 |     await descInput.fill('This is a test election for the automated testing suite.');
  193 | 
  194 |     const startInput = page.locator('input#start_time');
  195 |     await startInput.fill('2024-12-15T10:00');
  196 | 
  197 |     const endInput = page.locator('input#end_time');
  198 |     await endInput.fill('2024-12-15T14:00');
  199 | 
  200 |     // Submit form
  201 |     const forms = page.locator('form');
  202 |     const createButton = forms.first().locator('button:text("Create Election")');
  203 |     if (await createButton.isVisible()) {
  204 |       await createButton.click();
  205 |       
  206 |       // Check for success message
  207 |       await expect(page.locator('text=successfully')).toBeVisible({ timeout: 10000 });
  208 |     }
  209 |   });
  210 | 
  211 |   test('should allow creating a position', async ({ page }) => {
  212 |     // Fill position form
  213 |     const titleInput = page.locator('input#position_title');
  214 |     await titleInput.fill('School Captain');
  215 | 
  216 |     const maxVotesInput = page.locator('input#max_votes');
  217 |     await maxVotesInput.fill('1');
  218 | 
  219 |     const electionSelect = page.locator('select#election_id');
  220 |     const options = electionSelect.locator('option');
  221 |     const optionCount = await options.count();
  222 |     
  223 |     if (optionCount > 1) {
  224 |       // Select first election option
  225 |       await electionSelect.selectOption({ index: 1 });
  226 | 
  227 |       // Submit form
  228 |       const forms = page.locator('form');
  229 |       const createButton = forms.nth(1).locator('button:text("Create Position")');
  230 |       if (await createButton.isVisible()) {
  231 |         await createButton.click();
  232 |         
  233 |         // Check for success message
  234 |         await expect(page.locator('text=successfully|created')).toBeVisible({ timeout: 10000 });
```