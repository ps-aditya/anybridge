# Submission pack — Meta Global AI Developer Hackathon

Status checked 2026-11-04. Deadline listed on the event page: **Nov 4, 9:00 PM ET**.
The event page does not expose the submission form fields without signing in, so
the copy below is written to paste into common fields. Replace anything in
[brackets].

## Verified artifact

- Repo: https://github.com/ps-aditya/anybridge (public, MIT)
- Tag: `v0.1.0-hackathon`
- Video: `dist/anybridge-demo.mp4` — 1920×1080, 30 fps, 75.2 s, H.264/AAC,
  6.76 MB, audio normalized to -16 LUFS
- QA: `npm run video:qa` passes; narration locked; `facts.mock: false`
- Tests: 46/46 pass; lint and build pass

## YouTube upload

Upload `dist/anybridge-demo.mp4` from your own Google account. Recommended
visibility: **Public** (or Unlisted if the form accepts unlisted links; check
the rules first).

### Title

```text
AnyBridge — Compile once, replay forever | Meta AI Hackathon demo
```

### Description

```text
AnyBridge is a local-first MCP server that lets an AI assistant operate software
that has no ready-made integration: discover the interface as a numbered menu,
propose a typed workflow, require out-of-band human approval, execute under
policy, verify from independent evidence, then save and replay with zero model
calls.

Built for the Meta Global AI Developer Hackathon (Oct 26 – Nov 4, 2026).

Planner: Muse Spark 1.3 Contributor (muse-spark-1.3-contributor). The canonical
route is Meta Model API; with no MODEL_API_KEY available, the same model was used
through the OpenCode Go gateway and is labelled as a fallback. The AnyBridge
server itself makes zero model calls, so any MCP-capable assistant can drive it.

What the demo shows:
0:00 The problem: assistants only use tools that already have integrations.
0:08 How it works: discover → plan → approve → execute → verify → save → replay.
0:18 Plan from a numbered menu, using menu IDs only, against the real fixture app.
0:28 Human approval in a separate terminal: single-use, hash-bound, 10-minute expiry.
0:36 Verification reads fixtures/app-a/data.json, not the UI; then save and replay.
0:47 A hostile Notes page asks the model to open an external URL; the approved
     plan is blocked with ORIGIN_NOT_ALLOWED. Observed text is data.
0:58 Measured results: 8/8 tasks passed plan → execute → verify → replay,
     0 model calls on replay, 8/8 covered red-team cases blocked.
1:07 Repository, license, credits.

Repo: https://github.com/ps-aditya/anybridge
Docs: https://github.com/ps-aditya/anybridge/tree/main/docs
License: MIT

Honest limits:
- Direct Meta Model API E0 was not run (no MODEL_API_KEY); E0 used the same
  model via the OpenCode Go fallback.
- Planning token counts and cost were not exposed by that route and are not shown.
- The demo uses real fixture screenshots and captured CLI output, but no
  continuous browser video was recorded.

Voice: Kokoro-82M (local, synthetic; Spanish male voice `em_santa`).
Narration drafted with Muse Spark 1.3.
```

### Tags

```text
MCP, Model Context Protocol, AI agents, Meta AI, Muse Spark, automation,
verification, replay, developer tools, TypeScript
```

## Submission form draft

### Project name

```text
AnyBridge
```

### Track

```text
Indie developer
```

### One-line tagline

```text
Compile once, replay forever: turn software with no API into permissioned,
verified, replayable workflows.
```

### Short description (≤ 300 chars)

```text
AnyBridge is a local-first MCP server that lets an AI assistant operate software
with no integration. The model picks IDs from a numbered menu; a human approves
out of band; an engine executes, verifies from file evidence, and saves a
hash-pinned workflow that replays with zero model calls.
```

### Full description

```text
Problem
Most valuable internal tools have no API and no MCP integration. Assistants can
describe what to do but cannot safely do it, and when they can, you cannot prove
what happened or reuse the result.

What AnyBridge does
AnyBridge exposes an unfamiliar interface as a numbered menu (a1, a2, ...).
The model plans with those IDs only; it never writes selectors, shell strings,
URLs, or code. A human runs `anybridge approve <plan_id>` in a separate terminal;
approvals are single-use, hash-bound, and expire in 10 minutes. The engine
re-checks policy on the resolved step, executes with argv arrays or Playwright,
and verifies the outcome from independent evidence (a file read, DOM text, exit
code, or JSON task state). A verified plan is saved hash-pinned and can be
replayed with zero model calls and no API key.

Why it is different
Browser-control servers expose actions. AnyBridge adds the trust layer:
capability is not permission, observed text is untrusted data, success is
engine-computed, and replay is deterministic.

Meta AI usage
Development and all reported numbers use Muse Spark 1.3 Contributor
(muse-spark-1.3-contributor). The canonical route is Meta Model API; with no
MODEL_API_KEY in this environment, the same model was used through the OpenCode
Go gateway and is clearly labelled. The server is model-agnostic: it makes zero
model calls, so Claude, Codex, Gemini, OpenCode, or any MCP client can drive it.

Technical depth
- 7 MCP tools over stdio, Zod-validated, structured errors.
- CLI discovery from help output; browser discovery from ARIA snapshots.
- Out-of-band approval with single-use, hash-bound, expiring tokens.
- Origin allowlist enforced on every browser request, link click, and redirect.
- Path jail with realpath checks; Node eval-flag denial.
- Hash-pinned, versioned workflow store; replay fails on drift.
- Independent verification kinds: file_contains, json_task_done, file_exists,
  file_hash_changed, dom_text_equals, dom_row_exists, exit_code.

Evidence
- 8/8 measured tasks passed plan → execute → verify → replay.
- Replay model calls: 0.
- Engine time: 6.03 s compile vs 3.95 s replay across 8 tasks.
- 8/8 covered red-team cases blocked; 46/46 tests pass.

Links
Repo: https://github.com/ps-aditya/anybridge
Video: [paste YouTube URL]
Docs: https://github.com/ps-aditya/anybridge/tree/main/docs

Limits
- Direct Meta Model API E0 not measured; fallback route is labelled.
- Planning tokens/cost not captured.
- Desktop automation, remote hosting, and a marketplace are out of v0.
```

### Built with

```text
TypeScript, Node.js, Model Context Protocol SDK, Playwright, Zod, Vitest,
Remotion, Kokoro-82M, ffmpeg, Muse Spark 1.3 Contributor
```

### What to try first (judge instructions)

```bash
git clone https://github.com/ps-aditya/anybridge.git
cd anybridge
npm install
npx playwright install chromium
npm run build
npm test
npm run doctor
# separate terminal:
npm run fixture:reset
# then register `node dist/index.js` as an MCP server and ask:
# "Inspect http://127.0.0.1:4010 and propose a plan to add a task titled Ship demo."
```

## Before you submit

- [ ] Upload the video and paste the real YouTube URL into the form and README.
- [ ] Check the form's video rule (public vs unlisted; max length).
- [ ] Confirm the Indie track selection.
- [ ] Confirm the repo is public while judging (Nov 4–8).
- [ ] Keep `main` stable during judging; develop on a branch.
- [ ] Do not claim a direct Meta Model API run that did not happen.
