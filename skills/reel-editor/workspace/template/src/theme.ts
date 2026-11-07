import { loadFont as loadPublicSans } from "@remotion/google-fonts/PublicSans";
import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

// The VCE Hub palette. Swap these for your own brand tokens.
export const C = {
  bg: "#faf8f3",
  surface: "#f3eee1",
  hairline: "#e3dac7",
  borderStrong: "#9b8f72",
  ink: "#261f18",
  inkStrong: "#332a21",
  inkBody: "#574d42",
  inkMuted: "#736a5b",
  accent: "#0f7a3c",
  lampLight: "#f2c98a",
  oxide: "#a03327",
  signalRed: "#a03327",
  white: "#ffffff",
};

export const { fontFamily: SANS } = loadPublicSans("normal", {
  weights: ["400", "600", "700", "800"],
  subsets: ["latin"],
});

loadFont({ family: "Newsreader", url: staticFile("newsreader-opsz-latin.woff2"), weight: "400" });
export const SERIF = "Newsreader";

export const FPS = 25;
export const f = (s: number) => Math.round(s * FPS);
