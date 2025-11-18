# Xocial Platform (Next.js + Supabase)

Enterprise-grade AI-powered social media management built with the Next.js App Router, Supabase, Tailwind, and Zustand.

## Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set environment variables**
   - Copy the template from `ENV_SETUP.md` into `.env.local`
   - Fill in the Supabase + Vercel AI Gateway keys and run `npm run check-env` to verify

3. **Run the dev server**
   ```bash
   npm run dev
   ```

## Essential Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Launches the Next.js dev server with session checks |
| `npm run lint` | ESLint with zero-warning budget |
| `npm run type-check` | Full TypeScript project check |
| `npm test` | Runs the jest suite |
| `npm run db:seed` | Seeds demo user/workspace/post data using the Supabase service role *(requires env vars)* |

## AI Content Studio (`/c`)

- Enter a content brief, pick tone/style/length, and multi-select target platforms.
- Choose from the latest AI models via the model picker—requests are routed through Vercel AI Gateway with automatic provider fallbacks.
- `Generate` streams platform-ready captions, autocomplete hashtags, and auto-runs AI analysis for sentiment + readability.
- `Refine` lets you choose presets (shorter, more emojis, professional, etc.) while preserving history.
- `Variations` surfaces alternates you can apply in one click; history sidebar lets you restore any saved generation.
- Copy/schedule actions push the caption into the `/c` composer workflow (logged as `ai_schedule` for auditing).
- Hooks live in `src/hooks/use-ai.ts` and state is centralized in `src/store/aiContentStore.ts`.
- Vercel AI Gateway provides intelligent routing across multiple AI providers with configurable fallbacks via `providerOptions.gateway.order`.

## Database & Security

- Supabase migrations live in `supabase/migrations`
- Helper functions `user_workspaces` + `has_workspace_permission` drive authorization
- RLS policies cover profiles, workspaces, members, social accounts, posts, analytics, templates, media, and AI generations

When the schema changes, run:

```bash
supabase db push
```

## Testing & Quality

- Jest is configured in `jest.config.js`
- New store/unit tests live next to their sources (e.g., `src/store/__tests__`)
- Pre-commit hooks (`.husky/pre-commit`) run ESLint + `tsc --noEmit`
- Platform publishing helpers ship dedicated Jest coverage (`npm test -- publish-utils`).
- Playwright smoke tests live in `e2e/` (e.g., `e2e/media/media-api.spec.ts`) and run with `npx playwright test`.

## Deployment

- `vercel.json` defines build commands, cache headers, and cron jobs
- Middleware (`src/middleware.ts`) injects Supabase sessions + strict security headers on every request

## SRS Alignment (2025-11)

- Pages: X/O/C/A are functional; I and L are Phase 1 placeholders (L can be enabled via `NEXT_PUBLIC_ENABLE_LEVERAGE=true`).
- AI: All AI requests route through Vercel AI Gateway (`VERCEL_AI_GATEWAY_URL`, `VERCEL_AI_GATEWAY_API_KEY`).
- Security: Supabase RLS enforces per-workspace isolation; tokens stored server-side only.
- Performance: Dashboards target <2s load; heavy lists paginate or stream.

## Feature Waitlist

- Influence (I): "Notify me when live" toggle stores preferences via `POST /api/feature-waitlist`.

## Demo Data

You can generate realistic dashboard data locally by running:

```bash
npm run db:seed
```

This script creates a demo user, workspace, social account placeholder, and scheduled post so designers/devs have immediate UI fixtures.

## Useful Docs

- `ENV_SETUP.md` – full list of required environment variables
- `Xocial SRS.md` – complete software requirements specification

