---
name: reel-editor
description: Edit raw talking-head footage (a 4K landscape camera clip or a portrait phone clip, e.g. iPhone .mov) into a vertical 1080x1920 Instagram or TikTok reel, such as a study-method tier list, in the VCE Hub split layout. A board, props and real screen clips sit on top and the speaker below. The pipeline is a faster-whisper cut of the clean takes, a Remotion timeline, SFX, word-timed captions and constant motion. Use when asked to edit, cut or make a reel or promo video from a clip, or to redo or tweak one.
argument-hint: "<clip path> [notes]"
---

Turn one raw clip into a finished vertical reel in `$REELS_DIR/reel-NN/` (default `~/reels`), using the next free number. Arguments: `$ARGUMENTS`.

Keep reels outside any code repo. Never commit them and never post them, because the person you're working for does the posting. A reel another session is building (an `out/` folder with no final mp4, or a recent mtime) belongs to that session, so keep out of it.

## First run: set up the workspace

The `workspace/` folder next to this file is the starting point. If `$REELS_DIR` doesn't exist yet:

1. Copy it with `cp -R <this skill's folder>/workspace "$REELS_DIR"`. Then run `npm install` in `$REELS_DIR` (Playwright and dotenv for the capture scripts) and in `$REELS_DIR/template` (Remotion).
2. Run `cp .env.example .env` and ask the person to fill it in. It needs the site URL and a **dedicated test account** for screen clips, plus an ElevenLabs key for the SFX. They edit `.env` themselves. Never ask for secrets in the chat.
3. Run `uv run --no-project python scripts/sfx.py` once. It writes the SFX set to `template/public/sfx/`.
4. Tools: ffmpeg and ffprobe, poppler (`pdftoppm`, `pdftotext`), `uv` for the Python steps, and Node 20 or later. Run `npx playwright install chromium` once for captures.

**On Windows:** run the shell steps in Git Bash (the Bash tool), so `cp -R`, `./render.sh` and `$REELS_DIR` work as written. `~/reels` is `C:\Users\<you>\reels`. Don't call `python3`, because it's often the Microsoft Store stub; use `uv run ... python`. Install the tools with winget: `Gyan.FFmpeg` (includes `zscale` for the HDR tone map), `astral-sh.uv`, `oschwartz10612.Poppler`. Then open a new terminal so they're on PATH.

`template/src/Reel.tsx` is a worked example (a study-method tier list), and its media isn't included. Every reel rewrites it.

## House style (the VCE Hub look)

- **Top safe zone.** Reels and TikTok lay their header over roughly the top 1 cm, about 170 px of the 1920 frame. Nothing that matters may sit there: titles, highlighted lines, cards, clocks or graphs. The top panel still bleeds to the edge, but frame the content in the band from 170 to 800, using `SAFE_TOP` and `VIEW_CY` from `src/props6.tsx`, which `PageView`, `ClipPanel` and `Drift` centre on. Check stills with a red line drawn at y=170.
- **No text cards.** Don't pull quotes into cards over the page. For legibility, zoom the camera onto the highlighted line on the real page: about 1.5–1.75x for a short line, and as far as the line's width allows for a long one. Don't re-typeset the text.
- **Layout.** The top panel is 1080x920 (`PANEL_H`) and shows the board, props and site clips. With the 170 px safe zone, 750 px of it is visible. The speaker panel below is 1080x1000 with no matte. From a 4K landscape frame that's a 2333x2160 crop. From a portrait phone frame it's the full width and a 1.08:1 band around the head (1080x1000 of 1080x1920, or 2160x2000 of 2160x3840). `cut.py` works this out from ffprobe. An 800/1120 split read speaker-heavy once the safe zone ate the top. A 6 px ink rule separates the panels.
- **Tier board.** Copy the TierMaker look: page `#242222`, rows `#1a1a17`, a black control column with a gear and up/down chevrons, and coloured label cells S `#ef8683`, A `#f5c28b`, B `#fae08d`, C `#ffff91`, D `#cdfd8f` with dark letters. Show all five tiers even if D stays empty. Items are square tiles with a label strip. Use a real UI crop where the item is part of the product. Each item gets picked up (big, centred, cursor gripping, wobbling), then dragged into its row, landing on the spoken tier letter.
- **Always motion.** Nothing on screen is static:
  - Every top segment settles in (spring, 1.07 to 1) and then creeps forward (`Drift`).
  - The speaker gets keyword punch-ins, plus a slow push and float between them.
  - Clips use eased camera keys that follow the cursor, and pages pan and zoom onto the line being said.
- **Animate on real documents.** For advice reels, show the real source document, such as an official past exam paper, rather than your own material. Animate on the page itself: pencil-sketch the actual answer onto printed axes, lift a box off as a card, ring the method steps. Use only documents you're allowed to show, and never commercial practice material.
- **Real UI only.** Screen B-roll is the real product, recorded as clips on the test account (below). Never mock the product. Abstract props (invoice, Zoom grid, checklist, textbook reps) are fine for claims that aren't about the product.
- **Captions.** White Public Sans 800 at 58 px with a 10 px ink outline, no box and no word highlight. They sit at the top of the speaker panel (`TOP_H + 26`). Spell brand names the way the brand does, e.g. "VCE Hub" as two words.
- **Audio.**
  - One SFX per visual event, from the set in `public/sfx`.
  - No pencil, marker or scratchy paper sounds, because they muffle the voice. Highlights and handwriting stay silent, with a soft pop or whoosh at most.
  - No music baked in, because it gets added in the app.
  - Run a two-pass loudnorm to -14 LUFS / -1.5 dBTP (`render.sh`).
- **Copy.** Dry, no superlatives, no emoji, and no selling end card. The board's final state is the ending.
- **Rejected before:** gunshot-like impacts, generated music, and brown "ink" backgrounds ("looks like AI").

## Re-shoot of an existing script

If the speaker re-records a script you've already edited (because of bad light, say), copy the previous reel folder whole, minus `out/`, `public/talk-cut.mov` and `public/words.json`. Keep its clips, PDF pages and tiles. Redo only the transcript, then `cut.py` (`KEEP`, `CROP_X`, `GRADE`, gate level from the room's noise floor), then retime every number in `Reel.tsx` from the new `words.json`. The wording drifts between takes, so re-map each beat to the new words, and slow or speed a clip (`rate`) so its clicks land on the new keywords. That's about 15 minutes, with no new captures.

## Pipeline

1. **Scaffold.** Run `cp -R "$REELS_DIR/template" "$REELS_DIR/reel-NN"`. Copying `node_modules` is faster than npm and works offline.
2. **Transcribe.** Extract 16 kHz mono audio (`ffmpeg -i <clip> -map 0:a:0 -ac 1 -ar 16000 analysis/audio16k.wav`; the `-map` keeps ffmpeg off an iPhone's spatial-audio track), then run `uv run --no-project --with faster-whisper python analysis/transcribe.py analysis/audio16k.wav analysis/transcript.json`. This uses medium.en with VAD, and the first run downloads the model. Print it as lines with start times to find the retakes.
3. **Cut** with `analysis/cut.py`, run as `uv run --no-project --with numpy --with soundfile python analysis/cut.py <clip>`:
   - `KEEP` lists source windows for the last clean take of each line. Speakers restart lines a lot, so the last complete take is usually the one.
   - Whisper stretches word starts over silence and breaths. The script snaps long words to their first voiced frame and splits out any internal run below the gate (−31 to −34 dB, set from the room's noise floor) for more than 0.3 s.
   - `ONSET` pins the odd word where a blip sits at the stretched start. Find those by printing 50 ms RMS around the word.
   - Split a `KEEP` window around a long breath.
   - Cut points snap to the 25 fps grid, so the video `select` and the audio `atrim`s stay in sync.
   - Set the crop so the head is centred. Run `cut.py <clip> --preview` first. It needs no transcript and writes `analysis/crop-preview.png`, four frames with the panel crop in red. For landscape footage, tune `HEAD_X`. For portrait phone footage, tune `HEAD_Y` (about 0.35–0.45; the head should sit in the upper part of the box, below where the captions go at the top of the panel). The script prints the source size, whether it's HDR, and the crop.
   - **Phone footage:** frame rate (30/60 fps or variable) is resampled to 25 fps before the cut. HDR (the iPhone default) is tone-mapped to SDR automatically. Look at the result before setting the grade, since it often needs a little lift (`eq=gamma=1.05`). If ffmpeg reports no `zscale`, install the full gyan.dev build, or turn HDR off on the phone. Also set the grade (`eq=gamma=1.18:saturation=1.06:contrast=1.03` suits a dim room, and a bright room needs almost none).
   - `FIX` corrects whisper's spellings: acronyms it mishears (VCAR→VCAA), split numbers ("99" ".95"→99.95), lowercase "tier", and a period before "Easy" so the captions break right.
   - End every `KEEP` window about 0.3 s past its last word's **end**, never at its start. Cutting at the start clips the last word. Print each window's tail room before cutting.
   - A fast retake right after a stopped line can vanish into whisper's VAD. Watch for speech-level RMS with no words. Re-transcribe that slice with `vad_filter=False` and patch the words into `transcript.json`, keeping `transcript_raw.json`.
   - Verify by re-transcribing `public/talk-cut.mov`. It should read as one clean take.
4. **Capture clips** with `node scripts/capture.mjs reel-NN` (from `$REELS_DIR`), using the example in it as the template:
   - **Login:** run `node scripts/login.mjs` to refresh `.auth.json` from `.env`. The login needs about 6 s before the redirect. Use only the dedicated test account, never a personal one.
   - **Recording:** the CDP screencast (`Page.startScreencast`, jpeg q95, 432x768 @2.5x, so 1080x1920) is assembled into a CFR 25 fps mp4 with the ffconcat frame durations. Clicks are logged with clip time and clip px into `public/clips/clips.json`.
   - **Smooth motion:** scroll with the rAF-eased `scrollTo` helper so every frame is painted.
   - **Saved state:** if the product saves what a clip does (marks, progress), pick something the account hasn't touched. The example picks a subject whose Untouched count equals All.
   - **Prep:** call `tidy()` before every clip, to hide banners and dismiss popovers.
   - **PDFs:** downloads are saved and rendered with `pdftoppm -scale-to-x 1080`. For exact highlight boxes, use `pdftotext -bbox-layout` written to a file (some poppler builds reject `-`), scaled by 1080 / page width.
5. **Timeline** (`src/Reel.tsx`). The `TOP` segments run on cut seconds from `public/words.json`, and every claim gets its own visual. Clips use `ClipPanel` with `parts` (`clipT`, `rate`), so a slow build can be sped through at rate ~20. `cam` keys should arrive about 0.2 s before each click. Pages use `PageView` with camera keys, highlight boxes and tick/cross marks. Clicks in clips get SFX automatically through `clipClicks`.
6. **Render.** Run `npx tsc -p .`, then `./render.sh`, which takes about 3 to 5 min.
   - **Review:** pull frames at every segment midpoint and every item landing, montage them, and look. Check cursor placement, camera framing on the clicked element, caption overlap and the empty board space.
   - **Fix and re-render.** If Remotion hangs on "Waiting for root component", set `REMOTION_BROWSER` to Playwright's headless_shell (see `remotion.config.ts`).
   - **Review lessons:**
     - Some ffmpeg builds have no `drawtext`. If so, make sheets with `tile` and keep a list of timestamps.
     - PDF body text needs about 1.6x zoom to read on a phone. Keep the camera's left edge inside the page margin (x of about 80 to 100).
     - Put tick/cross marks in the left margin (x of about 52), not the right edge, so they survive the zoom.
     - Caption pages break on punctuation, so close any sentence whisper left open (e.g. "tier Large").
7. **Hand over** `out/reel-NN.mp4` and a frame sheet. Don't upload it anywhere.

## Scripts that aren't tier lists

Keep the series look, and swap the tier board for a board in the same style that fits the script. For "three things to do in reading time", that was `ReadingBoard` in `src/props8.tsx`:
- the same dark rows, with numbered label cells instead of tier letters
- a live 15:00 countdown
- each row types in on its spoken line, collects chips for the examples as they're mentioned, and gets a tick on the recap

When the script never names the product, the real UI can still be evidence. Make real artefacts on the test account and use their pages: an exam cover's reading and writing time, a graph, a long stem. Abstract props cover the rest. That reel had an essay page, an exam hall seen from above, a box-breathing square and a pile of the real papers.

### Real document pages

- **Rendering:** `pdftoppm -scale-to-x 1080` writes the pages to `public/broll/*.png`. A4 portrait pages come out 1080x1528. Some exam books are 1080x1459, so pass `pageH={1459}` to `PageView`, or the overlays drift.
- **What `PageView` can draw:**
  - `strokes`: pencil paths, using `pathLength=1` dash animation
  - `rings`: a marker ellipse around a box
  - `notes`: handwritten text, with optional colour and size
  - `highlights` and `marks`
- **Sketching onto printed axes:** read the tick labels' boxes from `pdftotext -bbox-layout`, then fit px per unit and the origin. Solve the function and draw it exactly, including its stationary points and intercepts. The answer has to be right.
- **Lifting a box off:** `EnglishALA` in props8 highlights a background-information box on one page. It then lifts the box off as a card while the next page slides in, and an arrow ties the card to the lines it explains.

## Script beats that recur (tier list)

The pattern is: hook with the board and credentials badge, then for each item the pick-up and drop on "X tier", then one prop or clip per sentence, then back to the board. The order runs from the worst item to S, and the full board is the ending. In the worked example, the product mentions map to clips:

| Spoken line | Clip |
|---|---|
| "test maker" | `tm-browse` |
| "track honestly" | `sd-mark` |
| "strengths and weaknesses" | `sd-summary` |
| "custom test from past exam questions" | `rev-build`, then the revision cover |
| "exam conditions" | `tm-full`, then the cover with reading and writing time, then the marked Answers page, then the mistake log |
