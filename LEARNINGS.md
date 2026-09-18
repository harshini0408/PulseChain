# PulseChain — Learnings

The full engineering log lives in **[`docs/LEARNINGS.md`](docs/LEARNINGS.md)**.

It covers the clinical compatibility decisions and their conservative
defaults, the multilingual parser lexicon and the phrases needing native
medical sign-off, the scoring and escalation design, integration work still
ahead, and — in section 8 — the frontend re-theme: why a token system nothing
enforces is only a suggestion, why the interface had to split into a brand tier
and a console tier, and what a colour-vision validator caught that our eyes did
not.

Related reading:

- [`docs/FRONTEND_AUDIT.md`](docs/FRONTEND_AUDIT.md) — state of the frontend as
  found, what was real versus stub, and every correctness problem fixed.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — system architecture,
  including the frontend structure and its four enforced invariants.
- [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md) — the recorded run, click by
  click, with expected screen state at each step.
