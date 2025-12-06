Custom authentication using PostgreSQL + JWT

Required environment variables:
- `DATABASE_URL` — Postgres connection string (e.g. `postgresql://user:pass@host:5432/dbname`)
- `AUTH_JWT_SECRET` — secret used to sign JWTs (set a strong random value)

Optional (previously used by NextAuth):
- `GITHUB_ID` / `GITHUB_SECRET` — no longer used; safe to remove.

Database setup:
1. Connect to your Postgres instance and run `CREATE EXTENSION IF NOT EXISTS pgcrypto;` if you want `gen_random_uuid()` support.
2. Run the SQL in `src/db/schema.sql` to create the `users` table.

How it works:
- Sign up: POST `/api/auth/signup` with JSON `{ email, password }`.
- Sign in: POST `/api/auth/signin` with JSON `{ email, password }`. Sets an HttpOnly cookie `auth_token`.
- Sign out: POST `/api/auth/signout` clears the cookie.
- Get current user: GET `/api/auth/me` returns `{ user }` if signed in.

Client:
- The app uses a React `Providers` component (`src/app/providers.tsx`) exposing `useAuth()` with `signIn`, `signUp`, `signOut`, and `user`.

Security notes:
- Passwords are hashed with `bcryptjs`.
- JWTs are signed with `AUTH_JWT_SECRET` and set as HttpOnly cookies.
- Ensure `AUTH_JWT_SECRET` is strong and stored securely.
