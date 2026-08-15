# BuildMap Web MVP

## Stack

- Next.js App Router
- TypeScript
- Supabase Auth / Data API
- `@supabase/ssr` cookie-based session handling

## Local environment

Copy `.env.example` to `.env.local` and fill only local/staging public client values.

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Never commit database passwords, service-role keys, access tokens, or `.env.local`.

## Supabase Auth setting required for SSR signup confirmation

For the hosted project, configure the Confirm signup email template to route the token hash through the app:

```text
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
```

Set the Auth Site URL / allowed redirect URLs for the environment before testing signup.

## First vertical slice

```text
email/password auth
→ User Profile bootstrap
→ Builder Profile bootstrap
→ Builder dashboard
→ Project create/list
```

The app does not use `service_role`. Database authorization remains RLS-based.

## Commands

```bash
npm install
npm run lint
npm run typecheck
npm run build
npm run dev
```
