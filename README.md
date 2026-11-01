# AnyBridge

Operate software that has no ready-made integration: discover, plan, approve,
execute, verify, save, replay. MCP server over stdio.

## Built during the event

AnyBridge is being built during the Meta Global AI Developer Hackathon.
For the event, the demo planner and all reported evaluation results will use
Muse Spark 1.3 through Meta Model API; other coding models are used only as
development assistants.

## Setup

```bash
npm install
npx playwright install chromium
npm run build
npm test
```

## Run (MCP)

```bash
node dist/index.js
```

Add to `opencode.json`:

```json
{
  "mcp": {
    "anybridge": { "type": "local", "command": ["node", "./dist/index.js"], "enabled": true }
  }
}
```

## Tools

- discover_capabilities
- inspect_interface
- propose_workflow
- execute_workflow (permission: ask)
- verify_outcome
- save_workflow (permission: ask)
- run_saved_workflow

## Safety

Deny-by-default policy: command allowlist, path jail, origin allowlist,
output/time limits. Destructive steps blocked unless policy allows.
Secrets referenced only as `{{secret:NAME}}`.
