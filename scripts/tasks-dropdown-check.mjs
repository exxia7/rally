// Checks the Tasks dropdown (TasksDropdown on CanvasListCard) on every run and plan canvas. Needs the dev server on
// http://localhost:5173 (npm run dev).
//   node scripts/tasks-dropdown-check.mjs            (headless; HEADED=1 to watch)
// Per screen, at 1440×900 and 375×812: the header toggles it (aria-expanded) and the open card stays inside the
// viewport (phones: 16px gutters); a row folds it and does what its card does (an inspector naming the step); Escape
// folds it and returns focus to the header; an outside click folds it AND lands (Zoom in zooms, Pause pauses);
// Enter opens it with focus on the first row and arrows move between rows; "Goes out" lists the outputs with their
// run status; under 1280px opening it closes a panel covering the map. Also: the `*-tasks` deep links open it on load
// (alone under 1280px), the rows follow the live run (?speed=fast), a long list (steps added on the plan) scrolls
// inside the card, and the plan canvases (2.3, 2.5 at 1440/1024/375) use the same card for the planned steps and
// what goes out (add, remove, renamed and removed helpers, a row opens the drawer).
import { chromium } from "@playwright/test";

const BASE = "http://localhost:5173";
const SCREENS = process.env.SCREENS?.split(",") ?? [
  "3.2",
  "3.3",
  "4.2",
  "4.3",
  "5.1",
  "5.2",
  "6.3",
  "6.5",
];
const SIZES = [
  { width: 1440, height: 900 },
  { width: 375, height: 812 },
];
const browser = await chromium.launch({ headless: !process.env.HEADED });
const results = [];
const check = (where, name, ok, detail = "") => {
  results.push({ where, name, ok: !!ok, detail });
  if (!ok || process.env.VERBOSE)
    console.log(
      `${ok ? "ok  " : "FAIL"} ${where} · ${name}${detail ? ` · ${detail}` : ""}`,
    );
};

const header = (page) =>
  page
    .locator("button[aria-expanded]")
    .filter({ hasText: /^Tasks/ })
    .first();
const expanded = async (page) =>
  (await header(page).getAttribute("aria-expanded")) === "true";
const card = (page) => header(page).locator("xpath=..");
const rows = (page) => card(page).locator("[data-card-body] button");
const settle = (page, ms = 350) => page.waitForTimeout(ms);
const visibleAside = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll("aside")].some((a) => {
      const r = a.getBoundingClientRect();
      return (
        r.width > 0 &&
        r.height > 0 &&
        r.right <= innerWidth + 1 &&
        r.left < innerWidth
      );
    }),
  );
const zoomLabel = (page) =>
  page
    .getByRole("button", { name: "Zoom in" })
    .locator("xpath=preceding-sibling::div[1]")
    .innerText();
const pauseButton = (page) =>
  page.getByRole("button", { name: /^(Pause|Resume)$/ }).first();

async function open(page) {
  if (!(await expanded(page))) await header(page).click();
  await settle(page);
  return expanded(page);
}

async function clearCover(page, size) {
  // 5.2's summary modal, and (under 1280px) a side panel's scrim, cover the header: Escape closes them.
  for (let i = 0; i < 3; i++) {
    const modal = await page
      .locator('[role="dialog"][aria-label="Launch summary"]')
      .count();
    if (!modal && !(size.width < 1280 && (await visibleAside(page)))) break;
    await page.keyboard.press("Escape");
    await settle(page);
  }
}

for (const size of SIZES) {
  for (const id of SCREENS) {
    const where = `${id}@${size.width}`;
    const page = await browser.newPage({ viewport: size });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.setDefaultTimeout(5000);
    try {
      await page.goto(`${BASE}/s/${id}?speed=hold`, {
        waitUntil: "networkidle",
      });
      await settle(page, 500);
      // 5.2's summary stays modal while open: close it first.
      if (
        await page
          .locator('[role="dialog"][aria-label="Launch summary"]')
          .count()
      ) {
        await page.keyboard.press("Escape");
        await settle(page);
      }
      check(
        where,
        "header present, closed",
        (await header(page).count()) && !(await expanded(page)),
      );

      // Open: inside the viewport (phones: 16px gutters) and clear of the zoom controls. Under 1280px a panel that
      // covers the map (5.1's approval sheet, 4.3's hand-raise) closes as the list opens.
      const covered = size.width < 1280 && (await visibleAside(page));
      check(where, "header opens it", await open(page));
      if (covered)
        check(
          where,
          "opening closes the panel covering the map",
          !(await visibleAside(page)),
        );
      const goes = await card(page).evaluate((el) => {
        const body = el.querySelector("[data-card-body]");
        const label = [...body.querySelectorAll("p")].find(
          (p) => p.textContent === "Goes out",
        );
        return label
          ? {
              n: [...body.children].slice([...body.children].indexOf(label) + 1)
                .length,
              text: body.innerText.split("Goes out")[1],
            }
          : null;
      });
      check(
        where,
        '"Goes out" lists the outputs',
        goes && goes.n > 0,
        goes ? `${goes.n} outputs` : "no section",
      );
      if (id === "5.1")
        check(
          where,
          "5.1: outputs need your OK",
          /Needs your OK/.test(goes?.text ?? ""),
        );
      if (id === "5.2")
        check(where, "5.2: outputs posted", /Posted/.test(goes?.text ?? ""));
      if (/^3\./.test(id))
        check(
          where,
          "run: outputs wait, no add or remove",
          /Waiting/.test(goes?.text ?? "") &&
            !(await card(page).getByText("Add an output").count()),
        );
      const box = await card(page).boundingBox();
      const zoom = await page
        .getByRole("button", { name: "Zoom in" })
        .locator("xpath=..")
        .boundingBox();
      check(
        where,
        "open card inside the viewport",
        box &&
          box.x >= 0 &&
          box.y >= 0 &&
          box.x + box.width <= size.width &&
          box.y + box.height <= size.height,
        box &&
          `${Math.round(box.x)},${Math.round(box.y)} ${Math.round(box.width)}×${Math.round(box.height)}`,
      );
      if (size.width < 768)
        check(
          where,
          "phone: full width minus 16px gutters",
          box &&
            Math.round(box.x) === 16 &&
            Math.round(box.x + box.width) === size.width - 16,
        );
      const overlaps = (a, b) =>
        a &&
        b &&
        a.x < b.x + b.width &&
        b.x < a.x + a.width &&
        a.y < b.y + b.height &&
        b.y < a.y + a.height;
      check(
        where,
        "open card clear of the zoom controls",
        !overlaps(box, zoom),
      );
      const n = await rows(page).count();
      check(where, "rows listed", n > 0, `${n} rows`);

      // A row: folds the card and opens that step's inspector (what clicking its card does).
      const last = rows(page).nth(n - 1);
      const title = (await last.locator("p").first().innerText()).trim();
      await last.click();
      await settle(page, 500);
      const shown = await page.evaluate(
        (t) =>
          [...document.querySelectorAll('aside, [role="dialog"]')].some(
            (el) => {
              const r = el.getBoundingClientRect();
              return r.width > 0 && r.height > 0 && el.innerText.includes(t);
            },
          ),
        title,
      );
      check(where, `row "${title}" folds the card`, !(await expanded(page)));
      check(where, `row "${title}" opens its step`, shown);
      if (size.width < 768) {
        // The inspector is a half-height sheet: the card is folded, so nothing collides with it.
        check(
          where,
          "phone: card folded under the sheet",
          !(await expanded(page)),
        );
      }
      await clearCover(page, size);

      // Escape folds it and returns focus to the header.
      await open(page);
      await rows(page).first().focus();
      await page.keyboard.press("Escape");
      await settle(page);
      check(where, "Escape folds it", !(await expanded(page)));
      check(
        where,
        "Escape returns focus to the header",
        await header(page).evaluate((el) => el === document.activeElement),
      );

      // Keyboard: Enter opens with focus on the first row; arrows move between rows.
      await header(page).focus();
      await page.keyboard.press("Enter");
      await settle(page);
      const firstFocused = await rows(page)
        .first()
        .evaluate((el) => el === document.activeElement);
      check(
        where,
        "Enter opens it, focus on the first row",
        (await expanded(page)) && firstFocused,
      );
      if (n > 1) {
        await page.keyboard.press("ArrowDown");
        check(
          where,
          "ArrowDown moves to the next row",
          await rows(page)
            .nth(1)
            .evaluate((el) => el === document.activeElement),
        );
        await page.keyboard.press("ArrowUp");
        await page.keyboard.press("ArrowUp");
        check(
          where,
          "ArrowUp moves back up to the header",
          await header(page).evaluate((el) => el === document.activeElement),
        );
      }
      await page.keyboard.press("Escape");
      await settle(page);

      // Outside clicks fold it and still land: Zoom in zooms, Pause pauses.
      await open(page);
      const zoomBefore = await zoomLabel(page);
      await page.getByRole("button", { name: "Zoom in" }).click();
      await settle(page);
      const zoomAfter = await zoomLabel(page);
      check(where, "outside click (Zoom in) folds it", !(await expanded(page)));
      check(
        where,
        "outside click (Zoom in) also zooms",
        zoomAfter !== zoomBefore,
        `${zoomBefore} → ${zoomAfter}`,
      );
      if (await pauseButton(page).count()) {
        await open(page);
        const before = await pauseButton(page).getAttribute("aria-label");
        await pauseButton(page).click();
        await settle(page);
        const after = await pauseButton(page)
          .getAttribute("aria-label")
          .catch(() => before);
        check(where, "outside click (Pause) folds it", !(await expanded(page)));
        check(
          where,
          "outside click (Pause) also toggles Pause",
          after !== before || (await visibleAside(page)),
          `${before} → ${after}`,
        );
      }
      // The header toggles it closed too.
      await clearCover(page, size);
      await open(page);
      await header(page).click();
      await settle(page);
      check(where, "header click folds it", !(await expanded(page)));
      check(where, "no page errors", !errors.length, errors.join(" | "));
    } catch (e) {
      check(where, "ran to the end", false, e.message.split("\n")[0]);
    }
    await page.close();
  }
}

// Deep links: the `*-tasks` frames open it on load. Under 1280px, where a panel would cover the map, they open the
// list alone (no panel over it).
const TABLET = { width: 768, height: 1024 };
for (const [id, size] of [
  ["3.2-tasks", SIZES[0]],
  ["3.3-tasks", SIZES[0]],
  ["3.4-tasks", SIZES[0]],
  ["3.5-tasks", SIZES[0]],
  ["4.2-tasks", SIZES[0]],
  ["3.2-tasks", SIZES[1]],
  ["4.2-tasks", SIZES[1]],
  ["3.3-tasks", SIZES[1]],
  ["3.5-tasks", SIZES[1]],
  ["3.3-tasks", TABLET],
  ["3.5-tasks", TABLET],
]) {
  const page = await browser.newPage({ viewport: size });
  await page.goto(`${BASE}/s/${id}?speed=hold`, { waitUntil: "networkidle" });
  await settle(page, 500);
  const where = `${id}@${size.width}`;
  check(where, "deep link opens it", await expanded(page));
  if (size.width < 1280)
    check(where, "no panel over the list", !(await visibleAside(page)));
  await page.close();
}

// Live: start a run from the plan (?speed=fast) and, on 3.2, keep the list open while the launch beats play: the
// rows and the count re-render from the store, and the list stays open.
{
  const where = "3.2 live";
  const page = await browser.newPage({ viewport: SIZES[0] });
  await page.goto(`${BASE}/s/2.3?speed=fast`, { waitUntil: "networkidle" });
  await page
    .getByRole("button", { name: /^Start/ })
    .first()
    .click();
  await page.waitForURL((u) => u.pathname === "/s/3.2");
  await open(page);
  const snap = () =>
    card(page)
      .innerText()
      .catch(() => "");
  const before = await snap();
  let after = before;
  for (let i = 0; i < 60 && after === before; i++) {
    await settle(page, 100);
    after = await snap();
  }
  const line = (t) =>
    `${t.match(/\d+ of \d+ done/)?.[0] ?? "?"}, ${t.match(/\b(Done|Running|Waiting)\b/g)?.join(" ") ?? ""}`;
  check(
    where,
    "rows follow the run while open",
    after !== before,
    `${line(before)} → ${line(after)}`,
  );
  check(where, "still open after the beat", await expanded(page));
  await page.close();
}

// A long list: three steps added on the plan, then a short window. The rows scroll inside the card, which stays
// inside the canvas.
for (const size of [
  { width: 1440, height: 620 },
  { width: 375, height: 640 },
]) {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  await page.goto(`${BASE}/s/2.3?speed=hold`, { waitUntil: "networkidle" });
  for (const [i, name] of [
    "Fact-checker",
    "Legal review",
    "Translator",
  ].entries())
    await page.evaluate(
      ([i, name]) =>
        window.__pathfinder.dispatch({
          type: "plan/insertStep",
          edit: {
            edge: { from: "strategist", to: "writer" },
            step: { type: "helper", name, description: name },
            id: `step-${i + 1}`,
          },
          helper: {
            name,
            kind: "action",
            description: name,
            state: "new",
            model: "Haiku 5.5",
            tokensK: 2,
            skills: [],
            files: [],
            getsFrom: "Strategist",
            passesTo: "Writer",
            passes: "Its work",
            checks: "Team default · when unsure",
          },
        }),
      [i, name],
    );
  await page
    .getByRole("button", { name: /^Start/ })
    .first()
    .click();
  await page.waitForURL((u) => /\/s\/3\./.test(u.pathname));
  await page.setViewportSize(size);
  await settle(page, 500);
  await clearCover(page, size);
  await open(page);
  const where = `long list@${size.width}x${size.height}`;
  const m = await card(page).evaluate((el) => {
    const body = el.querySelector("[data-card-body]");
    const canvas = el.parentElement.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return {
      rows: body.querySelectorAll("button").length,
      scroll: body.scrollHeight > body.clientHeight + 1,
      inside: r.bottom <= canvas.bottom && r.right <= canvas.right,
    };
  });
  check(where, "added steps listed", m.rows > 10, `${m.rows} rows`);
  check(where, "rows scroll inside the card", m.scroll);
  check(where, "card stays inside the canvas", m.inside);
  await page.close();
}

// Plan canvases: the same dropdown, top-left, folded: "N planned", the helpers' steps (a row opens that helper's
// drawer), then "Goes out" with remove on hover and "Add an output" (store `outputs/set`). Renamed and removed helpers
// show at once. Open, it stays clear of the legend and the zoom controls; Escape and outside clicks fold it.
const storeWf = (page) =>
  page.evaluate(() => {
    const s = window.__pathfinder.store.get();
    return s.workflows[s.activeId];
  });
const dispatchIn = (page, a) =>
  page.evaluate((x) => window.__pathfinder.dispatch(x), a);
for (const size of [
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
  { width: 375, height: 812 },
]) {
  for (const id of ["2.3", "2.5"]) {
    const where = `${id} plan@${size.width}`;
    const page = await browser.newPage({ viewport: size });
    page.setDefaultTimeout(5000);
    try {
      await page.goto(`${BASE}/s/${id}?speed=hold`, {
        waitUntil: "networkidle",
      });
      await settle(page, 500);
      check(
        where,
        "no What goes out card",
        !(await page.getByText("What goes out", { exact: true }).count()),
      );
      const hb = await header(page).boundingBox();
      check(
        where,
        "folded, top-left 16px in",
        !(await expanded(page)) &&
          hb &&
          (await header(page).innerText()).match(/\d+ planned/),
      );
      await open(page);
      const b = await card(page).boundingBox();
      const z = await page
        .getByRole("button", { name: "Zoom in" })
        .locator("xpath=..")
        .boundingBox();
      const legend = await page
        .getByText("Does the work")
        .first()
        .boundingBox()
        .catch(() => null);
      const clear = (a, o) =>
        !o ||
        !(
          a.x < o.x + o.width &&
          o.x < a.x + a.width &&
          a.y < o.y + o.height &&
          o.y < a.y + a.height
        );
      check(
        where,
        "open card clear of zoom controls and legend",
        clear(b, z) &&
          (!legend ||
            !(await page.getByText("Does the work").first().isVisible()) ||
            clear(b, legend)),
      );
      if (size.width < 768)
        check(
          where,
          "phone: full width minus 16px gutters",
          Math.round(b.x) === 16 &&
            Math.round(b.x + b.width) === size.width - 16,
        );
      const wf = await storeWf(page);
      const helpers = wf.helperOrder.filter(
        (h) => wf.helpers[h] && !wf.removed.includes(h),
      );
      const rowText = await card(page).locator("[data-card-body]").innerText();
      check(
        where,
        "one row per helper",
        helpers.every((h) => rowText.includes(wf.helpers[h].name)),
        `${helpers.length} helpers`,
      );
      check(
        where,
        "outputs under Goes out",
        wf.outputs.every((o) =>
          rowText.split("Goes out")[1]?.includes(o.label),
        ),
      );

      // Add and remove outputs (the store follows).
      const n0 = (await storeWf(page)).outputs.length;
      await card(page).getByRole("button", { name: "Add an output" }).click();
      await settle(page);
      const added = (await storeWf(page)).outputs;
      check(
        where,
        "Add an output adds one",
        added.length === n0 + 1 &&
          (await card(page).getByText("New output").count()) > 0,
      );
      const victim = added[0];
      const row = card(page)
        .locator("[data-card-body] > *")
        .filter({ hasText: victim.label })
        .first();
      await row.hover();
      await card(page)
        .getByRole("button", { name: `Remove ${victim.label}` })
        .click();
      await settle(page);
      const after = (await storeWf(page)).outputs;
      check(
        where,
        `remove ${victim.label}`,
        after.length === n0 && !after.some((o) => o.id === victim.id),
      );
      check(where, "still open after add/remove", await expanded(page));

      // Renamed and removed helpers.
      await dispatchIn(page, {
        type: "helper/patch",
        id: "writer",
        patch: { name: "Copywriter" },
      });
      await dispatchIn(page, { type: "helper/remove", id: "designer" });
      await settle(page);
      const t2 = await card(page).locator("[data-card-body]").innerText();
      check(
        where,
        "renamed helper shows",
        t2.includes("Copywriter") && !/^Writer$/m.test(t2),
      );
      check(where, "removed helper gone", !/^Designer$/m.test(t2));

      // Escape folds it; an outside click folds it and lands.
      await page.keyboard.press("Escape");
      await settle(page);
      check(where, "Escape folds it", !(await expanded(page)));
      await open(page);
      const zb = await zoomLabel(page);
      await page.getByRole("button", { name: "Zoom in" }).click();
      await settle(page);
      check(
        where,
        "outside click folds it and lands",
        !(await expanded(page)) && (await zoomLabel(page)) !== zb,
      );

      // A planned row opens that helper's drawer.
      await open(page);
      await card(page)
        .locator("[data-card-body] button")
        .filter({ hasText: "Strategist" })
        .first()
        .click();
      await settle(page, 600);
      const drawer = await page.evaluate(() =>
        [...document.querySelectorAll("aside")].some(
          (a) =>
            a.getBoundingClientRect().width > 0 &&
            /Strategist/.test(a.innerText) &&
            /Model|Skills|Checks/.test(a.innerText),
        ),
      );
      check(
        where,
        "Strategist row opens its drawer",
        !(await expanded(page)) && drawer,
      );
    } catch (e) {
      check(where, "ran to the end", false, e.message.split("\n")[0]);
    }
    await page.close();
  }
}

await browser.close();
const failed = results.filter((r) => !r.ok);
const by = new Map();
for (const r of results) {
  const s = by.get(r.where) ?? { ok: 0, fail: 0 };
  s[r.ok ? "ok" : "fail"]++;
  by.set(r.where, s);
}
console.log("\nPer screen:");
for (const [where, s] of by)
  console.log(
    `${s.fail ? "FAIL" : "ok  "} ${where.padEnd(28)} ${s.ok}/${s.ok + s.fail}`,
  );
console.log(
  `\n${results.length - failed.length}/${results.length} checks passed`,
);
process.exit(failed.length ? 1 : 0);
