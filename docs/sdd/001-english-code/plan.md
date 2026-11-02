# Plan 001: English code migration

## Working sequence

1. Establish `dev` in each repository, preserving the existing frontend branch and working tree. Compare `main`, `dev` and the current feature branch before any integration or push.
2. Audit the current API and frontend consumers. Fix the known error response mismatch as a coordinated slice with tests.
3. Inventory Spanish names and group them by module. Start with authentication and people, then academic structure, classrooms, attendance, grading, assignments and quizzes, communications, profile, reports, files and administration. Adjust order when dependencies require it.
4. For each slice, define the exact symbols, files and API fields; update both sides and tests together. Keep each commit reviewable and avoid mixing unrelated modules.
5. For persisted schemas and public contracts, specify compatibility, rollout, data migration and rollback before changing them. Avoid editing already-applied migrations.
6. Run relevant builds, unit tests, backend integration tests and affected frontend end-to-end flows. Review staged changes for secrets and private data. Commit on `dev` or a short-lived branch and push only the verified slice.
7. Use `qa` to verify release candidates, then merge into `main` with an approved rollback plan. Configure CI and branch protection when access permits.

## Experiments and decisions

For alternatives such as Angular HttpClient versus Axios, define an ADR with criteria, representative workloads, measured results, maintainability and security tradeoffs. Implement on separate short-lived branches based on the same revision, compare fairly, merge the chosen option and delete the merged experiment branches. Do not change a working HTTP stack without evidence.

## Rollback

Prefer reverting a small commit or pull request. For coordinated API changes, document client and server deployment order and backward compatibility. Database migrations require a tested forward-fix or backup/restore procedure; a Git revert alone may not restore data.
