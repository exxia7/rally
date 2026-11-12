// Real Claude smoke test through the original Figma screens and controls.
import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
const base = process.env.BASE_URL || 'http://127.0.0.1:5180';
const browser = await chromium.launch({
  channel: 'chrome',
  headless: !process.env.HEADED,
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  reducedMotion: 'reduce',
  acceptDownloads: true,
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await mkdir('design/out', { recursive: true });
let wid;
const get = async () =>
  (await (await fetch(`${base}/api/workflows`)).json()).find(
    (w) => w.id === wid
  );
async function waitFor(check, label) {
  const end = Date.now() + 240000;
  while (Date.now() < end) {
    const w = await get();
    if (w?.error) throw Error(w.error);
    if (w?.branches.some((b) => b.status === 'failed'))
      throw Error(JSON.stringify(w.branches));
    if (w && await check(w)) return w;
    await new Promise((r) => setTimeout(r, 400));
  }
  throw Error(`Timed out: ${label}`);
}
try {
  await page.goto(base);
  await page
    .getByRole('button', { name: 'New workflow', exact: true })
    .first()
    .click();
  await page
    .getByLabel('Launch brief', { exact: true })
    .fill(
      'Create a launch email and a short social post for Acme Notes, a free notes app for university students. It launches tomorrow. Use exactly two independent Writer steps, one per deliverable. Keep each under 80 words. The email step must ask me what tone to use before it writes. The social post can use a warm tone. Do not ask questions during planning; put the tone question in the email step instructions.'
    );
  await page
    .locator('input[type=file]')
    .setInputFiles({
      name: 'facts.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from(
        'Acme Notes is free. Audience: university students. No external posts.'
      ),
    });
  await expect(page.getByText('facts.txt', { exact: true })).toBeVisible();
  await page.getByLabel('Launch brief', { exact: true }).press('Enter');
  await page.waitForURL(/\/w\/[^/]+\/chat/);
  wid = page.url().split('/w/')[1].split('/')[0];
  let w = await waitFor((w) => w.plan && !w.planning, 'plan');
  assert.equal(w.plan.steps.length, 2);
  assert.match(w.attachments[0].text, /No external posts/);
  await page
    .getByRole('button', { name: 'See your team', exact: true })
    .click();
  await page.waitForURL(/\/team$/);
  console.log('PASS original brief → chat → team; real Claude plan', wid);
  const email =
    w.plan.steps.find((s) => /email/i.test(s.name)) || w.plan.steps[0];
  await page.getByText(email.name, { exact: true }).first().click();
  await page.getByLabel('Helper name', { exact: true }).fill('Launch copy');
  await page.getByLabel('Helper name', { exact: true }).press('Tab');
  await waitFor(
    (w) => w.plan.steps.some((s) => s.name === 'Launch copy'),
    'helper edit'
  );
  await page.getByRole('button', { name: 'Close helper', exact: true }).click();
  await page.screenshot({ path: 'design/out/restored-plan.png' });
  await page.getByRole('button', { name: 'Start launch', exact: true }).click();
  await page.waitForURL(/\/run$/);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await waitFor(
    (w) =>
      w.branches[0].status === 'paused' &&
      !w.branches[0].attempts.some((a) => a.status === 'running'),
    'pause'
  );
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await waitFor((w) => w.branches[0].status === 'needs_input', 'question');
  await expect(
    page.getByRole('heading', { name: 'Your input is needed', exact: true })
  ).toBeVisible();
  await page
    .getByLabel('Something else', { exact: true })
    .fill('Friendly and clear.');
  await page
    .getByRole('button', { name: 'Answer and continue', exact: true })
    .click();
  await page.reload();
  await waitFor((w) => w.branches[0].status === 'review', 'review');
  await page.waitForURL(/\/approve$/);
  console.log('PASS original run and hand-raise panels; pause, answer, reload');
  await page.getByRole('button', { name: 'Edit', exact: true }).first().click();
  await page
    .getByRole('textbox', { name: /^Edit / })
    .fill(
      'Demo-approved launch copy. Acme Notes is free for students and launches tomorrow.'
    );
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await waitFor(
    (w) =>
      w.branches[0].attempts.some((a) =>
        a.content?.startsWith('Demo-approved')
      ),
    'save output'
  );
  await page
    .getByRole('button', { name: /Don.t post/, exact: true })
    .last()
    .click();
  await waitFor(
    (w) => w.branches[0].attempts.some((a) => a.approval === 'declined'),
    'skip'
  );
  await page
    .getByRole('button', { name: 'Approve all 1', exact: true })
    .click();
  await page.waitForURL(/\/summary$/);
  await expect(
    page.getByRole('heading', { name: 'Your work is ready', exact: true })
  ).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Download approved outputs', exact: true })
    .click();
  await (await downloadPromise).saveAs('design/out/restored-export.md');
  assert.match(
    await readFile('design/out/restored-export.md', 'utf8'),
    /Demo-approved launch copy/
  );
  await page.screenshot({ path: 'design/out/restored-summary.png' });
  console.log(
    'PASS original approval and summary; edited text exported, skipped output excluded'
  );
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page
    .getByRole('button')
    .filter({ hasText: 'Acme Notes' })
    .last()
    .click();
  await page.waitForURL(/\/run$/);
  await page.getByText('Launch copy', { exact: true }).first().click();
  await page.getByRole('button', { name: /Fork from here/ }).click();
  await page
    .getByPlaceholder(
      /What should this fork try|Tell the team|Try a different|e.g./
    )
    .fill('Make it playful. The tone is playful. Do not ask again.')
    .catch(async () => {
      await page
        .locator('aside textarea')
        .fill('Make it playful. The tone is playful. Do not ask again.');
    });
  await page.getByRole('button', { name: 'Create fork', exact: false }).click();
  w = await waitFor(
    async (w) => {
      const fork = w.branches[1];
      if (fork?.status === 'needs_input') {
        await page.getByLabel('Something else', { exact: true }).fill('Playful. Use the new branch instruction.');
        await page.getByRole('button', { name: 'Answer and continue', exact: true }).click();
      }
      return fork?.status === 'review';
    },
    'fork'
  );
  assert.equal(w.branches[0].status, 'done');
  await page
    .getByRole('button')
    .filter({ hasText: 'Ready for approval' })
    .last()
    .click();
  await page
    .getByRole('button', { name: 'Use this version', exact: true })
    .click();
  await waitFor((w) => w.selectedBranch === w.branches[1].id, 'select fork');
  await page.getByRole('button', { name: /Approve all/ }).click();
  await waitFor((w) => w.branches[1].status === 'done', 'approve fork');
  console.log('PASS original inline fork and branch approval');
  await page.screenshot({ path: 'design/out/restored-fork.png' });
  const phoneContext = await browser.newContext({
    viewport: { width: 375, height: 812 },
    reducedMotion: 'reduce',
  });
  const phone = await phoneContext.newPage();
  await phone.goto(`${base}/w/${wid}/team`);
  await expect(
    phone.getByRole('tab', { name: 'Plan', exact: true })
  ).toBeVisible();
  assert.equal(
    await phone.evaluate(
      () => document.documentElement.scrollWidth > innerWidth
    ),
    false
  );
  await phone.screenshot({ path: 'design/out/restored-mobile.png' });
  assert.deepEqual(errors, []);
  console.log('PASS second browser, mobile, no page errors');
} catch (error) {
  console.error((await page.locator('body').innerText()).slice(-5500));
  await page.screenshot({
    path: 'design/out/restored-failure.png',
    fullPage: true,
  });
  throw error;
} finally {
  await browser.close();
}
