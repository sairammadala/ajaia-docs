-- Ajaia Docs: initial schema (plain PostgreSQL 13+, no extensions required).

create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  email         text not null,
  display_name  text not null,
  password_hash text not null,
  created_at    timestamptz not null default now()
);
-- Emails are compared case-insensitively.
create unique index if not exists users_email_lower_idx on users (lower(email));

create table if not exists documents (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references users (id) on delete cascade,
  title      text not null default 'Untitled document',
  content    text not null default '',            -- editor HTML
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists documents_owner_id_idx on documents (owner_id);

create table if not exists document_shares (
  id          uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents (id) on delete cascade,
  shared_with uuid not null references users (id) on delete cascade,
  role        text not null default 'viewer' check (role in ('viewer', 'editor')),
  created_at  timestamptz not null default now(),
  unique (document_id, shared_with)
);
create index if not exists document_shares_shared_with_idx on document_shares (shared_with);
