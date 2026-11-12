import { chromium } from '@playwright/test';
const b = await chromium.launch();
const out = '/private/tmp/claude-501/-Users-exxia--claude-spares-spare-T3TiCs/3cd2c4c1-0682-4c17-9738-19309165e37c/scratchpad';
for (const W of [1440, 375]) {
  const p = await b.newPage({ viewport: { width: W, height: W < 768 ? 812 : 900 } });
  await p.goto('http://localhost:5173/s/2.3?speed=hold', { waitUntil: 'networkidle' });
  await p.getByRole('button', { name: /^(Start launch|Start)$/ }).first().click();
  await p.waitForTimeout(600);
  await p.getByRole('tab', { name: /^(Planning|Plan)$/ }).first().click();
  await p.waitForTimeout(600);
  await p.screenshot({ path: `${out}/midrun-${W}.png` });
  await p.goto('http://localhost:5173/s/1.2', { waitUntil: 'networkidle' });
  await p.getByRole('button', { name: 'Edit', exact: true }).first().click();
  await p.waitForTimeout(300);
  await p.screenshot({ path: `${out}/preset-${W}.png` });
  await p.keyboard.press('Escape');
  await p.getByRole('button', { name: 'Connect', exact: true }).click();
  await p.waitForTimeout(300);
  await p.screenshot({ path: `${out}/connect-${W}.png` });
  await p.close();
}
await b.close();
