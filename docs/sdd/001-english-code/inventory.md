# Initial inventory: English code migration

This is a starting estimate from searches over source files, not a complete language audit. Counts include references as well as definitions and do not determine completion.

| Repository | Source files checked | Filenames matching selected Spanish words | Candidate Spanish method references |
| --- | ---: | ---: | ---: |
| Backend `src` | 414 | 0 | 450 |
| Frontend `src/app` | 303 | 131 | 536 |

Examples of frontend filenames include `mocks/academico.mock.ts`, `mocks/asistencia.mock.ts` and `mocks/personas.mock.ts`. Searches must be expanded to types, variables, comments, test names, scripts, HTML templates, CSS and API contracts. The backend zero applies only to the selected filename vocabulary; it is not proof that every name is English.

Current integration priority: backend error response keys are `code`, `message`, `fields`. The inspected frontend authentication and administration services use mocks; inventory the remaining services and implement coordinated API contracts with behavior tests. Record the module inventories and remaining exceptions as each slice is reviewed.
