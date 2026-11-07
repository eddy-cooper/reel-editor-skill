// Stock clips of a real site, recorded as screencasts (CDP) on a test account.
// Usage, from the workspace root: node scripts/capture.mjs reel-03
// Each clip -> <reel>/public/clips/<name>.mp4 (1080x1920, 25 fps) plus events in clips.json
// (click positions in clip pixels, times in clip seconds) so Remotion can draw the cursor.
// Log in first with scripts/login.mjs, which saves .auth.json.
//
// record(), tidy(), go() and scrollTo() are the reusable part. The clip section below is a worked
// example on vcehub.com.au (study design tracker and Test Maker); replace it with your own flows.
// Tracker marks save to the account, so the example picks a subject nobody has marked yet.
import { chromium } from "playwright";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = path.join(import.meta.dirname, "..");
dotenv.config({ path: path.join(root, ".env") });
if (!process.argv[2]) throw new Error("usage: node scripts/capture.mjs <reel folder>");
const reel = path.resolve(root, process.argv[2]);
const out = path.join(reel, "public", "clips");
const tmp = path.join(reel, "analysis", "frames");
fs.mkdirSync(out, { recursive: true });
const DSF = 2.5;
const meta = {};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 432, height: 768 }, deviceScaleFactor: DSF, storageState: path.join(root, ".auth.json"), acceptDownloads: true });
const page = await ctx.newPage();
const BASE = process.env.SITE_URL ?? "https://vcehub.com.au";

const tidy = async () => {
  const hide = page.getByRole("button", { name: "Hide the sale banner" });
  if (await hide.isVisible().catch(() => false)) await hide.click();
  const dismiss = page.getByRole("button", { name: "Dismiss", exact: true });
  if (await dismiss.isVisible().catch(() => false)) await dismiss.click().catch(() => {});
  await page.mouse.move(-10, -10);
  await page.waitForTimeout(300);
};
const go = async (u) => { await page.goto(BASE + u, { waitUntil: "networkidle" }); await page.waitForTimeout(1200); await tidy(); await page.waitForTimeout(1200); await tidy(); };
// Eased scroll driven by rAF so every frame of the move gets painted.
const scrollTo = (y, ms = 900) => page.evaluate(([y, ms]) => new Promise((res) => {
  const y0 = window.scrollY, t0 = performance.now();
  const e = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
  const step = (now) => { const p = Math.min(1, (now - t0) / ms); window.scrollTo(0, y0 + (y - y0) * e(p)); p < 1 ? requestAnimationFrame(step) : res(); };
  requestAnimationFrame(step);
}), [y, ms]);
const docY = (loc) => loc.evaluate((el) => el.getBoundingClientRect().top + window.scrollY);

async function record(name, fn) {
  const cdp = await ctx.newCDPSession(page);
  const frames = [];
  const events = [];
  cdp.on("Page.screencastFrame", (f) => {
    frames.push({ ts: f.metadata.timestamp, data: f.data });
    cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
  });
  const t0 = Date.now() / 1000;
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 95, maxWidth: 1080, maxHeight: 1920, everyNthFrame: 1 });
  const now = () => Date.now() / 1000 - t0;
  const click = async (loc, { force = false } = {}) => {
    await loc.scrollIntoViewIfNeeded().catch(() => {});
    const b = await loc.boundingBox();
    const x = b.x + b.width / 2, y = b.y + b.height / 2;
    await page.mouse.move(x, y, { steps: 8 });
    events.push({ t: +now().toFixed(3), x: Math.round(x * DSF), y: Math.round(y * DSF), click: true });
    await loc.click({ force });
  };
  const pointAt = (x, y) => events.push({ t: +now().toFixed(3), x: Math.round(x * DSF), y: Math.round(y * DSF) });
  await fn({ click, pointAt, wait: (ms) => page.waitForTimeout(ms) });
  await page.waitForTimeout(400);
  const dur = now();
  await cdp.send("Page.stopScreencast");
  await cdp.detach();
  // frames -> CFR 25 fps mp4
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.mkdirSync(tmp, { recursive: true });
  let list = "ffconcat version 1.0\n";
  frames.forEach((fr, i) => {
    const file = path.join(tmp, `f${String(i).padStart(5, "0")}.jpg`);
    fs.writeFileSync(file, Buffer.from(fr.data, "base64"));
    const start = i === 0 ? 0 : fr.ts - t0;
    const next = i + 1 < frames.length ? frames[i + 1].ts - t0 : dur;
    list += `file '${file}'\nduration ${Math.max(0.001, next - start).toFixed(4)}\n`;
  });
  list += `file '${path.join(tmp, `f${String(frames.length - 1).padStart(5, "0")}.jpg`)}'\n`;
  fs.writeFileSync(path.join(tmp, "list.txt"), list);
  execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", path.join(tmp, "list.txt"),
    "-vf", "scale=1080:1920:flags=lanczos,fps=25,format=yuv420p", "-c:v", "libx264", "-crf", "15", "-preset", "medium", "-t", dur.toFixed(2), path.join(out, `${name}.mp4`)]);
  meta[name] = { duration: +dur.toFixed(2), frames: frames.length, events };
  console.log(`clip ${name}: ${dur.toFixed(2)} s, ${frames.length} frames, ${events.length} events`);
  fs.writeFileSync(path.join(out, "clips.json"), JSON.stringify(meta, null, 1));
}

// --- pick an untouched subject
let subject = null;
for (const s of ["biology", "psychology", "business_management", "legal_studies", "economics"]) {
  await go(`/study-design/${s}`);
  const all = await page.getByRole("button", { name: /^All\s*\d+/ }).first().innerText().catch(() => "");
  const un = await page.getByRole("button", { name: /^Untouched\s*\d+/ }).first().innerText().catch(() => "");
  const n = (x) => +(x.match(/\d+/) ?? [NaN])[0];
  console.log(s, JSON.stringify(all), JSON.stringify(un));
  if (n(all) && n(all) === n(un)) { subject = s; break; }
}
if (!subject) throw new Error("no untouched subject");
console.log("subject", subject);
meta.subject = subject;

// --- 1. tracker: open Unit 3 AoS 1 and mark dot points honestly
await go(`/study-design/${subject}`);
const aos1 = page.getByRole("button", { name: /^Area of Study 1 , Unit 3/ });
await page.evaluate((y) => window.scrollTo(0, y), (await docY(aos1)) - 420);
await tidy();
await record("sd-mark", async ({ click, wait }) => {
  await wait(500);
  await click(aos1);
  await wait(700);
  const first = page.getByRole("radio", { name: "Struggling", exact: true }).first();
  await scrollTo((await docY(first)) - 300, 700);
  await wait(250);
  const plan = ["Struggling", "Confident", "Learning", "Struggling", "Confident"];
  for (let i = 0; i < plan.length; i++) {
    const r = page.getByRole("radio", { name: plan[i], exact: true }).nth(i);
    const y = await docY(r);
    const vy = await page.evaluate(() => window.scrollY);
    if (y - vy > 600) await scrollTo(y - 420, 450);
    await click(r);
    await wait(380);
  }
  await wait(400);
});

// Fill the rest off camera so the summary has a realistic spread.
const pattern = ["Confident", "Learning", "Confident", "Struggling", "Confident", "Confident", "Learning", "Untouched"];
for (const name of [/^Area of Study 2 , Unit 3/, /^Area of Study 1 , Unit 4/]) {
  await page.getByRole("button", { name }).click().catch(() => {});
  await page.waitForTimeout(500);
}
const n = await page.getByRole("radio", { name: "Confident", exact: true }).count();
for (let i = 5; i < n; i++) {
  const p = pattern[i % pattern.length];
  if (p !== "Untouched") await page.getByRole("radio", { name: p, exact: true }).nth(i).click({ force: true, timeout: 3000 }).catch(() => {});
}
await page.waitForTimeout(800);

// --- 2. tracker summary: strengths and weaknesses, then filter to Struggling
await page.evaluate(() => window.scrollTo(0, 700));
await tidy();
await record("sd-summary", async ({ click, wait }) => {
  await wait(200);
  await scrollTo(0, 900);
  await wait(500);
  await click(page.getByRole("button", { name: /Struggling\s*\d+/ }).first());
  await wait(900);
});

// --- 3. revision paper: from the weaknesses to a built paper
await record("rev-build", async ({ click, wait }) => {
  await wait(200);
  const rev = page.getByRole("button", { name: "Build a revision paper" }).or(page.getByRole("link", { name: "Build a revision paper" })).first();
  await click(rev);
  await page.waitForLoadState("networkidle");
  await wait(900);
  await tidy();
  const content = page.getByText("Content", { exact: true }).first();
  await scrollTo((await docY(content)) - 120, 900);
  await wait(700);
  await scrollTo(0, 700);
  await wait(300);
  const build = page.getByRole("button", { name: "Build PDF" });
  const dl = page.waitForEvent("download", { timeout: 240000 }).catch(() => null);
  await click(build);
  await wait(2200);
  const d = await dl;
  if (d) { await d.saveAs(path.join(reel, "analysis", "revision.pdf")); console.log("revision pdf saved"); }
});

// --- 4. Test Maker browse: the builder for the same subject
await go(`/test/${subject}`);
await record("tm-browse", async ({ click, wait }) => {
  await wait(300);
  const content = page.getByText("Content", { exact: true }).first();
  await scrollTo((await docY(content)) - 120, 1000);
  await wait(300);
  await click(page.getByRole("checkbox", { name: /Select all of Unit 3, Area of Study 1/ }).or(page.getByRole("button", { name: /Select all of Unit 3, Area of Study 1/ })).first());
  await wait(500);
  await click(page.getByRole("checkbox", { name: /Select all of Unit 3, Area of Study 2/ }).or(page.getByRole("button", { name: /Select all of Unit 3, Area of Study 2/ })).first());
  await wait(500);
  await scrollTo(0, 800);
  await wait(500);
});

// --- 5. full exam under exam conditions
await go(`/test/${subject}`);
await record("tm-full", async ({ click, wait }) => {
  await wait(300);
  const full = page.getByRole("button", { name: /^Full exam/ }).or(page.getByRole("radio", { name: /^Full exam/ })).first();
  await scrollTo((await docY(full)) - 380, 900);
  await wait(200);
  await click(full);
  await wait(600);
  await scrollTo(0, 800);
  await wait(300);
  const build = page.getByRole("button", { name: "Build PDF" });
  const dl = page.waitForEvent("download", { timeout: 300000 }).catch(() => null);
  await click(build);
  await wait(2200);
  const d = await dl;
  if (d) { await d.saveAs(path.join(reel, "analysis", "full.pdf")); console.log("full pdf saved"); }
});

// PDF pages for stills
fs.mkdirSync(path.join(reel, "public", "broll"), { recursive: true });
for (const n of ["revision", "full"]) {
  const pdf = path.join(reel, "analysis", `${n}.pdf`);
  if (!fs.existsSync(pdf)) continue;
  const pages = +execFileSync("pdfinfo", [pdf]).toString().match(/Pages:\s+(\d+)/)[1];
  meta[`${n}Pages`] = pages;
  execFileSync("pdftoppm", ["-png", "-scale-to-x", "1080", "-scale-to-y", "-1", pdf, path.join(reel, "public", "broll", n)]);
}
fs.writeFileSync(path.join(out, "clips.json"), JSON.stringify(meta, null, 1));
await browser.close();
