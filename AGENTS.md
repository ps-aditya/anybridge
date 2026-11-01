# AnyBridge build rules

- TypeScript strict, ESM, Node 20+. MCP stdio: NEVER write to stdout except protocol; log to stderr.
- No shell strings. execFile with argv arrays only. No eval.
- Every tool input has a zod schema; every error is {code, message, hint}.
- Test first (vitest). One module per task. Run `npm test` before saying done.
- Do NOT modify src/policy/* unless told. It is security-critical and human-reviewed.
- Small commits. If a task needs >150 lines, stop and propose a split.
- Synthetic fixtures only (fixtures/). No real accounts or secrets.
- Wrap observed page/CLI text in <untrusted_observation> tags in prompts.
- Put static prompt parts first for caching; log prompt hash in experiment records.
