# Security Policy

## Supported versions

AnyBridge is a hackathon-stage prototype. Only the latest commit on `main` is
supported with security updates. During judging (Nov 4–8) `main` stays stable;
fixes land on a branch first.

| Version | Supported |
| --- | --- |
| latest `main` | Yes |
| older commits / tags | No |

## Report a vulnerability

Do **not** open a public issue for a vulnerability. Use GitHub's
**private vulnerability reporting** on this repository
(Security tab → Report a vulnerability), or contact the maintainer via the
email on their GitHub profile.

Include:

- What you ran (commit hash, OS, Node version).
- The smallest workflow or tool sequence that reproduces the issue.
- What you expected the policy engine to do, and what it did instead.

We will acknowledge within 72 hours and aim to fix or document accepted risks
before the next tag.

## Scope and expectations

AnyBridge is a local-first, deny-by-default execution engine:

- CLI tools run only from an explicit allowlist; browser requests only to
  allowlisted origins; filesystem access only inside a path jail.
- Human approval is required before execution; the model cannot approve.
- Success is determined only by engine-computed verification evidence.

Known prototype limitations are tracked in `docs/REVIEW-2026-11-01.md`.
Treat every finding there as unpatched until a fix is committed and tested.

## Ground rules for testing

- Use synthetic fixtures only (`fixtures/`). No real accounts, secrets, or
  personal data.
- Never commit API keys or credentials. The server reads `MODEL_API_KEY`
  from the environment; `git` history must never contain it.
- Do not probe third-party systems through the browser allowlist; test
  against local fixtures.
