# 10: Download the PDF

**Package:** frontend

**Blocked by:** 07

**Status:** moved

**Moved to:** `frontend/.scratch/spa/issues/10-pdf-download.md`

**Spec:** [../spec.md](../spec.md)

**What to build:** The user downloads the CV as a PDF from the CV page. Unsaved edits are saved first, and the
user is told what is missing instead of being blocked.

- [ ] Download button in the CV header, available only when the CV has a draft
- [ ] With unsaved edits the button reads "Save & download" and saves first; a failed save (validation, version conflict) stops the download and shows the error
- [ ] The file is fetched as a blob and handed to the browser with the filename from the response header (fallback `cv.pdf`); works in mobile Safari and Chrome
- [ ] While the file is prepared the button shows a pending state; errors are shown next to the button with a way to retry
- [ ] Open questions or missing required blocks do not block the download; a note lists what will be empty
- [ ] Mock mode returns a static A4 PDF fixture and `409 INVALID_STATE` for a CV without a draft
- [ ] Tests: dirty form saves before downloading; failed save stops the download; note about missing blocks
