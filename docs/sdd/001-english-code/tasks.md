# Tasks 001: English code migration

- [x] Establish the English naming convention in each repository's `AGENTS.md`.
- [x] Create the backend `dev` branch locally from the current `main`.
- [x] Move the frontend working tree to local `dev` by fast-forward, preserving its uncommitted changes.
- [x] Create local `qa` branches from `main` in both repositories.
- [ ] Review the frontend commits ahead of `origin/dev` and reconcile the uncommitted work before publishing.
- [ ] Complete frontend naming migration and security review before the requested frontend push.
- [ ] Audit backend and frontend code and record a module-by-module inventory and exceptions.
- [ ] Map real versus mocked frontend services; implement and verify the agreed API integration and error contract (`code`, `message`, `fields`) as coordinated module slices.
- [ ] Migrate authentication and people code and contracts; verify affected UI and API flows. Frontend authentication service method names were started; its implementation still uses mocks.
- [ ] Migrate remaining modules in small, independently reviewed slices.
- [ ] Run backend PostgreSQL integration tests and relevant frontend end-to-end tests with Docker and required services available.
- [ ] Audit repository history, revoke the exposed Context7 key, and resolve the historic meeting link and commit email before public release.
- [x] Configure Context7 in Codex and authenticate using OAuth.
- [ ] Verify a Context7 documentation lookup in a new session.
- [ ] Create or verify `dev` and `qa` on both remotes; configure branch protections and CI after defining team permissions.
- [ ] Record module test results, commit IDs, compatibility and rollback notes as tasks are completed.
