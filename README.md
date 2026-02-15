# DDCGPT OS (production-ready MVP scaffold)

Browser-based AI desktop shell built for rapid iteration with Next.js + Supabase.

## What is included

- Windows-7-inspired dark glass shell page with:
  - taskbar and Start button
  - draggable/resizable app windows
- App modules:
  - Chat Browser (`/api/chat` wired for OpenAI Responses API)
  - Photo Gallery (`/api/photo-edit` MVP endpoint)
  - Session History window
  - Login/Signup page scaffold (`/auth`)
- Supabase-ready schema migration with RLS for per-user isolation
- Env-based usage cap configuration and typed env parsing

## Folder structure

- `app/` — routes and API handlers (App Router)
- `components/` — reusable desktop/app UI components
- `lib/` — shared runtime helpers (env, supabase, usage limits)
- `supabase/migrations/` — SQL schema and RLS policies
- Optional dev seed script: `supabase/seed.sql`

## Tech stack

- Next.js (App Router) + TypeScript + Tailwind
- Supabase (Auth, Postgres, Storage)
- OpenAI API via server routes

## Local run steps

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy environment file and configure values:

   ```bash
   cp .env.example .env.local
   ```

3. Run the app:

   ```bash
   npm run dev
   ```

4. Open `http://localhost:3000`.

## First working flow (click path)

1. Open home page for the desktop shell.
2. Drag and resize app windows.
3. In **Chat Browser**, send a prompt (uses stub if no API key).
4. Open **System Controls** > **Open Login** for login/signup scaffold.
5. In **Photo Gallery**, click **Edit with GPT** to simulate edit lineage.

## Supabase setup notes

- Apply SQL migration in `supabase/migrations/202602051730_initial_schema.sql`.
- (Optional) run `supabase/seed.sql` for local development data after creating local auth users.
- Configure auth providers (Magic Link + Google) in Supabase dashboard.
- Create a private storage bucket for image uploads (example: `media`).

## Deployment

- Frontend: Vercel (US region)
- Backend/data: Supabase project (US)
- Set all env vars in Vercel project settings.


## Chat workflow (end-to-end)

- `GET /api/chat/sessions` lists sessions for the authenticated user.
- `POST /api/chat/sessions` creates a new session for that user.
- `GET /api/chat` loads prior messages for a chosen session.
- `POST /api/chat` sends a prompt, calls OpenAI chat/completions, stores both user and assistant messages, updates daily usage counters, and refreshes rolling summaries periodically.
- Auth now uses Supabase access tokens from the logged-in user session. API routes validate bearer tokens server-side and derive ownership from `auth.users` identity.


## Photo workflow (end-to-end)

- `POST /api/photo-assets` accepts multipart image upload (JPG/PNG/WEBP, max 10MB), uploads to Supabase Storage bucket `media`, and inserts metadata in `media_assets`.
- `GET /api/photo-assets` loads current user assets and returns signed URLs for preview in the gallery grid.
- `POST /api/photo-edit` loads the source asset, calls OpenAI image edits endpoint, stores the edited output as a new object in Storage, inserts the edited `media_assets` row, and records lineage in `photo_edits`.
- The gallery includes image detail + prompt box and a side-by-side before/after view from signed URLs.


## Deploy to Vercel + Supabase

1. Create a Supabase project and run the SQL migration in `supabase/migrations/202602051730_initial_schema.sql`.
2. Create a private Storage bucket named `media`.
3. Create a Vercel project from this repo.
4. Add production environment variables in Vercel (see list below).
5. Deploy and verify auth, chat, upload, and edit flows.

### Production env vars

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `OPENAI_CHAT_MODEL`
- `OPENAI_IMAGE_MODEL`
- `DAILY_TOKEN_LIMIT`
- `MEDIA_BUCKET`
- `MAX_IMAGE_SIZE_BYTES`
- `SENTRY_DSN` (optional)
- `NEXT_PUBLIC_ANALYTICS_ENABLED`

### Go-live checklist

- [ ] RLS policies enabled and verified with two test users
- [ ] `media` bucket set private; access only through signed URLs
- [ ] Free-tier usage limits rows seeded in `user_usage_limits` for new users
- [ ] OpenAI models and budget caps set for target cost
- [ ] Analytics events visible for chat/image/session-restore flows
- [ ] Error logs visible in Vercel logs and/or Sentry
- [ ] Manual smoke test: login, resume session, send chat, upload image, edit image


## Auth model

- UI signs users in with Supabase Magic Link or Google OAuth (`/auth`).
- Browser obtains a Supabase access token from the active session.
- Protected API requests send `Authorization: Bearer <access_token>`.
- Route handlers verify tokens with Supabase Auth and derive `user.id` server-side (never from client-provided UUID inputs).
