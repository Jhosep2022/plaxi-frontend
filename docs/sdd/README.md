# Specification-driven development

Each initiative has `spec.md`, `plan.md` and `tasks.md`. Create a separate directory per initiative and keep its decisions and progress current in both repositories when the work crosses them.

1. Describe the problem, scope, acceptance criteria and compatibility requirements in the specification.
2. Record the implementation order, alternatives, verification and rollback in the plan.
3. Track small, verifiable tasks and evidence in the task list. Mark work complete only after verification.

The first initiative is [English code migration](001-english-code/spec.md), with an [initial inventory](001-english-code/inventory.md). Existing historical planning documents remain useful context; reconcile discrepancies before implementing.

## Branch and release policy

- `main`: production-ready code; merge reviewed and verified changes only.
- `dev`: normal integration branch. Start development here, or create a short-lived branch from it.
- `qa`: verification and release candidate branch. Promote tested changes from `dev`; merge approved releases to `main`.
- Use short-lived `feature/`, `fix/`, `refactor/` or `experiment/` branches when isolation or comparison is useful. Record the decision, merge the selected approach and remove merged branches when no longer needed.
- Prefer small commits and pull requests with one coherent purpose. Record tests, compatibility, database migration and rollback instructions. Never rewrite shared history or force-push without explicit approval.
- Do not commit credentials, private customer data, real meeting links, or local environment files. Scan the staged changes and inspect history before making a repository public.
- Protect `main`, `dev` and `qa` with review and CI once repository permissions and team policy are established. Branch protection is a pending setup task, not an active guarantee.
