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
`EXPO_PUBLIC_DOMAIN` (your public hostname), `ADMIN_EMAILS` and
`SUPABASE_SERVICE_ROLE_KEY` in the host's environment.

### Reports and alerts

Students can report a profile, a listing, a Crash & Cash post or a
conversation from the "⋯" menu on each. `POST /api/reports` saves the report
with a copy of the content as it was, then emails everyone in `ADMIN_EMAILS`
through [Resend](https://resend.com). App Review expects reports to be acted
on within 24 hours, so the email is what tells you there's something to do.
It names what was reported and why, but never the text of a private
conversation; that's only in the admin queue. If the email can't be sent,
the report is still saved and marked `alert_sent = false`.

Setting up Resend:

1. Sign up at resend.com.
2. Pick a sender:
   - **With a domain you own:** Resend → **Domains** → **Add domain**, then add
     the DNS records it lists (SPF and DKIM) at your domain registrar and wait
     for it to show Verified. Use an address on it, e.g.
     `PopMatch Reports <reports@your-domain>`.
   - **Without a domain:** Resend's test sender `onboarding@resend.dev` can only
     send to the email address your Resend account is registered with. That's
     enough for a one-person team if `ADMIN_EMAILS` is that same address. It
     stops working for anyone else, so move to your own domain before adding
     a second admin.
3. **API Keys** → **Create API key**, with **Sending access** (limited to that
   domain if you added one).
4. On the API host (and in `.env` to try it locally): `RESEND_API_KEY`,
   `REPORTS_FROM_EMAIL` (the sender above) and `ADMIN_EMAILS`.

Cost: Resend's free plan covers 3,000 emails a month (100 a day) and one
domain, which is far beyond the handful of reports a campus app gets, since
it's one email per report. The paid plan starts at $20/month for 50,000.
Check resend.com/pricing in case those numbers have changed.

Also set `EXPO_PUBLIC_SUPPORT_EMAIL` (in EAS for builds, `.env` locally). It's
the "Contact us" row on Profile and the address on the report confirmation,
App Review's "published contact information". Unset, both are hidden.

### Account deletion

Profile → **Delete Account** (App Store guideline 5.1.1(v)) calls
`DELETE /api/account`, which removes, in this order (`server/account.ts`):

1. the student's photos in the `avatars` and `listing-photos` buckets (their
   auth-id folder in each);
2. every row about them, in one transaction: the same tables as the cleanup
   SQL under "App Review demo account" below;
3. their Supabase Auth user, so they can't sign back in.

Steps 1 and 3 need `SUPABASE_SERVICE_ROLE_KEY` on the API server (Project
Settings → API → service_role; server-only, it bypasses every security rule).
Without it the endpoint answers 503 and deletes nothing, and the app tells
the student their account wasn't deleted. That includes local development:
put the key in `.env` to try deletion locally. If a step fails, the request
fails and the app says so; trying again carries on, because each step skips
what's already gone. The app clears the device only after the server has
deleted the account.

A token issued before deletion keeps passing the API's signature check until
it expires (1 hour by default), so for up to an hour that device could still
call the API and save a new, empty profile under that email.

Vercel and Netlify are static-only by default and will serve the app but not
the Express API, so the API needs a Node host of its own. It can't be swapped
for direct Supabase calls without first rebuilding its auth, ownership and
email-privacy rules as RLS policies.

None of this has been done yet: PopMatch currently runs locally only.

Whatever host you pick, add its URL to Supabase → **Authentication** → **URL
Configuration** → *Site URL* and *Redirect URLs*, or sign-in links will bounce.

### iOS builds (EAS)

`eas.json` has a `preview` profile (internal install on registered devices)
and a `production` profile (App Store, build number incremented on EAS's
servers). The app is the existing App Store listing: bundle id
`app.popmatch`, Apple team `F5M3H379D2`, EAS project
`6c933431-fa4e-4ad0-83d7-5594a9ba3fd5`. Keep that bundle id — a different one
is a different app to Apple.

EAS doesn't upload `.env` (it's gitignored), so a build only sees variables
set on EAS for the profile's environment (`preview` / `production`):
`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` and
`EXPO_PUBLIC_API_URL`. Set them with `eas env:create` or on expo.dev →
Project → Environment variables.

`EXPO_PUBLIC_API_URL` must be the deployed API. Without it a phone build falls
back to `http://localhost:5000`, which is the phone itself — the app opens
and nothing loads. Deploy the API first.

### App Review demo account

Apple's reviewers have no UIUC account, so they can't use Microsoft sign-in.
They sign in on the email-code screen with one allowlisted address whose
"code" is really that Supabase user's password. Supabase checks it, so the
reviewer gets a normal session and nothing secret is in the app. Every other
address still gets Supabase's emailed codes.

**Set it up before submitting:**

1. Supabase → **Authentication** → **Users** → **Add user** → **Create new
   user**. Enter the review email, the 6-digit code as the password, and tick
   **Auto Confirm User**.
2. Set the same address as both `EXPO_PUBLIC_REVIEW_EMAIL` (the app lets it
   through) and `REVIEW_EMAIL` (`POST /api/users` accepts a profile without
   `.edu`), wherever the app and API run:
   - **Locally:** both in `.env`. Then stop and restart both `npm run
     expo:dev` and `npm run server:dev`. Saving `.env` isn't enough, and
     neither is a hot reload: `EXPO_PUBLIC_*` values are fixed into the bundle
     when Expo starts (a production build inlines them as plain strings), and
     the API reads `.env` once at startup. If the address still gets "Please
     use your @illinois.edu email address", the app was started before the
     variable was set. Restart with `npx expo start --clear`.
   - **iOS build:** `EXPO_PUBLIC_REVIEW_EMAIL` in the EAS `production`
     environment. EAS doesn't read `.env`.
   - **Deployed API:** `REVIEW_EMAIL` in the API host's environment.
3. Put the address and code in App Store Connect → the version → **App Review
   Information** → **Sign-in required**, and paste the notes below into
   **Notes** with the real address and code filled in. The notes name the
   exact text the reviewer taps, so update them in the same change whenever
   the sign-in screen's wording or layout changes.

   ```
   PopMatch is a housing app for students at the University of Illinois Urbana-Champaign (UIUC). Students use it to find roommates, find or post sublets (short-term room rentals) near campus, and arrange a place to stay over school breaks.

   HOW TO SIGN IN
   Normal sign-in is through the university's Microsoft accounts, so the "Continue with UIUC" button will not work for you. Please use the demo account instead:

   1. Open the app. On the "Welcome to PopMatch" screen, find the small grey text below the "Continue with UIUC" button and its caption, a little way down the screen. It reads: "Can't use Microsoft sign-in? Verify with your @illinois.edu email". Tap it.
   2. An email field and an "Email me a code" button appear. The field shows "netid@illinois.edu" as an example; type the demo email over it: <review email>
   3. Tap "Email me a code". No email is sent for this demo account.
   4. On the next screen, enter the 6-digit code: <code>
   5. Tap "Verify & Continue".

   AFTER SIGNING IN
   The app asks a few setup questions (your name, what you're looking for, and so on). Any answers are fine. Then you'll land on the Home screen, which has three main sections:

   - Find a roommate: a deck of student profiles. Swipe right to like someone and left to pass. When two students like each other, it's a match and they can message each other.
   - Browse sublets: rooms and apartments near campus that students are subletting. You can search, filter by price, and open a listing to see its photos and details. "Post a sublet" walks through listing a place.
   - Crash & Cash: short posts from students who need a place to stay for a night or a break, or who are offering one.

   Messages are in the Inbox tab, and your profile is in the Profile tab.

   The app is new, so there may be only a few listings and profiles to browse. Everything you do with the demo account is real and saved to our database, and we'll delete the account and its data after review.
   ```

**Password length.** Six digits only just clears Supabase's default minimum
password length of 6. If the project has a stricter policy (a higher minimum,
or required letters or symbols, under Authentication → Providers → Email /
password settings), **Add user** will reject the code. Relax the policy for
this user's creation, or pick a code the policy accepts and give Apple that.

**Remove it once Apple approves the build.** The address is in every copy of
the app (anything `EXPO_PUBLIC_` is readable from the bundle), and a 6-digit
password is weak: one million combinations, with only Supabase's rate limits
in the way. Left in place, it's a standing way into the app for anyone who
reads the bundle.

The quickest way: sign in as the review account and tap Profile → **Delete
Account**. That does steps 1 and 2 below, plus the Storage photos, in one go
(see "Account deletion" above). Then do step 3. To do it by hand instead:

1. Supabase → **Authentication** → **Users** → find the address → **⋯** →
   **Delete user**. That ends sign-in; existing sessions stop working once
   their token expires (1 hour by default).
2. Delete its PopMatch data too. The `users` row and everything tied to it
   live in the app's tables, not Supabase Auth. In the SQL Editor, put the
   address in place of `<review email>` (once, on the first line) and run the
   whole script:
   ```sql
   BEGIN;
   CREATE TEMP TABLE target ON COMMIT DROP AS
     SELECT id, lower(email) AS email FROM users WHERE lower(email) = lower(trim('<review email>'));
   DO $$ BEGIN
     IF NOT EXISTS (SELECT 1 FROM target) THEN
       RAISE EXCEPTION 'No PopMatch profile has that email; nothing was deleted';
     END IF;
   END $$;
   -- Their conversations, and every message in them (both sides).
   DELETE FROM messages WHERE conversation_id IN (
     SELECT c.id FROM conversations c, target t WHERE t.id IN (c.participant1_id, c.participant2_id));
   DELETE FROM messages WHERE sender_id IN (SELECT id FROM target);
   DELETE FROM conversations WHERE participant1_id IN (SELECT id FROM target)
                                OR participant2_id IN (SELECT id FROM target);
   -- What they posted (keyed by users.id).
   DELETE FROM listings WHERE user_id IN (SELECT id FROM target);
   DELETE FROM crash_posts WHERE user_id IN (SELECT id FROM target);
   -- What they did and what was done to them (keyed by email).
   DELETE FROM likes WHERE liker_email IN (SELECT email FROM target) OR liked_email IN (SELECT email FROM target);
   DELETE FROM passes WHERE passer_email IN (SELECT email FROM target) OR passed_email IN (SELECT email FROM target);
   DELETE FROM friend_adds WHERE adder_email IN (SELECT email FROM target) OR added_email IN (SELECT email FROM target);
   DELETE FROM vouches WHERE voucher_email IN (SELECT email FROM target) OR vouchee_email IN (SELECT email FROM target)
                          OR voucher_id IN (SELECT id FROM target) OR vouchee_id IN (SELECT id FROM target);
   DELETE FROM blocks WHERE blocker_email IN (SELECT email FROM target) OR blocked_email IN (SELECT email FROM target);
   DELETE FROM reports WHERE reporter_email IN (SELECT email FROM target) OR target_user_id IN (SELECT id FROM target);
   DELETE FROM feedback WHERE lower(user_email) IN (SELECT email FROM target);
   -- The profile itself, last: everything above looks people up through it.
   DELETE FROM users WHERE id IN (SELECT id FROM target);
   -- Must print 0. Anything else means a table was missed.
   SELECT
     (SELECT count(*) FROM users u, target t WHERE u.id = t.id OR lower(u.email) = t.email)
     + (SELECT count(*) FROM conversations c, target t WHERE t.id IN (c.participant1_id, c.participant2_id))
     + (SELECT count(*) FROM messages m, target t WHERE m.sender_id = t.id)
     + (SELECT count(*) FROM listings l, target t WHERE l.user_id = t.id)
     + (SELECT count(*) FROM crash_posts p, target t WHERE p.user_id = t.id)
     + (SELECT count(*) FROM likes x, target t WHERE t.email IN (x.liker_email, x.liked_email))
     + (SELECT count(*) FROM passes x, target t WHERE t.email IN (x.passer_email, x.passed_email))
     + (SELECT count(*) FROM friend_adds x, target t WHERE t.email IN (x.adder_email, x.added_email))
     + (SELECT count(*) FROM vouches x, target t WHERE t.email IN (x.voucher_email, x.vouchee_email))
     + (SELECT count(*) FROM blocks x, target t WHERE t.email IN (x.blocker_email, x.blocked_email))
     + (SELECT count(*) FROM reports x, target t WHERE x.reporter_email = t.email OR x.target_user_id = t.id)
     + (SELECT count(*) FROM feedback f, target t WHERE lower(f.user_email) = t.email)
     AS rows_left;
   COMMIT;
   ```
   It runs as one transaction: if any statement fails, or the email matches
   no profile, nothing is deleted, and the editor shows the error.

   **Covered:** `users`, `conversations` and every message in them (the other
   person's side of the thread too), `messages`, `listings`, `crash_posts`,
   `likes`, `passes`, `friend_adds`, `vouches`, `blocks`, `reports` (ones
   they filed and ones about them), `feedback`.

   **Deliberately skipped:**
   - `stats` holds only totals (subleases, matches), nothing per person.
   - Photos in Storage (`avatars`, `listing-photos`). Delete the folder named
     after the user's auth id in each bucket, under **Storage**. The SQL
     editor can't remove the files themselves.
3. Unset `EXPO_PUBLIC_REVIEW_EMAIL` on EAS and `REVIEW_EMAIL` on the API host,
   so the next build doesn't carry the address.

Apple reviews every update, not just the first version, so repeat the setup
(with a new code) before each submission and the removal after each approval.

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
