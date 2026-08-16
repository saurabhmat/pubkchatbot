# Pub K Analytics Dashboard

A small internal, login-only web app for browsing the Pub K AI chatbot's
conversation logs and stats. It reads from the same Supabase Postgres
database that the `pubk-chatbot` WordPress plugin writes to (via a
service-role key on the WordPress side that this app never sees or uses).

This app is read-only from Supabase's point of view: it authenticates as a
normal Supabase Auth user and queries with the public anon key, and Row Level
Security policies on the `chat_logs` / `chat_events` tables and the
`conversation_summary` view restrict SELECT to authenticated users only.
There is no signup flow — accounts are created for admins directly in the
Supabase dashboard (Authentication > Users).

## Screens

- **Login** — email + password.
- **Sessions** — paginated list of conversations (from the `conversation_summary`
  view), with search and topic/outcome filters.
- **Session detail** — full transcript for one conversation, plus any lead/
  handover events and their GoHighLevel push status.
- **Stats** — date-ranged totals, daily volume, topic/outcome breakdowns, and
  an estimated Anthropic API cost from token counts.

## Running locally

```
npm install
cp .env.example .env.local   # fill in your Supabase project's URL + anon key
npm run dev
```

## Environment variables

| Variable | Required | What it's for |
|---|---|---|
| `VITE_SUPABASE_URL` | yes | Your Supabase project URL (Project Settings > API). |
| `VITE_SUPABASE_ANON_KEY` | yes | The anon/public API key (safe for a client bundle — RLS does the access control). |
| `VITE_PRICE_IN` | no | Dollars per million input tokens, for the Stats page cost estimate. Defaults to `1.00`. |
| `VITE_PRICE_OUT` | no | Dollars per million output tokens, for the Stats page cost estimate. Defaults to `5.00`. |

`.env` and `.env.local` are gitignored — never commit real credentials.
`.env.example` only has empty/placeholder values.

## Database schema

`supabase/schema.sql` is a reference copy of the tables/view/RLS this app
queries against — documentation only. The real schema already exists in the
Supabase project this app points at; nothing here needs to be run against it
unless you're standing up a fresh project.

## Building for deployment

```
npm run build
```

Outputs a static `dist/` folder — deployable to Vercel, Netlify, or any static
host. Set the environment variables above in the host's dashboard (they're
baked in at build time, being Vite `VITE_*` vars).
