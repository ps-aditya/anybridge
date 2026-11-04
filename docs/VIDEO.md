# AnyBridge demo video (automated)

This document describes the code-generated demo video pipeline built for the Meta
Global AI Developer Hackathon submission.

## Output

- `dist/anybridge-demo.mp4` — final 1920×1080 30 fps H.264 video with AI
  voice-over and burned-in captions.
- Runtime: ~64 seconds (under the 3-minute requirement).

## What is real vs omitted

Real:
- Screenshots of the actual fixture app before and after execution
  (`video/captures/tasks-before.png`, `tasks-after.png`), captured with Playwright.
- Captured stdout from the real `anybridge approve <plan_id>` CLI
  (`video/captures/approve-output.txt`) for plan `plan_65e903dfc7ee`.
- Real verification evidence (`video/captures/verify.json`) and replay result
  (`video/captures/replay.json`).
- Eight-task pass/fail results from `results/eight-task-results.json`
  (8/8 plan → execute → verify → replay).
- Engine timing: compile 6.03 s, replay 3.95 s, speed-up 1.5×.
- Replay model calls: 0.
- Red-team gate: 8/8 covered cases blocked; 46/46 tests pass.
- Planner identity: Muse Spark 1.3 Contributor via OpenCode Go fallback
  (`opencode-go/muse-spark-1.3-contributor`).

Omitted:
- No continuous browser video (`runs/*/browser.mp4`) or audit jsonl
  (`runs/*/audit.jsonl`) was recorded; the demo uses real still captures and
  the real CLI transcript instead.
- Planning model-call count and cost are not captured by the OpenCode Go
  subagent route and are not shown.
- Direct Meta Model API E0 was not run; E0 is from the OpenCode Go fallback.

These omissions are listed in `video/facts.json` under `limits`.

## Capture assets

Regenerate the real captures with:

```bash
npm run build
node scripts/capture-demo-assets.mjs   # starts fixture, captures, executes, verifies, replays
npm run video:facts                    # copies screenshots into video/public/captures
```

The approval input is piped as `yes` for this recording; the real path is
interactive and is noted on screen.

## Toolchain

- Remotion 4 (React) for composition and render.
- Kokoro-82M (local Python, `kokoro-onnx`) for narration.
- ffmpeg for final encode and audio normalization to -16 LUFS.

## Commands

```bash
# Regenerate facts from measured results
npm run video:facts

# Regenerate narration audio (requires .venv model files)
npm run video:tts

# Render draft
npm run video:render

# Render release (requires narration.json version == "locked")
npm run video:render -- --release

# QA
npm run video:qa
```

## Release checklist

1. Edit `video/narration.json` and set `"version": "locked"`.
2. Ensure `video/facts.json` has `"mock": false`.
3. Run `npm run video:render -- --release`.
4. Run `npm run video:qa`.
5. Watch `dist/anybridge-demo.mp4`.
