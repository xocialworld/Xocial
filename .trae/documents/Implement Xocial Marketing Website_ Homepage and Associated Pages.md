## Objectives
- Implement Homepage and all marketing pages per blueprint, enhancing performance, UI/UX, functionality, error handling.
- Maintain consistent branding, mobile responsiveness, accessibility (WCAG 2.1), and SEO across pages.
- Add unit and e2e tests for interactive components and critical flows; document style guide, component library, and deployment.

## Current State Summary
- Framework: Next.js App Router with Tailwind + ShadCN components; Supabase for data; Playwright/Jest for tests.
- Existing marketing: `src/app/page.tsx` (Homepage), feature pages under `src/app/features/*`.
- Error handling via `APIError` and Error Boundaries; Web Vitals reporting; CI/CD via GitHub + Vercel.

## Sitemap & Routing
- Create routes matching blueprint:
  - `/` Home
  - `/product/{create,plan,approve,collaborate,schedule,analyze}`
  - `/solutions/{brands,agencies,multi-location}`
  - `/pricing`, `/blog`, `/resources`, `/resources/{guides,templates,calculators,quizzes}`
  - `/customers`, `/start-program`, `/support`, `/login`, `/signup`
- Keep existing `/features/*` as aliases or redirects to `/product/*` to preserve links.
- Use App Router route groups `(marketing)` to isolate marketing layout from dashboard.

## Architecture & Layout
- Introduce `MarketingLayout` with shared `MarketingHeader` and `MarketingFooter` components.
- Move inline homepage header/footer into reusable components for sitewide consistency.
- Centralize nav items and CTAs; add active-state styling and prefetch.

## Homepage Implementation
- Sections: Hero with primary/secondary CTA, social proof logos, product overview (Create, Plan, Approve, Collaborate, Schedule, Analyze), use cases (Brands, Agencies, Multi-location), testimonials carousel, deep CTA banner, footer.
- Interactive elements: tabs for product overview, carousel for testimonials, animated iconography; track CTAs via existing engagement tracker.
- Performance: convert heavy UI to server components where possible; optimize images; reduce `use client` scope.

## Product Pages (`/product/*`)
- Per page structure:
  - How it works (diagram or step cards)
  - Key features (cards with icons)
  - Comparison vs spreadsheets/email (pros/cons table)
  - Short demo video embed
  - FAQ (Accordion with schema markup)
  - CTA (Start trial / Book demo)
- Build using ShadCN `Card`, `Tabs`, `Accordion`, `Dialog` where appropriate.

## Solutions Pages (`/solutions/*`)
- Tailored copy per audience (brands, agencies, multi-location) describing pains and solutions.
- Highlight workspaces, roles/permissions, approval workflows, analytics; include case snippets and CTAs.

## Pricing Page
- Monthly/Yearly toggle controlling displayed prices; plans: Free, Pro, Growth, Enterprise.
- FAQ section and an interactive calculator (workspaces + seats) with immediate estimate.
- Implement with `Toggle`, `Select`, and simple state; add zod validation for calculator inputs.

## Blog & Resources
- `/blog`: listing page + article template (markdown or MDX-ready), SEO-friendly metadata.
- `/resources`: overview hub linking to guides, templates, calculators, quizzes.
- Implement calculators/quizzes with validated forms and results summaries.

## Customers & Programs
- `/customers`: grid of case studies/testimonials with metrics highlights.
- `/start-program`: informational page with signup interest form (connect to existing waitlist API).

## Support & Forms
- `/support`: contact form (name, email, message) with server-side API route using `APIError`; success/failure toasts.
- Reuse existing waitlist/notifications endpoints where available; otherwise add minimal API route wrappers consistent with `src/app/api/*` patterns.

## Performance & UX Enhancements
- Use RSC for static marketing sections; lazy-load carousels/video embeds.
- Optimize images with Next Image; prefetch primary nav routes; minimize client JS in marketing pages.
- Audit bundle with `@next/bundle-analyzer`; set Web Vitals budgets and monitor via existing reporter.

## Accessibility (WCAG 2.1)
- Semantic landmarks (`header`, `main`, `footer`) and ARIA labels on interactive UI.
- Keyboard navigation and focus management for dialogs/carousels; sufficient color contrast.
- Add automated checks in tests (Testing Library + axe where feasible).

## SEO
- Per-page `generateMetadata`: unique titles, meta descriptions, OpenGraph, Twitter cards, canonical URLs.
- Add FAQ schema to Product and Pricing pages; ensure clean URLs; update `sitemap.ts` with new routes.
- Confirm `robots.txt` excludes app-only paths and includes marketing routes.

## Error Handling
- Wrap marketing pages with Error Boundary at layout level.
- Standardize API error responses via `APIError` and `withErrorHandler` for forms.
- User-facing toasts with actionable retry guidance.

## Testing
- Unit tests: tabs/carousels/toggles/calculators/FAQ accordions; form validation and submission states.
- E2E tests: navigation between key pages, signup/login, pricing toggle, support form submission.
- Performance tests: assert Web Vitals thresholds; run Playwright with multiple device profiles (mobile/desktop), and cross-browser projects.

## Documentation
- Style guide markdown: colors, spacing, typography, components usage, accessibility guidelines.
- Component library docs: usage examples and props for marketing components.
- Deployment instructions: how to build/deploy to Vercel, environment requirements.
- Minimal code comments for complex logic (calculators, form handlers, error wrappers).

## Deliverables
- New routes and pages per sitemap, shared marketing layout/header/footer.
- Interactive components (tabs, carousel, FAQ, calculator) with tests.
- Updated sitemap/metadata and SEO schema.
- Docs: style guide, component usage, deployment.

## Assumptions & Notes
- Keep existing `/features/*` pages, adding redirects/aliases to `/product/*` for consistency.
- Do not alter dashboard routes; marketing lives under `(marketing)` group.
- Reuse existing UI components, tracking, and error utilities to align with repo conventions.
- If any dependency is missing (axe testing, schemas), propose lightweight additions aligned with current tooling.
