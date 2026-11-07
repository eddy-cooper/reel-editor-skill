import React from "react";
import { Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C, SANS, SERIF, f } from "./theme";
import { PANEL_H, SAFE_TOP, VIEW_CY } from "./props6";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.bezier(0.22, 1, 0.36, 1);
const inOut = Easing.inOut(Easing.cubic);
const useT = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return { frame, t: frame / fps, fps };
};
const pop = (frame: number, fps: number, at: number, cfg = { damping: 11, stiffness: 240, mass: 0.6 }) => spring({ frame: frame - f(at), fps, config: cfg });
const card: React.CSSProperties = {
  background: C.white,
  border: `2px solid ${C.hairline}`,
  borderRadius: 22,
  boxShadow: "0 20px 50px rgba(38,31,24,0.16), 0 3px 10px rgba(38,31,24,0.08)",
};
const Stage: React.FC<{ children: React.ReactNode; bg?: string }> = ({ children, bg = C.bg }) => (
  <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: PANEL_H, overflow: "hidden", background: bg }}>{children}</div>
);

// ------------------------------------------------------------------ the reading-time board (tier board's rows, numbered)
const TM = { page: "#242222", row: "#1a1a17", text: "#1a1a17", chip: "#34342f" };
const NUM_C = ["#ef8683", "#f5c28b", "#fae08d"];
export type Row = { text: string; fillAt: number; chips: { label: string; at: number }[]; doneAt: number };

export const ReadingBoard: React.FC<{ rows: Row[]; titleAt: number; rowsAt: number; badgeAt: number; clockFrom: number }> = ({ rows, titleAt, rowsAt, badgeAt, clockFrom }) => {
  const { frame, t, fps } = useT();
  const title = pop(frame, fps, titleAt, { damping: 14, stiffness: 180, mass: 0.6 });
  const badge = pop(frame, fps, badgeAt);
  const secs = Math.max(0, 15 * 60 - Math.max(0, Math.floor(t - clockFrom)));
  const clock = `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;
  const active = rows.findIndex((r) => t >= r.fillAt - 0.3 && t < r.fillAt + 1.4);
  const BY = SAFE_TOP + 96, RH = 176;
  return (
    <Stage bg={TM.page}>
      <div style={{ position: "absolute", left: 24, top: SAFE_TOP + 14, fontFamily: SANS, fontWeight: 800, fontSize: 56, letterSpacing: -1.2, color: C.white, opacity: Math.min(1, title * 1.5), translate: `${interpolate(title, [0, 1], [-30, 0])}px 0px` }}>
        Reading time
      </div>
      {t >= badgeAt && (
        <div style={{ position: "absolute", left: 420, top: SAFE_TOP + 24, padding: "8px 16px", borderRadius: 10, background: NUM_C[0], fontFamily: SANS, fontWeight: 800, fontSize: 28, color: TM.text, rotate: "-3deg", scale: String(interpolate(badge, [0, 1], [0.4, 1])), opacity: Math.min(1, badge * 2) }}>
          99.95 ATAR
        </div>
      )}
      <div style={{ position: "absolute", right: 28, top: SAFE_TOP + 10, display: "flex", alignItems: "center", gap: 14, opacity: Math.min(1, title * 1.5) }}>
        <div style={{ width: 16, height: 16, borderRadius: 8, background: NUM_C[0], opacity: 0.55 + 0.45 * Math.sin(t * 6) }} />
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 60, color: C.white, fontVariantNumeric: "tabular-nums", letterSpacing: -1 }}>{clock}</div>
      </div>

      {rows.map((r, i) => {
        const inP = interpolate(frame, [f(rowsAt) + i * 4, f(rowsAt) + i * 4 + 9], [0, 1], { ...clamp, easing: Easing.out(Easing.back(1.4)) });
        if (inP <= 0) return null;
        const chars = Math.floor(interpolate(t, [r.fillAt, r.fillAt + r.text.length / 34], [0, r.text.length], clamp));
        const typing = t >= r.fillAt && chars < r.text.length;
        const dim = active >= 0 && active !== i ? 0.45 : 1;
        const flash = interpolate(t, [r.fillAt, r.fillAt + 0.6], [1, 0], clamp) * (t >= r.fillAt ? 1 : 0);
        const done = pop(frame, fps, r.doneAt);
        return (
          <div key={i} style={{ position: "absolute", left: 24, top: BY + i * RH, width: 1032, height: RH - 6, display: "flex", background: "#000", opacity: inP * dim, translate: `${(1 - inP) * -60}px 0px` }}>
            <div style={{ width: 150, height: "100%", background: NUM_C[i], display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SANS, fontWeight: 700, fontSize: 72, color: TM.text, filter: `brightness(${1 + flash * 0.25})` }}>
              {i + 1}
            </div>
            <div style={{ position: "relative", flex: 1, marginLeft: 2, background: TM.row, boxShadow: flash ? `inset 0 0 0 ${3 * flash}px ${NUM_C[i]}` : undefined, padding: "24px 30px 0" }}>
              <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 48, letterSpacing: -0.9, color: C.white, whiteSpace: "nowrap" }}>
                {r.text.slice(0, chars)}
                {typing && <span style={{ opacity: Math.sin(t * 20) > 0 ? 1 : 0.2, color: NUM_C[i] }}>|</span>}
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
                {r.chips.map((c) => {
                  if (t < c.at) return null;
                  const q = pop(frame, fps, c.at);
                  return (
                    <div key={c.label} style={{ padding: "8px 20px", borderRadius: 999, background: TM.chip, color: C.white, fontFamily: SANS, fontWeight: 700, fontSize: 32, scale: String(interpolate(q, [0, 1], [0.5, 1])), opacity: Math.min(1, q * 2) }}>
                      {c.label}
                    </div>
                  );
                })}
              </div>
              {t >= r.doneAt && (
                <div style={{ position: "absolute", right: 30, top: "50%", translate: "0 -50%", width: 76, height: 76, borderRadius: 38, background: C.accent, display: "flex", alignItems: "center", justifyContent: "center", scale: String(interpolate(done, [0, 1], [0.3, 1])) }}>
                  <svg width={44} height={44} viewBox="0 0 24 24" fill="none" stroke={C.white} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12.5l4.5 4.5L19 7.5" strokeDasharray={24} strokeDashoffset={24 * (1 - Math.min(1, done))} />
                  </svg>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </Stage>
  );
};

// ------------------------------------------------------------------ English: real 2025 VCAA Section C
// Page 15's Background information, highlighted; then the box lifts off as a card, the piece (page 16)
// slides in under it, and an arrow ties the context to what's happening in the piece.
type B4 = [number, number, number, number];
const HL: React.FC<{ boxes: { at: number; box: B4 }[]; t: number; h: number }> = ({ boxes, t, h }) => (
  <svg viewBox={`0 0 1080 ${h}`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
    {boxes.map((b, i) => {
      const w = interpolate(t, [b.at, b.at + 0.28], [0, 1], { ...clamp, easing: ease });
      const [x0, y0, x1, y1] = b.box;
      return w > 0 ? <rect key={i} x={x0 - 6} y={y0 - 3} width={(x1 - x0 + 12) * w} height={y1 - y0 + 6} rx={4} fill={C.lampLight} opacity={0.6} style={{ mixBlendMode: "multiply" }} /> : null;
    })}
  </svg>
);

export const EnglishALA: React.FC<{ start: number; end: number; ctxAt: number; aboutAt: number; relAt: number; pieceAt: number }> = ({ start, end, ctxAt, aboutAt, relAt, pieceAt }) => {
  const { frame, t, fps } = useT();
  const H = 1528;
  const BG: B4 = [108, 582, 1012, 842]; // the Background information box on page 15
  const bgHL = [
    { at: ctxAt, box: [129, 636, 947, 663] as B4 },
    { at: ctxAt + 0.12, box: [129, 661, 924, 688] as B4 },
    { at: ctxAt + 0.45, box: [129, 687, 933, 714] as B4 },
    { at: ctxAt + 0.57, box: [129, 712, 909, 739] as B4 },
    { at: aboutAt, box: [129, 771, 903, 798] as B4 },
    { at: aboutAt + 0.12, box: [129, 796, 584, 823] as B4 },
  ];
  const pieceHL = [
    { at: pieceAt, box: [87, 431, 909, 459] as B4 },
  ];
  // phase A camera on page 15
  const inA = interpolate(t, [start, start + 0.6], [0, 1], { ...clamp, easing: inOut });
  const zA = interpolate(inA, [0, 1], [1.0, 1.15]), cxA = 560, cyA = interpolate(inA, [0, 1], [640, 712]);
  const drop = spring({ frame: frame - f(start), fps, config: { damping: 15, stiffness: 170, mass: 0.7 } });
  // phase B
  const lift = interpolate(t, [relAt, relAt + 0.5], [0, 1], { ...clamp, easing: inOut });
  const slide = interpolate(t, [relAt + 0.1, relAt + 0.6], [0, 1], { ...clamp, easing: ease });
  const zB = 1.12, cxB = 520, cyB = 330;
  const a0 = { left: 540 - cxA * zA + BG[0] * zA, top: VIEW_CY - cyA * zA + BG[1] * zA, s: zA };
  const a1 = { left: 636, top: SAFE_TOP + 12, s: 0.46 };
  const card = { left: interpolate(lift, [0, 1], [a0.left, a1.left]), top: interpolate(lift, [0, 1], [a0.top, a1.top]), s: interpolate(lift, [0, 1], [a0.s, a1.s]) };
  const arrow = interpolate(t, [relAt + 0.55, relAt + 0.95], [0, 1], { ...clamp, easing: inOut });
  const ring = interpolate(t, [relAt + 0.6, relAt + 0.9], [0, 1], { ...clamp, easing: ease });
  const bw = BG[2] - BG[0], bh = BG[3] - BG[1];
  return (
    <Stage bg={C.surface}>
      {/* page 15 */}
      {lift < 1 && (
        <div style={{ position: "absolute", left: 540 - cxA * zA, top: VIEW_CY - cyA * zA, width: 1080 * zA, translate: `0px ${(1 - drop) * 260}px`, rotate: `${(1 - drop) * -3}deg`, opacity: 1 - slide, boxShadow: "0 24px 60px rgba(38,31,24,0.22)" }}>
          <Img src={staticFile("broll/v-eng-15.png")} style={{ display: "block", width: "100%" }} />
          <HL boxes={bgHL} t={t} h={H} />
          {t >= relAt && <div style={{ position: "absolute", left: BG[0] * zA, top: BG[1] * zA, width: bw * zA, height: bh * zA, background: C.surface }} />}
        </div>
      )}
      {/* page 16, the piece */}
      {t >= relAt && (
        <div style={{ position: "absolute", left: 540 - cxB * zB, top: VIEW_CY - cyB * zB, width: 1080 * zB, translate: `0px ${(1 - slide) * 820}px`, boxShadow: "0 24px 60px rgba(38,31,24,0.22)" }}>
          <Img src={staticFile("broll/v-eng-16.png")} style={{ display: "block", width: "100%" }} />
          <HL boxes={pieceHL} t={t} h={H} />
          <svg viewBox={`0 0 1080 ${H}`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
            {ring > 0 && <ellipse cx={338} cy={130} rx={272} ry={22} pathLength={1} fill="none" stroke={C.oxide} strokeWidth={5} strokeDasharray="1 1" strokeDashoffset={1 - ring} transform="rotate(-1.5 338 130)" />}
          </svg>
        </div>
      )}
      {/* the background box as a lifted card */}
      {t >= relAt && (
        <div style={{ position: "absolute", left: card.left, top: card.top, width: bw * card.s, height: bh * card.s, overflow: "hidden", background: C.white, borderRadius: 6 * lift, boxShadow: `0 ${20 * lift}px ${44 * lift}px rgba(38,31,24,${0.3 * lift})`, rotate: `${-2 * lift}deg` }}>
          <div style={{ position: "absolute", left: -BG[0] * card.s, top: -BG[1] * card.s, width: 1080 * card.s }}>
            <Img src={staticFile("broll/v-eng-15.png")} style={{ display: "block", width: "100%" }} />
            <HL boxes={bgHL} t={t} h={H} />
          </div>
        </div>
      )}
      {arrow > 0 && (
        <svg width={1080} height={PANEL_H} style={{ position: "absolute", left: 0, top: 0 }}>
          <path d="M 760 304 C 1010 340, 1050 520, 975 620" fill="none" stroke={C.oxide} strokeWidth={7} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - arrow} />
          {arrow > 0.97 && <path d="M 996 598 L 975 623 L 952 602" fill="none" stroke={C.oxide} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />}
        </svg>
      )}
    </Stage>
  );
};

// ------------------------------------------------------------------ the exam hall, from above
export const ExamHall: React.FC<{ start: number; mode: "walk" | "pens"; noteAt?: number }> = ({ start, mode, noteAt = 999 }) => {
  const { frame, t, fps } = useT();
  const cols = 6, rows = 4, W = 140, H = 92, GX = 30, GY = 50;
  const x0 = (1080 - (cols * W + (cols - 1) * GX)) / 2, y0 = 40;
  const youI = 14;
  const note = pop(frame, fps, noteAt);
  const walk = mode === "walk" ? interpolate(t, [start, start + 1.4], [0, 1], { ...clamp, easing: ease }) : 1;
  return (
    <Stage bg={C.surface}>
      <div style={{ position: "absolute", left: 0, right: 0, top: SAFE_TOP + 8, textAlign: "center", zIndex: 2 }}>
        <span style={{ padding: "10px 24px", borderRadius: 999, background: C.ink, color: C.bg, fontFamily: SANS, fontWeight: 800, fontSize: 30 }}>{mode === "pens" ? "Reading time · pens down" : "Exam hall"}</span>
      </div>
      {/* the floor in perspective; walking in moves it toward the camera */}
      <div style={{ position: "absolute", inset: 0, perspective: 900, perspectiveOrigin: "50% -10%" }}>
      <div style={{ position: "absolute", left: 0, top: SAFE_TOP + 20, width: 1080, height: PANEL_H - SAFE_TOP - 20, transformOrigin: "50% 100%", transform: `rotateX(${interpolate(walk, [0, 1], [62, 48])}deg) translateY(${interpolate(walk, [0, 1], [-520, 40]) + Math.sin(t * 2.4) * 3}px) translateZ(${interpolate(walk, [0, 1], [-300, 60])}px)` }}>
        {Array.from({ length: cols * rows }).map((_, i) => {
          const c = i % cols, r = Math.floor(i / cols);
          const k = interpolate(frame, [f(start) + i * 1.2, f(start) + i * 1.2 + 7], [0, 1], { ...clamp, easing: Easing.out(Easing.back(1.3)) });
          const you = i === youI;
          const x = x0 + c * (W + GX), y = y0 + r * (H + GY);
          return (
            <div key={i} style={{ position: "absolute", left: x, top: y, width: W, height: H, opacity: k, scale: String(interpolate(k, [0, 1], [0.8, 1])) }}>
              <div style={{ position: "absolute", inset: 0, borderRadius: 8, background: C.white, border: `${you ? 5 : 2}px solid ${you ? C.ink : C.hairline}`, boxShadow: "0 8px 18px rgba(38,31,24,0.12)" }} />
              <div style={{ position: "absolute", left: W / 2 - 34, top: H + 8, width: 68, height: 30, borderRadius: 8, background: you ? C.inkBody : C.borderStrong, opacity: 0.6 }} />
              {/* paper */}
              <div style={{ position: "absolute", left: 18, top: 16, width: 64, height: 80, borderRadius: 3, background: C.bg, border: `2px solid ${C.hairline}` }} />
              {/* pen, lying flat */}
              {mode === "pens" && <div style={{ position: "absolute", left: 96, top: 20, width: 10, height: 74, borderRadius: 5, background: you ? C.accent : C.inkMuted, rotate: "8deg" }} />}
              {you && mode === "pens" && (
                <div style={{ position: "absolute", left: 24, top: 22, display: "flex", flexDirection: "column", gap: 6 }}>
                  {[0, 1, 2].map((j) => {
                    const q = interpolate(frame, [f(start) + 8 + j * 5, f(start) + 12 + j * 5], [0, 1], clamp);
                    return <div key={j} style={{ fontFamily: SANS, fontWeight: 800, fontSize: 18, lineHeight: 1, color: C.accent, opacity: q }}>✓ ——</div>;
                  })}
                </div>
              )}
              {you && <div style={{ position: "absolute", left: 0, right: 0, top: -34, textAlign: "center", fontFamily: SANS, fontWeight: 800, fontSize: 26, color: C.ink }}>You</div>}
              {you && t >= noteAt && (
                <div style={{ position: "absolute", left: 118, top: -46, padding: "10px 14px", width: 196, background: C.lampLight, borderRadius: 4, boxShadow: "0 10px 20px rgba(38,31,24,0.2)", rotate: "6deg", scale: String(interpolate(note, [0, 1], [1.8, 1])), opacity: Math.min(1, note * 2), fontFamily: SANS, fontWeight: 800, fontSize: 24, color: C.ink, lineHeight: 1.25 }}>
                  Plan
                  <div style={{ fontWeight: 600, fontSize: 20, color: C.inkBody }}>A first, B later</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      </div>
    </Stage>
  );
};

// ------------------------------------------------------------------ box breathing
export const BoxBreathing: React.FC<{ start: number; minuteAt: number; boxAt: number; side?: number }> = ({ start, minuteAt, boxAt, side = 1.1 }) => {
  const { frame, t, fps } = useT();
  const S = 380, cx = 540, cy = VIEW_CY + 10;
  const inP = pop(frame, fps, start, { damping: 14, stiffness: 200, mass: 0.6 });
  const run = Math.max(0, t - boxAt);
  const k = Math.floor(run / side) % 4;
  const u = (run % side) / side;
  const phase = t < boxAt ? -1 : k;
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  const [ax, ay] = corners[phase < 0 ? 0 : k], [bx, by] = corners[phase < 0 ? 0 : (k + 1) % 4];
  const e = inOut(u);
  const dx = cx + (S / 2) * (phase < 0 ? -1 : ax + (bx - ax) * e), dy = cy + (S / 2) * (phase < 0 ? -1 : ay + (by - ay) * e);
  const breath = phase === 0 ? e : phase === 1 ? 1 : phase === 2 ? 1 - e : 0;
  const labels = ["Breathe in", "Hold", "Breathe out", "Hold"];
  const sides = [
    { l: "In 4", x: cx, y: cy - S / 2 - 46 },
    { l: "Hold 4", x: cx + S / 2 + 84, y: cy },
    { l: "Out 4", x: cx, y: cy + S / 2 + 46 },
    { l: "Hold 4", x: cx - S / 2 - 84, y: cy },
  ];
  const minute = pop(frame, fps, minuteAt);
  const secs = Math.max(0, 60 - Math.floor(Math.max(0, t - minuteAt) * 4));
  return (
    <Stage>
      <div style={{ position: "absolute", inset: 0, opacity: Math.min(1, inP * 2), scale: String(interpolate(inP, [0, 1], [0.9, 1])) }}>
        <div style={{ position: "absolute", left: cx - S / 2, top: cy - S / 2, width: S, height: S, borderRadius: 28, border: `6px solid ${C.ink}`, scale: String(1 + 0.07 * breath), background: `rgba(15,122,60,${0.06 + 0.12 * breath})` }} />
        {sides.map((s, i) => (
          <div key={i} style={{ position: "absolute", left: s.x, top: s.y, translate: "-50% -50%", fontFamily: SANS, fontWeight: 800, fontSize: 30, color: phase === i ? C.ink : C.inkMuted, opacity: phase === i ? 1 : 0.6, scale: phase === i ? "1.12" : "1" }}>
            {s.l}
          </div>
        ))}
        <div style={{ position: "absolute", left: dx - 22, top: dy - 22, width: 44, height: 44, borderRadius: 22, background: C.accent, boxShadow: "0 0 0 10px rgba(15,122,60,0.18)" }} />
        <div style={{ position: "absolute", left: cx - 200, top: cy - 50, width: 400, textAlign: "center", fontFamily: SERIF, fontSize: 64, lineHeight: 1, color: C.ink }}>
          {phase < 0 ? "" : labels[phase]}
          {phase >= 0 && <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 40, marginTop: 14, color: C.inkBody }}>{Math.min(4, Math.floor(u * 4) + 1)}</div>}
        </div>
      </div>
      {t >= minuteAt && (
        <div style={{ position: "absolute", left: 40, top: SAFE_TOP + 16, padding: "12px 24px", ...card, borderRadius: 16, fontFamily: SERIF, fontSize: 56, color: C.ink, fontVariantNumeric: "tabular-nums", scale: String(interpolate(minute, [0, 1], [0.6, 1])), rotate: "-3deg" }}>
          0:{String(secs).padStart(2, "0")}
        </div>
      )}
    </Stage>
  );
};

// ------------------------------------------------------------------ the work you've put in: real practice papers, piling up
export const PaperPile: React.FC<{ start: number; until: number; pages: string[] }> = ({ start, until, pages }) => {
  const { frame, t, fps } = useT();
  const W = 300, H = 424;
  return (
    <Stage bg={C.surface}>
      {pages.map((src, i) => {
        const at = start + ((until - start) * i) / pages.length;
        if (t < at) return null;
        const q = spring({ frame: frame - f(at), fps, config: { damping: 14, stiffness: 170, mass: 0.7 } });
        const rot = [-7, 5, -3, 8, -5, 3, -8, 6, -2, 4][i % 10];
        const ox = [-150, 140, -40, 170, -170, 60, -100, 120, 0, -60][i % 10];
        const oy = [20, -10, 30, 0, -20, 20, 10, -30, 0, 15][i % 10];
        return (
          <div key={src} style={{ position: "absolute", left: 540 - W / 2 + ox, top: VIEW_CY - H / 2 + oy - 10 * i * 0.2, width: W, height: H, overflow: "hidden", background: C.white, borderRadius: 4, boxShadow: "0 14px 34px rgba(38,31,24,0.22)", rotate: `${rot * q + (1 - q) * 20}deg`, translate: `0px ${(1 - q) * 700}px` }}>
            <Img src={staticFile(`broll/${src}.png`)} style={{ width: W }} />
          </div>
        );
      })}
    </Stage>
  );
};
