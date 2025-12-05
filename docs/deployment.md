# Deployment Instructions

- Environment: Next.js 16, Vercel hosting.
- Build: `npm run build`.
- Deploy: `npm run deploy` (requires Vercel CLI and `VERCEL_*` env vars).
- Preview: GitHub PRs trigger preview deployments via workflow.
- SEO: Ensure `sitemap.ts` and `robots.txt` are up to date.
- Testing: Run `npm run test:all` before deploy.

