<div align="center">

<img src="assets/anybridge-logo.png" alt="AnyBridge — one MCP for software with no integration" width="900" />

# anybridge MCP

### One MCP server for software that has no ready-made integration.

**See an interface. Turn it into a permissioned workflow. Verify the result. Replay it with no model calls.**

[![license](https://img.shields.io/badge/license-MIT-f4c430?style=flat-square)](LICENSE)
[![MCP tools](https://img.shields.io/badge/MCP-7_tools-2563eb?style=flat-square)](src/server.ts)
[![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A520-339933?style=flat-square&logo=nodedotjs&logoColor=white)](package.json)
[![status](https://img.shields.io/badge/status-alpha-d97706?style=flat-square)](#project-status)
[![built during Meta hackathon](https://img.shields.io/badge/built_during-Meta_AI_Hackathon-0866ff?style=flat-square)](#built-during-the-event)

[Quick start](#quick-start) · [How it works](#how-it-works) · [Tool catalog](#tool-catalog) · [Safety model](#safety-model) · [Project status](#project-status) · [Documentation](#documentation)

</div>

> [!IMPORTANT]
> AnyBridge is an alpha prototype built during the Meta Global AI Developer
> Hackathon. It is not production software yet. Known security and correctness
> gaps are listed in [Project status](#project-status) and tracked in
> [`docs/REVIEW-2026-11-01.md`](docs/REVIEW-2026-11-01.md).

AnyBridge connects an MCP-capable assistant to software you already have:
a CLI tool, a local web app, or files on disk. Instead of asking the model to
invent shell commands, selectors, or code, it exposes the interface as a
numbered menu. The model chooses IDs from that menu, proposes a typed JSON
workflow, and stops. A local engine performs the checks and runs the steps.

The goal is **compile once, replay forever**: the model explores and compiles
the workflow once; subsequent runs execute the saved workflow deterministically,
with no model calls inside the server and no API key required for replay.

## Why AnyBridge

Browser-control MCP servers expose actions. AnyBridge adds the pieces needed to
trust an action later:

| Concern | AnyBridge approach |
| --- | --- |
| The model invents commands or selectors | Discovery returns a numbered menu; plans reference menu IDs |
| Capability is mistaken for permission | Discovery is read-only; execution is a separate, policy-gated phase |
| The model declares success | Verification is evidence-based and engine-computed |
| Every run pays for exploration | Verified plans are saved as typed workflows and replayed without the model |
| A plan changes after approval | Plans are intended to be hash-bound and versioned |
| Observed text contains instructions | Pages, files, and command output are treated as untrusted data |

## Model-agnostic by design

AnyBridge does **not** call an LLM. It is a local MCP server that any assistant
can drive: Claude, Codex, Gemini, OpenCode, or another MCP client. Bring your own
model, or bring none for replay.

For this hackathon build, development and reported evaluation results will use
**Muse Spark 1.3 Contributor** (`muse-spark-1.3-contributor`) through Meta Model
API. Contributor mode may use prompts for training, so this project uses
synthetic fixtures only. The product itself remains provider-neutral.

## Quick start

Requires Node.js 20+ and npm.

```bash
git clone https://github.com/ps-aditya/anybridge.git
cd anybridge
npm install
npx playwright install chromium
npm run build
npm test
npm run doctor
```

The server speaks MCP over stdio:

```bash
node dist/index.js
```

Register that command with your MCP client. Minimal OpenCode example:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "servers": {
      "anybridge": {
        "type": "local",
        "command": ["node", "/absolute/path/to/anybridge/dist/index.js"]
      }
    }
  }
}
```

Then ask your assistant:

```text
Use AnyBridge to discover the allowed CLI tools, inspect the `node` interface,
and propose a read-only workflow that reports its version. Do not execute it
without my explicit approval.
```

## How it works

1. **Discover.** `discover_capabilities` lists allowlisted CLI tools, browser
   origins, and saved workflows.
2. **Inspect.** `inspect_interface` turns CLI help or an ARIA page snapshot into
   a numbered menu (`a1`, `a2`, …) with inputs and an effect label.
3. **Propose.** The model picks menu IDs and submits a typed workflow with
   steps and independent checks. It never writes code, selectors, or URLs.
4. **Approve.** A human approves the exact plan out-of-band. The model cannot
   approve. *(Target design; not yet implemented in this alpha — see status.)*
5. **Execute.** The engine resolves each step, re-checks policy, and runs it
   with argv arrays and bounded output. Destructive actions are denied by
   default.
6. **Verify.** `verify_outcome` returns `pass`, `fail`, or `inconclusive` with
   evidence. Only this result counts as success.
7. **Save and replay.** A verified workflow is stored and can be run with
   `run_saved_workflow`; replay makes no model calls.

## What you can automate

| Adapter | Discovery | Execution | Intended verification |
| --- | --- | --- | --- |
| CLI | Allowlisted tool help → commands and flags | `execFile` with argv arrays, no shell, timeout and output caps | Exit codes, filesystem state |
| Browser | Playwright ARIA snapshot → role/name menu | Local Chromium: navigate, click, fill, select, wait, read text | DOM text and page state |
| Filesystem | Not an adapter; a verification substrate | Read, exists, SHA-256 hash inside a path jail | File content, existence, hashes |

The current scope is **CLI and browser**. Desktop automation, remote hosting,
generated code, and model calls inside the server are explicitly out of v0.

## Tool catalog

| Tool | Purpose | Risk |
| --- | --- | --- |
| `discover_capabilities` | List reachable CLI tools, origins, saved workflows | Read-only |
| `inspect_interface` | Open one target and return a numbered capability menu | Read-only |
| `propose_workflow` | Validate a plan and return `plan_id` + hash | No execution |
| `execute_workflow` | Run a human-approved plan | Destructive |
| `verify_outcome` | Run independent checks and return evidence | Read-only |
| `save_workflow` | Store a verified plan for replay | Low |
| `run_saved_workflow` | Replay a saved workflow with parameters | Destructive |

## Safety model

AnyBridge is **deny by default**. The design contract is:

- CLI execution uses an explicit allowlist and argv arrays; never a shell string.
- Browser requests use an origin allowlist on every request.
- Filesystem access is confined to a configured path jail with realpath checks.
- The model supplies menu IDs and arguments, not code or selectors.
- Approval is out-of-band, single-use, hash-bound, and expiring.
- Policy is checked again on the resolved step at execution time.
- Observed content is untrusted data, never instructions.
- Success comes only from engine-computed evidence.
- Saved workflows are hash-pinned; edits create new versions.

**This alpha does not yet satisfy every line above.** Treat it as a prototype,
not a security boundary. The concrete gaps, evidence, and failing-test sketches
are in [`docs/REVIEW-2026-11-01.md`](docs/REVIEW-2026-11-01.md), and
vulnerability reporting is described in [`SECURITY.md`](SECURITY.md).

## Project status

### Working today

- Seven MCP tools over stdio, with Zod input schemas and structured errors.
- CLI discovery from help output and browser discovery from ARIA snapshots.
- CLI/browser/filesystem step execution and a JSON workflow store.
- Save and replay path with no model calls inside the server.
- 11 unit tests; `npm run lint`, `npm run build`, and `npm test` pass.

### Release blockers

- [ ] Out-of-band approval CLI; the model can currently self-approve.
- [ ] Policy re-checks on resolved steps at execution and replay.
- [ ] Browser request interception for redirects, subresources, and navigation.
- [ ] Independent verification instead of reading prior audit output.
- [ ] Hash-pinned, versioned saved workflows.
- [ ] Red-team suite with a 100% unsafe-action block gate.
- [ ] Fixture app, eight measured tasks, and Contributor-model E0/eval runs.

### Not in v0

Desktop automation, a marketplace, remote hosting, generated code, and model
calls inside the server.

## Built during the event

AnyBridge is being built during the **Meta Global AI Developer Hackathon**
(Oct 26 – Nov 4, 2026). Development, E0, and all reported evaluation numbers use
Muse Spark 1.3 Contributor through Meta Model API. The demo and measurements are
being produced during the event window; no pre-event work is presented as new.

## Documentation

- [Project brief](docs/PROJECT_BRIEF.md) — product, scope, safety rules, metrics.
- [E0 protocol](docs/E0.md) — Meta runtime gate and trial record.
- [Architecture review](docs/REVIEW-2026-11-01.md) — findings and failing-test sketches.
- [Hackathon facts](docs/HACKATHON.md) — source-checked rules and open questions.
- [Security policy](SECURITY.md) — private reporting and testing rules.
- [License](LICENSE) — MIT.

## Contributing

This is a hackathon-stage project. Open an issue with the target, the task, and
the evidence you expected; use synthetic fixtures and never include real
accounts, secrets, or personal data. Security issues should follow
[`SECURITY.md`](SECURITY.md), not the public issue tracker.

## License

[MIT](LICENSE) © 2026 ps-aditya.
