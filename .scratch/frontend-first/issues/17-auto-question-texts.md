# 17: Auto-question texts per CV language

**Package:** shared, docs

**Blocked by:** 02

**Status:** ready-for-agent

**Spec:** [../spec.md](../spec.md)

**What to build:** When a draft is missing something the CV should have, the user gets a question
about it in the CV's language. Every entry of the CV language list carries the texts of these
automatic questions, so the backend and mock mode word them the same way. Gap left by ticket 02;
decided in the server-side grilling (`.scratch/backend/decisions.md`, Q7).

- [ ] Each CV language has a question text and a short label for every kind of missing part the
      "what is missing" rule reports: full name, email or phone, summary, skills, experience
      (skippable as "no experience"), and the required fields of an existing item (experience
      title / company / period, education institution); an item-level text can name the item
- [ ] One pure function turns a missing part and a CV language into the question's text and label
- [ ] Unit tests: every language has every text (no gaps, no empty strings); the function gives the
      expected English and Ukrainian wording for a block-level and an item-level part
- [ ] `docs/architecture.md` §6.5 / §6.7 and their `docs/uk/` copies name where the texts live
- [ ] Root `typecheck`, `lint`, `build` and `test` pass
