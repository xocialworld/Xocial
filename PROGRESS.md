# Xocial – Progress Tracking Document
### Last Updated: March 22, 2026 | Audited by: Full Codebase Review

> This document tracks what has been built, what is missing, what is partially done, and what new features the industry now demands. It serves as the ground truth for re-starting work after a 3-month gap.

---

## 📊 Overall Build Status

| Area | Status | % Done |
|------|--------|--------|
| Auth & Session | ✅ Done | ~90% |
| Workspace System | ✅ Done | ~80% |
| Dashboard Shell | ✅ Done | ~85% |
| Content Composer | ✅ Done | ~75% |
| Content Calendar | ✅ Done | ~80% |
| Post Management | ✅ Done | ~80% |
| Analytics | ✅ Done | ~70% |
| Approval Workflows | ✅ Done | ~75% |
| Media Library | ✅ Done | ~75% |
| Engagement Inbox (/e) | ⚠️ Partial | ~50% |
| Social Accounts (/x) | ✅ Done | ~80% |
| AI Assistant | ✅ Done | ~70% |
| AI Strategy/Insights (/l) | ⚠️ Partial | ~60% |
| Influencer/Notifications (/i) | ⚠️ Partial | ~45% |
| Campaigns | ⚠️ Partial | ~55% |
| Templates | ✅ Done | ~75% |
| Settings | ✅ Done | ~80% |
| Billing / Razorpay | ⚠️ Partial | ~50% |
| Marketing Website | ✅ Done | ~85% |
| Blog / Resources | ⚠️ Partial | ~40% |
| Scheduling / Publishing Cron | ✅ Done | ~80% |
| Notifications System | ✅ Done | ~70% |
| Platform Previews | ⚠️ Partial | ~55% |
| Social Listening | ❌ Not Built | 0% |
| Drag-and-Drop Reschedule | ✅ Done | ~70% |
| Mobile App | ❌ Not Built | 0% |
| Admin Panel | ❌ Not Built | 0% |
| Audit Logs | ❌ Not Built | 0% |
| SSO / OAuth Enterprise | ❌ Not Built | 0% |

---

## ✅ WHAT HAS BEEN IMPLEMENTED

### 1. Authentication & Session Management
**Files:** `src/app/auth/`, `src/lib/supabase/`, `src/middleware.ts`

- [x] Email/password login page (`/auth/login`)
- [x] Signup page (`/auth/signup`)
- [x] Forgot password flow (`/auth/forgot-password`)
- [x] Password reset page (`/auth/reset-password`)
- [x] Email verification (`/auth/verify`)
- [x] OAuth callback handler (`/auth/callback`)
- [x] Supabase SSR session management via middleware
- [x] Protected dashboard routes (redirect if not logged in)
- [x] Auth layout with separate styling
- [x] `authStore.ts` for global auth state (Zustand)

---

### 2. Dashboard Shell & Layout
**Files:** `src/app/(dashboard)/layout.tsx`, `src/components/layouts/sidebar.tsx`, `src/components/shared/`

- [x] Full sidebar navigation with icon-based routing
- [x] Top header bar with user profile
- [x] Responsive layout (flex-based, overflow-managed)
- [x] Background gradient + subtle pattern
- [x] `WorkspaceGuard` component to enforce workspace selection
- [x] `PageHeader`, `PageContainer`, `ContentCard`, `EmptyState`, `StatsGrid` shared UI components
- [x] `ErrorBoundary` and `ErrorState` components
- [x] Loading states (`loading.tsx`) on key routes

---

### 3. Workspace System
**Files:** `src/store/workspaceStore.ts`, `src/hooks/use-workspace.ts`, `src/app/api/workspaces/`

- [x] Workspace creation flow
- [x] Workspace selector / switcher (`workspace-switcher.tsx`)
- [x] `WorkspaceGuard` – redirects if no workspace exists
- [x] Workspace store (Zustand) with selected workspace persistence
- [x] `use-workspace-fetch.ts` hook for data fetching
- [x] `use-workspace-members.ts` for team management
- [x] Workspace settings page (`/settings/workspace`)
- [x] Workspace API route (`GET/POST /api/workspaces`)
- [x] Onboarding wizard + welcome modal (`onboarding-wizard.tsx`, `welcome-modal.tsx`)
- [x] Invite member flow (via settings)

---

### 4. Social Accounts Page (`/x` route)
**Files:** `src/app/(dashboard)/x/`, `src/components/accounts/`

- [x] Accounts grid view with platform-specific cards
- [x] Platform connection buttons for all 6 platforms: Instagram, Facebook, Twitter/X, LinkedIn, TikTok, YouTube
- [x] Platform selection dialog (with "Coming Soon" for unfinished ones)
- [x] Account sync mechanism (`use-account-sync.ts`, `use-accounts.ts`)
- [x] Posts drawer per account
- [x] Comments panel per account
- [x] Multi-select filter by platform and status
- [x] Recent posts view per account
- [x] Per-account publish pages:
  - [x] `/x/facebook/[accountId]/publish`
  - [x] `/x/twitter/[accountId]/publish`
  - [x] `/x/linkedin/[accountId]/publish`
  - [x] `/x/tiktok/[accountId]/publish`
  - [x] `/x/youtube/[accountId]/publish`
  - [x] `/x/youtube/[accountId]/insights`
- [x] Dedicated YouTube account detail page with analytics
- [x] `accounts-store.ts` for Zustand state

---

### 5. Content Composer (`/c` route, was `/compose`)
**Files:** `src/app/(dashboard)/c/`, `src/components/features/create/`

- [x] `UnifiedPostComposer` – the main full-featured composer
- [x] `PlatformSelector` – multi-platform selection
- [x] `ComposerInput` – rich text input with character counting
- [x] `CharacterCounter` – per-platform limits with color thresholds
- [x] `ContentCompatibilityWarning` – alerts for platform-specific issues
- [x] `SchedulingControls` – datetime picker for scheduled publishing
- [x] `WorkflowSelector` – attach approval workflows before submitting
- [x] `MediaUploadZone` – drag and drop media upload
- [x] `MediaLibraryModal` – pick from existing media assets
- [x] `PlatformPreviewCard` – live preview component
- [x] `PlatformPreviews` – multi-platform preview panel
- [x] `/compose` route redirects to `/c` (with query params preserved)
- [x] Composer has test coverage (`__tests__/` inside create feature)

---

### 6. Content Calendar (`/o` route)
**Files:** `src/app/(dashboard)/o/`, `src/hooks/use-calendar-*.ts`

- [x] **Month View** – `CalendarGrid` with `DayCell` posts
- [x] **Week View** – `WeekView` component
- [x] **Grid View** – Instagram-style `GridView` with platform selector
- [x] View mode switcher (Month / Week / Grid)
- [x] `CalendarTopBar` with date navigation + filters
- [x] `DayPostsPanel` – slide-in sheet showing all posts on a day
- [x] `EditPostModal` – quick edit post from calendar
- [x] `RescheduleModal` – drag/click reschedule
- [x] `CommentsPanel` – in-calendar commenting
- [x] `UnscheduledDraftsPanel` – sidebar for unscheduled content
- [x] `MediaLibraryPanel` – inline media selection
- [x] `PlatformFilterBar` – filter by platform
- [x] Status color coding (draft, scheduled, published, failed, rejected)
- [x] `useCalendarLogic`, `useCalendarActions`, `useCalendarPosts`, `useCalendarShortcuts` hooks
- [x] URL state for selected date/post
- [x] Keyboard shortcuts (`useGlobalShortcuts`, `useCalendarShortcuts`)
- [x] `CalendarPrefetcher` component for prefetching
- [x] API: `GET /api/calendar`

---

### 7. Posts Management (`/posts` route)
**Files:** `src/app/(dashboard)/posts/`

- [x] Full posts list page with search and filter
- [x] Filter by platform, status, date
- [x] Post detail page (`/posts/[id]`)
- [x] Platform icons and status badges
- [x] `usePosts` hook
- [x] API: `GET /api/posts`, `POST`, `PATCH`, `DELETE`

---

### 8. Analytics Dashboard (`/a` route)
**Files:** `src/app/(dashboard)/a/`, `src/app/api/analytics/`

- [x] **Overview Tab** – KPIs, metrics cards, engagement chart
- [x] **Platform Tab** – per-platform comparison charts
- [x] **Audience Tab** – demographics + activity heatmap
- [x] **Content Tab** – top posts table, performance ranking
- [x] **AI Insights Tab** – AI-generated performance summary
- [x] `OverviewMetrics` + `OverviewCards` components
- [x] `EngagementChart` (Recharts, dynamic import)
- [x] `PlatformComparison` chart
- [x] `ComparativeAnalytics` component
- [x] `AudienceDemographics` component
- [x] `AudienceActivity` (posting heatmap)
- [x] `TopPostsTable` + `TopPosts` component
- [x] `AdvancedAnalyticsTable`
- [x] `AIInsights` component (AI-generated text summaries)
- [x] `DateRangeSelector` component
- [x] `ExportButton` (export analytics data)
- [x] `YoutubeAnalyticsSection` (dedicated YouTube analytics)
- [x] `FacebookDemographics` component
- [x] `RealTimeMetrics` component
- [x] `PerformanceMetrics` component
- [x] `MetricCard` component
- [x] `useAnalytics` and `useYoutubeAnalytics` hooks
- [x] API: `/api/analytics/overview`, `/api/analytics/platform-stats`, `/api/analytics/top-posts`, `/api/analytics/ai-insights`, `/api/analytics/youtube`, `/api/analytics/twitter`, `/api/analytics/facebook`
- [x] API: `/api/analytics/export`
- [x] API: `/api/analytics/real-time`, `/api/analytics/vitals`
- [x] Database migrations for analytics (`20251208000003_analytics_views.sql`, `20251212000001_create_analytics_tables.sql`, `20251216000008_analytics_optimization.sql`)
- [x] Analytics page has its own `analytics-styles.css`

---

### 9. Approval Workflows
**Files:** `src/app/(dashboard)/approvals/`, `src/components/approvals/`, `src/app/(dashboard)/settings/workflows/`

- [x] `ApprovalsBoard` component – kanban-style view of all pending approvals
- [x] Approvals page (`/approvals`)
- [x] Workflow builder in Settings → Workflows (`/settings/workflows`)
- [x] Support for Single-step, Sequential, Parallel workflow types
- [x] Approve / Reject actions
- [x] Workflow selector in Composer
- [x] API: `GET/POST /api/workflows`, `GET /api/workflows/[id]`, `POST /api/workflows/[id]/approvals`
- [x] Database migration for approvals (`20251129_approval_workflows.sql`, `20251216000003_approvals_reference_content_items.sql`)

---

### 10. Media Library (`/media` route)
**Files:** `src/app/(dashboard)/media/`, `src/components/media/`

- [x] Media grid view with list/grid toggle
- [x] Upload modal with file drag-and-drop (`MediaUploadModal`)
- [x] Media details drawer (`MediaDetailsDrawer`)
- [x] Search, filter by type (image/video), filter by AI label
- [x] Bulk select and delete
- [x] Eye (preview) and download actions
- [x] AI labels & AI description on media items
- [x] Integration with Supabase Storage
- [x] `use-media-assets.ts` hook
- [x] Database migration (`20251202_create_media_assets.sql`)

---

### 11. Engagement Inbox (`/e` route)
**Files:** `src/app/(dashboard)/e/`, `src/app/api/engagement/`

- [x] Unified inbox UI – lists comments, mentions, DMs, likes
- [x] Filter by type (comment, mention, DM, like), platform, status
- [x] Star/archive actions
- [x] Reply interface (UI present, reply API partially stubbed)
- [x] Sidebar account list with platform icons
- [x] Search across messages
- [x] `useEngagement` hook
- [x] API: `GET /api/engagement`, `POST /api/engagement/reply`
- [x] `social_engagements` table migration (`20251208000004_social_engagements.sql`)
- ⚠️ **Reply functionality has TODO comment** – not fully wired
- ⚠️ No real-time updates (no Supabase Realtime subscriptions yet)
- ⚠️ No DM fetching from platforms yet

---

### 12. AI Assistant
**Files:** `src/lib/ai/`, `src/lib/openai/`, `src/components/features/ai/`, `src/app/api/ai/`

- [x] Caption generation (`/api/ai/generate`)
- [x] Content refining/rewriting (`/api/ai/refine`)
- [x] Hashtag suggestions (`/api/ai/hashtags`)
- [x] Content variations (`/api/ai/variations`)
- [x] AI content analysis / sentiment analysis (`/api/ai/analyze`)
- [x] AI model management (`/api/ai/models`)
- [x] `ai-content-client.tsx` component
- [x] `platform-preview-card.tsx` for AI-powered platform-specific previews
- [x] `aiContentStore.ts` Zustand store
- [x] AI shortcuts hook (`use-ai-shortcuts.ts`)
- [x] `strategy-engine.ts` for strategy recommendations
- [x] Rate limiting per plan (`plan-limits.ts`)

---

### 13. Strategy / Leverage Page (`/l` route)
**Files:** `src/app/(dashboard)/l/`, `src/hooks/use-strategy.ts`

- [x] AI-generated content ideas and strategy recommendations
- [x] Best posting times chart (`best-times-chart.tsx`)
- [x] Content ideas grid (`content-ideas-grid.tsx`)
- [x] Performance insights (`performance-insights.tsx`)
- [x] Weekly recommendations (`weekly-recommendations.tsx`)
- [x] `use-strategy.ts` hook
- ⚠️ Data is AI-generated but based on mocked/stubbed inputs rather than live platform data

---

### 14. Notifications & Team Inbox (`/i` route)
**Files:** `src/app/(dashboard)/i/`, `src/hooks/use-notifications.ts`, `src/lib/notifications.ts`

- [x] Notification types defined: `post_published`, `post_failed`, `post_approval_requested`, `post_approved`, `post_rejected`, `team_invitation`, `comment_received`, `mention`, etc.
- [x] Notifications API (`GET /api/notifications`, mark-as-read)
- [x] `use-notifications.ts` hook
- [x] `notificationStore.ts` Zustand store
- [x] Team activity feed (combined external engagement + internal team notifications)
- [x] Filter tabs: All, Team, Comments, Mentions, Likes, Follows
- ⚠️ `/i` page UI is built but not fully connected to real notification data
- ⚠️ No push notifications / browser notifications yet
- ⚠️ No email notification delivery (only DB writes)

---

### 15. Campaigns (`/campaigns` route)
**Files:** `src/app/(dashboard)/campaigns/`

- [x] Campaigns list page with status badges
- [x] Campaign create / edit / delete
- [x] Campaign status: active, paused, completed, archived
- [x] Campaign analytics preview (total posts, engagement)
- [x] API: `GET/POST /api/campaigns`, `GET/PATCH/DELETE /api/campaigns/[id]`
- ⚠️ No campaign-level calendar view
- ⚠️ No campaign budget tracking UI

---

### 16. Templates (`/templates` route)
**Files:** `src/app/(dashboard)/templates/`, `src/lib/template-engine.ts`

- [x] Template grid with filters by category and platform
- [x] Create template dialog
- [x] Delete template
- [x] Template engine (`template-engine.ts`)
- [x] `useTemplates` hook
- [x] API: `GET/POST /api/templates`, `DELETE /api/templates/[id]`
- ⚠️ No one-click "use template" that auto-fills the composer

---

### 17. Settings
**Files:** `src/app/(dashboard)/settings/`, `src/components/settings/`

- [x] Profile settings tab (account form)
- [x] Workspace settings tab (workspace form)
- [x] Team management tab (`team-management.tsx`, `team-members.tsx`)
- [x] Integrations tab (`integrations-list.tsx`)
- [x] Billing tab (`billing-settings.tsx`)
- [x] Notifications preferences tab (`notifications-form.tsx`)
- [x] Security tab (stub)
- [x] Approval Workflows sub-page (`/settings/workflows`)
- [x] Team sub-page (`/settings/team`)
- ⚠️ Security tab is a stub (no 2FA, no session management UI)

---

### 18. Billing / Razorpay
**Files:** `src/lib/razorpay/`, `src/app/api/billing/`

- [x] Razorpay client/types (`src/lib/razorpay/index.ts`, `types.ts`)
- [x] Billing history API (`/api/billing/history`)
- [x] Subscription management API (`/api/billing/subscription`)
- [x] Usage tracking API (`/api/billing/usage`)
- [x] Razorpay billing in settings UI (`billing-settings.tsx`)
- [x] Usage display component (`usage-display.tsx`)
- [x] Plan limits enforcement (`plan-limits.ts`)
- [x] Billing DB tables migration (`20251208000005_billing_tables.sql`)
- [x] Webhooks: `POST /api/webhooks/razorpay` (stubbed)
- ⚠️ Actual Razorpay checkout flow not fully wired (no live payment test confirmed)
- ⚠️ No dunning / grace period automation built
- ⚠️ Upgrade/downgrade flows incomplete

---

### 19. Scheduling / Publishing Engine
**Files:** `src/app/api/cron/`, `src/lib/platforms/`

- [x] Cron job: `/api/cron/publish` – runs every minute, publishes scheduled posts
- [x] Cron job: `/api/cron/daily-tasks` – daily aggregation / cleanup
- [x] Cron job: `/api/cron/sync-metrics` – syncs post metrics
- [x] Cron job: `/api/cron/refresh-tokens` – refreshes all OAuth tokens
- [x] Cron job: `/api/cron/refresh-twitter-tokens`
- [x] Cron job: `/api/cron/refresh-youtube-tokens`
- [x] Cron job: `/api/cron/sync-twitter-analytics`
- [x] Cron job: `/api/cron/sync-youtube-analytics`
- [x] Platform publisher (`publisher.ts`) with adapters per platform
- [x] Platform files: `facebook.ts`, `instagram.ts`, `linkedin.ts`, `tiktok.ts`, `twitter.ts`, `youtube.ts`
- [x] Retry logic with exponential backoff (3 attempts: 5min, 15min, 60min)
- [x] Publishing lock to prevent duplicate processing
- [x] Error categorization (retryable vs permanent errors)
- [x] `publish-utils.ts` and `post-publish-helpers.ts` helpers
- [x] Reschedule API (`/api/scheduling/reschedule`)
- ⚠️ Vercel cron only set up for `daily-tasks`, not `publish` (check `vercel.json`)
- ⚠️ No dead-letter queue for permanently failed posts

---

### 20. Platform Previews
**Files:** `src/components/previews/`, `src/components/features/compose/previews/`

- [x] `InstagramPreview` component
- [x] `FacebookPreview` component
- [x] `TwitterPreview` component
- ⚠️ **LinkedIn preview missing**
- ⚠️ **TikTok preview missing**
- ⚠️ **YouTube preview missing**
- ⚠️ Previews are basic, not true-to-platform fidelity (colors, fonts, UI structure are approximated)

---

### 21. Marketing Website
**Files:** `src/app/(marketing)/`, `src/components/marketing/`

- [x] Home page (`/`) – hero, features, platforms, testimonials, CTA
- [x] Pricing page (`/pricing`) – monthly/yearly toggle, plan cards, FAQ, calculator slider
- [x] Product pages: `/product/create`, `/product/plan`, `/product/approve`, `/product/collaborate`, `/product/schedule`, `/product/analyze`
- [x] Solutions pages: `/solutions/agencies`, `/solutions/brands`, `/solutions/multi-location`
- [x] Blog page (`/blog`) – static posts list (hardcoded, no CMS)
- [x] Customers page (`/customers`)
- [x] Resources section: `/resources`, `/resources/guides`, `/resources/templates`, `/resources/calculators`, `/resources/quizzes`
- [x] Support page (`/support`)
- [x] Start program page (`/start-program`)
- [x] Privacy page (`/privacy`)
- [x] `MarketingLayout` wrapper component
- [x] `TestimonialsCarousel` component
- [x] `FaqSchema` for SEO structured data
- [x] Sitemap (`sitemap.ts`) and manifest (`manifest.ts`)
- ⚠️ Blog is fully static (hardcoded posts) – no CMS, no dynamic content

---

### 22. Database Schema & RLS
**Files:** `supabase/migrations/`

- [x] RLS service role fix
- [x] RLS cycle breaker
- [x] Workspace RLS policies
- [x] Approval workflows tables
- [x] Media assets table
- [x] OAuth state table
- [x] SRS content tables (content_items, content_variants)
- [x] Public media policy
- [x] Media URL column
- [x] Content comments table
- [x] Analytics views (materialized views)
- [x] Social engagements table
- [x] Billing tables
- [x] Analytics tables (dedicated)
- [x] `content_items.drafted_at` column
- [x] External posts
- [x] Approval references to content_items
- [x] Platform posts ↔ content_items links
- [x] Backfill posts to content_items
- [x] Workspace schema upgrade
- [x] Fix workspace_members RLS recursion
- [x] Analytics optimization indexes

---

### 23. Permissions System
**Files:** `src/lib/permissions.ts`

- [x] Role types: `owner`, `admin`, `manager`, `creator`, `analyst`, `client`, `viewer`, `editor`
- [x] Role hierarchy with permission escalation
- [x] Per-resource CRUD permission definitions
- [x] `abilities` object for client-side conditional UI

---

### 24. Sync & OAuth
**Files:** `src/lib/oauth/`, `src/lib/*-sync.ts`

- [x] YouTube OAuth (`src/lib/oauth/youtube.ts`)
- [x] Facebook sync (`facebook-sync.ts`)
- [x] Instagram sync (`instagram-sync.ts`)
- [x] LinkedIn sync (`linkedin-sync.ts`)
- [x] TikTok sync (`tiktok-sync.ts`)
- [x] Twitter sync (`twitter-sync.ts`)
- [x] YouTube sync (`youtube-sync.ts`)
- [x] Lazy sync hook (`use-lazy-sync.ts`)
- [x] `use-account-sync.ts` for triggering syncs

---

### 25. Infrastructure / DevOps
**Files:** `next.config.mjs`, `vercel.json`, `.github/`, `playwright.config.ts`, `jest.setup.js`

- [x] Vercel deployment config
- [x] Single cron job in `vercel.json` (daily tasks)
- [x] Security headers middleware (`security-headers.ts`)
- [x] API error handling (`api-error.ts`, `api-middleware.ts`)
- [x] Logger (`logger.ts`)
- [x] Performance monitoring (`performance-monitoring.ts`)
- [x] Web vitals reporter component
- [x] Bundle analyzer (`@next/bundle-analyzer`)
- [x] ESLint config (`.eslintrc.json`)
- [x] Prettier config
- [x] Husky pre-commit hooks
- [x] Jest unit tests (with coverage reports)
- [x] Playwright E2E tests (`e2e/`)
- [x] `.env.example` for environment variable documentation
- [x] `check-env.js` script

---

## ⚠️ PARTIALLY IMPLEMENTED – NEEDS COMPLETION

### 1. Engagement Inbox Reply System
- **What's built:** UI for replying exists in `/e` page, `POST /api/engagement/reply` exists
- **What's missing:** Actual platform API calls to submit replies (code has `// TODO: Implement actual reply API call`)
- **Priority:** HIGH – core engagement feature

### 2. Platform Previews (LinkedIn, TikTok, YouTube)
- **What's built:** Instagram, Facebook, Twitter previews
- **What's missing:** LinkedIn preview, TikTok preview, YouTube preview components
- **Priority:** HIGH – impacts composer UX heavily

### 3. Vercel Cron – Publish Job
- **What's built:** Full `/api/cron/publish` implementation
- **What's missing:** `vercel.json` only schedules `daily-tasks`, not `publish` (every minute). Either add it or migrate to a queue-based system
- **Priority:** CRITICAL – posts won't auto-publish without this

### 4. Razorpay Checkout
- **What's built:** Razorpay SDK, billing settings UI, API routes
- **What's missing:** Full live checkout flow, webhook processing for subscription events, dunning automation
- **Priority:** HIGH for revenue

### 5. Blog / CMS
- **What's built:** Static blog page with hardcoded posts
- **What's missing:** CMS integration (even MDX files would work), dynamic blog post pages
- **Priority:** MEDIUM for marketing/SEO

### 6. Push / Email Notifications
- **What's built:** In-app notification DB writes, notification types defined
- **What's missing:** Email delivery (no email provider integrated), browser push notifications
- **Priority:** MEDIUM

### 7. Template → Composer Flow
- **What's built:** Templates CRUD, `template-engine.ts`
- **What's missing:** One-click "Use Template" button that pre-fills the composer
- **Priority:** MEDIUM

### 8. `/i` (Notifications/Influence) Page Full Wiring
- **What's built:** Page UI, filter tabs, hooks
- **What's missing:** Full data wiring, real notification rendering, real-time updates
- **Priority:** MEDIUM

### 9. Real-time Updates (Supabase Realtime)
- **What's built:** Supabase Realtime client is configured
- **What's missing:** Active subscriptions on any page (calendar, engagement, notifications)
- **Priority:** MEDIUM – would significantly improve collaborative UX

---

## ❌ NOT BUILT – BLUEPRINT FEATURES MISSING FROM CODEBASE

### 1. Social Listening
- Mentioned in blueprint but zero implementation
- Would require external data source (e.g., Twitter/X streaming, Google Trends API, or a third-party like Brandwatch)
- **Priority:** MEDIUM (advanced feature)

### 2. Audit Logs / Activity Feed
- Complete audit trail for workspace actions (post created, approved, published, user invited, etc.)
- **Priority:** MEDIUM (enterprise feature)

### 3. SSO / SAML / Enterprise Auth
- Only Supabase email/password auth is implemented
- No SAML, OKTA, Google Workspace enterprise SSO
- **Priority:** LOW (Q4 enterprise target)

### 4. Admin Panel
- No internal admin panel for viewing/managing all teams, usage, billing overrides
- **Priority:** MEDIUM for operational health

### 5. Content Recycling / Evergreen Reposts
- Scheduled evergreen content recycling system missing
- **Priority:** MEDIUM

### 6. Multi-Step Approval State Machine (Full)
- Basic approvals are built; complex parallel/sequential state transitions need thorough testing
- **Priority:** MEDIUM

### 7. LinkedIn Preview
- Only 3 of 6 platform previews exist (Instagram, Facebook, Twitter)
- **Priority:** HIGH

### 8. Engagement Predictor (AI)
- Described in blueprint as predicting engagement scores using follower patterns + trending keywords
- Only basic AI content analysis exists; no predictive scoring built
- **Priority:** MEDIUM (advanced AI feature)

### 9. Feedback/Bug Report System in App
- No in-app bug report or feedback collection mechanism
- **Priority:** LOW

### 10. White-label Reports
- Mentioned in Agency plan features; no PDF or branded report generation
- **Priority:** MEDIUM for agency sales

### 11. Client Portal / External Collaborator Portal
- External guest-only view for client approval is not built
- **Priority:** HIGH for agency use case

### 12. Custom Post Variables (Platform-specific personalization per profile)
- A Sprout-like feature where one post can have different profile-specific variables (URLs, locations)
- **Priority:** LOW

### 13. Collaboration Comment Visibility (Internal vs External)
- Comments API and schema support `visibility` field (`internal`/`external`)
- The composer/post UI doesn't visually differentiate internal vs external comments
- **Priority:** MEDIUM

---

## 🆕 2026 INDUSTRY UPDATES & NEW FEATURES TO BUILD

> Based on research from Buffer, Sprout Social, Planable (March 2026), the following capabilities are now standard or trending in the social media management SaaS market.

### 1. 🔵 Threads & Bluesky Support
- **What:** Meta's Threads and Bluesky have significant user bases now (2026). Buffer and other tools have added them.
- **Action:** Add Threads and Bluesky as publishable platforms in the accounts system and composer
- **Complexity:** Medium – OAuth for Threads (via Meta), AT Protocol API for Bluesky
- **Priority:** HIGH – competitor differentiator

### 2. 📌 Pinterest Support
- **What:** Tailwind is the dominant Pinterest tool but Sprout, Buffer, Later all now support Pinterest publishing
- **Action:** Add Pinterest as a platform channel
- **Priority:** MEDIUM

### 3. 🤖 AI-Powered Smart Scheduling (ViralPost-like)
- **What:** Instead of letting users manually pick times, analyze historical engagement data per account to surface the top 3 optimal posting times per platform per day
- **Action:** Build an `optimal-times` endpoint that queries `post_metrics_snapshots` grouped by hour/day, ranks by engagement rate, and surfaces top 3 time slots
- **Complexity:** Medium (mostly DB query + AI interpretation)
- **Priority:** HIGH

### 4. 🎯 Content Pillar / Tag Performance Analytics
- **What:** Sprout, Socialinsider, and Planable all now show analytics broken down by content pillar/tag (educational, promotional, entertainment, etc.)
- **Action:** Add tagging to posts, then filter analytics by tag. Add a "Content Pillars" view in analytics
- **Complexity:** Medium
- **Priority:** HIGH

### 5. 💬 Saved Replies / Reply Templates
- **What:** Teams often send the same replies. All major tools now have saved reply libraries for the engagement inbox
- **Action:** Add a `saved_replies` table + management UI in settings + quick-insert in the engagement inbox reply box
- **Complexity:** Low
- **Priority:** HIGH

### 6. 📊 Custom Analytics Reports (PDF Export / Report Builder)
- **What:** Agencies need branded, presentation-ready reports. Sprout charges for this as "Premium Analytics". Later, Planable all offer it now.
- **Action:** Build a report builder where users select metrics, date ranges, platforms; generate PDF via a headless Chrome/Puppeteer approach or a React-to-PDF library
- **Complexity:** High
- **Priority:** HIGH for agency tier

### 7. 🛒 Social Commerce / Link-in-Bio Page
- **What:** Buffer's "Start Page", Later's link-in-bio, and most tools now offer a customizable landing page that serves as a link-in-bio for Instagram
- **Action:** Build a simple link-in-bio page builder for each workspace/account under a `xocial.app/u/[handle]` URL
- **Complexity:** Medium
- **Priority:** MEDIUM

### 8. 📱 Mobile App (PWA or React Native)
- **What:** Buffer, Sprout, Hootsuite all have mobile apps; this is now table stakes for serious users
- **Action:** Either make the Next.js app a full PWA (manifest is already there) or plan a React Native app. PWA is faster to ship.
- **Complexity:** Low (PWA hardening) to High (native app)
- **Priority:** HIGH

### 9. 🧵 Twitter/X Thread Composer
- **What:** Thread-style posting is major on X. No tool handles single-tweet compose well without thread support.
- **Action:** Add thread composer mode in the existing composer for Twitter/X – a "+ Add to thread" button that chains tweets
- **Complexity:** Medium
- **Priority:** HIGH

### 10. 🎬 Instagram Reels / TikTok-Specific Video Scheduling
- **What:** Short-form video is the dominant content format in 2026. Need dedicated scheduling flows for Reels and TikTok.
- **Action:** Add "Reel" as a post type in the Instagram composer; add cover image, audio track, and duration fields
- **Complexity:** Medium-High
- **Priority:** HIGH

### 11. 📣 Employee Advocacy / Team Sharing
- **What:** Sprout Social's employee advocacy feature lets companies curate a content feed for employees to share on personal profiles
- **Action:** Build a "Share Pack" feature where admins curate pre-approved posts employees can reshare with one click
- **Complexity:** Medium
- **Priority:** MEDIUM

### 12. 🔔 Collision Detection in Inbox
- **What:** Sprout's "Collision Detection" prevents two team members from replying to the same message simultaneously
- **Action:** Use Supabase Realtime to broadcast "typing" or "viewing" state on engagement items; show avatar indicator when someone is already replying
- **Complexity:** Medium
- **Priority:** MEDIUM

### 13. 💡 Social Listening (Basic)
- **What:** Monitoring brand mentions, trending hashtags, competitor performance without needing to be on platforms manually. Now standard.
- **Action:** Phase 1: keyword monitoring via Twitter/X streaming API + Instagram hashtag feed. Store in `social_mentions` table. Surface in a Listening tab.
- **Complexity:** High
- **Priority:** MEDIUM

### 14. 🔗 CRM Integration (HubSpot / Notion / Slack)
- **What:** Marketing teams want social data synced with their CRM or project management tools
- **Action:** Build webhook-out system; add Slack notification integration first (easiest), then HubSpot/Notion as future integrations
- **Complexity:** Low (Slack), High (CRM)
- **Priority:** MEDIUM (Slack first)

### 15. 🏷️ Campaign Planner Enhancement
- **What:** Sprout's Campaign Planner lets you group posts by campaign, add notes, track against goals. Xocial's campaigns page is basic.
- **Action:** Add campaign tagging to calendar posts, campaign-level analytics view, goal setting per campaign
- **Complexity:** Medium
- **Priority:** HIGH

### 16. ✅ Posting Streaks / Consistency Tracker
- **What:** Buffer introduced "Streaks" to help creators build posting habits. Very popular feature.
- **Action:** Build a streak tracker (days of consecutive posts published per workspace) – show in dashboard header or analytics page
- **Complexity:** Low
- **Priority:** MEDIUM

### 17. 🔄 Content Repurposing Assistant (AI)
- **What:** AI tools that take one piece of content and reformat it for all platforms automatically
- **Action:** Add a "Repurpose" button in post cards that opens the composer pre-filled with AI-adapted variants for each platform
- **Complexity:** Medium (AI prompt + composer integration)
- **Priority:** HIGH

### 18. 🌐 Canva / Google Drive / Dropbox Integration
- **What:** Sprout, Later, Planable all integrate directly with Canva for asset creation + Drive/Dropbox for asset import
- **Action:** Add Canva "publish to Xocial" integration (via Canva's Apps API) + Google Drive / Dropbox file picker for media library imports
- **Complexity:** Medium-High
- **Priority:** MEDIUM

---

## 🚨 CRITICAL BUGS / ISSUES TO FIX BEFORE RESUMING

1. **Vercel Cron publish job not configured** – The `cron/publish` route exists with full logic but `vercel.json` only schedules `daily-tasks`. Posts will NOT auto-publish.

2. **Engagement inbox reply is stubbed** – `/e` page has `// TODO: Implement actual reply API call` and `comments-mini-modal.tsx` has `// TODO: Implement reply submission`. Users can't actually reply to comments.

3. **Only 3/6 platform previews exist** – LinkedIn, TikTok, YouTube previews missing from composer, breaking the preview experience for those platforms.

4. **Blog is fully hardcoded** – No CMS. All blog posts are static data. Adding new posts requires code deploy.

5. **Razorpay webhooks are not fully wired** – Payment events won't trigger workspace upgrades/downgrades automatically.

6. **No real-time collaboration** – The calendar and engagement inbox have no live updates. Two users editing simultaneously would see stale data.

---

## 🗓️ RECOMMENDED RESUMPTION ROADMAP

### 🔴 Week 1–2: Fix Critical Bugs
- [ ] Add `publish` cron to `vercel.json` OR migrate to Supabase Edge Functions queue
- [ ] Wire engagement inbox reply API calls
- [ ] Add LinkedIn preview component
- [ ] Test end-to-end post schedule → publish flow

### 🟠 Week 3–4: Complete Half-Done Features
- [ ] Add TikTok + YouTube previews
- [ ] Wire templates "Use Template" → composer flow
- [ ] Complete `/i` (notifications) page with real data
- [ ] Add Supabase Realtime to calendar and engagement inbox

### 🟡 Month 2: New High-Priority Features
- [ ] Smart Scheduling (optimal time suggestions based on historical data)
- [ ] Twitter/X Thread Composer
- [ ] Saved Replies for Engagement Inbox
- [ ] Campaign Planner enhancement (post tagging, campaign analytics)
- [ ] Content Repurposing AI button

### 🟢 Month 3: Market Differentiation
- [ ] Threads and Bluesky platform support
- [ ] Custom Analytics Report Builder (PDF export)
- [ ] Client Portal / External Approver view
- [ ] Instagram Reels and TikTok video scheduling flow
- [ ] PWA hardening (offline support, add-to-homescreen, push notifications)
- [ ] Posting Streaks / consistency tracker

### 🔵 Month 4+: Scale & Enterprise
- [ ] Social Listening (keyword monitoring, brand mentions)
- [ ] Slack integration for notifications
- [ ] Employee Advocacy / Share Packs
- [ ] Admin Panel (internal usage visibility)
- [ ] Audit Logs
- [ ] White-label PDF reports for agencies
- [ ] Pinterest support

---

## 📁 ROUTE MAP (Quick Reference)

| Route | Name | Status |
|-------|------|--------|
| `/` | Marketing Home | ✅ |
| `/pricing` | Pricing Page | ✅ |
| `/product/*` | Product Pages (6) | ✅ |
| `/solutions/*` | Solutions Pages (3) | ✅ |
| `/blog` | Blog (static) | ⚠️ |
| `/resources/*` | Resources | ✅ |
| `/auth/login` | Login | ✅ |
| `/auth/signup` | Signup | ✅ |
| `/auth/forgot-password` | Forgot Password | ✅ |
| `/auth/reset-password` | Reset Password | ✅ |
| `/c` | Composer | ✅ |
| `/o` | Calendar | ✅ |
| `/x` | Accounts/Channels | ✅ |
| `/a` | Analytics | ✅ |
| `/e` | Engagement Inbox | ⚠️ |
| `/i` | Notifications/Team | ⚠️ |
| `/l` | AI Strategy/Leverage | ⚠️ |
| `/posts` | Posts List | ✅ |
| `/media` | Media Library | ✅ |
| `/approvals` | Approvals Board | ✅ |
| `/campaigns` | Campaigns | ⚠️ |
| `/templates` | Templates | ✅ |
| `/settings` | Settings (all tabs) | ✅ |
| `/settings/workflows` | Workflow Builder | ✅ |
| `/settings/team` | Team Management | ✅ |

---

## 🔑 KEY TECH STACK (Confirmed from Codebase)

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js | 14.2.15 |
| Database + Auth | Supabase | Latest |
| UI Kit | ShadCN + Tailwind | Tailwind 3.x |
| State Management | Zustand | 5.x |
| Server State | TanStack React Query | 5.x |
| AI SDK | @ai-sdk/openai + ai | 4.x + 1.x |
| Charts | Recharts | 2.x |
| Animations | Framer Motion | 11.x |
| Forms | React Hook Form + Zod | 7.x + 3.x |
| Date Handling | date-fns | 4.x |
| Notifications (UI) | Sonner | 1.x |
| Billing | Razorpay | 2.x |
| Hosting | Vercel | - |
| Testing (Unit) | Jest | - |
| Testing (E2E) | Playwright | 1.x |

---

*This document was generated on March 22, 2026, based on a full codebase audit of the Xocial repository. Treat this as the canonical source for project status before resuming development.*
