Software Requirements Specification (SRS)** optimized for Cursor AI development, Next.js 15.5+, Vercel, and Supabase. This document will serve as your comprehensive blueprint for systematic development.

---

# 📘 XOCIAL - ADVANCED SOFTWARE REQUIREMENTS SPECIFICATION (SRS)
## Enterprise-Grade AI-Powered Social Media Management Platform
### Version 2.0 - Optimized for Cursor AI Development

---

## 📋 TABLE OF CONTENTS

1. [Strategic Architecture Overview](#1-strategic-architecture-overview)
2. [System Design Philosophy](#2-system-design-philosophy)
3. [Comprehensive UI/UX Design System](#3-comprehensive-uiux-design-system)
4. [Database Architecture & Security](#4-database-architecture--security)
5. [Backend Architecture & API Design](#5-backend-architecture--api-design)
6. [Frontend Architecture & State Management](#6-frontend-architecture--state-management)
7. [Error Handling & Debugging Strategy](#7-error-handling--debugging-strategy)
8. [Performance Optimization Blueprint](#8-performance-optimization-blueprint)
9. [Security & Authentication Framework](#9-security--authentication-framework)
10. [Deployment & DevOps Strategy](#10-deployment--devops-strategy)
11. [Development Workflow & Best Practices](#11-development-workflow--best-practices)
12. [Testing & Quality Assurance](#12-testing--quality-assurance)

---

## 1. STRATEGIC ARCHITECTURE OVERVIEW

### 1.1 Multi-Layer Architecture Pattern

```
┌─────────────────────────────────────────────────────────────────┐
│                     PRESENTATION LAYER                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │   X      │  │    O     │  │    C     │  │   I/A/L  │       │
│  │ Accounts │  │ Calendar │  │ AI Tools │  │ Analytics│       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
│              Next.js 15.5+ App Router                           │
│              React Server Components + Client Components        │
└─────────────────────────────────────────────────────────────────┘
                            ↕ API Routes
┌─────────────────────────────────────────────────────────────────┐
│                     APPLICATION LAYER                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │   Auth   │  │   API    │  │  OAuth   │  │ Webhooks │       │
│  │ Services │  │Middleware│  │ Services │  │ Handlers │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
│              Edge Runtime + Node.js Runtime                     │
└─────────────────────────────────────────────────────────────────┘
                            ↕ Data Layer
┌─────────────────────────────────────────────────────────────────┐
│                     DATA LAYER                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ Supabase │  │   RLS    │  │  Zustand │  │  Redis   │       │
│  │PostgreSQL│  │ Policies │  │  Store   │  │  Cache   │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
└─────────────────────────────────────────────────────────────────┘
                            ↕ External APIs
┌─────────────────────────────────────────────────────────────────┐
│                     INTEGRATION LAYER                            │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────────┐         │
│  │ FB │ │ IG │ │ TW │ │ LI │ │ YT │ │ TT │ │ OpenAI │         │
│  └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Data Flow Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                      USER INTERACTION FLOW                        │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│  STEP 1: Authentication & Authorization                           │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ middleware.ts → Auth Check → RLS Context Setup          │   │
│  │   - JWT Token Validation                                 │   │
│  │   - Session Management                                   │   │
│  │   - Role-Based Access Control (RBAC)                     │   │
│  │   - Workspace Context Injection                          │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│  STEP 2: Request Processing                                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ API Route Handler                                        │   │
│  │   ↓                                                      │   │
│  │ Input Validation (Zod Schema)                           │   │
│  │   ↓                                                      │   │
│  │ Business Logic Layer                                     │   │
│  │   ↓                                                      │   │
│  │ Error Handling Wrapper                                   │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│  STEP 3: Data Operations                                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Supabase Client (with RLS automatically applied)         │   │
│  │   ↓                                                      │   │
│  │ Query Optimization & Indexing                           │   │
│  │   ↓                                                      │   │
│  │ Transaction Management                                   │   │
│  │   ↓                                                      │   │
│  │ Cache Strategy (Redis/Memory)                           │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│  STEP 4: Response Handling                                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Data Transformation                                      │   │
│  │   ↓                                                      │   │
│  │ Response Serialization                                   │   │
│  │   ↓                                                      │   │
│  │ HTTP Status Code Assignment                             │   │
│  │   ↓                                                      │   │
│  │ Logging & Monitoring                                     │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. SYSTEM DESIGN PHILOSOPHY

### 2.1 Core Design Principles

**1. Atomic Design Methodology**
- **Atoms**: Buttons, inputs, labels, icons
- **Molecules**: Form fields, search bars, cards
- **Organisms**: Navigation bars, forms, grids
- **Templates**: Page layouts
- **Pages**: Complete views

**2. Server-First Architecture**
- Default to React Server Components (RSC)
- Client components only when necessary:
  - User interactions (onClick, onChange)
  - Browser APIs (localStorage, window)
  - React hooks (useState, useEffect)
  - Third-party libraries requiring client-side

**3. Progressive Enhancement**
- Base functionality without JavaScript
- Enhanced experience with JavaScript
- Graceful degradation

**4. Zero-Trust Security Model**
- Every request validated
- RLS enforced at database level
- API routes protected
- Input sanitization mandatory

### 2.2 Development Decision Tree

```
┌─────────────────────────────────────────────────────────────┐
│         NEW FEATURE DEVELOPMENT DECISION TREE               │
└─────────────────────────────────────────────────────────────┘
                          START
                            ↓
              ┌─────────────────────────┐
              │ Does it need user       │
              │ interaction?            │
              └─────────────────────────┘
                    ↓           ↓
                  YES          NO
                    ↓           ↓
         ┌──────────────┐  ┌──────────────┐
         │ Client       │  │ Server       │
         │ Component    │  │ Component    │
         └──────────────┘  └──────────────┘
                ↓                  ↓
      ┌──────────────┐   ┌──────────────┐
      │ Add 'use     │   │ Fetch data   │
      │ client'      │   │ directly     │
      └──────────────┘   └──────────────┘
                ↓                  ↓
      ┌──────────────┐   ┌──────────────┐
      │ Use hooks    │   │ Pass as      │
      │ (useState,   │   │ props to     │
      │ useEffect)   │   │ children     │
      └──────────────┘   └──────────────┘
                ↓                  ↓
      ┌──────────────────────────────┐
      │ Does it need global state?    │
      └──────────────────────────────┘
            ↓               ↓
          YES              NO
            ↓               ↓
      ┌──────────┐    ┌──────────┐
      │ Zustand  │    │ Local    │
      │ Store    │    │ State    │
      └──────────┘    └──────────┘
```

---

## 3. COMPREHENSIVE UI/UX DESIGN SYSTEM

### 3.1 Design Token System

**Create a centralized design token file:**

```typescript
// src/lib/design-tokens.ts

export const DesignTokens = {
  // 🎨 COLOR SYSTEM (Based on HSL for easy manipulation)
  colors: {
    // Primary Brand Colors
    primary: {
      50: 'hsl(221, 83%, 97%)',   // Lightest
      100: 'hsl(221, 83%, 93%)',
      200: 'hsl(221, 77%, 85%)',
      300: 'hsl(221, 76%, 75%)',
      400: 'hsl(221, 70%, 63%)',
      500: 'hsl(221, 66%, 53%)',  // Base
      600: 'hsl(221, 63%, 45%)',
      700: 'hsl(221, 60%, 37%)',
      800: 'hsl(221, 57%, 29%)',
      900: 'hsl(221, 54%, 21%)',  // Darkest
      DEFAULT: 'hsl(221, 66%, 53%)',
    },
    
    // Semantic Colors
    success: {
      light: 'hsl(145, 63%, 95%)',
      DEFAULT: 'hsl(145, 63%, 49%)',
      dark: 'hsl(145, 63%, 35%)',
    },
    warning: {
      light: 'hsl(38, 92%, 95%)',
      DEFAULT: 'hsl(38, 92%, 50%)',
      dark: 'hsl(38, 92%, 35%)',
    },
    error: {
      light: 'hsl(0, 84%, 95%)',
      DEFAULT: 'hsl(0, 84%, 60%)',
      dark: 'hsl(0, 84%, 40%)',
    },
    info: {
      light: 'hsl(199, 89%, 95%)',
      DEFAULT: 'hsl(199, 89%, 48%)',
      dark: 'hsl(199, 89%, 35%)',
    },
    
    // Neutral Grays
    gray: {
      50: 'hsl(220, 13%, 98%)',
      100: 'hsl(220, 13%, 95%)',
      200: 'hsl(220, 13%, 91%)',
      300: 'hsl(220, 9%, 78%)',
      400: 'hsl(220, 9%, 65%)',
      500: 'hsl(220, 9%, 46%)',
      600: 'hsl(220, 13%, 36%)',
      700: 'hsl(220, 14%, 27%)',
      800: 'hsl(220, 15%, 20%)',
      900: 'hsl(220, 15%, 13%)',
    },
    
    // Platform-Specific Colors
    platforms: {
      facebook: 'hsl(221, 44%, 41%)',
      instagram: 'hsl(329, 100%, 50%)',
      twitter: 'hsl(203, 89%, 53%)',
      linkedin: 'hsl(201, 100%, 35%)',
      youtube: 'hsl(0, 100%, 50%)',
      tiktok: 'hsl(0, 0%, 0%)',
    },
  },
  
  // 📝 TYPOGRAPHY SYSTEM
  typography: {
    fontFamily: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
      mono: ['JetBrains Mono', 'Menlo', 'monospace'],
    },
    fontSize: {
      // Scale: Major Third (1.250)
      xs: ['0.75rem', { lineHeight: '1rem' }],      // 12px
      sm: ['0.875rem', { lineHeight: '1.25rem' }],  // 14px
      base: ['1rem', { lineHeight: '1.5rem' }],     // 16px
      lg: ['1.125rem', { lineHeight: '1.75rem' }],  // 18px
      xl: ['1.25rem', { lineHeight: '1.875rem' }],  // 20px
      '2xl': ['1.5rem', { lineHeight: '2rem' }],    // 24px
      '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px
      '4xl': ['2.25rem', { lineHeight: '2.5rem' }], // 36px
      '5xl': ['3rem', { lineHeight: '1' }],         // 48px
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
  },
  
  // 📏 SPACING SYSTEM (Based on 4px grid)
  spacing: {
    px: '1px',
    0: '0',
    1: '0.25rem',  // 4px
    2: '0.5rem',   // 8px
    3: '0.75rem',  // 12px
    4: '1rem',     // 16px
    5: '1.25rem',  // 20px
    6: '1.5rem',   // 24px
    8: '2rem',     // 32px
    10: '2.5rem',  // 40px
    12: '3rem',    // 48px
    16: '4rem',    // 64px
    20: '5rem',    // 80px
    24: '6rem',    // 96px
  },
  
  // 🔲 BORDER RADIUS
  borderRadius: {
    none: '0',
    sm: '0.25rem',   // 4px
    DEFAULT: '0.5rem', // 8px
    md: '0.75rem',   // 12px
    lg: '1rem',      // 16px
    xl: '1.5rem',    // 24px
    full: '9999px',
  },
  
  // 🌑 SHADOWS
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  },
  
  // ⏱️ ANIMATION TIMING
  animation: {
    duration: {
      fast: '150ms',
      normal: '250ms',
      slow: '350ms',
    },
    easing: {
      ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
  },
  
  // 📱 BREAKPOINTS
  breakpoints: {
    sm: '640px',   // Mobile landscape
    md: '768px',   // Tablet portrait
    lg: '1024px',  // Tablet landscape / Desktop
    xl: '1280px',  // Desktop
    '2xl': '1536px', // Large desktop
  },
  
  // 📐 Z-INDEX SCALE
  zIndex: {
    dropdown: 1000,
    sticky: 1100,
    modal: 1200,
    popover: 1300,
    tooltip: 1400,
    notification: 1500,
  },
} as const;
```

### 3.2 Component Architecture Blueprint

**Component File Structure:**

```
src/components/
├── ui/                    # Atomic components (atoms)
│   ├── button.tsx
│   ├── input.tsx
│   ├── card.tsx
│   ├── badge.tsx
│   ├── avatar.tsx
│   ├── skeleton.tsx
│   └── ...
├── shared/                # Composed components (molecules)
│   ├── header.tsx
│   ├── sidebar.tsx
│   ├── page-header.tsx
│   ├── data-table.tsx
│   └── ...
├── features/             # Feature-specific organisms
│   ├── posts/
│   │   ├── post-card.tsx
│   │   ├── post-composer.tsx
│   │   └── post-list.tsx
│   ├── analytics/
│   │   ├── metric-card.tsx
│   │   ├── engagement-chart.tsx
│   │   └── top-posts-table.tsx
│   └── ...
└── layouts/              # Page templates
    ├── dashboard-layout.tsx
    ├── auth-layout.tsx
    └── marketing-layout.tsx
```

### 3.3 UI Component Specifications

**Button Component Specifications:**

```
┌────────────────────────────────────────────────────────────────┐
│                    BUTTON COMPONENT SPEC                        │
└────────────────────────────────────────────────────────────────┘

VARIANTS:
┌─────────────┬───────────────┬─────────────────────────────────┐
│ Variant     │ Use Case      │ Visual Style                    │
├─────────────┼───────────────┼─────────────────────────────────┤
│ primary     │ Main actions  │ Solid bg, white text            │
│ secondary   │ Alt actions   │ Outline, colored border         │
│ ghost       │ Subtle        │ Transparent, hover bg           │
│ destructive │ Delete/Remove │ Red bg, white text              │
│ link        │ Navigation    │ Underline on hover              │
└─────────────┴───────────────┴─────────────────────────────────┘

SIZES:
┌──────┬──────────┬──────────┬─────────┬────────────┐
│ Size │ Height   │ Padding  │ Font    │ Icon Size  │
├──────┼──────────┼──────────┼─────────┼────────────┤
│ sm   │ 32px     │ 12px     │ 14px    │ 16px       │
│ md   │ 40px     │ 16px     │ 16px    │ 20px       │
│ lg   │ 48px     │ 20px     │ 18px    │ 24px       │
└──────┴──────────┴──────────┴─────────┴────────────┘

STATES:
┌──────────┬────────────────────────────────────────────────┐
│ State    │ Visual Changes                                 │
├──────────┼────────────────────────────────────────────────┤
│ default  │ Base styling                                   │
│ hover    │ Brightness +10%, scale 1.02                    │
│ active   │ Brightness -10%, scale 0.98                    │
│ focus    │ Ring: 2px offset, primary color                │
│ disabled │ Opacity 50%, cursor not-allowed                │
│ loading  │ Spinner icon, opacity 80%, pointer-events none │
└──────────┴────────────────────────────────────────────────┘

ACCESSIBILITY:
✓ aria-label for icon-only buttons
✓ aria-busy="true" when loading
✓ aria-disabled="true" when disabled
✓ Keyboard navigation (Tab, Enter, Space)
✓ Focus visible indicator
✓ Minimum touch target: 44x44px
```

### 3.4 Layout Grid System

```
┌────────────────────────────────────────────────────────────────┐
│                    RESPONSIVE GRID SYSTEM                       │
└────────────────────────────────────────────────────────────────┘

12-COLUMN GRID:
┌──────────────────────────────────────────────────────────────┐
│ 1  │ 2  │ 3  │ 4  │ 5  │ 6  │ 7  │ 8  │ 9  │ 10 │ 11 │ 12  │
└──────────────────────────────────────────────────────────────┘

BREAKPOINT BEHAVIOR:
┌────────┬──────────┬────────┬────────┬────────────────────┐
│ Screen │ Container│ Gutter │ Margin │ Columns            │
├────────┼──────────┼────────┼────────┼────────────────────┤
│ Mobile │ 100%     │ 16px   │ 16px   │ 4 (span-3 each)    │
│ Tablet │ 768px    │ 24px   │ 24px   │ 8 (span-6 or 4)    │
│ Desktop│ 1280px   │ 32px   │ auto   │ 12 (flexible)      │
└────────┴──────────┴────────┴────────┴────────────────────┘

COMMON LAYOUT PATTERNS:
┌──────────────────────────────────────────────────────────────┐
│ DASHBOARD LAYOUT (Desktop)                                   │
│ ┌──────┬──────────────────────────────────────────────────┐ │
│ │Sidebar│              Main Content Area                  │ │
│ │ 2col │                   10 columns                     │ │
│ │      │                                                  │ │
│ │Nav   │  ┌───────────────────────────────────────────┐  │ │
│ │Items │  │         Page Header                       │  │ │
│ │      │  └───────────────────────────────────────────┘  │ │
│ │      │  ┌──────────┬──────────┬──────────┬─────────┐  │ │
│ │      │  │  Card    │  Card    │  Card    │  Card   │  │ │
│ │      │  │  3col    │  3col    │  3col    │  3col   │  │ │
│ │      │  └──────────┴──────────┴──────────┴─────────┘  │ │
│ │      │  ┌──────────────────┬────────────────────────┐  │ │
│ │      │  │   Main Section   │    Sidebar Section    │  │ │
│ │      │  │      8 col       │        4 col          │  │ │
│ │      │  └──────────────────┴────────────────────────┘  │ │
│ └──────┴──────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### 3.5 Page-Specific Layout Trees

**X PAGE (Multi-Account Management):**

```
┌─────────────────────────────────────────────────────────────────┐
│  PAGE: /x (Multi-Account Management)                            │
└─────────────────────────────────────────────────────────────────┘
                              │
      ┌───────────────────────┴──────────────────────────┐
      │                                                   │
┌─────────────┐                                  ┌───────────────┐
│ PageHeader  │                                  │ AccountsGrid  │
│ - Title     │                                  │ (Organism)    │
│ - Actions   │                                  └───────────────┘
└─────────────┘                                          │
      │                                         ┌────────┴────────┐
      │                                         │                 │
┌─────────────────┐                    ┌───────────────┐ ┌───────────────┐
│ ConnectButton   │                    │ AccountCard   │ │ AccountCard   │
│ (Molecule)      │                    │ (Molecule)    │ │ (Molecule)    │
│ - Icon          │                    └───────────────┘ └───────────────┘
│ - Label         │                            │
│ - onClick       │                    ┌───────┴────────┐
└─────────────────┘                    │                │
                              ┌────────────────┐ ┌─────────────┐
                              │ Avatar (Atom)  │ │ Badge (Atom)│
                              │ Name           │ │ Status      │
                              │ Platform Icon  │ │ Metrics     │
                              │ Metrics        │ └─────────────┘
                              └────────────────┘
                                      │
                      ┌───────────────┴────────────────┐
                      │                                │
              ┌───────────────┐              ┌─────────────────┐
              │ RecentPosts   │              │ AccountActions  │
              │ (Organism)    │              │ (Molecule)      │
              └───────────────┘              └─────────────────┘
                      │                                │
          ┌───────────┴────────┐          ┌───────────┴────────┐
          │                    │          │                    │
  ┌───────────────┐   ┌───────────────┐ ┌────────┐   ┌────────┐
  │ PostCard      │   │ PostCard      │ │ Sync   │   │ Delete │
  │ (Molecule)    │   │ (Molecule)    │ │ Button │   │ Button │
  └───────────────┘   └───────────────┘ └────────┘   └────────┘

INTERACTION FLOW:
1. User lands on page → Server Component fetches accounts
2. AccountsGrid renders with SSR data
3. Click "Connect Account" → OAuth modal (Client Component)
4. Select platform → Redirect to OAuth → Callback → Refresh data
5. Click account card → Expand to show recent posts
6. Click "Sync" → Optimistic UI update → API call → Refresh
7. Hover post card → Show quick actions (like, comment, share)
```

**O PAGE (Content Calendar):**

```
┌─────────────────────────────────────────────────────────────────┐
│  PAGE: /o (Organize - Content Calendar)                         │
└─────────────────────────────────────────────────────────────────┘
                              │
      ┌───────────────────────┴──────────────────────────┐
      │                                                   │
┌─────────────┐                                  ┌───────────────┐
│ CalendarNav │                                  │ CalendarGrid  │
│ (Molecule)  │                                  │ (Organism)    │
└─────────────┘                                  └───────────────┘
      │                                                  │
┌─────┴──────┐                           ┌──────────────┴────────┐
│            │                           │                       │
│ ← → Today  │                  ┌────────────────┐      ┌────────────────┐
│ Month/Year │                  │ DayCell (Mon)  │      │ DayCell (Tue)  │
└────────────┘                  │ (Molecule)     │      │ (Molecule)     │
                                └────────────────┘      └────────────────┘
                                        │
                        ┌───────────────┴────────────────┐
                        │                                │
                ┌───────────────┐              ┌─────────────────┐
                │ Date Badge    │              │ Post Indicators │
                │ (Atom)        │              │ (Molecule)      │
                └───────────────┘              └─────────────────┘
                                                        │
                                        ┌───────────────┴────────┐
                                        │                        │
                                ┌───────────────┐        ┌───────────────┐
                                │ FB Dot        │        │ IG Dot        │
                                │ (2 posts)     │        │ (1 post)      │
                                └───────────────┘        └───────────────┘

INTERACTION FLOW:
1. Load calendar → Server fetches posts for month
2. Render grid with post indicators
3. Click day → Slide-in panel (DayPostsPanel)
4. Panel shows: List of scheduled posts for that day
5. Click post → Edit modal opens
6. Drag post → Highlight valid drop zones
7. Drop on new day → Optimistic update → API call
8. Platform checkbox toggle → Update post platforms
9. Delete post → Confirmation → Optimistic removal → API call

STATE MANAGEMENT:
- calendarStore (Zustand):
  - selectedMonth: Date
  - selectedDay: Date | null
  - posts: Post[]
  - isLoading: boolean
  - filters: { platforms: string[], status: string[] }
```

**C PAGE (AI Content Creation):**

```
┌─────────────────────────────────────────────────────────────────┐
│  PAGE: /c (Create - AI Content Generation)                      │
└─────────────────────────────────────────────────────────────────┘
                              │
      ┌───────────────────────┴──────────────────────────┐
      │                                                   │
┌─────────────┐                                  ┌───────────────┐
│ AIPrompt    │                                  │ PreviewPanel  │
│ Section     │                                  │ (Organism)    │
│ (Organism)  │                                  └───────────────┘
└─────────────┘                                          │
      │                                    ┌─────────────┴──────────┐
      │                                    │                        │
┌─────┴──────┐                    ┌───────────────┐      ┌────────────────┐
│ Textarea   │                    │ Platform Tabs │      │ Post Preview   │
│ (Prompt)   │                    │ FB│IG│TW│LI  │      │ (Platform UI)  │
│            │                    └───────────────┘      └────────────────┘
│ "Write... "│                            │
└────────────┘                    ┌───────┴────────┐
      │                           │                │
┌─────┴──────┐              ┌─────────┐      ┌─────────┐
│ AI Options │              │ Content │      │ Hashtags│
│ Dropdown   │              │ Text    │      │ List    │
│ - Tone     │              │ Editor  │      │ #growth │
│ - Length   │              │ (Edit)  │      │ #social │
│ - Style    │              └─────────┘      └─────────┘
└────────────┘
      │
┌─────┴──────┐
│ Generate   │
│ Button     │
└────────────┘

AI GENERATION FLOW:
1. User types prompt: "Write a post about launching new product"
2. Select tone: "Professional", length: "Medium", style: "Informative"
3. Click "Generate" → Loading state
4. API: POST /api/ai/generate
   - Body: { prompt, tone, length, style, platforms: ['facebook', 'instagram'] }
5. OpenAI generates content (streaming response)
6. Display generated text in editor (character by character animation)
7. Generate hashtags → API: POST /api/ai/hashtags
8. Display platform-specific previews
9. User can:
   - Edit text directly
   - Regenerate
   - Save as template
   - Schedule post
   - Publish immediately

COMPONENT STATE:
- prompt: string
- generatedContent: Record<Platform, string>
- hashtags: string[]
- isGenerating: boolean
- selectedPlatforms: Platform[]
- aiOptions: { tone, length, style }
```

---

## 4. DATABASE ARCHITECTURE & SECURITY

### 4.1 Complete Database Schema

```sql
-- ═══════════════════════════════════════════════════════════════
-- XOCIAL DATABASE SCHEMA
-- PostgreSQL 15+ with Supabase Extensions
-- ═══════════════════════════════════════════════════════════════

-- ENABLE EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For fuzzy search

-- ───────────────────────────────────────────────────────────────
-- TABLE 1: users (managed by Supabase Auth)
-- ───────────────────────────────────────────────────────────────
-- Note: This table is in auth.users schema
-- We reference it but don't create it

-- ───────────────────────────────────────────────────────────────
-- TABLE 2: profiles (extends auth.users)
-- ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  timezone TEXT DEFAULT 'UTC',
  preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_created_at ON profiles(created_at DESC);

-- ───────────────────────────────────────────────────────────────
-- TABLE 3: workspaces (multi-tenancy)
-- ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  settings JSONB DEFAULT '{}'::jsonb,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workspaces_owner ON workspaces(owner_id);
CREATE INDEX idx_workspaces_slug ON workspaces(slug);

-- ───────────────────────────────────────────────────────────────
-- TABLE 4: workspace_members (team collaboration)
-- ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.workspace_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  permissions JSONB DEFAULT '[]'::jsonb,
  invited_by UUID REFERENCES auth.users(id),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

CREATE INDEX idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);

-- ───────────────────────────────────────────────────────────────
-- TABLE 5: social_accounts (connected platforms)
-- ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.social_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('facebook', 'instagram', 'twitter', 'linkedin', 'youtube', 'tiktok')),
  platform_user_id TEXT NOT NULL,
  platform_username TEXT,
  platform_display_name TEXT,
  avatar_url TEXT,
  access_token TEXT NOT NULL,  -- Encrypted at application level
  refresh_token TEXT,           -- Encrypted at application level
  token_expires_at TIMESTAMPTZ,
  scopes TEXT[],
  is_active BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, platform, platform_user_id)
);

CREATE INDEX idx_social_accounts_workspace ON social_accounts(workspace_id);
CREATE INDEX idx_social_accounts_platform ON social_accounts(platform);
CREATE INDEX idx_social_accounts_user ON social_accounts(user_id);
CREATE INDEX idx_social_accounts_active ON social_accounts(is_active) WHERE is_active = true;

-- ───────────────────────────────────────────────────────────────
-- TABLE 6: posts (content management)
-- ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Content
  content TEXT NOT NULL,
  platforms TEXT[] NOT NULL,  -- ['facebook', 'instagram', ...]
  media_urls TEXT[],
  media_ids UUID[],
  
  -- Scheduling
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'publishing', 'published', 'failed')),
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  
  -- AI metadata
  ai_generated BOOLEAN DEFAULT false,
  ai_prompt TEXT,
  ai_metadata JSONB,
  
  -- Platform-specific content
  platform_content JSONB DEFAULT '{}'::jsonb,  -- { facebook: {...}, instagram: {...} }
  
  -- Publishing results
  external_ids JSONB DEFAULT '{}'::jsonb,  -- { facebook: "123_456", instagram: "789" }
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_posts_workspace ON posts(workspace_id);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_scheduled ON posts(scheduled_at) WHERE status = 'scheduled';
CREATE INDEX idx_posts_published ON posts(published_at DESC) WHERE status = 'published';
CREATE INDEX idx_posts_created_by ON posts(created_by);

-- Full-text search index
CREATE INDEX idx_posts_content_search ON posts USING gin(to_tsvector('english', content));

-- ───────────────────────────────────────────────────────────────
-- TABLE 7: post_analytics (engagement metrics)
-- ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.post_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  external_post_id TEXT NOT NULL,
  
  -- Engagement metrics
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  
  -- Calculated metrics
  engagement_rate DECIMAL(5,2),  -- Percentage
  
  -- Time series data
  metrics_history JSONB DEFAULT '[]'::jsonb,  -- [{timestamp, likes, comments, ...}, ...]
  
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(post_id, platform)
);

CREATE INDEX idx_post_analytics_post ON post_analytics(post_id);
CREATE INDEX idx_post_analytics_platform ON post_analytics(platform);
CREATE INDEX idx_post_analytics_engagement ON post_analytics(engagement_rate DESC NULLS LAST);

-- ───────────────────────────────────────────────────────────────
-- TABLE 8: media (uploaded files)
-- ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,  -- Path in Supabase Storage
  url TEXT NOT NULL,
  
  -- Media metadata
  width INTEGER,
  height INTEGER,
  duration INTEGER,  -- For videos
  thumbnail_url TEXT,
  
  -- AI analysis
  ai_labels TEXT[],
  ai_description TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_media_workspace ON media(workspace_id);
CREATE INDEX idx_media_uploaded_by ON media(uploaded_by);
CREATE INDEX idx_media_mime_type ON media(mime_type);

-- ───────────────────────────────────────────────────────────────
-- TABLE 9: content_templates (reusable content)
-- ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.content_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,  -- 'promotion', 'engagement', 'announcement', etc.
  
  content TEXT NOT NULL,
  platforms TEXT[],
  media_urls TEXT[],
  hashtags TEXT[],
  
  -- Template metadata
  variables TEXT[],  -- Placeholders like {{product_name}}
  use_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_templates_workspace ON content_templates(workspace_id);
CREATE INDEX idx_templates_category ON content_templates(category);

-- ───────────────────────────────────────────────────────────────
-- TABLE 10: ai_generations (AI usage tracking)
-- ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_generations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  type TEXT NOT NULL CHECK (type IN ('content', 'hashtags', 'strategy', 'refine', 'analyze')),
  prompt TEXT NOT NULL,
  result TEXT NOT NULL,
  
  -- API usage
  model TEXT,  -- 'gpt-4', 'gpt-3.5-turbo', etc.
  tokens_used INTEGER,
  cost DECIMAL(10,4),
  
  -- Metadata
  parameters JSONB,
  feedback INTEGER CHECK (feedback BETWEEN 1 AND 5),  -- User rating
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_generations_workspace ON ai_generations(workspace_id);
CREATE INDEX idx_ai_generations_type ON ai_generations(type);
CREATE INDEX idx_ai_generations_created ON ai_generations(created_at DESC);

-- ───────────────────────────────────────────────────────────────
-- TABLE 11: webhook_events (real-time updates)
-- ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform TEXT NOT NULL,
  event_type TEXT NOT NULL,
  external_id TEXT,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webhook_events_platform ON webhook_events(platform);
CREATE INDEX idx_webhook_events_processed ON webhook_events(processed) WHERE processed = false;
CREATE INDEX idx_webhook_events_created ON webhook_events(created_at DESC);

-- Auto-archive old webhook events (retention: 30 days)
CREATE INDEX idx_webhook_events_cleanup ON webhook_events(created_at) WHERE created_at < NOW() - INTERVAL '30 days';
```

### 4.2 Row Level Security (RLS) Policies

```sql
-- ═══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ═══════════════════════════════════════════════════════════════

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE media ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- ───────────────────────────────────────────────────────────────
-- HELPER FUNCTION: Get user's workspaces
-- ───────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION user_workspaces(user_uuid UUID)
RETURNS SETOF UUID AS $$
  SELECT workspace_id 
  FROM workspace_members 
  WHERE user_id = user_uuid;
$$ LANGUAGE SQL STABLE;

-- ───────────────────────────────────────────────────────────────
-- HELPER FUNCTION: Check workspace permission
-- ───────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION has_workspace_permission(
  workspace_uuid UUID,
  user_uuid UUID,
  required_role TEXT DEFAULT 'viewer'
)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = workspace_uuid
      AND user_id = user_uuid
      AND CASE required_role
          WHEN 'owner' THEN role = 'owner'
          WHEN 'admin' THEN role IN ('owner', 'admin')
          WHEN 'editor' THEN role IN ('owner', 'admin', 'editor')
          WHEN 'viewer' THEN role IN ('owner', 'admin', 'editor', 'viewer')
          ELSE false
        END
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ───────────────────────────────────────────────────────────────
-- RLS POLICIES: profiles
-- ───────────────────────────────────────────────────────────────
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ───────────────────────────────────────────────────────────────
-- RLS POLICIES: workspaces
-- ───────────────────────────────────────────────────────────────
CREATE POLICY "Users can view their workspaces"
  ON workspaces FOR SELECT
  USING (
    id IN (SELECT user_workspaces(auth.uid()))
    OR owner_id = auth.uid()
  );

CREATE POLICY "Users can create workspaces"
  ON workspaces FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update workspaces"
  ON workspaces FOR UPDATE
  USING (has_workspace_permission(id, auth.uid(), 'owner'));

CREATE POLICY "Owners can delete workspaces"
  ON workspaces FOR DELETE
  USING (owner_id = auth.uid());

-- ───────────────────────────────────────────────────────────────
-- RLS POLICIES: workspace_members
-- ───────────────────────────────────────────────────────────────
CREATE POLICY "Users can view workspace members"
  ON workspace_members FOR SELECT
  USING (has_workspace_permission(workspace_id, auth.uid(), 'viewer'));

CREATE POLICY "Admins can invite members"
  ON workspace_members FOR INSERT
  WITH CHECK (has_workspace_permission(workspace_id, auth.uid(), 'admin'));

CREATE POLICY "Admins can update members"
  ON workspace_members FOR UPDATE
  USING (has_workspace_permission(workspace_id, auth.uid(), 'admin'));

CREATE POLICY "Admins can remove members"
  ON workspace_members FOR DELETE
  USING (has_workspace_permission(workspace_id, auth.uid(), 'admin'));

-- ───────────────────────────────────────────────────────────────
-- RLS POLICIES: social_accounts
-- ───────────────────────────────────────────────────────────────
CREATE POLICY "Users can view workspace social accounts"
  ON social_accounts FOR SELECT
  USING (has_workspace_permission(workspace_id, auth.uid(), 'viewer'));

CREATE POLICY "Editors can connect accounts"
  ON social_accounts FOR INSERT
  WITH CHECK (has_workspace_permission(workspace_id, auth.uid(), 'editor'));

CREATE POLICY "Editors can update accounts"
  ON social_accounts FOR UPDATE
  USING (has_workspace_permission(workspace_id, auth.uid(), 'editor'));

CREATE POLICY "Editors can delete accounts"
  ON social_accounts FOR DELETE
  USING (has_workspace_permission(workspace_id, auth.uid(), 'editor'));

-- ───────────────────────────────────────────────────────────────
-- RLS POLICIES: posts
-- ───────────────────────────────────────────────────────────────
CREATE POLICY "Users can view workspace posts"
  ON posts FOR SELECT
  USING (has_workspace_permission(workspace_id, auth.uid(), 'viewer'));

CREATE POLICY "Editors can create posts"
  ON posts FOR INSERT
  WITH CHECK (has_workspace_permission(workspace_id, auth.uid(), 'editor'));

CREATE POLICY "Editors can update posts"
  ON posts FOR UPDATE
  USING (has_workspace_permission(workspace_id, auth.uid(), 'editor'));

CREATE POLICY "Editors can delete posts"
  ON posts FOR DELETE
  USING (has_workspace_permission(workspace_id, auth.uid(), 'editor'));

-- ───────────────────────────────────────────────────────────────
-- RLS POLICIES: post_analytics
-- ───────────────────────────────────────────────────────────────
CREATE POLICY "Users can view analytics for workspace posts"
  ON post_analytics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_analytics.post_id
        AND has_workspace_permission(posts.workspace_id, auth.uid(), 'viewer')
    )
  );

-- System can insert/update analytics (service role only)
-- No public policies for INSERT/UPDATE

-- ───────────────────────────────────────────────────────────────
-- RLS POLICIES: media
-- ───────────────────────────────────────────────────────────────
CREATE POLICY "Users can view workspace media"
  ON media FOR SELECT
  USING (has_workspace_permission(workspace_id, auth.uid(), 'viewer'));

CREATE POLICY "Editors can upload media"
  ON media FOR INSERT
  WITH CHECK (has_workspace_permission(workspace_id, auth.uid(), 'editor'));

CREATE POLICY "Editors can delete media"
  ON media FOR DELETE
  USING (has_workspace_permission(workspace_id, auth.uid(), 'editor'));

-- ───────────────────────────────────────────────────────────────
-- RLS POLICIES: content_templates
-- ───────────────────────────────────────────────────────────────
CREATE POLICY "Users can view workspace templates"
  ON content_templates FOR SELECT
  USING (has_workspace_permission(workspace_id, auth.uid(), 'viewer'));

CREATE POLICY "Editors can create templates"
  ON content_templates FOR INSERT
  WITH CHECK (has_workspace_permission(workspace_id, auth.uid(), 'editor'));

CREATE POLICY "Editors can update templates"
  ON content_templates FOR UPDATE
  USING (has_workspace_permission(workspace_id, auth.uid(), 'editor'));

CREATE POLICY "Editors can delete templates"
  ON content_templates FOR DELETE
  USING (has_workspace_permission(workspace_id, auth.uid(), 'editor'));

-- ───────────────────────────────────────────────────────────────
-- RLS POLICIES: ai_generations
-- ───────────────────────────────────────────────────────────────
CREATE POLICY "Users can view workspace AI generations"
  ON ai_generations FOR SELECT
  USING (has_workspace_permission(workspace_id, auth.uid(), 'viewer'));

CREATE POLICY "Users can create AI generations"
  ON ai_generations FOR INSERT
  WITH CHECK (has_workspace_permission(workspace_id, auth.uid(), 'editor'));

-- ───────────────────────────────────────────────────────────────
-- RLS POLICIES: webhook_events
-- ───────────────────────────────────────────────────────────────
-- Webhook events are system-managed (service role only)
-- No public policies
```

### 4.3 Database Optimization Strategies

**Performance Indexing Strategy:**

```
┌─────────────────────────────────────────────────────────────────┐
│               DATABASE OPTIMIZATION STRATEGIES                   │
└─────────────────────────────────────────────────────────────────┘

1. B-TREE INDEXES (Default - For exact matches & ranges)
   ┌──────────────────┬────────────────────────────────────────┐
   │ Table            │ Indexed Columns                        │
   ├──────────────────┼────────────────────────────────────────┤
   │ posts            │ workspace_id, status, scheduled_at     │
   │ social_accounts  │ workspace_id, platform, is_active      │
   │ post_analytics   │ post_id, platform, engagement_rate     │
   │ media            │ workspace_id, uploaded_by              │
   └──────────────────┴────────────────────────────────────────┘

2. GIN INDEXES (For JSONB & arrays)
   - posts.platform_content (JSONB operations)
   - posts.content (full-text search with tsvector)
   - media.ai_labels (array containment)

3. PARTIAL INDEXES (Filtered for specific conditions)
   - posts WHERE status = 'scheduled' (upcoming posts)
   - social_accounts WHERE is_active = true (active only)
   - webhook_events WHERE processed = false (unprocessed)

4. COMPOSITE INDEXES (Multi-column queries)
   - workspace_members(workspace_id, user_id)
   - social_accounts(workspace_id, platform, platform_user_id)
   - post_analytics(post_id, platform)

5. QUERY OPTIMIZATION RULES:
   ✓ Always include workspace_id in WHERE clause (partition key)
   ✓ Use LIMIT for paginated queries
   ✓ Avoid SELECT * (specify columns)
   ✓ Use .select() with specific columns in Supabase queries
   ✓ Implement cursor-based pagination for large datasets

6. CACHING STRATEGY:
   - Level 1: React Query (client-side, 5min stale)
   - Level 2: Vercel Edge Cache (API responses, 1min stale)
   - Level 3: Redis (session data, tokens, 15min TTL)
   - Level 4: PostgreSQL (query result cache)

7. CONNECTION POOLING:
   - Use Supabase connection pooler (pgBouncer)
   - Transaction mode for short-lived connections
   - Session mode for long-lived connections
   - Max connections: 100 (adjust based on plan)
```

### 4.4 Data Backup & Recovery Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                  BACKUP & RECOVERY STRATEGY                      │
└─────────────────────────────────────────────────────────────────┘

AUTOMATED BACKUPS (Supabase Pro):
┌──────────────┬────────────────┬─────────────────────────────┐
│ Frequency    │ Retention      │ What's Backed Up            │
├──────────────┼────────────────┼─────────────────────────────┤
│ Daily        │ 7 days         │ Full database snapshot      │
│ Weekly       │ 4 weeks        │ Full database + media       │
│ Monthly      │ 3 months       │ Archive snapshot            │
│ Real-time    │ 7 days WAL     │ Point-in-time recovery      │
└──────────────┴────────────────┴─────────────────────────────┘

RECOVERY PROCEDURES:
1. Point-in-Time Recovery (PITR):
   - Restore to any point within last 7 days
   - Use Supabase Dashboard → Database → Backups
   - RTO: < 1 hour, RPO: < 1 minute

2. Table-Level Recovery:
   - Export specific tables using pg_dump
   - Restore to staging environment
   - Validate data integrity
   - Import to production

3. Disaster Recovery:
   - Maintain 3-2-1 backup rule:
     - 3 copies of data
     - 2 different storage types
     - 1 off-site backup
   - Test recovery quarterly
   - Document recovery procedures

MONITORING:
- Set up alerts for:
  ✓ Failed backup jobs
  ✓ Database size approaching limits
  ✓ Connection pool exhaustion
  ✓ Slow query performance (> 1s)
  ✓ RLS policy violations
```

---

## 5. BACKEND ARCHITECTURE & API DESIGN

### 5.1 API Architecture Pattern

**RESTful API Structure:**

```
/api/
├── auth/
│   ├── login/           POST   - Authenticate user
│   ├── register/        POST   - Create new account
│   └── refresh/         POST   - Refresh access token
│
├── accounts/            GET    - List social accounts
│                        POST   - Connect new account
│   └── [id]/
│       ├── route.ts     GET    - Get account details
│       │                PATCH  - Update account
│       │                DELETE - Disconnect account
│       └── sync/        POST   - Trigger sync
│
├── posts/               GET    - List posts (paginated)
│                        POST   - Create new post
│   ├── [id]/
│   │   └── route.ts     GET    - Get post details
│   │                    PATCH  - Update post
│   │                    DELETE - Delete post
│   ├── bulk/            POST   - Bulk operations
│   └── publish/         POST   - Publish immediately
│
├── analytics/
│   ├── overview/        GET    - Dashboard metrics
│   ├── engagement/      GET    - Engagement data
│   ├── platform-stats/  GET    - Per-platform stats
│   ├── top-posts/       GET    - Best performing posts
│   └── export/          GET    - Export CSV/PDF
│
├── ai/
│   ├── generate/        POST   - Generate content
│   ├── refine/          POST   - Improve existing content
│   ├── hashtags/        POST   - Generate hashtags
│   ├── analyze/         POST   - Analyze content performance
│   └── variations/      POST   - Create content variations
│
├── strategy/
│   ├── weekly/          GET    - Weekly recommendations
│   ├── best-times/      GET    - Optimal posting times
│   ├── content-ideas/   GET    - AI content suggestions
│   └── insights/        GET    - Performance insights
│
├── templates/           GET    - List templates
│                        POST   - Create template
│   └── [id]/
│       └── route.ts     GET    - Get template
│                        PATCH  - Update template
│                        DELETE - Delete template
│
├── media/               GET    - List media files
│   ├── upload/          POST   - Upload new media
│   └── [id]/            GET    - Get media details
│                        DELETE - Delete media
│
├── oauth/
│   ├── connect/         GET    - Initiate OAuth flow
│   ├── facebook/        GET    - Facebook callback
│   ├── instagram/       GET    - Instagram callback
│   ├── twitter/         GET    - Twitter callback
│   ├── linkedin/        GET    - LinkedIn callback
│   ├── youtube/         GET    - YouTube callback
│   └── tiktok/          GET    - TikTok callback
│
├── webhooks/
│   ├── facebook/        POST   - Facebook webhook
│   ├── instagram/       POST   - Instagram webhook
│   └── twitter/         POST   - Twitter webhook
│
└── cron/
    ├── publish/         GET    - Auto-publish scheduled posts
    └── sync-metrics/    GET    - Sync engagement metrics
```

### 5.2 API Implementation Template

**Standard API Route Handler Pattern:**

```typescript
// src/app/api/posts/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════
// VALIDATION SCHEMAS
// ═══════════════════════════════════════════════════════════════
const createPostSchema = z.object({
  workspaceId: z.string().uuid(),
  content: z.string().min(1).max(5000),
  platforms: z.array(z.enum(['facebook', 'instagram', 'twitter', 'linkedin', 'youtube', 'tiktok'])).min(1),
  mediaIds: z.array(z.string().uuid()).optional(),
  scheduledAt: z.string().datetime().optional(),
  platformContent: z.record(z.any()).optional(),
});

const querySchema = z.object({
  workspaceId: z.string().uuid(),
  status: z.enum(['draft', 'scheduled', 'published', 'failed']).optional(),
  platform: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// ═══════════════════════════════════════════════════════════════
// GET /api/posts - List posts with pagination
// ═══════════════════════════════════════════════════════════════
export async function GET(request: NextRequest) {
  try {
    // 1. Initialize Supabase client with auth context
    const supabase = createRouteHandlerClient();
    
    // 2. Verify authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // 3. Parse and validate query parameters
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const validation = querySchema.safeParse(searchParams);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      );
    }
    
    const { workspaceId, status, platform, page, limit } = validation.data;
    
    // 4. Build query with filters
    let query = supabase
      .from('posts')
      .select('*, created_by:profiles!posts_created_by_fkey(id, full_name, avatar_url)', { count: 'exact' })
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);
    
    if (status) {
      query = query.eq('status', status);
    }
    
    if (platform) {
      query = query.contains('platforms', [platform]);
    }
    
    // 5. Execute query (RLS automatically applied)
    const { data: posts, error: queryError, count } = await query;
    
    if (queryError) {
      console.error('[API] Error fetching posts:', queryError);
      return NextResponse.json(
        { error: 'Failed to fetch posts' },
        { status: 500 }
      );
    }
    
    // 6. Return paginated response
    return NextResponse.json({
      data: posts,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
    
  } catch (error) {
    console.error('[API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// POST /api/posts - Create new post
// ═══════════════════════════════════════════════════════════════
export async function POST(request: NextRequest) {
  try {
    // 1. Initialize Supabase client
    const supabase = createRouteHandlerClient();
    
    // 2. Verify authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // 3. Parse and validate request body
    const body = await request.json();
    const validation = createPostSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      );
    }
    
    const postData = validation.data;
    
    // 4. Verify workspace access (RLS will enforce, but we check explicitly)
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('id')
      .eq('id', postData.workspaceId)
      .single();
    
    if (workspaceError || !workspace) {
      return NextResponse.json(
        { error: 'Workspace not found or access denied' },
        { status: 403 }
      );
    }
    
    // 5. Validate media IDs if provided
    if (postData.mediaIds && postData.mediaIds.length > 0) {
      const { data: mediaFiles, error: mediaError } = await supabase
        .from('media')
        .select('id, url')
        .in('id', postData.mediaIds)
        .eq('workspace_id', postData.workspaceId);
      
      if (mediaError || mediaFiles.length !== postData.mediaIds.length) {
        return NextResponse.json(
          { error: 'Invalid media IDs' },
          { status: 400 }
        );
      }
    }
    
    // 6. Create post
    const { data: post, error: insertError } = await supabase
      .from('posts')
      .insert({
        workspace_id: postData.workspaceId,
        created_by: session.user.id,
        content: postData.content,
        platforms: postData.platforms,
        media_ids: postData.mediaIds,
        status: postData.scheduledAt ? 'scheduled' : 'draft',
        scheduled_at: postData.scheduledAt,
        platform_content: postData.platformContent || {},
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('[API] Error creating post:', insertError);
      return NextResponse.json(
        { error: 'Failed to create post' },
        { status: 500 }
      );
    }
    
    // 7. Log activity (optional)
    console.log(`[API] Post created: ${post.id} by user ${session.user.id}`);
    
    // 8. Return created post
    return NextResponse.json(
      { data: post },
      { status: 201 }
    );
    
  } catch (error) {
    console.error('[API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// HELPER: Error response builder
// ═══════════════════════════════════════════════════════════════
function errorResponse(message: string, status: number, details?: any) {
  return NextResponse.json(
    { error: message, details },
    { status }
  );
}
```

### 5.3 API Middleware Pattern

```typescript
// src/lib/api-middleware.ts

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { z, ZodSchema } from 'zod';

// ═══════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════
type ApiHandler = (
  request: NextRequest,
  context: {
    user: { id: string; email: string };
    params?: any;
  }
) => Promise<NextResponse>;

type MiddlewareOptions = {
  requireAuth?: boolean;
  validateBody?: ZodSchema;
  validateQuery?: ZodSchema;
  allowedMethods?: string[];
};

// ═══════════════════════════════════════════════════════════════
// MAIN MIDDLEWARE WRAPPER
// ═══════════════════════════════════════════════════════════════
export function withMiddleware(
  handler: ApiHandler,
  options: MiddlewareOptions = {}
) {
  return async (request: NextRequest, routeContext?: any) => {
    const {
      requireAuth = true,
      validateBody,
      validateQuery,
      allowedMethods,
    } = options;

    try {
      // 1. Method validation
      if (allowedMethods && !allowedMethods.includes(request.method)) {
        return NextResponse.json(
          { error: `Method ${request.method} not allowed` },
          { status: 405 }
        );
      }

      // 2. Authentication check
      let user = null;
      if (requireAuth) {
        const supabase = createRouteHandlerClient();
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session) {
          return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
          );
        }
        
        user = {
          id: session.user.id,
          email: session.user.email!,
        };
      }

      // 3. Body validation
      if (validateBody && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
        try {
          const body = await request.json();
          const validation = validateBody.safeParse(body);
          
          if (!validation.success) {
            return NextResponse.json(
              {
                error: 'Validation failed',
                details: validation.error.errors,
              },
              { status: 400 }
            );
          }
          
          // Attach validated data to request
          (request as any).validatedBody = validation.data;
        } catch {
          return NextResponse.json(
            { error: 'Invalid JSON body' },
            { status: 400 }
          );
        }
      }

      // 4. Query validation
      if (validateQuery) {
        const searchParams = Object.fromEntries(request.nextUrl.searchParams);
        const validation = validateQuery.safeParse(searchParams);
        
        if (!validation.success) {
          return NextResponse.json(
            {
              error: 'Invalid query parameters',
              details: validation.error.errors,
            },
            { status: 400 }
          );
        }
        
        (request as any).validatedQuery = validation.data;
      }

      // 5. Call handler with context
      return await handler(request, {
        user: user!,
        params: routeContext?.params,
      });

    } catch (error) {
      console.error('[Middleware] Unexpected error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

// ═══════════════════════════════════════════════════════════════
// RATE LIMITING MIDDLEWARE (Vercel Edge Config)
// ═══════════════════════════════════════════════════════════════
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function withRateLimit(
  handler: ApiHandler,
  options: { maxRequests: number; windowMs: number }
) {
  return async (request: NextRequest, context: any) => {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const key = `rate_limit:${ip}`;
    const now = Date.now();
    
    const current = rateLimitMap.get(key);
    
    if (!current || now > current.resetAt) {
      // Reset window
      rateLimitMap.set(key, {
        count: 1,
        resetAt: now + options.windowMs,
      });
    } else if (current.count >= options.maxRequests) {
      // Rate limit exceeded
      return NextResponse.json(
        {
          error: 'Too many requests',
          retryAfter: Math.ceil((current.resetAt - now) / 1000),
        },
        { status: 429 }
      );
    } else {
      // Increment counter
      current.count++;
    }
    
    return handler(request, context);
  };
}

// ═══════════════════════════════════════════════════════════════
// USAGE EXAMPLE
// ═══════════════════════════════════════════════════════════════
/*
export const POST = withMiddleware(
  async (request, { user, params }) => {
    const body = (request as any).validatedBody;
    
    // Your handler logic here
    return NextResponse.json({ success: true });
  },
  {
    requireAuth: true,
    validateBody: createPostSchema,
    allowedMethods: ['POST'],
  }
);
*/
```

---

## 6. FRONTEND ARCHITECTURE & STATE MANAGEMENT

### 6.1 State Management Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                STATE MANAGEMENT ARCHITECTURE                     │
└─────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────┐
                    │   User Interaction  │
                    └──────────┬──────────┘
                              │
            ┌─────────────────┴─────────────────┐
            │                                   │
    ┌───────────────┐                  ┌───────────────┐
    │ Local State   │                  │ Global State  │
    │ (useState)    │                  │ (Zustand)     │
    └───────────────┘                  └───────────────┘
            │                                   │
            │                          ┌────────┴────────┐
            │                          │                 │
            │                  ┌───────────────┐ ┌──────────────┐
            │                  │ UI Store      │ │ Auth Store   │
            │                  │ - theme       │ │ - user       │
            │                  │ - sidebar     │ │ - session    │
            │                  │ - modals      │ │ - workspace  │
            │                  └───────────────┘ └──────────────┘
            │
            └──────────────┬───────────────────────────────────┐
                          │                                   │
                  ┌───────────────┐                  ┌────────────────┐
                  │ Server State  │                  │ Optimistic UI  │
                  │ (React Query) │                  │ Updates        │
                  └───────────────┘                  └────────────────┘
                          │
            ┌─────────────┼─────────────┐
            │             │             │
    ┌───────────┐ ┌──────────────┐ ┌──────────┐
    │ Cache     │ │ Mutations    │ │ Refresh  │
    │ (5min)    │ │ (POST/PUT)   │ │ (Manual) │
    └───────────┘ └──────────────┘ └──────────┘
```

### 6.2 Zustand Store Implementation

```typescript
// src/store/authStore.ts

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// ═══════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════
interface User {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
}

interface Workspace {
  id: string;
  name: string;
  slug: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
}

interface AuthState {
  // State
  user: User | null;
  workspace: Workspace | null;
  isLoading: boolean;
  
  // Actions
  setUser: (user: User | null) => void;
  setWorkspace: (workspace: Workspace | null) => void;
  setLoading: (isLoading: boolean) => void;
  logout: () => void;
}

// ═══════════════════════════════════════════════════════════════
// AUTH STORE
// ═══════════════════════════════════════════════════════════════
export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set) => ({
        // Initial state
        user: null,
        workspace: null,
        isLoading: true,
        
        // Actions
        setUser: (user) => set({ user }),
        setWorkspace: (workspace) => set({ workspace }),
        setLoading: (isLoading) => set({ isLoading }),
        logout: () => set({ user: null, workspace: null }),
      }),
      {
        name: 'auth-storage',
        partialize: (state) => ({
          // Only persist these fields
          user: state.user,
          workspace: state.workspace,
        }),
      }
    ),
    { name: 'AuthStore' }
  )
);

// ═══════════════════════════════════════════════════════════════
// SELECTORS (Optimized re-renders)
// ═══════════════════════════════════════════════════════════════
export const useUser = () => useAuthStore((state) => state.user);
export const useWorkspace = () => useAuthStore((state) => state.workspace);
export const useIsAuthenticated = () => useAuthStore((state) => !!state.user);
```

```typescript
// src/store/postsStore.ts

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Post } from '@/types';

// ═══════════════════════════════════════════════════════════════
// POSTS STORE (Client-side cache & optimistic updates)
// ═══════════════════════════════════════════════════════════════
interface PostsState {
  // State
  posts: Post[];
  selectedPost: Post | null;
  filters: {
    status?: string;
    platform?: string;
    dateRange?: { start: Date; end: Date };
  };
  
  // Actions
  setPosts: (posts: Post[]) => void;
  addPost: (post: Post) => void;
  updatePost: (id: string, updates: Partial<Post>) => void;
  deletePost: (id: string) => void;
  setSelectedPost: (post: Post | null) => void;
  setFilters: (filters: PostsState['filters']) => void;
  
  // Computed
  getFilteredPosts: () => Post[];
}

export const usePostsStore = create<PostsState>()(
  devtools(
    (set, get) => ({
      posts: [],
      selectedPost: null,
      filters: {},
      
      setPosts: (posts) => set({ posts }),
      
      addPost: (post) =>
        set((state) => ({
          posts: [post, ...state.posts],
        })),
      
      updatePost: (id, updates) =>
        set((state) => ({
          posts: state.posts.map((post) =>
            post.id === id ? { ...post, ...updates } : post
          ),
          selectedPost:
            state.selectedPost?.id === id
              ? { ...state.selectedPost, ...updates }
              : state.selectedPost,
        })),
      
      deletePost: (id) =>
        set((state) => ({
          posts: state.posts.filter((post) => post.id !== id),
          selectedPost:
            state.selectedPost?.id === id ? null : state.selectedPost,
        })),
      
      setSelectedPost: (post) => set({ selectedPost: post }),
      
      setFilters: (filters) => set({ filters }),
      
      getFilteredPosts: () => {
        const { posts, filters } = get();
        let filtered = posts;
        
        if (filters.status) {
          filtered = filtered.filter((p) => p.status === filters.status);
        }
        
        if (filters.platform) {
          filtered = filtered.filter((p) =>
            p.platforms.includes(filters.platform!)
          );
        }
        
        if (filters.dateRange) {
          const { start, end } = filters.dateRange;
          filtered = filtered.filter((p) => {
            const date = new Date(p.scheduledAt || p.createdAt);
            return date >= start && date <= end;
          });
        }
        
        return filtered;
      },
    }),
    { name: 'PostsStore' }
  )
);
```

### 6.3 React Query Integration

```typescript
// src/hooks/use-posts.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWorkspace } from '@/store/authStore';
import { usePostsStore } from '@/store/postsStore';
import { Post } from '@/types';

// ═══════════════════════════════════════════════════════════════
// API CLIENT FUNCTIONS
// ═══════════════════════════════════════════════════════════════
async function fetchPosts(workspaceId: string, filters?: any) {
  const params = new URLSearchParams({ workspaceId, ...filters });
  const response = await fetch(`/api/posts?${params}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch posts');
  }
  
  return response.json();
}

async function createPost(data: Partial<Post>) {
  const response = await fetch('/api/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    throw new Error('Failed to create post');
  }
  
  return response.json();
}

async function updatePost(id: string, data: Partial<Post>) {
  const response = await fetch(`/api/posts/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    throw new Error('Failed to update post');
  }
  
  return response.json();
}

async function deletePost(id: string) {
  const response = await fetch(`/api/posts/${id}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    throw new Error('Failed to delete post');
  }
  
  return response.json();
}

// ═══════════════════════════════════════════════════════════════
// CUSTOM HOOKS
// ═══════════════════════════════════════════════════════════════

/**
 * Hook to fetch and cache posts
 */
export function usePosts(filters?: any) {
  const workspace = useWorkspace();
  const setPosts = usePostsStore((state) => state.setPosts);
  
  return useQuery({
    queryKey: ['posts', workspace?.id, filters],
    queryFn: () => fetchPosts(workspace!.id, filters),
    enabled: !!workspace,
    staleTime: 5 * 60 * 1000, // 5 minutes
    onSuccess: (data) => {
      setPosts(data.data);
    },
  });
}

/**
 * Hook to create a new post with optimistic updates
 */
export function useCreatePost() {
  const queryClient = useQueryClient();
  const workspace = useWorkspace();
  const addPost = usePostsStore((state) => state.addPost);
  
  return useMutation({
    mutationFn: createPost,
    
    // Optimistic update
    onMutate: async (newPost) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['posts'] });
      
      // Snapshot previous value
      const previousPosts = queryClient.getQueryData(['posts', workspace?.id]);
      
      // Optimistically update
      const optimisticPost = {
        id: `temp-${Date.now()}`,
        ...newPost,
        status: 'draft',
        createdAt: new Date().toISOString(),
      } as Post;
      
      addPost(optimisticPost);
      
      // Return context with snapshot
      return { previousPosts };
    },
    
    // On error, rollback
    onError: (error, variables, context) => {
      if (context?.previousPosts) {
        queryClient.setQueryData(
          ['posts', workspace?.id],
          context.previousPosts
        );
      }
    },
    
    // Always refetch after error or success
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}

/**
 * Hook to update a post with optimistic updates
 */
export function useUpdatePost() {
  const queryClient = useQueryClient();
  const workspace = useWorkspace();
  const updatePostInStore = usePostsStore((state) => state.updatePost);
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Post> }) =>
      updatePost(id, data),
    
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['posts'] });
      
      // Optimistically update
      updatePostInStore(id, data);
      
      return { id };
    },
    
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}

/**
 * Hook to delete a post with optimistic updates
 */
export function useDeletePost() {
  const queryClient = useQueryClient();
  const workspace = useWorkspace();
  const deletePostFromStore = usePostsStore((state) => state.deletePost);
  
  return useMutation({
    mutationFn: deletePost,
    
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['posts'] });
      
      const previousPosts = queryClient.getQueryData(['posts', workspace?.id]);
      
      // Optimistically remove from UI
      deletePostFromStore(id);
      
      return { previousPosts };
    },
    
    onError: (error, variables, context) => {
      if (context?.previousPosts) {
        queryClient.setQueryData(
          ['posts', workspace?.id],
          context.previousPosts
        );
      }
    },
    
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}
```

---

## 7. ERROR HANDLING & DEBUGGING STRATEGY

### 7.1 Comprehensive Error Handling Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│              ERROR HANDLING LAYERS & STRATEGY                    │
└─────────────────────────────────────────────────────────────────┘

LAYER 1: CLIENT-SIDE ERROR BOUNDARY
┌─────────────────────────────────────────────────────────────────┐
│  React Error Boundary (catches render errors)                   │
│  - Fallback UI component                                        │
│  - Error logging to monitoring service                          │
│  - User-friendly error messages                                 │
│  - "Try Again" recovery action                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
LAYER 2: API ERROR HANDLING
┌─────────────────────────────────────────────────────────────────┐
│  Try-Catch blocks in API routes                                 │
│  - Specific error types (ValidationError, AuthError, etc.)      │
│  - Error serialization for transport                            │
│  - HTTP status code mapping                                     │
│  - Error context preservation                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
LAYER 3: DATABASE ERROR HANDLING
┌─────────────────────────────────────────────────────────────────┐
│  Supabase client error handling                                 │
│  - RLS policy violations                                        │
│  - Constraint violations (UNIQUE, FOREIGN KEY)                  │
│  - Connection failures                                          │
│  - Transaction rollback                                         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
LAYER 4: EXTERNAL API ERROR HANDLING
┌─────────────────────────────────────────────────────────────────┐
│  Third-party API failures (Facebook, Twitter, OpenAI, etc.)     │
│  - Rate limiting (429) → Exponential backoff                    │
│  - Timeouts → Retry with circuit breaker                        │
│  - Invalid tokens → Re-authentication flow                      │
│  - API deprecation → Version migration                          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
LAYER 5: MONITORING & ALERTING
┌─────────────────────────────────────────────────────────────────┐
│  Centralized logging and monitoring                             │
│  - Vercel Analytics (performance metrics)                       │
│  - Sentry (error tracking & stack traces)                       │
│  - Supabase Logs (database queries)                             │
│  - Custom logging service (user actions)                        │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Error Handling Implementation

```typescript
// src/lib/errors.ts

// ═══════════════════════════════════════════════════════════════
// CUSTOM ERROR CLASSES
// ═══════════════════════════════════════════════════════════════

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTH_ERROR', 401);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 'AUTHORIZATION_ERROR', 403);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter: number) {
    super('Too many requests', 'RATE_LIMIT', 429, { retryAfter });
    this.name = 'RateLimitError';
  }
}

export class ExternalAPIError extends AppError {
  constructor(service: string, message: string, details?: any) {
    super(`${service} API error: ${message}`, 'EXTERNAL_API_ERROR', 502, details);
    this.name = 'ExternalAPIError';
  }
}

// ═══════════════════════════════════════════════════════════════
// ERROR HANDLER MIDDLEWARE
// ═══════════════════════════════════════════════════════════════

export function handleError(error: unknown): {
  message: string;
  code: string;
  statusCode: number;
  details?: any;
} {
  // Known application errors
  if (error instanceof AppError) {
    return {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      details: error.details,
    };
  }
  
  // Supabase errors
  if (error && typeof error === 'object' && 'code' in error) {
    const pgError = error as any;
    
    // Map PostgreSQL error codes
    const errorMap: Record<string, { message: string; status: number }> = {
      '23505': { message: 'Duplicate entry', status: 409 },
      '23503': { message: 'Referenced record not found', status: 400 },
      '23502': { message: 'Required field missing', status: 400 },
      '42P01': { message: 'Database table not found', status: 500 },
      'PGRST301': { message: 'Row level security policy violation', status: 403 },
    };
    
    const mapped = errorMap[pgError.code];
    if (mapped) {
      return {
        message: mapped.message,
        code: pgError.code,
        statusCode: mapped.status,
        details: pgError.details || pgError.hint,
      };
    }
  }
  
  // Zod validation errors
  if (error && typeof error === 'object' && 'issues' in error) {
    return {
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      statusCode: 400,
      details: (error as any).issues,
    };
  }
  
  // Unknown errors
  console.error('[Error Handler] Unknown error:', error);
  return {
    message: 'An unexpected error occurred',
    code: 'INTERNAL_ERROR',
    statusCode: 500,
  };
}

// ═══════════════════════════════════════════════════════════════
// RETRY LOGIC WITH EXPONENTIAL BACKOFF
// ═══════════════════════════════════════════════════════════════

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
  } = options;
  
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on client errors (4xx)
      if (error instanceof AppError && error.statusCode < 500) {
        throw error;
      }
      
      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        initialDelay * Math.pow(backoffMultiplier, attempt),
        maxDelay
      );
      
      console.log(`[Retry] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

// ═══════════════════════════════════════════════════════════════
// CIRCUIT BREAKER PATTERN
// ═══════════════════════════════════════════════════════════════

class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime?: number;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  constructor(
    private threshold: number = 5,
    private timeout: number = 60000 // 1 minute
  ) {}
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state === 'OPEN') {
      const now = Date.now();
      if (this.lastFailureTime && now - this.lastFailureTime > this.timeout) {
        // Try half-open state
        this.state = 'HALF_OPEN';
        console.log('[Circuit Breaker] Attempting recovery (HALF_OPEN)');
      } else {
        throw new Error('Circuit breaker is OPEN - service unavailable');
      }
    }
    
    try {
      const result = await fn();
      
      // Success - reset on half-open or keep closed
      if (this.state === 'HALF_OPEN') {
        console.log('[Circuit Breaker] Recovery successful (CLOSED)');
        this.state = 'CLOSED';
        this.failureCount = 0;
      }
      
      return result;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();
      
      if (this.failureCount >= this.threshold) {
        this.state = 'OPEN';
        console.error(`[Circuit Breaker] OPEN - ${this.failureCount} failures`);
      }
      
      throw error;
    }
  }
  
  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
    };
  }
}

export const apiCircuitBreaker = new CircuitBreaker();
```

### 7.3 React Error Boundary

```typescript
// src/components/error-boundary.tsx

'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// ERROR BOUNDARY COMPONENT
// ═══════════════════════════════════════════════════════════════

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to error tracking service (e.g., Sentry)
    console.error('Error Boundary caught error:', error, errorInfo);
    
    // TODO: Send to monitoring service
    // logErrorToService(error, errorInfo);
  }
  
  reset = () => {
    this.setState({ hasError: false, error: null });
  };
  
  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return <FallbackComponent error={this.state.error!} reset={this.reset} />;
    }
    
    return this.props.children;
  }
}

// ═══════════════════════════════════════════════════════════════
// DEFAULT ERROR FALLBACK UI
// ═══════════════════════════════════════════════════════════════

function DefaultErrorFallback({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-4 inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full">
          <AlertTriangle className="w-8 h-8 text-red-600" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Something went wrong
        </h1>
        
        <p className="text-gray-600 mb-6">
          We encountered an unexpected error. Don't worry, your data is safe.
        </p>
        
        {process.env.NODE_ENV === 'development' && (
          <details className="mb-6 text-left">
            <summary className="cursor-pointer text-sm font-medium text-gray-700 mb-2">
              Error Details (Development Only)
            </summary>
            <pre className="text-xs bg-gray-100 p-4 rounded overflow-auto max-h-40">
              {error.message}
              {'\n\n'}
              {error.stack}
            </pre>
          </details>
        )}
        
        <div className="flex gap-3 justify-center">
          <Button onClick={reset} variant="primary">
            Try Again
          </Button>
          <Button
            onClick={() => window.location.href = '/'}
            variant="secondary"
          >
            Go Home
          </Button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// USAGE IN LAYOUT
// ═══════════════════════════════════════════════════════════════

/*
// src/app/layout.tsx

import { ErrorBoundary } from '@/components/error-boundary';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}
*/
```

### 7.4 Logging & Monitoring Strategy

```typescript
// src/lib/logger.ts

// ═══════════════════════════════════════════════════════════════
// CENTRALIZED LOGGING UTILITY
// ═══════════════════════════════════════════════════════════════

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  userId?: string;
  workspaceId?: string;
  action?: string;
  metadata?: Record<string, any>;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  
  private formatMessage(level: LogLevel, message: string, context?: LogContext) {
    const timestamp = new Date().toISOString();
    const contextStr = context ? JSON.stringify(context) : '';
    
    return `[${timestamp}] [${level.toUpperCase()}] ${message} ${contextStr}`;
  }
  
  private sendToMonitoring(level: LogLevel, message: string, context?: LogContext) {
    // TODO: Send to monitoring service (Sentry, DataDog, etc.)
    // For now, just console output
    
    if (this.isDevelopment) {
      return; // Don't send in development
    }
    
    // Example: Send to external service
    // fetch('/api/logs', {
    //   method: 'POST',
    //   body: JSON.stringify({ level, message, context, timestamp: Date.now() }),
    // });
  }
  
  debug(message: string, context?: LogContext) {
    if (this.isDevelopment) {
      console.debug(this.formatMessage('debug', message, context));
    }
  }
  
  info(message: string, context?: LogContext) {
    console.info(this.formatMessage('info', message, context));
    this.sendToMonitoring('info', message, context);
  }
  
  warn(message: string, context?: LogContext) {
    console.warn(this.formatMessage('warn', message, context));
    this.sendToMonitoring('warn', message, context);
  }
  
  error(message: string, error?: Error, context?: LogContext) {
    const fullContext = {
      ...context,
      error: error ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
      } : undefined,
    };
    
    console.error(this.formatMessage('error', message, fullContext));
    this.sendToMonitoring('error', message, fullContext);
  }
  
  // Track user actions for analytics
  trackAction(action: string, context?: LogContext) {
    this.info(`User action: ${action}`, { ...context, action });
  }
}

export const logger = new Logger();

// ═══════════════════════════════════════════════════════════════
// USAGE EXAMPLES
// ═══════════════════════════════════════════════════════════════

/*
// In API route
logger.info('User logged in', { userId: user.id });

// On error
try {
  await publishPost(post);
} catch (error) {
  logger.error('Failed to publish post', error, {
    userId: session.user.id,
    postId: post.id,
  });
}

// Track user actions
logger.trackAction('post_created', {
  userId: user.id,
  workspaceId: workspace.id,
  metadata: { platform: 'facebook' },
});
*/
```

### 7.5 Debugging Tools Configuration

```typescript
// next.config.js

/** @type {import('next').NextConfig} */
const nextConfig = {
  // ═══════════════════════════════════════════════════════════════
  // DEVELOPMENT OPTIMIZATIONS
  // ═══════════════════════════════════════════════════════════════
  
  // Enable React strict mode for detecting issues
  reactStrictMode: true,
  
  // Detailed error overlay
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' 
      ? { exclude: ['error', 'warn'] }
      : false,
  },
  
  // ═══════════════════════════════════════════════════════════════
  // SOURCE MAPS FOR DEBUGGING
  // ═══════════════════════════════════════════════════════════════
  
  productionBrowserSourceMaps: true, // Enable for production debugging
  
  // ═══════════════════════════════════════════════════════════════
  // LOGGING CONFIGURATION
  // ═══════════════════════════════════════════════════════════════
  
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  
  // ═══════════════════════════════════════════════════════════════
  // EXPERIMENTAL FEATURES
  // ═══════════════════════════════════════════════════════════════
  
  experimental: {
    // Instrumentation for observability
    instrumentationHook: true,
    
    // Server actions logging
    serverActions: true,
  },
  
  // ═══════════════════════════════════════════════════════════════
  // ENVIRONMENT VARIABLES VALIDATION
  // ═══════════════════════════════════════════════════════════════
  
  env: {
    NEXT_PUBLIC_APP_ENV: process.env.NODE_ENV,
  },
  
  // ═══════════════════════════════════════════════════════════════
  // HEADERS FOR DEBUGGING
  // ═══════════════════════════════════════════════════════════════
  
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'X-API-Version', value: '1.0' },
          { key: 'X-Response-Time', value: new Date().toISOString() },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

---

## 8. PERFORMANCE OPTIMIZATION BLUEPRINT

### 8.1 Next.js 15.5+ Optimization Strategies

```
┌─────────────────────────────────────────────────────────────────┐
│           NEXT.JS PERFORMANCE OPTIMIZATION LAYERS               │
└─────────────────────────────────────────────────────────────────┘

LAYER 1: RENDERING OPTIMIZATION
┌─────────────────────────────────────────────────────────────────┐
│ ✓ React Server Components (RSC) by default                     │
│   - Reduce client-side JavaScript bundle                       │
│   - Faster initial page load                                   │
│   - Server-side data fetching                                  │
│                                                                 │
│ ✓ Streaming & Suspense                                         │
│   - Progressive page rendering                                 │
│   - Show content as it loads                                   │
│   - Improved perceived performance                             │
│                                                                 │
│ ✓ Partial Prerendering (PPR)                                   │
│   - Static shell + dynamic content                             │
│   - Best of both worlds                                        │
└─────────────────────────────────────────────────────────────────┘

LAYER 2: DATA FETCHING OPTIMIZATION
┌─────────────────────────────────────────────────────────────────┐
│ ✓ Server-side data fetching with fetch() caching               │
│   - Automatic request deduplication                            │
│   - Configurable cache strategies                              │
│   - Revalidation on demand                                     │
│                                                                 │
│ ✓ Parallel data fetching                                       │
│   - Multiple async requests simultaneously                     │
│   - Reduced waterfall effect                                   │
│                                                                 │
│ ✓ Database query optimization                                  │
│   - Indexed columns for fast lookups                           │
│   - Limited result sets (pagination)                           │
│   - Connection pooling (Supabase)                              │
└─────────────────────────────────────────────────────────────────┘

LAYER 3: ASSET OPTIMIZATION
┌─────────────────────────────────────────────────────────────────┐
│ ✓ Next.js Image Component                                      │
│   - Automatic image optimization                               │
│   - Lazy loading by default                                    │
│   - Modern formats (WebP, AVIF)                                │
│   - Responsive images with srcset                              │
│                                                                 │
│ ✓ Font Optimization                                            │
│   - next/font for self-hosted fonts                            │
│   - Automatic font subsetting                                  │
│   - Zero layout shift                                          │
│                                                                 │
│ ✓ Code Splitting                                               │
│   - Automatic route-based splitting                            │
│   - Dynamic imports for heavy components                       │
│   - Tree shaking unused code                                   │
└─────────────────────────────────────────────────────────────────┘

LAYER 4: CACHING STRATEGY
┌─────────────────────────────────────────────────────────────────┐
│ ✓ Multi-level caching                                          │
│   - Browser cache (static assets)                              │
│   - Vercel Edge Cache (API responses)                          │
│   - React Query cache (client state)                           │
│   - Database query cache (PostgreSQL)                          │
│                                                                 │
│ Cache durations:                                               │
│   - Static assets: 1 year (immutable)                          │
│   - API responses: 1-5 minutes                                 │
│   - User data: 30 seconds                                      │
│   - Analytics: 15 minutes                                      │
└─────────────────────────────────────────────────────────────────┘

LAYER 5: BUNDLE OPTIMIZATION
┌─────────────────────────────────────────────────────────────────┐
│ ✓ Tree shaking & dead code elimination                         │
│ ✓ Minification (JS, CSS)                                       │
│ ✓ Compression (Brotli, Gzip)                                   │
│ ✓ Bundle analysis (webpack-bundle-analyzer)                    │
│ ✓ Lazy loading non-critical features                           │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 Performance Configuration

```typescript
// src/app/layout.tsx

import { Inter } from 'next/font/google';
import type { Metadata } from 'next';

// ═══════════════════════════════════════════════════════════════
// FONT OPTIMIZATION
// ═══════════════════════════════════════════════════════════════

const inter = Inter({
  subsets: ['latin'],
  display: 'swap', // Prevent FOIT (Flash of Invisible Text)
  preload: true,
  variable: '--font-inter',
  adjustFontFallback: true, // Reduce layout shift
});

// ═══════════════════════════════════════════════════════════════
// METADATA FOR SEO & PERFORMANCE
// ═══════════════════════════════════════════════════════════════

export const metadata: Metadata = {
  title: {
    template: '%s | XOCIAL',
    default: 'XOCIAL - AI-Powered Social Media Management',
  },
  description: 'Manage all your social media accounts in one place with AI-powered tools',
  
  // Open Graph
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://xocial.app',
    siteName: 'XOCIAL',
  },
  
  // Performance hints
  robots: {
    index: true,
    follow: true,
  },
  
  // Preconnect to external domains
  other: {
    'preconnect': 'https://fonts.googleapis.com',
  },
};

// ═══════════════════════════════════════════════════════════════
// ROOT LAYOUT WITH OPTIMIZATIONS
// ═══════════════════════════════════════════════════════════════

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        {/* Preconnect to critical domains */}
        <link rel="preconnect" href="https://api.supabase.co" />
        <link rel="dns-prefetch" href="https://api.openai.com" />
        
        {/* Resource hints for faster loading */}
        <link rel="prefetch" href="/api/accounts" />
      </head>
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
```

```typescript
// src/components/optimized-image.tsx

import Image from 'next/image';

// ═══════════════════════════════════════════════════════════════
// OPTIMIZED IMAGE COMPONENT
// ═══════════════════════════════════════════════════════════════

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
  className?: string;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  priority = false,
  className,
}: OptimizedImageProps) {
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      priority={priority} // Load immediately for above-the-fold images
      quality={85} // Balance between quality and file size
      placeholder="blur" // Show blur while loading
      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRg..." // Tiny base64 placeholder
      loading={priority ? 'eager' : 'lazy'} // Lazy load by default
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" // Responsive sizes
    />
  );
}
```

### 8.3 Database Query Optimization

```typescript
// src/lib/db-optimization.ts

import { createClient } from '@/lib/supabase/server';

// ═══════════════════════════════════════════════════════════════
// OPTIMIZED QUERY PATTERNS
// ═══════════════════════════════════════════════════════════════

/**
 * ❌ BAD: Fetching all columns and all rows
 */
async function fetchPostsBad(workspaceId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from('posts')
    .select('*') // Fetches everything
    .eq('workspace_id', workspaceId);
  
  return data;
}

/**
 * ✅ GOOD: Selective columns, limited rows, indexed filtering
 */
async function fetchPostsGood(workspaceId: string, page = 1, limit = 20) {
  const supabase = createClient();
  
  const { data, error, count } = await supabase
    .from('posts')
    // Only fetch needed columns
    .select('id, content, status, scheduled_at, platforms, created_at', { count: 'exact' })
    .eq('workspace_id', workspaceId) // Indexed column
    .order('created_at', { ascending: false }) // Indexed ordering
    .range((page - 1) * limit, page * limit - 1); // Pagination
  
  return { posts: data, total: count };
}

/**
 * ✅ OPTIMAL: With foreign key joins and caching
 */
async function fetchPostsOptimal(workspaceId: string, options: {
  page?: number;
  limit?: number;
  status?: string;
}) {
  const { page = 1, limit = 20, status } = options;
  const supabase = createClient();
  
  let query = supabase
    .from('posts')
    .select(`
      id,
      content,
      status,
      scheduled_at,
      platforms,
      created_at,
      created_by:profiles!posts_created_by_fkey(
        id,
        full_name,
        avatar_url
      )
    `, { count: 'exact' })
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);
  
  if (status) {
    query = query.eq('status', status);
  }
  
  const { data, error, count } = await query;
  
  if (error) throw error;
  
  return {
    posts: data,
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// QUERY PERFORMANCE MONITORING
// ═══════════════════════════════════════════════════════════════

export async function withQueryTiming<T>(
  queryName: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const start = performance.now();
  
  try {
    const result = await queryFn();
    const duration = performance.now() - start;
    
    if (duration > 1000) {
      console.warn(`[Query Performance] ${queryName} took ${duration.toFixed(2)}ms`);
    } else {
      console.log(`[Query Performance] ${queryName} took ${duration.toFixed(2)}ms`);
    }
    
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    console.error(`[Query Error] ${queryName} failed after ${duration.toFixed(2)}ms`, error);
    throw error;
  }
}

// Usage:
// const posts = await withQueryTiming('fetchPosts', () => fetchPostsOptimal(workspaceId, options));
```

### 8.4 Performance Monitoring

```typescript
// src/lib/performance-monitoring.ts

// ═══════════════════════════════════════════════════════════════
// WEB VITALS TRACKING
// ═══════════════════════════════════════════════════════════════

export function reportWebVitals(metric: any) {
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[Web Vitals]', metric);
  }
  
  // Send to analytics service
  const body = JSON.stringify(metric);
  const url = '/api/analytics/vitals';
  
  // Use `navigator.sendBeacon()` if available, falling back to `fetch()`
  if (navigator.sendBeacon) {
    navigator.sendBeacon(url, body);
  } else {
    fetch(url, { body, method: 'POST', keepalive: true });
  }
}

// ═══════════════════════════════════════════════════════════════
// PERFORMANCE BUDGET CHECKER
// ═══════════════════════════════════════════════════════════════

const PERFORMANCE_BUDGETS = {
  // Core Web Vitals targets
  LCP: 2500, // Largest Contentful Paint (ms)
  FID: 100,  // First Input Delay (ms)
  CLS: 0.1,  // Cumulative Layout Shift (score)
  
  // Custom metrics
  TTFB: 600, // Time to First Byte (ms)
  FCP: 1800, // First Contentful Paint (ms)
  
  // Bundle size (KB)
  JS_BUNDLE: 200,
  CSS_BUNDLE: 50,
};

export function checkPerformanceBudget(metric: string, value: number): boolean {
  const budget = PERFORMANCE_BUDGETS[metric as keyof typeof PERFORMANCE_BUDGETS];
  
  if (!budget) return true;
  
  const isWithinBudget = value <= budget;
  
  if (!isWithinBudget) {
    console.warn(
      `[Performance Budget] ${metric} exceeded: ${value} > ${budget}`
    );
  }
  
  return isWithinBudget;
}
```

---

## 9. SECURITY & AUTHENTICATION FRAMEWORK

### 9.1 Multi-Layer Security Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                 SECURITY LAYERS & CONTROLS                      │
└─────────────────────────────────────────────────────────────────┘

LAYER 1: NETWORK SECURITY
┌─────────────────────────────────────────────────────────────────┐
│ ✓ HTTPS only (TLS 1.3)                                          │
│ ✓ HSTS (HTTP Strict Transport Security)                        │
│ ✓ CSP (Content Security Policy)                                │
│ ✓ CORS configuration                                            │
│ ✓ Rate limiting per IP/user                                    │
│ ✓ DDoS protection (Vercel)                                     │
└─────────────────────────────────────────────────────────────────┘

LAYER 2: AUTHENTICATION
┌─────────────────────────────────────────────────────────────────┐
│ ✓ Supabase Auth (JWT-based)                                    │
│ ✓ Email + Password with bcrypt                                 │
│ ✓ OAuth 2.0 for social platforms                               │
│ ✓ Multi-factor authentication (MFA) ready                      │
│ ✓ Session management                                            │
│ ✓ Token refresh mechanism                                      │
└─────────────────────────────────────────────────────────────────┘

LAYER 3: AUTHORIZATION
┌─────────────────────────────────────────────────────────────────┐
│ ✓ Role-Based Access Control (RBAC)                             │
│   - Owner: Full control                                        │
│   - Admin: Manage users, posts, accounts                       │
│   - Editor: Create/edit posts                                  │
│   - Viewer: Read-only access                                   │
│                                                                 │
│ ✓ Row Level Security (RLS) at database                         │
│ ✓ Workspace isolation                                           │
│ ✓ API route protection                                          │
└─────────────────────────────────────────────────────────────────┘

LAYER 4: DATA SECURITY
┌─────────────────────────────────────────────────────────────────┐
│ ✓ Encryption at rest (AES-256)                                 │
│ ✓ Encryption in transit (TLS)                                  │
│ ✓ Sensitive data encryption (tokens, passwords)                │
│ ✓ Input validation (Zod schemas)                               │
│ ✓ SQL injection prevention (parameterized queries)             │
│ ✓ XSS prevention (React auto-escaping)                         │
└─────────────────────────────────────────────────────────────────┘

LAYER 5: API SECURITY
┌─────────────────────────────────────────────────────────────────┐
│ ✓ API key authentication for cron jobs                         │
│ ✓ Webhook signature verification                               │
│ ✓ Request signing for external APIs                            │
│ ✓ Rate limiting per endpoint                                   │
│ ✓ Input sanitization                                            │
└─────────────────────────────────────────────────────────────────┘
```

### 9.2 Security Implementation

```typescript
// src/lib/security.ts

import crypto from 'crypto';

// ═══════════════════════════════════════════════════════════════
// TOKEN ENCRYPTION/DECRYPTION
// ═══════════════════════════════════════════════════════════════

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!; // 32-byte key
const ALGORITHM = 'aes-256-gcm';

export function encryptToken(token: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Return: iv:authTag:encryptedData
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decryptToken(encryptedToken: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedToken.split(':');
  
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

// ═══════════════════════════════════════════════════════════════
// WEBHOOK SIGNATURE VERIFICATION
// ═══════════════════════════════════════════════════════════════

export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  // Constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// ═══════════════════════════════════════════════════════════════
// INPUT SANITIZATION
// ═══════════════════════════════════════════════════════════════

export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .trim()
    .slice(0, 10000); // Limit length
}

export function sanitizeHTML(html: string): string {
  // Use a library like DOMPurify on client side
  // On server, strip all HTML tags
  return html.replace(/<[^>]*>/g, '');
}

// ═══════════════════════════════════════════════════════════════
// CSRF TOKEN GENERATION
// ═══════════════════════════════════════════════════════════════

export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function verifyCSRFToken(token: string, expected: string): boolean {
  return crypto.timingSafeEqual(
    Buffer.from(token),
    Buffer.from(expected)
  );
}

// ═══════════════════════════════════════════════════════════════
// SECURE RANDOM STRING GENERATION
// ═══════════════════════════════════════════════════════════════

export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('base64url');
}
```

### 9.3 Security Headers (middleware.ts)

```typescript
// src/middleware.ts

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // ═══════════════════════════════════════════════════════════════
  // SECURITY HEADERS
  // ═══════════════════════════════════════════════════════════════
  
  // Content Security Policy
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Next.js requires unsafe-eval
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://api.supabase.co https://api.openai.com",
      "frame-ancestors 'none'",
    ].join('; ')
  );
  
  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY');
  
  // Prevent MIME sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Strict Transport Security (HTTPS only)
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  );
  
  // Permissions Policy
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  );
  
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
```

---

## 10. DEPLOYMENT & DEVOPS STRATEGY

### 10.1 Vercel Deployment Configuration

```json
// vercel.json

{
  "version": 2,
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  
  "env": {
    "NEXT_PUBLIC_APP_ENV": "production"
  },
  
  "build": {
    "env": {
      "NEXT_PUBLIC_SUPABASE_URL": "@supabase-url",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase-anon-key",
      "OPENAI_API_KEY": "@openai-api-key",
      "ENCRYPTION_KEY": "@encryption-key",
      "CRON_SECRET": "@cron-secret"
    }
  },
  
  "crons": [
    {
      "path": "/api/cron/publish",
      "schedule": "* * * * *"
    },
    {
      "path": "/api/cron/sync-metrics",
      "schedule": "*/15 * * * *"
    }
  ],
  
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "s-maxage=60, stale-while-revalidate"
        }
      ]
    }
  ],
  
  "redirects": [
    {
      "source": "/dashboard",
      "destination": "/x",
      "permanent": true
    }
  ],
  
  "rewrites": [
    {
      "source": "/api/v1/:path*",
      "destination": "/api/:path*"
    }
  ]
}
```

### 10.2 CI/CD Pipeline

```yaml
# .github/workflows/ci.yml

name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint-and-type-check:
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
      
      - name: Run ESLint
        run: npm run lint
      
      - name: Run TypeScript type check
        run: npm run type-check
  
  test:
    runs-on: ubuntu-latest
    needs: lint-and-type-check
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
  
  build:
    runs-on: ubuntu-latest
    needs: test
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build application
        run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
      
      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: build
          path: .next
  
  deploy-preview:
    runs-on: ubuntu-latest
    needs: build
    if: github.event_name == 'pull_request'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Vercel Preview
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          scope: ${{ secrets.VERCEL_ORG_ID }}
  
  deploy-production:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Vercel Production
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
          scope: ${{ secrets.VERCEL_ORG_ID }}
```

### 10.3 Environment Management

```bash
# .env.local (Development)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

OPENAI_API_KEY=sk-your-api-key

NEXT_PUBLIC_APP_URL=http://localhost:3000

# Encryption
ENCRYPTION_KEY=generate-with-openssl-rand-hex-32

# Cron job security
CRON_SECRET=generate-secure-random-string

# OAuth credentials
FACEBOOK_APP_ID=your-app-id
FACEBOOK_APP_SECRET=your-app-secret
INSTAGRAM_CLIENT_ID=your-client-id
INSTAGRAM_CLIENT_SECRET=your-client-secret
TWITTER_CLIENT_ID=your-client-id
TWITTER_CLIENT_SECRET=your-client-secret
LINKEDIN_CLIENT_ID=your-client-id
LINKEDIN_CLIENT_SECRET=your-client-secret
YOUTUBE_CLIENT_ID=your-client-id
YOUTUBE_CLIENT_SECRET=your-client-secret
TIKTOK_CLIENT_KEY=your-client-key
TIKTOK_CLIENT_SECRET=your-client-secret

# Webhook tokens
FACEBOOK_WEBHOOK_VERIFY_TOKEN=xocial_webhook_token_2025
```

---

## 11. DEVELOPMENT WORKFLOW & BEST PRACTICES

### 11.1 Git Workflow Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                  GIT BRANCHING STRATEGY                         │
└─────────────────────────────────────────────────────────────────┘

main (production)
  │
  ├── develop (staging)
  │     │
  │     ├── feature/x-page-improvements
  │     ├── feature/ai-content-generation
  │     ├── fix/authentication-bug
  │     └── refactor/api-routes
  │
  └── hotfix/critical-security-patch

BRANCH NAMING CONVENTION:
├── feature/description  (new features)
├── fix/description      (bug fixes)
├── refactor/description (code improvements)
├── docs/description     (documentation)
└── hotfix/description   (critical production fixes)

COMMIT MESSAGE FORMAT:
<type>(<scope>): <subject>

Types:
- feat: New feature
- fix: Bug fix
- docs: Documentation only
- style: Code style changes (formatting)
- refactor: Code refactoring
- perf: Performance improvements
- test: Adding tests
- chore: Build process or auxiliary tool changes

Examples:
- feat(posts): add bulk delete functionality
- fix(auth): resolve token expiration issue
- refactor(api): simplify error handling
- perf(db): optimize posts query with indexes
```

### 11.2 Code Review Checklist

```markdown
## Code Review Checklist

### Functionality
- [ ] Code fulfills acceptance criteria
- [ ] Edge cases are handled
- [ ] Error handling is comprehensive
- [ ] Input validation is present

### Code Quality
- [ ] Follows established patterns and conventions
- [ ] No code duplication (DRY principle)
- [ ] Functions/components have single responsibility
- [ ] Clear and descriptive naming

### Performance
- [ ] No unnecessary re-renders
- [ ] Queries are optimized (indexed, limited)
- [ ] Images are optimized
- [ ] Lazy loading where appropriate

### Security
- [ ] Input is validated and sanitized
- [ ] Authentication/authorization checked
- [ ] Sensitive data is encrypted
- [ ] No secrets in code

### Testing
- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Manual testing performed

### Documentation
- [ ] Code comments for complex logic
- [ ] README updated if needed
- [ ] API documentation current

### Accessibility
- [ ] Keyboard navigation works
- [ ] Screen reader friendly
- [ ] Color contrast meets WCAG standards
- [ ] ARIA labels where needed
```

### 11.3 Development Commands

```json
// package.json scripts

{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "lint:fix": "next lint --fix",
    "type-check": "tsc --noEmit",
    "format": "prettier --write \"**/*.{ts,tsx,md,json}\"",
    "format:check": "prettier --check \"**/*.{ts,tsx,md,json}\"",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "analyze": "ANALYZE=true next build",
    "db:push": "supabase db push",
    "db:reset": "supabase db reset",
    "db:seed": "node scripts/seed-database.js",
    "prepare": "husky install"
  }
}
```

---

## 12. TESTING & QUALITY ASSURANCE

### 12.1 Testing Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                    TESTING PYRAMID                              │
└─────────────────────────────────────────────────────────────────┘

                    ╱╲
                   ╱  ╲
                  ╱ E2E ╲          5% - End-to-End Tests
                 ╱──────╲         (Playwright, Cypress)
                ╱        ╲
               ╱Integration╲       15% - Integration Tests
              ╱────────────╲      (API routes, DB queries)
             ╱              ╲
            ╱  Unit Tests    ╲    80% - Unit Tests
           ╱──────────────────╲   (Components, functions, hooks)
          ╱____________________╲

TESTING OBJECTIVES:
✓ Catch bugs early in development
✓ Ensure features work as expected
✓ Prevent regressions
✓ Document code behavior
✓ Enable confident refactoring
```

### 12.2 Unit Testing Example

```typescript
// src/lib/__tests__/validation.test.ts

import { describe, it, expect } from '@jest/globals';
import { validateEmail, validatePassword } from '../validation';

describe('validation utilities', () => {
  describe('validateEmail', () => {
    it('should accept valid email addresses', () => {
      expect(validateEmail('user@example.com')).toBe(true);
      expect(validateEmail('test.user+tag@domain.co.uk')).toBe(true);
    });
    
    it('should reject invalid email addresses', () => {
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('user@')).toBe(false);
    });
    
    it('should handle edge cases', () => {
      expect(validateEmail('')).toBe(false);
      expect(validateEmail(null as any)).toBe(false);
      expect(validateEmail(undefined as any)).toBe(false);
    });
  });
  
  describe('validatePassword', () => {
    it('should accept strong passwords', () => {
      expect(validatePassword('StrongP@ss123')).toBe(true);
    });
    
    it('should reject weak passwords', () => {
      expect(validatePassword('weak')).toBe(false);
      expect(validatePassword('12345678')).toBe(false);
      expect(validatePassword('NoNumbers!')).toBe(false);
    });
  });
});
```

---

## 📊 COMPREHENSIVE FEATURE FLOWCHARTS

### Feature Flow: User Authentication

```
┌─────────────────────────────────────────────────────────────────┐
│           USER AUTHENTICATION FLOW (EMAIL/PASSWORD)             │
└─────────────────────────────────────────────────────────────────┘

START: User visits /auth/login
       │
       ▼
   ┌─────────────┐
   │ Login Form  │
   │ Displayed   │
   └──────┬──────┘
          │
          ▼
   User enters credentials
          │
          ▼
   ┌──────────────────┐
   │ Frontend         │
   │ Validation       │
   │ (Zod schema)     │
   └──────┬───────────┘
          │
      Is Valid?
       ╱    ╲
     NO      YES
     ╱        ╲
    ▼          ▼
Show Error   POST /api/auth/login
             │
             ▼
       ┌──────────────────┐
       │ Supabase Auth    │
       │ signInWithPass() │
       └──────┬───────────┘
              │
         Success?
          ╱    ╲
        NO      YES
        ╱        ╲
       ▼          ▼
   Show Error   Create Session
                │
                ▼
           Set Cookie
                │
                ▼
         Store user in
         authStore (Zustand)
                │
                ▼
         Redirect to /x
                │
                ▼
            END
```

### Feature Flow: AI Content Generation

```
┌─────────────────────────────────────────────────────────────────┐
│              AI CONTENT GENERATION FLOW                         │
└─────────────────────────────────────────────────────────────────┘

START: User on /c page
       │
       ▼
   ┌─────────────────┐
   │ 1. User enters  │
   │    prompt       │
   └────────┬────────┘
            │
            ▼
   ┌─────────────────┐
   │ 2. Selects      │
   │    options:     │
   │    - Tone       │
   │    - Length     │
   │    - Platforms  │
   └────────┬────────┘
            │
            ▼
   ┌─────────────────┐
   │ 3. Click        │
   │   "Generate"    │
   └────────┬────────┘
            │
            ▼
   Show loading state
            │
            ▼
   POST /api/ai/generate
   Body: {
     prompt,
     tone,
     length,
     platforms
   }
            │
            ▼
   ┌─────────────────────┐
   │ API Route Handler   │
   │                     │
   │ 4. Validate input   │
   │ 5. Check user quota │
   │ 6. Build OpenAI     │
   │    prompt           │
   └──────────┬──────────┘
              │
              ▼
   ┌───────────────────────┐
   │ OpenAI API Call       │
   │                       │
   │ Model: GPT-4          │
   │ System prompt:        │
   │ "You are a social     │
   │  media expert..."     │
   │                       │
   │ User prompt:          │
   │ {formatted_prompt}    │
   └──────────┬────────────┘
              │
              ▼
         Success?
          ╱    ╲
        NO      YES
        ╱        ╲
       ▼          ▼
   Return      Parse response
   error       │
               ▼
          ┌─────────────────────┐
          │ Generate platform-  │
          │ specific content:   │
          │                     │
          │ Facebook: long-form │
          │ Twitter: 280 chars  │
          │ Instagram: hashtags │
          └──────────┬──────────┘
                     │
                     ▼
          ┌─────────────────────┐
          │ Generate hashtags   │
          │ POST /api/ai/       │
          │      hashtags       │
          └──────────┬──────────┘
                     │
                     ▼
          ┌─────────────────────┐
          │ Store in DB:        │
          │ ai_generations      │
          │ table               │
          └──────────┬──────────┘
                     │
                     ▼
          Return {
            content: {...},
            hashtags: [...],
            metadata: {...}
          }
                     │
                     ▼
          ┌─────────────────────┐
          │ Frontend receives   │
          │ generated content   │
          └──────────┬──────────┘
                     │
                     ▼
          ┌─────────────────────┐
          │ 7. Display in       │
          │    editor with      │
          │    platform         │
          │    previews         │
          └──────────┬──────────┘
                     │
                     ▼
          User can:
          - Edit content
          - Regenerate
          - Save as template
          - Schedule post
                     │
                     ▼
                   END
```

### Feature Flow: Post Publishing

```
┌─────────────────────────────────────────────────────────────────┐
│              AUTOMATED POST PUBLISHING FLOW                     │
└─────────────────────────────────────────────────────────────────┘

TRIGGER: Vercel Cron Job (every minute)
         │
         ▼
   GET /api/cron/publish
   Header: Authorization: Bearer {CRON_SECRET}
         │
         ▼
   ┌──────────────────┐
   │ 1. Verify cron   │
   │    secret        │
   └────────┬─────────┘
            │
       Valid?
        ╱   ╲
      NO     YES
      ╱       ╲
     ▼         ▼
  401      Query DB for
  Error    scheduled posts
           WHERE status = 'scheduled'
           AND scheduled_at <= NOW()
           LIMIT 50
            │
            ▼
       Any posts?
        ╱     ╲
      NO       YES
      ╱         ╲
     ▼           ▼
  Return      For each post:
  success     │
              ▼
         ┌────────────────────┐
         │ 2. Update status   │
         │    to 'publishing' │
         └──────────┬─────────┘
                    │
                    ▼
         ┌────────────────────┐
         │ 3. Get social      │
         │    accounts for    │
         │    selected        │
         │    platforms       │
         └──────────┬─────────┘
                    │
                    ▼
         For each platform:
                    │
      ┌─────────────┼─────────────┐
      │             │             │
      ▼             ▼             ▼
  Facebook     Instagram      Twitter
  Publisher    Publisher      Publisher
      │             │             │
      ▼             ▼             ▼
  ┌─────────────────────────────────┐
  │ Platform Publishing Steps:      │
  │                                 │
  │ A. Get access token (decrypt)   │
  │ B. Prepare content              │
  │ C. Upload media (if any)        │
  │ D. Create post via API          │
  │ E. Get external post ID         │
  └──────────┬──────────────────────┘
             │
        Success?
         ╱   ╲
       NO     YES
       ╱       ╲
      ▼         ▼
  Store      Store external_id
  error      in post record
  message    │
             ▼
         All platforms
         completed?
             │
             ▼
         ┌────────────────────┐
         │ 4. Update post     │
         │    status:         │
         │    'published'     │
         │                    │
         │ 5. Set             │
         │    published_at    │
         └──────────┬─────────┘
                    │
                    ▼
         ┌────────────────────┐
         │ 6. Create initial  │
         │    analytics       │
         │    records         │
         └──────────┬─────────┘
                    │
                    ▼
         ┌────────────────────┐
         │ 7. Notify user     │
         │    (optional)      │
         └──────────┬─────────┘
                    │
                    ▼
                  END

ROLLBACK ON ERROR:
- Revert status to 'scheduled'
- Store error message
- Retry on next cron run
```

---

## 🎯 FINAL RECOMMENDATIONS

### Development Priority Levels

```
┌─────────────────────────────────────────────────────────────────┐
│              FEATURE IMPLEMENTATION PRIORITY                     │
└─────────────────────────────────────────────────────────────────┘

🔴 CRITICAL (P0) - Week 1-2
├── Authentication & Authorization
├── Database schema with RLS
├── Basic UI component library
└── Core API endpoints

🟠 HIGH (P1) - Week 3-5
├── Multi-platform OAuth
├── Content calendar
├── AI content generation
├── Post scheduling
└── Real-time publishing

🟡 MEDIUM (P2) - Week 6-8
├── Analytics dashboard
├── Team collaboration
├── Content templates
├── Media management
└── Strategy recommendations

🟢 LOW (P3) - Week 9-12
├── Advanced analytics
├── A/B testing
├── Automation rules
├── Custom reports
└── Influencer marketplace

⚪ NICE-TO-HAVE (Future)
├── Mobile app
├── Browser extension
├── CRM integration
└── White-label solution
```

### Success Metrics

```
KEY PERFORMANCE INDICATORS (KPIs):

Technical Performance:
✓ Page load time: < 2 seconds
✓ API response time: < 500ms
✓ Database query time: < 100ms
✓ Error rate: < 0.1%
✓ Uptime: > 99.9%

User Experience:
✓ Time to first post: < 5 minutes
✓ Post creation time: < 2 minutes
✓ Platform connection time: < 1 minute
✓ User satisfaction: > 4.5/5

Business Metrics:
✓ User retention (30-day): > 60%
✓ Daily active users
✓ Posts published per user
✓ Revenue per user (if applicable)
```

---

## 📝 CONCLUSION & NEXT STEPS

This comprehensive SRS document provides:

1. **Complete architectural blueprint** for XOCIAL platform
2. **Step-by-step implementation guides** for each component
3. **Production-ready patterns** for Next.js 15.5+, Vercel, and Supabase
4. **Enterprise-grade security** and error handling
5. **Performance optimization** strategies
6. **Scalable database design** with RLS
7. **Comprehensive testing** approach
8. **DevOps and deployment** workflows

### To Start Development:

1. **Review this SRS** with your team
2. **Set up development environment** following ENV_SETUP.md
3. **Initialize database** with provided schema
4. **Implement features** following the priority levels
5. **Use provided code patterns** as templates
6. **Follow testing strategy** for quality assurance
7. **Deploy to Vercel** using CI/CD pipeline
8. **Monitor and iterate** based on metrics

**This document serves as your single source of truth for building XOCIAL systematically, ensuring consistency, security, and performance at every step.**

---