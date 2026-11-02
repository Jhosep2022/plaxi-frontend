# Specification 001: English code across Plaxi

Status: in progress. Applies to the Angular frontend and NestJS backend.

## Goal

Use clear, consistent English for source code, files and directories, exported symbols, types, functions, variables, tests and technical comments. Work module by module in small reviewed changes.

## Scope

- Inventory existing Spanish names in both projects; record the baseline and update it as work proceeds.
- Translate code and file names with their imports, templates, tests, scripts, configuration and documentation references.
- Translate API request and response contracts deliberately, including error fields and machine-readable codes. Coordinate frontend consumers and backend changes in the same tracked slice.
- Preserve Spanish text intended for users unless product requirements specify otherwise. Existing persisted data and applied database migrations require explicit compatibility and migration plans.
- Review credentials, example data and Git history before publishing. Replace example contact information and resource links with reserved example values.

## Acceptance criteria

1. No unexplained Spanish identifiers or code paths remain in the agreed source, test, script and configuration scope. Document justified exceptions, including protocol fields and immutable historical migrations.
2. Each module has verified frontend/backend API contracts, including error handling and user-visible messages.
3. Frontend and backend builds, relevant unit tests, API integration tests and affected end-to-end flows pass; record any blocked check and its reason.
4. Each change has a reviewable commit, rollback instructions and a security check. Do not claim completion from filename searches alone.
5. No secrets, private data or working credentials are committed. Existing Git history is audited separately before public release.

## Current known risks

- Backend errors now use `code`, `message` and `fields`. The frontend authentication and administration services currently use mocks; their real API integration and error contract remain unverified.
- Many backend and frontend identifiers and API response fields remain in Spanish despite earlier directory and filename work.
- The frontend working tree is now on `dev` with substantial uncommitted changes. Local `dev` was fast-forwarded to the previous `refactor/standalone` commit and was 27 commits ahead of `origin/dev` at the initial audit; review those commits and preserve the working tree before publishing.
- The backend's existing Git history contains an author email and a meeting link. Verify and remove or rotate sensitive material before making history public; rewriting published history requires explicit approval.
- Context7 credentials must not be committed or stored in project files. A previously exposed key must be revoked and replaced.
