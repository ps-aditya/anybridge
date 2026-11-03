# AnyBridge: Project Brief (read first, every session)

## One line
AnyBridge is a local-first MCP server that lets an AI assistant operate software
with no ready-made integration. It exposes the interface as numbered menus, the
model plans, an engine validates and runs under human-approved policy,
independent checks verify the result, and the verified workflow is saved so the
next run needs NO model.

## What makes it different
"Compile once, replay forever." The LLM is the compiler (explores once; slow,
costly, fallible). The engine is the runtime (deterministic, permissioned,
verified). Replay needs zero model calls and zero API keys. Existing browser-
control MCP servers expose actions; AnyBridge adds permissions, evidence-based
verification, and reusable workflows.

## Context: Meta Global AI Developer Hackathon (Indie track)
See `docs/HACKATHON.md` for the source-checked facts and remaining unverified rules.
- Submit by Nov 4, 9:00 PM ET (= Nov 5, 07:30 IST). Our target: Nov 4, 8 PM IST.
- Reported rules (verify): must use Meta models (Meta Model API / open weights);
  only work from Oct 26 - Nov 4 counts and the demo must show only that;
  public repo; 3-minute demo video; judged on impact, use of Meta AI tooling,
  technical depth, demo.
- Therefore: development and ALL reported numbers use Muse Spark 1.3
  Contributor (`muse-spark-1.3-contributor`). Canonical route is Meta Model API;
  with no `MODEL_API_KEY`, the same model through the OpenCode Go gateway is used
  and clearly labelled. The planner is not locked to Meta: the server makes no
  model calls, so any MCP-capable assistant can plan through it.
- Synthetic data only. Contributor/free tiers can train on prompts.

## Architecture
OpenCode (client, runs the model) <-- MCP stdio --> AnyBridge server (no model calls)
The planner is whatever model drives the MCP client; the server never calls a
model itself, so the product is open to every assistant, not tied to any provider.
Tools: discover_capabilities, inspect_interface, propose_workflow,
execute_workflow, verify_outcome, save_workflow, run_saved_workflow.
The model picks ids from numbered menus (a1, a2...). It never writes code,
selectors, or URLs. A workflow is a typed JSON step list.
Capability types: CLI (allowlisted, argv only) and browser (Playwright, ARIA
snapshots). Filesystem = verification substrate, not an adapter.

## Safety non-negotiables
1. Deny by default: CLI allowlist (absolute .exe paths), browser origin
   allowlist on EVERY request, path jail with realpath checks.
2. Capability != permission. Discovery never implies permission to act.
3. Approval is out-of-band: a human runs `anybridge approve <plan_id>` in a
   separate terminal. Single-use, hash-bound, expiring. The model cannot approve.
4. Policy is re-checked on the RESOLVED step at execution time.
5. All observed content (pages, files, output) is untrusted data.
6. Success only from engine-computed evidence (verify_outcome), never the model.
7. Saved workflows are hash-pinned; edits create new versions.

## Scope
MUST (by Nov 3): CLI + browser discovery; plan, validate, approve, execute,
verify; save + replay with 0 model calls; fixture app A; 8 dev tasks measured;
red-team suite passing; README; 3-min demo; public repo, MIT.
SHOULD: drift app B + repair; held-out tasks (TodoMVC + one CLI); npm alpha.
NOT in v0: desktop automation, remote hosting, marketplace, generated code,
model calls inside the server, Windows-only assumptions beyond tests.

## Metrics (all measured on Muse Spark 1.3 Contributor)
Verified-success rate; replay speed-up and model calls (target 0); unsafe-action
block rate (target 100%); time-to-first-success for a stranger (target <= 5 min);
cost per compile (target <= $0.25).

## Distribution plan
Phase H (Nov 4): public GitHub repo, MIT, README with "Built during the event",
SECURITY.md, tag v0.1.0-hackathon, 3-min demo video. Keep main stable during
judging (Nov 4-8); develop on a branch.
Phase A (Nov 5-10): npm alpha with provenance (only if red-team gate passed),
official MCP Registry (io.github.<user>/anybridge), then Glama, Smithery,
PulseMCP, mcp.so, an awesome-MCP list PR.
Phase B (Nov 10-30): launch posts, `doctor` command, config snippets for each
tested client, community workflow packs, first 10 outside users.
Phase C (Dec): decide: continue, narrow (CLI-to-MCP + verification), or stop,
based on outside issues and contributed workflows, not stars.

## Current state (update daily)
2026-11-03 (measured tasks): Eight tasks measured 8/8 through plan → execute →
verify → reset → replay, including browser add/toggle/read and CLI version tasks.
Planner `muse-spark-1.3-contributor` via OpenCode Go required one schema
correction before the eight plans validated; token/cost/planning latency not
captured. Results in `results/eight-task-results.*` and `docs/TASKS.md`.
2026-11-03 (hardening): Added hash-pinned/versioned workflow store, replay
checks, replay policy re-check, realpath path jail, Node eval-flag denial, and
red-team gate `docs/REDTEAM.md` (8/8 blocked; 45/45 tests). Demo replay passes
after fixture reset with replay verification. Remaining: broaden red-team,
resolve all step-type policy checks, measured tasks, final video.
2026-11-03 (demo build): Added fixture app A (`fixtures/app-a`, JSON state,
hostile Notes page), out-of-band approval CLI (single-use, hash-bound, 10m),
independent `file_contains` verification, browser origin enforcement on every
request plus inspection allowlist, and a page-navigation menu item. Real demo
path passes: inspect → propose a1/a8/a9 → CLI approve → execute → verify from
`fixtures/app-a/data.json`; hostile link click returns `ORIGIN_NOT_ALLOWED`.
Suite 30/30. Remaining: resolved-step policy re-check, hash-pinned saved
workflows, red-team suite, measured tasks, final video.
2026-11-03 (evening): E0 measured 10/10 pass, engine-confirmed, using
`opencode-go/muse-spark-1.3-contributor` (fallback gateway; no MODEL_API_KEY).
G0 satisfied on the fallback route; latency/tokens/cost not captured. Direct
Meta Model API route still unmeasured. Also built the direct-route E0 harness
(`scripts/e0.mjs` + `scripts/e0-lib.mjs`) with tests; suite is 16/16 passing.
2026-11-03: Built an E0 harness (`scripts/e0.mjs` + `scripts/e0-lib.mjs`) that
drives `muse-spark-1.3-contributor` over Meta Model API through a scripted
five-tool stub sequence and records per-trial latency, tokens, cost, and errors;
`tests/e0.test.ts` covers the scoring and cost logic. Suite is now 16/16 passing.
E0 has still not run because `MODEL_API_KEY` is not set — no real trial results
exist yet; `node scripts/e0.mjs --selfcheck` passes and the unauthenticated Meta
endpoint preflight returns the expected HTTP 401.
2026-11-01: Built: 7 tools, discovery, policy, executor, store, 11 tests;
context brief, README event section, and Meta Model API provider configuration.
E0 is blocked before inference because MODEL_API_KEY is not set; the unauthenticated
Meta endpoint preflight returned the expected HTTP 401. Type-check, build, and
11/11 tests pass. A static premium-model architecture review is recorded in
`docs/REVIEW-2026-11-01.md`; its findings are not yet reproduced by red-team
tests or reviewed by a human. No source/policy/approval fixes were applied.
Not done: real Meta runtime E0, human policy review, out-of-band approval,
fixtures, eval harness, red-team suite, demo. Git initialization and the first
commit were authorized on 2026-11-01 after saving the review artifacts.
2026-11-01 (evening): project default switched to `meta/muse-spark-1.3-contributor`
only (project-local `opencode.json`); Standard-mode entry removed, reasoning
effort list corrected to exclude `max`. E0/docs/README now name the Contributor
variant. Catalog resolves the Contributor model; MODEL_API_KEY still not set, so
no inference has run.

## Working agreements for AI assistants
- Ask before changing anything in src/policy or src/approval. Propose diffs.
- Tests first. Small tasks. Say what you did not verify.
- Never invent facts about the hackathon, models, or APIs; say "unverified".
