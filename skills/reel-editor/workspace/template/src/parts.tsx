import React from "react";
import { Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C, SANS, f } from "./theme";
import wordsData from "../public/words.json";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.bezier(0.22, 1, 0.36, 1);

/** Overshoot pop-in at `start`, quick fade-out ending at `end` (seconds). */
export const usePop = (start: number, end?: number) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - f(start), fps, config: { damping: 11, stiffness: 240, mass: 0.6 } });
  const out = end == null ? 0 : interpolate(frame, [f(end) - 5, f(end)], [0, 1], clamp);
  const visible = frame >= f(start) && (end == null || frame < f(end));
  return { visible, p, out, opacity: Math.min(1, p * 2) * (1 - out), scale: interpolate(p, [0, 1], [0.82, 1]) };
};

// ---------------------------------------------------------------- captions
type Word = { w: string; s: number; e: number };
type Page = { words: Word[]; start: number; end: number };

const buildPages = (words: Word[]): Page[] => {
  const pages: Page[] = [];
  let cur: Word[] = [];
  const flush = () => {
    if (cur.length) pages.push({ words: cur, start: cur[0].s, end: cur[cur.length - 1].e });
    cur = [];
  };
  words.forEach((w, i) => {
    const prev = words[i - 1];
    const len = cur.map((x) => x.w).join(" ").length + w.w.length;
    if (cur.length && (cur.length >= 4 || len > 20 || /[.?!]$/.test(prev.w) || w.s - prev.e > 0.35)) flush();
    cur.push(w);
  });
  flush();
  // Fold flash pages (< 0.5 s) into their neighbour so nothing blinks past unread.
  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    const chars = (ws: Word[]) => ws.map((x) => x.w).join(" ").length;
    if (p.end - p.start >= 0.5) continue;
    const prev = pages[i - 1];
    const next = pages[i + 1];
    if (next && chars([...p.words, ...next.words]) <= 24 && !/[.?!]$/.test(p.words[p.words.length - 1].w)) {
      next.words = [...p.words, ...next.words];
      next.start = p.start;
      pages.splice(i--, 1);
    } else if (prev && chars([...prev.words, ...p.words]) <= 24) {
      prev.words = [...prev.words, ...p.words];
      prev.end = p.end;
      pages.splice(i--, 1);
    }
  }
  // Each page holds until the next begins (max 0.5 s of hang).
  pages.forEach((p, i) => {
    const next = pages[i + 1];
    p.end = next ? Math.min(next.start, p.end + 0.5) : p.end + 0.6;
  });
  return pages;
};

const PAGES = buildPages(wordsData.words as Word[]);

export const Captions: React.FC<{ top: number }> = ({ top }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const page = PAGES.find((p) => t >= p.start - 0.04 && t < p.end);
  if (!page) return null;
  const p = spring({ frame: frame - f(page.start - 0.04), fps, config: { damping: 14, stiffness: 320, mass: 0.5 } });
  return (
    <div style={{ position: "absolute", top, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
      <div
        style={{
          fontFamily: SANS,
          fontWeight: 800,
          fontSize: 58,
          letterSpacing: -0.6,
          lineHeight: 1.1,
          color: C.white,
          WebkitTextStroke: `10px ${C.ink}`,
          paintOrder: "stroke fill",
          textShadow: "0 4px 14px rgba(38,31,24,0.35)",
          scale: String(interpolate(p, [0, 1], [0.96, 1])),
          opacity: Math.min(1, p * 2),
          maxWidth: 960,
          textAlign: "center",
        }}
      >
        {page.words.map((w, i) => {
          return (
            <span key={i}>
              {w.w.replace(/\.$/, "")}
              {i < page.words.length - 1 ? " " : ""}
            </span>
          );
        })}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- screen panel
export type Shot = { t: number; src: string; cy: number; zoom?: number; cx?: number; drift?: { cy: number; zoom?: number } };
export type Cur = { t: number; x: number; y: number; click?: boolean };

const Pointer: React.FC<{ press: number }> = ({ press }) => (
  <svg width={64} height={64} viewBox="0 0 24 24" style={{ scale: String(1 - press * 0.18), transformOrigin: "4px 3px" }}>
    <path d="M4 3l14 7.5-6.2 1.6L9 18z" fill={C.ink} stroke={C.bg} strokeWidth={1.4} strokeLinejoin="round" />
  </svg>
);

export const Panel: React.FC<{
  shots: Shot[];
  cursor?: Cur[];
  top: number;
  height: number;
  start: number;
  end: number;
  children?: React.ReactNode;
}> = ({ shots, cursor = [], top, height, start, end, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  if (t < start || t >= end) return null;

  const i = Math.max(0, shots.findLastIndex((s) => t >= s.t));
  const shot = shots[i];
  const prev = shots[i - 1];
  const nextT = shots[i + 1]?.t ?? end;
  // Camera: tween from the previous shot's framing, then drift if asked.
  const settle = interpolate(t, [shot.t, shot.t + 0.32], [0, 1], { ...clamp, easing: ease });
  const z0 = prev ? prev.drift?.zoom ?? prev.zoom ?? 1 : shot.zoom ?? 1;
  const y0 = prev ? prev.drift?.cy ?? prev.cy : shot.cy;
  let zoom = interpolate(settle, [0, 1], [z0, shot.zoom ?? 1]);
  let cy = interpolate(settle, [0, 1], [y0, shot.cy]);
  if (shot.drift) {
    const d = interpolate(t, [shot.t, nextT], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
    zoom = interpolate(d, [0, 1], [shot.zoom ?? 1, shot.drift.zoom ?? shot.zoom ?? 1]);
    cy = interpolate(d, [0, 1], [shot.cy, shot.drift.cy]);
  }
  const cx = shot.cx ?? 540;
  const left = 540 - cx * zoom;
  const imgTop = height / 2 - cy * zoom;

  // Slide in from the top on entry.
  const enter = interpolate(t, [start, start + 0.22], [-height, 0], { ...clamp, easing: ease });

  // Cursor.
  let cur: { x: number; y: number; press: number; ripple: number } | null = null;
  if (cursor.length && t >= cursor[0].t) {
    const k = cursor.findLastIndex((c) => t >= c.t);
    const a = cursor[k];
    const b = cursor[k + 1];
    let x = a.x, y = a.y;
    if (b) {
      const m = interpolate(t, [Math.max(a.t, b.t - 0.4), b.t], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
      x = interpolate(m, [0, 1], [a.x, b.x]);
      y = interpolate(m, [0, 1], [a.y, b.y]);
    }
    const clickAt = a.click ? a.t : -99;
    const press = interpolate(t, [clickAt, clickAt + 0.06, clickAt + 0.2], [0, 1, 0], clamp);
    const ripple = interpolate(t, [clickAt, clickAt + 0.35], [0, 1], clamp);
    cur = { x: left + x * zoom, y: imgTop + y * zoom, press, ripple };
  }

  return (
    <div style={{ position: "absolute", top, left: 0, width: 1080, height, overflow: "hidden", background: C.bg, translate: `0px ${enter}px` }}>
      <Img src={staticFile(`broll/${shot.src}.png`)} style={{ position: "absolute", left, top: imgTop, width: 1080 * zoom }} />
      {cur && (
        <>
          {cur.ripple > 0 && cur.ripple < 1 && (
            <div
              style={{
                position: "absolute",
                left: cur.x - 40,
                top: cur.y - 40,
                width: 80,
                height: 80,
                borderRadius: 40,
                border: `4px solid ${C.ink}`,
                opacity: 1 - cur.ripple,
                scale: String(0.4 + cur.ripple * 0.9),
              }}
            />
          )}
          <div style={{ position: "absolute", left: cur.x - 10, top: cur.y - 6 }}>
            <Pointer press={cur.press} />
          </div>
        </>
      )}
      {children}
    </div>
  );
};
