// Log the test account in and save the session to .auth.json for capture.mjs.
// Reads SITE_URL, SITE_EMAIL and SITE_PASSWORD from .env. Run from the workspace root: node scripts/login.mjs
// Use a dedicated test account, never a personal one: captures change its saved state.
import { chromium } from "playwright";
import dotenv from "dotenv";
import path from "node:path";
const root = path.join(import.meta.dirname, "..");
dotenv.config({ path: path.join(root, ".env") });
const BASE = process.env.SITE_URL ?? "https://vcehub.com.au";
const LOGIN = process.env.SITE_LOGIN_PATH ?? "/login";

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 432, height: 768 } });
const page = await ctx.newPage();
await page.goto(BASE + LOGIN, { waitUntil: "networkidle" });
await page.fill('input[type="email"]', process.env.SITE_EMAIL);
await page.fill('input[type="password"]', process.env.SITE_PASSWORD);
await page.locator('form button[type="submit"]').first().click();
// The redirect after login can take a few seconds.
await page.waitForTimeout(6000);
console.log("after login:", page.url());
if (!page.url().includes(LOGIN)) {
  await ctx.storageState({ path: path.join(root, ".auth.json") });
  console.log("saved .auth.json");
} else {
  console.log("still on the login page; check the credentials in .env");
  process.exitCode = 1;
}
await browser.close();
