# 06: Upload a PDF as the background

**Package:** frontend

**Blocked by:** 05

**Status:** ready-for-agent

**Spec:** [../spec.md](../spec.md)

**What to build:** On the New CV form a user uploads a PDF and sees the extracted text in the background text
area, where they can check and fix it before generating. Bad files produce clear messages.

- [ ] "Upload PDF" sends the file to the ingest endpoint; the returned text fills the text area with a note such as "Extracted 3 120 chars from 2 pages, check below"; the CV is created with source type `pdf` and the filename
- [ ] Readable messages for: not a PDF (`415`), too large or too many pages (`413`), scan without text (`422`, with the advice to paste the text), rate limit
- [ ] Mock mode returns fixture text for any file but really checks the PDF magic bytes and the 5 MB limit; a filename containing `scan` → `422`
- [ ] Uploading replaces existing text only after the user confirms when the text area is not empty
- [ ] Tests: successful upload fills the text area; wrong type, too large, scan
