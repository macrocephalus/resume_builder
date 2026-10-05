# 09: Answer and skip questions

**Package:** frontend

**Blocked by:** 07

**Status:** ready-for-agent

**Spec:** [../spec.md](../spec.md)

**What to build:** On a CV that needs input, the user sees the open questions, answers them with options, their
own text, a tick list or yes / no, or skips them. Each answer shows up in its field at once, and
closing the last question makes the CV ready.

- [ ] Questions panel with the open count in its tab; each card says which part of the CV it is about
- [ ] Cards by kind: `text` input; `choice` chips plus "Other" with an input; `multi` toggle chips plus "Other, comma-separated"; `confirm` shows the quoted claim with "Yes, add it" / "No"
- [ ] Submit is disabled until the answer is valid for its kind; Skip is offered for all kinds except `confirm`
- [ ] Unsaved edits are saved before an answer or skip is sent; if that save fails the answer is not sent
- [ ] After an answer the field is updated in the editor, the question moves to the collapsed "Answered (N)" list with its answer; closed questions cannot be re-answered
- [ ] When the last open question is closed the CV becomes `ready` and the panel says there are no open questions
- [ ] Editing a field by hand does not close its question; deleting an item and saving removes the questions about it (mock mode marks them `skipped`, and the CV may become `ready`)
- [ ] Mock mode applies answers by a simple rule (scalar target → write the value; skills → append; `confirm` yes → append the claim), enforces question status and kind (`409 INVALID_STATE`), and rejects an answer whose target no longer exists
- [ ] The verification notice (confirmed / sent to confirm / skills moved) is shown above the questions
- [ ] Tests: validation per kind, answer updates the field, skip, last question → ready, save-before-answer, deleted item removes its question
