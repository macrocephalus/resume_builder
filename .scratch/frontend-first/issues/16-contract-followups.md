# 16: Contract follow-ups from the frontend tickets

**Package:** docs, shared

**Blocked by:** None (can start immediately)

**Status:** done

**Spec:** [../spec.md](../spec.md)

**What to build:** The frontend tickets 07–13 settled four points the contract did not say, or
said differently. The contract docs and the domain glossary now say what was agreed, so the
backend builds the same thing.

- [x] `docs/cv-statuses.md`: a `ready` CV keeps its questions panel while it has questions (none open, the closed ones with their answers); only a CV that never had questions has none — confirmed by the user during frontend ticket 09
- [x] `docs/architecture.md` §10: the PDF layout of every block (projects, education, certifications and languages were missing), as the preview already draws it
- [x] `docs/api.md`: `resetsAt` of `GET /api/usage` is the end of a sliding hour: one more becomes available then; `Retry-After` points at the same moment
- [x] `shared/GLOSSARY.md`: "Suggested role" and "Parent CV"
- [x] `docs/uk/` copies of the three docs changed with them
