# Commons

Neighborhood item-sharing PWA. Next.js (App Router) + Supabase + Vercel.

## Setup

1. `npm install`
2. Copy `.env.local.example` to `.env.local` and fill in your Supabase project
   URL + anon key (Project Settings → API in the Supabase dashboard).
3. Run `db/commons_schema.sql` in the Supabase SQL Editor if you haven't
   already (creates all tables, RLS policies, and triggers).
4. `npm run dev` and visit `http://localhost:3000`.

## Structure

- `app/login` — email/password sign-in (Supabase Auth)
- `app/(app)` — protected route group (redirects to `/login` if signed out)
  - `browse` — "Available to Borrow": search, favorite, request items
  - `my-items` — "What I'm Sharing": post/edit/manage your own items
  - `profile` — profile + per-neighborhood address visibility
- `lib/supabase/` — three Supabase client variants:
  - `client.ts` — browser / Client Components
  - `server.ts` — Server Components, Server Actions, Route Handlers
  - `middleware.ts` — session refresh, used by root `middleware.ts`
- `types/database.types.ts` — hand-written starter types. Replace with:
  ```
  npx supabase gen types typescript --project-id <ref> --schema public > types/database.types.ts
  ```

## Not yet wired up (next build steps)

- PWA manifest, service worker, install-prompt flow (iOS vs Android differ —
  see project notes)
- Web Push (VAPID keys, subscription storage, Edge Function triggers)
- Join-neighborhood flow (invite code validation via Edge Function/RPC)
- Actual data fetching/mutations on browse/my-items/profile pages
- Image upload to Supabase Storage (item photos, profile photos)
- Deploying to Vercel + connecting the GitHub repo
