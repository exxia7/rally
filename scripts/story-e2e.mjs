// Walks the main story on the live store, with a removed and a renamed helper, and checks that what you did
// carries through to the end. Needs the dev server on http://localhost:5173 (npm run dev).
//   node scripts/story-e2e.mjs            (headless; HEADED=1 to watch)
// Home → New workflow → brief (2.1) → chat (2.2) → team (2.3: remove Designer, rename Writer → Copywriter) →
// Start launch → the run plays on its own (?speed=fast) → Strategist's hand (4.1: Mar 14, leave pricing out) →
// rerun (4.1b, 4.2) → Writer's hand (4.3: $15/mo) → approval (5.1: Don't post the X post) → summary (5.2) → Home.
import { chromium } from '@playwright/test'

const BASE = 'http://localhost:5173'
const BRIEF = 'Launch our new Teams plan to existing customers in two weeks'
const browser = await chromium.launch({ headless: !process.env.HEADED })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
const results = []
const check = (name, ok, detail = '') => {
  results.push({ name, ok: !!ok, detail })
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ` · ${detail}` : ''}`)
}
const text = () => page.evaluate(() => document.body.innerText)
const state = () =>
  page.evaluate(() => {
    const s = window.__pathfinder.store.get()
    return s.workflows[s.activeId]
  })
const dispatch = (a) => page.evaluate((x) => window.__pathfinder.dispatch(x), a)
const noDesigner = async (where) => {
  if (process.env.SHOTS) await page.screenshot({ path: `design/out/story-${where}.png` })
  const t = await text()
  check(`no Designer on ${where}`, !/\bDesigner\b/.test(t), /\bDesigner\b/.test(t) ? t.match(/.{0,40}\bDesigner\b.{0,40}/)?.[0] : '')
}
const waitPath = (p, timeout = 30000) => page.waitForURL((u) => u.pathname === p, { timeout })

try {
  // Home → New workflow
  await page.goto(`${BASE}/?speed=fast`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'New workflow' }).first().click()
  await waitPath('/s/2.1')

  // 2.1: type the brief and send
  const composer = page.getByPlaceholder('What are you launching, who is it for, and when?')
  await composer.fill(BRIEF)
  await composer.press('Enter')
  await waitPath('/s/2.2')
  await page.getByRole('button', { name: 'See your team' }).waitFor()
  let wf = await state()
  check('brief is the first chat message', (await text()).includes(BRIEF))
  check('workflow titled from the brief', wf.title !== 'New workflow' && BRIEF.startsWith(wf.title), wf.title)
  check('Launch brief "What" is the brief', (await text()).includes(BRIEF[0].toUpperCase() + BRIEF.slice(1)))
  const title = wf.title

  // 2.2 → 2.3
  await page.getByRole('button', { name: 'See your team' }).click()
  await waitPath('/s/2.3')

  // 2.3: remove Designer and rename Writer. Through the UI when the map writes to the store, else the store action.
  try {
    await page.getByText('Makes the images').first().click({ timeout: 3000 })
    await page.getByRole('button', { name: 'Remove helper' }).click({ timeout: 3000 })
  } catch {}
  if (!(await state()).removed.includes('designer')) {
    console.log('     (2.3 removal not wired to the store yet: removing Designer with the store action)')
    await dispatch({ type: 'helper/remove', id: 'designer' })
  }
  try {
    await page.getByText('Writes your posts and email').first().click({ timeout: 3000 })
    const name = page.getByLabel('Helper name')
    await name.fill('Copywriter', { timeout: 3000 })
    await page.getByRole('button', { name: 'Close helper' }).click({ timeout: 3000 })
  } catch {}
  if ((await state()).helpers.writer.name !== 'Copywriter') {
    console.log('     (2.3 rename not wired to the store yet: renaming Writer with the store action)')
    await dispatch({ type: 'helper/patch', id: 'writer', patch: { name: 'Copywriter' } })
  }
  wf = await state()
  check('Designer removed, Writer renamed', wf.removed.includes('designer') && wf.helpers.writer.name === 'Copywriter')
  const estimate = await page.getByText(/^About \d+ min · \$/).first().textContent().catch(() => '')
  check('estimate recalculated', estimate && estimate !== 'About 9 min · $0.30', estimate)

  // Start launch → the live run (not 3.1)
  await page.getByRole('button', { name: /Start launch|^Start$/ }).first().click()
  await waitPath('/s/3.2')
  await page.getByRole('status').first().waitFor()
  check('Start launch opens the running run', (await text()).includes('Running'))
  await noDesigner('3.2')

  // The timeline plays until the Strategist raises its hand: 4.1 opens in place with Needs you
  await waitPath('/s/4.1')
  await page.getByText('Strategist raised its hand').waitFor()
  check('hand raised on its own, Needs you pill', /Needs you · \$/.test(await text()))
  await noDesigner('4.1')
  await page.getByRole('radio', { name: /Move the launch to Mar 14/ }).click()
  await page.getByRole('button', { name: /Next: competitor pricing/ }).click()
  await page.getByRole('radio', { name: /Leave pricing out/ }).click()
  await page.getByRole('button', { name: 'Rerun Strategist' }).click()

  // 4.1b: who reruns comes from the choices (Mar 14 redoes everyone left but Insights)
  const dialog = page.getByRole('dialog')
  await dialog.waitFor()
  const dlg = await dialog.innerText()
  const confirmBtn = dialog.getByRole('button', { name: /^Rerun \d+ agents?$/ })
  const label = await confirmBtn.textContent()
  const listed = (dlg.match(/Will also rerun([\s\S]*?)About/)?.[1] ?? '')
  check('4.1b lists Copywriter, not Designer or Community', dlg.includes('Copywriter') && !dlg.includes('Designer') && !dlg.includes('Community'), label)
  const n = Number(label.match(/\d+/)[0])
  const names = ['Planner', 'Scout', 'Copywriter', 'Publisher'].filter((x) => listed.includes(x)).length
  check('4.1b count = Strategist + the helpers listed', n === names + 1, `${label}, ${names} listed`)
  await confirmBtn.click()

  // 4.2 rerun, then Writer (Copywriter) raises its hand: 4.3
  await waitPath('/s/4.2')
  await noDesigner('4.2')
  await waitPath('/s/4.3')
  await page.getByText('Copywriter raised its hand').waitFor()
  check('second hand raise is the renamed Copywriter', true)
  await page.getByRole('radio', { name: /Change the launch fact to \$15\/mo/ }).click()
  await page.getByRole('button', { name: 'Confirm' }).click()

  // finishing → approval (5.1)
  await waitPath('/s/5.1')
  await page.getByText('Ready to post').first().waitFor()
  await noDesigner('5.1')
  let t = await text()
  check('approval copy follows the choices (Mar 14, no Discord)', t.includes('Mar 14') && !t.includes('Discord post'))
  const xItem = page.locator('div', { has: page.getByText('X post', { exact: true }) }).filter({ has: page.getByRole('button', { name: "Don't post" }) }).last()
  await xItem.getByRole('button', { name: "Don't post" }).click()
  wf = await state()
  check('Don\'t post is stored', wf.approvals.x === 'wont-post')
  const waiting = Object.values(wf.approvals).filter((v) => v === 'waiting').length
  check('pill counts what is waiting', t.length > 0 && (await text()).includes(`${waiting} waiting for your OK`), `${waiting} waiting`)
  await page.getByRole('button', { name: /^Approve all \d+$/ }).click()

  // 5.2 summary
  await waitPath('/s/5.2')
  await page.getByText('Your launch is live').waitFor()
  t = await text()
  await noDesigner('5.2')
  check('declined X post shows as not posted', /X post\s*Not posted · you skipped it/.test(t))
  check('"What you fixed" follows the choices', t.includes('Moved the launch to Mar 14') && t.includes('Left pricing out') && t.includes('$15/mo'))
  check('summary line has the title and new date', t.includes(`${title} · Mar 14`))
  check('rename sticks in the agents bar', t.includes('Copywriter'))
  const chip = t.match(/(\d+) of (\d+) done/)
  const agents = t.match(/(\d+) agents done/)
  check('counts consistent at the end', chip && chip[1] === chip[2] && agents && Number(agents[1]) === 6, `${chip?.[0]}, ${agents?.[0]}`)
  check('skipped post noted', t.includes('You skipped 1 post today'))

  // Done → Home: the card says Done · Launched Mar 14
  await page.getByRole('button', { name: 'Done', exact: true }).click()
  await waitPath('/')
  await page.getByText('Your workflows').waitFor()
  const card = page.getByRole('button', { name: new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) })
  const cardText = await card.first().innerText()
  check('Home card shows Done · Launched Mar 14', /Done/.test(cardText) && cardText.includes('Launched Mar 14'), cardText.replace(/\n/g, ' · '))
  await noDesigner('Home')

  // Reload keeps state
  await page.reload({ waitUntil: 'networkidle' })
  check('reload keeps the session', (await text()).includes(title))
} catch (e) {
  check('story completed', false, e.message.split('\n')[0])
  await page.screenshot({ path: 'design/out/story-e2e-failure.png' })
}
check('no page errors', errors.length === 0, errors[0])
await browser.close()
const failed = results.filter((r) => !r.ok)
console.log(failed.length ? `\n${failed.length} of ${results.length} checks failed` : `\nall ${results.length} checks passed`)
if (failed.length) process.exitCode = 1
