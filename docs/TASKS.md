# Eight measured tasks

Model: `opencode-go/muse-spark-1.3-contributor` (Muse Spark 1.3 Contributor,
OpenCode Go fallback; no `MODEL_API_KEY`). All tasks use fixture app A at
`http://127.0.0.1:4010` unless marked CLI.

Reset before every browser task:

```bash
curl -X POST http://127.0.0.1:4010/reset
```

For each task: planner proposes → human/automation approves via
`anybridge approve <plan_id>` → execute → verify → save → reset → replay.
A task passes only if `verify_outcome` (or replay `verification`) is `pass`.

| # | Task | Target | Verification |
|---|---|---|---|
| 1 | Add task “Ship demo” | browser | `file_contains` `fixtures/app-a/data.json` = “Ship demo” |
| 2 | Add task “Measure replay” | browser | `file_contains` = “Measure replay” |
| 3 | Mark “Review fixture spec” done | browser | `json_task_done` title + done=true |
| 4 | Unmark “Connect MCP client” | browser | `json_task_done` title + done=false |
| 5 | Open Notes and read “Release checklist” | browser | `dom_text_equals` after `browser.read_text` |
| 6 | Report Node version | CLI `node` | `exit_code` |
| 7 | Report Git version | CLI `git` | `exit_code` |
| 8 | Mark “Record rough demo” done | browser | `json_task_done` title + done=true |

## Metrics to record

For each task record: planner pass, execution status, verification verdict,
replay status, replay verification verdict, and exact error text. Latency,
tokens, and cost are **not captured** through the OpenCode Go subagent route;
do not invent them.

## Status — complete

Date: 2026-11-03. **8/8 tasks passed plan → execute → verify → replay.**

| # | Task | Plan | Execute | Verify | Replay | Replay verify | Execute ms | Replay ms |
|---|---|---|---|---|---|---|---|---:|---:|
| 1 | Add “Ship demo” | pass | passed | pass | passed | pass | 1000 | 618 |
| 2 | Add “Measure replay” | pass | passed | pass | passed | pass | 999 | 565 |
| 3 | Mark “Review fixture spec” done | pass | passed | pass | passed | pass | 907 | 612 |
| 4 | Unmark “Connect MCP client” | pass | passed | pass | passed | pass | 962 | 612 |
| 5 | Read Notes page | pass | passed | pass | passed | pass | 947 | 762 |
| 6 | Node version | pass | passed | pass | passed | pass | 67 | 60 |
| 7 | Git version | pass | passed | pass | passed | pass | 89 | 74 |
| 8 | Mark “Record rough demo” done | pass | passed | pass | passed | pass | 1060 | 645 |

Raw data: `results/eight-task-results.json`; table:
`results/eight-task-results.md`.

### Honest notes

- Planner: `opencode-go/muse-spark-1.3-contributor` (Meta model via OpenCode
  Go fallback). The first plan response used `check`/`args` and `text` instead
  of `kind`/`params` and `value`; one schema correction was sent, then all
  eight plans validated. This is **2 planning attempts**, not a first-try pass.
- The engine ran locally; MCP transport was measured separately in E0 (10/10).
- Token counts, model cost, and planning latency were not exposed by the
  subagent route and are not reported.
- Execute/replay milliseconds above are engine-only, not model compile time.
- Automated approval was used for this measurement harness; the approval file
  is still external to the model. The human CLI path is tested separately.

### Re-run

```bash
npm run fixture:reset   # separate terminal
node scripts/measure-eight-tasks.mjs
```

