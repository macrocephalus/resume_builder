# Issue tracker: Local Markdown

Issues and specs live as markdown files in a `.scratch/` folder. There is one tracker per
**owner**, and the owner is decided by what the work changes:

| Work changes… | Tracker |
|---|---|
| the contract (`docs/api.md`, `docs/cv-statuses.md`, `shared/`), the domain glossary, or more than one subproject (a user-facing feature) | `.scratch/` at the repo root |
| only the internals of `backend/` | `backend/.scratch/` |
| only the internals of `frontend/` | `frontend/.scratch/` |

If unsure, use the root tracker. A subproject ticket that turns out to need a contract change
stops and gets a root ticket that blocks it.

## Conventions

- One feature per directory: `<tracker>/<feature-slug>/`
- The spec is `<tracker>/<feature-slug>/spec.md`
- Implementation issues are one file per ticket at `<tracker>/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01`, never a single combined tickets file
- Root tickets carry a `Package:` line near the top: `shared`, `backend`, `frontend`, or several, comma-separated
- Triage state is recorded as a `Status:` line near the top of each issue file (see `triage-labels.md` for the role strings)
- Blocking edges are a `Blocked by:` line near the top; a root ticket may be blocked by a subproject ticket and vice versa, written as a path from the repo root
- A subproject ticket that implements part of a root ticket carries an `Implements:` line with the root ticket's path from the repo root; its spec names the root spec on a `Sources:` line. The subproject owns the *how*, the root ticket keeps the *what* and its acceptance from the user's view
- When subproject tickets take over a root ticket, the root ticket gets `Status: moved` and a `Moved to:` line listing their paths, so no work has two live tickets
- A finished ticket gets `Status: done` once its branch is merged into `main`
- Comments and conversation history append to the bottom of the file under a `## Comments` heading

## When a skill says "publish to the issue tracker"

Pick the tracker by the table above, then create a new file under `<tracker>/<feature-slug>/` (creating the directory if needed).

## When a skill says "fetch the relevant ticket"

Read the file at the referenced path. The user will normally pass the path or the issue number directly.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a file with one **child** file per ticket.

- **Map**: `<tracker>/<effort>/map.md` (the Notes / Decisions-so-far / Fog body).
- **Child ticket**: `<tracker>/<effort>/issues/NN-<slug>.md`, numbered from `01`, with the question in the body. A `Type:` line records the ticket type (`research`/`prototype`/`grilling`/`task`); a `Status:` line records `claimed`/`resolved`.
- **Blocking**: a `Blocked by: NN, NN` line near the top. A ticket is unblocked when every file it lists is `resolved`.
- **Frontier**: scan `<tracker>/<effort>/issues/` for files that are open, unblocked, and unclaimed; first by number wins.
- **Claim**: set `Status: claimed` and save before any work.
- **Resolve**: append the answer under an `## Answer` heading, set `Status: resolved`, then append a context pointer (gist + link) to the map's Decisions-so-far in `map.md`.
