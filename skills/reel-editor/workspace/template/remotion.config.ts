import { Config } from "@remotion/cli/config";

// If a render hangs on "Waiting for root component", Remotion's bundled chrome-headless-shell is the problem
// on some Macs. Point REMOTION_BROWSER at Playwright's headless_shell instead (npx playwright install chromium).
if (process.env.REMOTION_BROWSER) Config.setBrowserExecutable(process.env.REMOTION_BROWSER);
Config.setVideoImageFormat("jpeg");
