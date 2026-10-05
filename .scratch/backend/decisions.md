# Server side: decisions log

Grilling "server side: generation, questions, PDF, auth" (root session, 2026-10-05). One entry per
answered question; open questions stay out of this file until the user answers them.

## Process

- **Q1** The backend owns its design like the frontend does. Its internals move from the root
  `docs/architecture.md` into `backend/docs/architecture.md` (tree, tables, DraftAgent,
  verification, failure handling, auth internals, PDF rendering, test priorities); the "why"
  paragraphs become ADRs in `backend/docs/adr/` (queue, one status, tool loop, evidence quotes,
  pdfkit, JWT cookie) and `docs/adr/0001` (polling, spans both apps); backend terms start
  `backend/GLOSSARY.md` (Generation job, Attempt, Evidence). Work flow: the root spec says what
  the user gets and what changes in the contract; a session in `backend/` grills the internals,
  writes `backend/.scratch/<feature>/spec.md` (`Sources:`) and tickets (`Implements:`); the root
  tickets become `moved`.
- Questions about backend internals (JWT secret, fake model at runtime, e2e infrastructure) go to
  that backend grilling, not to the root.
