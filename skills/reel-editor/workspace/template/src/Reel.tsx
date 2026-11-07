import React from "react";
import { AbsoluteFill, Audio, Freeze, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C, f } from "./theme";
import { Captions } from "./parts";
import { Checklist, Invoice, Reps, Resources, ZoomGrid } from "./props3";
import { ClipPanel, Drift, ExamClock, MistakeLog, PageView, PANEL_H, SAFE_TOP, TierBoard, clipClicks, type CamKey, type ClipPart, type Item } from "./props6";

/** The reel-03 props were laid out for the whole 800 px panel; shrink them into the band below the platform header. */
const STAGE_H = 800; // the reel-03 props' own canvas
const FIT = (PANEL_H - SAFE_TOP) / STAGE_H;
const SafeFit: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ position: "absolute", inset: 0, background: C.bg }}>
    <div style={{ position: "absolute", left: (1080 - 1080 * FIT) / 2, top: SAFE_TOP, width: 1080, height: STAGE_H, scale: String(FIT), transformOrigin: "0 0" }}>{children}</div>
  </div>
);

// Seconds on the cut timeline (public/words.json). Worked example: a study-method tier list; retime every number for your clip.
const VIDEO_END = 64.08;
export const TOTAL = f(VIDEO_END + 1.4);
const TOP_H = PANEL_H;

const ITEMS: Item[] = [
  { label: "Big tutoring", kind: "tutoring", tier: "C", appear: 5.04, land: 6.23 },
  { label: "Study design", kind: "tracker", tier: "A", appear: 24.01, land: 25.19 },
  { label: "Textbook", kind: "textbook", tier: "B", appear: 42.42, land: 43.12 },
  { label: "Past exams", kind: "exams", tier: "S", appear: 51.57, land: 52.59, glowAt: 52.9 },
];

// What the top panel shows: [start, end, kind]
type Seg = [number, number, string];
const TOP: Seg[] = [
  [0, 6.85, "board"],
  [6.85, 11.5, "invoice"],
  [11.5, 17.95, "zoom"],
  [17.95, 21.8, "resources"],
  [21.8, 23.95, "tm"],
  [23.95, 25.8, "board"],
  [25.8, 28.4, "sdmark"],
  [28.4, 33.55, "checklist"],
  [33.55, 38.25, "summary"],
  [38.25, 41.4, "rev"],
  [41.4, 42.4, "revpage"],
  [42.4, 43.55, "board"],
  [43.55, 51.5, "reps"],
  [51.5, 53.15, "board"],
  [53.15, 56.5, "full"],
  [56.5, 59.05, "cover"],
  [59.05, 62.95, "answers"],
  [62.95, 64.3, "log"],
  [64.3, 99, "board"],
];

// Real vcehub.com.au clips (../scripts/capture.mjs). Camera keys are [reel t, cy, zoom] in clip px.
const TM_PARTS: ClipPart[] = [{ from: 21.8, to: 23.95, clipT: 0.6, rate: 1.6 }];
const TM_CAM: CamKey[] = [[21.8, 700, 1.0], [22.4, 760, 1.05], [23.95, 900, 1.08]];
const MARK_PARTS: ClipPart[] = [{ from: 25.8, to: 28.4, clipT: 1.9, rate: 1.6 }];
const MARK_CAM: CamKey[] = [[25.8, 820, 1.06], [26.05, 880, 1.1], [26.4, 1240, 1.1], [27.0, 1100, 1.1], [27.4, 1380, 1.1], [28.05, 1150, 1.12]];
// slowed so the Struggling click lands on "weaknesses", then a push in on the traffic-light counts
const SUM_PARTS: ClipPart[] = [{ from: 33.55, to: 38.25, clipT: 0, rate: 0.66 }];
const SUM_CAM: CamKey[] = [[33.55, 700, 1.0], [34.6, 560, 1.04], [36.0, 760, 1.15], [37.4, 880, 1.35], [38.25, 890, 1.4]];
const REV_PARTS: ClipPart[] = [
  { from: 38.25, to: 40.5, clipT: 0, rate: 2.0 },
  { from: 40.5, to: 41.4, clipT: 4.5, rate: 18.5 }, // the build, sped through to "Downloaded"
];
const REV_CAM: CamKey[] = [[38.25, 900, 1.0], [38.7, 820, 1.0], [39.3, 900, 1.0], [40.2, 960, 1.08], [40.5, 1000, 1.18], [41.4, 1050, 1.26]];
const FULL_PARTS: ClipPart[] = [{ from: 53.15, to: 56.5, clipT: 0.6, rate: 1.3 }];
const FULL_CAM: CamKey[] = [[53.15, 1000, 1.0], [53.7, 1050, 1.08], [54.8, 950, 1.05], [56.5, 1000, 1.15]];

const CAMERA: [number, number][] = [
  [0, 1.0], [2.7, 1.1], [5.04, 1.0], [6.23, 1.14], [6.88, 1.0], [9.99, 1.1], [11.55, 1.0], [15.27, 1.1], [18.01, 1.0],
  [20.27, 1.12], [21.41, 1.0], [25.19, 1.14], [25.83, 1.0], [33.18, 1.15], [33.66, 1.0], [36.58, 1.08], [38.28, 1.0],
  [40.42, 1.1], [42.42, 1.0], [43.12, 1.14], [43.6, 1.04], [44.4, 1.1], [45.52, 1.0], [48.3, 1.08], [50.04, 1.12],
  [51.57, 1.0], [52.59, 1.18], [53.19, 1.0], [55.53, 1.1], [56.59, 1.0], [59.11, 1.08], [62.59, 1.0], [63.11, 1.12], [64.3, 1.0],
];
// Punch-ins on keywords, and between them a slow push and float so the speaker is never still.
const cameraAt = (t: number) => {
  const [s, z] = CAMERA.filter(([s]) => t >= s).pop()!;
  return { scale: z * (1 + Math.min(0.06, 0.014 * (t - s))), x: 9 * Math.sin(t * 0.5), y: 6 * Math.cos(t * 0.37) };
};

// [time, file, volume, max seconds]
const SFX: [number, string, number, number?][] = [
  [0.13, "whoosh_soft", 0.3], [2.7, "pop", 0.4],
  [6.85, "whoosh_in", 0.4], [9.99, "stamp", 0.5],
  [11.5, "whoosh_soft", 0.35], [15.83, "pop", 0.4],
  [17.95, "paper", 0.45], [18.1, "paper", 0.35], [18.25, "paper", 0.4], [20.27, "pop", 0.45],
  [21.8, "whoosh_in", 0.4],
  [25.8, "whoosh_in", 0.4],
  [28.4, "pop_soft", 0.3], [28.55, "typing", 0.25, 0.6], [33.18, "stamp", 0.6],
  [33.55, "whoosh_in", 0.4], [37.5, "pop_soft", 0.3],
  [38.25, "whoosh_in", 0.35], [40.55, "tick_roll", 0.3, 0.8], [41.25, "ding", 0.3],
  [41.4, "paper", 0.45], [41.55, "pop_soft", 0.3], [41.8, "pop_soft", 0.3],
  [43.55, "whoosh_in", 0.4], [47.2, "tick_roll", 0.32, 0.8], [48.3, "whoosh_soft", 0.3], [50.04, "pop", 0.4],
  [52.9, "ding", 0.35],
  [53.15, "whoosh_in", 0.4],
  [56.5, "paper", 0.45], [57.31, "pop_soft", 0.35], [57.4, "tick_roll", 0.22, 0.8], [58.37, "pop_soft", 0.35], [58.45, "tick_roll", 0.22, 0.5],
  [59.05, "paper", 0.4], [59.2, "pop_soft", 0.25],
  [62.95, "whoosh_soft", 0.35], [63.05, "typing", 0.22, 0.9],
  [64.3, "whoosh_soft", 0.35], [64.55, "ding", 0.3],
];
// tier list: pick-up whoosh and drop stamp for each item
ITEMS.forEach((it) => SFX.push([it.appear, "whoosh_soft", 0.32], [it.land, "stamp", 0.62]));
// board re-entries
TOP.filter(([s, , k]) => k === "board" && s > 0).forEach(([s]) => SFX.push([s, "whoosh_soft", 0.3]));
// a click under every on-screen click in the clips
const CLICKS = [
  ...clipClicks("tm-browse", TM_PARTS),
  ...clipClicks("sd-mark", MARK_PARTS),
  ...clipClicks("sd-summary", SUM_PARTS),
  ...clipClicks("rev-build", REV_PARTS),
  ...clipClicks("tm-full", FULL_PARTS),
];
CLICKS.forEach((t) => SFX.push([t, "click", 0.5]));

// "mark it immediately after so you remember what you were thinking ..." — one mark per Section A answer
const MARKS = [
  { at: 59.5, x: 52, y: 511, ok: true },
  { at: 59.9, x: 52, y: 565, ok: true },
  { at: 60.3, x: 52, y: 648, ok: false },
  { at: 60.7, x: 52, y: 701, ok: true },
  { at: 61.1, x: 52, y: 756, ok: true },
  { at: 61.5, x: 52, y: 810, ok: true },
  { at: 61.9, x: 52, y: 864, ok: false },
];
MARKS.forEach((m) => SFX.push([m.at, "pop_soft", 0.25]));

const Face: React.FC = () => {
  const frame = useCurrentFrame();
  const last = f(VIDEO_END) - 2;
  const v = <OffthreadVideo src={staticFile("talk-cut.mov")} muted style={{ width: 1080, height: 1920 - PANEL_H }} />;
  return frame > last ? <Freeze frame={last}>{v}</Freeze> : v;
};

const Top: React.FC<{ kind: string; s: number; e: number }> = ({ kind, s, e }) => {
  switch (kind) {
    case "board":
      return <TierBoard items={ITEMS} titleAt={0.13} badgeAt={2.7} />;
    case "invoice":
      return <SafeFit><Invoice start={s} stampAt={9.99} /></SafeFit>;
    case "zoom":
      return <SafeFit><ZoomGrid start={s} askAt={15.83} /></SafeFit>;
    case "resources":
      return <SafeFit><Resources start={s} pctAt={20.27} /></SafeFit>;
    case "tm":
      return <ClipPanel name="tm-browse" parts={TM_PARTS} cam={TM_CAM} start={s} end={e} />;
    case "sdmark":
      return <ClipPanel name="sd-mark" parts={MARK_PARTS} cam={MARK_CAM} start={s} end={e} />;
    case "checklist":
      return <SafeFit><Checklist start={s} greyAt={30.28} strikeAt={33.18} /></SafeFit>;
    case "summary":
      return <ClipPanel name="sd-summary" parts={SUM_PARTS} cam={SUM_CAM} start={s} end={e} />;
    case "rev":
      return <ClipPanel name="rev-build" parts={REV_PARTS} cam={REV_CAM} start={s} end={e} />;
    case "revpage":
      return (
        <PageView
          src="revision-01"
          start={s}
          end={e}
          cam={[[s, 540, 640, 1.15], [41.75, 420, 850, 1.62], [e, 420, 870, 1.66]]}
          highlights={[
            { at: 41.55, box: [128, 823, 304, 844] },
            { at: 41.8, box: [128, 911, 726, 932] },
          ]}
        />
      );
    case "reps":
      return <SafeFit><Reps start={s} tickFrom={47.2} tickTo={47.9} harderAt={48.3} appAt={50.04} /></SafeFit>;
    case "full":
      return <ClipPanel name="tm-full" parts={FULL_PARTS} cam={FULL_CAM} start={s} end={e} />;
    case "cover":
      return (
        <PageView
          src="full-01"
          start={s}
          end={e}
          cam={[[s, 540, 650, 1.0], [57.2, 330, 700, 1.7], [e, 360, 705, 1.85]]}
          highlights={[
            { at: 57.31, box: [102, 673, 331, 695] },
            { at: 58.37, box: [102, 703, 332, 724] },
          ]}
        >
          <ExamClock readAt={57.31} writeAt={58.37} />
        </PageView>
      );
    case "answers":
      return <PageView src="full-65" start={s} end={e} cam={[[s, 420, 420, 1.3], [59.6, 390, 680, 1.38], [e, 390, 720, 1.42]]} highlights={[{ at: 59.2, box: [82, 266, 978, 288] }]} marks={MARKS} />;
    case "log":
      return (
        <MistakeLog
          start={s}
          end={e}
          rows={[
            ["Q3", "Competitive inhibition is reversible"],
            ["Q7", "Optimum temperature is the peak"],
          ]}
        />
      );
  }
  return null;
};

export const Reel: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const [s, e, kind] = TOP.find(([s, e]) => t >= s && t < e) ?? TOP[TOP.length - 1];
  const cam = cameraAt(t);

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      {/* speaker, bottom panel */}
      <div style={{ position: "absolute", top: TOP_H, left: 0, width: 1080, height: 1920 - TOP_H, overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, scale: String(cam.scale), translate: `${cam.x}px ${cam.y}px`, transformOrigin: "540px 480px" }}>
          <Face />
        </div>
      </div>

      {/* top panel */}
      <Drift key={s} start={s} end={e}>
        <Top kind={kind} s={s} e={e} />
      </Drift>

      <div style={{ position: "absolute", top: TOP_H - 3, left: 0, width: 1080, height: 6, background: C.ink }} />

      <Captions top={TOP_H + 26} />

      <Audio src={staticFile("talk-cut.mov")} />
      {SFX.map(([s, name, vol, max], i) => (
        <Sequence key={i} from={f(s)} durationInFrames={max ? f(max) : undefined} layout="none">
          <Audio src={staticFile(`sfx/${name}.wav`)} volume={vol} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
