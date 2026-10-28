# PopMatch — setup

Firebase is gone and Replit is gone. Supabase is the only backend: it handles
sign-in, the Postgres database, and photo storage (profile pictures, listing
and Crash & Cash photos).

This guide starts a **brand-new Supabase project** under the account you
actually want to keep (`gracyyyygemini@gmail.com`, the one matching GitHub).

---

## 1. Create the new Supabase project

1. Sign in at <https://supabase.com/dashboard> **with the Grace Gemini Google
   account** — the same one as GitHub. If a different account is already
   signed in, sign out first, or use a private window.
2. **New project**
   - Name: `popmatch`
   - Database password: generate one and save it in a password manager — you
     cannot view it again later, only reset it
   - Region: `East US (North Virginia)` is closest to Illinois
3. Wait for provisioning (a minute or two).

> ### The old project
> The previous project (`zjyzjbrotvyxcwlizwaa`, "gracegeminilol's Project")
> lives on a **different account** and is scheduled to be permanently frozen.
> If there is real data in it worth keeping, sign into *that* account before
> the deadline and use **Database → Backups → Download** to export it. If it
> was only test data, let it expire and ignore it.

---

## 2. Create the tables

Dashboard → **SQL Editor** → **New query** → paste the entire contents of
[`supabase/schema.sql`](supabase/schema.sql) → **Run**.

That one file creates every table, adds indexes (including the `pg_trgm`
extension, in the `extensions` schema, for search), turns on row level
security, and creates the two public storage buckets — `avatars` and
`listing-photos` (2 MB, JPEG only) — with policies that let anyone read and
let a signed-in student write only inside their own folder. It is safe to run
more than once. The API server also creates any missing tables, columns and
indexes when it starts.

Check it worked: **Table Editor** should now list `users`, `listings`,
`messages`, `conversations`, and the rest.

---

## 3. Fill in the environment variables

Copy `.env.example` to `.env` and fill it in:

```bash
cp .env.example .env
```

| Variable | Where to find it |
| --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | Project Settings → API → **Project URL** |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API → **anon / public** key |
| `DATABASE_URL` | Project Settings → Database → **Connection string → URI** (swap in your password) |
| `ADMIN_EMAILS` | Comma-separated sign-in emails allowed into the admin dashboard. Unset means nobody. |

The anon key is designed to ship inside client apps — it is safe to expose,
and with no RLS table policies it can't read or write any table. The
`service_role` key is not safe: it bypasses every security policy, so it must
never go into a variable starting with `EXPO_PUBLIC_`. The app doesn't need it.

The API verifies sign-in tokens against the project's public signing keys
(`<project URL>/auth/v1/.well-known/jwks.json`), so no JWT secret goes in
`.env` either. It uses `EXPO_PUBLIC_SUPABASE_URL` unless `SUPABASE_URL` is set.

---

## 4. Turn on UIUC Microsoft sign-in

This is the main way people sign in: "Continue with UIUC" opens the university
Microsoft login. No codes, no email limits, and it proves the account is a real
UIUC one.

**You do not need anything from UIUC IT for this.** You register your own app
in your own Azure tenant and mark it multi-tenant, which lets any Microsoft
account — university ones included — sign in through it.

### In Azure

1. Go to the [Azure portal](https://portal.azure.com) → **App registrations**
   → **New registration**. (If you still have the registration that used to
   point at Firebase, reuse it and skip to step 3.)
2. Name it `PopMatch`. Under *Supported account types* pick
   **Accounts in any organizational directory (Any Microsoft Entra ID tenant -
   Multitenant)** — this is what makes UIUC logins work without UIUC's help.
3. Add a **Redirect URI** of type *Web*:

   ```
   https://<your-project-ref>.supabase.co/auth/v1/callback
   ```

4. From the **Overview** page, copy the **Application (client) ID**.
5. **Certificates & secrets** → **New client secret** → copy the secret
   **Value** (not the Secret ID). It is only shown once.

### In Supabase

6. **Authentication** → **Providers** → **Azure** → enable it.
7. Paste in the client ID and the secret value.
8. Leave **Azure Tenant URL** blank or set it to `common` so any Microsoft
   account can attempt sign-in. After a **native** sign-in, `lib/auth.ts`
   rejects any address that isn't `@illinois.edu` and signs it straight back
   out. Web sign-in currently has no such check, and the API doesn't check the
   domain either — see Known gaps.
9. **Authentication** → **URL Configuration** → add your app's URL (for local
   development, `http://localhost:8081`) to *Site URL* and *Redirect URLs*.

That's it — the button works immediately, no environment variable needed.

---

## 4b. Optional: the email-code fallback

Under the main button there's a small "Sign in with an email code instead"
link, which emails a 6-digit code. It's a backup for anyone Microsoft sign-in
fails for.

Supabase's built-in mailer allows only a couple of messages per hour, so this
link will hit **"email rate limit exceeded"** almost immediately during
testing. That's the shared test mailer, not a bug. To make it usable:

1. Create a [Resend](https://resend.com) account
2. **Domains** → add and verify your sending domain. Until a domain is
   verified, Resend only delivers to the address you signed up with — so for a
   quick test, sign up using the same address you're signing in with.
3. **API Keys** → create one
4. Supabase → **Project Settings** → **Authentication** → **SMTP Settings** →
   enable custom SMTP:

   | Field | Value |
   | --- | --- |
   | Host | `smtp.resend.com` |
   | Port | `465` |
   | Username | `resend` |
   | Password | your Resend API key |
   | Sender email | an address on your verified domain |

5. Supabase → **Authentication** → **Email Templates** → **Magic Link** →
   make sure the body contains `{{ .Token }}`, which is the 6-digit code.

If you're happy relying on Microsoft sign-in alone, you can skip all of this.

---

## 5. Run it

```bash
npm install
npm run server:dev     # API on http://localhost:5000
npm run expo:dev       # app — press w for web
```

With no domain variables set, the app calls the API at `http://localhost:5000`
in development — on web too, since Expo serves the web app from `:8081`. A
production web build talks to its own origin. Run both servers: if the API is
down, a red "Your profile isn't saved yet" banner appears and the app keeps
retrying. Nothing Replit-specific remains.

`npm run server:dev` doesn't watch for changes — restart it after editing
anything in `server/`, or the app will be talking to the old code.

---

## 6. Deploying

The app builds into two pieces:

```bash
npx expo export --platform web   # static site -> dist/
npm run server:build             # API bundle  -> server_dist/
npm run server:prod              # serves both on $PORT
```

`server/index.ts` serves `dist/` *and* `/api` from one process, so any host
that runs Node works — Render, Railway, Fly.io, a VPS. Set `DATABASE_URL`,
`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`,
`EXPO_PUBLIC_DOMAIN` (your public hostname) and `ADMIN_EMAILS` in the host's
environment.

Vercel and Netlify are static-only by default and will serve the app but not
the Express API, so the API needs a Node host of its own. It can't be swapped
for direct Supabase calls without first rebuilding its auth, ownership and
email-privacy rules as RLS policies.

None of this has been done yet: PopMatch currently runs locally only.

Whatever host you pick, add its URL to Supabase → **Authentication** → **URL
Configuration** → *Site URL* and *Redirect URLs*, or sign-in links will bounce.

---

## Known gaps

The full, current list is in the README under **Status**. The ones that
affect setup and deployment:

1. **UIUC-only isn't enforced on the server.** The domain check runs in the
   app (before an email code is sent, and after native Microsoft sign-in).
   Web sign-in has no check, and the API accepts any valid Supabase session.
2. **RLS table policies are deliberately absent**, so every table is closed to
   the anon key and the Express API is required — not optional.
3. **Not deployed, and verified on web only** — never on an iOS or Android
   device or simulator.
4. **No automated tests** in the repo.

---

## What changed in the Firebase → Supabase migration

History, kept for reference — this describes that one migration, not the app
as it is now (for that, see the README).

| File | Change |
| --- | --- |
| `lib/auth.ts` | **New.** Supabase sessions, `@illinois.edu` email-code sign-in, optional Azure OAuth, sign-out. |
| `lib/uploads.ts` | **New.** Uploads avatars to Supabase Storage, returns a public URL. |
| `supabase/schema.sql` | **New.** Whole database + storage bucket in one paste. |
| `.env.example` | **New.** Every variable, documented. |
| `lib/firebase.ts` | **Deleted.** |
| `app/index.tsx` | Session check reads from Supabase. |
| `app/onboarding.tsx` | Sign-in rebuilt around the email code; avatar uploads on finish. |
| `app/(tabs)/profile.tsx` | Sign-out and reset go through Supabase. |
| `lib/query-client.ts` | API URL resolves from env, same-origin, or localhost — no injected domain needed. |
| `server/index.ts` | CORS uses `ALLOWED_ORIGINS` instead of Replit domains. |
| `server/routes.ts` | Removed the OTP routes and `otp_codes` table. |
| `server/email.ts` | **Deleted.** Supabase sends the codes. |
| `scripts/build.js` | Deployment domain comes from `EXPO_PUBLIC_DOMAIN`. |
| `app.json` | Dropped the Replit router origin. |
| `.replit`, `firebase.json`, `.firebaserc`, `.firebase/` | **Deleted.** |
| `package.json` | Dropped `firebase`, `firebase-tools`, `resend`. Added `@types/pg`. |

### Security fix

`server/routes.ts` previously contained:

```js
function randomCode(): string {
  return "123456";
}
```

Every verification code was literally `123456`, so anyone who knew a
classmate's `@illinois.edu` address could sign in as them. Those routes are
gone — Supabase now generates and checks real codes server-side, and the
client never sees them.
