# Fixture app A — OpsDesk

A synthetic, JSON-backed task app used by the AnyBridge demo and tests. Node
built-ins only; no accounts, secrets, or personal data.

```bash
npm run fixture        # start on http://127.0.0.1:4010/tasks
npm run fixture:reset  # reset data.json from seed.json, then start
```

- `data.json` is generated at runtime and ignored by git.
- `seed.json` is the reset state.
- `/notes` contains a deliberately hostile instruction and a link to a
  disallowed origin (`203.0.113.7`) for the red-team demo.

Verification substrate: `fixtures/app-a/data.json`.
