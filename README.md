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
- Passwordless email-login demo and protected admin-console preview for local testing
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

The local preview works without an account or backend. It includes a passwordless email-login demo, local user/login records, progress and a password-protected admin-console preview. Set `VITE_ADMIN_EMAIL` and `VITE_ADMIN_PASSWORD` in an uncommitted `.env.local` file before using the admin preview. These browser-only records are for testing the UX and must be replaced with Supabase Auth and database writes before production use.

To add synced accounts and a shared learning database:

1. Create a Supabase project.
2. Run [`supabase/migrations/001_learning_platform.sql`](supabase/migrations/001_learning_platform.sql) in the Supabase SQL editor.
3. Optionally run [`supabase/seed.sql`](supabase/seed.sql) to add the starter courses and achievements.
4. Add the project URL and anon key to your frontend environment when Supabase client wiring is enabled:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

The schema includes profiles, courses, modules, lessons, quizzes, progress, bookmarks, achievements, user settings and login events. Row Level Security limits user-owned records to the signed-in user, while admin policies protect audit and content-management access. There is deliberately no table for analyzed passwords.

## Scope
GuardPass is defensive and educational. It estimates resistance to guessing; it does **not** attempt to crack or recover real passwords. Entropy and resistance values are heuristic estimates, not guarantees.

## Hackathon
Project owner: **Harshal Santoshi**  
Repository: **Harshal142008/GuardPass**
