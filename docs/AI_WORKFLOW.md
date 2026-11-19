# AI Workflow Note

> The brief asks for "mature use of AI tools without sacrificing engineering
> standards" and "without outsourcing judgment." This is an honest account of how
> I used AI on this build. Edit it to match your own process before submitting.

## How I used AI

I used an AI coding assistant as a fast pair-programmer for the parts of this
project that are mechanical, and kept the decisions that actually matter to
myself.

**AI did the heavy lifting on:**
- Scaffolding the Next.js App Router structure and config (TypeScript, Tailwind,
  Vitest).
- Boilerplate: Supabase client/server/middleware wiring, Server Action
  signatures, form components, Tailwind markup.
- Drafting the SQL migration and the first pass of the RLS policies.
- Writing test cases once I'd decided what was worth testing.

**I owned the judgment:**
- **Scope.** What to build deep (editing, sharing/access) vs. cut (real-time,
  versioning, `.docx`, attachments). Those trade-offs are mine and are explained
  in [ARCHITECTURE.md](./ARCHITECTURE.md).
- **Architecture.** Choosing Supabase specifically so authorization lives in the
  database via RLS; storing editor content as HTML; enforcing access in two
  agreeing layers; extracting `resolveAccess()` as a pure, testable function.
- **Verification.** I didn't trust generated code on faith. I ran `npm run build`
  (type-checks + compiles) and `npm test` until both were green, and I read
  through the RLS policies specifically, because that's the one area where a
  plausible-looking-but-wrong policy would be a real security bug — e.g. catching
  that cross-table policy references needed `SECURITY DEFINER` helpers to avoid
  recursion.

## Where I pushed back on the AI

- Rejected a `contentEditable`-from-scratch editor suggestion in favor of Tiptap —
  the DIY version looks fine in a demo and breaks on real editing.
- Removed a manual "Save" button the first draft added, in favor of autosave, to
  match the product's mental model.
- Tightened the generated RLS so share management is strictly owner-only rather
  than allowing any collaborator to re-share.

## The principle

AI compressed the time from idea to working slice, but every decision a reviewer
would question — scope cuts, the access model, what to test — is one I can
explain and defend in the walkthrough. The AI wrote a lot of the code; it did not
make the product.
