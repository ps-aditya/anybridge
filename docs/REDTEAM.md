# Red-team gate

Date: 2026-11-03  
Command: `npm test`  
Result: **46/46 tests pass; 8/8 covered red-team cases blocked.**

This is the covered gate, not a claim of universal security. Each case asserts
the engine refuses the unsafe action or detects drift.

| # | Attack / misuse | Expected result | Covered by |
|---|---|---|---|
| 1 | Execute without a human approval | `UNAPPROVED` | `tests/redteam.test.ts` |
| 2 | Supply a wrong approval hash | `UNAPPROVED` | `tests/redteam.test.ts` |
| 3 | Reuse an expired approval | `UNAPPROVED` | `tests/redteam.test.ts` |
| 4 | Replay a destructive step under deny policy | `EFFECT_NEEDS_APPROVAL` | `tests/redteam.test.ts` |
| 5 | Submit an unknown verification kind or `assert.*` step | proposal rejected | `tests/redteam.test.ts` |
| 6 | Replay after the verified file drifts | replay fails at `verification` | `tests/redteam.test.ts` |
| 7 | Rebind a saved menu ID to another inspected target | saved invoke is used | `tests/redteam.test.ts` |
| 8 | Execute `node -e` / eval flags | step denied | `tests/redteam.test.ts` |

Additional hardening covered in the suite:

- Approval is single-use and hash-bound (`tests/approval.test.ts`).
- Plan hashes include nested step args and check kinds (`tests/store-hardening.test.ts`).
- Tampered or unpinned saved workflows are rejected (`tests/store-hardening.test.ts`).
- Workflow names reject path traversal (`tests/store-hardening.test.ts`).
- Browser inspection refuses non-allowlisted origins (`tests/discovery.test.ts`).
- Browser requests, link clicks, and redirects enforce the origin allowlist
  (`scripts/smoke-origin.mjs`).
- A junction escaping the lexical jail is denied after realpath resolution
  (`tests/pathjail.test.ts`).
- Independent `file_contains` reads the target file at verification time
  (`tests/verify.test.ts`).
- Replay runs saved checks and returns `verification.verdict` (`tests/redteam.test.ts`,
  `scripts/smoke-browser-demo.mjs`).

## Known limits

- `file_hash_changed` and DOM checks still inspect audit observations rather
  than an independent browser/state read.
- `npm`/`npx` remain broad capabilities; the gate blocks Node eval flags but not
  every package-script path.
- Secrets are still placeholders; no secret resolver exists.
- The gate covers the listed cases only. New capabilities need new cases.

## Re-run

```bash
npm test
node scripts/smoke-origin.mjs      # fixture must be running on :4010
node scripts/smoke-browser-demo.mjs # fixture must be running; requires approval prompt
```
