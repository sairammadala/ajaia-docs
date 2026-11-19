# AjaiaDoc

AjaiaDoc is a lightweight collaborative document editor built as a full-stack engineering assignment.

## Quick start with Docker

```bash
git clone <repo-url>
cd <repo>
cp .env.example .env
docker compose up --build
```

(On Windows PowerShell, use `Copy-Item .env.example .env`.)

The app will be available at **http://localhost:3000**.

Database migrations and seed data run automatically on startup. No manual database setup is needed.

**Seed credentials**

| Email | Password |
| --- | --- |
| `alice@ajaia.test` | `Password123` |
| `bob@ajaia.test` | `Password123` |

To reset all data, run `docker compose down -v`.

## What to test

1. Log in as `alice@ajaia.test`.
2. Create a document and edit it with rich text formatting (bold, italic, underline, headings, bulleted and numbered lists). Refresh the page and confirm everything persisted.
3. Upload a `.txt`, `.md` or `.docx` file from the dashboard. It becomes a new editable document. Try an unsupported type such as `.pdf` to see the error message.
4. Open a document and click **Share**. Invite `bob@ajaia.test` as viewer or editor.
5. In an incognito window, log in as `bob@ajaia.test`. The document appears under "Shared with you" with the correct permission badge ("Can edit" or "View only"). Viewers get a read-only editor.

Alice also starts with two documents, one of which is already shared with Bob as an editor.

## Local development without Docker

Prerequisites: Node 20 and PostgreSQL 16.

```bash
npm install
cp .env.example .env
```

Create a database and user that match `DATABASE_URL` in `.env`, for example:

```bash
createdb ajaia
```

Edit `DATABASE_URL` in `.env` to point at your Postgres instance, then:

```bash
npm run migrate    # apply SQL migrations
npm run seed       # create the demo accounts and documents
npm run dev        # http://localhost:3000
```

## Running tests

```bash
npm test
```

There are 22 tests covering auth, document CRUD, sharing logic and file upload. The integration tests run against a real Postgres, using the `DATABASE_URL` from your environment (or the default local one), and clean up the users they create. If you use Docker for the database: `docker compose up -d db --wait` first.

## Tech stack

- Next.js 14 (App Router, Server Actions)
- TipTap rich text editor
- PostgreSQL 16 with `pg`
- JWT cookie authentication (`jose`, `bcryptjs`)
- Tailwind CSS
- Docker Compose

## Architecture decisions

AjaiaDoc is a single Next.js container that serves both the UI and the API routes, backed by Postgres. Sessions are JWTs stored in an httpOnly cookie, and there is no separate backend service. Migrations run when the container starts. All authorization is enforced in one data layer (`src/lib/store.ts`). Collaboration is polling-based at three-second intervals, not WebSocket: concurrent edits are **last write wins**, and the editor never overwrites text you are in the middle of typing.

More detail: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## What was deliberately not built

- Real-time WebSocket collaboration
- Version history
- Comments
- PDF export
- Google OAuth
- A dedicated mobile-optimized layout (the UI is responsive but designed desktop-first)
