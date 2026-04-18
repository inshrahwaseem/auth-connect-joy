# auth-connect-joy

![Auth Connect Joy Demo](public/demo.webp)

A production-ready authentication system built with React, TypeScript, Supabase, and Tailwind CSS.

## Features

- **Email/password authentication** via Supabase Auth
- **Multi-factor authentication (MFA)**: TOTP (authenticator app), Email OTP, and backup codes
- **Role-based access control (RBAC)**: admin and user roles with RLS policies
- **Account lockout** after 5 failed attempts (DB-backed, persists across restarts)
- **Inactivity timeout**: auto-logout after 30 minutes
- **Audit log**: all login events with IP address, user agent, and outcome
- **Cloudflare Turnstile CAPTCHA** on login and signup
- **Password reset** via email with strong password enforcement
- **Admin panel**: promote/demote users, view audit log
- **Session management**: sign out all devices

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS, shadcn/ui |
| Backend/DB | Supabase (PostgreSQL + RLS) |
| Edge Functions | Deno (Supabase Functions) |
| Auth | Supabase Auth (email + MFA) |
| CAPTCHA | Cloudflare Turnstile |
| Forms | React Hook Form + Zod |
| Testing | Vitest + Testing Library |

## Project Structure

```
auth-connect-joy/
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── .env.example              ← copy to .env and fill in
├── public/
├── src/
│   ├── main.tsx
│   ├── App.tsx               ← routes
│   ├── index.css
│   ├── config/
│   │   └── constants.ts      ← all magic numbers and route paths
│   ├── types/
│   │   └── index.ts          ← shared TypeScript types
│   ├── lib/
│   │   ├── utils.ts          ← cn, sha256, relativeTime, etc.
│   │   ├── validations.ts    ← all Zod schemas
│   │   └── turnstile.ts      ← client-side Turnstile verify
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useRole.ts
│   │   ├── useAuditLog.ts
│   │   └── useInactivityTimeout.ts
│   ├── components/
│   │   ├── auth/
│   │   │   ├── AuthLayout.tsx
│   │   │   ├── FormField.tsx
│   │   │   ├── TurnstileWidget.tsx
│   │   │   ├── MFAChallenge.tsx
│   │   │   ├── MFASetup.tsx
│   │   │   ├── ProtectedRoute.tsx
│   │   │   └── RoleGuard.tsx
│   │   └── ui/               ← shadcn/ui components (auto-generated)
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts
│   │       └── types.ts
│   ├── pages/
│   │   ├── Index.tsx
│   │   ├── Login.tsx
│   │   ├── Signup.tsx
│   │   ├── VerifyEmail.tsx
│   │   ├── ForgotPassword.tsx
│   │   ├── ResetPassword.tsx
│   │   ├── Dashboard.tsx
│   │   ├── MFASettings.tsx
│   │   ├── AdminPanel.tsx
│   │   ├── AuditLog.tsx
│   │   └── NotFound.tsx
│   └── test/
│       ├── setup.ts
│       ├── validations.test.ts
│       ├── utils.test.ts
│       ├── useRole.test.ts
│       └── useInactivityTimeout.test.ts
└── supabase/
    ├── migrations/           ← all DB migrations in order
    └── functions/
        ├── secure-login/     ← handles login, lockout, audit
        ├── send-email-otp/   ← sends and verifies email OTPs
        ├── verify-turnstile/ ← server-side CAPTCHA verification
        └── get-turnstile-key/← returns public site key to client
```

## Getting Started

### 1. Prerequisites

- Node.js 20+
- Supabase account
- Cloudflare account (for Turnstile CAPTCHA — optional in dev)

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

```bash
cp .env.example .env
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY
```

### 4. Run database migrations

```bash
npx supabase login
npx supabase link --project-ref your-project-id
npx supabase db push
```

### 5. Set Edge Function secrets

```bash
npx supabase secrets set TURNSTILE_SECRET_KEY=your-secret
npx supabase secrets set ALLOWED_ORIGIN=http://localhost:5173
npx supabase secrets set RESEND_API_KEY=your-resend-key
```

### 6. Deploy Edge Functions

```bash
npx supabase functions deploy
```

### 7. Start the dev server

```bash
npm run dev
```

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start dev server on port 5173 |
| `npm run build` | Type-check + production build |
| `npm test` | Run all tests |
| `npm run test:coverage` | Tests with coverage report |
| `npm run lint` | ESLint (zero warnings) |
| `npm run type-check` | TypeScript strict check only |

## Deploying

### Vercel / Netlify

1. Push to GitHub
2. Connect your repo in Vercel or Netlify
3. Set environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`
4. Build command: `npm run build`
5. Output directory: `dist`

### Supabase Edge Functions CORS

Set `ALLOWED_ORIGIN` to your production domain in Supabase secrets:

```bash
npx supabase secrets set ALLOWED_ORIGIN=https://your-domain.com
```

## Security Notes

- All login attempts go through the `secure-login` Edge Function — never directly to Supabase Auth
- Backup codes are stored as SHA-256 hashes, never plaintext
- Turnstile CAPTCHA is verified server-side
- RLS policies are active on all tables
- `has_role()` is a `SECURITY DEFINER` function to prevent recursive RLS evaluation
- The `.env` file is gitignored — never commit real keys
