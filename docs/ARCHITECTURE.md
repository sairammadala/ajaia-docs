# Architecture Note

## What I optimized for

Depth on the two surfaces a document tool lives or dies on, the **editing experience** and the **sharing/access model**, with upload and auth kept thin but correct.

## Stack and why

- **Next.js (App Router, Server Actions)**: one codebase for UI and server logic, no separate API layer to keep in sync.
- **PostgreSQL 16 via `pg`**: plain SQL, no ORM, two small tables of real logic. Runs identically in Docker and locally.
- **JWT session cookie (`jose`, HS256) + `bcryptjs`**: the session is an httpOnly, SameSite=Lax cookie. Middleware verifies the token on every request; server code re-checks that the user still exists.
- **Tiptap (ProseMirror)**: a real editor engine, so selection, lists and undo behave. Time goes to product behaviour instead of a text engine.
- **mammoth** for `.docx` to HTML; **marked** for Markdown.

History: this started on Supabase (hosted Postgres, Auth, Row Level Security). I moved to self-hosted Postgres + JWT so `docker compose up --build` is a complete, zero-account setup for reviewers.

## Data model

```
users(id, email [unique, case-insensitive], display_name, password_hash)
documents(id, owner_id, title, content [HTML], created_at, updated_at)
document_shares(id, document_id, shared_with, role in {viewer, editor}, unique(document_id, shared_with))
```

Rich text is stored as HTML. Tiptap reads and writes it directly, so formatting round-trips exactly.

## Access model

Authorization lives in one place: `src/lib/store.ts`. Every function takes the acting user's id, loads the document and its shares, and runs the pure `resolveAccess()` before doing anything. A document the user can't see is indistinguishable from one that doesn't exist (404). Viewers can't write; only owners can share, revoke, or delete. This replaced database-level RLS, so the trade-off is that a future code path that bypasses `store.ts` would bypass the rules. The integration tests pin the behaviour down.

## Migrations and startup

`scripts/migrate.mjs` applies `db/migrations/*.sql` in order, once each, under an advisory lock, and waits for the database to accept connections. The container entrypoint (`scripts/start.sh`) runs migrate, then the optional demo seed, then `next start`.

## Testing

Integration tests run the real data layer against real Postgres (register, create, fetch, update, share, second user sees it, permission edges). Unit tests cover the access resolver and the upload pipeline including a generated `.docx`.

## Deliberate scope cuts

- **Real-time collaboration (CRDT/websockets)**: out. Collaborators' changes arrive by 3s polling; the editor never overwrites text you're mid-typing. Concurrent edits are last-write-wins.
- **Version history, comments, link sharing**: out.
- **Email delivery for invites**: out. You can only share with people who already have an account.
- **Rate limiting / password reset / email verification**: out for the take-home; would be first for production.
- **Images in `.docx`**: dropped on import (the editor has no image node).
- **Single container, no nginx**: Next.js serves itself; a CDN/proxy would be added in production.
