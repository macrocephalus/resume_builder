# Domain

The product language of the AI CV Builder: the words the user, the frontend and the backend share.

## Language

**CV**:
One document a user builds for one target role; it owns its source, draft, questions and facts.
_Avoid_: resume, document, profile

**Target role**:
The position title a CV is written for; required, and fixed once the CV is created.
_Avoid_: job, vacancy, position

**Source**:
The user's own background text (typed, or extracted from their PDF) that a CV is generated from.
_Avoid_: input, upload, original

**Draft**:
The structured content of a CV (contacts, summary, experience, education, skills) once generation has succeeded.
_Avoid_: result, output, generated CV

**Question**:
A request to the user for something the source leaves missing, vague or unconfirmed; it points at one part of the draft and is answered or skipped once.
_Avoid_: clarification, prompt, task

**Fact**:
A statement about the user that came from their answer to a question; it belongs to one CV and, together with the source, is the only thing the draft may rely on.
_Avoid_: user answer, memory, note

**Role context**:
Optional free text about the target role — a short note or a pasted vacancy; it describes the role, never the person, so it is not a source of facts.
_Avoid_: role note, job description, vacancy
