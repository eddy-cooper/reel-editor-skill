import React from "react";
import { Easing, Img, interpolate, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C, SANS, SERIF, f } from "./theme";
import clipsData from "../public/clips/clips.json";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.bezier(0.22, 1, 0.36, 1);
const inOut = Easing.inOut(Easing.cubic);
const useT = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return { frame, t: frame / fps, fps };
};
export const PANEL_H = 920; // top panel; the speaker gets the remaining 1000
/**
 * Reels and TikTok lay their header over the top ~170 px of the frame. The panel still runs to the top edge,
 * but anything that matters is framed in the visible band 170-800, centred on VIEW_CY.
 */
export const SAFE_TOP = 170;
export const VIEW_CY = (SAFE_TOP + PANEL_H) / 2;

/** Every top-panel segment settles in on its cut, then keeps creeping forward. */
export const Drift: React.FC<{ start: number; end: number; amount?: number; children: React.ReactNode }> = ({ start, end, amount = 0.035, children }) => {
  const { frame, t, fps } = useT();
  const settle = spring({ frame: frame - f(start), fps, config: { damping: 16, stiffness: 200, mass: 0.6 } });
  const creep = interpolate(t, [start, Math.max(end, start + 2)], [0, amount], clamp);
  const scale = interpolate(settle, [0, 1], [1.07, 1]) * (1 + creep);
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: PANEL_H, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, scale: String(scale), transformOrigin: `540px ${VIEW_CY}px` }}>{children}</div>
    </div>
  );
};

export const Pointer: React.FC<{ press: number; light?: boolean; size?: number }> = ({ press, light, size = 64 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ scale: String(1 - press * 0.18), transformOrigin: "4px 3px", filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.35))" }}>
    <path d="M4 3l14 7.5-6.2 1.6L9 18z" fill={light ? C.white : C.ink} stroke={light ? C.ink : C.bg} strokeWidth={1.4} strokeLinejoin="round" />
  </svg>
);

// ------------------------------------------------------------------ tier board (TierMaker look)
// Values sampled from a TierMaker screenshot (A is TierMaker's default, the sample hit an edge).
const TM = { page: "#242222", row: "#1a1a17", ctrl: "#000000", text: "#1a1a17", glow: "#fff6c8" };
const TIERS = [
  { k: "S", c: "#ef8683" },
  { k: "A", c: "#f5c28b" },
  { k: "B", c: "#fae08d" },
  { k: "C", c: "#ffff91" },
  { k: "D", c: "#cdfd8f" },
];
// The board sits wholly below the Reels/TikTok header (SAFE_TOP): five rows from y 248 to 788.
const BX = 24, BY = SAFE_TOP + 80, BW = 1032, RH = 132, LW = 150, CW = 112, TILE = RH - 6;
const rowTop = (i: number) => BY + i * RH;

export type TileKind = "tutoring" | "tracker" | "textbook" | "exams";
export type Item = { label: string; kind: TileKind; tier: "S" | "A" | "B" | "C" | "D"; appear: number; land: number; glowAt?: number };

const Gear: React.FC = () => (
  <svg width={46} height={46} viewBox="0 0 24 24">
    <path
      fill={C.white}
      d="M19.4 13a7.6 7.6 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.4 7.4 0 0 0-1.7-1l-.4-2.6h-4l-.4 2.6a7.4 7.4 0 0 0-1.7 1l-2.5-1-2 3.5L4.6 11a7.6 7.6 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1a7.4 7.4 0 0 0 1.7 1l.4 2.6h4l.4-2.6a7.4 7.4 0 0 0 1.7-1l2.5 1 2-3.5zM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7z"
    />
  </svg>
);
const Chevrons: React.FC = () => (
  <svg width={30} height={72} viewBox="0 0 30 72" fill="none" stroke={C.white} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 20 L15 10 L25 20" />
    <path d="M5 52 L15 62 L25 52" />
  </svg>
);

const TileFace: React.FC<{ kind: TileKind; label: string }> = ({ kind, label }) => {
  const s = TILE;
  let art: React.ReactNode = null;
  if (kind === "tracker" || kind === "exams") {
    art = <Img src={staticFile(`tiles/${kind}.png`)} style={{ position: "absolute", inset: 0, width: s, height: s }} />;
  } else if (kind === "tutoring") {
    art = (
      <div style={{ position: "absolute", inset: 0, background: "#2b2b2b", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 3, padding: 4 }}>
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} style={{ background: i === 4 ? "#4a4a46" : "#3a3a37", borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 14, height: 14, borderRadius: 7, background: i === 4 ? "#9a9a92" : "#5c5c57" }} />
          </div>
        ))}
        <div style={{ position: "absolute", right: 6, top: 6, padding: "1px 7px", borderRadius: 6, background: C.signalRed, color: C.white, fontFamily: SANS, fontWeight: 800, fontSize: 18 }}>$$$</div>
      </div>
    );
  } else {
    art = (
      <div style={{ position: "absolute", inset: 0, background: "#e9e4d6", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "relative", width: 74, height: 92, borderRadius: 5, background: C.accent, boxShadow: "3px 4px 0 #0b5a2c" }}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 9, background: "#0b5a2c", borderRadius: "5px 0 0 5px" }} />
          <div style={{ position: "absolute", left: 18, top: 18, width: 44, height: 5, background: C.lampLight, borderRadius: 2 }} />
          <div style={{ position: "absolute", left: 18, top: 29, width: 32, height: 4, background: "#9fd0b0", borderRadius: 2 }} />
        </div>
      </div>
    );
  }
  return (
    <div style={{ position: "relative", width: s, height: s, overflow: "hidden", background: TM.row }}>
      {art}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "3px 0 4px", background: "rgba(0,0,0,0.72)", color: C.white, fontFamily: SANS, fontWeight: 700, fontSize: 17, textAlign: "center", letterSpacing: -0.2 }}>
        {label}
      </div>
    </div>
  );
};

const HOLD = { x: 540, y: VIEW_CY + 30, scale: 2.35 };

export const TierBoard: React.FC<{ items: Item[]; titleAt: number; badgeAt: number }> = ({ items, titleAt, badgeAt }) => {
  const { frame, t, fps } = useT();
  const title = spring({ frame: frame - f(titleAt), fps, config: { damping: 14, stiffness: 180, mass: 0.6 } });
  const badge = spring({ frame: frame - f(badgeAt), fps, config: { damping: 10, stiffness: 240, mass: 0.6 } });
  const held = items.find((it) => t >= it.appear && t < it.land);
  const dim = held ? interpolate(t, [held.appear, held.appear + 0.2, held.land - 0.3, held.land], [0, 1, 1, 0], clamp) : 0;
  const slots: Record<string, number> = {};

  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: PANEL_H, background: TM.page, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          left: BX,
          top: SAFE_TOP + 6,
          fontFamily: SANS,
          fontWeight: 800,
          fontSize: 54,
          letterSpacing: -1.2,
          color: C.white,
          opacity: Math.min(1, title * 1.5),
          translate: `${interpolate(title, [0, 1], [-30, 0])}px 0px`,
        }}
      >
        VCE study method tier list
      </div>
      {t >= badgeAt && (
        <div
          style={{
            position: "absolute",
            right: BX,
            top: SAFE_TOP + 12,
            padding: "8px 16px",
            borderRadius: 10,
            background: TIERS[0].c,
            fontFamily: SANS,
            fontWeight: 800,
            fontSize: 28,
            color: TM.text,
            rotate: "3deg",
            scale: String(interpolate(badge, [0, 1], [0.4, 1])),
            opacity: Math.min(1, badge * 2),
          }}
        >
          two 50s · 99.95
        </div>
      )}

      {/* board */}
      <div style={{ position: "absolute", left: BX, top: BY, width: BW, height: RH * TIERS.length, background: TM.ctrl }}>
        {TIERS.map((tr, i) => {
          const landed = items.find((it) => it.tier === tr.k && t >= it.land && t < it.land + 0.5);
          const flash = landed ? interpolate(t, [landed.land, landed.land + 0.5], [1, 0], clamp) : 0;
          return (
            <div key={tr.k} style={{ position: "absolute", left: 0, top: i * RH, width: BW, height: RH - 2, display: "flex" }}>
              <div style={{ width: LW, height: "100%", background: tr.c, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SANS, fontWeight: 600, fontSize: 48, color: TM.text, filter: `brightness(${1 + flash * 0.25})` }}>
                {tr.k}
              </div>
              <div style={{ flex: 1, height: "100%", background: TM.row, marginLeft: 2, boxShadow: flash ? `inset 0 0 0 ${3 * flash}px ${tr.c}` : undefined }} />
              <div style={{ width: CW, height: "100%", display: "flex", alignItems: "center", justifyContent: "space-evenly", paddingRight: 4 }}>
                <Gear />
                <Chevrons />
              </div>
            </div>
          );
        })}
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)", opacity: dim }} />
      </div>

      {/* tiles */}
      {items.map((it) => {
        if (t < it.appear) return null;
        const row = TIERS.findIndex((x) => x.k === it.tier);
        const slot = (slots[it.tier] = (slots[it.tier] ?? -1) + 1);
        const x1 = BX + LW + 4 + slot * (TILE + 4) + TILE / 2;
        const y1 = BY + row * RH + (RH - 2) / 2;
        const pop = spring({ frame: frame - f(it.appear), fps, config: { damping: 12, stiffness: 220, mass: 0.6 } });
        const fly = interpolate(t, [it.land - 0.36, it.land], [0, 1], { ...clamp, easing: inOut });
        const settle = spring({ frame: frame - f(it.land), fps, config: { damping: 8, stiffness: 320, mass: 0.5 } });
        const squash = t >= it.land ? interpolate(settle, [0, 0.45, 1], [1, 1.12, 1]) : 1;
        const wob = Math.sin((t - it.appear) * 5.2) * 2.2 * (1 - fly);
        const x = interpolate(fly, [0, 1], [HOLD.x, x1]);
        const y = interpolate(fly, [0, 1], [HOLD.y + interpolate(pop, [0, 1], [90, 0]), y1]) + Math.sin((t - it.appear) * 3.1) * 6 * (1 - fly);
        const scale = interpolate(pop, [0, 1], [0.5, 1]) * interpolate(fly, [0, 1], [HOLD.scale, 1]) * squash;
        const lift = 1 - fly;
        const glow = it.glowAt != null && t >= it.glowAt ? 0.5 + 0.5 * Math.sin((t - it.glowAt) * 6) : 0;
        // cursor holds the tile's lower-right area while dragging, then lets go and drifts off
        const gripX = x + TILE * 0.28 * scale;
        const gripY = y + TILE * 0.22 * scale;
        const release = interpolate(t, [it.land, it.land + 0.45], [0, 1], { ...clamp, easing: ease });
        const curOn = t < it.land + 0.45;
        const press = t < it.land ? interpolate(t, [it.appear + 0.1, it.appear + 0.2], [0, 1], clamp) : 1 - release;
        return (
          <React.Fragment key={it.label}>
            <div
              style={{
                position: "absolute",
                left: x - TILE / 2,
                top: y - TILE / 2,
                width: TILE,
                height: TILE,
                scale: String(scale),
                rotate: `${interpolate(fly, [0, 1], [-4, 0]) + wob}deg`,
                opacity: Math.min(1, pop * 2),
                boxShadow: `0 ${18 * lift}px ${40 * lift}px rgba(0,0,0,${0.55 * lift})${glow ? `, 0 0 ${10 + glow * 14}px ${TM.glow}` : ""}`,
                outline: glow ? `${2 + glow * 2}px solid ${TM.glow}` : undefined,
              }}
            >
              <TileFace kind={it.kind} label={it.label} />
            </div>
            {curOn && (
              <div style={{ position: "absolute", left: gripX + release * 140 - 10, top: gripY + release * 90 - 6, opacity: 1 - release }}>
                <Pointer press={press} light />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ------------------------------------------------------------------ real site clips
type ClipEvent = { t: number; x: number; y: number; click?: boolean };
type ClipMeta = { duration: number; events: ClipEvent[] };
const CLIPS = clipsData as unknown as Record<string, ClipMeta>;

/** A piece of a clip: reel seconds [from, to) play clip seconds from `clipT` at `rate`. */
export type ClipPart = { from: number; to: number; clipT: number; rate: number };
/** Camera keys: [reel t, cy in clip px, zoom]. Eased between keys. */
export type CamKey = [number, number, number];

const camAt = (keys: CamKey[], t: number) => {
  const k = keys.findLastIndex(([s]) => t >= s);
  if (k < 0) return { cy: keys[0][1], zoom: keys[0][2] };
  const a = keys[k], b = keys[k + 1];
  if (!b) return { cy: a[1], zoom: a[2] };
  const p = interpolate(t, [a[0], b[0]], [0, 1], { ...clamp, easing: inOut });
  return { cy: interpolate(p, [0, 1], [a[1], b[1]]), zoom: interpolate(p, [0, 1], [a[2], b[2]]) };
};

/** Reel time at which each clip click happens, for SFX. */
export const clipClicks = (name: string, parts: ClipPart[]) =>
  CLIPS[name].events
    .filter((e) => e.click)
    .map((e) => {
      const p = parts.find((p) => e.t >= p.clipT && e.t < p.clipT + (p.to - p.from) * p.rate);
      return p ? p.from + (e.t - p.clipT) / p.rate : null;
    })
    .filter((x): x is number => x != null);

export const ClipPanel: React.FC<{ name: string; parts: ClipPart[]; cam: CamKey[]; start: number; end: number }> = ({ name, parts, cam, start, end }) => {
  const { t } = useT();
  if (t < start || t >= end) return null;
  const { cy, zoom } = camAt(cam, t);
  const left = 540 - 540 * zoom;
  const top = VIEW_CY - cy * zoom;

  // cursor: map clip events to reel time
  const ev = CLIPS[name].events
    .map((e) => {
      const p = parts.find((p) => e.t >= p.clipT && e.t < p.clipT + (p.to - p.from) * p.rate);
      return p ? { ...e, rt: p.from + (e.t - p.clipT) / p.rate } : null;
    })
    .filter((x): x is ClipEvent & { rt: number } => x != null);
  let cur: { x: number; y: number; press: number; ripple: number; o: number } | null = null;
  if (ev.length && t >= ev[0].rt - 0.55) {
    const k = ev.findLastIndex((e) => t >= e.rt);
    const a = k >= 0 ? ev[k] : { ...ev[0], x: ev[0].x + 170, y: ev[0].y + 260, rt: ev[0].rt - 0.55, click: false };
    const b = ev[k + 1];
    let x = a.x, y = a.y;
    if (b) {
      const m = interpolate(t, [Math.max(a.rt, b.rt - 0.42), b.rt], [0, 1], { ...clamp, easing: inOut });
      x = interpolate(m, [0, 1], [a.x, b.x]);
      y = interpolate(m, [0, 1], [a.y, b.y]);
    }
    const c = a.click ? a.rt : -99;
    const press = interpolate(t, [c, c + 0.06, c + 0.2], [0, 1, 0], clamp);
    const ripple = interpolate(t, [c, c + 0.35], [0, 1], clamp);
    const o = interpolate(t, [ev[0].rt - 0.55, ev[0].rt - 0.35], [0, 1], clamp);
    cur = { x: left + x * zoom, y: top + y * zoom, press, ripple, o };
  }

  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: PANEL_H, overflow: "hidden", background: C.bg }}>
      <div style={{ position: "absolute", left, top, width: 1080 * zoom, height: 1920 * zoom }}>
        {parts.map((p, i) => (
          <Sequence key={i} from={f(p.from)} durationInFrames={Math.max(1, f(p.to) - f(p.from))} layout="none">
            <OffthreadVideo src={staticFile(`clips/${name}.mp4`)} trimBefore={f(p.clipT)} playbackRate={p.rate} muted style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%" }} />
          </Sequence>
        ))}
      </div>
      {cur && (
        <div style={{ opacity: cur.o }}>
          {cur.ripple > 0 && cur.ripple < 1 && (
            <div style={{ position: "absolute", left: cur.x - 40, top: cur.y - 40, width: 80, height: 80, borderRadius: 40, border: `4px solid ${C.ink}`, opacity: 1 - cur.ripple, scale: String(0.4 + cur.ripple * 0.9) }} />
          )}
          <div style={{ position: "absolute", left: cur.x - 10, top: cur.y - 6 }}>
            <Pointer press={cur.press} />
          </div>
        </div>
      )}
    </div>
  );
};

// ------------------------------------------------------------------ PDF page close-ups
type Box = [number, number, number, number];
export type Mark = { at: number; x: number; y: number; ok: boolean };
/** Camera keys for a page: [reel t, cx, cy, zoom] in page px (page is 1080 wide). */
export type PageKey = [number, number, number, number];
/** A region hidden under paper that wipes away left to right from `at`. */
export type Reveal = { at: number; dur: number; box: Box };
/** A handwritten-style margin note, popping in at `at`. */
export type Note = { at: number; x: number; y: number; text: string; rot?: number; color?: string; size?: number };
/** A pencil stroke drawn along `d` (page px) from `at` over `dur`. */
export type Stroke = { at: number; dur: number; d: string; color?: string; width?: number };
/** A hand-drawn ring around a box, drawn from `at`. */
export type Ring = { at: number; box: Box };

/**
 * The line being talked about, pulled off the page at a size a phone can read.
 * `slot` 0 sits at the bottom of the panel, 1 stacks above it. `note` is pencilled onto the card.
 */
export type Callout = { at: number; until: number; text: string; size?: number; slot?: number; clockFrom?: number; note?: { at: number; text: string } };

export const Callouts: React.FC<{ items: Callout[] }> = ({ items }) => {
  const { frame, t, fps } = useT();
  return (
    <>
      {items.map((c, i) => {
        if (t < c.at || t >= c.until) return null;
        const q = spring({ frame: frame - f(c.at), fps, config: { damping: 15, stiffness: 210, mass: 0.6 } });
        const out = interpolate(t, [c.until - 0.16, c.until], [0, 1], clamp);
        const sweep = interpolate(t, [c.at + 0.1, c.at + 0.5], [0, 1], { ...clamp, easing: ease });
        const slot = c.slot ?? 0;
        let clock: string | null = null;
        if (c.clockFrom != null) {
          const secs = Math.max(0, 15 * 60 - Math.floor(Math.max(0, t - c.clockFrom) * 9 * 60));
          clock = `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;
        }
        const nq = c.note ? spring({ frame: frame - f(c.note.at), fps, config: { damping: 10, stiffness: 260, mass: 0.5 } }) : 0;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 34,
              right: 34,
              bottom: 30 + slot * 172,
              padding: "24px 30px 24px 40px",
              background: C.white,
              borderRadius: 18,
              boxShadow: "0 22px 50px rgba(38,31,24,0.28), 0 3px 10px rgba(38,31,24,0.12)",
              display: "flex",
              alignItems: "center",
              gap: 24,
              opacity: Math.min(1, q * 2) * (1 - out),
              translate: `0px ${(1 - q) * 120 + out * 40}px`,
              overflow: "hidden",
            }}
          >
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 12, background: C.lampLight }} />
            <div style={{ position: "relative", flex: 1, fontFamily: SANS, fontWeight: 700, fontSize: c.size ?? 42, lineHeight: 1.22, letterSpacing: -0.4, color: C.ink }}>
              <span style={{ backgroundImage: `linear-gradient(${C.lampLight}, ${C.lampLight})`, backgroundRepeat: "no-repeat", backgroundSize: `${sweep * 100}% 38%`, backgroundPosition: "0 88%" }}>{c.text}</span>
            </div>
            {clock && <div style={{ fontFamily: SERIF, fontSize: 84, lineHeight: 1, color: C.ink, fontVariantNumeric: "tabular-nums" }}>{clock}</div>}
            {c.note && t >= c.note.at && (
              <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 52, color: C.oxide, rotate: "-5deg", scale: String(interpolate(nq, [0, 1], [1.8, 1])), opacity: Math.min(1, nq * 2) }}>{c.note.text}</div>
            )}
          </div>
        );
      })}
    </>
  );
};

export const PageView: React.FC<{
  src: string;
  start: number;
  end: number;
  cam: PageKey[];
  highlights?: { at: number; box: Box }[];
  marks?: Mark[];
  reveals?: Reveal[];
  notes?: Note[];
  strokes?: Stroke[];
  rings?: Ring[];
  /** page height in px at 1080 wide (A4 = 1528; VCAA maths books are 1459) */
  pageH?: number;
  callouts?: Callout[];
  children?: React.ReactNode;
}> = ({ src, start, end, cam, highlights = [], marks = [], reveals = [], notes = [], strokes = [], rings = [], pageH = 1528, callouts = [], children }) => {
  const { frame, t, fps } = useT();
  if (t < start || t >= end) return null;
  const k = cam.findLastIndex(([s]) => t >= s);
  const a = cam[Math.max(0, k)], b = cam[k + 1];
  const p = b ? interpolate(t, [a[0], b[0]], [0, 1], { ...clamp, easing: inOut }) : 0;
  const lerp = (i: number) => (b ? interpolate(p, [0, 1], [a[i], b[i]]) : a[i]);
  const cx = lerp(1), cy = lerp(2), zoom = lerp(3);
  const left = 540 - cx * zoom, top = VIEW_CY - cy * zoom;
  const drop = spring({ frame: frame - f(start), fps, config: { damping: 15, stiffness: 170, mass: 0.7 } });
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: PANEL_H, overflow: "hidden", background: C.surface }}>
      <div style={{ position: "absolute", left, top, width: 1080 * zoom, translate: `0px ${(1 - drop) * 260}px`, rotate: `${(1 - drop) * -3}deg`, boxShadow: "0 24px 60px rgba(38,31,24,0.22)" }}>
        <Img src={staticFile(`broll/${src}.png`)} style={{ display: "block", width: "100%" }} />
        <svg viewBox={`0 0 1080 ${pageH}`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
          {reveals.map((r, i) => {
            const w = interpolate(t, [r.at, r.at + r.dur], [0, 1], { ...clamp, easing: inOut });
            const [x0, y0, x1, y1] = r.box;
            return w < 1 ? <rect key={`r${i}`} x={x0 + (x1 - x0) * w} y={y0} width={(x1 - x0) * (1 - w)} height={y1 - y0} fill={C.white} /> : null;
          })}
          {highlights.map((h, i) => {
            const w = interpolate(t, [h.at, h.at + 0.28], [0, 1], { ...clamp, easing: ease });
            const [x0, y0, x1, y1] = h.box;
            return w > 0 ? <rect key={i} x={x0 - 8} y={y0 - 4} width={(x1 - x0 + 16) * w} height={y1 - y0 + 8} rx={4} fill={C.lampLight} opacity={0.55} style={{ mixBlendMode: "multiply" }} /> : null;
          })}
          {strokes.map((k, i) => {
            const q = interpolate(t, [k.at, k.at + k.dur], [0, 1], { ...clamp, easing: Easing.inOut(Easing.quad) });
            return q > 0 ? <path key={`k${i}`} d={k.d} pathLength={1} fill="none" stroke={k.color ?? "#3b3b3b"} strokeWidth={k.width ?? 5} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1 1" strokeDashoffset={1 - q} /> : null;
          })}
          {rings.map((r, i) => {
            const q = interpolate(t, [r.at, r.at + 0.3], [0, 1], { ...clamp, easing: ease });
            if (q <= 0) return null;
            const [x0, y0, x1, y1] = r.box;
            const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rx = (x1 - x0) / 2 + 18, ry = (y1 - y0) / 2 + 14;
            return <ellipse key={`g${i}`} cx={cx} cy={cy} rx={rx} ry={ry} pathLength={1} fill="none" stroke={C.oxide} strokeWidth={6} strokeDasharray="1 1" strokeDashoffset={1 - q} transform={`rotate(-3 ${cx} ${cy})`} />;
          })}
          {marks.map((m, i) => {
            const q = interpolate(t, [m.at, m.at + 0.16], [0, 1], clamp);
            if (q <= 0) return null;
            return m.ok ? (
              <path key={i} d={`M${m.x - 22} ${m.y} l16 18 l34 -40`} fill="none" stroke={C.oxide} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={90} strokeDashoffset={90 * (1 - q)} />
            ) : (
              <g key={i} stroke={C.oxide} strokeWidth={8} strokeLinecap="round">
                <line x1={m.x - 20} y1={m.y - 20} x2={m.x - 20 + 40 * Math.min(1, q * 2)} y2={m.y - 20 + 40 * Math.min(1, q * 2)} />
                {q > 0.5 && <line x1={m.x + 20} y1={m.y - 20} x2={m.x + 20 - 40 * (q * 2 - 1)} y2={m.y - 20 + 40 * (q * 2 - 1)} />}
              </g>
            );
          })}
        </svg>
        {notes.map((n, i) => {
          const q = spring({ frame: frame - f(n.at), fps, config: { damping: 10, stiffness: 260, mass: 0.5 } });
          if (t < n.at) return null;
          return (
            <div key={i} style={{ position: "absolute", left: n.x * zoom, top: n.y * zoom, translate: "0 -50%", fontFamily: SANS, fontWeight: 800, fontSize: (n.size ?? 30) * zoom, color: n.color ?? C.oxide, rotate: `${n.rot ?? -4}deg`, scale: String(interpolate(q, [0, 1], [1.6, 1])), opacity: Math.min(1, q * 2), whiteSpace: "nowrap" }}>
              {n.text}
            </div>
          );
        })}
      </div>
      {callouts.some((c) => t >= c.at && t < c.until) && <div style={{ position: "absolute", inset: 0, background: "rgba(243,238,225,0.35)" }} />}
      <Callouts items={callouts} />
      {children}
    </div>
  );
};

const card: React.CSSProperties = {
  background: C.white,
  border: `2px solid ${C.hairline}`,
  borderRadius: 22,
  boxShadow: "0 20px 50px rgba(38,31,24,0.16), 0 3px 10px rgba(38,31,24,0.08)",
};

/** Countdown card: reading time, then writing time, ticking fast. */
export const ExamClock: React.FC<{ readAt: number; writeAt: number }> = ({ readAt, writeAt }) => {
  const { frame, t, fps } = useT();
  if (t < readAt) return null;
  const writing = t >= writeAt;
  const p = spring({ frame: frame - f(writing ? writeAt : readAt), fps, config: { damping: 11, stiffness: 260, mass: 0.5 } });
  const total = writing ? 150 * 60 : 15 * 60;
  const secs = Math.max(0, total - Math.floor((t - (writing ? writeAt : readAt)) * 9 * 60));
  const h = Math.floor(secs / 3600), mm = Math.floor((secs % 3600) / 60), ss = secs % 60;
  const txt = (h ? `${h}:` : "") + `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  return (
    <div style={{ position: "absolute", right: 46, bottom: 60, padding: "18px 30px 14px", ...card, textAlign: "center", scale: String(interpolate(p, [0, 1], [0.8, 1])), rotate: "2deg" }}>
      <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 28, color: C.inkMuted }}>{writing ? "Writing time" : "Reading time"}</div>
      <div style={{ fontFamily: SERIF, fontSize: 104, lineHeight: 1, color: C.ink, fontVariantNumeric: "tabular-nums" }}>{txt}</div>
    </div>
  );
};

export const MistakeLog: React.FC<{ start: number; end: number; rows: [string, string][] }> = ({ start, end, rows }) => {
  const { frame, t, fps } = useT();
  if (t < start || t >= end) return null;
  const p = spring({ frame: frame - f(start), fps, config: { damping: 14, stiffness: 200, mass: 0.6 } });
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: PANEL_H, background: C.bg }}>
      <div style={{ position: "absolute", left: 90, top: SAFE_TOP + 40, width: 900, padding: "34px 42px", ...card, scale: String(interpolate(p, [0, 1], [0.86, 1])), opacity: Math.min(1, p * 2) }}>
        <div style={{ fontFamily: SERIF, fontSize: 60, color: C.ink, marginBottom: 14 }}>Mistake log</div>
        {rows.map(([q, m], i) => {
          const k = interpolate(frame, [f(start) + 4 + i * 6, f(start) + 10 + i * 6], [0, 1], clamp);
          return (
            <div key={q} style={{ display: "flex", gap: 24, padding: "18px 0", borderBottom: `2px solid ${C.hairline}`, opacity: k, translate: `${(1 - k) * 50}px 0px` }}>
              <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: 36, color: C.signalRed, width: 84 }}>{q}</span>
              <span style={{ fontFamily: SANS, fontSize: 36, color: C.inkBody }}>{m}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
