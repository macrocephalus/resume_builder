# 03: Frontend foundation: mock mode, API client, sign up / log in

**Package:** frontend

**Blocked by:** 02

**Status:** ready-for-agent

**Spec:** [../spec.md](../spec.md)

**What to build:** A visitor can sign up, log in, stay signed in across reloads and log out — in mock mode, with
no backend. This ticket also lays the ground every later screen stands on: routing, server-state
provider, the API client, design tokens and UI primitives, and the test setup at the network seam.

- [ ] A dedicated dev command starts the app in mock mode; the plain dev command and the production build contain no mock code path that can switch on by itself
- [ ] Mock mode answers `/api` requests with network-level handlers; users and the session persist in browser storage across reloads
- [ ] API client: same-origin credentials, every response parsed with the `shared` schema, a typed error with status, code, message, details; a `401` clears the current user and leads to the login screen
- [ ] Sign-up and login screens with field-level validation from the `shared` schemas; `EMAIL_TAKEN` and `INVALID_CREDENTIALS` are shown as readable messages
- [ ] Protected layout loads the current user first; an anonymous visitor is redirected to login with a return address and lands on the original link after logging in; a signed-in user opening login / sign-up is sent to the list
- [ ] Log out works; a not-found screen exists; an error boundary shows a retry instead of a blank page
- [ ] Without mock mode and without a backend the app shows a clear "cannot reach the server" state with Retry, never fake data
- [ ] Design tokens and the first UI primitives (button, input, field, notice, status pill) exist and are mobile-first
- [ ] Tests run through the real router, providers and API client against the mock handlers: sign up, login failure, redirect with return address, `401` handling
- [ ] `pnpm typecheck && pnpm lint && pnpm build` and the tests pass

**Notes:** Visual decisions: follow `frontend/docs/design.md` if it exists by the time this ticket starts, otherwise `docs/architecture.md` §11 and the prototype.
