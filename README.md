# reel-editor-skill

A Claude Code skill that turns a raw talking-head clip into a vertical 1080x1920 reel for Instagram or TikTok. It was built for [VCE Hub](https://vcehub.com.au)'s study-method reels and keeps that look: a TierMaker-style board, props and real screen clips in the top panel, the speaker cropped into the bottom panel, word-timed captions, one sound effect per event, and nothing on screen standing still.

You give Claude a clip. It transcribes it with faster-whisper, cuts the clean takes, records screen clips of your product with Playwright, writes a Remotion timeline, renders, normalises loudness and hands back an mp4 with a frame sheet for review.

## Install

As a plugin, from inside Claude Code:

```
/plugin marketplace add eddy-cooper/reel-editor-skill
/plugin install reel-editor@reel-editor-skill
```

Or copy the skill folder by hand:

```
git clone https://github.com/eddy-cooper/reel-editor-skill
cp -R reel-editor-skill/skills/reel-editor ~/.claude/skills/
```

## Requirements

- Node 20 or later, and npm
- ffmpeg and ffprobe
- poppler (`pdftoppm`, `pdftotext`) for document pages
- [uv](https://docs.astral.sh/uv/) for the Python steps (faster-whisper, numpy, soundfile)
- An ElevenLabs API key, used once to generate the sound effects
- A test account on the site you want to record, if your reels show a product

## Use

```
/reel-editor ~/footage/C0001.MP4 tier list of study methods
```

On first run the skill sets up a workspace at `$REELS_DIR` (default `~/reels`) from `skills/reel-editor/workspace/` and asks you to fill in `.env`. Each reel then gets its own folder, `reel-01`, `reel-02` and so on, copied from the template.

Footage can be 4K landscape (3840x2160) or portrait phone video (for example an iPhone `.mov`, 1080x1920 or 2160x3840). `analysis/cut.py` reads the size, rotation and HDR with ffprobe. It crops a 1080x1000 speaker panel centred on `HEAD_X` (landscape) or `HEAD_Y` (portrait), resamples to 25 fps and tone-maps iPhone HDR to SDR. Run `cut.py <clip> --preview` to see the crop before cutting.

On Windows, run the shell steps in Git Bash and install the tools with `winget install Gyan.FFmpeg astral-sh.uv oschwartz10612.Poppler`.

## What's in it

```
skills/reel-editor/
  SKILL.md                 the instructions Claude follows: house style, pipeline, lessons
  workspace/
    .env.example           site URL, test account, ElevenLabs key
    scripts/login.mjs      logs the test account in, saves .auth.json
    scripts/capture.mjs    records CDP screencasts as 1080x1920 clips with click events
    scripts/sfx.py         generates the sound-effect set once
    template/              one reel as a Remotion project
      analysis/            transcribe.py (faster-whisper), cut.py (clean takes, crop, grade)
      src/Reel.tsx         the timeline (a worked tier-list example)
      src/props6.tsx       TierBoard, ClipPanel, PageView, Drift and the layout constants
      src/props3.tsx       abstract props: invoice, Zoom grid, checklist, reps
      src/props8.tsx       a numbered board and document animations for non-tier scripts
      src/parts.tsx        captions
      render.sh            render, then two-pass loudnorm to -14 LUFS
```

`Reel.tsx` and `capture.mjs` are worked examples from a real VCE Hub reel. The footage, screen clips and document pages they reference aren't included, so the template won't render until Claude rebuilds the timeline around your own clip.

## Licences

The code is MIT. The template depends on [Remotion](https://www.remotion.dev), which has its own licence: it's free for individuals and small companies, and larger companies need a company licence (see remotion.dev/license). Newsreader is included under the SIL Open Font License (`template/public/Newsreader-OFL.txt`). Public Sans is loaded from Google Fonts at render time. The sound effects aren't included. `sfx.py` generates them with your ElevenLabs account, under ElevenLabs' terms.
