# XOCIAL – Elite SRS Documentation for Trae AI Development

## Executive Technical Architecture Overview

This is your definitive blueprint for building XOCIAL with Trae AI. Every component, flow, and interaction pattern is mapped for deterministic code generation. This document eliminates ambiguity and provides atomic, implementable specifications.

---

## 0. Document Philosophy & AI Development Strategy

### 0.1 Core Directive
This SRS transforms XOCIAL into **discrete, AI-generatable units** where:
- Each feature = **1 clear prompt** to Trae AI
- Every UI component has **explicit layout mathematics**
- All flows include **state machines** with entry/exit conditions
- Database schemas are **migration-ready**
- Error boundaries are **predefined at every layer**

### 0.2 Stack Alignment Mandate

```
Frontend Layer:    Next.js 14+ (App Router) + ShadCN/UI + Tailwind CSS
Backend Layer:     Next.js API Routes + Supabase (PostgreSQL + Auth + RLS)
AI Layer:          Vercel AI Gateway (unified model routing)
Deployment:        Vercel (with Preview Deploys)
Observability:     Vercel Analytics + Supabase Logs + Custom Error Tracking
```

**Critical:** Every technology choice optimizes for:
1. **Speed** (React Server Components, streaming)
2. **Security** (RLS policies, server-only API keys)
3. **Scalability** (stateless routes, connection pooling)
4. **AI-friendliness** (structured prompts, typed responses)

---

## 1. Product Vision & User Journey Architecture

### 1.1 Refined Product Statement

**XOCIAL** = AI-Native Social Command Center

**Target Segments:**
- **Tier 1:** Solo creators (1-3 accounts)
- **Tier 2:** Agencies (5-50 accounts, team roles)
- **Tier 3:** Enterprises (unlimited accounts, advanced permissions)

**Value Proposition Matrix:**

| User Need | XOCIAL Solution | Competitive Advantage |
|-----------|----------------|----------------------|
| Account chaos | Unified multi-platform hub | 1-click OAuth, real-time sync |
| Content bottleneck | AI generation in <3s | Vercel AI Gateway with streaming |
| Calendar blindness | Visual month/week/day views | Drag-drop scheduling |
| Insight overload | AI-summarized analytics | Natural language insights |

### 1.2 Macro User Journey (State Machine)

```
ENTRY STATE: Unauthenticated User
    ↓
    [Supabase Auth] → Sign Up/Login
    ↓
STATE 1: Authenticated + Empty Workspace
    ↓
    [X Page] → Connect First Account (OAuth)
    ↓
STATE 2: Account Connected
    ↓
    Parallel branches:
    ├─→ [O Page] → View/Schedule Content
    ├─→ [C Page] → Generate AI Content
    └─→ [A Page] → View Analytics
    ↓
STATE 3: Active User Loop
    ↓
    Continuous cycle: Create → Schedule → Analyze → Iterate
    ↓
FUTURE STATES: 
    [I Page] → Collaborate (Phase 2)
    [L Page] → Strategic Planning (Phase 2)
```

**State Persistence:**
- Zustand store tracks: `currentWorkspace`, `selectedAccounts`, `activeDate`
- Supabase stores: all persistent data with RLS
- Session state: JWT in httpOnly cookie

---

## 2. Deep Technical Stack Specification

### 2.1 Frontend Architecture

#### 2.1.1 Next.js 14+ Configuration

**App Router Structure:**
```
/app
  /layout.tsx                 → Root layout (providers, fonts)
  /page.tsx                   → Landing/Marketing page
  /(auth)
    /login/page.tsx
    /signup/page.tsx
  /(platform)                 → Protected routes group
    /layout.tsx               → Shell with TopNav + Sidebar
    /x/page.tsx               → Account Management
    /o/page.tsx               → Calendar
    /c/page.tsx               → AI Creator
    /i/page.tsx               → Influence (Coming Soon)
    /a/page.tsx               → Analytics
    /l/page.tsx               → Leverage (Coming Soon)
  /api                        → Backend routes
    /auth/[...supabase]/route.ts
    /accounts/route.ts
    /posts/route.ts
    /analytics/route.ts
    /ai/generate/route.ts
```

**Key Patterns:**
- **Server Components** by default (RSC for initial render speed)
- **Client Components** only when needed (`'use client'` for interactivity)
- **Streaming SSR** for analytics dashboards
- **Parallel Routes** for modals/drawers

#### 2.1.2 ShadCN/UI Implementation Strategy

**Design Token System:**

```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        // Base neutrals
        background: 'hsl(var(--background))',     // #FAFAFA
        foreground: 'hsl(var(--foreground))',     // #0A0A0A
        
        // Brand accent gradient
        primary: {
          DEFAULT: 'hsl(var(--primary))',         // Cosmic Teal #14B8A6
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',       // Soft Purple #A78BFA
          foreground: 'hsl(var(--secondary-foreground))',
        },
        
        // Semantic colors
        success: 'hsl(var(--success))',           // #10B981
        warning: 'hsl(var(--warning))',           // #F59E0B
        destructive: 'hsl(var(--destructive))',   // #EF4444
        
        // Surface layers
        card: 'hsl(var(--card))',
        popover: 'hsl(var(--popover))',
        muted: 'hsl(var(--muted))',
      },
      
      borderRadius: {
        lg: 'var(--radius)',      // 12px
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      
      fontSize: {
        // Hierarchical type scale
        'display': ['3.5rem', { lineHeight: '1.1', fontWeight: '700' }],
        'h1': ['2.5rem', { lineHeight: '1.2', fontWeight: '600' }],
        'h2': ['2rem', { lineHeight: '1.3', fontWeight: '600' }],
        'h3': ['1.5rem', { lineHeight: '1.4', fontWeight: '600' }],
        'body': ['1rem', { lineHeight: '1.5', fontWeight: '400' }],
        'small': ['0.875rem', { lineHeight: '1.4', fontWeight: '400' }],
        'caption': ['0.75rem', { lineHeight: '1.3', fontWeight: '500' }],
      },
      
      boxShadow: {
        'soft': '0 2px 8px rgba(0, 0, 0, 0.04)',
        'medium': '0 4px 16px rgba(0, 0, 0, 0.08)',
        'strong': '0 8px 32px rgba(0, 0, 0, 0.12)',
        'glow': '0 0 20px rgba(20, 184, 166, 0.3)',
      },
      
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
    require('@tailwindcss/typography'),
  ],
}
```

**Component Catalog (ShadCN):**

**Navigation:**
- `NavigationMenu` → Top nav with dropdowns
- `Tabs` → Page section switchers
- `Breadcrumb` → Hierarchical navigation

**Data Display:**
- `Card` → Primary container (accounts, posts, insights)
- `Table` → Sortable data grids
- `Badge` → Status indicators (draft/published/failed)
- `Avatar` → Profile pictures with fallback initials
- `Separator` → Visual section dividers

**Input Controls:**
- `Button` → All CTAs (variants: default, outline, ghost, destructive)
- `Input` → Text fields with validation states
- `Textarea` → Multi-line content (briefs, captions)
- `Select` → Dropdowns (platform, tone, audience)
- `Checkbox` / `Switch` → Binary options
- `DatePicker` → Calendar date selection
- `Combobox` → Searchable select (account picker)

**Feedback:**
- `Toast` → Transient notifications (success/error)
- `Dialog` → Modal overlays (confirmations, forms)
- `Sheet` → Side panels (post details, comments)
- `Popover` → Contextual info tooltips
- `Progress` → Loading indicators
- `Skeleton` → Content placeholders while loading

**Visualization:**
- `Recharts` integration → Line, bar, pie charts
- Custom `MetricCard` → KPI displays with trend arrows

#### 2.1.3 Animation & Micro-Interaction Library

**Framer Motion Integration Points:**

```typescript
// Shared animation variants
export const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.3, ease: 'easeOut' }
}

export const staggerContainer = {
  animate: { transition: { staggerChildren: 0.1 } }
}

export const scaleOnHover = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.98 }
}
```

**Usage Map:**
- **Card hover states:** Subtle lift + shadow increase
- **Button clicks:** Scale down momentarily
- **Modal entry:** Fade + slide from bottom
- **Calendar navigation:** Slide left/right with momentum
- **AI generation:** Pulsing skeleton → fade-in results
- **Chart updates:** Smooth number transitions

---

### 2.2 Backend & Data Layer

#### 2.2.1 Supabase Database Schema (Complete)

**Core Tables:**

```sql
-- ============================================
-- USERS & AUTHENTICATION (Supabase Auth)
-- ============================================
-- Supabase handles users table automatically
-- We extend with profiles

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TEAMS & MULTI-TENANT STRUCTURE
-- ============================================

CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL, -- URL-safe identifier
  plan_tier TEXT DEFAULT 'free', -- free/pro/enterprise
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  settings JSONB DEFAULT '{}', -- theme, locale, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE team_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'manager', 'creator', 'analyst')),
  permissions JSONB DEFAULT '{}', -- granular permissions
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  joined_at TIMESTAMPTZ,
  UNIQUE(team_id, user_id)
);

-- ============================================
-- SOCIAL ACCOUNTS (Multi-Platform)
-- ============================================

CREATE TABLE social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'facebook', 'twitter', 'youtube', 'linkedin', 'tiktok')),
  
  -- Account identity
  external_id TEXT NOT NULL, -- Platform's user ID
  username TEXT NOT NULL,
  display_name TEXT,
  profile_picture_url TEXT,
  
  -- OAuth credentials (ENCRYPTED)
  access_token TEXT, -- Encrypted at rest
  refresh_token TEXT, -- Encrypted at rest
  token_expires_at TIMESTAMPTZ,
  
  -- Account metadata
  follower_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  post_count INTEGER DEFAULT 0,
  
  -- Status tracking
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'syncing', 'error', 'disconnected')),
  last_synced_at TIMESTAMPTZ,
  sync_error TEXT,
  
  -- Audit
  connected_by UUID REFERENCES profiles(id),
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(team_id, platform, external_id)
);

CREATE INDEX idx_social_accounts_team ON social_accounts(team_id);
CREATE INDEX idx_social_accounts_status ON social_accounts(status);

-- ============================================
-- SOCIAL POSTS (Historical & Scheduled)
-- ============================================

CREATE TABLE social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  account_id UUID REFERENCES social_accounts(id) ON DELETE CASCADE,
  
  -- Post identity
  external_id TEXT, -- Platform's post ID (null for drafts)
  post_type TEXT CHECK (post_type IN ('feed', 'story', 'reel', 'video', 'carousel', 'tweet', 'article')),
  
  -- Content
  caption TEXT,
  media_urls TEXT[], -- Array of image/video URLs
  hashtags TEXT[],
  mentions TEXT[],
  
  -- Publishing metadata
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'failed')),
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  
  -- Metrics snapshot (updated periodically)
  metrics JSONB DEFAULT '{}', -- {likes, comments, shares, saves, impressions, reach}
  last_metrics_fetch TIMESTAMPTZ,
  
  -- AI generation metadata
  ai_generated BOOLEAN DEFAULT FALSE,
  ai_prompt TEXT,
  ai_model TEXT,
  
  -- Audit
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_social_posts_team ON social_posts(team_id);
CREATE INDEX idx_social_posts_account ON social_posts(account_id);
CREATE INDEX idx_social_posts_scheduled ON social_posts(scheduled_at) WHERE status = 'scheduled';
CREATE INDEX idx_social_posts_status ON social_posts(status);

-- ============================================
-- COMMENTS & ENGAGEMENT
-- ============================================

CREATE TABLE social_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES social_posts(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL, -- Platform's comment ID
  
  -- Comment data
  author_name TEXT NOT NULL,
  author_username TEXT,
  author_profile_url TEXT,
  text TEXT NOT NULL,
  
  -- Threading
  parent_comment_id UUID REFERENCES social_comments(id) ON DELETE CASCADE,
  
  -- Reply tracking
  replied_by_user BOOLEAN DEFAULT FALSE, -- Did XOCIAL user reply?
  reply_text TEXT,
  replied_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(post_id, external_id)
);

CREATE INDEX idx_social_comments_post ON social_comments(post_id);

-- ============================================
-- ANALYTICS & INSIGHTS
-- ============================================

CREATE TABLE post_metrics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES social_posts(id) ON DELETE CASCADE,
  captured_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Raw metrics
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  video_views INTEGER DEFAULT 0,
  
  -- Engagement rate (calculated)
  engagement_rate DECIMAL(5,2),
  
  UNIQUE(post_id, captured_at)
);

CREATE INDEX idx_metrics_snapshots_post ON post_metrics_snapshots(post_id);
CREATE INDEX idx_metrics_snapshots_time ON post_metrics_snapshots(captured_at);

CREATE TABLE ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  
  -- Insight metadata
  insight_type TEXT CHECK (insight_type IN ('performance', 'trend', 'recommendation', 'anomaly')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  
  -- Context
  date_range TSTZRANGE, -- Time period analyzed
  affected_accounts UUID[], -- Array of social_account IDs
  related_posts UUID[], -- Array of social_post IDs
  
  -- Data
  confidence_score DECIMAL(3,2), -- 0.00 to 1.00
  action_items TEXT[], -- Suggested next steps
  
  -- AI provenance
  model_used TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_insights_team ON ai_insights(team_id);

-- ============================================
-- FEATURE WAITLIST (I & L Pages)
-- ============================================

CREATE TABLE feature_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  feature_name TEXT NOT NULL CHECK (feature_name IN ('influence', 'leverage')),
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, feature_name)
);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_metrics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Teams: members can view their teams
CREATE POLICY "Team members can view team" ON teams
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_memberships
      WHERE team_memberships.team_id = teams.id
      AND team_memberships.user_id = auth.uid()
    )
  );

-- Team memberships: members can view team roster
CREATE POLICY "Team members can view memberships" ON team_memberships
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM team_memberships tm
      WHERE tm.team_id = team_memberships.team_id
      AND tm.user_id = auth.uid()
    )
  );

-- Social accounts: enforce team isolation
CREATE POLICY "Team members can view accounts" ON social_accounts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_memberships
      WHERE team_memberships.team_id = social_accounts.team_id
      AND team_memberships.user_id = auth.uid()
    )
  );

-- Social posts: enforce team isolation + role-based write
CREATE POLICY "Team members can view posts" ON social_posts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_memberships
      WHERE team_memberships.team_id = social_posts.team_id
      AND team_memberships.user_id = auth.uid()
    )
  );

CREATE POLICY "Creators can create posts" ON social_posts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_memberships
      WHERE team_memberships.team_id = social_posts.team_id
      AND team_memberships.user_id = auth.uid()
      AND team_memberships.role IN ('owner', 'admin', 'manager', 'creator')
    )
  );

-- Apply similar patterns to other tables...
```

#### 2.2.2 Next.js API Route Architecture

**Standard Route Structure:**

```typescript
// app/api/accounts/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // 1. Verify authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // 2. Extract query parameters
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('team_id')
    
    // 3. Fetch data with RLS automatically enforced
    const { data: accounts, error } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    // 4. Return structured response
    return NextResponse.json({ accounts }, { status: 200 })
    
  } catch (error) {
    console.error('[API Error] /api/accounts:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch accounts',
        hint: 'Please try again or contact support'
      },
      { status: 500 }
    )
  }
}
```

**Error Handling Pattern:**

```typescript
// lib/api-error-handler.ts
export class APIError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public hint?: string
  ) {
    super(message)
  }
}

export function handleAPIError(error: unknown) {
  if (error instanceof APIError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        hint: error.hint
      },
      { status: error.statusCode }
    )
  }
  
  // Log unexpected errors
  console.error('[Unexpected API Error]:', error)
  
  return NextResponse.json(
    {
      error: 'An unexpected error occurred',
      code: 'INTERNAL_ERROR',
      hint: 'Please try again later'
    },
    { status: 500 }
  )
}
```

---

### 2.3 AI Integration via Vercel AI Gateway

#### 2.3.1 Gateway Configuration

**Environment Variables:**
```bash
VERCEL_AI_GATEWAY_URL=https://gateway.vercel.ai/v1
VERCEL_AI_GATEWAY_KEY=vag_xxxxxxxx
OPENAI_MODEL=gpt-4-turbo-preview
```

**Gateway Route Handler:**

```typescript
// app/api/ai/generate/route.ts
import { NextResponse } from 'next/server'

interface GenerateRequest {
  brief: string
  platforms: string[]
  tone: string
  audience: string
  previousMetrics?: object
}

export async function POST(request: Request) {
  try {
    const body: GenerateRequest = await request.json()
    
    // Construct structured prompt
    const systemPrompt = `You are a social media content expert. Generate engaging content based on the user's brief.
    
Output format:
{
  "captions": [
    { "platform": "instagram", "text": "..." },
    { "platform": "twitter", "text": "..." }
  ],
  "hashtags": ["#example", "#content"],
  "strategy_notes": ["Post at 7pm for max engagement", "..."],
  "variations": ["Alternative caption 1", "Alternative caption 2"]
}`

    const userPrompt = `Brief: ${body.brief}
Platforms: ${body.platforms.join(', ')}
Tone: ${body.tone}
Audience: ${body.audience}`

    // Call Vercel AI Gateway
    const response = await fetch(process.env.VERCEL_AI_GATEWAY_URL!, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.VERCEL_AI_GATEWAY_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    })
    
    if (!response.ok) {
      throw new Error(`AI Gateway error: ${response.statusText}`)
    }
    
    const data = await response.json()
    const content = data.choices[0].message.content
    
    // Parse JSON response
    const suggestions = JSON.parse(content)
    
    return NextResponse.json({ suggestions }, { status: 200 })
    
  } catch (error) {
    console.error('[AI Generation Error]:', error)
    return NextResponse.json(
      {
        error: 'AI generation failed',
        hint: 'You can still write content manually',
        fallback: true
      },
      { status: 500 }
    )
  }
}
```

#### 2.3.2 Streaming AI Responses (Advanced)

```typescript
// For real-time caption generation feedback
import { OpenAIStream, StreamingTextResponse } from 'ai'

export async function POST(request: Request) {
  const { brief } = await request.json()
  
  const response = await fetch(process.env.VERCEL_AI_GATEWAY_URL!, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.VERCEL_AI_GATEWAY_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4-turbo-preview',
      messages: [{ role: 'user', content: brief }],
      stream: true
    })
  })
  
  const stream = OpenAIStream(response)
  return new StreamingTextResponse(stream)
}
```

---

### 2.4 Security Architecture

#### 2.4.1 OAuth Token Encryption

**Storage Strategy:**
- **Never** expose tokens to client
- Encrypt at rest using Supabase's built-in encryption
- Refresh tokens proactively (cron job)

**Example: Instagram OAuth Flow**

```typescript
// app/api/auth/instagram/callback/route.ts
import { encrypt } from '@/lib/encryption'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  
  // Exchange code for tokens
  const tokenResponse = await fetch('https://api.instagram.com/oauth/access_token', {
    method: 'POST',
    body: new URLSearchParams({
      client_id: process.env.INSTAGRAM_CLIENT_ID!,
      client_secret: process.env.INSTAGRAM_CLIENT_SECRET!,
      grant_type: 'authorization_code',
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/instagram/callback`,
      code
    })
  })
  
  const tokens = await tokenResponse.json()
  
  // Store encrypted tokens (server-side only)
  await supabase.from('social_accounts').insert({
    team_id: currentTeamId,
    platform: 'instagram',
    external_id: tokens.user_id,
    username: tokens.username,
    access_token: encrypt(tokens.access_token), // ENCRYPTED
    refresh_token: encrypt(tokens.refresh_token), // ENCRYPTED
    token_expires_at: new Date(Date.now() + tokens.expires_in * 1000)
  })
  
  return NextResponse.redirect('/x?success=instagram_connected')
}
```

#### 2.4.2 RLS Policy Examples (Expanded)

```sql
-- Analysts can only READ analytics, not write posts
CREATE POLICY "Analysts read-only access" ON social_posts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_memberships
      WHERE team_memberships.team_id = social_posts.team_id
      AND team_memberships.user_id = auth.uid()
      AND team_memberships.role = 'analyst'
    )
  );

-- Prevent deletion unless admin/owner
CREATE POLICY "Only admins can delete posts" ON social_posts
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM team_memberships
      WHERE team_memberships.team_id = social_posts.team_id
      AND team_memberships.user_id = auth.uid()
      AND team_memberships.role IN ('owner', 'admin')
    )
  );
```

---

### 2.5 Deployment & Performance Optimization

#### 2.5.1 Vercel Configuration

**vercel.json:**
```json
{
  "buildCommand": "npm run build",
  "framework": "nextjs",
  "regions": ["iad1", "sfo1"],
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "@supabase-url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase-anon-key",
    "SUPABASE_SERVICE_ROLE_KEY": "@supabase-service-key",
    "VERCEL_AI_GATEWAY_KEY": "@ai-gateway-key"
  },
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "/api/:path*"
    }
  ],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "no-store" }
      ]
    }
  ]
}
```

#### 2.5.2 Performance Targets

| Metric | Target | Strategy |
|--------|--------|----------|
| **First Contentful Paint** | <1.2s | Server Components, font optimization |
| **Time to Interactive** | <2.5s | Code splitting, lazy loading |
| **API Response Time** | <300ms (p95) | Connection pooling, indexed queries |
| **AI Generation** | <3s | Streaming responses, optimistic UI |
| **Calendar Load** | <1s | Prefetch adjacent months |

---

## 3. Page-by-Page Detailed Specifications

### 3.1 X – Multi-Account Management (Command Center)

#### 3.1.1 Visual Design Specification

**Layout Mathematics:**

```
┌─────────────────────────────────────────────────────────────┐
│ TopNav (h: 64px)                                            │
│ ┌─────────┬─────────────────────────────────────────────┐  │
│ │ Logo    │ Search │ Profile │ Workspace Selector      │  │
│ └─────────┴─────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│ Sidebar  │ Main Content Area                              │
│ (240px)  │                                                 │
│          │ ┌───────────────────────────────────────────┐  │
│ X        │ │ HeaderRow (h: 80px)                       │  │
│ O        │ │ ├─ Title: "X – Accounts"                  │  │
│ C        │ │ ├─ CTA: "Connect New Account"             │  │
│ I        │ │ └─ Filters: Platform • Status • Team      │  │
│ A        │ └───────────────────────────────────────────┘  │
│ L        │                                                 │
│          │ ┌───────────────────────────────────────────┐  │
│          │ │ AccountGrid (gap: 24px)                   │  │
│          │ │ ┌─────────┬─────────┬─────────┐          │  │
│          │ │ │ Account │ Account │ Account │ [3 cols] │  │
│          │ │ │ Card    │ Card    │ Card    │          │  │
│          │ │ │ 360px   │ 360px   │ 360px   │          │  │
│          │ │ └─────────┴─────────┴─────────┘          │  │
│          │ │ ┌─────────┬─────────┬─────────┐          │  │
│          │ │ │ Card    │ Card    │ Card    │          │  │
│          │ │ └─────────┴─────────┴─────────┘          │  │
│          │ └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

Right Drawer (appears on demand, overlays content):
┌─────────────────────────┐
│ PostsDrawer (w: 480px)  │
│ ┌─────────────────────┐ │
│ │ Account Header      │ │
│ │ @username           │ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ PostItem            │ │
│ │ [thumbnail]         │ │
│ │ Caption...          │ │
│ │ 👁 1.2K 💬 45       │ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ PostItem            │ │
│ └─────────────────────┘ │
└─────────────────────────┘

Nested CommentsPanel (slides over PostsDrawer):
┌─────────────────────────┐
│ CommentsPanel (w: 420px)│
│ ┌─────────────────────┐ │
│ │ Post Preview        │ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ Comment Thread      │ │
│ │ @user: Great post!  │ │
│ │   [Reply]           │ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ Reply Input         │ │
│ │ [Write reply...]    │ │
│ └─────────────────────┘ │
└─────────────────────────┘
```

**AccountCard Component Spec:**

```typescript
// components/accounts/account-card.tsx
interface AccountCardProps {
  id: string
  platform: 'instagram' | 'facebook' | 'twitter' | 'youtube' | 'linkedin' | 'tiktok'
  profilePicture: string
  displayName: string
  username: string
  followerCount: number
  metrics: {
    engagement7d: number // Last 7 days avg
    postsLast7d: number
    growthPercent: number // Follower growth %
  }
  status: 'active' | 'syncing' | 'error' | 'disconnected'
  lastSyncedAt: Date
}

// Visual hierarchy:
// - Card container: bg-card, rounded-lg, shadow-soft, p-6
// - Hover effect: hover:shadow-medium, hover:scale-[1.02]
// - Platform badge: absolute top-right, colored dot + icon
// - Profile section: avatar (80px) + name + username
// - Metrics row: 3-column grid (followers, engagement, growth)
//   - Each metric: label (text-small text-muted) + value (text-h3 font-semibold)
// - Action button: "View Posts" (Button variant="outline")
// - Status indicator: bottom-left, Badge component
```

**Platform Color System:**

```typescript
const platformColors = {
  instagram: { primary: '#E4405F', gradient: 'from-purple-600 to-pink-500' },
  facebook: { primary: '#1877F2', gradient: 'from-blue-600 to-blue-400' },
  twitter: { primary: '#1DA1F2', gradient: 'from-sky-500 to-blue-500' },
  youtube: { primary: '#FF0000', gradient: 'from-red-600 to-red-500' },
  linkedin: { primary: '#0A66C2', gradient: 'from-blue-700 to-blue-500' },
  tiktok: { primary: '#000000', gradient: 'from-gray-900 via-pink-500 to-cyan-400' }
}
```

#### 3.1.2 State Management Architecture

**Zustand Store:**

```typescript
// stores/accounts-store.ts
interface AccountsState {
  accounts: SocialAccount[]
  selectedAccount: SocialAccount | null
  filterPlatform: string[]
  filterStatus: string[]
  isPostsDrawerOpen: boolean
  isCommentsOpen: boolean
  selectedPost: SocialPost | null
  
  // Actions
  setAccounts: (accounts: SocialAccount[]) => void
  setFilterPlatform: (platforms: string[]) => void
  openPostsDrawer: (account: SocialAccount) => void
  closePostsDrawer: () => void
  openComments: (post: SocialPost) => void
  closeComments: () => void
}

const useAccountsStore = create<AccountsState>((set) => ({
  accounts: [],
  selectedAccount: null,
  filterPlatform: [],
  filterStatus: ['active'],
  isPostsDrawerOpen: false,
  isCommentsOpen: false,
  selectedPost: null,
  
  setAccounts: (accounts) => set({ accounts }),
  setFilterPlatform: (platforms) => set({ filterPlatform: platforms }),
  
  openPostsDrawer: (account) => set({ 
    selectedAccount: account, 
    isPostsDrawerOpen: true 
  }),
  
  closePostsDrawer: () => set({ 
    isPostsDrawerOpen: false, 
    selectedAccount: null,
    isCommentsOpen: false,
    selectedPost: null
  }),
  
  openComments: (post) => set({ 
    selectedPost: post, 
    isCommentsOpen: true 
  }),
  
  closeComments: () => set({ 
    isCommentsOpen: false, 
    selectedPost: null 
  })
}))
```

#### 3.1.3 User Flow State Machines

**Flow 1: Connect New Account**

```
STATE: Initial (X Page Loaded)
  ↓
EVENT: User clicks "Connect New Account"
  ↓
STATE: Platform Selection Modal Open
  RENDER: Dialog with platform grid (6 platforms)
  UI: Each platform = large icon + name + "Connect" button
  ↓
EVENT: User selects platform (e.g., Instagram)
  ↓
STATE: OAuth Redirect Loading
  ACTION: Construct OAuth URL with PKCE
  URL: https://api.instagram.com/oauth/authorize?
       client_id={CLIENT_ID}&
       redirect_uri={CALLBACK_URL}&
       scope=user_profile,user_media,instagram_basic&
       response_type=code&
       state={CSRF_TOKEN}
  RENDER: Full-screen loader "Redirecting to Instagram..."
  ↓
EXTERNAL: User authenticates on Instagram
  ↓
EVENT: OAuth callback received at /api/auth/instagram/callback
  ↓
STATE: Token Exchange Processing
  ACTION: Server exchanges code for tokens
  ACTION: Fetch user profile from Instagram API
  ACTION: Store account in social_accounts table (encrypted tokens)
  ACTION: Trigger initial sync job (fetch last 30 posts)
  ↓
STATE: Redirect to X Page
  PARAMS: ?success=instagram_connected&account_id={UUID}
  ↓
STATE: Account Syncing
  RENDER: New AccountCard appears with status="syncing"
  UI: Skeleton loader for metrics, spinning sync icon
  ↓
BACKGROUND: Sync job completes
  EVENT: Real-time subscription via Supabase receives update
  ↓
STATE: Account Active
  RENDER: AccountCard updates with real metrics
  UI: Toast notification "Instagram account connected successfully"
  ANIMATION: Fade-in + scale-in for metrics
```

**Flow 2: View Posts & Reply to Comment**

```
STATE: X Page with Active Accounts
  ↓
EVENT: User clicks "View Posts" on AccountCard
  ↓
STATE: PostsDrawer Opening
  ANIMATION: Slide-in from right (400ms ease-out)
  ACTION: Fetch posts from API /api/posts?account_id={ID}
  RENDER: Drawer header (account info) + loading skeletons
  ↓
STATE: Posts Loaded
  RENDER: Scrollable list of PostItems (infinite scroll)
  UI: Each PostItem shows:
      - Thumbnail (aspect ratio preserved)
      - Caption (truncated to 2 lines)
      - Metrics row (likes, comments, shares, views)
      - Timestamp (relative: "2 hours ago")
  ↓
EVENT: User clicks on a PostItem
  ↓
STATE: CommentsPanel Opening
  ANIMATION: Slide-in from right over PostsDrawer (300ms)
  ACTION: Fetch comments from API /api/comments?post_id={ID}
  RENDER: Post preview + loading comments
  ↓
STATE: Comments Loaded
  RENDER: Threaded comment list
  UI: Each comment:
      - Avatar (32px)
      - Author name + username
      - Comment text
      - Timestamp
      - "Reply" button
  ↓
EVENT: User clicks "Reply" on a comment
  ↓
STATE: Reply Input Focused
  RENDER: Inline reply textarea appears below comment
  UI: 
      - Textarea with placeholder "@username "
      - Character counter (platform-specific limit)
      - "Send" button (primary) + "Cancel" (ghost)
  ↓
EVENT: User types reply and clicks "Send"
  ↓
STATE: Reply Posting
  UI: Button shows loading spinner
  ACTION: POST /api/comments/reply
          Body: { post_id, parent_comment_id, text }
  ↓
SUCCESS PATH:
  STATE: Reply Posted
  ACTION: Optimistically add reply to comment thread
  UI: New comment appears with "sending..." badge
  BACKGROUND: Platform API call completes
  UI: Badge changes to checkmark, toast "Reply posted"
  ANIMATION: Fade-in for new comment
  ↓
ERROR PATH:
  STATE: Reply Failed
  UI: Red error badge appears on comment
  UI: Toast "Failed to post reply" with "Retry" action
  ACTION: User can click retry or dismiss
```

#### 3.1.4 API Contracts

**GET /api/accounts**

```typescript
// Request
GET /api/accounts?team_id={uuid}&platform=instagram,twitter&status=active

// Response (200 OK)
{
  "accounts": [
    {
      "id": "uuid",
      "platform": "instagram",
      "username": "johndoe",
      "display_name": "John Doe",
      "profile_picture_url": "https://...",
      "follower_count": 12500,
      "metrics": {
        "engagement_7d": 4.2,  // percentage
        "posts_last_7d": 5,
        "growth_percent": 2.3
      },
      "status": "active",
      "last_synced_at": "2025-11-18T10:30:00Z"
    }
  ],
  "total": 1,
  "page": 1
}

// Error Response (500)
{
  "error": "Failed to fetch accounts",
  "code": "DB_ERROR",
  "hint": "Please refresh the page"
}
```

**POST /api/accounts/connect**

```typescript
// Request
POST /api/accounts/connect
{
  "team_id": "uuid",
  "platform": "instagram",
  "oauth_code": "IGQVJXa..."
}

// Response (201 Created)
{
  "account": {
    "id": "uuid",
    "platform": "instagram",
    "status": "syncing"
  },
  "sync_job_id": "uuid"
}
```

**GET /api/posts**

```typescript
// Request
GET /api/posts?account_id={uuid}&limit=20&cursor={timestamp}

// Response (200 OK)
{
  "posts": [
    {
      "id": "uuid",
      "external_id": "instagram_post_123",
      "post_type": "feed",
      "caption": "Amazing sunset today! 🌅",
      "media_urls": ["https://..."],
      "published_at": "2025-11-17T18:00:00Z",
      "metrics": {
        "likes": 1240,
        "comments": 45,
        "shares": 12,
        "saves": 89
      }
    }
  ],
  "next_cursor": "2025-11-16T12:00:00Z",
  "has_more": true
}
```

**POST /api/comments/reply**

```typescript
// Request
POST /api/comments/reply
{
  "post_id": "uuid",
  "comment_id": "external_comment_id",
  "reply_text": "Thank you so much! 🙏"
}

// Response (201 Created)
{
  "reply": {
    "id": "uuid",
    "text": "Thank you so much! 🙏",
    "created_at": "2025-11-18T11:45:00Z",
    "status": "posted"
  }
}

// Error Response (429 Rate Limit)
{
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT",
  "hint": "You can reply again in 5 minutes",
  "retry_after": 300
}
```

#### 3.1.5 Component Tree (Implementation Ready)

```
XPage (Server Component)
├─ Shell Layout
│  ├─ TopNav
│  │  ├─ Logo
│  │  ├─ GlobalSearch (Combobox)
│  │  ├─ WorkspaceSelector (Select)
│  │  └─ ProfileMenu (DropdownMenu)
│  │
│  ├─ SidebarNav
│  │  ├─ NavItem (X) [active]
│  │  ├─ NavItem (O)
│  │  ├─ NavItem (C)
│  │  ├─ NavItem (I) [badge: Coming Soon]
│  │  ├─ NavItem (A)
│  │  └─ NavItem (L) [badge: Coming Soon]
│  │
│  └─ MainContent
│     ├─ HeaderRow
│     │  ├─ PageTitle ("X – Accounts")
│     │  ├─ ConnectButton (Dialog trigger)
│     │  └─ FilterBar
│     │     ├─ PlatformFilter (multi-select chips)
│     │     ├─ StatusFilter (select)
│     │     └─ TeamFilter (select)
│     │
│     └─ AccountsGrid (Client Component)
│        ├─ AccountCard (repeat)
│        │  ├─ PlatformBadge
│        │  ├─ ProfileSection
│        │  │  ├─ Avatar
│        │  │  ├─ DisplayName
│        │  │  └─ Username
│        │  ├─ MetricsRow
│        │  │  ├─ MetricItem (Followers)
│        │  │  ├─ MetricItem (Engagement)
│        │  │  └─ MetricItem (Growth)
│        │  ├─ StatusBadge
│        │  └─ ViewPostsButton
│        │
│        └─ EmptyState (if no accounts)
│           ├─ Illustration
│           ├─ Heading ("No accounts connected")
│           └─ ConnectButton (CTA)
│
├─ ConnectAccountDialog (Modal)
│  ├─ DialogHeader ("Connect Social Account")
│  ├─ PlatformGrid
│  │  ├─ PlatformButton (Instagram)
│  │  ├─ PlatformButton (Facebook)
│  │  ├─ PlatformButton (Twitter)
│  │  ├─ PlatformButton (YouTube)
│  │  ├─ PlatformButton (LinkedIn)
│  │  └─ PlatformButton (TikTok)
│  └─ DialogFooter (Cancel button)
│
├─ PostsDrawer (Sheet from ShadCN)
│  ├─ SheetHeader
│  │  ├─ AccountInfo
│  │  │  ├─ Avatar
│  │  │  ├─ Name + Username
│  │  │  └─ Platform Icon
│  │  └─ CloseButton
│  │
│  ├─ SheetContent (scrollable)
│  │  └─ PostsList (infinite scroll)
│  │     └─ PostItem (repeat)
│  │        ├─ MediaThumbnail
│  │        ├─ Caption (truncated)
│  │        ├─ MetricsRow
│  │        │  ├─ LikesCount
│  │        │  ├─ CommentsCount
│  │        │  ├─ SharesCount
│  │        │  └─ ViewsCount
│  │        ├─ Timestamp
│  │        └─ ViewCommentsButton
│  │
│  └─ LoadingState (Skeleton)
│
└─ CommentsPanel (nested Sheet)
   ├─ SheetHeader
   │  ├─ PostPreview
   │  │  ├─ MediaThumbnail
   │  │  └─ Caption (full)
   │  └─ BackButton (return to posts)
   │
   ├─ CommentsList (scrollable)
   │  └─ CommentItem (repeat, recursive for threads)
   │     ├─ CommentHeader
   │     │  ├─ Avatar
   │     │  ├─ AuthorName
   │     │  └─ Timestamp
   │     ├─ CommentText
   │     ├─ ReplyButton
   │     └─ ReplyInput (conditional)
   │        ├─ Textarea
   │        ├─ CharacterCounter
   │        └─ ActionButtons (Send, Cancel)
   │
   └─ LoadingState (Skeleton)
```

#### 3.1.6 Accessibility Checklist

- [ ] All interactive elements have visible focus indicators (2px outline, primary color)
- [ ] Platform icons have `aria-label` attributes ("Instagram", "Twitter", etc.)
- [ ] AccountCard has `role="article"` and `aria-label` with account name
- [ ] "View Posts" button has `aria-label="View posts from @{username}"`
- [ ] Drawers announce when opened (using `aria-live="polite"`)
- [ ] Comment reply textarea has `aria-label="Reply to {author's comment}"`
- [ ] Metric values have `aria-label` with full context ("12,500 followers")
- [ ] Loading states show `aria-busy="true"` and descriptive text for screen readers
- [ ] Keyboard navigation: Tab through cards, Enter to open drawers, Escape to close
- [ ] Color contrast ratio ≥ 4.5:1 for all text on backgrounds

#### 3.1.7 Error Boundaries & Fallbacks

**Component-Level Error Handling:**

```typescript
// components/accounts/accounts-grid.tsx
'use client'

import { ErrorBoundary } from 'react-error-boundary'

function AccountsGridError({ error, resetErrorBoundary }) {
  return (
    <Card className="p-8 text-center">
      <AlertCircle className="w-12 h-12 mx-auto text-destructive mb-4" />
      <h3 className="text-h3 mb-2">Failed to load accounts</h3>
      <p className="text-small text-muted mb-4">
        {error.message || 'An unexpected error occurred'}
      </p>
      <Button onClick={resetErrorBoundary}>
        Try Again
      </Button>
    </Card>
  )
}

export function AccountsGrid({ teamId }) {
  return (
    <ErrorBoundary
      FallbackComponent={AccountsGridError}
      onReset={() => window.location.reload()}
    >
      <AccountsGridContent teamId={teamId} />
    </ErrorBoundary>
  )
}
```

**Network Error Handling:**

```typescript
// hooks/use-accounts.ts
import { useQuery } from '@tanstack/react-query'

export function useAccounts(teamId: string) {
  return useQuery({
    queryKey: ['accounts', teamId],
    queryFn: async () => {
      const response = await fetch(`/api/accounts?team_id=${teamId}`)
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.hint || 'Failed to fetch accounts')
      }
      
      return response.json()
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 60000, // 1 minute
    gcTime: 300000, // 5 minutes
  })
}
```

---

### 3.2 O – Organize (Content Calendar)

#### 3.2.1 Visual Design Specification

**Calendar Layout Mathematics:**

```
┌─────────────────────────────────────────────────────────────────┐
│ HeaderRow (h: 80px)                                             │
│ ┌─────────────────┬──────────────────┬─────────────────────┐   │
│ │ Month Navigator │ Platform Filters │ "Create Post" CTA   │   │
│ │ ◀ Nov 2025 ▶   │ [IG][FB][TW][YT]│ [+ New Post]        │   │
│ └─────────────────┴──────────────────┴─────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│ CalendarGrid (7 columns, 5-6 rows)                              │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ Sun    Mon    Tue    Wed    Thu    Fri    Sat            │ │
│ ├────────────────────────────────────────────────────────────┤ │
│ │ 27     28     29     30     31     1      2               │ │
│ │ [·]    [··]   []     [···]  [·]    [··]   []             │ │
│ │        2posts        4posts                                │ │
│ ├────────────────────────────────────────────────────────────┤ │
│ │ 3      4      5      6      7      8      9               │ │
│ │ [·]    []     [··]   [·]    [···]  [·]    [··]           │ │
│ │                                                             │ │
│ │ ... (continues for full month)                             │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ [Today: November 18, 2025 - highlighted in accent color]       │
└─────────────────────────────────────────────────────────────────┘

RightSidePanel - DayDetailPanel (w: 400px, appears on day click)
┌────────────────────────────────┐
│ Selected Date Header           │
│ Wednesday, November 6, 2025    │
│ [+ Add Post to This Day]       │
├────────────────────────────────┤
│ Scheduled Posts (4)            │
│                                │
│ ┌──────────────────────────┐  │
│ │ ScheduledPostCard        │  │
│ │ ┌─┬──────────────────┐  │  │
│ │ │📷│Instagram Feed    │  │  │
│ │ │ │9:00 AM           │  │  │
│ │ └─┴──────────────────┘  │  │
│ │ Caption: "New product  │  │
│ │ launch today! 🚀..."   │  │
│ │ Status: [Scheduled]    │  │
│ │ [Edit] [Delete]        │  │
│ └──────────────────────────┘  │
│                                │
│ ┌──────────────────────────┐  │
│ │ ScheduledPostCard        │  │
│ │ ┌─┬──────────────────┐  │  │
│ │ │🐦│Twitter Tweet     │  │  │
│ │ │ │2:30 PM           │  │  │
│ │ └─┴──────────────────┘  │  │
│ │ Caption: "Exciting up  │  │
│ │ dates coming soon..."  │  │
│ │ Status: [Scheduled]    │  │
│ │ [Edit] [Delete]        │  │
│ └──────────────────────────┘  │
│                                │
│ (scroll for more posts)        │
└────────────────────────────────┘
```

**DayCell Component Spec:**

```typescript
// components/calendar/day-cell.tsx
interface DayCellProps {
  date: Date
  isCurrentMonth: boolean
  isToday: boolean
  isSelected: boolean
  posts: {
    platform: string
    status: 'draft' | 'scheduled' | 'published'
    time: string
  }[]
  onClick: () => void
}

// Visual states:
// - Current month: opacity-100
// - Other month: opacity-40, text-muted
// - Today: bg-primary/10, border-2 border-primary
// - Selected: bg-accent/20
// - Hover: bg-accent/10, cursor-pointer
// - Has posts: show platform indicators as colored dots (4px diameter)
// - Post count: if >3 posts, show "+N more" badge
```

**Platform Indicator Dots:**

```typescript
// Position: bottom of day cell, centered
// Layout: horizontal row, gap: 2px
// Colors match platform brand colors
// Max visible: 4 dots, then "+N" text

<div className="flex gap-1 justify-center mt-2">
  <div className="w-1 h-1 rounded-full bg-pink-500" title="Instagram" />
  <div className="w-1 h-1 rounded-full bg-blue-500" title="Facebook" />
  <div className="w-1 h-1 rounded-full bg-sky-500" title="Twitter" />
  {remainingCount > 0 && (
    <span className="text-caption text-muted">+{remainingCount}</span>
  )}
</div>
```

#### 3.2.2 State Management Architecture

**Zustand Store:**

```typescript
// stores/calendar-store.ts
interface CalendarState {
  currentMonth: Date
  selectedDate: Date | null
  platformFilters: string[]
  scheduledPosts: ScheduledPost[]
  isDayPanelOpen: boolean
  isEditModalOpen: boolean
  editingPost: ScheduledPost | null
  
  // Actions
  setCurrentMonth: (date: Date) => void
  goToNextMonth: () => void
  goToPrevMonth: () => void
  selectDate: (date: Date) => void
  togglePlatformFilter: (platform: string) => void
  openDayPanel: (date: Date) => void
  closeDayPanel: () => void
  openEditModal: (post: ScheduledPost) => void
  closeEditModal: () => void
  addScheduledPost: (post: ScheduledPost) => void
  updateScheduledPost: (id: string, updates: Partial<ScheduledPost>) => void
  deleteScheduledPost: (id: string) => void
}

const useCalendarStore = create<CalendarState>((set, get) => ({
  currentMonth: new Date(),
  selectedDate: null,
  platformFilters: [],
  scheduledPosts: [],
  isDayPanelOpen: false,
  isEditModalOpen: false,
  editingPost: null,
  
  setCurrentMonth: (date) => set({ currentMonth: date }),
  
  goToNextMonth: () => set((state) => ({
    currentMonth: addMonths(state.currentMonth, 1)
  })),
  
  goToPrevMonth: () => set((state) => ({
    currentMonth: subMonths(state.currentMonth, 1)
  })),
  
  selectDate: (date) => set({ 
    selectedDate: date,
    isDayPanelOpen: true
  }),
  
  togglePlatformFilter: (platform) => set((state) => ({
    platformFilters: state.platformFilters.includes(platform)
      ? state.platformFilters.filter(p => p !== platform)
      : [...state.platformFilters, platform]
  })),
  
  openDayPanel: (date) => set({ 
    selectedDate: date, 
    isDayPanelOpen: true 
  }),
  
  closeDayPanel: () => set({ 
    isDayPanelOpen: false, 
    selectedDate: null 
  }),
  
  openEditModal: (post) => set({ 
    editingPost: post, 
    isEditModalOpen: true 
  }),
  
  closeEditModal: () => set({ 
    isEditModalOpen: false, 
    editingPost: null 
  }),
  
  addScheduledPost: (post) => set((state) => ({
    scheduledPosts: [...state.scheduledPosts, post]
  })),
  
```typescript
  updateScheduledPost: (id, updates) => set((state) => ({
    scheduledPosts: state.scheduledPosts.map(post =>
      post.id === id ? { ...post, ...updates } : post
    )
  })),
  
  deleteScheduledPost: (id) => set((state) => ({
    scheduledPosts: state.scheduledPosts.filter(post => post.id !== id)
  }))
}))
```

#### 3.2.3 User Flow State Machines

**Flow 1: Navigate Calendar & Filter**

```
STATE: Calendar Loaded (Current Month)
  RENDER: November 2025 grid with all scheduled posts
  DATA: Fetch from /api/posts/scheduled?month=2025-11&team_id={uuid}
  ↓
EVENT: User clicks "Next Month" (▶)
  ↓
STATE: Transitioning to December
  ANIMATION: Slide-left transition (300ms ease-in-out)
  ACTION: Update currentMonth state
  ACTION: Prefetch December data in background
  ↓
STATE: December 2025 Loaded
  RENDER: New month grid with December posts
  ANIMATION: Slide-in from right
  URL UPDATE: ?month=2025-12 (for sharing/bookmarking)
  ↓
EVENT: User clicks Instagram platform filter chip
  ↓
STATE: Filter Applied
  UI: Instagram chip highlighted (bg-primary, text-white)
  RENDER: Calendar updates to show only Instagram posts
  ACTION: Filter scheduledPosts array in client state
  ANIMATION: Fade-out non-Instagram dots, fade-in Instagram dots
  ↓
EVENT: User clicks filter chip again (toggle off)
  ↓
STATE: Filter Removed
  UI: Chip returns to default state (bg-muted)
  RENDER: All platform posts visible again
  ANIMATION: Fade-in all post indicators
```

**Flow 2: Select Day & View Details**

```
STATE: Calendar View
  ↓
EVENT: User clicks DayCell (November 6)
  ↓
STATE: Day Selected
  UI: DayCell highlighted (bg-accent/20)
  ACTION: Set selectedDate = November 6
  ↓
STATE: DayDetailPanel Opening
  ANIMATION: Slide-in from right (400ms cubic-bezier)
  ACTION: Fetch detailed posts for November 6
  RENDER: Panel header "Wednesday, November 6, 2025"
  RENDER: Loading skeletons for post cards
  ↓
STATE: Posts Loaded in Panel
  RENDER: 4 ScheduledPostCards
  UI: Each card shows:
      - Platform icon + name
      - Scheduled time (9:00 AM, 2:30 PM, etc.)
      - Caption preview (truncated to 100 chars)
      - Status badge (Draft/Scheduled/Published)
      - Action buttons (Edit, Delete)
  ↓
EVENT: User clicks different DayCell (November 8)
  ↓
STATE: Day Panel Updates
  ANIMATION: Content fade-out/fade-in (200ms)
  ACTION: Update selectedDate = November 8
  ACTION: Fetch posts for November 8
  RENDER: New posts in panel
  
ALTERNATIVE EVENT: User clicks outside panel or close button
  ↓
STATE: Panel Closing
  ANIMATION: Slide-out to right (300ms)
  ACTION: Clear selectedDate
  UI: DayCell deselected (remove highlight)
```

**Flow 3: Edit Scheduled Post**

```
STATE: DayDetailPanel Open (with posts visible)
  ↓
EVENT: User clicks "Edit" on a ScheduledPostCard
  ↓
STATE: Edit Modal Opening
  ANIMATION: Modal fade-in + scale-in (200ms)
  RENDER: EditPostModal
  UI Components:
      - Platform selector (disabled if already scheduled)
      - Account selector (multi-select)
      - Caption textarea (with character counter)
      - Media preview (if media attached)
      - Date picker (defaults to selected day)
      - Time picker (24-hour with AM/PM toggle)
      - Status selector (Draft/Scheduled)
  ACTION: Populate form with existing post data
  ↓
STATE: User Edits Fields
  VALIDATION: Real-time validation
      - Caption length per platform rules
      - Instagram: 2,200 chars
      - Twitter: 280 chars
      - LinkedIn: 3,000 chars
  UI: Show character count with color coding
      - Green: within limit
      - Yellow: 90% of limit
      - Red: exceeds limit
  ↓
EVENT: User clicks "Save Changes"
  ↓
STATE: Saving
  UI: Button shows loading spinner
  VALIDATION: Final validation check
  ACTION: PATCH /api/posts/scheduled/{id}
          Body: { caption, scheduled_at, accounts, status }
  ↓
SUCCESS PATH:
  STATE: Post Updated
  ACTION: Update local state (optimistic update)
  UI: Modal closes with fade-out
  UI: ScheduledPostCard updates with new data
  UI: Toast notification "Post updated successfully"
  ANIMATION: Card highlight pulse (success color)
  ACTION: Refresh calendar if date changed
  ↓
ERROR PATH:
  STATE: Update Failed
  UI: Error message in modal (red alert banner)
  UI: "Failed to update post: {error_message}"
  UI: Buttons: "Retry" (attempts save again) | "Cancel" (closes modal)
  ACTION: Keep modal open with form data intact
```

**Flow 4: Delete Scheduled Post**

```
STATE: DayDetailPanel Open
  ↓
EVENT: User clicks "Delete" on ScheduledPostCard
  ↓
STATE: Confirmation Dialog Opens
  ANIMATION: Dialog fade-in (150ms)
  UI: AlertDialog component
      - Title: "Delete scheduled post?"
      - Description: "This action cannot be undone. The post will be permanently removed from your calendar."
      - Caption preview (read-only, 50 chars)
      - Scheduled time display
  BUTTONS:
      - "Cancel" (ghost variant)
      - "Delete" (destructive variant, requires confirmation)
  ↓
EVENT: User clicks "Delete" (confirmation)
  ↓
STATE: Deleting
  UI: Button shows loading spinner
  ACTION: DELETE /api/posts/scheduled/{id}
  ACTION: Optimistic removal from UI
  ↓
SUCCESS PATH:
  STATE: Post Deleted
  UI: Dialog closes
  UI: ScheduledPostCard fades out (300ms)
  UI: Panel updates post count
  UI: Calendar updates (remove indicator dot if last post for that day)
  UI: Toast notification "Post deleted" with UNDO button (5 second timeout)
  ↓
  UNDO PATH (if user clicks undo within 5 seconds):
    ACTION: POST /api/posts/scheduled/restore
    UI: Toast "Post restored"
    UI: Post reappears in calendar and panel
  ↓
ERROR PATH:
  STATE: Delete Failed
  UI: Error toast "Failed to delete post"
  ACTION: Revert optimistic update
  UI: Post card reappears
```

**Flow 5: Create Post from Calendar**

```
STATE: Calendar View or DayDetailPanel Open
  ↓
EVENT: User clicks "Create Post" button
  OPTIONS:
      - From HeaderRow: opens C page with no date preset
      - From DayCell "+" icon: opens C page with date preset
      - From DayDetailPanel "Add Post": opens C page with date preset
  ↓
STATE: Navigation to C Page
  ACTION: Navigate to /c?date=2025-11-06 (if date context exists)
  STATE TRANSFER: Pass date via URL param
  ↓
STATE: C Page Loads
  UI: Date picker prefilled with November 6, 2025
  UI: Focus automatically on brief textarea
  FLOW: Continue to C Page flows (see section 3.3)
  ↓
STATE: User Completes Content Creation
  ACTION: User saves post to calendar from C page
  ↓
STATE: Return to Calendar
  ACTION: Navigate back to /o?month=2025-11&selected=2025-11-06
  UI: DayDetailPanel opens automatically with new post visible
  UI: New ScheduledPostCard appears with "New" badge (fades after 3s)
  ANIMATION: Slide-in from top
```

#### 3.2.4 API Contracts

**GET /api/posts/scheduled**

```typescript
// Request
GET /api/posts/scheduled?team_id={uuid}&month=2025-11&platform=instagram,twitter

// Response (200 OK)
{
  "posts": [
    {
      "id": "uuid",
      "account_id": "uuid",
      "platform": "instagram",
      "account_username": "johndoe",
      "caption": "New product launch today! 🚀 Check out our latest innovation...",
      "media_urls": ["https://storage.supabase.co/..."],
      "hashtags": ["#ProductLaunch", "#Innovation"],
      "scheduled_at": "2025-11-06T09:00:00Z",
      "status": "scheduled",
      "created_by": "uuid",
      "created_at": "2025-11-01T14:30:00Z"
    },
    {
      "id": "uuid",
      "account_id": "uuid",
      "platform": "twitter",
      "account_username": "johndoe",
      "caption": "Exciting updates coming soon! Stay tuned 👀",
      "scheduled_at": "2025-11-06T14:30:00Z",
      "status": "scheduled",
      "created_by": "uuid",
      "created_at": "2025-11-02T10:15:00Z"
    }
  ],
  "total": 2,
  "month": "2025-11"
}

// Error Response (400 Bad Request)
{
  "error": "Invalid month format",
  "code": "VALIDATION_ERROR",
  "hint": "Month should be in YYYY-MM format"
}
```

**PATCH /api/posts/scheduled/{id}**

```typescript
// Request
PATCH /api/posts/scheduled/uuid-123
{
  "caption": "Updated caption with new messaging 🎉",
  "scheduled_at": "2025-11-06T15:00:00Z",
  "status": "scheduled"
}

// Response (200 OK)
{
  "post": {
    "id": "uuid-123",
    "caption": "Updated caption with new messaging 🎉",
    "scheduled_at": "2025-11-06T15:00:00Z",
    "status": "scheduled",
    "updated_at": "2025-11-18T11:45:00Z"
  }
}

// Error Response (409 Conflict)
{
  "error": "Post has already been published",
  "code": "POST_PUBLISHED",
  "hint": "Published posts cannot be edited. Create a new post instead."
}
```

**DELETE /api/posts/scheduled/{id}**

```typescript
// Request
DELETE /api/posts/scheduled/uuid-123

// Response (200 OK)
{
  "deleted": true,
  "id": "uuid-123",
  "restore_token": "temp_token_abc123", // Valid for 5 minutes
  "message": "Post deleted successfully"
}

// Error Response (404 Not Found)
{
  "error": "Post not found",
  "code": "NOT_FOUND",
  "hint": "This post may have already been deleted"
}
```

**POST /api/posts/scheduled/restore**

```typescript
// Request (for undo functionality)
POST /api/posts/scheduled/restore
{
  "restore_token": "temp_token_abc123"
}

// Response (200 OK)
{
  "post": {
    "id": "uuid-123",
    "status": "scheduled",
    "restored_at": "2025-11-18T11:46:30Z"
  }
}
```

#### 3.2.5 Component Tree

```
OPage (Server Component)
├─ Shell Layout
│  ├─ TopNav
│  └─ SidebarNav
│
├─ CalendarContent (Client Component)
│  ├─ HeaderRow
│  │  ├─ MonthNavigator
│  │  │  ├─ PrevMonthButton
│  │  │  ├─ MonthYearDisplay
│  │  │  │  └─ MonthPicker (Popover)
│  │  │  └─ NextMonthButton
│  │  │
│  │  ├─ PlatformFilterBar
│  │  │  ├─ FilterChip (Instagram)
│  │  │  ├─ FilterChip (Facebook)
│  │  │  ├─ FilterChip (Twitter)
│  │  │  ├─ FilterChip (YouTube)
│  │  │  ├─ FilterChip (LinkedIn)
│  │  │  └─ FilterChip (TikTok)
│  │  │
│  │  └─ CreatePostButton
│  │     └─ Link to /c page
│  │
│  ├─ CalendarGrid
│  │  ├─ WeekdayHeader
│  │  │  └─ Day labels (Sun-Sat)
│  │  │
│  │  └─ MonthGrid (5-6 weeks)
│  │     └─ DayCell (repeat 35-42 cells)
│  │        ├─ DateLabel
│  │        ├─ PostIndicators
│  │        │  ├─ PlatformDot (repeat per post)
│  │        │  └─ OverflowBadge (+N more)
│  │        └─ AddPostButton (hover state, "+" icon)
│  │
│  └─ EmptyState (if no posts in month)
│     ├─ Illustration (calendar with sparkles)
│     ├─ Heading ("No posts scheduled for {month}")
│     └─ CreatePostButton (CTA)
│
├─ DayDetailPanel (Sheet from right)
│  ├─ SheetHeader
│  │  ├─ SelectedDateDisplay
│  │  │  ├─ Day name
│  │  │  ├─ Full date
│  │  │  └─ CloseButton
│  │  │
│  │  └─ AddPostButton (for selected day)
│  │
│  ├─ SheetContent
│  │  ├─ PostsHeader
│  │  │  ├─ PostCount ("4 posts scheduled")
│  │  │  └─ SortSelector (by time, by platform)
│  │  │
│  │  └─ ScheduledPostsList
│  │     └─ ScheduledPostCard (repeat)
│  │        ├─ CardHeader
│  │        │  ├─ PlatformIcon + Name
│  │        │  ├─ AccountBadge (@username)
│  │        │  └─ ScheduledTime
│  │        │
│  │        ├─ CardContent
│  │        │  ├─ MediaPreview (if media exists)
│  │        │  │  └─ Thumbnail (aspect ratio preserved)
│  │        │  ├─ CaptionPreview (truncated)
│  │        │  └─ HashtagsList
│  │        │
│  │        ├─ CardFooter
│  │        │  ├─ StatusBadge
│  │        │  │  └─ Variants: Draft | Scheduled | Publishing | Failed
│  │        │  └─ ActionButtons
│  │        │     ├─ EditButton
│  │        │     ├─ DuplicateButton
│  │        │     └─ DeleteButton
│  │        │
│  │        └─ ErrorBanner (if status = failed)
│  │           ├─ ErrorMessage
│  │           └─ RetryButton
│  │
│  └─ EmptyDayState
│     ├─ Icon (calendar-plus)
│     ├─ Message ("No posts scheduled for this day")
│     └─ AddPostButton
│
├─ EditPostModal (Dialog)
│  ├─ DialogHeader ("Edit Scheduled Post")
│  ├─ DialogContent (form)
│  │  ├─ PlatformDisplay (read-only chip)
│  │  ├─ AccountSelector
│  │  │  └─ Multi-select combobox
│  │  │
│  │  ├─ CaptionTextarea
│  │  │  ├─ Label with character counter
│  │  │  ├─ Textarea (resizable)
│  │  │  └─ ValidationMessage
│  │  │
│  │  ├─ MediaSection
│  │  │  ├─ CurrentMedia (preview)
│  │  │  └─ ChangeMediaButton (future)
│  │  │
│  │  ├─ SchedulingSection
│  │  │  ├─ DatePicker
│  │  │  └─ TimePicker
│  │  │
│  │  └─ StatusSelector
│  │     └─ Radio group (Draft | Scheduled)
│  │
│  └─ DialogFooter
│     ├─ CancelButton
│     └─ SaveButton (primary, loading state)
│
└─ DeleteConfirmationDialog (AlertDialog)
   ├─ AlertDialogHeader
   │  └─ Title ("Delete scheduled post?")
   │
   ├─ AlertDialogContent
   │  ├─ Description
   │  ├─ PostPreview (caption + time)
   │  └─ Warning ("This action cannot be undone")
   │
   └─ AlertDialogFooter
      ├─ CancelButton
      └─ DeleteButton (destructive, loading state)
```

#### 3.2.6 Advanced Features

**Drag-and-Drop Rescheduling:**

```typescript
// Future enhancement - Phase 2
// Allow dragging ScheduledPostCard between days

import { DndContext, DragOverlay } from '@dnd-kit/core'

function CalendarWithDnd() {
  const handleDragEnd = async (event) => {
    const { active, over } = event
    
    if (over && active.id !== over.id) {
      // active.id = post ID
      // over.id = target date
      
      const post = scheduledPosts.find(p => p.id === active.id)
      const newDate = over.id // Date string
      
      // Optimistic update
      updateScheduledPost(active.id, { 
        scheduled_at: `${newDate}T${getTimeFromDate(post.scheduled_at)}` 
      })
      
      // API call
      await fetch(`/api/posts/scheduled/${active.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ scheduled_at: newDate })
      })
      
      toast.success('Post rescheduled')
    }
  }
  
  return (
    <DndContext onDragEnd={handleDragEnd}>
      {/* Calendar grid with droppable day cells */}
    </DndContext>
  )
}
```

**Keyboard Shortcuts:**

```typescript
// hooks/use-calendar-shortcuts.ts
import { useHotkeys } from 'react-hotkeys-hook'

export function useCalendarShortcuts() {
  const { goToNextMonth, goToPrevMonth, selectDate } = useCalendarStore()
  
  // Arrow navigation
  useHotkeys('right', () => goToNextMonth(), [])
  useHotkeys('left', () => goToPrevMonth(), [])
  
  // Quick actions
  useHotkeys('n', () => navigateToCreatePage(), []) // New post
  useHotkeys('t', () => selectDate(new Date()), []) // Today
  useHotkeys('esc', () => closeDayPanel(), []) // Close panel
  
  // Platform filters (1-6)
  useHotkeys('1', () => togglePlatformFilter('instagram'), [])
  useHotkeys('2', () => togglePlatformFilter('facebook'), [])
  useHotkeys('3', () => togglePlatformFilter('twitter'), [])
  // ... etc
}
```

**Real-Time Sync (Supabase Subscriptions):**

```typescript
// hooks/use-scheduled-posts-sync.ts
import { useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export function useScheduledPostsSync(teamId: string) {
  const supabase = createClientComponentClient()
  const { addScheduledPost, updateScheduledPost, deleteScheduledPost } = useCalendarStore()
  
  useEffect(() => {
    const channel = supabase
      .channel('scheduled_posts_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'social_posts',
          filter: `team_id=eq.${teamId}`
        },
        (payload) => {
          addScheduledPost(payload.new as ScheduledPost)
          toast.info('New post added by team member')
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'social_posts',
          filter: `team_id=eq.${teamId}`
        },
        (payload) => {
          updateScheduledPost(payload.new.id, payload.new)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'social_posts',
          filter: `team_id=eq.${teamId}`
        },
        (payload) => {
          deleteScheduledPost(payload.old.id)
          toast.info('Post removed by team member')
        }
      )
      .subscribe()
    
    return () => {
      supabase.removeChannel(channel)
    }
  }, [teamId])
}
```

#### 3.2.7 Performance Optimizations

**Calendar Data Prefetching:**

```typescript
// Prefetch adjacent months for instant navigation
import { useQueryClient } from '@tanstack/react-query'

function CalendarPrefetcher({ currentMonth }: { currentMonth: Date }) {
  const queryClient = useQueryClient()
  
  useEffect(() => {
    const prevMonth = subMonths(currentMonth, 1)
    const nextMonth = addMonths(currentMonth, 1)
    
    // Prefetch previous month
    queryClient.prefetchQuery({
      queryKey: ['scheduled-posts', format(prevMonth, 'yyyy-MM')],
      queryFn: () => fetchScheduledPosts(prevMonth)
    })
    
    // Prefetch next month
    queryClient.prefetchQuery({
      queryKey: ['scheduled-posts', format(nextMonth, 'yyyy-MM')],
      queryFn: () => fetchScheduledPosts(nextMonth)
    })
  }, [currentMonth])
  
  return null
}
```

**Virtual Scrolling for Large Post Lists:**

```typescript
// If a single day has 50+ posts (edge case)
import { useVirtualizer } from '@tanstack/react-virtual'

function VirtualizedPostList({ posts }: { posts: ScheduledPost[] }) {
  const parentRef = useRef<HTMLDivElement>(null)
  
  const virtualizer = useVirtualizer({
    count: posts.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120, // Estimated card height
    overscan: 5
  })
  
  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative'
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`
            }}
          >
            <ScheduledPostCard post={posts[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  )
}
```

---

### 3.3 C – Create (AI Content Assistant)

#### 3.3.1 Visual Design Specification

**Two-Pane Studio Layout:**

```
┌─────────────────────────────────────────────────────────────────┐
│ TopNav                                                           │
├────────────────┬────────────────────────────────────────────────┤
│ Sidebar        │                                                 │
│                │                                                 │
│ X              │  ┌─────────────────────────────────────────┐  │
│ O              │  │ LeftPane (Input Studio)                 │  │
│ C [active]     │  │ Width: 50% on desktop, 100% on mobile   │  │
│ I              │  │                                          │  │
│ A              │  │ ┌─────────────────────────────────────┐ │  │
│ L              │  │ │ Brief Section                       │ │  │
│                │  │ │                                      │ │  │
│                │  │ │ ┌─────────────────────────────────┐ │ │  │
│                │  │ │ │ Platform Selector               │ │ │  │
│                │  │ │ │ [Multi-select chips]            │ │ │  │
│                │  │ │ │ Instagram, Twitter, LinkedIn... │ │ │  │
│                │  │ │ └─────────────────────────────────┘ │ │  │
│                │  │ │                                      │ │  │
│                │  │ │ ┌─────────────────────────────────┐ │ │  │
│                │  │ │ │ Audience Selector               │ │ │  │
│                │  │ │ │ "Who are you targeting?"        │ │ │  │
│                │  │ │ │ [Select: Gen Z, Professionals...│ │ │  │
│                │  │ │ └─────────────────────────────────┘ │ │  │
│                │  │ │                                      │ │  │
│                │  │ │ ┌─────────────────────────────────┐ │ │  │
│                │  │ │ │ Tone Selector                   │ │ │  │
│                │  │ │ │ "What's the vibe?"              │ │ │  │
│                │  │ │ │ [Professional|Casual|Playful... │ │ │  │
│                │  │ │ └─────────────────────────────────┘ │ │  │
│                │  │ │                                      │ │  │
│                │  │ │ ┌─────────────────────────────────┐ │ │  │
│                │  │ │ │ Brief Textarea (main input)     │ │ │  │
│                │  │ │ │ "Describe what you want to post"│ │ │  │
│                │  │ │ │                                  │ │ │  │
│                │  │ │ │ [Large, autoresize textarea]    │ │ │  │
│                │  │ │ │ Placeholder: "E.g., Announcing  │ │ │  │
│                │  │ │ │ our new eco-friendly product    │ │ │  │
│                │  │ │ │ line launching next week..."    │ │ │  │
│                │  │ │ │                                  │ │ │  │
│                │  │ │ └─────────────────────────────────┘ │ │  │
│                │  │ │                                      │ │  │
│                │  │ │ ┌─────────────────────────────────┐ │ │  │
│                │  │ │ │ Media Upload (Optional - Phase2)│ │ │  │
│                │  │ │ │ [Upload area - dashed border]   │ │ │  │
│                │  │ │ └─────────────────────────────────┘ │ │  │
│                │  │ │                                      │ │  │
│                │  │ │ ┌─────────────────────────────────┐ │ │  │
│                │  │ │ │ Primary CTA                     │ │ │  │
│                │  │ │ │ [✨ Generate with AI] (Large)   │ │ │  │
│                │  │ │ │ Loading state: "Generating..."  │ │ │  │
│                │  │ │ └─────────────────────────────────┘ │ │  │
│                │  │ └──────────────────────────────────────┘ │  │
│                │  └─────────────────────────────────────────┘  │
│                │                                                 │
├────────────────┼─────────────────────────────────────────────────┤
│                │  ┌─────────────────────────────────────────┐  │
│                │  │ RightPane (AI Output Studio)            │  │
│                │  │ Width: 50% on desktop, 100% on mobile   │  │
│                │  │                                          │  │
│                │  │ ┌─────────────────────────────────────┐ │  │
│                │  │ │ Tabs Navigation                     │ │  │
│                │  │ │ [Captions] [Hashtags] [Strategy]    │ │  │
│                │  │ │ [Variations]                        │ │  │
│                │  │ └─────────────────────────────────────┘ │  │
│                │  │                                          │  │
│                │  │ ┌─────────────────────────────────────┐ │  │
│                │  │ │ Active Tab Content                  │ │  │
│                │  │ │                                      │ │  │
│                │  │ │ [If Captions Tab:]                  │ │  │
│                │  │ │                                      │ │  │
│                │  │ │ ┌───────────────────────────────┐   │ │  │
│                │  │ │ │ CaptionCard (Instagram)       │   │ │  │
│                │  │ │ │ ┌──┬────────────────────────┐ │   │ │  │
│                │  │ │ │ │📷│ Instagram Feed         │ │   │ │  │
│                │  │ │ │ └──┴────────────────────────┘ │   │ │  │
│                │  │ │ │                              │   │ │  │
│                │  │ │ │ "Launch caption text here... │   │ │  │
│                │  │ │ │ with emojis and formatting"  │   │ │  │
│                │  │ │ │                              │   │ │  │
│                │  │ │ │ Character: 245/2200          │   │ │  │
│                │  │ │ │                              │   │ │  │
```
│                │  │ │ │ [Copy] [Save Draft] [Schedule]│   │ │  │
│                │  │ │ └──────────────────────────────┘   │ │  │
│                │  │ │                                      │ │  │
│                │  │ │ ┌───────────────────────────────┐   │ │  │
│                │  │ │ │ CaptionCard (Twitter)         │   │ │  │
│                │  │ │ │ ┌──┬────────────────────────┐ │   │ │  │
│                │  │ │ │ │🐦│ Twitter Tweet          │ │   │ │  │
│                │  │ │ │ └──┴────────────────────────┘ │   │ │  │
│                │  │ │ │                              │   │ │  │
│                │  │ │ │ "Shorter caption optimized   │   │ │  │
│                │  │ │ │ for Twitter's format..."     │   │ │  │
│                │  │ │ │                              │   │ │  │
│                │  │ │ │ Character: 142/280           │   │ │  │
│                │  │ │ │                              │   │ │  │
│                │  │ │ │ [Copy] [Save Draft] [Schedule]│   │ │  │
│                │  │ │ └──────────────────────────────┘   │ │  │
│                │  │ │                                      │ │  │
│                │  │ │ [Repeat for each selected platform]  │ │  │
│                │  │ │                                      │ │  │
│                │  │ │ ┌───────────────────────────────┐   │ │  │
│                │  │ │ │ Preview Section               │   │ │  │
│                │  │ │ │ "How it will look:"           │   │ │  │
│                │  │ │ │                               │   │ │  │
│                │  │ │ │ [Platform Mock Card]          │   │ │  │
│                │  │ │ │ Shows formatted post preview  │   │ │  │
│                │  │ │ └───────────────────────────────┘   │ │  │
│                │  │ └──────────────────────────────────────┘ │  │
│                │  │                                          │  │
│                │  │ [Empty State before generation:]         │  │
│                │  │ ┌─────────────────────────────────────┐ │  │
│                │  │ │ Icon: Sparkles ✨                    │ │  │
│                │  │ │ "Your AI-generated content will     │ │  │
│                │  │ │  appear here"                       │ │  │
│                │  │ │                                      │ │  │
│                │  │ │ Tips:                               │ │  │
│                │  │ │ • Be specific in your brief         │ │  │
│                │  │ │ • Include key messages              │ │  │
│                │  │ │ • Mention tone preferences          │ │  │
│                │  │ └─────────────────────────────────────┘ │  │
│                │  └─────────────────────────────────────────┘  │
└────────────────┴─────────────────────────────────────────────────┘

Mobile Layout (stacked):
┌──────────────────────────┐
│ Brief Form (scrollable)  │
│ ↓                        │
│ Generate Button          │
│ ↓                        │
│ Results (tabs below)     │
└──────────────────────────┘
```

**CaptionCard Component Spec:**

```typescript
// components/create/caption-card.tsx
interface CaptionCardProps {
  platform: Platform
  caption: string
  characterLimit: number
  onCopy: () => void
  onSaveDraft: () => void
  onSchedule: () => void
  onRegenerate: () => void
}

// Visual hierarchy:
// - Card: bg-card, rounded-lg, p-6, border border-border
// - Hover: shadow-medium, border-primary/20
// - Platform header: 
//   - Icon (24px, colored)
//   - Platform name (text-body font-semibold)
//   - Badge indicating "Optimized for {platform}"
// - Caption text: 
//   - Textarea (editable for tweaks)
//   - Font: text-body, leading-relaxed
//   - Min height: 120px
// - Character counter:
//   - Position: bottom-right of textarea
//   - Color logic:
//     - Green: < 80% of limit
//     - Yellow: 80-95% of limit
//     - Orange: 95-100% of limit
//     - Red: > 100% of limit (with warning icon)
// - Action buttons row:
//   - Copy (ghost, icon: Copy)
//   - Save Draft (outline, icon: Save)
//   - Schedule (primary, icon: Calendar)
//   - Regenerate (ghost, icon: RefreshCw, positioned far right)
```

**Platform Preview Mock:**

```typescript
// components/create/platform-preview.tsx
// Shows how the post will actually look on each platform

interface PlatformPreviewProps {
  platform: Platform
  caption: string
  mediaUrl?: string
  account: {
    username: string
    avatar: string
    displayName: string
  }
}

// Instagram Preview:
// ┌─────────────────────────┐
// │ [@username] [•••]       │
// │ [Profile Pic] John Doe  │
// ├─────────────────────────┤
// │ [Square Image/Video]    │
// │                         │
// ├─────────────────────────┤
// │ ♥ 💬 📤               │
// │                         │
// │ 2,345 likes             │
// │ @username Caption text  │
// │ here with formatting... │
// │                         │
// │ View all 45 comments    │
// │ 2 HOURS AGO             │
// └─────────────────────────┘

// Twitter Preview:
// ┌─────────────────────────┐
// │ [Avatar] John Doe       │
// │          @username • 2h │
// │                         │
// │ Tweet caption text here │
// │ with proper formatting  │
// │ and hashtags...         │
// │                         │
// │ 💬 245  🔁 89  ♥ 1.2K │
// └─────────────────────────┘
```

#### 3.3.2 State Management Architecture

**Zustand Store:**

```typescript
// stores/create-store.ts
interface CreateState {
  // Input state
  selectedPlatforms: Platform[]
  audience: string
  tone: string
  briefText: string
  mediaFiles: File[]
  
  // Output state
  generatedContent: {
    captions: Array<{ platform: Platform; text: string }>
    hashtags: string[]
    strategyNotes: string[]
    variations: string[]
  } | null
  
  // UI state
  isGenerating: boolean
  activeTab: 'captions' | 'hashtags' | 'strategy' | 'variations'
  error: string | null
  
  // Scheduling context (from calendar)
  preselectedDate: Date | null
  preselectedAccounts: string[]
  
  // Actions
  setPlatforms: (platforms: Platform[]) => void
  setAudience: (audience: string) => void
  setTone: (tone: string) => void
  setBriefText: (text: string) => void
  addMediaFile: (file: File) => void
  removeMediaFile: (index: number) => void
  
  generateContent: () => Promise<void>
  regenerateForPlatform: (platform: Platform) => Promise<void>
  refineCaption: (platform: Platform, instruction: string) => Promise<void>
  
  setActiveTab: (tab: string) => void
  saveDraft: (platform: Platform, caption: string) => Promise<void>
  schedulePost: (platform: Platform, caption: string, scheduledAt: Date) => Promise<void>
  
  reset: () => void
}

const useCreateStore = create<CreateState>((set, get) => ({
  selectedPlatforms: [],
  audience: '',
  tone: 'professional',
  briefText: '',
  mediaFiles: [],
  generatedContent: null,
  isGenerating: false,
  activeTab: 'captions',
  error: null,
  preselectedDate: null,
  preselectedAccounts: [],
  
  setPlatforms: (platforms) => set({ selectedPlatforms: platforms }),
  setAudience: (audience) => set({ audience }),
  setTone: (tone) => set({ tone }),
  setBriefText: (text) => set({ briefText: text }),
  
  addMediaFile: (file) => set((state) => ({
    mediaFiles: [...state.mediaFiles, file]
  })),
  
  removeMediaFile: (index) => set((state) => ({
    mediaFiles: state.mediaFiles.filter((_, i) => i !== index)
  })),
  
  generateContent: async () => {
    const { selectedPlatforms, audience, tone, briefText } = get()
    
    // Validation
    if (!briefText.trim()) {
      set({ error: 'Please describe what you want to post' })
      return
    }
    
    if (selectedPlatforms.length === 0) {
      set({ error: 'Please select at least one platform' })
      return
    }
    
    set({ isGenerating: true, error: null })
    
    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief: briefText,
          platforms: selectedPlatforms,
          tone,
          audience
        })
      })
      
      if (!response.ok) {
        throw new Error('AI generation failed')
      }
      
      const data = await response.json()
      
      set({ 
        generatedContent: data.suggestions,
        isGenerating: false,
        activeTab: 'captions'
      })
      
      // Analytics tracking
      trackEvent('ai_content_generated', {
        platforms: selectedPlatforms,
        tone,
        audience
      })
      
    } catch (error) {
      set({ 
        error: 'Failed to generate content. You can still write manually.',
        isGenerating: false
      })
      
      console.error('Generation error:', error)
    }
  },
  
  regenerateForPlatform: async (platform) => {
    set({ isGenerating: true })
    
    try {
      const { briefText, tone, audience } = get()
      
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief: briefText,
          platforms: [platform],
          tone,
          audience,
          regenerate: true
        })
      })
      
      const data = await response.json()
      
      // Update only the specific platform caption
      set((state) => ({
        generatedContent: state.generatedContent ? {
          ...state.generatedContent,
          captions: state.generatedContent.captions.map(c =>
            c.platform === platform 
              ? { platform, text: data.suggestions.captions[0].text }
              : c
          )
        } : null,
        isGenerating: false
      }))
      
    } catch (error) {
      set({ isGenerating: false })
      toast.error('Failed to regenerate caption')
    }
  },
  
  refineCaption: async (platform, instruction) => {
    // E.g., "make it shorter", "add more emojis", "more professional"
    set({ isGenerating: true })
    
    try {
      const currentCaption = get().generatedContent?.captions.find(
        c => c.platform === platform
      )?.text
      
      const response = await fetch('/api/ai/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentCaption,
          platform,
          instruction
        })
      })
      
      const data = await response.json()
      
      set((state) => ({
        generatedContent: state.generatedContent ? {
          ...state.generatedContent,
          captions: state.generatedContent.captions.map(c =>
            c.platform === platform 
              ? { platform, text: data.refinedCaption }
              : c
          )
        } : null,
        isGenerating: false
      }))
      
    } catch (error) {
      set({ isGenerating: false })
      toast.error('Failed to refine caption')
    }
  },
  
  saveDraft: async (platform, caption) => {
    try {
      const response = await fetch('/api/posts/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          caption,
          status: 'draft',
          ai_generated: true,
          ai_prompt: get().briefText
        })
      })
      
      if (!response.ok) throw new Error('Failed to save draft')
      
      toast.success('Draft saved successfully')
      
    } catch (error) {
      toast.error('Failed to save draft')
    }
  },
  
  schedulePost: async (platform, caption, scheduledAt) => {
    // Opens schedule modal (see flow below)
    // This is a trigger, actual scheduling happens in modal
  },
  
  reset: () => set({
    selectedPlatforms: [],
    audience: '',
    tone: 'professional',
    briefText: '',
    mediaFiles: [],
    generatedContent: null,
    isGenerating: false,
    activeTab: 'captions',
    error: null
  })
}))
```

#### 3.3.3 User Flow State Machines

**Flow 1: Basic Content Generation**

```
STATE: C Page Loaded (Empty)
  RENDER: Left pane with empty form, right pane with empty state
  UI: Focus automatically on brief textarea
  ↓
EVENT: User fills form
  STEPS:
    1. Select platforms (Instagram, Twitter, LinkedIn)
       UI: Chips highlight on click, multi-select enabled
    
    2. Select audience (Dropdown)
       OPTIONS: 
         - Gen Z (18-24)
         - Millennials (25-40)
         - Professionals (25-55)
         - General Audience
         - Custom (text input)
    
    3. Select tone (Radio buttons with visual icons)
       OPTIONS:
         - Professional 💼 (formal, authoritative)
         - Casual 😊 (friendly, conversational)
         - Playful 🎉 (fun, energetic, emojis)
         - Inspirational ✨ (motivational, uplifting)
         - Educational 📚 (informative, clear)
    
    4. Write brief (Textarea)
       EXAMPLE: "We're launching our new sustainable water bottle 
                 line next week. Made from 100% recycled materials, 
                 available in 5 colors. Early bird discount 20% off."
       
       VALIDATION: Minimum 20 characters
       UI: Character counter shows minimum (20+) in muted color
  ↓
EVENT: User clicks "Generate with AI"
  ↓
STATE: Validation Check
  IF briefText.length < 20:
    UI: Error message "Please provide more details in your brief"
    ACTION: Focus textarea, shake animation
    STOP FLOW
  
  IF selectedPlatforms.length === 0:
    UI: Error message "Please select at least one platform"
    ACTION: Highlight platform selector with error border
    STOP FLOW
  ↓
STATE: AI Generation in Progress
  UI: Button changes:
      Text: "Generating..." 
      Icon: Spinner animation
      Disabled: true
  
  UI: Right pane shows:
      Loading skeleton cards (one per platform)
      Animation: Pulsing gradient effect
      Text: "AI is crafting your content..."
  
  ACTION: POST /api/ai/generate
          Body: {
            brief: briefText,
            platforms: ['instagram', 'twitter', 'linkedin'],
            tone: 'playful',
            audience: 'Gen Z'
          }
  
  TIMING: Expected 2-4 seconds
  ↓
SUCCESS PATH:
  STATE: Content Generated
  
  ANIMATION: Skeleton cards fade out (200ms)
  ANIMATION: Real content cards fade in + slide up (400ms stagger)
  
  UI: Right pane updates:
      - Tabs appear (Captions, Hashtags, Strategy, Variations)
      - Captions tab active by default
      - 3 CaptionCards displayed (one per platform)
  
  CONTENT STRUCTURE:
    Instagram Caption:
      "🌊 Meet your new hydration hero! Our sustainable water 
       bottles just dropped and they're made from 100% recycled 
       materials 🌍♻️
       
       5 stunning colors. Zero guilt. 💯
       
       Early bird special: 20% OFF this week only! 🎉
       
       Link in bio to shop 🛒✨
       
       #SustainableLiving #EcoFriendly #Hydration #ZeroWaste"
    
    Twitter Caption:
      "New drop alert! 🚨 Our 100% recycled water bottles are 
       here in 5 colors 🌈 Get 20% off this week! 
       
       Sustainable hydration never looked this good 💧♻️
       
       Shop now: [link]"
    
    LinkedIn Caption:
      "We're excited to announce the launch of our sustainable 
       water bottle collection. Each bottle is crafted from 100% 
       recycled materials, representing our commitment to 
       environmental responsibility.
       
       Available in five colors, with an early adoption discount 
       of 20% through [date].
       
       Learn more: [link]
       
       #Sustainability #ProductLaunch #CircularEconomy"
  
  UI: Each card shows:
      - Platform-specific formatting
      - Character count with color coding
      - Action buttons enabled
  
  UI: Success toast: "Content generated successfully! ✨"
  
  ANALYTICS: Track generation_success event
  ↓
ERROR PATH:
  STATE: Generation Failed
  
  UI: Right pane shows error card:
      Icon: AlertCircle (red)
      Title: "AI Generation Temporarily Unavailable"
      Message: "You can still create content manually or try again"
      Buttons:
        - "Try Again" (retry generation)
        - "Write Manually" (focus on brief textarea)
  
  UI: Error toast: "Failed to generate content"
  
  UI: Button returns to normal state
  
  LOG: Error to monitoring system
```

**Flow 2: Refine & Iterate Generated Content**

```
STATE: Content Generated (Captions visible)
  ↓
EVENT: User clicks "Regenerate" on Instagram caption
  ↓
STATE: Regenerating Single Caption
  UI: That specific CaptionCard shows loading overlay
  UI: Other cards remain interactive
  
  ACTION: POST /api/ai/generate (with regenerate flag)
  ↓
STATE: New Caption Received
  ANIMATION: Card content cross-fade (300ms)
  UI: New caption appears
  UI: Toast: "Instagram caption regenerated"
  ↓
EVENT: User clicks "Refine" button (appears on hover/focus)
  ↓
STATE: Refine Dialog Opens
  RENDER: Popover or small dialog
  UI: Quick refinement options (radio buttons):
      - "Make it shorter"
      - "Add more emojis"
      - "More professional tone"
      - "More casual tone"
      - "Include call-to-action"
      - "Custom instruction" (text input)
  
  UI: "Apply" button (primary)
  ↓
EVENT: User selects "Add more emojis" and clicks Apply
  ↓
STATE: Refining Caption
  UI: Card shows loading overlay
  ACTION: POST /api/ai/refine
          Body: {
            currentCaption: "...",
            platform: "instagram",
            instruction: "add_more_emojis"
          }
  ↓
STATE: Refined Caption Received
  ANIMATION: Content updates with highlight pulse
  UI: Caption now has additional emojis
  UI: Toast: "Caption refined"
  UI: Undo button appears for 5 seconds (reverts to previous)
```

**Flow 3: Save Draft from Generated Content**

```
STATE: Generated Caption Card Displayed
  ↓
EVENT: User clicks "Save Draft" button on Instagram card
  ↓
STATE: Draft Saving
  UI: Button shows spinner
  UI: Other buttons disabled temporarily
  
  ACTION: POST /api/posts/drafts
          Body: {
            team_id: currentTeamId,
            platform: 'instagram',
            caption: captionText,
            hashtags: extractHashtags(captionText),
            status: 'draft',
            ai_generated: true,
            ai_prompt: originalBrief,
            created_by: currentUserId
          }
  ↓
SUCCESS PATH:
  STATE: Draft Saved
  UI: Button returns to normal
  UI: Success badge appears on card (3 seconds)
  UI: Toast: "Draft saved to Instagram" with "View Drafts" link
  
  ACTION: Draft appears in drafts list (if drafts drawer exists)
  ↓
ERROR PATH:
  STATE: Save Failed
  UI: Error toast: "Failed to save draft"
  UI: Button shows retry option
```

**Flow 4: Schedule Post from C Page**

```
STATE: Generated Caption Card Displayed
  ↓
EVENT: User clicks "Schedule" button
  ↓
STATE: Schedule Modal Opens
  RENDER: Dialog (large)
  
  MODAL CONTENT:
    ┌────────────────────────────────────┐
    │ Schedule Post                      │
    ├────────────────────────────────────┤
    │                                    │
    │ Caption Preview (read-only):       │
    │ [Caption text in card...]          │
    │                                    │
    │ Select Accounts:                   │
    │ [Combobox - multi-select]          │
    │ ☑ @johndoe_insta                  │
    │ ☑ @business_insta                 │
    │                                    │
    │ Schedule Date & Time:              │
    │ [DatePicker] [TimePicker]          │
    │ Suggested times (links):           │
    │ • Best time: 7:00 PM (highest eng.)│
    │ • Tomorrow at 9:00 AM              │
    │ • Next Monday at 2:00 PM           │
    │                                    │
    │ Post immediately? [Switch]         │
    │                                    │
    │ [Cancel] [Schedule Post]           │
    └────────────────────────────────────┘
  
  PREFILL LOGIC:
    - If user came from calendar (preselectedDate exists):
      → Date picker shows preselectedDate
    - If preselectedAccounts exist:
      → Account selector pre-selects those accounts
    - Otherwise:
      → Date defaults to tomorrow at best time
      → Accounts shows all available accounts for platform
  ↓
EVENT: User selects accounts, date, time, clicks "Schedule Post"
  ↓
STATE: Validation
  CHECKS:
    - At least one account selected
    - Date/time is in future (unless "post immediately")
    - Caption within platform limits
  
  IF INVALID:
    UI: Show validation error inline
    STOP FLOW
  ↓
STATE: Scheduling Post
  UI: Button shows spinner
  UI: Modal content slightly dimmed
  
  ACTION: POST /api/posts/scheduled
          Body: {
            team_id: currentTeamId,
            account_ids: selectedAccountIds,
            platform: 'instagram',
            caption: captionText,
            hashtags: extractedHashtags,
            scheduled_at: scheduledDateTime,
            status: 'scheduled',
            ai_generated: true,
            ai_prompt: originalBrief,
            created_by: currentUserId
          }
  ↓
SUCCESS PATH:
  STATE: Post Scheduled
  UI: Modal closes with fade-out
  UI: Success toast: "Post scheduled for Nov 6 at 7:00 PM" 
      with "View in Calendar" link
  
  ANIMATION: CaptionCard shows success state (green checkmark)
  
  ACTION: If "View in Calendar" clicked:
          → Navigate to /o?month=2025-11&selected=2025-11-06
          → Auto-open DayDetailPanel with new post visible
  ↓
ERROR PATH:
  STATE: Scheduling Failed
  UI: Error message in modal
  UI: "Failed to schedule post: {reason}"
  UI: Buttons: "Try Again" | "Save as Draft Instead"
  
  IF "Save as Draft Instead":
    → Trigger save draft flow
    → Close modal
```

**Flow 5: Explore Other AI Outputs (Hashtags, Strategy, Variations)**

```
STATE: Captions Tab Active
  ↓
EVENT: User clicks "Hashtags" tab
  ↓
STATE: Hashtags Tab Active
  ANIMATION: Tab content fade-transition (200ms)
  
  RENDER: Hashtags display
    UI Structure:
      ┌────────────────────────────────┐
      │ Recommended Hashtags           │
      │                                │
      │ Trending (High engagement):    │
      │ #SustainableLiving             │
      │ #EcoFriendly                   │
      │ #ZeroWaste                     │
      │ [Copy All]                     │
      │                                │
      │ Niche (Targeted reach):        │
      │ #SustainableHydration          │
      │ #RecycledMaterials             │
      │ #EcoWarrior                    │
      │ [Copy All]                     │
      │                                │
      │ Branded:                       │
      │ #YourBrandName                 │
      │ #BrandCampaign                 │
      │ [Copy All]                     │
      │                                │
      │ Custom Mix (Copy any combo):   │
      │ [Select checkboxes for each]   │
      │ [Copy Selected (5)]            │
      └────────────────────────────────┘
  
  INTERACTION:
    - Each hashtag is clickable to copy individually
    - "Copy All" copies category as plain text
    - "Copy Selected" creates space-separated string
  ↓
EVENT: User clicks "Strategy" tab
  ↓
STATE: Strategy Tab Active
  ANIMATION: Fade transition
  
  RENDER: Strategy insights
    UI Structure:
      ┌────────────────────────────────┐
      │ AI Strategy Recommendations    │
      │                                │
      │ ┌────────────────────────────┐ │
      │ │ 💡 Best Time to Post       │ │
      │ │                            │ │
      │ │ Instagram: 7:00 PM - 9:00 PM│ │
      │ │ (Wed, Fri, Sun)            │ │
      │ │                            │ │
      │ │ Twitter: 12:00 PM - 1:00 PM│ │
      │ │ (Weekdays)                 │ │
      │ │                            │ │
      │ │ LinkedIn: 8:00 AM - 10:00 AM│ │
      │ │ (Tue, Wed, Thu)            │ │
      │ └────────────────────────────┘ │
      │                                │
      │ ┌────────────────────────────┐ │
      │ │ 📊 Content Format Tips     │ │
      │ │                            │ │
      │ │ • Instagram: Use carousel  │ │
      │ │   posts showing product    │ │
      │ │   colors (5x higher saves) │ │
      │ │                            │ │
      │ │ • Twitter: Include product │ │
      │ │   image + link (3x clicks) │ │
      │ │                            │ │
      │ │ • LinkedIn: Add case study │ │
      │ │   or sustainability metrics│ │
      │ └────────────────────────────┘ │
      │                                │
      │ ┌────────────────────────────┐ │
      │ │ 🎯 Engagement Boosters     │ │
      │ │                            │ │
      │ │ • Ask question in caption  │ │
      │ │   ("What's your favorite   │ │
      │ │   color?")                 │ │
      │ │                            │ │
      │ │ • Run Instagram story poll │ │
      │ │   simultaneously           │ │
      │ │                            │ │
      │ │ • Respond to comments      │ │
      │ │   within first hour        │ │
      │ └────────────────────────────┘ │
      └────────────────────────────────┘
  ↓
EVENT: User clicks "Variations" tab
  ↓
STATE: Variations Tab Active
  ANIMATION: Fade transition
  
  RENDER: Alternative captions
    UI Structure:
      ┌────────────────────────────────┐
      │ Caption Variations             │
      │                                │
      │ Try these alternative versions:│
      │                                │
      │ ┌────────────────────────────┐ │
      │ │ Variation 1 (Question-led) │ │
      │ │                            │ │
      │ │ "What if your water bottle │ │
      │ │ could help save the planet?│ │
      │ │ 🌍                         │ │
      │ │                            │ │
      │ │ Our new collection is made │ │
      │ │ from 100% recycled..."     │ │
      │ │                            │ │
      │ │ [Use This] [Copy]          │ │
      │ └────────────────────────────┘ │
      │                                │
      │ ┌────────────────────────────┐ │
      │ │ Variation 2 (Stats-focused)│ │
      │ │                            │ │
      │ │ "1 billion plastic bottles │ │
      │ │ enter our oceans yearly 🌊 │ │
      │ │                            │ │
      │ │ Be part of the solution    │ │
      │ │ with our recycled..."      │ │
      │ │                            │ │
      │ │ [Use This] [Copy]          │ │
      │ └────────────────────────────┘ │
      │                                │
      │ [Repeat for 2-3 more variants] │
      └────────────────────────────────┘
  
  INTERACTION:
    - "Use This" replaces the main caption in Captions tab
    - "Copy" copies to clipboard
    - User can switch back to Captions tab to see replacement
```

#### 3.3.4 API Contracts

**POST /api/ai/generate**

```typescript
// Request
POST /api/ai/generate
{
  "brief": "We're launching our new sustainable water bottle line...",
  "platforms": ["instagram", "twitter", "linkedin"],
  "tone": "playful",
  "audience": "Gen Z (18-24)",
  "previous_metrics": { // Optional - for context-aware generation
    "best_performing_topics": ["sustainability", "product launches"],
    "avg_engagement_rate": 4.2
  },
  "regenerate": false // true if regenerating specific content
}

// Response (200 OK)
{
  "suggestions": {
    "captions": [
      {
        "platform": "instagram",
        "text": "🌊 Meet your new hydration hero! Our sustainable water bottles...",
        "character_count": 245,
        "estimated_reading_time": "15 seconds"
      },
      {
        "platform": "twitter",
        "text": "New drop alert! 🚨 Our 100% recycled water bottles...",
        "character_count": 142,
        "estimated_reading_time": "8 seconds"
      },
      {
        "platform": "linkedin",
        "text": "We're excited to announce the launch of our sustainable...",
        "character_count": 380,
        "estimated_reading_time": "25 seconds"
      }
    ],
    "hashtags": {
      "trending": ["#SustainableLiving", "#EcoFriendly", "#ZeroWaste"],
      "niche": ["#SustainableHydration", "#RecycledMaterials", "#EcoWarrior"],
      "branded": ["#YourBrandName", "#BrandCampaign"]
    },
    "strategy_notes": [
      {
        "category": "timing",
        "title": "Best Time to Post",
        "insights": [
          {
            "platform": "instagram",
            "recommendation": "7:00 PM - 9:00 PM on Wed, Fri, Sun",
            "reason": "Peak engagement for Gen Z audience"
          },
          {
            "platform": "twitter",
            "recommendation": "12:00 PM - 1:00 PM on weekdays",
            "reason": "Lunch break scrolling window"
          }
        ]
      },
      {
        "category": "format",
        "title": "Content Format Tips",
        "insights": [
          "Instagram: Use carousel showing 5 product colors (5x higher saves)",
          "Twitter: Include product image + direct link (3x click-through)",
          "LinkedIn: Add sustainability metrics or case study"
        ]
      },
      {
        "category": "engagement",
        "title": "Engagement Boosters",
        "insights": [
          "Ask question: 'What's your favorite color?'",
          "Run simultaneous Instagram story poll",
          "Respond to comments within first hour"
        ]
      }
    ],
    "variations": [
      {
        "style": "question-led",
        "text": "What if your water bottle could help save the planet? 🌍..."
      },
      {
        "style": "stats-focused",
        "text": "1 billion plastic bottles enter our oceans yearly 🌊..."
      },
      {
        "style": "storytelling",
        "text": "Every bottle has a story. Ours starts with 100% recycled materials..."
      }
    ]
  },
  "generation_metadata": {
    "model_used": "gpt-4-turbo-preview",
    "generation_time_ms": 2340,
    "tokens_used": 1850,
    "confidence_score": 0.92
  }
}

// Error Response (429 Rate Limit)
{
  "error": "AI generation rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "hint": "You can generate again in 5 minutes",
  "retry_after": 300,
  "fallback": {
    "manual_creation_available": true,
    "templates_available": true
  }
}

// Error Response (500 AI Service Error)
{
  "error": "AI service temporarily unavailable",
  "code": "AI_SERVICE_ERROR",
  "hint": "You can still write content manually or try again",
  "fallback": {
    "manual_creation_available": true,
    "last_successful_generation": "2025-11-18T10:30:00Z"
  }
}
```

**POST /api/ai/refine**

```typescript
// Request
POST /api/ai/refine
{
  "current_caption": "🌊 Meet your new hydration hero!...",
  "platform": "instagram",
  "instruction": "add_more_emojis", // or "make_shorter", "more_professional", etc.
  "custom_instruction": null // Used if instruction is "custom"
}

// Response (200 OK)
{
  "refined_caption": "🌊💧 Meet your new hydration hero! 🦸‍♀️ Our sustainable water bottles...",
  "changes_made": [
    "Added 3 additional emojis",
    "Maintained character count within platform limits"
  ],
  "character_count": 248,
  "diff": { // Visual diff for UI highlighting
    "added": ["💧", "🦸‍♀️"],
    "removed": [],
    "modified_sentences": []
  }
}
```

**POST /api/posts/drafts**

```typescript
// Request
POST /api/posts/drafts
{
  "team_id": "uuid",
  "platform": "instagram",
  "caption": "🌊 Meet your new hydration hero!...",
  "hashtags": ["#SustainableLiving", "#EcoFriendly"],
  "media_urls": [], // Empty for now, Phase 2 feature
  "status": "draft",
  "ai_generated": true,
  "ai_prompt": "We're launching our new sustainable water bottle line...",
  "ai_model": "gpt-4-turbo-preview"
}

// Response (201 Created)
{
  "draft": {
    "id": "uuid",
    "platform": "instagram",
    "caption": "🌊 Meet your new hydration hero!...",
    "status": "draft",
    "created_at": "2025-11-18T12:00:00Z",
    "created_by": "uuid"
  },
  "message": "Draft saved successfully"
}
```

#### 3.3.5 Component Tree

```
CPage (Server Component)
├─ Shell Layout
│  ├─ TopNav
│  └─ SidebarNav (C active)
│
├─ CreateContent (Client Component)
│  ├─ TwoColumnLayout
│  │  ├─ LeftPane (Input Studio)
│  │  │  ├─ PageHeader
│  │  │  │  ├─ Title ("Create with AI")
│  │  │  │  ├─ Subtitle ("Describe your content, we'll craft it")
│  │  │  │  └─ ResetButton (ghost, clears form)
│  │  │  │
│  │  │  ├─ BriefForm
│  │  │  │  ├─ PlatformSelector
│  │  │  │  │  ├─ Label ("Select Platforms")
│  │  │  │  │  └─ PlatformChips (multi-select)
│  │  │  │  │     ├─ PlatformChip (Instagram) [icon + name]
│  │  │  │  │     ├─ PlatformChip (Facebook)
│  │  │  │  │     ├─ PlatformChip (Twitter)
│  │  │  │  │     ├─ PlatformChip (YouTube)
│  │  │  │  │     ├─ PlatformChip (LinkedIn)
│  │  │  │  │     └─ PlatformChip (TikTok)
│  │  │  │  │
│  │  │  │  ├─ AudienceSelector
│  │  │  │  │  ├─ Label ("Target Audience")
│  │  │  │  │  └─ Select
│  │  │  │  │     ├─ Option (Gen Z 18-24)
│  │  │  │  │     ├─ Option (Millennials 25-40)
│  │  │  │  │     ├─ Option (Professionals 25-55)
│  │  │  │  │     ├─ Option (General Audience)
│  │  │  │  │     └─ Option (Custom) [triggers text input]
│  │  │  │  │
│  │  │  │  ├─ ToneSelector
│  │  │  │  │  ├─ Label ("Content Tone")
│  │  │  │  │  └─ RadioGroup (visual cards)
│  │  │  │  │     ├─ ToneCard (Professional) [💼 + description]
│  │  │  │  │     ├─ ToneCard (Casual) [😊]
│  │  │  │  │     ├─ ToneCard (Playful) [🎉]
│  │  │  │  │     ├─ ToneCard (Inspirational) [✨]
│  │  │  │  │     └─ ToneCard (Educational) [📚]
│  │  │  │  │
│  │  │  │  ├─ BriefTextarea
│  │  │  │  │  ├─ Label ("Describe Your Content")
│  │  │  │  │  ├─ Textarea (auto-resize, min-height: 120px)
│  │  │  │  │  ├─ Placeholder (with examples)
│  │  │  │  │  ├─ CharacterCounter (shows min: 20+)
│  │  │  │  │  └─ ValidationMessage (if errors)
│  │  │  │  │
│  │  │  │  ├─ MediaUploadSection (Phase 2 - placeholder)
│  │  │  │  │  ├─ Label ("Add Media (Optional)")
│  │  │  │  │  └─ UploadArea
│  │  │  │  │     ├─ DashedBorder
│  │  │  │  │     ├─ UploadIcon
│  │  │  │  │     └─ Text ("Coming Soon")
│  │  │  │  │
│  │  │  │  └─ GenerateButton (Primary CTA)
│  │  │  │     ├─ Icon (Sparkles)
│  │  │  │     ├─ Text ("Generate with AI")
│  │  │  │     └─ LoadingState (when isGenerating)
│  │  │  │
│  │  │  └─ HelpSection (collapsible)
│  │  │     ├─ Accordion trigger ("Tips for better results")
│  │  │     └─ AccordionContent
│  │  │        ├─ Tip ("Be specific about your message")
│  │  │        ├─ Tip ("Mention key details and dates")
│  │  │        └─ Tip ("Include your desired tone")
│  │  │
│  │  └─ RightPane (Output Studio)
│  │     ├─ EmptyState (before generation)
│  │     │  ├─ Icon (Sparkles, large, animated)
│  │     │  ├─ Heading ("Your AI-generated content will appear here")
│  │     │  └─ TipsList
│  │     │     ├─ Tip ("Be specific in your brief")
│  │     │     ├─ Tip ("Include key messages")
│  │     │     └─ Tip ("Mention tone preferences")
│  │     │
│  │     ├─ LoadingState (during generation)
│  │     │  ├─ AnimatedIcon (pulsing sparkles)
│  │     │  ├─ LoadingText ("AI is crafting your content...")
│  │     │  └─ SkeletonCards (one per platform)
│  │     │     └─ SkeletonCard (pulsing gradient)
│  │     │
│  │     ├─ GeneratedContent (after success)
│  │     │  ├─ TabsNavigation
│  │     │  │  ├─ TabTrigger ("Captions") [default active]
│  │     │  │  ├─ TabTrigger ("Hashtags")
│  │     │  │  ├─ TabTrigger ("Strategy")
│  │     │  │  └─ TabTrigger ("Variations")
│  │     │  │
│  │     │  ├─ TabContent (Captions)
│  │     │  │  ├─ CaptionsHeader
│  │     │  │  │  ├─ Title ("Platform Captions")
│  │     │  │  │  └─ RegenerateAllButton (ghost)
│  │     │  │  │
│  │     │  │  └─ CaptionsList
│  │     │  │     └─ CaptionCard (repeat per platform)
│  │     │  │        ├─ CardHeader
│  │     │  │        │  ├─ PlatformIcon (colored, 24px)
│  │     │  │        │  ├─ PlatformName
│  │     │  │        │  └─ OptimizedBadge ("Optimized for {platform}")
│  │     │  │        │
│  │     │  │        ├─ CaptionContent
│  │     │  │        │  ├─ EditableTextarea
│  │     │  │        │  │  └─ Value (generated caption)
│  │     │  │        │  ├─ CharacterCounter
│  │     │  │        │  │  └─ ColorCoded (green/yellow/orange/red)
│  │     │  │        │  └─ RefineButton (popover trigger)
│  │     │  │        │
│  │     │  │        ├─ PreviewSection (expandable)
│  │     │  │        │  ├─ Toggle ("Show Preview")
│  │     │  │        │  └─ PlatformPreview
│  │     │  │        │     └─ MockPostCard (platform-specific UI)
│  │     │  │        │
│  │     │  │        └─ CardActions
│  │     │  │           ├─ CopyButton (ghost, icon: Copy)
│  │     │  │           ├─ SaveDraftButton (outline, icon: Save)
│  │     │  │           ├─ ScheduleButton (primary, icon: Calendar)
│  │     │  │           └─ RegenerateButton (ghost, icon: RefreshCw)
│  │     │  │
│  │     │  ├─ TabContent (Hashtags)
│  │     │  │  ├─ HashtagsHeader
│  │     │  │  │  └─ Title ("Recommended Hashtags")
│  │     │  │  │
│  │     │  │  └─ HashtagGroups
│  │     │  │     ├─ HashtagGroup (Trending)
│  │     │  │     │  ├─ GroupLabel ("Trending")
│  │     │  │     │  ├─ Description ("High engagement potential")
│  │     │  │     │  ├─ HashtagList
│  │     │  │     │  │  └─ HashtagBadge (repeat, clickable)
│  │     │  │     │  └─ CopyAllButton
│  │     │  │     │
│  │     │  │     ├─ HashtagGroup (Niche)
│  │     │  │     │  └─ [Same structure]
│  │     │  │     │
│  │     │  │     ├─ HashtagGroup (Branded)
│  │     │  │     │  └─ [Same structure]
│  │     │  │     │
│  │     │  │     └─ CustomMixSection
│  │     │  │        ├─ Label ("Build Custom Mix")
│  │     │  │        ├─ CheckboxGroup (all hashtags)
│  │     │  │        └─ CopySelectedButton
│  │     │  │
│  │     │  ├─ TabContent (Strategy)
│  │     │  │  ├─ StrategyHeader
│  │     │  │  │  └─ Title ("AI Strategy Recommendations")
│  │     │  │  │
│  │     │  │  └─ StrategyCards
│  │     │  │     ├─ StrategyCard (Timing)
│  │     │  │     │  ├─ CardHeader
│  │     │  │     │  │  ├─ Icon (Clock)
│  │     │  │     │  │  └─ Title ("Best Time to Post")
│  │     │  │     │  └─ CardContent
│  │     │  │     │     └─ TimingList (per platform)
│  │     │  │     │
│  │     │  │     ├─ StrategyCard (Format)
│  │     │  │     │  ├─ CardHeader
│  │     │  │     │  │  ├─ Icon (Layout)
│  │     │  │     │  │  └─ Title ("Content Format Tips")
│  │     │  │     │  └─ CardContent
│  │     │  │     │     └─ TipsList (bullet points)
│  │     │  │     │
│  │     │  │     └─ StrategyCard (Engagement)
│  │     │  │        ├─ CardHeader
│  │     │  │        │  ├─ Icon (TrendingUp)
│  │     │  │        │  └─ Title ("Engagement Boosters")
│  │     │  │        └─ CardContent
│  │     │  │           └─ BoostersList
│  │     │  │
│  │     │  └─ TabContent (Variations)
│  │     │     ├─ VariationsHeader
│  │     │     │  └─ Title ("Caption Variations")
│  │     │     │
│  │     │     └─ VariationsList
│  │     │        └─ VariationCard (repeat 3-4)
│  │     │           ├─ CardHeader
│  │     │           │  ├─ StyleBadge ("Question-led", "Stats-focused", etc.)
│  │     │           │  └─ PreferenceTag (if matches user history)
│  │     │           ├─ VariationText (read-only textarea)
│  │     │           └─ CardActions
│  │     │              ├─ UseThisButton (replaces main caption)
│  │     │              └─ CopyButton
│  │     │
│  │     └─ ErrorState (on generation failure)
│  │        ├─ Icon (AlertCircle, red)
│  │        ├─ Title ("AI Generation Temporarily Unavailable")
│  │        ├─ Description ("You can still create content manually...")
│  │        └─ ActionButtons
│  │           ├─ TryAgainButton (primary)
│  │           └─ WriteManuallyButton (outline)
│  │
│  └─ FloatingHelp (bottom-right)
│     └─ HelpButton
│        └─ Popover
│           ├─ KeyboardShortcuts
│           ├─ FAQs
│           └─ ContactSupport
│
├─ ScheduleModal (Dialog)
│  ├─ DialogHeader
│  │  ├─ Title ("Schedule Post")
│  │  └─ CloseButton
│  │
│  ├─ DialogContent
│  │  ├─ CaptionPreview (read-only Card)
│  │  │  ├─ PlatformBadge
│  │  │  ├─ CaptionText (truncated)
│  │  │  └─ CharacterCount
│  │  │
│  │  ├─ AccountSelector
│  │  │  ├─ Label ("Select Accounts")
│  │  │  └─ Combobox (multi-select)
│  │  │     └─ AccountOption (repeat)
│  │  │        ├─ Avatar
│  │  │        ├─ Username
│  │  │        └─ Checkbox
│  │  │
│  │  ├─ SchedulingSection
│  │  │  ├─ Label ("Schedule Date & Time")
│  │  │  ├─ DateTimePicker
│  │  │  │  ├─ DatePicker (calendar popover)
│  │  │  │  └─ TimePicker (dropdown with 15min intervals)
│  │  │  │
│  │  │  └─ SuggestedTimes (quick links)
│  │  │     ├─ SuggestedTime ("Best time: 7:00 PM")
│  │  │     ├─ SuggestedTime ("Tomorrow at 9:00 AM")
│  │  │     └─ SuggestedTime ("Next Monday at 2:00 PM")
│  │  │
│  │  ├─ PostImmediatelySwitch
│  │  │  ├─ Switch
│  │  │  └─ Label ("Post immediately")
│  │  │
│  │  └─ ValidationMessages (if any errors)
│  │
│  └─ DialogFooter
│     ├─ CancelButton (ghost)
│     └─ ScheduleButton (primary, loading state)
│
└─ RefinePopover (attached to RefineButton)
   ├─ PopoverHeader ("Refine Caption")
   ├─ PopoverContent
   │  ├─ QuickOptions (RadioGroup)
   │  │  ├─ Option ("Make it shorter")
   │  │  ├─ Option ("Add more emojis")
   │  │  ├─ Option ("More professional tone")
   │  │  ├─ Option ("More casual tone")
   │  │  ├─ Option ("Include call-to-action")
   │  │  └─ Option ("Custom instruction")
   │  │
   │  ├─ CustomInput (if custom selected)
   │  │  └─ Textarea ("Describe your refinement...")
   │  │
   │  └─ ApplyButton (primary)
   │
   └─ PopoverFooter
      └─ CancelButton (ghost)
```

#### 3.3.6 Advanced AI Features (Phase 2 Considerations)

**Streaming AI Responses:**

```typescript
// For real-time generation feedback
// components/create/streaming-caption-generator.tsx

'use client'

import { useCompletion } from 'ai/react'

export function StreamingCaptionGenerator({ brief, platform }: Props) {
  const { completion, complete, isLoading } = useCompletion({
    api: '/api/ai/generate-stream',
  })
  
  const handleGenerate = () => {
    complete(brief, {
      body: { platform, tone: selectedTone }
    })
  }
  
  return (
    <Card>
      <CaptionText>
        {completion || 'Caption will appear here as it generates...'}
      </CaptionText>
      {isLoading && <TypingIndicator />}
    </Card>
  )
}
```

**AI Learning from User Feedback:**

```typescript
// Track which captions users actually use
// This data improves future generations

POST /api/ai/feedback
{
  "generation_id": "uuid",
  "action": "used", // or "dismissed", "edited"
  "platform": "instagram",
  "final_caption": "User's edited version...",
  "edits_made": ["removed_emoji", "added_cta"],
  "performance_data": { // Added after post is published
    "likes": 1240,
    "comments": 45,
    "engagement_rate": 4.8
  }
}

// AI system uses this to:
// - Learn user's writing style
// - Optimize future generations
// - Suggest improvements based on what works
```

**Brand Voice Consistency (Enterprise Feature):**

```typescript
// Store brand guidelines in database
// AI references these for consistent tone

CREATE TABLE brand_guidelines (
  id UUID PRIMARY KEY,
  team_id UUID REFERENCES teams(id),
  voice_description TEXT,
  do_examples TEXT[],
  dont_examples TEXT[],
  key_phrases TEXT[],
  banned_words TEXT[],
  emoji_policy TEXT, // liberal, moderate, minimal, none
  hashtag_strategy TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

// Include in AI prompt:
"Brand Voice Guidelines:
- Tone: {voice_description}
- Always use: {key_phrases}
- Never use: {banned_words}
- Emoji policy: {emoji_policy}"
```

---

### 3.4 I – Influence (Coming Soon - Placeholder)

#### 3.4.1 Purpose & Future Vision

**Phase 1 Implementation: Static Placeholder ONLY**

This page serves as a **teaser** for future functionality. NO backend logic, NO API integrations, NO data fetching in Phase 1.

**Future Vision (Phase 2+):**
- Influencer marketplace discovery
- Brand collaboration management
- Campaign deal flow
- Contract & payment tracking
- Performance-based partnerships

#### 3.4.2 Visual Design Specification (Placeholder)

```
┌─────────────────────────────────────────────────────────────────┐
│ TopNav                                                           │
├────────────────┬────────────────────────────────────────────────┤
│ Sidebar        │                                                 │
│                │                                                 │
│ X              │        [Centered Content - Vertically]         │
│ O              │                                                 │
│ C              │    ┌───────────────────────────────────────┐   │
│ I [active]     │    │  [Illustration]                       │   │
│ A              │    │  Two people shaking hands             │   │
│ L              │    │  Network nodes connecting             │   │
│                │    │  Subtle gradient background           │   │
│                │    │  (cosmic teal to purple)              │   │
│                │    └───────────────────────────────────────┘   │
│                │                                                 │
│                │    ┌───────────────────────────────────────┐   │
│                │    │  "I" in large display font            │   │
│                │    │  Influence                            │   │
│                │    └───────────────────────────────────────┘   │
│                │                                                 │
│                │    ┌───────────────────────────────────────┐   │
│                │    │  Coming Soon                          │   │
│                │    │  (Badge style, accent color)          │   │
│                │    └───────────────────────────────────────┘   │
│                │                                                 │
│                │    ┌───────────────────────────────────────┐   │
│                │    │  Discover brand collaborations,       │   │
│                │    │  manage partnerships, and unlock new  │   │
│                │    │  opportunities with our influencer    │   │
│                │    │  marketplace.                         │   │
│                │    │                                        │   │
│                │    │  (text-body, text-muted, centered,    │   │
│                │    │   max-width: 500px)                   │   │
│                │    └───────────────────────────────────────┘   │
│                │                                                 │
│                │    ┌───────────────────────────────────────┐   │
│                │    │  [Notify Me When Live] (Button)       │   │
│                │    │  (Primary style, with bell icon)      │   │
│                │    └───────────────────────────────────────┘   │
│                │                                                 │
│                │    ┌───────────────────────────────────────┐   │
│                │    │  What's Coming:                       │   │
│                │    │                                        │   │
│                │    │  ✓ Brand collaboration discovery      │   │
│                │    │  ✓ Partnership management             │   │
│                │    │  ✓ Campaign tracking                  │   │
│                │    │  ✓ Performance analytics              │   │
│                │    │                                        │   │
│                │    │  (Small card, muted background)       │   │
│                │    └───────────────────────────────────────┘   │
│                │                                                 │
└────────────────┴─────────────────────────────────────────────────┘
```

#### 3.4.3 Component Structure

```
IPage (Server Component)
├─ Shell Layout
│  ├─ TopNav
│  └─ SidebarNav (I active with "Coming Soon" badge)
│
└─ ComingSoonContent (Client Component)
   ├─ CenteredContainer (max-width: 600px, mx-auto, py-20)
   │  ├─ IllustrationSection
   │  │  └─ IllustrationImage
   │  │     └─ Source: /illustrations/collaboration.svg
   │  │     └─ Alt: "People collaborating and connecting"
   │  │
   │  ├─ PageTitle
   │  │  ├─ PageLetter ("I" in display font)
   │  │  └─ PageName ("Influence" in h1)
   │  │
   │  ├─ ComingSoonBadge
   │  │  └─ Badge component (accent color, "Coming Soon")
   │  │
   │  ├─ DescriptionText
   │  │  └─ Paragraph (centered, text-muted)
   │  │
   │  ├─ NotifyButton (Optional - captures interest)
   │  │  ├─ Button (primary)
   │  │  ├─ Icon (Bell)
   │  │  └─ Text ("Notify Me When Live")
   │  │  └─ onClick: Opens NotifyDialog
   │  │
   │  └─ FeaturePreviewCard
   │     ├─ CardHeader ("What's Coming:")
   │     └─ FeatureList
   │        ├─ FeatureItem (Checkmark + "Brand collaboration discovery")
   │        ├─ FeatureItem (Checkmark + "Partnership management")
   │        ├─ FeatureItem (Checkmark + "Campaign tracking")
   │        └─ FeatureItem (Checkmark + "Performance analytics")
   │
   └─ NotifyDialog (Modal - optional)
      ├─ DialogHeader ("Stay Updated")
      ├─ DialogContent
      │  ├─ Description ("We'll email you when Influence launches")
      │  ├─ EmailInput
      │  └─ NotificationPreferences (checkboxes)
      │
      └─ DialogFooter
         ├─ CancelButton
         └─ SubmitButton ("Notify Me")
```

#### 3.4.4 Optional Waitlist Implementation

**ONLY if client wants to capture user interest:**

```typescript
// API route (optional)
POST /api/feature-waitlist
{
  "feature_name": "influence",
  "user_email": "user@example.com",
  "notification_preferences": {
    "email": true,
    "in_app": true
  }
}

// Response (201 Created)
{
  "success": true,
  "message": "You'll be notified when Influence launches",
  "waitlist_position": 247 // Optional: gamification element
}

// Database entry (if implementing)
INSERT INTO feature_waitlist (
  user_id,
  feature_name,
  subscribed_at
) VALUES (
  current_user_id,
  'influence',
  NOW()
)
```

**Component Implementation:**

```typescript
// components/coming-soon/notify-dialog.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

export function NotifyDialog({ isOpen, onClose }: Props) {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const handleSubmit = async () => {
    setIsSubmitting(true)
    
    try {
      const response = await fetch('/api/feature-waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feature_name: 'influence',
          user_email: email
        })
      })
      
      if (!response.ok) throw new Error('Failed to subscribe')
      
      toast.success("You're on the list! We'll notify you when Influence launches.")
      onClose()
      
    } catch (error) {
      toast.error('Failed to subscribe. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <h3>Stay Updated on Influence</h3>
          <p className="text-muted">We'll email you when this feature launches</p>
        </DialogHeader>
        
        <div className="space-y-4">
          <Input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!email || isSubmitting}
          >
            {isSubmitting ? 'Subscribing...' : 'Notify Me'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

**Critical Note:** This waitlist feature is **OPTIONAL**. If not needed, simply show the static coming soon page with NO interactions.

---

### 3.5 A – Analyze (Data Insights)

#### 3.5.1 Visual Design Specification

**Dashboard Layout:**

```
┌─────────────────────────────────────────────────────────────────┐
│ TopNav                                                           │
├────────────────┬────────────────────────────────────────────────┤
│ Sidebar        │                                                 │
│                │                                                 │
│ X              │  ┌──────────────────────────────────────────┐  │
│ O              │  │ HeaderRow (h: 100px)                     │  │
│ C              │  │ ┌────────────┬────────────┬────────────┐ │  │
│ I              │  │ │ Date Range │ Platform   │ Account    │ │  │
│ A [active]     │  │ │ Picker     │ Filter     │ Selector   │ │  │
│ L              │  │ └────────────┴────────────┴────────────┘ │  │
│                │  │ [Last 30 Days ▼] [All ▼] [All Accounts ▼]│  │
│                │  └──────────────────────────────────────────┘  │
│                │                                                 │
│                │  ┌──────────────────────────────────────────┐  │
│                │  │ KPI Row (4 metric cards in grid)        │  │
│                │  │ ┌──────┬──────┬──────┬──────────┐       │  │
│                │  │ │Reach │Engage│Follwrs│Post Freq│       │  │
│                │  │ │245K  │4.2%  │+1.2K │15 posts │       │  │
│                │  │ │+12%↑ │+0.3%↑│+8%↑  │-2 vs prev│       │  │
│                │  │ └──────┴──────┴──────┴──────────┘       │  │
│                │  └──────────────────────────────────────────┘  │
│                │                                                 │
│                │  ┌──────────────────────────────────────────┐  │
│                │  │ Charts Grid (2x2 responsive)            │  │
│                │  │                                          │  │
│                │  │ ┌────────────────┬──────────────────┐   │  │
│                │  │ │Engagement Over │Top Performing    │   │  │
│                │  │ │Time (Line)     │Posts (Bar)       │   │  │
│                │  │ │                │                  │   │  │
│                │  │ │ [Line chart    │ [Horizontal bar  │   │  │
│                │  │ │  showing       │  chart showing   │   │  │
│                │  │ │  daily/weekly  │  top 5 posts by  │   │  │
│                │  │ │  engagement]   │  engagement]     │   │  │
│                │  │ └────────────────┴──────────────────┘   │  │
│                │  │                                          │  │
│                │  │ ┌────────────────┬──────────────────┐   │  │
│                │  │ │Platform Share  │Content Type      │   │  │
│                │  │ │(Donut)         │Performance (Bar) │   │  │
│                │  │ │                │                  │   │  │
│                │  │ │ [Donut chart   │ [Bar chart       │   │  │
│                │  │ │  showing %     │  comparing       │   │  │
│                │  │ │  distribution] │  Reels vs Feed]  │   │  │
│                │  │ └────────────────┴──────────────────┘   │  │
│                │  └──────────────────────────────────────────┘  │
│                │                                                 │
│                │  ┌──────────────────────────────────────────┐  │
│                │  │ AI Insights Panel (Right side or below)  │  │
│                │  │                                          │  │
│                │  │ ┌──────────────────────────────────────┐ │  │
│                │  │ │ 💡 Key Insight                       │ │  │
│                │  │ │ Your Reels perform 35% better on     │ │  │
│                │  │ │ weekends compared to weekdays        │ │  │
│                │  │ │ [Explain This] [Apply to Strategy]   │ │  │
│                │  │ └──────────────────────────────────────┘ │  │
│                │  │                                          │  │
│                │  │ ┌──────────────────────────────────────┐ │  │
│                │  │ │ 📈 Growth Opportunity                │ │  │
│                │  │ │ Carousel posts drive 2x more saves  │ │  │
│                │  │ │ than single images                   │ │  │
│                │  │ │ [See Examples] [Create Carousel]     │ │  │
│                │  │ └──────────────────────────────────────┘ │  │
│                │  │                                          │  │
│                │  │ ┌──────────────────────────────────────┐ │  │
│                │  │ │ ⚠️ Attention Needed                  │ │  │
│                │  │ │ Engagement dropped 15% this week     │ │  │
│                │  │ │ [View Details] [Get Suggestions]     │ │  │
│                │  │ └──────────────────────────────────────┘ │  │
│                │  └──────────────────────────────────────────┘  │
│                │                                                 │
│                │  ┌──────────────────────────────────────────┐  │
│                │  │ Reports Section                          │  │
│                │  │ ┌──────────────────────────────────────┐ │  │
│                │  │ │ Saved Reports                        │ │  │
│                │  │ │ • Weekly Performance - Nov 11-18     │ │  │
│                │  │ │ • Monthly Overview - October 2025    │ │  │
│                │  │ │                                      │ │  │
│                │  │ │ [+ New Report] [Export Current View] │ │  │
│                │  │ └──────────────────────────────────────┘ │  │
│                │  └──────────────────────────────────────────┘  │
└────────────────┴─────────────────────────────────────────────────┘
```

**KPI Card Component Spec:**

```typescript
// components/analytics/kpi-card.tsx
interface KPICardProps {
  title: string
  value: string | number
  trend: {
    value: number // percentage change
    direction: 'up' | 'down' | 'neutral'
    period: string // "vs last 30 days"
  }
  icon: ReactNode
  format?: 'number' | 'percentage' | 'currency'
}

// Visual hierarchy:
// - Card: bg-card, rounded-lg, p-6, border border-border
// - Hover: shadow-medium
// - Icon: 32px, colored background circle, top-left
// - Title: text-small text-muted, below icon
// - Value: text-h2 font-bold, prominent
// - Trend: 
//   - Row layout (trend value + arrow + period text)
//   - Colors:
//     - Up/positive: text-success, ArrowUp icon
//     - Down/negative: text-destructive, ArrowDown icon
//     - Neutral: text-muted, Minus icon
//   - Font: text-small
```

#### 3.5.2 State Management Architecture

**Zustand Store:**

```typescript
// stores/analytics-store.ts
interface AnalyticsState {
  // Filters
  dateRange: {
    start: Date
    end: Date
    preset?: '7d' | '30d' | '90d' | 'custom'
  }
  selectedPlatforms: string[]
  selectedAccounts: string[]
  
  // Data
  kpis: {
    reach: KPIData
    engagement: KPIData
    followers: KPIData
    postFrequency: KPIData
  }
  engagementOverTime: TimeSeriesData[]
  topPosts: PostPerformanceData[]
  platformShare: PlatformShareData[]
  contentTypePerformance: ContentTypeData[]
  aiInsights: AIInsight[]
  
  // UI state
  isLoading: boolean
  error: string | null
  activeChart: string | null
  
  // Actions
  setDateRange: (range: DateRange) => void
  setSelectedPlatforms: (platforms: string[]) => void
  setSelectedAccounts: (accounts: string[]) => void
  fetchAnalytics: () => Promise<void>
  refreshData: () => Promise<void>
  exportReport: (format: 'csv' | 'pdf') => Promise<void>
}

const useAnalyticsStore = create<AnalyticsState>((set, get) => ({
  dateRange: {
    start: subDays(new Date(), 30),
    end: new Date(),
    preset: '30d'
  },
  selectedPlatforms: [],
  selectedAccounts: [],
  kpis: {
    reach: { value: 0, trend: 0 },
    engagement: { value: 0, trend: 0 },
    followers: { value: 0, trend: 0 },
    postFrequency: { value: 0, trend: 0 }
  },
  engagementOverTime: [],
  topPosts: [],
  platformShare: [],
  contentTypePerformance: [],
  aiInsights: [],
  isLoading: false,
  error: null,
  activeChart: null,
  
  setDateRange: (range) => {
    set({ dateRange: range })
    get().fetchAnalytics()
  },
  
  setSelectedPlatforms: (platforms) => {
    set({ selectedPlatforms: platforms })
    get().fetchAnalytics()
  },
  
  setSelectedAccounts: (accounts) => {
    set({ selectedAccounts: accounts })
    get().fetchAnalytics()
  },
  
  fetchAnalytics: async () => {
    set({ isLoading: true, error: null })
    
    try {
      const { dateRange, selectedPlatforms, selectedAccounts } = get()
      
      // Parallel fetch for better performance
      const [kpisData, timeSeriesData, topPostsData, shareData, insightsData] = await Promise.all([
        fetch(`/api/analytics/kpis?${buildQueryParams()}`).then(r => r.json()),
        fetch(`/api/analytics/time-series?${buildQueryParams()}`).then(r => r.json()),
        fetch(`/api/analytics/top-posts?${buildQueryParams()}`).then(r => r.json()),
        fetch(`/api/analytics/platform-share?${buildQueryParams()}`).then(r => r.json()),
        fetch(`/api/analytics/insights?${buildQueryParams()}`).then(r => r.json())
      ])
      
      set({
        kpis: kpisData.kpis,
        engagementOverTime: timeSeriesData.data,
        topPosts: topPostsData.posts,
        platformShare: shareData.distribution,
        aiInsights: insightsData.insights,
        isLoading: false
      })
      
    } catch (error) {
      set({
        error: 'Failed to load analytics data',
        isLoading: false
      })
      console.error('Analytics fetch error:', error)
    }
  },
  
  refreshData: async () => {
    // Force refresh with loading indicator
    await get().fetchAnalytics()
    toast.success('Analytics refreshed')
  },
  
  exportReport: async (format) => {
    try {
      const response = await fetch('/api/analytics/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format,
          dateRange: get().dateRange,
          platforms: get().selectedPlatforms,
          accounts: get().selectedAccounts
        })
      })
      
      if (!response.ok) throw new Error('Export failed')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `analytics-report-${format === 'csv' ? 'csv' : 'pdf'}`
      a.click()
      
      toast.success(`Report exported as ${format.toUpperCase()}`)
      
    } catch (error) {
      toast.error('Failed to export report')
    }
  }
}))
```

#### 3.5.3 User Flow State Machines

**Flow 1: Load Analytics Dashboard**

```
STATE: A Page Navigation
  ↓
STATE: Initial Load
  ACTION: Fetch default analytics (last 30 days, all platforms, all accounts)
  RENDER: Loading skeletons for:
          - 4 KPI cards
          - 4 chart sections
          - Insights panel
  ↓
STATE: Data Fetching (Parallel Requests)
  REQUESTS:
    1. GET /api/analytics/kpis
    2. GET /api/analytics/time-series
    3. GET /api/analytics/top-posts
    4. GET /api/analytics/platform-share
    5. GET /api/analytics/insights (AI-generated)
  
  TIMING: Expected 1-2 seconds total
  ↓
SUCCESS PATH:
  STATE: Data Loaded
  
  ANIMATION: Skeletons fade out, real content fades in (300ms stagger)
  
  RENDER: KPI Cards
    - Reach: 245K (+12% ↑)
    - Engagement: 4.2% (+0.3% ↑)
    - Followers: +1.2K (+8% ↑)
    - Post Frequency: 15 posts (-2 vs previous)
  
  ANIMATION: Number count-up effect for values
  
  RENDER: Charts
    - Engagement Over Time: Line chart with smooth curves
    - Top Posts: Horizontal bars with post thumbnails
    - Platform Share: Donut chart with legend
    - Content Type: Grouped bar chart
  
  ANIMATION: Charts animate-in:
    - Line chart: path draws from left to right
    - Bar charts: bars grow from 0 to value
    - Donut chart: segments fill clockwise
  
  RENDER: AI Insights
    - 3 insight cards with icons and action buttons
  
  UI: All interactive elements enabled
  ↓
ERROR PATH:
  STATE: Load Failed
  
  RENDER: Error state (replace skeletons)
  UI: Error card with:
      - Icon (AlertCircle)
      - Message: "Failed to load analytics"
      - Partial data notice (if some requests succeeded)
      - Buttons: "Try Again" | "Contact Support"
  
  ACTION: Log error to monitoring system
```

**Flow 2: Change Date Range**

```
STATE: Dashboard Loaded
  ↓
EVENT: User clicks Date Range Picker
  ↓
STATE: Date Picker Open
  RENDER: Popover with calendar and presets
  UI: 
    Presets (quick select):
      - Last 7 days
      - Last 30 days
      - Last 90 days
      - Custom range
    Calendar: Two-month view for range selection
  ↓
EVENT: User selects "Last 7 days"
  ↓
STATE: Date Range Updated
  UI: Picker closes, button shows "Last 7 Days"
  ANIMATION: All charts/KPIs fade to 50% opacity
  ↓
STATE: Refetching Data
  ACTION: Fetch analytics with new date range
  UI: Loading spinner on "Refresh" area (top-right)
  OPTIMIZATION: Reuse chart containers, just update data
  ↓
STATE: Data Updated
  ANIMATION: Charts transition to new data
    - Line chart: morphing animation to new path
    - Bar charts: bars resize smoothly
    - Numbers: count-up/down to new values
  
  UI: Loading spinner disappears
  UI: Toast: "Updated to Last 7 Days"
  
  TIMING: Transition duration 600ms ease-in-out
```

**Flow 3: Filter by Platform**

```
STATE: Dashboard with All Platforms
  ↓
EVENT: User clicks Platform Filter dropdown
  ↓
STATE: Platform Selector Open
  RENDER: Multi-select dropdown
  UI: Checkboxes for:
      ☑ Instagram
      ☑ Facebook
      ☑ Twitter
      ☑ YouTube
      ☑ LinkedIn
      ☑ TikTok
      [Apply Filters button]
  ↓
EVENT: User unchecks Facebook and Twitter, clicks Apply
  ↓
STATE: Filters Applied
  UI: Dropdown closes
  UI: Filter indicator: "4 platforms selected"
  ANIMATION: Charts fade out (200ms)
  ↓
STATE: Filtered Data Loading
  ACTION: Refetch with platform filter
  UI: Subtle loading overlay on charts
  ↓
STATE: Filtered Data Displayed
  ANIMATION: Charts fade in with new data
  UI: Platform Share chart updates (removes FB/Twitter segments)
  UI: Toast: "Showing Instagram, YouTube, LinkedIn, TikTok"
  
  CONTEXT: Top Posts now only from selected platforms
  CONTEXT: KPIs recalculated for selected platforms only
```

**Flow 4: Explore AI Insight**

```
STATE: Insights Panel Visible
  DISPLAY: 3 AI-generated insight cards
  ↓
EVENT: User clicks "Explain This" on insight:
       "Your Reels perform 35% better on weekends"
  ↓
STATE: Insight Details Modal Opens
  ANIMATION: Modal fade + scale in (300ms)
  
  RENDER: InsightDetailModal
    ┌────────────────────────────────────────┐
    │ Insight Deep Dive                      │
    ├────────────────────────────────────────┤
    │                                        │
    │ 💡 Your Reels perform 35% better     │
    │     on weekends                        │
    │                                        │
    │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
    │                                        │
    │ Analysis:                              │
    │ • Weekend engagement rate: 6.8%        │
    │ • Weekday engagement rate: 5.0%        │
    │ • Difference: +35% higher on weekends  │
    │                                        │
    │ [Chart: Engagement by Day of Week]    │
    │ Bar chart showing Sat/Sun peaks        │
    │                                        │
    │ Why this happens:                      │
    │ • More leisure time on weekends        │
    │ • Increased social media usage         │
    │ • Less competition from brands         │
    │                                        │
    │ Recommendations:                       │
    │ 1. Schedule Reels for Sat 7-9 PM      │
    │ 2. Create 2-3 Reels specifically       │
    │    for weekend posting                 │
    │ 3. Boost weekend posts with ads        │
    │                                        │
    │ [Apply to Strategy] [Schedule Reels]   │
    │                                        │
    └────────────────────────────────────────┘
  ↓
EVENT: User clicks "Schedule Reels"
  ↓
STATE: Navigate to Calendar
  ACTION: Navigate to /o with context
  CONTEXT: Prefill "Reels" content type
  CONTEXT: Preselect next 2 weekends
  UI: DayDetailPanel opens with template
```

**Flow 5: Export Report**

```
STATE: Analytics Dashboard Displayed
  ↓
EVENT: User clicks "Export Current View" button
  ↓
STATE: Export Options Dialog Opens
  RENDER: Dialog
    ┌──────────────────────────────────────┐
    │ Export Analytics Report              │
    ├──────────────────────────────────────┤
    │                                      │
    │ Format:                              │
    │ ○ CSV (spreadsheet)                  │
    │ ○ PDF (formatted report)             │
    │                                      │
    │ Include:                             │
    │ ☑ KPI Summary                        │
    │ ☑ Charts & Visualizations (PDF only)│
    │ ☑ Top Posts List                     │
    │ ☑ AI Insights                        │
    │                                      │
    │ Date Range: Last 30 Days             │
    │ Platforms: All Selected              │
    │                                      │
    │ [Cancel] [Export]                    │
    │                                      │
    └──────────────────────────────────────┘
  ↓
EVENT: User selects PDF, clicks Export
  ↓
STATE: Generating Report
  UI: Button shows loading spinner
  UI: Dialog content slightly dimmed
  UI: Progress indicator: "Generating PDF..."
  
  ACTION: POST /api/analytics/export
          Body: {
            format: 'pdf',
            include: ['kpis', 'charts', 'posts', 'insights'],
            dateRange: { start, end },
            platforms: selectedPlatforms
          }
  
  BACKEND:
    1. Fetch all required data
    2. Generate chart images (server-side rendering)
    3. Compile PDF using template
    4. Return binary file
  
  TIMING: 3-5 seconds for PDF generation
  ↓
SUCCESS PATH:
  STATE: Report Ready
  
  UI: Dialog closes
  UI: Browser download prompt appears
  UI: File downloads: "xocial-analytics-2025-11-18.pdf"
  UI: Toast: "Report exported successfully"
  
  ANALYTICS: Track export event
  ↓
ERROR PATH:
  STATE: Export Failed
  
  UI: Error message in dialog:
      "Failed to generate report. Please try again."
  UI: Buttons: "Retry" | "Download CSV Instead"
  
  FALLBACK: CSV export as simpler alternative
```

#### 3.5.4 API Contracts

**GET /api/analytics/kpis**

```typescript
// Request
GET /api/analytics/kpis?team_id={uuid}&start=2025-10-19&end=2025-11-18&platforms=instagram,twitter&accounts=uuid1,uuid2

// Response (200 OK)
{
  "kpis": {
    "reach": {
      "value": 245000,
      "trend": {
        "value": 12.0, // percentage
        "direction": "up",
        "previous_value": 218750,
        "period": "vs previous 30 days"
      },
      "breakdown_by_platform": {
        "instagram": 180000,
        "twitter": 65000
      }
    },
    "engagement_rate": {
      "value": 4.2,
      "trend": {
        "value": 0.3,
        "direction": "up",
        "previous_value": 3.9,
        "period": "vs previous 30 days"
      },
      "breakdown_by_platform": {
        "instagram": 5.1,
        "twitter": 2.8
      }
    },
    "follower_growth": {
      "value": 1200,
      "trend": {
        "value": 8.0,
        "direction": "up",
        "previous_value": 1111,
        "period": "vs previous 30 days"
      },
      "breakdown_by_platform": {
        "instagram": 850,
        "twitter": 350
      }
    },
    "post_frequency": {
      "value": 15,
      "trend": {
        "value": -2,
        "direction": "down",
        "previous_value": 17,
        "period": "vs previous 30 days"
      },
      "breakdown_by_platform": {
        "instagram": 10,
        "twitter": 5
      }
    }
  },
  "date_range": {
    "start": "2025-10-19",
    "end": "2025-11-18"
  }
}
```

**GET /api/analytics/time-series**

```typescript
// Request
GET /api/analytics/time-series?team_id={uuid}&start=2025-10-19&end=2025-11-18&granularity=day&metric=engagement_rate

// Response (200 OK)
{
  "data": [
    {
      "date": "2025-10-19",
      "value": 3.8,
      "breakdown": {
        "instagram": 4.5,
        "twitter": 2.4
      }
    },
    {
      "date": "2025-10-20",
      "value": 4.1,
      "breakdown": {
        "instagram": 4.8,
        "twitter": 2.7
      }
    }
    // ... continues for each day
  ],
  "metric": "engagement_rate",
  "granularity": "day"
}
```

**GET /api/analytics/top-posts**

```typescript
// Request
GET /api/analytics/top-posts?team_id={uuid}&start=2025-10-19&end=2025-11-18&limit=10&sort_by=engagement_rate

// Response (200 OK)
{
  "posts": [
    {
      "id": "uuid",
      "platform": "instagram",
      "post_type": "reel",
      "caption": "Behind the scenes of our product shoot 🎬",
      "media_url": "https://...",
      "published_at": "2025-11-15T19:00:00Z",
      "metrics": {
        "likes": 3420,
        "comments": 156,
        "shares": 89,
        "saves": 245,
        "impressions": 54200,
        "reach": 48100,
        "engagement_rate": 7.8
      },
      "rank": 1
    },
    {
      "id": "uuid",
      "platform": "instagram",
      "post_type": "carousel",
      "caption": "5 ways to use our product 💡",
      "media_url": "https://...",
      "published_at": "2025-11-12T14:30:00Z",
      "metrics": {
        "likes": 2890,
        "comments": 98,
        "shares": 67,
        "saves": 412,
        "impressions": 42300,
        "reach": 38900,
        "engagement_rate": 6.9
      },
      "rank": 2
    }
    // ... top 10 posts
  ],
  "total": 15, // Total posts in period
  "sort_by": "engagement_rate"
}
```

**GET /api/analytics/insights**

```typescript
// Request
GET /api/analytics/insights?team_id={uuid}&start=2025-10-19&end=2025-11-18

// Response (200 OK)
{
  "insights": [
    {
      "id": "uuid",
      "type": "performance",
      "category": "timing",
      "title": "Weekend Reels Outperform Weekdays",
      "description": "Your Reels perform 35% better on weekends compared to weekdays",
      "confidence_score": 0.92,
      "data": {
        "weekend_engagement": 6.8,
        "weekday_engagement": 5.0,
        "difference_percent": 35
      },
      "recommendations": [
        "Schedule Reels for Saturday 7-9 PM",
        "Create 2-3 Reels specifically for weekend posting",
        "Consider boosting weekend posts with ads"
      ],
      "action_buttons": [
        {
          "label": "Explain This",
          "action": "open_detail"
        },
        {
          "label": "Apply to Strategy",
          "action": "navigate_to_calendar"
        }
      ],
```typescript
      "generated_at": "2025-11-18T12:00:00Z",
      "model_used": "gpt-4-turbo-preview"
    },
    {
      "id": "uuid",
      "type": "opportunity",
      "category": "content_format",
      "title": "Carousel Posts Drive Higher Saves",
      "description": "Carousel posts receive 2x more saves than single image posts",
      "confidence_score": 0.88,
      "data": {
        "carousel_avg_saves": 156,
        "single_image_avg_saves": 78,
        "multiplier": 2.0
      },
      "recommendations": [
        "Convert top-performing topics into carousel format",
        "Aim for 5-7 slides per carousel",
        "Include educational or step-by-step content"
      ],
      "action_buttons": [
        {
          "label": "See Examples",
          "action": "show_carousel_examples"
        },
        {
          "label": "Create Carousel",
          "action": "navigate_to_create"
        }
      ],
      "generated_at": "2025-11-18T12:00:00Z"
    },
    {
      "id": "uuid",
      "type": "alert",
      "category": "performance_drop",
      "title": "Engagement Dropped This Week",
      "description": "Engagement rate decreased by 15% compared to previous week",
      "confidence_score": 0.95,
      "severity": "medium",
      "data": {
        "current_week_engagement": 3.5,
        "previous_week_engagement": 4.1,
        "drop_percent": -15
      },
      "possible_causes": [
        "Decreased posting frequency (4 posts vs usual 7)",
        "No Reels posted this week",
        "Lower engagement time (posting at 2 PM vs optimal 7 PM)"
      ],
      "recommendations": [
        "Return to posting schedule of 1 post per day",
        "Create 2-3 Reels this week",
        "Post during optimal times (7-9 PM)"
      ],
      "action_buttons": [
        {
          "label": "View Details",
          "action": "open_detail"
        },
        {
          "label": "Get Suggestions",
          "action": "show_recovery_plan"
        }
      ],
      "generated_at": "2025-11-18T12:00:00Z"
    }
  ],
  "insights_count": 3,
  "next_refresh": "2025-11-19T12:00:00Z"
}
```

**POST /api/analytics/export**

```typescript
// Request
POST /api/analytics/export
{
  "format": "pdf", // or "csv"
  "team_id": "uuid",
  "date_range": {
    "start": "2025-10-19",
    "end": "2025-11-18"
  },
  "platforms": ["instagram", "twitter"],
  "accounts": ["uuid1", "uuid2"],
  "include": ["kpis", "charts", "top_posts", "insights"]
}

// Response (200 OK) - Binary file download
// Headers:
Content-Type: application/pdf (or text/csv)
Content-Disposition: attachment; filename="xocial-analytics-2025-11-18.pdf"

// File contents: PDF or CSV binary data

// Error Response (500)
{
  "error": "Failed to generate report",
  "code": "EXPORT_FAILED",
  "hint": "Please try CSV format or reduce date range"
}
```

#### 3.5.5 Component Tree

```
APage (Server Component)
├─ Shell Layout
│  ├─ TopNav
│  └─ SidebarNav (A active)
│
└─ AnalyticsContent (Client Component)
   ├─ HeaderRow
   │  ├─ PageTitle ("A – Analyze")
   │  ├─ FilterControls
   │  │  ├─ DateRangePicker
   │  │  │  ├─ Trigger ("Last 30 Days ▼")
   │  │  │  └─ Popover
   │  │  │     ├─ PresetButtons
   │  │  │     │  ├─ Button ("Last 7 Days")
   │  │  │     │  ├─ Button ("Last 30 Days")
   │  │  │     │  ├─ Button ("Last 90 Days")
   │  │  │     │  └─ Button ("Custom Range")
   │  │  │     └─ CalendarRange (if custom)
   │  │  │
   │  │  ├─ PlatformFilter
   │  │  │  ├─ Trigger ("All Platforms ▼")
   │  │  │  └─ DropdownMenu
   │  │  │     ├─ CheckboxItem (Instagram)
   │  │  │     ├─ CheckboxItem (Facebook)
   │  │  │     ├─ CheckboxItem (Twitter)
   │  │  │     ├─ CheckboxItem (YouTube)
   │  │  │     ├─ CheckboxItem (LinkedIn)
   │  │  │     ├─ CheckboxItem (TikTok)
   │  │  │     └─ ApplyButton
   │  │  │
   │  │  └─ AccountSelector
   │  │     ├─ Trigger ("All Accounts ▼")
   │  │     └─ Combobox (multi-select)
   │  │
   │  └─ ActionButtons
   │     ├─ RefreshButton (icon: RefreshCw)
   │     └─ ExportButton (icon: Download)
   │
   ├─ KPIRow
   │  ├─ LoadingState (Skeleton cards during fetch)
   │  └─ KPIGrid (4 columns responsive)
   │     ├─ KPICard (Reach)
   │     │  ├─ Icon (Eye, in colored circle)
   │     │  ├─ Label ("Total Reach")
   │     │  ├─ Value ("245K" with count-up animation)
   │     │  └─ Trend
   │     │     ├─ Arrow (Up/Down)
   │     │     ├─ Percentage ("+12%")
   │     │     └─ Period ("vs last 30 days")
   │     │
   │     ├─ KPICard (Engagement Rate)
   │     │  └─ [Same structure]
   │     │
   │     ├─ KPICard (Follower Growth)
   │     │  └─ [Same structure]
   │     │
   │     └─ KPICard (Post Frequency)
   │        └─ [Same structure]
   │
   ├─ ChartsSection
   │  ├─ LoadingState (Skeleton charts)
   │  └─ ChartsGrid (2x2 responsive grid)
   │     ├─ ChartCard (Engagement Over Time)
   │     │  ├─ CardHeader
   │     │  │  ├─ Title ("Engagement Over Time")
   │     │  │  └─ ChartTypeToggle (Line/Bar)
   │     │  ├─ CardContent
   │     │  │  └─ LineChart (Recharts)
   │     │  │     ├─ XAxis (dates)
   │     │  │     ├─ YAxis (engagement %)
   │     │  │     ├─ Tooltip (custom styled)
   │     │  │     ├─ Line (Instagram, colored)
   │     │  │     └─ Line (Twitter, colored)
   │     │  └─ CardFooter
   │     │     └─ Legend (platform colors)
   │     │
   │     ├─ ChartCard (Top Performing Posts)
   │     │  ├─ CardHeader
   │     │  │  ├─ Title ("Top Performing Posts")
   │     │  │  └─ MetricSelector (Engagement/Reach/Saves)
   │     │  ├─ CardContent
   │     │  │  └─ BarChart (Recharts, horizontal)
   │     │  │     ├─ YAxis (post captions, truncated)
   │     │  │     ├─ XAxis (metric value)
   │     │  │     ├─ Bar (with gradient fill)
   │     │  │     └─ Tooltip (shows thumbnail + full metrics)
   │     │  └─ CardFooter
   │     │     └─ ViewAllLink ("See all posts →")
   │     │
   │     ├─ ChartCard (Platform Distribution)
   │     │  ├─ CardHeader ("Platform Share")
   │     │  ├─ CardContent
   │     │  │  └─ DonutChart (Recharts)
   │     │  │     ├─ Pie (with label connector)
   │     │  │     ├─ Tooltip
   │     │  │     └─ CenterLabel (Total posts)
   │     │  └─ CardFooter
   │     │     └─ Legend (with percentages)
   │     │
   │     └─ ChartCard (Content Type Performance)
   │        ├─ CardHeader ("Content Type Comparison")
   │        ├─ CardContent
   │        │  └─ BarChart (Recharts, grouped)
   │        │     ├─ XAxis (content types: Reel, Feed, Carousel)
   │        │     ├─ YAxis (engagement rate)
   │        │     ├─ Bar (Likes, colored)
   │        │     ├─ Bar (Comments, colored)
   │        │     └─ Bar (Saves, colored)
   │        └─ CardFooter
   │           └─ Legend
   │
   ├─ InsightsPanel
   │  ├─ PanelHeader
   │  │  ├─ Title ("AI Insights")
   │  │  ├─ Subtitle ("Powered by analysis of your data")
   │  │  └─ RefreshButton (ghost, small)
   │  │
   │  ├─ LoadingState (Skeleton insight cards)
   │  │
   │  ├─ InsightsList
   │  │  └─ InsightCard (repeat)
   │  │     ├─ InsightHeader
   │  │     │  ├─ IconBadge (varies by type)
   │  │     │  │  └─ Types: Lightbulb (insight), TrendingUp (opportunity), AlertTriangle (alert)
   │  │     │  ├─ InsightType Badge ("Performance", "Opportunity", "Alert")
   │  │     │  └─ ConfidenceScore (if > 0.9, show "High Confidence")
   │  │     │
   │  │     ├─ InsightContent
   │  │     │  ├─ Title (text-h3, font-semibold)
   │  │     │  ├─ Description (text-body, text-muted)
   │  │     │  └─ DataHighlight (if relevant)
   │  │     │     └─ Example: "35% better performance"
   │  │     │
   │  │     └─ InsightActions
   │  │        ├─ PrimaryAction ("Explain This", "See Examples", etc.)
   │  │        └─ SecondaryAction ("Apply to Strategy", "Create Content", etc.)
   │  │
   │  └─ EmptyState (if no insights)
   │     ├─ Icon (Brain)
   │     ├─ Message ("Not enough data for insights yet")
   │     └─ Hint ("Publish more content to unlock AI insights")
   │
   ├─ ReportsSection
   │  ├─ SectionHeader
   │  │  ├─ Title ("Reports")
   │  │  └─ NewReportButton (outline)
   │  │
   │  ├─ SavedReportsList
   │  │  └─ ReportItem (repeat)
   │  │     ├─ ReportIcon (FileText)
   │  │     ├─ ReportName ("Weekly Performance - Nov 11-18")
   │  │     ├─ ReportMeta (Created date, file size)
   │  │     └─ ReportActions
   │  │        ├─ DownloadButton (icon)
   │  │        ├─ ShareButton (icon)
   │  │        └─ DeleteButton (icon)
   │  │
   │  └─ ExportCurrentViewButton (primary)
   │
   └─ InsightDetailModal (Dialog)
      ├─ DialogHeader
      │  ├─ BackButton (if from insight card)
      │  ├─ InsightTitle
      │  └─ CloseButton
      │
      ├─ DialogContent (scrollable)
      │  ├─ InsightSummary
      │  │  ├─ MainStatement (large, bold)
      │  │  └─ ConfidenceBadge
      │  │
      │  ├─ Divider
      │  │
      │  ├─ AnalysisSection
      │  │  ├─ SectionTitle ("Analysis")
      │  │  └─ DataPoints (bullet list with values)
      │  │
      │  ├─ VisualizationSection
      │  │  ├─ SectionTitle ("Visual Breakdown")
      │  │  └─ Chart (specific to insight)
      │  │
      │  ├─ ExplanationSection
      │  │  ├─ SectionTitle ("Why this happens")
      │  │  └─ ReasonsList (bullet points)
      │  │
      │  └─ RecommendationsSection
      │     ├─ SectionTitle ("Recommendations")
      │     └─ ActionableSteps (numbered list)
      │
      └─ DialogFooter
         ├─ CancelButton
         ├─ ApplyToStrategyButton (if applicable)
         └─ ScheduleContentButton (if applicable)

```

#### 3.5.6 Chart Specifications

**Engagement Over Time (Line Chart):**

```typescript
// components/analytics/engagement-over-time-chart.tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface EngagementOverTimeChartProps {
  data: TimeSeriesData[]
  platforms: string[]
}

// Configuration:
// - ResponsiveContainer: width="100%", height={400}
// - XAxis: dataKey="date", tickFormatter for date format
// - YAxis: unit="%", domain=[0, 'auto']
// - CartesianGrid: strokeDasharray="3 3", opacity=0.3
// - Tooltip: custom component with platform breakdown
// - Legend: align="center", verticalAlign="bottom"
// - Line per platform:
//   - Instagram: stroke="#E4405F", strokeWidth={2}, dot={false}
//   - Twitter: stroke="#1DA1F2", strokeWidth={2}, dot={false}
//   - Smooth curve: type="monotone"
// - Animation: animationDuration={800}, animationEasing="ease-out"
```

**Top Performing Posts (Horizontal Bar Chart):**

```typescript
// components/analytics/top-posts-chart.tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

// Configuration:
// - ResponsiveContainer: width="100%", height={400}
// - Layout: "horizontal"
// - YAxis: dataKey="caption" (truncated to 30 chars)
// - XAxis: domain=[0, 'auto']
// - Bar: dataKey="engagement_rate"
//   - Fill: gradient from primary to secondary
//   - Radius: [0, 8, 8, 0] (rounded right corners)
// - Tooltip: Custom component showing:
//   - Post thumbnail (if available)
//   - Full caption
//   - All metrics (likes, comments, shares, saves)
//   - Platform badge
// - Click handler: Navigate to post detail
```

**Platform Distribution (Donut Chart):**

```typescript
// components/analytics/platform-share-chart.tsx
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

// Configuration:
// - ResponsiveContainer: width="100%", height={300}
// - Pie:
//   - data: platform distribution
//   - dataKey: "value"
//   - nameKey: "platform"
//   - cx="50%", cy="50%"
//   - innerRadius: 60, outerRadius: 100
//   - paddingAngle: 2
// - Cell: Custom colors per platform (from platformColors map)
// - Label: Custom center label showing total posts
// - Legend: Custom component with percentages
// - Tooltip: Shows count and percentage
// - Animation: animationBegin={0}, animationDuration={800}
```

**Content Type Performance (Grouped Bar Chart):**

```typescript
// components/analytics/content-type-chart.tsx
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

// Configuration:
// - ResponsiveContainer: width="100%", height={350}
// - XAxis: dataKey="content_type" (Reel, Feed, Carousel, Story)
// - YAxis: unit="%"
// - CartesianGrid: strokeDasharray="3 3"
// - Bar (Likes): fill="#E4405F"
// - Bar (Comments): fill="#1DA1F2"
// - Bar (Saves): fill="#10B981"
// - Legend: Shows metric names
// - Tooltip: Custom showing all metrics
// - Animation: Each bar animates independently
```

#### 3.5.7 Performance Optimizations

**Data Caching Strategy:**

```typescript
// Use React Query for intelligent caching
import { useQuery } from '@tanstack/react-query'

export function useAnalyticsData(filters: AnalyticsFilters) {
  return useQuery({
    queryKey: ['analytics', filters],
    queryFn: () => fetchAnalytics(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: 3,
    // Prefetch adjacent date ranges
    onSuccess: (data) => {
      prefetchAdjacentRanges(filters)
    }
  })
}
```

**Chart Rendering Optimization:**

```typescript
// Lazy load charts below fold
import dynamic from 'next/dynamic'

const EngagementChart = dynamic(
  () => import('@/components/analytics/engagement-over-time-chart'),
  { 
    loading: () => <ChartSkeleton />,
    ssr: false // Charts don't need SSR
  }
)

// Debounce filter changes
import { useDebouncedCallback } from 'use-debounce'

const debouncedFetchAnalytics = useDebouncedCallback(
  (filters) => {
    fetchAnalytics(filters)
  },
  500 // Wait 500ms after user stops changing filters
)
```

**Progressive Data Loading:**

```typescript
// Load critical data first, then enhance
async function loadAnalytics() {
  // Phase 1: Load KPIs (fast, small payload)
  const kpis = await fetchKPIs()
  updateUI(kpis)
  
  // Phase 2: Load charts data (larger payload)
  const charts = await fetchChartsData()
  updateUI(charts)
  
  // Phase 3: Generate AI insights (slowest)
  const insights = await fetchAIInsights()
  updateUI(insights)
}
```

---

### 3.6 L – Leverage (Coming Soon - Placeholder)

#### 3.6.1 Purpose & Future Vision

**Phase 1 Implementation: Static Placeholder ONLY**

Similar to I page, this is a **teaser** for future strategic planning features. NO backend logic, NO API integrations in Phase 1.

**Future Vision (Phase 2+):**
- AI-powered weekly/monthly strategy plans
- Campaign timeline management
- Content gap detection
- Automated posting schedules
- Competitive analysis integration

#### 3.6.2 Visual Design Specification (Placeholder)

```
┌─────────────────────────────────────────────────────────────────┐
│ TopNav                                                           │
├────────────────┬────────────────────────────────────────────────┤
│ Sidebar        │                                                 │
│                │                                                 │
│ X              │        [Centered Content - Vertically]         │
│ O              │                                                 │
│ C              │    ┌───────────────────────────────────────┐   │
│ I              │    │  [Illustration]                       │   │
│ A              │    │  Roadmap/Timeline visual              │   │
│ L [active]     │    │  Strategy board with connected nodes  │   │
│                │    │  Gradient cosmic background           │   │
│                │    └───────────────────────────────────────┘   │
│                │                                                 │
│                │    ┌───────────────────────────────────────┐   │
│                │    │  "L" in large display font            │   │
│                │    │  Leverage                             │   │
│                │    └───────────────────────────────────────┘   │
│                │                                                 │
│                │    ┌───────────────────────────────────────┐   │
│                │    │  Coming Soon                          │   │
│                │    │  (Badge style, accent color)          │   │
│                │    └───────────────────────────────────────┘   │
│                │                                                 │
│                │    ┌───────────────────────────────────────┐   │
│                │    │  AI-powered strategic planning to     │   │
│                │    │  optimize your content calendar,      │   │
│                │    │  identify gaps, and maximize growth   │   │
│                │    │  with personalized recommendations.   │   │
│                │    │                                        │   │
│                │    │  (text-body, text-muted, centered,    │   │
│                │    │   max-width: 500px)                   │   │
│                │    └───────────────────────────────────────┘   │
│                │                                                 │
│                │    ┌───────────────────────────────────────┐   │
│                │    │  [Notify Me When Live] (Button)       │   │
│                │    │  (Primary style, with calendar icon)  │   │
│                │    └───────────────────────────────────────┘   │
│                │                                                 │
│                │    ┌───────────────────────────────────────┐   │
│                │    │  What's Coming:                       │   │
│                │    │                                        │   │
│                │    │  ✓ AI-generated content strategies    │   │
│                │    │  ✓ Weekly/monthly planning            │   │
│                │    │  ✓ Content gap detection              │   │
│                │    │  ✓ Campaign timeline management       │   │
│                │    │                                        │   │
│                │    │  (Small card, muted background)       │   │
│                │    └───────────────────────────────────────┘   │
│                │                                                 │
└────────────────┴─────────────────────────────────────────────────┘
```

#### 3.6.3 Component Structure

```
LPage (Server Component)
├─ Shell Layout
│  ├─ TopNav
│  └─ SidebarNav (L active with "Coming Soon" badge)
│
└─ ComingSoonContent (Client Component)
   └─ CenteredContainer (max-width: 600px, mx-auto, py-20)
      ├─ IllustrationSection
      │  └─ IllustrationImage
      │     └─ Source: /illustrations/strategy-timeline.svg
      │
      ├─ PageTitle
      │  ├─ PageLetter ("L" in display font)
      │  └─ PageName ("Leverage" in h1)
      │
      ├─ ComingSoonBadge
      │
      ├─ DescriptionText
      │
      ├─ NotifyButton (Optional)
      │  └─ Same implementation as I page
      │
      └─ FeaturePreviewCard
         └─ FeatureList
            ├─ "AI-generated content strategies"
            ├─ "Weekly/monthly planning"
            ├─ "Content gap detection"
            └─ "Campaign timeline management"
```

**Implementation Note:** Reuse the same `ComingSoonContent` component from I page with different props for content customization.

---

## 4. Global Patterns & Reusable Systems

### 4.1 Error Handling Architecture

**Layered Error Boundaries:**

```typescript
// app/error.tsx - Root error boundary
'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen p-8">
          <AlertCircle className="w-16 h-16 text-destructive mb-4" />
          <h1 className="text-h1 mb-2">Something went wrong</h1>
          <p className="text-body text-muted mb-6">
            We're sorry for the inconvenience. Our team has been notified.
          </p>
          <div className="flex gap-4">
            <Button onClick={reset}>Try Again</Button>
            <Button variant="outline" onClick={() => window.location.href = '/'}>
              Go Home
            </Button>
          </div>
        </div>
      </body>
    </html>
  )
}

// app/(platform)/error.tsx - Platform-specific error boundary
'use client'

export default function PlatformError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log to error tracking service
    logError(error)
  }, [error])
  
  return (
    <Shell>
      <Card className="p-8 text-center max-w-md mx-auto mt-20">
        <AlertCircle className="w-12 h-12 mx-auto text-destructive mb-4" />
        <h2 className="text-h2 mb-2">Page Error</h2>
        <p className="text-body text-muted mb-6">
          {error.message || 'An unexpected error occurred'}
        </p>
        <Button onClick={reset}>Reload Page</Button>
      </Card>
    </Shell>
  )
}
```

**API Error Responses (Standardized):**

```typescript
// lib/api-errors.ts
export interface APIErrorResponse {
  error: string           // Human-readable error message
  code: string           // Machine-readable error code
  hint?: string          // User-facing suggestion
  details?: unknown      // Additional context (dev only)
  retry_after?: number   // Seconds until retry (for rate limits)
}

export const ERROR_CODES = {
  // Authentication
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  
  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  
  // Resources
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  
  // External Services
  PLATFORM_API_ERROR: 'PLATFORM_API_ERROR',
  AI_SERVICE_ERROR: 'AI_SERVICE_ERROR',
  
  // System
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR'
} as const

// Error factory
export function createAPIError(
  statusCode: number,
  code: string,
  message: string,
  hint?: string
): Response {
  return NextResponse.json(
    {
      error: message,
      code,
      hint,
      timestamp: new Date().toISOString()
    },
    { status: statusCode }
  )
}
```

**Client-Side Error Handling:**

```typescript
// hooks/use-error-handler.ts
export function useErrorHandler() {
  const handleError = useCallback((error: unknown) => {
    if (error instanceof Response) {
      // API error response
      error.json().then((data: APIErrorResponse) => {
        toast.error(data.hint || data.error, {
          action: data.retry_after ? {
            label: 'Retry',
            onClick: () => {
              // Retry logic
            }
          } : undefined
        })
      })
    } else if (error instanceof Error) {
      // JavaScript error
      toast.error(error.message)
      // Log to monitoring
      logError(error)
    } else {
      // Unknown error
      toast.error('An unexpected error occurred')
    }
  }, [])
  
  return { handleError }
}
```

### 4.2 Loading States & Skeletons

**Skeleton Components:**

```typescript
// components/ui/skeleton-card.tsx
export function SkeletonCard() {
  return (
    <Card className="p-6">
      <Skeleton className="h-4 w-20 mb-4" />
      <Skeleton className="h-8 w-32 mb-2" />
      <Skeleton className="h-4 w-full" />
    </Card>
  )
}

// components/ui/skeleton-chart.tsx
export function SkeletonChart({ height = 400 }: { height?: number }) {
  return (
    <div className="relative" style={{ height }}>
      <Skeleton className="absolute inset-0 rounded-lg" />
      <div className="absolute inset-0 flex items-end justify-around p-4">
        {[...Array(8)].map((_, i) => (
          <Skeleton 
            key={i} 
            className="w-8" 
            style={{ height: `${Math.random() * 80 + 20}%` }}
          />
        ))}
      </div>
    </div>
  )
}
```

**Suspense Boundaries:**

```typescript
// app/(platform)/a/page.tsx
import { Suspense } from 'react'

export default function AnalyticsPage() {
  return (
    <Shell>
      <Suspense fallback={<AnalyticsLoadingState />}>
        <AnalyticsContent />
      </Suspense>
    </Shell>
  )
}

function AnalyticsLoadingState() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <SkeletonCard key={i} />
```typescript
        ))}
      </div>
      <div className="grid grid-cols-2 gap-6">
        <SkeletonChart height={400} />
        <SkeletonChart height={400} />
        <SkeletonChart height={350} />
        <SkeletonChart height={350} />
      </div>
    </div>
  )
}
```

### 4.3 Responsive Design Breakpoints

**Tailwind Breakpoint System:**

```typescript
// tailwind.config.ts
export default {
  theme: {
    screens: {
      'xs': '475px',   // Extra small devices
      'sm': '640px',   // Small devices (phones)
      'md': '768px',   // Medium devices (tablets)
      'lg': '1024px',  // Large devices (laptops)
      'xl': '1280px',  // Extra large (desktops)
      '2xl': '1536px', // 2X large (large desktops)
    }
  }
}
```

**Responsive Patterns by Page:**

```typescript
// X Page - Account Grid
// Mobile (xs-sm): 1 column
// Tablet (md): 2 columns
// Desktop (lg+): 3 columns
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

// O Page - Calendar + Detail Panel
// Mobile: Stacked (calendar full width, panel slides over as sheet)
// Desktop: Side-by-side (calendar 70%, panel 30%)
<div className="flex flex-col lg:flex-row gap-6">
  <div className="w-full lg:w-[70%]">
    <Calendar />
  </div>
  <div className="hidden lg:block w-[30%]">
    <DayDetailPanel />
  </div>
</div>
// Mobile panel: Use Sheet component (slides from bottom)

// C Page - Two Pane Layout
// Mobile: Stacked (form first, results after generation)
// Desktop: Side-by-side (50/50 split)
<div className="flex flex-col lg:flex-row gap-8">
  <div className="w-full lg:w-1/2">
    <BriefForm />
  </div>
  <div className="w-full lg:w-1/2">
    <AIOutputPanel />
  </div>
</div>

// A Page - Analytics Grid
// Mobile: 1 column (stacked KPIs, stacked charts)
// Tablet: 2 columns for KPIs, 1 column for charts
// Desktop: 4 columns for KPIs, 2x2 grid for charts
<div className="space-y-8">
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    {/* KPI Cards */}
  </div>
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    {/* Charts */}
  </div>
</div>
```

**Mobile Navigation:**

```typescript
// components/layout/mobile-nav.tsx
'use client'

import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Menu } from 'lucide-react'

export function MobileNav() {
  return (
    <Sheet>
      <SheetTrigger asChild className="lg:hidden">
        <Button variant="ghost" size="icon">
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      
      <SheetContent side="left" className="w-[240px] p-0">
        <nav className="flex flex-col p-4">
          <NavItem href="/x" icon={Users} label="Accounts" />
          <NavItem href="/o" icon={Calendar} label="Organize" />
          <NavItem href="/c" icon={Sparkles} label="Create" />
          <NavItem href="/i" icon={Handshake} label="Influence" badge="Soon" />
          <NavItem href="/a" icon={BarChart} label="Analyze" />
          <NavItem href="/l" icon={TrendingUp} label="Leverage" badge="Soon" />
        </nav>
      </SheetContent>
    </Sheet>
  )
}
```

### 4.4 Accessibility Implementation

**ARIA Patterns:**

```typescript
// Semantic HTML + ARIA
<button
  type="button"
  aria-label="Generate content with AI"
  aria-describedby="generate-hint"
  disabled={isGenerating}
  aria-busy={isGenerating}
>
  {isGenerating ? 'Generating...' : 'Generate with AI'}
</button>
<span id="generate-hint" className="sr-only">
  Creates AI-powered captions for selected platforms
</span>

// Skip to content link
<a 
  href="#main-content" 
  className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground"
>
  Skip to main content
</a>

// Live regions for dynamic updates
<div 
  role="status" 
  aria-live="polite" 
  aria-atomic="true"
  className="sr-only"
>
  {statusMessage}
</div>

// Chart accessibility
<div role="img" aria-label="Engagement rate over time chart showing 4.2% average">
  <LineChart data={data} />
</div>
```

**Keyboard Navigation:**

```typescript
// components/layout/sidebar-nav.tsx
export function SidebarNav() {
  return (
    <nav aria-label="Main navigation">
      <ul role="list" className="space-y-2">
        <li>
          <Link
            href="/x"
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent focus:bg-accent focus:outline-none focus:ring-2 focus:ring-primary"
            tabIndex={0}
          >
            <Users className="w-5 h-5" aria-hidden="true" />
            <span>Accounts</span>
          </Link>
        </li>
        {/* More nav items */}
      </ul>
    </nav>
  )
}

// Keyboard shortcuts hook
import { useHotkeys } from 'react-hotkeys-hook'

export function useGlobalShortcuts() {
  useHotkeys('ctrl+k', (e) => {
    e.preventDefault()
    openGlobalSearch()
  })
  
  useHotkeys('g+x', () => router.push('/x'))
  useHotkeys('g+o', () => router.push('/o'))
  useHotkeys('g+c', () => router.push('/c'))
  useHotkeys('g+a', () => router.push('/a'))
  
  useHotkeys('?', () => openShortcutsDialog())
}
```

**Focus Management:**

```typescript
// components/ui/dialog.tsx - Focus trap in modals
import { Dialog as HeadlessDialog } from '@headlessui/react'

export function Dialog({ isOpen, onClose, children }: DialogProps) {
  return (
    <HeadlessDialog
      open={isOpen}
      onClose={onClose}
      className="relative z-50"
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      {/* Dialog panel - focus trapped automatically */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <HeadlessDialog.Panel className="bg-background rounded-lg shadow-xl max-w-lg w-full">
          {children}
        </HeadlessDialog.Panel>
      </div>
    </HeadlessDialog>
  )
}

// Programmatic focus management
import { useRef, useEffect } from 'react'

export function PostsDrawer({ isOpen }: Props) {
  const firstFocusableRef = useRef<HTMLButtonElement>(null)
  
  useEffect(() => {
    if (isOpen && firstFocusableRef.current) {
      // Focus first interactive element when drawer opens
      setTimeout(() => firstFocusableRef.current?.focus(), 100)
    }
  }, [isOpen])
  
  return (
    <Sheet open={isOpen}>
      <SheetContent>
        <SheetHeader>
          <button ref={firstFocusableRef} onClick={onClose}>
            Close
          </button>
        </SheetHeader>
        {/* Content */}
      </SheetContent>
    </Sheet>
  )
}
```

**Color Contrast Compliance:**

```typescript
// Design tokens ensuring WCAG AA compliance (4.5:1 for text)

// tailwind.config.ts
colors: {
  background: '#FAFAFA',      // Base
  foreground: '#0A0A0A',      // Text (19.8:1 ratio) ✓
  
  muted: {
    DEFAULT: '#F4F4F5',
    foreground: '#71717A'     // Secondary text (4.6:1) ✓
  },
  
  primary: {
    DEFAULT: '#14B8A6',       // Brand teal
    foreground: '#FFFFFF'     // Text on primary (3.2:1) - use for large text only
  },
  
  destructive: {
    DEFAULT: '#EF4444',       // Error red
    foreground: '#FFFFFF'     // Text on error (4.5:1) ✓
  }
}

// For critical actions on colored backgrounds, test contrast:
// Use tools like https://webaim.org/resources/contrastchecker/
```

### 4.5 Real-Time Features (Supabase Subscriptions)

**Real-Time Updates:**

```typescript
// hooks/use-realtime-posts.ts
import { useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export function useRealtimePosts(teamId: string) {
  const supabase = createClientComponentClient()
  const { addPost, updatePost, deletePost } = useCalendarStore()
  
  useEffect(() => {
    const channel = supabase
      .channel('posts_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'social_posts',
          filter: `team_id=eq.${teamId}`
        },
        (payload) => {
          switch (payload.eventType) {
            case 'INSERT':
              addPost(payload.new as ScheduledPost)
              toast.info('New post added by team member')
              break
            
            case 'UPDATE':
              updatePost(payload.new.id, payload.new)
              break
            
            case 'DELETE':
              deletePost(payload.old.id)
              toast.info('Post removed by team member')
              break
          }
        }
      )
      .subscribe()
    
    return () => {
      supabase.removeChannel(channel)
    }
  }, [teamId])
}
```

**Presence (Online Users):**

```typescript
// hooks/use-team-presence.ts
export function useTeamPresence(teamId: string) {
  const [onlineUsers, setOnlineUsers] = useState<string[]>([])
  const supabase = createClientComponentClient()
  
  useEffect(() => {
    const channel = supabase.channel(`team:${teamId}:presence`)
    
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const users = Object.keys(state).map(key => state[key][0].user_id)
        setOnlineUsers(users)
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        toast.info(`${newPresences[0].name} joined`)
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        toast.info(`${leftPresences[0].name} left`)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: currentUser.id,
            name: currentUser.name,
            online_at: new Date().toISOString()
          })
        }
      })
    
    return () => {
      supabase.removeChannel(channel)
    }
  }, [teamId])
  
  return onlineUsers
}
```

### 4.6 Internationalization (i18n) Preparation

**Future-Ready Structure:**

```typescript
// lib/i18n/config.ts
export const defaultLocale = 'en'
export const locales = ['en', 'es', 'fr', 'de'] as const
export type Locale = typeof locales[number]

// Dictionary structure
// locales/en.json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit"
  },
  "pages": {
    "x": {
      "title": "Accounts",
      "connect_new": "Connect New Account",
      "no_accounts": "No accounts connected"
    },
    "o": {
      "title": "Organize",
      "schedule_post": "Schedule Post"
    }
  }
}

// Usage
import { useTranslation } from '@/lib/i18n/client'

function Component() {
  const { t } = useTranslation()
  return <button>{t('common.save')}</button>
}
```

### 4.7 Testing Strategy

**Component Testing:**

```typescript
// __tests__/components/account-card.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { AccountCard } from '@/components/accounts/account-card'

describe('AccountCard', () => {
  const mockAccount = {
    id: 'test-id',
    platform: 'instagram',
    username: 'testuser',
    displayName: 'Test User',
    profilePicture: '/test.jpg',
    followerCount: 1000,
    metrics: {
      engagement7d: 4.2,
      postsLast7d: 5,
      growthPercent: 8
    },
    status: 'active'
  }
  
  it('renders account information correctly', () => {
    render(<AccountCard {...mockAccount} />)
    
    expect(screen.getByText('Test User')).toBeInTheDocument()
    expect(screen.getByText('@testuser')).toBeInTheDocument()
    expect(screen.getByText('1,000')).toBeInTheDocument() // Formatted follower count
  })
  
  it('calls onViewPosts when View Posts button is clicked', () => {
    const onViewPosts = jest.fn()
    render(<AccountCard {...mockAccount} onViewPosts={onViewPosts} />)
    
    const button = screen.getByRole('button', { name: /view posts/i })
    fireEvent.click(button)
    
    expect(onViewPosts).toHaveBeenCalledWith(mockAccount.id)
  })
  
  it('shows correct status badge', () => {
    render(<AccountCard {...mockAccount} />)
    
    const badge = screen.getByText('Active')
    expect(badge).toHaveClass('bg-success')
  })
})
```

**API Route Testing:**

```typescript
// __tests__/api/accounts.test.ts
import { GET } from '@/app/api/accounts/route'
import { createMocks } from 'node-mocks-http'

describe('/api/accounts', () => {
  it('returns accounts for authenticated user', async () => {
    const { req } = createMocks({
      method: 'GET',
      query: { team_id: 'test-team-id' }
    })
    
    const response = await GET(req as any)
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expect(data).toHaveProperty('accounts')
    expect(Array.isArray(data.accounts)).toBe(true)
  })
  
  it('returns 401 for unauthenticated requests', async () => {
    // Mock unauthenticated session
    const { req } = createMocks({ method: 'GET' })
    
    const response = await GET(req as any)
    
    expect(response.status).toBe(401)
  })
})
```

**E2E Testing (Playwright):**

```typescript
// e2e/calendar-scheduling.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Calendar Scheduling Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/o')
    await page.waitForLoadState('networkidle')
  })
  
  test('user can schedule a post from calendar', async ({ page }) => {
    // Click on a future date
    await page.click('[data-testid="day-cell-2025-11-20"]')
    
    // Wait for day detail panel to open
    await expect(page.locator('[data-testid="day-detail-panel"]')).toBeVisible()
    
    // Click "Add Post" button
    await page.click('[data-testid="add-post-button"]')
    
    // Should navigate to Create page with date preset
    await expect(page).toHaveURL(/\/c\?date=2025-11-20/)
    
    // Fill in brief
    await page.fill('[data-testid="brief-textarea"]', 'Test post content')
    
    // Select platform
    await page.click('[data-testid="platform-chip-instagram"]')
    
    // Generate content
    await page.click('[data-testid="generate-button"]')
    
    // Wait for AI generation
    await page.waitForSelector('[data-testid="caption-card"]')
    
    // Schedule the post
    await page.click('[data-testid="schedule-button"]')
    
    // Fill schedule modal
    await page.selectOption('[data-testid="account-selector"]', 'test-account-id')
    await page.click('[data-testid="schedule-confirm"]')
    
    // Should show success toast
    await expect(page.locator('text=Post scheduled')).toBeVisible()
  })
})
```

---

## 5. Deployment & DevOps

### 5.1 Vercel Deployment Configuration

**Environment Variables (Vercel Dashboard):**

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... # SECRET

# Vercel AI Gateway
VERCEL_AI_GATEWAY_URL=https://gateway.vercel.ai/v1
VERCEL_AI_GATEWAY_KEY=vag_xxxxxxxxxxxxxxxx # SECRET
OPENAI_MODEL=gpt-4-turbo-preview

# Platform OAuth Credentials (ALL SECRET)
INSTAGRAM_CLIENT_ID=xxxxx
INSTAGRAM_CLIENT_SECRET=xxxxx
INSTAGRAM_REDIRECT_URI=https://xocial.app/api/auth/instagram/callback

TWITTER_CLIENT_ID=xxxxx
TWITTER_CLIENT_SECRET=xxxxx
TWITTER_REDIRECT_URI=https://xocial.app/api/auth/twitter/callback

FACEBOOK_APP_ID=xxxxx
FACEBOOK_APP_SECRET=xxxxx

LINKEDIN_CLIENT_ID=xxxxx
LINKEDIN_CLIENT_SECRET=xxxxx

YOUTUBE_CLIENT_ID=xxxxx
YOUTUBE_CLIENT_SECRET=xxxxx

TIKTOK_CLIENT_KEY=xxxxx
TIKTOK_CLIENT_SECRET=xxxxx

# Application
NEXT_PUBLIC_APP_URL=https://xocial.app
NEXT_PUBLIC_APP_ENV=production

# Observability
SENTRY_DSN=https://xxxxx@sentry.io/xxxxx # SECRET
LOGTAIL_SOURCE_TOKEN=xxxxx # SECRET
```

**vercel.json Configuration:**

```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["iad1"], // Primary: US East
  "functions": {
    "app/api/**": {
      "memory": 1024,
      "maxDuration": 30
    },
    "app/api/ai/generate": {
      "memory": 2048,
      "maxDuration": 60
    }
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-store, must-revalidate"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=31536000; includeSubDomains"
        }
      ]
    }
  ],
  "redirects": [
    {
      "source": "/",
      "destination": "/x",
      "permanent": false,
      "has": [
        {
          "type": "cookie",
          "key": "sb-access-token"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "/api/:path*"
    }
  ]
}
```

### 5.2 CI/CD Pipeline

**GitHub Actions Workflow:**

```yaml
# .github/workflows/deploy.yml
name: Deploy to Vercel

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linter
        run: npm run lint
      
      - name: Run type check
        run: npm run type-check
      
      - name: Run tests
        run: npm run test:ci
        env:
          CI: true
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  deploy-preview:
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    needs: lint-and-test
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Vercel (Preview)
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          scope: ${{ secrets.VERCEL_ORG_ID }}

  deploy-production:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    needs: lint-and-test
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Vercel (Production)
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
          scope: ${{ secrets.VERCEL_ORG_ID }}
      
      - name: Run E2E tests (Production)
        run: npm run test:e2e
        env:
          BASE_URL: https://xocial.app
```

### 5.3 Monitoring & Observability

**Error Tracking (Sentry):**

```typescript
// instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

// sentry.server.config.ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_APP_ENV,
  tracesSampleRate: 0.1, // 10% of transactions
  profilesSampleRate: 0.1,
  
  beforeSend(event, hint) {
    // Filter sensitive data
    if (event.request) {
      delete event.request.cookies
      delete event.request.headers
    }
    return event
  },
  
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.Prisma({ client: prisma })
  ]
})
```

**Performance Monitoring:**

```typescript
// lib/analytics.ts
export function trackPageView(url: string) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', process.env.NEXT_PUBLIC_GA_ID, {
      page_path: url
    })
  }
}

export function trackEvent(action: string, params?: Record<string, any>) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', action, params)
  }
}

// Usage in components
useEffect(() => {
  trackPageView(window.location.pathname)
}, [])

// Track feature usage
trackEvent('ai_content_generated', {
  platforms: selectedPlatforms,
  tone: selectedTone,
  generation_time_ms: 2340
})
```

**Custom Health Checks:**

```typescript
// app/api/health/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const checks = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    checks: {
      database: 'unknown',
      ai_gateway: 'unknown',
      redis: 'unknown'
    }
  }
  
  try {
    // Check Supabase connection
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    const { data, error } = await supabase
      .from('teams')
      .select('count')
      .limit(1)
    
    checks.checks.database = error ? 'unhealthy' : 'healthy'
    
    // Check AI Gateway
    const aiResponse = await fetch(process.env.VERCEL_AI_GATEWAY_URL!, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.VERCEL_AI_GATEWAY_KEY}`
      }
    })
    
    checks.checks.ai_gateway = aiResponse.ok ? 'healthy' : 'unhealthy'
    
    // Overall status
    const allHealthy = Object.values(checks.checks).every(v => v === 'healthy')
    checks.status = allHealthy ? 'healthy' : 'degraded'
    
    return NextResponse.json(checks, {
      status: allHealthy ? 200 : 503
    })
    
  } catch (error) {
    return NextResponse.json(
      { ...checks, status: 'unhealthy' },
      { status: 503 }
    )
  }
}
```

---

## 6. Trae AI Development Directives

### 6.1 Code Generation Prompts (Examples)

**For Trae AI to generate X Page Account Card:**

```
Generate the AccountCard component for XOCIAL's X page based on these specs:

Component: AccountCard
Location: components/accounts/account-card.tsx
Type: Client Component

Props:
- id: string
- platform: 'instagram' | 'facebook' | 'twitter' | 'youtube' | 'linkedin' | 'tiktok'
- profilePicture: string
- displayName: string
- username: string
- followerCount: number
- metrics: { engagement7d: number, postsLast7d: number, growthPercent: number }
- status: 'active' | 'syncing' | 'error' | 'disconnected'
- lastSyncedAt: Date
- onViewPosts: (id: string) => void

Styling:
- Use ShadCN Card component as container
- Tailwind classes: rounded-lg, p-6, shadow-soft
- Hover effect: hover:shadow-medium, hover:scale-[1.02], transition-all
- Platform badge: absolute top-2 right-2, colored dot based on platform
- Avatar: 80px diameter, rounded-full
- Metrics grid: 3 columns, gap-4
- Status badge: bottom-left, use ShadCN Badge component
- Action button: ShadCN Button with variant="outline"

Layout:
- Platform badge (top-right corner)
- Avatar + Name + Username (centered)
- Metrics row (3-column grid): Followers, Engagement 7d, Growth %
- Status badge (bottom-left)
- View Posts button (bottom-center)

Behavior:
- Format follower count with commas (1000 → 1,000)
- Format percentages to 1 decimal (4.234 → 4.2%)
- Show trend arrows for metrics (up/down)
- Disable button if status is 'error' or 'disconnected'
- Use platform colors from platformColors constant
- Include accessible aria-labels

Generate the complete TypeScript component with proper imports from ShadCN UI and lucide-react icons.
```

**For Trae AI to generate Calendar API route:**

```
Generate the API route for fetching scheduled posts for XOCIAL's calendar view.

Route: app/api/posts/scheduled/route.ts
Method: GET

Query Parameters:
- team_id (required): UUID
- month (required): YYYY-MM format
- platforms (optional): comma-separated list
- accounts (optional): comma-separated UUIDs

Authentication:
- Use Supabase auth helper: createRouteHandlerClient
- Verify session exists, return 401 if not

Database Query:
- Table: social_posts
- Join: social_accounts (to get platform and username)
- Filter: team_id, scheduled_at within month range
- Filter: status IN ('draft', 'scheduled')
- Optional filters: platforms, accounts
- Order by: scheduled_at ASC

Response Format:
{
  "posts": [
    {
      "id": "uuid",
      "account_id": "uuid",
      "platform": "instagram",
      "account_username": "johndoe",
      "caption": "...",
```
      "media_urls": ["..."],
      "hashtags": ["#example"],
      "scheduled_at": "2025-11-06T09:00:00Z",
      "status": "scheduled",
      "created_by": "uuid",
      "created_at": "2025-11-01T14:30:00Z"
    }
  ],
  "total": 15,
  "month": "2025-11"
}

Error Handling:
- 400: Invalid month format or missing team_id
- 401: Unauthorized (no session)
- 403: Forbidden (user not in team)
- 500: Database or server error

Security:
- RLS policies automatically enforce team isolation
- No manual team membership checks needed (Supabase handles it)

Performance:
- Add proper indexes on team_id, scheduled_at
- Limit results to 100 per request
- Use Supabase select with specific columns (no SELECT *)

Generate the complete Next.js API route with TypeScript types, error handling, and the standardized error response format from lib/api-errors.ts.
```

### 6.2 Iteration Patterns for Trae AI

**Pattern 1: Component → Hook → API → Database**

```
Step 1: Generate UI Component
"Generate the SchedulePostModal component with form validation"

Step 2: Generate Data Hook
"Generate useSchedulePost hook that calls the API and updates local state"

Step 3: Generate API Route
"Generate POST /api/posts/scheduled route that inserts into database"

Step 4: Verify Database Schema
"Confirm social_posts table has all required columns and indexes"
```

**Pattern 2: Feature Addition**

```
Step 1: Update Store
"Add 'selectedVariation' state and 'setSelectedVariation' action to createStore"

Step 2: Update Component
"Add variation selector dropdown to CaptionCard component"

Step 3: Update API
"Modify /api/ai/generate to return 3 variations per caption"

Step 4: Update Types
"Add variations field to AISuggestions interface"
```

**Pattern 3: Bug Fix**

```
Step 1: Identify Issue
"Calendar day cells not showing correct post count"

Step 2: Check Data Flow
"Verify data from API → store → component props"

Step 3: Fix Logic
"Update getPostCountForDate function to count unique post IDs"

Step 4: Add Test
"Add unit test for getPostCountForDate with duplicate scenarios"
```

### 6.3 Testing Directives for Trae AI

**Unit Test Generation:**

```
Generate unit tests for the CaptionCard component.

Test file: __tests__/components/create/caption-card.test.tsx
Framework: Jest + React Testing Library

Test cases:
1. Renders platform name and icon correctly
2. Displays caption text in editable textarea
3. Shows character count with correct color coding:
   - Green when < 80% of limit
   - Yellow when 80-95% of limit
   - Red when > 100% of limit
4. Calls onCopy when Copy button clicked
5. Calls onSaveDraft when Save Draft clicked
6. Calls onSchedule when Schedule clicked
7. Disables buttons when isLoading prop is true
8. Shows regenerate button only on hover (use CSS test)
9. Character counter updates when caption text changes
10. Accessibility: has proper aria-labels on all buttons

Use proper mocks for:
- useCreateStore (mock Zustand store)
- navigator.clipboard.writeText (for copy functionality)
- ShadCN components (use actual components, not mocks)

Include setup/teardown for each test.
```

**Integration Test Generation:**

```
Generate integration test for the complete scheduling flow.

Test file: __tests__/flows/schedule-post.test.tsx
Framework: Jest + React Testing Library + MSW (Mock Service Worker)

Flow to test:
1. User navigates to C page
2. User fills brief form (platforms, tone, audience, description)
3. User clicks "Generate with AI"
4. Mock AI API returns captions
5. User clicks "Schedule" on Instagram caption
6. Schedule modal opens with prefilled date
7. User selects account and time
8. User clicks "Schedule Post"
9. Mock POST /api/posts/scheduled returns success
10. Verify success toast appears
11. Verify navigation to calendar page occurs

Mock APIs:
- POST /api/ai/generate → return mock caption data
- POST /api/posts/scheduled → return 201 with created post
- GET /api/accounts → return mock accounts for selector

Assert on:
- All UI state changes
- Correct API calls with correct payloads
- Error handling (test failure scenario too)
- Loading states display correctly
```

### 6.4 Refactoring Directives

**Code Quality Improvements:**

```
Refactor the analytics dashboard to improve performance.

Current issues:
1. All charts render on initial load (slow)
2. Data fetching not optimized
3. Too many re-renders on filter changes

Improvements needed:
1. Lazy load charts below fold with React.lazy + Suspense
2. Implement React Query for data fetching with proper caching
3. Debounce filter changes (500ms delay)
4. Memoize expensive calculations (useMemo)
5. Use React.memo for chart components
6. Implement virtual scrolling for post lists if > 50 items

Maintain:
- All existing functionality
- Same UI/UX
- Same API contracts
- Accessibility features

Generate refactored code with comments explaining optimizations.
```

### 6.5 Documentation Generation

**Component Documentation:**

```
Generate comprehensive JSDoc documentation for the useAnalyticsStore hook.

Include:
- Overview description of the hook's purpose
- @example usage with code snippet
- @param descriptions for all parameters
- @returns description with type
- @throws descriptions for error cases
- Internal state management explanation
- Performance considerations
- Related hooks and components

Format: TSDoc compatible for IDE autocomplete.
```

---

## 7. Database Optimization & Scaling Strategy

### 7.1 Database Indexes

**Critical Indexes for Performance:**

```sql
-- Social accounts indexes
CREATE INDEX idx_social_accounts_team_status 
  ON social_accounts(team_id, status) 
  WHERE status = 'active';

CREATE INDEX idx_social_accounts_platform 
  ON social_accounts(platform, team_id);

-- Social posts indexes  
CREATE INDEX idx_social_posts_team_scheduled 
  ON social_posts(team_id, scheduled_at) 
  WHERE status IN ('draft', 'scheduled');

CREATE INDEX idx_social_posts_account_published 
  ON social_posts(account_id, published_at DESC) 
  WHERE status = 'published';

CREATE INDEX idx_social_posts_status 
  ON social_posts(status, team_id);

-- Post metrics indexes
CREATE INDEX idx_metrics_snapshots_post_time 
  ON post_metrics_snapshots(post_id, captured_at DESC);

CREATE INDEX idx_metrics_snapshots_captured 
  ON post_metrics_snapshots(captured_at) 
  WHERE captured_at > NOW() - INTERVAL '90 days';

-- Comments indexes
CREATE INDEX idx_comments_post_created 
  ON social_comments(post_id, created_at DESC);

CREATE INDEX idx_comments_replied 
  ON social_comments(post_id) 
  WHERE replied_by_user = FALSE;

-- Team memberships index
CREATE INDEX idx_team_memberships_user 
  ON team_memberships(user_id, team_id, role);

-- AI insights index
CREATE INDEX idx_ai_insights_team_generated 
  ON ai_insights(team_id, generated_at DESC);
```

### 7.2 Query Optimization Examples

**Efficient Calendar Query:**

```sql
-- GOOD: Uses index, filters early
SELECT 
  sp.id,
  sp.caption,
  sp.scheduled_at,
  sp.status,
  sa.platform,
  sa.username
FROM social_posts sp
INNER JOIN social_accounts sa ON sa.id = sp.account_id
WHERE 
  sp.team_id = $1
  AND sp.scheduled_at >= $2 -- Start of month
  AND sp.scheduled_at < $3  -- End of month
  AND sp.status IN ('draft', 'scheduled')
ORDER BY sp.scheduled_at ASC
LIMIT 100;

-- BAD: No filters, loads all data
SELECT * FROM social_posts WHERE team_id = $1;
```

**Efficient Analytics Aggregation:**

```sql
-- GOOD: Uses materialized view or pre-aggregated data
SELECT 
  DATE_TRUNC('day', captured_at) as date,
  AVG(engagement_rate) as avg_engagement,
  SUM(likes) as total_likes,
  SUM(comments) as total_comments
FROM post_metrics_snapshots pms
INNER JOIN social_posts sp ON sp.id = pms.post_id
WHERE 
  sp.team_id = $1
  AND pms.captured_at >= $2
  AND pms.captured_at <= $3
GROUP BY DATE_TRUNC('day', captured_at)
ORDER BY date ASC;

-- Consider creating materialized view for daily aggregates:
CREATE MATERIALIZED VIEW daily_metrics_summary AS
SELECT 
  sp.team_id,
  sp.account_id,
  DATE_TRUNC('day', pms.captured_at) as date,
  AVG(pms.engagement_rate) as avg_engagement,
  SUM(pms.likes) as total_likes,
  SUM(pms.comments) as total_comments,
  COUNT(*) as post_count
FROM post_metrics_snapshots pms
INNER JOIN social_posts sp ON sp.id = pms.post_id
GROUP BY sp.team_id, sp.account_id, DATE_TRUNC('day', pms.captured_at);

-- Refresh daily
CREATE INDEX idx_daily_metrics_team_date 
  ON daily_metrics_summary(team_id, date DESC);
```

### 7.3 Connection Pooling (Supabase)

**Recommended Configuration:**

```typescript
// lib/supabase/server.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabaseServer = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'x-application-name': 'xocial'
    }
  }
})

// Supabase automatically handles connection pooling
// Default pool size: 15 connections
// Recommended for production: Use Supavisor (Supabase's connection pooler)
// Connection string: postgresql://[user]:[password]@[host]:6543/[db]?pgbouncer=true
```

### 7.4 Caching Strategy

**Application-Level Caching:**

```typescript
// lib/cache.ts
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!
})

export async function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 3600 // 1 hour default
): Promise<T> {
  // Try cache first
  const cached = await redis.get<T>(key)
  if (cached) return cached
  
  // Fetch fresh data
  const data = await fetcher()
  
  // Store in cache
  await redis.set(key, data, { ex: ttl })
  
  return data
}

// Usage in API routes
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const teamId = searchParams.get('team_id')
  
  const kpis = await getCached(
    `analytics:kpis:${teamId}:${dateRange}`,
    async () => {
      // Fetch from database
      return await fetchKPIsFromDB(teamId, dateRange)
    },
    300 // 5 minutes cache
  )
  
  return NextResponse.json({ kpis })
}

// Cache invalidation on mutations
export async function POST(request: Request) {
  // Create new post
  const post = await createPost(data)
  
  // Invalidate related caches
  await redis.del(`calendar:posts:${teamId}:${month}`)
  await redis.del(`analytics:kpis:${teamId}:*`) // Pattern delete
  
  return NextResponse.json({ post })
}
```

**React Query Caching:**

```typescript
// lib/react-query.ts
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 5 minutes
      staleTime: 5 * 60 * 1000,
      // Keep in cache for 30 minutes
      cacheTime: 30 * 60 * 1000,
      // Don't refetch on window focus for analytics
      refetchOnWindowFocus: false,
      // Retry failed requests 3 times
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
    }
  }
})

// Prefetch strategy
export function prefetchCalendarData(month: Date) {
  // Prefetch current month
  queryClient.prefetchQuery({
    queryKey: ['calendar', format(month, 'yyyy-MM')],
    queryFn: () => fetchCalendarData(month)
  })
  
  // Prefetch adjacent months
  const prevMonth = subMonths(month, 1)
  const nextMonth = addMonths(month, 1)
  
  queryClient.prefetchQuery({
    queryKey: ['calendar', format(prevMonth, 'yyyy-MM')],
    queryFn: () => fetchCalendarData(prevMonth)
  })
  
  queryClient.prefetchQuery({
    queryKey: ['calendar', format(nextMonth, 'yyyy-MM')],
    queryFn: () => fetchCalendarData(nextMonth)
  })
}
```

---

## 8. Security Hardening Checklist

### 8.1 Authentication & Authorization

**✓ Supabase Auth Configuration:**

```typescript
// middleware.ts - Protect all platform routes
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  
  const {
    data: { session },
  } = await supabase.auth.getSession()
  
  // Redirect to login if no session
  if (!session && req.nextUrl.pathname.startsWith('/x')) {
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = '/login'
    redirectUrl.searchParams.set('redirect', req.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }
  
  return res
}

export const config = {
  matcher: ['/x/:path*', '/o/:path*', '/c/:path*', '/a/:path*', '/i/:path*', '/l/:path*']
}
```

**✓ RLS Policies Enforcement:**

```sql
-- Ensure RLS is enabled on ALL tables
ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_memberships ENABLE ROW LEVEL SECURITY;

-- Example secure policy
CREATE POLICY "Users can only access their team's data"
ON social_posts
FOR ALL
USING (
  team_id IN (
    SELECT team_id 
    FROM team_memberships 
    WHERE user_id = auth.uid()
  )
);

-- Prevent policy bypass
ALTER TABLE social_posts FORCE ROW LEVEL SECURITY;
```

### 8.2 Input Validation & Sanitization

**Server-Side Validation (Zod):**

```typescript
// lib/validations.ts
import { z } from 'zod'

export const createPostSchema = z.object({
  team_id: z.string().uuid(),
  account_ids: z.array(z.string().uuid()).min(1, 'Select at least one account'),
  platform: z.enum(['instagram', 'facebook', 'twitter', 'youtube', 'linkedin', 'tiktok']),
  caption: z.string()
    .min(1, 'Caption is required')
    .max(10000, 'Caption is too long'),
  hashtags: z.array(z.string()).max(30, 'Too many hashtags'),
  scheduled_at: z.string().datetime().refine(
    (date) => new Date(date) > new Date(),
    'Scheduled date must be in the future'
  )
})

// Usage in API route
export async function POST(request: Request) {
  const body = await request.json()
  
  // Validate input
  const validation = createPostSchema.safeParse(body)
  
  if (!validation.success) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: validation.error.format()
      },
      { status: 400 }
    )
  }
  
  const data = validation.data
  // Proceed with validated data
}
```

**XSS Prevention:**

```typescript
// All user-generated content is automatically escaped by React
// For dangerouslySetInnerHTML (avoid when possible):
import DOMPurify from 'isomorphic-dompurify'

function SafeHTML({ html }: { html: string }) {
  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'],
    ALLOWED_ATTR: ['href']
  })
  
  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />
}
```

### 8.3 Rate Limiting

**API Route Rate Limiting:**

```typescript
// lib/rate-limit.ts
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!
})

export async function rateLimit(
  identifier: string, // User ID or IP
  limit: number = 100, // Max requests
  window: number = 60 // Time window in seconds
): Promise<{ success: boolean; remaining: number; reset: number }> {
  const key = `rate_limit:${identifier}`
  
  const count = await redis.incr(key)
  
  if (count === 1) {
    // Set expiry on first request
    await redis.expire(key, window)
  }
  
  const ttl = await redis.ttl(key)
  const remaining = Math.max(0, limit - count)
  
  return {
    success: count <= limit,
    remaining,
    reset: Date.now() + (ttl * 1000)
  }
}

// Usage in API route
export async function POST(request: Request) {
  const session = await getSession()
  
  const rateLimitResult = await rateLimit(
    session.user.id,
    50, // 50 requests
    3600 // per hour
  )
  
  if (!rateLimitResult.success) {
    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED',
        hint: 'Please try again later',
        retry_after: Math.ceil((rateLimitResult.reset - Date.now()) / 1000)
      },
      { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': '50',
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.reset.toString()
        }
      }
    )
  }
  
  // Process request
}
```

### 8.4 OAuth Token Security

**Encryption at Rest:**

```typescript
// lib/crypto.ts
import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex') // 32 bytes

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv)
  
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  const authTag = cipher.getAuthTag()
  
  // Return: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

export function decrypt(encryptedData: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedData.split(':')
  
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv)
  decipher.setAuthTag(authTag)
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  
  return decrypted
}

// Usage when storing OAuth tokens
const encryptedToken = encrypt(oauthAccessToken)
await supabase.from('social_accounts').insert({
  access_token: encryptedToken,
  refresh_token: encrypt(oauthRefreshToken)
})

// Usage when retrieving
const { data } = await supabase
  .from('social_accounts')
  .select('access_token')
  .eq('id', accountId)
  .single()

const decryptedToken = decrypt(data.access_token)
```

**Token Refresh Strategy:**

```typescript
// lib/oauth/refresh-tokens.ts
export async function refreshAccessToken(accountId: string) {
  // Fetch account with encrypted tokens
  const { data: account } = await supabase
    .from('social_accounts')
    .select('platform, refresh_token, token_expires_at')
    .eq('id', accountId)
    .single()
  
  // Check if refresh needed
  if (new Date(account.token_expires_at) > addHours(new Date(), 1)) {
    return // Token still valid for > 1 hour
  }
  
  // Decrypt refresh token
  const refreshToken = decrypt(account.refresh_token)
  
  // Platform-specific refresh logic
  const newTokens = await refreshPlatformToken(account.platform, refreshToken)
  
  // Encrypt and store new tokens
  await supabase
    .from('social_accounts')
    .update({
      access_token: encrypt(newTokens.access_token),
      token_expires_at: newTokens.expires_at
    })
    .eq('id', accountId)
}

// Cron job to refresh all expiring tokens
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/refresh-tokens",
      "schedule": "0 */6 * * *" // Every 6 hours
    }
  ]
}
```

---

## 9. Final Implementation Roadmap

### 9.1 Phase 1: MVP (Weeks 1-8)

**Week 1-2: Foundation**
- ✓ Initialize Next.js project with TypeScript
- ✓ Set up Supabase project and database schema
- ✓ Configure Tailwind + ShadCN UI
- ✓ Implement authentication (Supabase Auth)
- ✓ Create base layout (Shell, TopNav, Sidebar)
- ✓ Set up Vercel project and environment variables

**Week 3-4: X Page (Accounts)**
- ✓ Implement OAuth flows (Instagram, Twitter, Facebook)
- ✓ Build AccountCard component
- ✓ Create PostsDrawer with comment viewing
- ✓ Implement account syncing job
- ✓ Add real-time updates (Supabase subscriptions)

**Week 5-6: O Page (Calendar) & C Page (Create)**
- ✓ Build calendar grid with month navigation
- ✓ Implement DayDetailPanel with scheduled posts
- ✓ Create AI content generation interface
- ✓ Integrate Vercel AI Gateway
- ✓ Build scheduling modal and flow

**Week 7-8: A Page (Analytics) & Polish**
- ✓ Implement KPI cards and charts
- ✓ Build AI insights generation
- ✓ Add report export functionality
- ✓ Create I & L placeholder pages
- ✓ End-to-end testing
- ✓ Performance optimization
- ✓ Deploy to production

### 9.2 Phase 2: Advanced Features (Weeks 9-16)

**Weeks 9-10: Enhanced Analytics**
- Topic-based performance tracking
- Competitor analysis integration
- Advanced AI insights with trend prediction
- Custom report builder

**Weeks 11-12: Influence Marketplace (I Page)**
- Brand collaboration discovery
- Partnership management system
- Deal flow tracking
- Contract templates

**Weeks 13-14: Strategic Planning (L Page)**
- AI-powered content strategy generator
- Campaign timeline management
- Content gap detection
- Automated posting recommendations

**Weeks 15-16: Team Collaboration**
- In-app comments on posts
- Approval workflows
- Team activity feed
- Role-based permissions refinement

### 9.3 Success Metrics

**Technical Metrics:**
- Page load time: < 2s (p95)
- API response time: < 300ms (p95)
- AI generation time: < 4s (p95)
- Uptime: > 99.9%
- Error rate: < 0.1%

**User Engagement Metrics:**
- Daily active users (DAU)
- Posts scheduled per user per week
- AI generation usage rate
- Calendar interaction rate
- Analytics dashboard views

**Business Metrics:**
- User retention (30-day, 90-day)
- Feature adoption rates
- Time saved vs manual workflows
- Customer satisfaction (NPS score)

---

## 10. Conclusion & Next Steps

### 10.1 Document Summary

This SRS provides a **complete, implementation-ready blueprint** for building XOCIAL with Trae AI. Every page, component, flow, and API endpoint is specified with:

✓ **Pixel-perfect visual designs** with exact measurements
✓ **State machines** for every user interaction
✓ **Complete API contracts** with request/response schemas
✓ **Database schemas** with indexes and RLS policies
✓ **Component trees** ready for atomic generation
✓ **Error handling** at every layer
✓ **Performance optimizations** baked in
✓ **Security hardening** from day one
✓ **Accessibility compliance** throughout
✓ **Testing strategies** for quality assurance

### 10.2 Trae AI Development Approach

**Recommended Generation Sequence:**

1. **Database First**: Generate migration files for all tables
2. **Auth Layer**: Set up Supabase authentication and RLS
3. **API Routes**: Generate all backend endpoints with validation
4. **UI Components**: Build atomic components (buttons, cards, modals)
5. **Page Layouts**: Assemble components into full pages
6. **State Management**: Implement Zustand stores
7. **Integration**: Connect everything with proper data flow
8. **Testing**: Generate test suites for critical paths
9. **Optimization**: Add caching, lazy loading, prefetching
10. **Deployment**: Configure Vercel and go live

**Iterative Refinement:**
- Start with X page (simplest data flow)
- Move to O page (introduces calendar complexity)
- Then C page (adds AI integration)
- Then A page (most complex with charts)
- Finally, I & L placeholders (trivial)

### 10.3 Key Principles for Trae AI

1. **Never Skip Error Handling**: Every API call, every user input, every external service
2. **Accessibility is Non-Negotiable**: ARIA labels, keyboard nav, screen reader support
3. **Security First**: Validate everything, encrypt sensitive data, enforce RLS
4. **Performance Matters**: Lazy load, cache aggressively, optimize queries
5. **User Experience**: Loading states, optimistic updates, clear error messages
6. **Maintainability**: TypeScript everywhere, clear naming, comprehensive comments

### 10.4 Final Trae AI Prompt

```
You are building XOCIAL, an AI-powered social media management platform.

Stack:
- Next.js 14+ (App Router)
- TypeScript (strict mode)
- ShadCN UI + Tailwind CSS
- Supabase (PostgreSQL + Auth + RLS + Realtime)
- Vercel AI Gateway
- Deployed on Vercel

Core Principles:
1. Follow the SRS specifications EXACTLY
2. Generate complete, production-ready code
3. Include comprehensive error handling
4. Ensure accessibility (WCAG AA)
5. Optimize for performance
6. Add TypeScript types for everything
7. Include JSDoc comments for complex logic
8. Write clean, maintainable code

Reference this SRS document for:
- Component specifications → Section 3 (Pages)
- API contracts → Each page's API section
- Database schema → Section 2.2.1
- Design system → Section 4
- Error patterns → Section 4.1

When generating code:
- Import from '@/components/ui/*' for ShadCN components
- Use 'lucide-react' for icons
- Follow the component tree structure provided
- Implement all specified animations
- Add proper loading and error states
- Include accessibility attributes

Start with: [Specify which component/page/feature to generate]
```

---

**End of Document**

**Document Metadata:**
- Version: 1.0
- Last Updated: November 18, 2025
- Total Pages: 58
- Total Sections: 10
- Total Subsections: 67
- Intended for: Trae AI-assisted development
- Stack: Next.js + ShadCN + Supabase + Vercel + Vercel AI Gateway

This SRS is your single source of truth for building XOCIAL. Every decision has been made, every pattern defined, every edge case considered. Feed this to Trae AI section by section, and watch a production-grade social media management platform come to life.

**Ready to build. 🚀**