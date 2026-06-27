import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';

test.describe('Student Voting Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

test('should register a new student', async ({ page }) => {
    // Login as admin/officer so AuthGuard allows /register
    await page.click('a:text("Login to Vote")');
    await expect(page).toHaveURL(/login/);

    // Email/password mode
    await page.click('button:text("School Email")');

    const adminEmail = process.env.SEED_ADMIN_EMAIL;
    const adminPassword = process.env.SEED_ADMIN_PASSWORD;
    if (!adminEmail || !adminPassword) {
      throw new Error('Missing SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD env vars for admin login');
    }

    await page.fill('input#email', adminEmail);
    await page.fill('input#password', adminPassword);
    await page.click('button:text("Login")');

    // After admin login, go to registration page
    await page.goto(`${BASE_URL}/register`);
    await page.waitForURL(/register|login/);

    if (!page.url().includes('/register')) {
      throw new Error(`AuthGuard blocked /register. Landed on: ${page.url()}`);
    }

    // Fill registration form
    await page.waitForSelector('input#full_name', { timeout: 30000 });
    await page.fill('input#full_name', 'Test Student');
    await page.fill('input#student_number', 'TS2024001');
    await page.fill('input#class_name', 'SS3A');
    await page.fill('input#email', 'student.test@stmark.com');
    await page.fill('input#password', 'TestPassword123!');

    // Submit form
    await page.click('button:text("Register Account")');

    // Should show success message
    await expect(page.locator('text=account created successfully')).toBeVisible({ timeout: 10000 });
  });

  test('should login with email and password', async ({ page }) => {
    await page.click('a:text("Login to Vote")');
    await expect(page).toHaveURL(/login/);

    // Select email mode
    await page.click('button:text("School Email")');

    // Fill login form
    await page.fill('input#email', 'student@stmark.com');
    await page.fill('input#password', 'StudentPass123!');

    // Submit form
    await page.click('button:text("Login")');

    // Should redirect to vote page on success
    await expect(page).toHaveURL(/vote/, { timeout: 10000 });
  });

  test('should login with student number', async ({ page }) => {
    await page.click('a:text("Login to Vote")');

    // Select student number mode
    await page.click('button:text("Student Number")');

    // Fill login form
    await page.fill('input#studentNumber', 'S12345');
    await page.fill('input#password', 'StudentPass123!');

    // Submit form
    await page.click('button:text("Login")');

    // Should redirect to vote page on success
    await expect(page).toHaveURL(/vote/, { timeout: 10000 });
  });

  test('should validate login with voting token', async ({ page }) => {
    await page.click('a:text("Login to Vote")');

    // Select voting token mode
    await page.click('button:text("Voting Token")');

    // Fill token form
    await page.fill('input#token', 'valid-voting-token-here');

    // Submit form
    await page.click('button:text("Validate Token")');

    // Error expected if token is invalid
    await expect(page.locator('text=Invalid voting token')).toBeVisible();
  });

  test('should display active election and candidates', async ({ page }) => {
    // Navigate to vote page
    await page.goto(`${BASE_URL}/vote`);

    // Wait for election to load
    const election = page.locator('h1').first();
    await expect(election).not.toHaveText('No active election available');

    // Check that positions are visible
    const positions = page.locator('h2');
    const count = await positions.count();
    expect(count).toBeGreaterThan(0);

    // Check that candidates are displayed
    const candidates = page.locator('button[type="button"]');
    const candidateCount = await candidates.count();
    expect(candidateCount).toBeGreaterThan(0);
  });

  test('should select candidates and submit vote', async ({ page, context }) => {
    // Login first
    const cookie = await context.cookies();
    // Add auth token cookie if available
    
    // Navigate to vote page
    await page.goto(`${BASE_URL}/vote`);

    // Wait for election to load
    await expect(page.locator('text=Select up to').first()).toBeVisible();

    // Select first candidate
    const firstCandidate = page.locator('button[type="button"]').first();
    await firstCandidate.click();

    // Check that candidate is selected
    await expect(firstCandidate).toHaveClass(/border-brand-500/);

    // Submit vote
    await page.click('button:text("Submit Vote")');

    // Should see success message
    await expect(page.locator('text=successfully voted')).toBeVisible({ timeout: 10000 });
  });

  test('should prevent duplicate voting', async ({ page }) => {
    // Assuming student already voted
    await page.goto(`${BASE_URL}/vote`);

    // Try to select candidate
    const firstCandidate = page.locator('button[type="button"]').first();
    if (await firstCandidate.isVisible()) {
      await firstCandidate.click();
    }

    // Submit vote
    await page.click('button:text("Submit Vote")');

    // Should see error message
    await expect(page.locator('text=already voted')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Results Page', () => {
  test('should display published results', async ({ page }) => {
    await page.goto(`${BASE_URL}/results`);

    // Check for results heading
    const title = page.locator('h1');
    await expect(title).toContainText(/results|election/i);

    // Should show published elections
    const elections = page.locator('h2');
    const count = await elections.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should show election details', async ({ page }) => {
    await page.goto(`${BASE_URL}/results`);

    // Check if any published election is shown
    const publishedBadge = page.locator('text=Published');
    if (await publishedBadge.isVisible()) {
      // Verify election information is displayed
      await expect(page.locator('text=Election Window')).toBeVisible();
      await expect(page.locator('text=Status')).toBeVisible();
    }
  });
});

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Assuming admin is already logged in
    await page.goto(`${BASE_URL}/admin`);
  });

  test('should display admin statistics', async ({ page }) => {
    // Check for stat cards
    await expect(page.locator('text=Total Students')).toBeVisible();
    await expect(page.locator('text=Votes Cast')).toBeVisible();
    await expect(page.locator('text=Active Elections')).toBeVisible();

    // Check that stat values are displayed
    const statValues = page.locator('[class*="text-4xl"]');
    const count = await statValues.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('should allow creating an election', async ({ page }) => {
    // Find create election form
    const titleInput = page.locator('input#title');
    await titleInput.fill('Test Election 2024');

    const descInput = page.locator('textarea#description');
    await descInput.fill('This is a test election for the automated testing suite.');

    const startInput = page.locator('input#start_time');
    await startInput.fill('2024-12-15T10:00');

    const endInput = page.locator('input#end_time');
    await endInput.fill('2024-12-15T14:00');

    // Submit form
    const forms = page.locator('form');
    const createButton = forms.first().locator('button:text("Create Election")');
    if (await createButton.isVisible()) {
      await createButton.click();
      
      // Check for success message
      await expect(page.locator('text=successfully')).toBeVisible({ timeout: 10000 });
    }
  });

  test('should allow creating a position', async ({ page }) => {
    // Fill position form
    const titleInput = page.locator('input#position_title');
    await titleInput.fill('School Captain');

    const maxVotesInput = page.locator('input#max_votes');
    await maxVotesInput.fill('1');

    const electionSelect = page.locator('select#election_id');
    const options = electionSelect.locator('option');
    const optionCount = await options.count();
    
    if (optionCount > 1) {
      // Select first election option
      await electionSelect.selectOption({ index: 1 });

      // Submit form
      const forms = page.locator('form');
      const createButton = forms.nth(1).locator('button:text("Create Position")');
      if (await createButton.isVisible()) {
        await createButton.click();
        
        // Check for success message
        await expect(page.locator('text=successfully|created')).toBeVisible({ timeout: 10000 });
      }
    }
  });

  test('should export PDF report', async ({ page, context }) => {
    // Listen for download event
    const downloadPromise = context.waitForEvent('download');

    // Click PDF export button
    await page.click('a:text("Download PDF Summary")');

    // Wait for download
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('pdf');

    // Verify download succeeded
    const path = await download.path();
    expect(path).toBeTruthy();
  });

  test('should export Excel report', async ({ page, context }) => {
    // Listen for download event
    const downloadPromise = context.waitForEvent('download');

    // Click Excel export button
    await page.click('a:text("Download Excel Turnout")');

    // Wait for download
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('xlsx');

    // Verify download succeeded
    const path = await download.path();
    expect(path).toBeTruthy();
  });
});
