# Xocial - AI-Powered Social Media Management Platform

<div align="center">

![Xocial](https://img.shields.io/badge/Xocial-AI%20Social%20Management-blue)
![Next.js](https://img.shields.io/badge/Next.js-15.5+-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)
![Supabase](https://img.shields.io/badge/Supabase-Database-green)
![License](https://img.shields.io/badge/License-Proprietary-red)

Enterprise-grade social media management platform with AI-powered content creation, automated publishing, and comprehensive analytics.

[Documentation](#documentation) • [Features](#features) • [Getting Started](#getting-started) • [Architecture](#architecture)

</div>

---

## 📖 Overview

Xocial is a comprehensive social media management platform that enables businesses and creators to:

- 📱 **Manage Multiple Platforms** - Connect Facebook, Instagram, Twitter, LinkedIn, YouTube, and TikTok
- 🤖 **AI-Powered Content Creation** - Generate engaging content with GPT-4
- 📅 **Smart Scheduling** - Auto-publish at optimal times
- 📊 **Advanced Analytics** - Track performance across all platforms
- 👥 **Team Collaboration** - Multi-user workspaces with role-based access
- 🎯 **Strategy Recommendations** - AI-driven insights to grow your audience

---

## ✨ Features

### Core Features
- ✅ Multi-account management (6 platforms)
- ✅ AI content generation with multiple tones and styles
- ✅ Automated post scheduling and publishing
- ✅ Real-time engagement metrics
- ✅ Content calendar with drag-and-drop
- ✅ Media library with AI-powered tagging
- ✅ Post templates with variable support
- ✅ Campaign management and tracking

### Advanced Features
- ✅ AI strategy engine with performance analysis
- ✅ Best posting time recommendations
- ✅ Content idea generation
- ✅ Comparative analytics across platforms
- ✅ Real-time dashboard with live updates
- ✅ Team collaboration with invitations
- ✅ Notification system
- ✅ Analytics export (CSV, JSON)

### Technical Features
- ✅ React Query for efficient data fetching
- ✅ Optimistic UI updates
- ✅ Error boundaries and comprehensive error handling
- ✅ Performance monitoring (Web Vitals)
- ✅ Query performance tracking
- ✅ Security headers and encryption
- ✅ Webhook signature verification
- ✅ CI/CD pipeline with automated testing
- ✅ Health monitoring endpoint

---

## 🏗️ Architecture

### Technology Stack

**Frontend:**
- Next.js 15.5+ (App Router)
- React 18+ with Server Components
- TypeScript 5+
- Tailwind CSS 3.4+
- React Query (TanStack Query)
- Zustand (State Management)
- Framer Motion (Animations)

**Backend:**
- Next.js API Routes
- Supabase (PostgreSQL + Auth)
- Row Level Security (RLS)
- Vercel Edge Functions
- Vercel Cron Jobs

**AI & APIs:**
- OpenAI GPT-4 (Content Generation)
- OpenAI Vision (Image Analysis)
- Platform APIs (Facebook, Instagram, Twitter, etc.)

**DevOps:**
- Vercel (Hosting & Deployment)
- GitHub Actions (CI/CD)
- Jest (Testing)
- Bundle Analyzer (Performance)

### Project Structure

```
xocial/
├── src/
│   ├── app/                    # Next.js app router
│   │   ├── (dashboard)/        # Dashboard pages
│   │   │   ├── x/              # Account management
│   │   │   ├── o/              # Content calendar
│   │   │   ├── c/              # AI content creation
│   │   │   ├── a/              # Analytics
│   │   │   ├── l/              # Strategy & Learn
│   │   │   ├── compose/        # Post composer
│   │   │   ├── templates/      # Content templates
│   │   │   ├── media/          # Media library
│   │   │   ├── campaigns/      # Campaign management
│   │   │   └── settings/       # Settings & team
│   │   ├── api/                # API routes
│   │   │   ├── auth/           # Authentication
│   │   │   ├── posts/          # Posts CRUD
│   │   │   ├── accounts/       # Social accounts
│   │   │   ├── analytics/      # Analytics data
│   │   │   ├── ai/             # AI generation
│   │   │   ├── strategy/       # Strategy recommendations
│   │   │   ├── oauth/          # OAuth callbacks
│   │   │   ├── webhooks/       # Platform webhooks
│   │   │   ├── cron/           # Automated jobs
│   │   │   ├── team/           # Team management
│   │   │   ├── media/          # Media upload
│   │   │   └── campaigns/      # Campaigns CRUD
│   │   └── auth/               # Auth pages
│   ├── components/
│   │   ├── ui/                 # Atomic UI components
│   │   ├── shared/             # Shared components
│   │   ├── features/           # Feature-specific
│   │   └── layouts/            # Layout components
│   ├── lib/                    # Utility libraries
│   │   ├── supabase/           # Supabase clients
│   │   ├── oauth/              # OAuth clients
│   │   ├── platforms/          # Platform publishers
│   │   ├── ai/                 # AI engines
│   │   ├── security.ts         # Security utilities
│   │   ├── logger.ts           # Logging system
│   │   ├── env.ts              # Environment validation
│   │   ├── react-query.ts      # Query configuration
│   │   └── ...
│   ├── hooks/                  # Custom React hooks
│   ├── store/                  # Zustand stores
│   ├── types/                  # TypeScript types
│   └── styles/                 # Global styles
├── supabase/
│   └── migrations/             # Database migrations
├── tests/                      # Test files
├── public/                     # Static assets
└── scripts/                    # Utility scripts
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Supabase account
- OpenAI API key
- Social media platform developer accounts (for OAuth)

### Installation

1. **Clone and install dependencies:**
```bash
cd xocial
npm install
```

2. **Configure environment:**
```bash
# Copy example env file
cp .env.example .env.local

# Generate security keys
openssl rand -hex 32  # For ENCRYPTION_KEY
openssl rand -base64 32  # For CRON_SECRET

# Edit .env.local with your values
```

3. **Set up database:**
```bash
# Run migrations (if using Supabase CLI)
npx supabase db push

# Or run migrations manually in Supabase dashboard
```

4. **Start development server:**
```bash
npm run dev
```

5. **Open browser:**
```
http://localhost:3000
```

### First-Time Setup

1. **Create Account** - Sign up with email/password
2. **Connect Platform** - Navigate to /x and connect your first social account
3. **Create Post** - Use AI to generate content in /c
4. **Schedule** - Set publish time in /o calendar
5. **Monitor** - Watch analytics in /a dashboard

---

## 📚 Documentation

- **[Xocial SRS.md](./Xocial%20SRS.md)** - Complete Software Requirements Specification
- **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)** - Implementation details and what's been built
- **[QUICK_START.md](./QUICK_START.md)** - Quick start guide with checklists
- **[OAUTH_CALLBACK_URLS.md](./OAUTH_CALLBACK_URLS.md)** - OAuth configuration guide

---

## 🏃 Development Commands

```bash
# Development
npm run dev              # Start dev server with env check
npm run dev:skip-check   # Start without env check

# Building
npm run build            # Production build
npm start                # Start production server

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint errors
npm run type-check       # TypeScript type check

# Testing
npm test                 # Run all tests
npm run test:watch       # Watch mode
npm run test:coverage    # Generate coverage report
npm run test:ci          # CI mode with coverage

# Analysis
npm run analyze          # Analyze bundle size
npm run check-env        # Validate environment variables
```

---

## 🔐 Security Features

- **Authentication:** Supabase Auth with JWT tokens
- **Authorization:** Row Level Security (RLS) at database
- **Encryption:** AES-256-GCM for sensitive tokens
- **Headers:** CSP, HSTS, X-Frame-Options, etc.
- **Input Validation:** Zod schemas on all inputs
- **Webhook Security:** HMAC signature verification
- **CSRF Protection:** Token generation and validation
- **Rate Limiting:** IP-based with exponential backoff

---

## 📊 Monitoring & Logging

### Health Check
```bash
curl https://yourapp.com/api/health
```

### Logs
- **Application Logs:** Centralized logger with structured context
- **Query Performance:** Automatic slow query detection
- **Web Vitals:** Real-time performance monitoring
- **Error Tracking:** Error boundary with Sentry integration (optional)

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Watch mode for development
npm run test:watch

# Coverage report
npm run test:coverage

# CI mode (used in GitHub Actions)
npm run test:ci
```

### Test Coverage
- Unit tests for utilities and components
- Integration tests for API routes
- E2E tests (infrastructure ready)
- Coverage threshold: 80%

---

## 🚢 Deployment

### Vercel (Recommended)

1. **Connect Repository:**
   - Import project in Vercel dashboard
   - Select GitHub repository

2. **Configure Environment:**
   - Add all environment variables
   - Set CRON_SECRET for automated jobs

3. **Deploy:**
   ```bash
   vercel --prod
   ```

### Manual Deployment

```bash
# Build application
npm run build

# Start production server
npm start
```

---

## 📈 Performance

Target metrics (from SRS):
- **Page Load:** < 2 seconds ✓
- **API Response:** < 500ms ✓
- **Database Query:** < 100ms ✓
- **LCP:** < 2.5s ✓
- **FID:** < 100ms ✓
- **CLS:** < 0.1 ✓

---

## 🤝 Contributing

This is a proprietary project. For issues or questions, contact the development team.

---

## 📝 License

Proprietary - All rights reserved

---

## 🙏 Acknowledgments

Built with:
- [Next.js](https://nextjs.org/)
- [Supabase](https://supabase.com/)
- [OpenAI](https://openai.com/)
- [Vercel](https://vercel.com/)
- [React Query](https://tanstack.com/query)
- [Tailwind CSS](https://tailwindcss.com/)

---

## 📧 Support

For support and questions:
- Check documentation in `/docs`
- Review implementation summary
- Check health endpoint for system status

---

**Built following enterprise-grade best practices and SRS specifications.**

**Status:** ✅ Production Ready (pending OAuth configuration)

**Last Updated:** November 2, 2025

