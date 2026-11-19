# Submission

## Run it
```bash
docker compose up --build   # http://localhost:3000
```

## Demo accounts (password `Password123`)
| Email | Role in seeded data |
| --- | --- |
| `alice@ajaia.test` | Owns 2 documents; shared one with Bob as editor |
| `bob@ajaia.test` | Editor on "Welcome to Ajaia Docs" |

## What works
- Create, rename, rich-text edit (bold, italic, underline, H1-H3, bullet/numbered lists), autosave, persistence across refresh
- Upload `.txt`, `.md`, `.docx` (5 MB max) with inline errors for unsupported or oversize files
- Sharing by email as viewer/editor; role changes; revoke; viewers are read-only
- Owned vs shared documents are visually distinct on the dashboard
- Postgres persistence; JWT auth; 22 automated tests (integration + unit)
- Single-command Docker setup with automatic migrations and seed data

## Not included (see docs/ARCHITECTURE.md)
Real-time CRDT collaboration (polling instead), version history, link sharing, invite emails, password reset.

## Docs
`README.md`, `docs/ARCHITECTURE.md`, `docs/AI_WORKFLOW.md`, `VIDEO_SUBMISSION.md`
