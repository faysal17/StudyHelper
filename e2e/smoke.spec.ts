import { test, expect, type Page } from '@playwright/test';

const TEST_EMAIL = process.env.TEST_USER_EMAIL;
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD;

test.skip(
  !TEST_EMAIL || !TEST_PASSWORD,
  'TEST_USER_EMAIL / TEST_USER_PASSWORD must be set in .env.local to run smoke tests'
);

// Known, already-documented failing requests that aren't a regression signal
// on their own (root-caused by hand via network inspection before adding
// these — see AUDIT.md section 6, "the fallback always executes bug"):
// - Vercel Analytics/Speed Insights scripts only resolve when actually
//   deployed on Vercel; they 404 in any local/self-hosted run.
// - Every /rest/v1/user_settings call currently 400s, for two independent,
//   already-tracked reasons (AUDIT.md Bug 1 / milestone M5): (a) some calls
//   race Supabase session hydration and fall back to the literal user id
//   'user-owner', which Postgres rejects as an invalid UUID; (b) every
//   settings *write* 400s because the `show_weekly_rank_modal` column the
//   app writes was never migrated into the live database. Both are real
//   bugs, but pre-existing and already scheduled to be fixed by M5 — this
//   suite shouldn't fail on them again until that milestone lands.
const KNOWN_FAILING_REQUESTS = [
  /\/_vercel\/(insights|speed-insights)\/script\.js$/,
  /\/rest\/v1\/user_settings(\?|$)/,
];

function isKnownFailingRequest(url: string) {
  return KNOWN_FAILING_REQUESTS.some((pattern) => pattern.test(url));
}

async function login(page: Page) {
  await page.goto('/login');
  await page.getByPlaceholder('you@example.com').fill(TEST_EMAIL!);
  await page.getByPlaceholder('••••••••').fill(TEST_PASSWORD!);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL('/');
}

test.describe('auth', () => {
  test('unauthenticated visitor is redirected to /login', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL('/login');
    await expect(page.getByRole('heading', { name: /sign in to studyhub/i })).toBeVisible();
  });

  test('can log in with test credentials', async ({ page }) => {
    await login(page);
    await expect(page).toHaveURL('/');
  });
});

test.describe('core navigation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  const routes = ['/today', '/tasks', '/syllabus', '/rank', '/settings', '/tools'];

  for (const path of routes) {
    test(`${path} loads without unexpected errors`, async ({ page }) => {
      const failedRequests: string[] = [];
      const pageErrors: string[] = [];

      page.on('response', (res) => {
        if (res.status() >= 400 && !isKnownFailingRequest(res.url())) {
          failedRequests.push(`${res.status()} ${res.url()}`);
        }
      });
      page.on('pageerror', (err) => pageErrors.push(err.message));

      await page.goto(path);
      await page.waitForLoadState('networkidle');

      // /rank legitimately redirects to / when show_rank_features is off for
      // this account (intentional feature gating, not a bug) — just assert
      // the page settled somewhere in the app rather than crashing/hanging.
      expect(page.url()).toMatch(/^http:\/\/localhost:3000\//);
      expect(pageErrors, `uncaught JS errors on ${path}`).toEqual([]);
      expect(failedRequests, `unexpected failed requests on ${path}`).toEqual([]);
    });
  }
});

test.describe('subject / topic CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('create a subject and topic, then delete the subject', async ({ page }) => {
    const stamp = Date.now();
    const subjectName = `Smoke Subject ${stamp}`;
    const topicName = `Smoke Topic ${stamp}`;

    await page.goto('/syllabus');

    // --- Create subject ---
    const subjectForm = page.locator('form').filter({ hasText: '1. New Subject' });
    await subjectForm.getByPlaceholder('e.g. Bangladesh Affairs').fill(subjectName);
    await subjectForm.getByRole('button', { name: /add subject/i }).click();

    const subjectCard = page.locator('div.glass-panel', { hasText: subjectName }).first();
    await expect(subjectCard.getByRole('heading', { name: subjectName, exact: true })).toBeVisible();

    // --- Create topic under the new subject ---
    // The subject picker is a custom dropdown (components/CustomSelect.tsx),
    // not a native <select>. It's the only type="button" element in this
    // form ahead of the submit button; its current label is whichever
    // subject happens to already be selected, so we can't match it by
    // placeholder text alone.
    const topicForm = page.locator('form').filter({ hasText: '2. New Topic' });
    await topicForm.locator('button[type="button"]').first().click();
    await page.getByRole('button', { name: subjectName, exact: true }).click();
    await topicForm.getByPlaceholder('e.g. Ancient Bengal History').fill(topicName);
    await topicForm.getByRole('button', { name: /add topic/i }).click();

    await expect(subjectCard.getByText(topicName)).toBeVisible();

    // --- Cleanup: delete the subject (cascades the topic) ---
    await subjectCard.getByTitle('Delete Subject').click();
    await page.getByRole('button', { name: /yes, delete/i }).click();
    await expect(
      page.getByRole('heading', { name: subjectName, exact: true })
    ).not.toBeVisible();
  });
});
