# 01: Replies in one batch, inserted as written

**Package:** shared, backend, frontend

**Blocked by:** None (can start immediately)

**Status:** done

**Spec:** [../spec.md](../spec.md) · contract: `docs/api.md` "Questions" (`POST /api/cvs/:id/replies`)

**What to build:** The user answers and skips several questions in the Questions panel without
waiting after each one, then clicks "Apply N replies" and gets the CV back with all of them
applied by one request. Answers still go in as written (no wording yet), so this ticket changes
how replies travel, not what they become. The per-question answer and skip endpoints are gone.

**Shared**
- [ ] A replies body both apps validate the same way: 1–12 replies, each `{ questionId, answer }`
      with `answer: null` for a skip, every `questionId` once; its limit sits next to the answer
      limits; unit tests for a skip, a mix of kinds, an empty list, 13 replies, a duplicate id

**Server**
- [ ] `POST /api/cvs/:id/replies` as in the contract: every reply checked before anything is
      written (question of this CV, `open`, answer of its kind, skip only for `text` / `choice` /
      `multi`, target still exists); one failure → `400` / `404` / `409` and nothing applied
- [ ] One transaction: each answer applied with the shared `applyAnswer`, its raw answer appended
      to `facts`, questions `answered` / `skipped`, one `version + 1`, `ready` when no open
      question is left
- [ ] `…/answer` and `…/skip` removed; their e2e cases move to the new endpoint
- [ ] e2e: answers and skips together → `ready`; one stale question → `409`, nothing written; an
      invalid reply → `400` with `details.fields` keyed `replies.<index>…`; another user's CV → `404`

**UI**
- [ ] Answer / Skip / "Yes, add it" / "No" on a card only mark it as replied; nothing is sent. A
      replied card folds to one line (target, short form of the reply) with **Change**, which
      reopens it with its draft
- [ ] A bar sticky at the bottom of the panel, shown when at least one card is replied:
      "Apply N replies" and Clear (cards back to open, drafts kept); touch targets ≥ 40 px, safe
      area on phones
- [ ] Apply saves unsaved editor edits first (a failed or conflicting save sends nothing and says
      why), then sends one request with the replies in list order
- [ ] While it runs: "Updating your CV…" announced politely; cards, bar and the editor's Save
      disabled; no client timeout under 30 s. On success the returned CV replaces the cached one,
      the applied replies are cleared, "N replies applied" shows briefly
- [ ] Errors keep the replies: a `409` / `404` refetches the CV and drops only the replies whose
      question is no longer open, with "Some questions changed — check and apply again"; a `400`
      reopens the cards it names with their message; network / `429` / `500` show the error on
      the bar
- [ ] The mock API serves the new endpoint with the shared `applyAnswer` and the server's checks;
      the old two handlers go
- [ ] UI tests: reply to two and skip one → one request, CV updated, `ready`; Answer sends
      nothing and Change reopens; unsaved edits saved first; `409` keeps the other replies; `400`
      marks one card; keyboard-only path

- [ ] `frontend/docs/architecture.md` and `backend/docs/architecture.md` describe the batch
- [ ] shared, backend and frontend: typecheck, lint, tests (and backend e2e), build pass

## Comments

- 2026-10-07: **Shared** is done in `shared/src/question.ts` (`REPLY_LIMITS`, `replySchema`,
  `repliesBodySchema`, types `Reply` / `RepliesBody`; 5 tests; typecheck, lint, tests, build
  pass; `shared/dist` rebuilt), uncommitted in the root working tree. **Server** is committed on
  `backend` branch `feat/reply-batches` (`5e705e5`, not pushed, root pointer not bumped; backend
  checks and 151 e2e pass against the uncommitted shared change). **UI** and the mock are specced
  in `frontend/.scratch/answer-wording/spec.md` and split into its tickets
  `01-reply-model-and-mutation`, `02-mock-replies-endpoint`, `03-cards-and-apply-bar`,
  `05-docs-and-screens` (each with `Implements:` pointing here); most of that code is drafted on
  the frontend branch `feat/apply-replies` (uncommitted). This ticket stays open for the backend
  part and the final checks.
