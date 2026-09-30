# GuardPass

**GuardPass** is a privacy-first password analyzer and cybersecurity learning platform for building safer digital habits.

## Features
- Local password strength and risk analysis
- Common-password and predictable-pattern detection
- Sequence, repetition, keyboard-pattern and dictionary-word checks
- Attack-pattern visualization with segmented password structure
- Configurable password-policy compliance checks
- Explainable heuristic score factors and prioritized improvement suggestions
- Theoretical and heuristic practical entropy estimates
- Secure password generator using `crypto.getRandomValues()`
- Six learning paths covering password security, privacy, phishing, devices, browsing and data management
- Lesson completion, quizzes, milestones and a local learning dashboard
- Security Center checklists for accounts, devices and privacy
- Local phishing-message keyword check (content is never sent anywhere)
- Supabase-ready schema with authentication, courses, progress, quizzes and Row Level Security
- Calm white responsive interface with simple navigation and readable lesson layouts
- Supabase email/password authentication with password reset, session persistence and login-event recording
- Protected admin console backed by Supabase Auth and Row Level Security (with a local fallback when Supabase is not configured)
- Supabase-ready login event audit trail, admin roles and content-management policies

## Privacy
Analyzed passwords are kept in React memory only. They are never stored, logged, analyzed remotely or sent to a server. Password generation uses the browser Web Crypto API. Learning progress and checklist state are stored locally in the browser for the demo; no password data is written to local storage.

## Run locally

```bash
npm install
npm run dev
```

Build with `npm run build`.

## Supabase setup (optional)

The local preview works without an account or backend, but production account storage uses Supabase Auth and PostgreSQL. When Supabase variables are present, email/password sign-up, sign-in, password reset, login-event recording and lesson-progress synchronization use the database. Passwords are handled only by Supabase Auth; GuardPass never stores password values in its tables. Without Supabase variables, the app uses a clearly labeled local fallback for previewing the UX.

To add synced accounts and a shared learning database:

1. Create a Supabase project.
2. Run [`supabase/migrations/001_learning_platform.sql`](supabase/migrations/001_learning_platform.sql) in the Supabase SQL editor.
3. Optionally run [`supabase/seed.sql`](supabase/seed.sql) to add the starter courses and achievements.
4. Add the project URL and anon key to your frontend environment:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

The schema includes profiles, courses, modules, lessons, quizzes, progress, bookmarks, achievements, user settings and login events. Row Level Security limits user-owned records to the signed-in user, while admin policies protect audit and content-management access. The client records successful authenticated logins in `login_events`; failed authentication remains in Supabase Auth logs. There is deliberately no table for analyzed passwords or application-managed account passwords.

### GitHub Pages deployment

The included Pages workflow reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from GitHub Actions secrets at build time. Add those two secrets in the GuardPass repository before deploying; do not commit them to source. Optionally add the repository variable `VITE_ADMIN_EMAIL` (the default is `admin123@gmail.com`). The production admin password belongs in the Supabase Auth admin account, not in a frontend secret or database table.

### Admin setup

After creating the authorized admin account in Supabase Auth, promote that user once in the SQL editor:

```sql
update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'admin123@gmail.com');
```

The admin console then signs in through Supabase Auth and can read login events only when the `profiles.role` value is `admin`. Do not put the admin password in Git or in a public frontend variable; configure it only in Supabase Auth (and in a local `.env.local` only for the demo fallback).

## Scope
GuardPass is defensive and educational. It estimates resistance to guessing; it does **not** attempt to crack or recover real passwords. Entropy and resistance values are heuristic estimates, not guarantees.

## Hackathon
Project owner: **Harshal Santoshi**  
Repository: **Harshal142008/GuardPass**
