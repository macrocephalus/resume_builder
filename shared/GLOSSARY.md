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
The structured content of a CV, made of blocks, once generation has succeeded.
_Avoid_: result, output, generated CV, document

**Block**:
One of the eight parts of a draft: contacts, summary, experience, projects, education, certifications, skills, languages. Contacts always comes first; the user orders the other seven.
_Avoid_: part, category, chapter

**Required block**:
A block a CV should not go without — contacts, summary, experience, skills; when it is empty the user is asked about it, but may still skip the question and download the CV.
_Avoid_: mandatory field, obligatory section

**Item**:
One entry of a block that holds several: a position in experience, a project, a school, a certificate, a language.
_Avoid_: entry, record, row

**Question**:
A request to the user for something the source leaves missing, vague or unconfirmed; it points at one part of the draft and is answered or skipped once.
_Avoid_: clarification, prompt, task

**Fact**:
A statement about the user that came from their answer to a question; it belongs to one CV and, together with the source, is the only thing the draft may rely on.
_Avoid_: user answer, memory, note

**Suggested role**:
Another role the draft of a CV also fits, offered to the user as "Also fits"; picking one starts a new CV for it, so the CV's own target role never changes.
_Avoid_: related role, alternative role, recommendation

**Parent CV**:
The CV a new one is started from for a suggested role; the new CV reuses its source and facts and is otherwise independent of it.
_Avoid_: original CV, base CV, template

**Role context**:
Optional free text about the target role — a short note or a pasted vacancy; it describes the role, never the person, so it is not a source of facts.
_Avoid_: role note, job description, vacancy
