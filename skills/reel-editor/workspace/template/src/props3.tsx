import React from "react";
import { Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C, SANS, SERIF, f } from "./theme";
import { usePop } from "./parts";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const card: React.CSSProperties = {
  background: C.white,
  border: `2px solid ${C.hairline}`,
  borderRadius: 24,
  boxShadow: "0 20px 50px rgba(38,31,24,0.16), 0 3px 10px rgba(38,31,24,0.08)",
};
const useT = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return { frame, t: frame / fps, fps };
};

/** Full-width top panel (1080 x 800) on cream. */
export const Stage: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 800, overflow: "hidden", background: C.bg }}>{children}</div>
);

// ------------------------------------------------------------------ tier board
const TIERS = [
  { k: "S", c: "#a03327" }, // oxide
  { k: "A", c: "#9d622b" }, // brass
  { k: "B", c: "#557a3a" }, // signal green
  { k: "C", c: "#3b5f8f" }, // subject1 denim
];
const ROW_Y = (i: number) => 150 + i * 158;

export type Item = { label: string; tier: "S" | "A" | "B" | "C"; appear: number; land: number };

export const Board: React.FC<{ items: Item[]; badgeAt: number }> = ({ items, badgeAt }) => {
  const { frame, t, fps } = useT();
  const badge = usePop(badgeAt);
  return (
    <Stage>
      <div style={{ position: "absolute", left: 40, top: 34, fontFamily: SERIF, fontSize: 72, letterSpacing: -2, color: C.ink }}>VCE study methods</div>
      {badge.visible && (
        <div
          style={{
            position: "absolute",
            right: 36,
            top: 44,
            padding: "10px 20px",
            borderRadius: 14,
            border: `2px solid ${C.ink}`,
            fontFamily: SANS,
            fontWeight: 700,
            fontSize: 30,
            color: C.ink,
            background: C.white,
            opacity: badge.opacity,
            scale: String(badge.scale),
            rotate: "3deg",
          }}
        >
          two 50s · 99.95 ATAR
        </div>
      )}
      {TIERS.map((tr, i) => (
        <div key={tr.k} style={{ position: "absolute", left: 30, top: ROW_Y(i), width: 1020, height: 146, display: "flex", gap: 12 }}>
          <div style={{ width: 146, height: 146, borderRadius: 18, background: tr.c, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SERIF, fontSize: 96, color: C.bg }}>
            {tr.k}
          </div>
          <div style={{ flex: 1, borderRadius: 18, background: C.surface, border: `2px solid ${C.hairline}` }} />
        </div>
      ))}
      {items.map((it) => {
        if (t < it.appear) return null;
        const row = TIERS.findIndex((x) => x.k === it.tier);
        const pop = spring({ frame: frame - f(it.appear), fps, config: { damping: 12, stiffness: 220, mass: 0.6 } });
        const fly = interpolate(frame, [f(it.land) - 4, f(it.land) + 3], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
        const settle = spring({ frame: frame - f(it.land) - 3, fps, config: { damping: 9, stiffness: 300, mass: 0.5 } });
        const x0 = 540 - 300, y0 = 330; // hovering, centre of the board
        const x1 = 200, y1 = ROW_Y(row) + 18;
        const squash = t >= it.land ? interpolate(settle, [0, 0.5, 1], [1, 1.08, 1]) : 1;
        return (
          <div
            key={it.label}
            style={{
              position: "absolute",
              left: interpolate(fly, [0, 1], [x0, x1]),
              top: interpolate(fly, [0, 1], [y0, y1]),
              width: 600,
              height: 110,
              ...card,
              borderRadius: 16,
              display: "flex",
              alignItems: "center",
              paddingLeft: 30,
              fontFamily: SANS,
              fontWeight: 700,
              fontSize: 44,
              color: C.ink,
              opacity: Math.min(1, pop * 2),
              scale: String(interpolate(pop, [0, 1], [0.6, 1]) * interpolate(fly, [0, 1], [1.15, 1]) * squash),
              rotate: `${interpolate(fly, [0, 1], [-3, 0])}deg`,
            }}
          >
            {it.label}
          </div>
        );
      })}
    </Stage>
  );
};

// ------------------------------------------------------------------ tutoring
export const Invoice: React.FC<{ start: number; stampAt: number }> = ({ start, stampAt }) => {
  const { frame } = useT();
  const { visible, opacity, scale } = usePop(start);
  if (!visible) return null;
  const s = interpolate(frame, [f(stampAt), f(stampAt) + 4], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const rows = ["Group class", "Lecture notes", "Practice exam pack", "Term fee"];
  return (
    <Stage>
      <div style={{ position: "absolute", left: 170, top: 70, width: 740, padding: "36px 44px", opacity, scale: String(scale), ...card }}>
        <div style={{ fontFamily: SERIF, fontSize: 60, color: C.ink, marginBottom: 24 }}>Invoice</div>
        {rows.map((r) => (
          <div key={r} style={{ display: "flex", justifyContent: "space-between", padding: "14px 0", borderBottom: `2px solid ${C.hairline}`, fontFamily: SANS, fontSize: 36, color: C.inkBody }}>
            <span>{r}</span>
            <span style={{ width: 120, height: 16, marginTop: 12, borderRadius: 8, background: C.hairline }} />
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 22, fontFamily: SANS, fontWeight: 800, fontSize: 44, color: C.ink }}>
          <span>Total</span>
          {s > 0 && <span style={{ color: C.signalRed, scale: String(interpolate(s, [0, 1], [1.8, 1])), opacity: s }}>$$$$</span>}
        </div>
      </div>
    </Stage>
  );
};

export const ZoomGrid: React.FC<{ start: number; askAt: number }> = ({ start, askAt }) => {
  const { frame } = useT();
  const { visible, opacity } = usePop(start);
  if (!visible) return null;
  const ask = usePopInline(frame, askAt);
  return (
    <Stage>
      <div style={{ position: "absolute", left: 40, top: 40, width: 1000, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, opacity }}>
        {Array.from({ length: 16 }).map((_, i) => {
          const you = i === 9;
          const k = interpolate(frame, [f(start) + i, f(start) + i + 5], [0, 1], clamp);
          return (
            <div
              key={i}
              style={{
                position: "relative",
                height: 168,
                borderRadius: 14,
                background: you ? C.surface : "#3a332b",
                border: you ? `5px solid ${C.ink}` : "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: k,
                scale: String(interpolate(k, [0, 1], [0.8, 1])),
              }}
            >
              <div style={{ width: 70, height: 70, borderRadius: 35, background: you ? C.borderStrong : "#5a5046" }} />
              {you && <div style={{ position: "absolute", left: 12, bottom: 8, fontFamily: SANS, fontWeight: 700, fontSize: 26, color: C.ink }}>You</div>}
              {you && ask > 0 && (
                <div
                  style={{
                    position: "absolute",
                    right: -18,
                    top: -30,
                    width: 74,
                    height: 74,
                    borderRadius: 37,
                    background: C.white,
                    border: `3px solid ${C.ink}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: SANS,
                    fontWeight: 800,
                    fontSize: 46,
                    color: C.ink,
                    scale: String(ask),
                  }}
                >
                  ?
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Stage>
  );
};
const usePopInline = (frame: number, at: number) =>
  frame < f(at) ? 0 : interpolate(frame, [f(at), f(at) + 4, f(at) + 8], [0, 1.15, 1], clamp);

export const Resources: React.FC<{ start: number; pctAt: number }> = ({ start, pctAt }) => {
  const { frame } = useT();
  if (frame < f(start)) return null;
  const pct = usePopInline(frame, pctAt);
  const pos = [
    { x: 120, r: -8 },
    { x: 360, r: 1 },
    { x: 600, r: 8 },
  ];
  return (
    <Stage>
      {pos.map((p, i) => {
        const k = interpolate(frame, [f(start) + i * 3, f(start) + i * 3 + 7], [0, 1], { ...clamp, easing: Easing.out(Easing.back(1.5)) });
        return (
          <div key={i} style={{ position: "absolute", left: p.x, top: 110, width: 340, height: 460, padding: "36px 30px", ...card, borderRadius: 6, rotate: `${p.r * k}deg`, translate: `0px ${(1 - k) * 500}px`, opacity: k }}>
            <div style={{ height: 14, width: "60%", background: C.inkBody, borderRadius: 7, marginBottom: 24 }} />
            {Array.from({ length: 11 }).map((_, j) => (
              <div key={j} style={{ height: 10, width: `${[96, 90, 98, 84, 94, 62][j % 6]}%`, background: C.hairline, borderRadius: 5, marginBottom: 16 }} />
            ))}
          </div>
        );
      })}
      {pct > 0 && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 210, textAlign: "center", fontFamily: SERIF, fontSize: 300, lineHeight: 1, letterSpacing: -10, color: C.ink, scale: String(pct), textShadow: `0 0 40px ${C.bg}, 0 0 20px ${C.bg}` }}>
          90%
        </div>
      )}
    </Stage>
  );
};

// ------------------------------------------------------------------ tracker misuse
export const Checklist: React.FC<{ start: number; greyAt: number; strikeAt: number }> = ({ start, greyAt, strikeAt }) => {
  const { frame } = useT();
  const { visible, opacity, scale } = usePop(start);
  if (!visible) return null;
  const grey = interpolate(frame, [f(greyAt), f(greyAt) + 20], [0, 1], clamp);
  const strike = interpolate(frame, [f(strikeAt), f(strikeAt) + 4], [0, 1], clamp);
  return (
    <Stage>
      <div style={{ position: "absolute", left: 140, top: 60, width: 800, padding: "34px 40px", opacity, scale: String(scale), ...card, filter: `saturate(${1 - grey}) opacity(${1 - grey * 0.45})` }}>
        <div style={{ fontFamily: SERIF, fontSize: 52, color: C.ink, marginBottom: 16 }}>Study design</div>
        {Array.from({ length: 6 }).map((_, i) => {
          const tick = frame >= f(start) + 4 + i * 3;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 22, padding: "13px 0", borderBottom: `2px solid ${C.hairline}` }}>
              <div style={{ width: 46, height: 46, borderRadius: 10, border: `3px solid ${C.ink}`, background: tick ? C.ink : C.white, color: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SANS, fontWeight: 800, fontSize: 32 }}>
                {tick ? "✓" : ""}
              </div>
              <div style={{ height: 16, width: `${[78, 64, 84, 58, 72, 66][i]}%`, borderRadius: 8, background: C.hairline }} />
            </div>
          );
        })}
      </div>
      {strike > 0 && (
        <>
          <svg width={1080} height={800} style={{ position: "absolute", left: 0, top: 0 }}>
            <line x1={170} y1={640} x2={170 + 740 * strike} y2={640 - 520 * strike} stroke={C.oxide} strokeWidth={12} strokeLinecap="round" />
          </svg>
          <div
            style={{
              position: "absolute",
              left: 300,
              top: 290,
              padding: "6px 30px 12px",
              border: `7px solid ${C.oxide}`,
              borderRadius: 14,
              background: "rgba(250,248,243,0.95)",
              fontFamily: SANS,
              fontWeight: 800,
              fontSize: 100,
              color: C.signalRed,
              rotate: "-8deg",
              scale: String(interpolate(strike, [0, 1], [1.7, 1])),
              opacity: strike,
            }}
          >
            Useless
          </div>
        </>
      )}
    </Stage>
  );
};

// ------------------------------------------------------------------ textbook
export const Reps: React.FC<{ start: number; tickFrom: number; tickTo: number; harderAt: number; appAt: number }> = ({ start, tickFrom, tickTo, harderAt, appAt }) => {
  const { frame, t } = useT();
  if (t < start) return null;
  const book = usePopInline(frame, start);
  const harder = t >= harderAt;
  return (
    <Stage>
      {!harder && (
        <>
          <div style={{ position: "absolute", left: 60, top: 120, width: 330, height: 440, borderRadius: 12, background: C.ink, scale: String(book), boxShadow: "0 20px 50px rgba(38,31,24,0.25)" }}>
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 34, background: "#3d342a", borderRadius: "12px 0 0 12px" }} />
            <div style={{ position: "absolute", left: 66, top: 70, fontFamily: SERIF, fontSize: 58, color: C.bg }}>Textbook</div>
            <div style={{ position: "absolute", left: 66, top: 150, width: 160, height: 4, background: C.lampLight }} />
          </div>
          <div style={{ position: "absolute", left: 450, top: 120, display: "grid", gridTemplateColumns: "repeat(5, 96px)", gap: 14 }}>
            {Array.from({ length: 20 }).map((_, i) => {
              const on = t >= tickFrom + ((tickTo - tickFrom) * i) / 20;
              return (
                <div key={i} style={{ width: 96, height: 96, borderRadius: 14, border: `3px solid ${on ? C.ink : C.hairline}`, background: on ? C.ink : C.white, color: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SANS, fontWeight: 800, fontSize: 50 }}>
                  {on ? "✓" : ""}
                </div>
              );
            })}
          </div>
        </>
      )}
      {harder && (
        <div style={{ position: "absolute", left: 140, top: 80, width: 800, height: 600 }}>
          {["Skill", "Exam style", "Application"].map((l, i) => {
            const k = interpolate(frame, [f(harderAt) + i * 4, f(harderAt) + i * 4 + 8], [0, 1], { ...clamp, easing: Easing.out(Easing.back(1.4)) });
            const h = 160 + i * 150;
            const lit = i === 2 && t >= appAt;
            return (
              <div key={l} style={{ position: "absolute", left: i * 270, bottom: 70, width: 230 }}>
                <div style={{ height: h * k, borderRadius: "16px 16px 0 0", background: lit ? C.ink : C.surface, border: `3px solid ${C.ink}`, borderBottom: "none" }} />
                <div style={{ position: "absolute", top: "100%", marginTop: 16, width: "100%", textAlign: "center", fontFamily: SANS, fontWeight: 700, fontSize: 32, color: C.ink, opacity: k }}>{l}</div>
              </div>
            );
          })}
        </div>
      )}
    </Stage>
  );
};

// ------------------------------------------------------------------ past exams
export const ExamDesk: React.FC<{ start: number; readAt: number; markAt: number; logAt: number; end: number }> = ({ start, readAt, markAt, logAt, end }) => {
  const { frame, t, fps } = useT();
  if (t < start || t >= end) return null;
  const phase = t < readAt ? 0 : t < markAt ? 1 : t < logAt ? 2 : 3;
  return (
    <Stage>
      {phase <= 1 && <Img src={staticFile("broll/phys-03.png")} style={{ position: "absolute", left: 90, top: 40, width: 900, ...card, borderRadius: 4, rotate: "-2deg" }} />}
      {phase === 1 && (() => {
        const secs = Math.max(0, 15 * 60 - Math.floor((t - readAt) * 60));
        const k = usePopInline(frame, readAt);
        return (
          <div style={{ position: "absolute", right: 60, top: 440, padding: "20px 34px", ...card, scale: String(k), textAlign: "center" }}>
            <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 30, color: C.inkMuted }}>Reading time</div>
            <div style={{ fontFamily: SERIF, fontSize: 120, lineHeight: 1, color: C.ink, fontVariantNumeric: "tabular-nums" }}>
              {String(Math.floor(secs / 60)).padStart(2, "0")}:{String(secs % 60).padStart(2, "0")}
            </div>
          </div>
        );
      })()}
      {phase === 2 && (
        <>
          <Img src={staticFile("broll/phys-04.png")} style={{ position: "absolute", left: 90, top: 30, width: 900, ...card, borderRadius: 4, rotate: "1.5deg" }} />
          <svg width={1080} height={800} style={{ position: "absolute", left: 0, top: 0 }}>
            {[
              { x: 860, y: 140, ok: true, at: markAt + 0.15 },
              { x: 860, y: 470, ok: false, at: markAt + 0.5 },
            ].map((m, i) => {
              const k = interpolate(t, [m.at, m.at + 0.18], [0, 1], clamp);
              return m.ok ? (
                <path key={i} d={`M${m.x - 40} ${m.y} l30 32 l60 -70`} fill="none" stroke={C.oxide} strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={140} strokeDashoffset={140 * (1 - k)} />
              ) : (
                <g key={i} stroke={C.oxide} strokeWidth={12} strokeLinecap="round" opacity={k > 0 ? 1 : 0}>
                  <line x1={m.x - 36} y1={m.y - 36} x2={m.x - 36 + 72 * k} y2={m.y - 36 + 72 * k} />
                  <line x1={m.x + 36} y1={m.y - 36} x2={m.x + 36 - 72 * Math.max(0, k * 2 - 1)} y2={m.y - 36 + 72 * Math.max(0, k * 2 - 1)} />
                </g>
              );
            })}
          </svg>
        </>
      )}
      {phase === 3 && (
        <div style={{ position: "absolute", left: 120, top: 60, width: 840, padding: "34px 40px", ...card }}>
          <div style={{ fontFamily: SERIF, fontSize: 58, color: C.ink, marginBottom: 18 }}>Mistake log</div>
          {[
            ["Q3", "Field lines point away from positive charges"],
            ["Q4", "Normal force at constant speed is mg"],
            ["Q9", "Forgot to convert km/h to m/s"],
          ].map(([q, m], i) => {
            const k = interpolate(frame, [f(logAt) + i * 5, f(logAt) + i * 5 + 6], [0, 1], clamp);
            return (
              <div key={q} style={{ display: "flex", gap: 24, padding: "16px 0", borderBottom: `2px solid ${C.hairline}`, opacity: k, translate: `${(1 - k) * 40}px 0px` }}>
                <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: 34, color: C.ink, width: 70 }}>{q}</span>
                <span style={{ fontFamily: SANS, fontSize: 34, color: C.inkBody }}>{m}</span>
              </div>
            );
          })}
        </div>
      )}
      {phase === 0 && (() => {
        const k = usePopInline(frame, start + 0.3);
        void fps;
        return (
          <div style={{ position: "absolute", left: 60, top: 470, padding: "16px 30px", ...card, scale: String(k), fontFamily: SANS, fontWeight: 800, fontSize: 40, color: C.ink }}>
            Exam conditions
          </div>
        );
      })()}
    </Stage>
  );
};
