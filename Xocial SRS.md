# XOCIAL: Enterprise-Grade SRS for Cursor-Native Development
## AI-Powered Social Media Management Platform - Technical Blueprint

---

## EXECUTIVE FRAMEWORK

This document provides architectural specifications optimized for Cursor IDE's latest Composer, multi-file editing, and native AI capabilities, leveraging modern stack technologies for enterprise scalability.

---

## 1. FOUNDATIONAL ARCHITECTURE & DEVELOPMENT STRATEGY

### 1.1 Development Paradigm
- **Primary IDE**: Cursor with Composer for multi-file orchestration
- **Runtime Environment**: Bun (superseding Node.js for 40-80% performance gains)
- **Package Management**: Bun package manager for lock-file integrity
- **Development Server**: Bun runtime with hot-reload capabilities
- **Code Generation**: Cursor's Composer for context-aware file generation

### 1.2 Repository Structure for Cursor Optimization
```
xocial/
├── .cursor/
│   ├── rules.md (AI guidelines for consistent generation)
│   ├── architecture.md (Reference for Composer)
│   └── component-patterns.md (Design system specifications)
├── apps/
│   ├── web/ (Next.js frontend)
│   ├── api/ (Bun-native backend)
│   └── dashboard/ (Vercel deployment)
├── packages/
│   ├── ui/ (Shared component library)
│   ├── types/ (Shared TypeScript definitions)
│   ├── auth/ (Authentication logic)
│   ├── db/ (Supabase client & migrations)
│   └── utils/ (Shared utilities)
├── services/
│   ├── ai/ (OpenAI integration)
│   ├── social-apis/ (Third-party API handlers)
│   ├── analytics/ (Data processing)
│   └── webhooks/ (Event listeners)
├── infrastructure/
│   ├── docker/ (Containerization configs)
│   ├── supabase/ (Database migrations & seed data)
│   ├── vercel/ (Deployment configurations)
│   └── bun/ (Runtime optimization configs)
└── docs/
    ├── architecture/
    ├── api-contracts/
    └── cursor-guides/
```

---

## 2. UI/UX DESIGN SYSTEM FOR ENTERPRISE CONSISTENCY

### 2.1 Design System Architecture

**Layer 1: Design Tokens (Single Source of Truth)**
- Create `packages/design-tokens/tokens.json` containing:
  - Color palette (primary, secondary, semantic: success/error/warning/info)
  - Typography scale (font families, sizes, weights, line heights)
  - Spacing scale (4px base unit: 4, 8, 12, 16, 24, 32, 48, 64)
  - Border radius system (2px, 4px, 8px, 12px, 16px)
  - Shadow elevation system (1-5 levels for depth hierarchy)
  - Animation curves (easing functions for consistency)
  - Z-index strategy (layering hierarchy)

**Layer 2: Component Library Structure**
```
packages/ui/
├── primitives/ (Base components)
│   ├── Button/ (variants: primary, secondary, ghost, danger)
│   ├── Input/ (text, email, password, number, date)
│   ├── Select/ (dropdown with search)
│   ├── Checkbox/ & Radio/
│   ├── Modal/ (dialog wrapper)
│   ├── Popover/ & Tooltip/
│   ├── Badge/ (status indicators)
│   ├── Avatar/ (user profile pictures)
│   ├── Skeleton/ (loading states)
│   └── Spinner/ (async operations)
├── layouts/ (Structural components)
│   ├── Container/ (max-width wrapper)
│   ├── Grid/ (responsive 12-col system)
│   ├── Flex/ (flexbox abstraction)
│   ├── Stack/ (vertical/horizontal spacing)
│   └── Sidebar/ (navigation layout)
├── cards/ (Content containers)
│   ├── Card/ (basic container)
│   ├── PostCard/ (social media post display)
│   ├── MetricCard/ (analytics display)
│   ├── EngagementCard/ (engagement metrics)
│   └── ScheduleCard/ (scheduled posts)
├── data-display/ (Information visualization)
│   ├── Table/ (sortable, filterable)
│   ├── DataGrid/ (virtualized large lists)
│   ├── List/ (basic list rendering)
│   ├── Timeline/ (chronological display)
│   └── StatusBadge/ (post status indicators)
├── forms/ (Complex form components)
│   ├── FormField/ (wrapper with validation)
│   ├── FormSection/ (grouped fields)
│   ├── MultiSelect/ (tag selection)
│   ├── DateRange/ (calendar picker)
│   └── RichTextEditor/ (content creation)
└── hooks/ (Reusable logic)
    ├── useForm/ (form state management)
    ├── useAsync/ (API call handling)
    ├── useDebounce/ (input throttling)
    ├── useLocalStorage/ (client-side persistence)
    └── useInfiniteScroll/ (pagination)
```

### 2.2 Design Token Implementation Strategy

**Tailwind CSS Customization with Bun**
- Create `tailwind.config.ts` extending Tailwind with custom tokens
- Use Bun's native TypeScript support to generate Tailwind config from JSON tokens
- Implement CSS custom properties (variables) for dynamic theming
- Create dark/light mode variants using Tailwind's `@apply` directive

**Font System**
- Primary Font: Inter (headings & UI) - load via next/font optimization
- Secondary Font: Fira Code (code blocks) - system font fallback for performance
- Font Scale: 12px (xs) → 14px (sm) → 16px (base) → 18px (lg) → 24px (xl) → 32px (2xl) → 48px (3xl)
- Font Weights: 400 (regular), 500 (medium), 600 (semibold), 700 (bold)

### 2.3 Component Specification by Page

#### **X Page: Multi-Account Management**

**Layout Tree:**
```
X_Page
├── PageHeader
│   ├── Title ("Manage Accounts")
│   ├── SubtitleDescription
│   └── Action_Button_AddAccount (primary, xl size)
├── AccountsSection
│   ├── TabSelector (Facebook | Instagram | YouTube | LinkedIn | Twitter)
│   ├── AccountGrid
│   │   └── AccountCard[] (repeating, 3-col responsive grid)
│   │       ├── Header
│   │       │   ├── Avatar (64x64px)
│   │       │   ├── AccountName & Handle
│   │       │   └── StatusBadge (connected/disconnected)
│   │       ├── MetricsRow
│   │       │   ├── Followers (IconText)
│   │       │   ├── EngagementRate (IconText)
│   │       │   └── TotalPosts (IconText)
│   │       ├── ActionButtons
│   │       │   ├── ViewProfile (ghost)
│   │       │   ├── Disconnect (danger)
│   │       │   └── Settings (secondary)
│   │       └── Divider
│   └── EmptyState (when no accounts)
└── PostsSection
    ├── SectionHeader ("Recent Posts")
    ├── FilterRow
    │   ├── PlatformFilter (multi-select)
    │   ├── DateRange (calendar)
    │   └── SearchInput (debounced)
    ├── PostsGrid (masonry or uniform 4-col)
    │   └── PostCard[] (scrollable container)
    │       ├── PlatformBadge (top-left)
    │       ├── PostImage/Video (responsive)
    │       ├── PostCaption (truncated, expandable)
    │       ├── EngagementMetrics
    │       │   ├── Likes (icon + count)
    │       │   ├── Comments (icon + count)
    │       │   ├── Shares (icon + count)
    │       │   └── Views (icon + count)
    │       ├── PublishDate & Time
    │       ├── HoverOverlay
    │       │   ├── ViewComments (opens mini-modal)
    │       │   ├── ReplyDirect (opens reply form)
    │       │   ├── ViewAnalytics (opens detail view)
    │       │   └── MoreActions (dropdown menu)
    │       └── LoadingState (skeleton, on-fetch)
    └── InfiniteScroll_Trigger (for pagination)

CommentsMiniModal:
  ├── Header
  │   ├── Title ("Comments")
  │   ├── CloseButton
  │   └── CommentCount_Badge
  ├── CommentsList (scrollable, max-height: 400px)
  │   └── Comment[] (threaded if replies)
  │       ├── CommentAuthor (avatar + name)
  │       ├── CommentText
  │       ├── CommentTime
  │       ├── LikeButton (if platform supports)
  │       └── ReplyButton (if platform supports)
  ├── DividerLine
  └── ReplyInput
      ├── RichTextArea (minimal, char limit)
      ├── CharCounter (remaining chars)
      └── SendButton (primary, disabled if empty)
```

**Component Specifications:**
- **AccountCard**: Animated on hover (scale: 1.02, shadow elevation: 2→4)
- **PostCard**: Lazy-loaded images, skeleton loading state during fetch
- **Metrics Display**: Icons from lucide-react for consistency
- **Modal**: Smooth fade-in, backdrop blur (glassmorphism effect)
- **Grid Responsiveness**: 4-col (desktop) → 2-col (tablet) → 1-col (mobile)

#### **O Page: Content Calendar**

**Layout Tree:**
```
O_Page
├── PageHeader
│   ├── Title ("Content Calendar")
│   ├── MonthNavigation
│   │   ├── PrevMonth_Button
│   │   ├── MonthYear_Display (formatted: "October 2025")
│   │   ├── NextMonth_Button
│   │   └── JumpToDate_Picker
│   └── ViewToggle (Month | Week | Day | Agenda)
├── CalendarSection
│   ├── DayLabels (Sun, Mon, Tue...)
│   ├── CalendarGrid
│   │   └── DayCell[] (42 cells for 6-week view)
│   │       ├── DayNumber
│   │       ├── PostCountBadge (red circle, count)
│   │       ├── PostPreviewThumbnails[] (up to 3 images, stacked)
│   │       ├── OnClick_Behavior: Opens DayPostsPanel
│   │       └── DragArea (for post rescheduling)
│   └── LegendSection
│       ├── DraftIndicator (gray dot)
│       ├── ScheduledIndicator (blue dot)
│       ├── PublishedIndicator (green dot)
│       └── FailedIndicator (red dot)
└── DayPostsPanel (right sidebar, sticky)
    ├── PanelHeader
    │   ├── SelectedDate_Display
    │   ├── PostCount_Badge
    │   └── CloseButton
    ├── PostsList (scrollable)
    │   └── ScheduledPost[] (expandable)
    │       ├── PostPreviewImage (small)
    │       ├── PostCaption (2-line truncate)
    │       ├── ScheduleTime (HH:MM format)
    │       ├── Platforms (platform badges)
    │       ├── StatusBadge (draft/scheduled/published/failed)
    │       ├── ExpandButton (shows full details)
    │       ├── EditButton (secondary)
    │       ├── DeleteButton (danger, with confirmation)
    │       └── RescheduleButton (opens date picker)
    ├── PlatformFilter (checkboxes)
    │   ├── Facebook ☑
    │   ├── Instagram ☑
    │   ├── YouTube ☑
    │   ├── LinkedIn ☑
    │   └── Twitter ☑
    └── AddNewPost_Button (primary, full-width)

ExpandedPostDetail:
  ├── FullPostCaption
  ├── AllAttachedImages/Videos (carousel)
  ├── Hashtags (as tag badges)
  ├── SelectedPlatforms (full list)
  ├── ScheduledTime (editable)
  ├── CreatedDate & Author
  ├── ActionButtons
  │   ├── Edit (secondary)
  │   ├── Reschedule (secondary)
  │   ├── Publish Now (primary)
  │   └── Delete (danger)
  └── PlatformToggle (enable/disable per-platform publishing)

RescheduleModal:
  ├── Header ("Reschedule Post")
  ├── CalendarPicker (DateRange)
  ├── TimePicker (24-hour format)
  ├── AffectedPlatforms (info alert if some platforms deselected)
  ├── ConfirmButton (primary)
  └── CancelButton (ghost)
```

**Component Specifications:**
- **CalendarGrid**: CSS Grid 7 columns, fixed day-cell heights
- **PostPreviewThumbnails**: Max 3 shown, 4th+ indicated by "+2 more" badge
- **DayCell**: Cursor pointer on hover, background color change (lightblue)
- **PostsList**: Virtual scrolling (windowing) if >50 posts on a single day
- **DragArea**: Drag-to-reschedule with visual feedback (drag ghost, timeline guide)
- **StatusBadges**: Color-coded (draft: gray, scheduled: blue, published: green, failed: red)

#### **C Page: AI Content Creation**

**Layout Tree:**
```
C_Page
├── PageHeader
│   ├── Title ("AI Content Assistant")
│   ├── HelpText ("Describe your idea, let AI help you create")
│   └── TemplateLibrary_Button (ghost)
├── TwoColumnLayout
│   ├── LeftColumn (60% width, sticky sidebar)
│   │   ├── InputSection
│   │   │   ├── SectionTitle ("Content Brief")
│   │   │   ├── BriefInput (TextArea)
│   │   │   │   ├── Placeholder ("e.g., 'Summer product launch for water bottles'")
│   │   │   │   ├── CharCounter (max 500 chars)
│   │   │   │   └── OnChange: Debounced AI preview
│   │   │   ├── Divider
│   │   │   ├── ConfigSection
│   │   │   │   ├── TargetPlatforms (MultiSelect Dropdown)
│   │   │   │   │   ├── Facebook ☑
│   │   │   │   │   ├── Instagram ☑
│   │   │   │   │   ├── YouTube ☑
│   │   │   │   │   ├── LinkedIn ☑
│   │   │   │   │   └── Twitter ☑
│   │   │   │   ├── ContentType (Radio buttons)
│   │   │   │   │   ├── Promotional
│   │   │   │   │   ├── Educational
│   │   │   │   │   ├── Entertaining
│   │   │   │   │   ├── Inspirational
│   │   │   │   │   └── Community
│   │   │   │   ├── ToneOfVoice (Select dropdown)
│   │   │   │   │   ├── Professional
│   │   │   │   │   ├── Casual
│   │   │   │   │   ├── Humorous
│   │   │   │   │   ├── Motivational
│   │   │   │   │   └── Friendly
│   │   │   │   ├── TargetAudience (Text input, tags)
│   │   │   │   ├── KeywordsToInclude (MultiSelect tag input)
│   │   │   │   └── BudgetCaps (if for ads)
│   │   │   ├── Divider
│   │   │   ├── ActionButtons
│   │   │   │   ├── GenerateContent (primary, large)
│   │   │   │   └── ClearAll (ghost)
│   │   │   └── LoadingState (spinner + "AI is crafting your content...")
│   │   └── HistorySection (scrollable)
│   │       ├── SectionTitle ("Generation History")
│   │       └── HistoryItem[] (clickable, restores config)
│   │           ├── Timestamp
│   │           ├── BriefPreview
│   │           └── PlatformsUsed (badges)
│   │
│   └── RightColumn (40% width, scrollable)
│       ├── PreviewSection
│       │   ├── SectionTitle ("AI-Generated Content")
│       │   ├── PlatformTabs (Instagram | Facebook | LinkedIn | Twitter | YouTube)
│       │   ├── TabContent
│       │   │   ├── Content
│       │   │   │   ├── GeneratedCaption (editable TextArea)
│       │   │   │   ├── Hashtags (editable tag input, auto-wrapped)
│       │   │   │   ├── VideoDescription (if YouTube)
│       │   │   │   └── Emoji_Suggestions (clickable chips)
│       │   │   ├── CharCounter (per-platform limits)
│       │   │   ├── PreviewBox (simulated platform appearance)
│       │   │   │   ├── PlatformHeader (logo, username)
│       │   │   │   ├── PreviewContent (rendered text)
│       │   │   │   ├── PreviewEngagement (mock likes/comments)
│       │   │   │   └── PlatformFooter
│       │   │   └── Actions
│       │   │       ├── RegenerateContent (secondary)
│       │   │       ├── Copy (ghost, with tooltip "Copied!")
│       │   │       ├── SaveAsDraft (secondary)
│       │   │       └── SchedulePost (primary)
│       │   └── EmptyState (before generation)
│       └── RefineSection
│           ├── SectionTitle ("Refine & Optimize")
│           ├── SuggestionChips[] (clickable)
│           │   ├── "Add emoji"
│           │   ├── "Add urgency"
│           │   ├── "Add call-to-action"
│           │   ├── "More casual"
│           │   ├── "More formal"
│           │   └── "Optimize for engagement"
│           └── ApplySuggestion_AutoUpdate

SchedulePostModal (from preview):
  ├── Header ("Schedule Post")
  ├── Platforms (display selected)
  ├── ScheduleDate (DatePicker)
  ├── ScheduleTime (TimePicker)
  ├── Caption (textarea, last generated)
  ├── Preview (per-platform)
  ├── ConfirmButton (primary)
  └── CancelButton (ghost)
```

**Component Specifications:**
- **TwoColumnLayout**: Responsive - stacks at <1024px viewport
- **InputSection**: Sticky at top with "Generate" button always visible
- **TextArea Components**: Auto-expand on content, max 4 rows then scrollable
- **CharCounter**: Color changes to orange at 80%, red at 100%
- **Platform Tabs**: Smooth transition, preserves scroll position
- **PreviewBox**: Simulates actual platform UI (search for design specifications)
- **HistorySection**: Infinite scroll if >20 items, with lazy loading
- **SuggestionChips**: Animated bounce on hover, background color on active

#### **A Page: Analytics & Insights**

**Layout Tree:**
```
A_Page
├── PageHeader
│   ├── Title ("Analytics & Insights")
│   ├── DateRange_Picker (preset: Last 7 days | 30 days | 90 days | Custom)
│   ├── PlatformFilter (MultiSelect)
│   └── ExportReport_Button (ghost)
├── KPIDashboard (Cards grid, 4-col responsive)
│   ├── MetricCard_Impressions
│   │   ├── MetricTitle ("Total Impressions")
│   │   ├── MetricValue (large, bold number)
│   │   ├── MetricChange (% change, up/down arrow, green/red)
│   │   ├── MetricSparkline (tiny line chart)
│   │   └── OnClick_Behavior: Navigate to detailed impressions view
│   ├── MetricCard_Engagement
│   ├── MetricCard_Followers
│   └── MetricCard_EngagementRate
├── Divider
├── ChartsSection (responsive grid, 2x2 layout)
│   ├── Chart_Impressions_TimeSeries
│   │   ├── ChartTitle ("Impressions Over Time")
│   │   ├── LineChart (recharts)
│   │   │   ├── XAxis (dates, formatted)
│   │   │   ├── YAxis (count)
│   │   │   ├── Tooltip (custom, shows date + value)
│   │   │   ├── Legend (platform colors)
│   │   │   └── Responsive container
│   │   └── ChartControls (zoom, pan)
│   ├── Chart_Engagement_Distribution
│   │   ├── ChartTitle ("Engagement Breakdown")
│   │   ├── PieChart (recharts, donut style)
│   │   │   ├── Segments (Likes | Comments | Shares | Saves)
│   │   │   ├── Tooltip (count + %)
│   │   │   ├── Legend (clickable, toggle segments)
│   │   │   └── CenterLabel (total engagement)
│   │   └── OnSegmentClick: Drill down to details
│   ├── Chart_TopPosts_Performance
│   │   ├── ChartTitle ("Top Performing Posts")
│   │   ├── HorizontalBarChart (recharts)
│   │   │   ├── YAxis (post titles/dates)
│   │   │   ├── XAxis (engagement count)
│   │   │   ├── Tooltip (full post preview)
│   │   │   └── Segments (colored by metric)
│   │   └── OnBarClick: Navigate to post detail
│   └── Chart_Platform_Comparison
│       ├── ChartTitle ("Platform Performance")
│       ├── GroupedBarChart (recharts)
│       │   ├── XAxis (platforms)
│       │   ├── YAxis (metric value)
│       │   ├── GroupedBars (Impressions | Engagement | Followers)
│       │   └── Tooltip (compound info)
│       └── OnLegendClick: Toggle metric visibility
├── Divider
├── TopicsPerformance (Tabular section)
│   ├── SectionTitle ("Performance by Topic")
│   ├── TableHeader
│   │   ├── Topic (sortable)
│   │   ├── Posts (sortable)
│   │   ├── TotalImpressions (sortable)
│   │   ├── AvgEngagement (sortable)
│   │   ├── EngagementRate (sortable)
│   │   └── TrendIndicator (sortable)
│   └── TableRows[] (virtualized if >100 rows)
│       ├── TopicName (clickable → detailed analysis)
│       ├── PostCount
│       ├── ImpressionSum
│       ├── EngagementAverage
│       ├── EngagementRatePercent (bar indicator)
│       └── TrendArrow (up/down/neutral)
└── CustomReportSection
    ├── SectionTitle ("Generate Custom Report")
    ├── ReportTemplate (Select)
    │   ├── Executive Summary
    │   ├── Detailed Analytics
    │   ├── Competitor Comparison
    │   └── Custom Selection
    ├── ReportFormat (Radio)
    │   ├── PDF (primary)
    │   └── Excel
    ├── DeliveryMethod (Radio)
    │   ├── Download Now
    │   └── Email Report
    ├── GenerateButton (primary)
    └── LastReportGenerated (timestamp)

DetailedAnalysisModal (from chart drill-down):
  ├── Header (metric name + date range)
  ├── DetailedChart (larger, more interactive)
  ├── StatisticsPanel
  │   ├── Peak Value (date)
  │   ├── Lowest Value (date)
  │   ├── Average
  │   ├── 7-Day Trend
  │   └── 30-Day Trend
  ├── DataTable (day-by-day breakdown, exportable)
  ├── Insights_AI (generated recommendations)
  └── CloseButton
```

**Component Specifications:**
- **MetricCard**: Bordered, with subtle background color, hover shadow elevation
- **Charts**: All using recharts for consistency, responsive containers
- **LineChart**: Smooth curves, tooltip follow mouse, legend toggleable
- **PieChart**: Donut style with center label, legend clickable to toggle
- **BarChart**: Rounded corners, gradient fills (platform-specific colors)
- **Table**: Sticky headers, alternating row backgrounds, hover highlight
- **Virtualization**: DataTable with >50 rows uses windowing library
- **Color Coding**: Each platform gets unique color (Facebook: blue, Instagram: gradient, YouTube: red, LinkedIn: blue, Twitter: light-blue)

#### **L Page: Growth Strategy & Leverage**

**Layout Tree:**
```
L_Page
├── PageHeader
│   ├── Title ("Growth Strategy")
│   ├── SubtitleDescription ("AI-Powered recommendations for your content pipeline")
│   └── RefreshStrategy_Button (ghost)
├── StrategyOverviewSection
│   ├── WeeklyFocusTopic
│   │   ├── SectionTitle ("This Week's Focus")
│   │   ├── FocusCard (highlighted, gradient background)
│   │   │   ├── FocusTitle (large heading)
│   │   │   ├── FocusDescription
│   │   │   ├── RecommendedContentTypes[] (badges)
│   │   │   ├── PlatformRecommendations (small cards)
│   │   │   │   ├── Platform1 (Instagram, 80% recommended)
│   │   │   │   ├── Platform2 (TikTok/YouTube, 70% recommended)
│   │   │   │   └── Platform3 (LinkedIn, 60% recommended)
│   │   │   ├── ContentCountRecommendation ("Post 3-5 times this week")
│   │   │   ├── BestTimeToPost (hours, based on audience analysis)
│   │   │   └── LearnMore_Link (collapsible explanation)
│   │   └── CopyStrategy_Button (secondary)
│   └── NextWeekPreview
│       ├── SectionTitle ("Upcoming Focus Areas")
│       └── PreviewCards[] (3 cards, horizontal scroll)
│           ├── DateRange
│           ├── TopicTitle
│           ├── Platforms (badges)
│           └── ContentCount (recommended posts)
├── Divider
├── StrategyPipelineSection
│   ├── SectionTitle ("Content Pipeline")
│   ├── PipelineVisual (timeline/flowchart)
│   │   └── Week[] (scrollable horizontal)
│   │       ├── WeekNumber & Dates
│   │       ├── FocusTopic
│   │       ├── RecommendedPosts[] (Drag-and-drop area)
│   │       │   ├── ContentType_Badge
│   │       │   ├── ContentDescription (truncated)
│   │       │   ├── PlatformMatch (icon indicator)
│   │       │   ├── EstimatedEngagement (%)
│   │       │   └── DragHandle
│   │       └── AddContent_Button (ghost)
│   └── LegendSection
│       ├── HighEngagementChance (green indicator)
│       ├── MediumEngagementChance (yellow indicator)
│       └── ContentGap_Warning (red indicator)
├── Divider
├── StrategyOptionsSection (Expandable cards)
│   ├── StrategyOption_1
│   │   ├── Header
│   │   │   ├── StrategyIcon (product awareness icon)
│   │   │   ├── StrategyTitle ("Product Awareness Campaign")
│   │   │   └── ImplementButton (primary)
│   │   ├── CollapsedDescription (brief)
│   │   └── ExpandedContent
│   │       ├── DetailedDescription
│   │       ├── Timeline (6 weeks)
│   │       ├── ExpectedResults
│   │       │   ├── ImpressionsGain ("Expected +40%")
│   │       │   ├── EngagementGain ("Expected +25%")
│   │       │   ├── FollowersGain ("Expected +15%")
│   │       │   └── ConversionRate ("Expected +8%")
│   │       ├── ContentPipeline (5-6 weeks of suggested posts)
│   │       │   └── WeeklyPost[] (expandable)
│   │       │       ├── WeekNumber
│   │       │       ├── PostIdea
│   │       │       ├── ContentType
│   │       │       ├── Platforms
│   │       │       ├── HashtagSuggestions
│   │       │       └── GenerateContent_Link (links to C page)
│   │       ├── ResourcesNeeded (icons + list)
│   │       │   ├── Graphics (design files)
│   │       │   ├── Video (duration)
│   │       │   └── Budget (ad spend)
│   │       ├── SuccessMetrics
│   │       │   ├── PrimaryMetric
│   │       │   ├── SecondaryMetrics[] (list)
│   │       │   └── TrackingDashboard_Link
│   │       └── ImplementNow_Button (primary, full-width)
│   ├── StrategyOption_2 ("Influencer Partnership Program")
│   ├── StrategyOption_3 ("Seasonal & Trend-Based Strategy")
│   └── StrategyOption_4 ("Community Engagement Boost")
└── AIInsightsPanel (sticky right sidebar on desktop)
    ├── PanelTitle ("AI Insights")
    ├── TrendingTopics (this month)
    │   └── Topic[] (clickable chips, sorted by relevance)
    ├── AudienceInsights
    │   ├── PeakEngagementTime (day + hour)
    │   ├── TopAudience_Geography
    │   ├── AgeGroup_Distribution (pie chart mini)
    │   └── InterestCategories[] (top 5)
    ├── CompetitorHighlights
    │   ├── TopCompetitor (name + metrics)
    │   ├── CompetitorTrend (they're gaining 12% monthly)
    │   └── OpportunitiesVsCompetitor (list)
    └── ImplementStrategy_QuickLink (button)

---

## 3. AUTHENTICATION & SECURITY ARCHITECTURE

### 3.1 Authentication Flow with Supabase

**Tier 1: Initial Authentication (User Registration/Login)**

```
Authentication Flow Diagram:

CLIENT (React/Next.js)
    ↓
[User enters credentials or clicks "Sign in with Google/Facebook"]
    ↓
Supabase Auth Service (client SDK)
    ↓ (encrypted HTTPS)
Supabase Backend
    ├─→ [Verify credentials against users table]
    ├─→ [Generate JWT token (expires 1 hour)]
    ├─→ [Generate Refresh Token (expires 30 days)]
    └─→ Send tokens to client
    ↓
Client stores tokens:
    ├─→ Access Token: sessionStorage (cleared on close) + memory variable
    ├─→ Refresh Token: In-memory only (NEVER localStorage)
    └─→ User metadata: React Context/Zustand state
    ↓
[User authenticated, can access dashboard]
```

**Implementation Specifications:**

- **Registration Flow:**
  - User form with email, password (min 12 chars, mixed case, numbers, symbols)
  - Email verification via Supabase (6-digit code sent to email, 10-min expiry)
  - Password hashing: Supabase uses bcrypt (salt rounds: 10)
  - Upon verification: Auto-create user profile row in Supabase database

- **Login Flow:**
  - User submits email + password
  - Supabase performs bcrypt comparison (constant-time to prevent timing attacks)
  - JWT generation: HS256 algorithm, includes user_id and role claims
  - Refresh token generation: Stored in Supabase with rotation tracking

- **OAuth2 Social Sign-In:**
  - Supported providers: Google, Facebook, GitHub, LinkedIn
  - Redirect to provider → user consents → provider returns auth code
  - Supabase exchanges code for access token with provider
  - Supabase creates/links user record in database
  - Return JWT to client application

- **Token Management:**
  - Access Token: Stored in React state + sessionStorage, included in all API headers as `Authorization: Bearer {token}`
  - Refresh Token: Bun server-side only (HttpOnly cookie if SSR, otherwise React state)
  - Token refresh: Automatic on 401 response; client calls `/api/auth/refresh` endpoint
  - Logout: Clear tokens, revoke refresh token in Supabase, clear React state

### 3.2 Role-Based Access Control (RBAC)

**User Roles Hierarchy:**

```
Database Schema (users table):

user_id: UUID (primary key)
email: string (unique)
role: enum ['admin', 'manager', 'content_creator', 'viewer']
permissions: JSONB {
  'x_page': ['view', 'create', 'edit', 'delete'],
  'o_page': ['view', 'create', 'edit', 'delete', 'publish'],
  'c_page': ['view', 'create', 'edit'],
  'a_page': ['view', 'view_advanced'],
  'l_page': ['view'],
  'i_page': ['view'] (always locked, coming soon)
}
created_at: timestamp
updated_at: timestamp
verification_status: enum ['pending', 'verified', 'blocked']
```

**Permission Matrix:**

| Role | X (Manage) | O (Calendar) | C (Create) | A (Analyze) | L (Strategy) | I (Influence) |
|------|-----------|-------------|-----------|------------|-------------|--------------|
| Admin | Full | Full | Full | Full | Full | View |
| Manager | Full | Full | Full | Full | Full | View |
| Content Creator | View Only | Full | Full | View Basic | View | View |
| Viewer | View Only | View Only | View Only | View | View | View |

**Implementation in Cursor/Next.js:**
- Create `packages/auth/rbac.ts` with permission checking utilities
- Use middleware (Next.js `_middleware.ts`) to enforce RBAC on protected routes
- Component-level permission checks using custom hooks (`usePermission`, `useCanAccess`)
- Toast notification if user attempts restricted action

### 3.3 Data Encryption & Storage Security

**End-to-End Encryption Strategy:**

1. **Sensitive Fields (AES-256-GCM):**
   - OAuth access tokens (Facebook, Instagram, YouTube, LinkedIn, Twitter)
   - User passwords (hashed with bcrypt, salted)
   - API keys and secrets
   - User bio/personal information

2. **Supabase RLS (Row-Level Security):**
   ```
   All tables must have RLS policies:
   
   posts table:
   - SELECT: users can only see their own posts OR posts from teams they're member of
   - INSERT: only team members with 'create' permission
   - UPDATE: only post creator or team admins
   - DELETE: only post creator or team admins
   
   social_accounts table:
   - SELECT: user can only see accounts they connected
   - INSERT: user can only create accounts for themselves
   - UPDATE: only account owner
   - DELETE: only account owner
   ```

3. **Client-Side Data Handling:**
   - Avoid storing sensitive data in React state/localStorage
   - Use secure headers: `Strict-Transport-Security`, `Content-Security-Policy`, `X-Frame-Options`
   - Implement CSRF protection via tokens for state-changing operations
   - Sanitize all user inputs before rendering (XSS prevention)

4. **API Secrets Management:**
   - Store in Bun environment variables (`.env.local`, never committed)
   - Rotate secrets every 90 days
   - Use Vercel's environment variable management for production
   - Implement API key rate limiting per user/account

### 3.4 Multi-Factor Authentication (Future Enhancement)

**MFA Flow (Optional for Phase 2):**
- After password verification, prompt user for TOTP code
- Supabase sends SMS or email with OTP (6 digits, 5-min expiry)
- User enters code, Supabase verifies
- Generate JWT only after MFA verification

---

## 4. DATABASE ARCHITECTURE WITH SUPABASE

### 4.1 Database Schema Design

**Core Tables Structure:**

```
USERS TABLE
├── user_id: UUID (primary key)
├── email: string (unique, indexed)
├── password_hash: string (bcrypt, never returned in queries)
├── username: string (unique)
├── avatar_url: string (URL to CDN image)
├── role: enum (admin, manager, content_creator, viewer)
├── permissions: JSONB (role-based permissions)
├── email_verified: boolean
├── created_at: timestamp (auto)
├── updated_at: timestamp (auto)
└── deleted_at: timestamp (soft delete support)

SOCIAL_ACCOUNTS TABLE (user-facing in X page)
├── account_id: UUID (primary key)
├── user_id: UUID (foreign key → users)
├── platform: enum (facebook, instagram, youtube, linkedin, twitter)
├── platform_user_id: string (platform-specific ID, indexed)
├── platform_username: string
├── access_token: string (encrypted with AES-256)
├── refresh_token: string (encrypted, nullable)
├── token_expires_at: timestamp (nullable, for refresh logic)
├── followers_count: integer (cached, updated daily)
├── account_status: enum (active, inactive, error, revoked)
├── last_synced_at: timestamp
├── created_at: timestamp (auto)
├── updated_at: timestamp (auto)
└── metadata: JSONB (platform-specific: verification badge, bio, etc.)

POSTS TABLE (used by X, O, A, L pages)
├── post_id: UUID (primary key)
├── user_id: UUID (foreign key → users)
├── platform_ids: UUID array (foreign key → social_accounts)
├── content: text (caption/description, indexed for search)
├── media_urls: text array (images/videos, stored as URLs)
├── status: enum (draft, scheduled, published, failed, archived)
├── scheduled_at: timestamp (nullable, for O page)
├── published_at: timestamp (nullable, when actually published)
├── platforms: enum array (which platforms to post to)
├── hashtags: text array (indexed, for search/filtering)
├── mentions: text array (@ mentions)
├── character_count: integer (for validation)
├── ai_generated: boolean (flag for tracking AI usage)
├── ai_generation_id: string (link to OpenAI API call)
├── created_at: timestamp (auto)
├── updated_at: timestamp (auto)
└── metadata: JSONB (platform-specific: video_duration, thumbnail_url, etc.)

ENGAGEMENT_METRICS TABLE (A page real-time data)
├── metric_id: UUID (primary key)
├── post_id: UUID (foreign key → posts)
├── platform: enum (facebook, instagram, youtube, linkedin, twitter)
├── metric_type: enum (likes, comments, shares, views, saves)
├── count: integer (current count)
├── daily_change: integer (change from yesterday)
├── recorded_at: timestamp (when metric was captured)
├── created_at: timestamp (auto)
└── archived_at: timestamp (when post no longer tracked)

COMMENTS TABLE (for comments mini-modal in X page)
├── comment_id: UUID (primary key)
├── post_id: UUID (foreign key → posts)
├── platform: enum
├── platform_comment_id: string (platform's comment ID for API operations)
├── author: string (commenter name)
├── author_id: string (platform user ID)
├── comment_text: text
├── likes_count: integer (platform-specific)
├── parent_comment_id: UUID (for threading, nullable)
├── created_at: timestamp (platform's timestamp)
└── synced_at: timestamp (when pulled from platform API)

CONTENT_CALENDAR TABLE (O page scheduling)
├── calendar_id: UUID (primary key)
├── user_id: UUID (foreign key)
├── month: integer
├── year: integer
├── posts_count: integer (denormalized for fast queries)
├── created_at: timestamp
└── updated_at: timestamp

ANALYTICS_REPORTS TABLE (A page report generation)
├── report_id: UUID (primary key)
├── user_id: UUID (foreign key)
├── report_type: enum (executive_summary, detailed, competitor, custom)
├── date_range_start: timestamp
├── date_range_end: timestamp
├── platforms: enum array
├── generated_at: timestamp (auto)
├── report_url: string (CDN URL where PDF/Excel stored)
├── metrics_snapshot: JSONB (cached metrics at generation time)
└── downloaded: boolean

STRATEGY_RECOMMENDATIONS TABLE (L page data)
├── strategy_id: UUID (primary key)
├── user_id: UUID (foreign key)
├── strategy_type: enum (product_awareness, influencer_partnership, seasonal, community_engagement)
├── recommended_week: integer
├── recommended_year: integer
├── focus_topic: string
├── content_suggestions: JSONB array (suggested post ideas)
├── expected_results: JSONB {
│   impressions_gain: integer,
│   engagement_gain: integer,
│   followers_gain: integer
│ }
├── status: enum (active, implemented, completed, skipped)
├── created_at: timestamp
└── updated_at: timestamp

API_CALL_LOG TABLE (debugging & rate limiting)
├── log_id: UUID (primary key)
├── user_id: UUID (foreign key, nullable for anonymous)
├── endpoint: string (which API called)
├── platform: string (facebook, instagram, etc., nullable)
├── status_code: integer (200, 401, 429, 500, etc.)
├── response_time_ms: integer (for performance tracking)
├── error_message: text (nullable, for failed calls)
├── created_at: timestamp (auto)
└── metadata: JSONB (request size, response size, etc.)

WEBHOOK_EVENTS TABLE (tracking incoming webhooks from platforms)
├── event_id: UUID (primary key)
├── account_id: UUID (foreign key → social_accounts)
├── event_type: string (post_comment, like_notification, follower_update)
├── platform: enum
├── payload: JSONB (raw webhook data)
├── processed: boolean
├── processed_at: timestamp (nullable)
└── created_at: timestamp (auto)
```

### 4.2 Database Relationships & Foreign Keys

**Visual Relationship Diagram:**

```
users (1) ────→ (many) social_accounts
              ├─→ (many) posts
              ├─→ (many) analytics_reports
              ├─→ (many) strategy_recommendations
              └─→ (many) api_call_logs

social_accounts (1) ────→ (many) posts
                        ├─→ (many) engagement_metrics
                        ├─→ (many) comments
                        └─→ (many) webhook_events

posts (1) ────→ (many) engagement_metrics
           ├─→ (many) comments
           └─→ (many) content_calendar entries
```

### 4.3 Indexing Strategy (Query Performance)

**Required Indexes for Optimal Performance:**

```
CREATE INDEX idx_posts_user_id_status ON posts(user_id, status);
  → O page: fetch scheduled posts by user, filtered by status

CREATE INDEX idx_posts_scheduled_at ON posts(scheduled_at)
  WHERE status = 'scheduled';
  → O page: retrieve posts within date range

CREATE INDEX idx_engagement_metrics_post_created ON 
  engagement_metrics(post_id, created_at DESC);
  → A page: fetch metrics for chart rendering

CREATE INDEX idx_social_accounts_user_platform ON 
  social_accounts(user_id, platform);
  → X page: fetch accounts by platform quickly

CREATE INDEX idx_comments_post_platform ON 
  comments(post_id, platform);
  → X page: comments mini-modal rendering

CREATE INDEX idx_posts_content_search ON posts 
  USING GIN(to_tsvector('english', content));
  → Full-text search for post discovery

CREATE INDEX idx_api_logs_user_created ON 
  api_call_log(user_id, created_at DESC);
  → Rate limiting & quota checks

CREATE INDEX idx_webhook_events_account_processed ON 
  webhook_events(account_id, processed);
  → Webhook processing queue
```

### 4.4 Data Synchronization Strategy

**Real-Time Sync Architecture:**

```
SYNC FLOW (every 15 minutes, staggered per account):

Bun Backend Service (BG Job)
  ├─→ Query accounts with last_synced_at > 15 mins ago
  ├─→ For each account:
  │   ├─→ Call platform API (Facebook Graph, Instagram, etc.)
  │   ├─→ Fetch new posts, comments, engagement metrics
  │   ├─→ Update posts table (new rows, engagement_metrics)
  │   ├─→ Update comments table (if new comments exist)
  │   ├─→ Update social_accounts.followers_count
  │   ├─→ Log API call to api_call_log (for debugging)
  │   └─→ Update last_synced_at timestamp
  └─→ Cache updated metrics in Redis (optional, for speed)

Webhook Listener (Real-time events):
  ├─→ Receive webhook from Facebook/Instagram/YouTube
  ├─→ Validate webhook signature (prevent spoofing)
  ├─→ Parse event (new comment, like, follow)
  ├─→ Insert into webhook_events table
  ├─→ Trigger processing (update engagement_metrics or comments)
  └─→ Broadcast to client via WebSocket (optional enhancement)
```

---

## 5. BACKEND ARCHITECTURE WITH BUN & VERCEL

### 5.1 Bun Runtime Optimization

**Why Bun Over Node.js:**

| Aspect | Node.js | Bun |
|--------|---------|-----|
| Startup Time | 200-300ms | 20-30ms |
| Package Installation | 15-30s | 3-5s |
| Runtime Performance | Baseline | 40-80% faster |
| Memory Usage | Higher | 30% lower |
| TypeScript Support | Via ts-node | Native |
| File System APIs | Node modules | Fast native APIs |
| SQLite Support | Requires addon | Native built-in |
| Compatibility | Industry standard | Growing ecosystem |

**Bun Configuration (`bunfig.toml`):**

```toml
[build]
target = "bun"
outdir = "./dist"
minify = { syntax = true, whitespace = true, identifiers = true }

[test]
root = "./tests"
preload = ["./tests/setup.ts"]

[install]
frozenLockfile = true
dev = true

[[bunx.config]]
name = "dev"
cmd = "bun run src/index.ts"

[[bunx.config]]
name = "build"
cmd = "bun run build"

[[bunx.config]]
name = "start"
cmd = "bun run dist/index.js"
```

### 5.2 Backend Service Architecture

**Microservices Decomposition:**

```
API GATEWAY (Express.js running on Bun)
├── Port: 3001
├── Request validation & authentication middleware
├── Rate limiting & quota enforcement
├── Request/response logging
└── Error handling & normalization

├─→ AUTH SERVICE
│   ├── /api/auth/register (POST)
│   ├── /api/auth/login (POST)
│   ├── /api/auth/logout (POST)
│   ├── /api/auth/refresh (POST)
│   ├── /api/auth/verify-email (POST)
│   ├── /api/auth/oauth/callback (GET)
│   └── /api/auth/me (GET, protected)

├─→ SOCIAL ACCOUNTS SERVICE
│   ├── /api/accounts (GET) → fetch all connected accounts
│   ├── /api/accounts/connect (POST) → initiate OAuth
│   ├── /api/accounts/:id (GET) → account details
│   ├── /api/accounts/:id (PUT) → update account settings
│   ├── /api/accounts/:id (DELETE) → disconnect account
│   └── /api/accounts/:id/sync (POST) → force sync

├─→ POSTS SERVICE
│   ├── /api/posts (GET) → fetch posts (paginated, filtered)
│   ├── /api/posts (POST) → create new post
│   ├── /api/posts/:id (GET) → post detail
│   ├── /api/posts/:id (PUT) → edit post
│   ├── /api/posts/:id (DELETE) → delete post
│   ├── /api/posts/:id/publish (POST) → publish immediately
│   ├── /api/posts/:id/schedule (POST) → schedule for later
│   └── /api/posts/:id/comments (GET) → fetch comments

├─→ AI CONTENT SERVICE
│   ├── /api/ai/generate (POST) → generate caption/hashtags
│   │   Input: { brief, platforms[], tone, audience, keywords }
│   │   Output: { caption, hashtags, description, emojis }
│   ├── /api/ai/refine (POST) → apply suggestions
│   ├── /api/ai/optimize (POST) → optimize for engagement
│   └── /api/ai/history (GET) → generation history

├─→ ANALYTICS SERVICE
│   ├── /api/analytics/metrics (GET) → KPI dashboard data
│   ├── /api/analytics/time-series (GET) → chart data
│   ├── /api/analytics/posts/top (GET) → top performing posts
│   ├── /api/analytics/topics (GET) → topic performance
│   ├── /api/analytics/report/generate (POST) → create report
│   ├── /api/analytics/report/:id/download (GET) → download PDF/Excel
│   └── /api/analytics/export (POST) → export raw data

├─→ STRATEGY SERVICE
│   ├── /api/strategy/weekly (GET) → weekly recommendations
│   ├── /api/strategy/pipeline (GET) → content pipeline
│   ├── /api/strategy/options (GET) → available strategies
│   └── /api/strategy/:id/implement (POST) → activate strategy

├─→ WEBHOOK SERVICE
│   ├── /webhooks/facebook (POST) → Facebook events
│   ├── /webhooks/instagram (POST) → Instagram events
│   ├── /webhooks/youtube (POST) → YouTube events
│   ├── /webhooks/linkedin (POST) → LinkedIn events
│   └── /webhooks/twitter (POST) → Twitter events

└─→ HEALTH & MONITORING
    ├── /health (GET) → service status
    ├── /metrics (GET) → Prometheus metrics
    └── /logs (GET, admin) → application logs
```

### 5.3 API Request/Response Patterns

**Standardized Response Format:**

```javascript
// Success Response (200-299 status)
{
  success: true,
  data: { /* requested data */ },
  meta: {
    timestamp: "2025-10-16T14:30:00Z",
    request_id: "req_abc123xyz", // for tracing
    version: "1.0"
  }
}

// Paginated Response
{
  success: true,
  data: [ /* array of items */ ],
  pagination: {
    page: 1,
    per_page: 20,
    total: 150,
    pages: 8,
    has_next: true,
    has_prev: false
  },
  meta: { /* ... */ }
}

// Error Response (4xx, 5xx status)
{
  success: false,
  error: {
    code: "INVALID_REQUEST", // machine-readable
    message: "Email is required", // user-friendly
    field: "email", // if validation error
    suggestion: "Please provide a valid email address" // helpful hint
  },
  meta: {
    request_id: "req_def456uvw",
    timestamp: "2025-10-16T14:31:00Z"
  }
}
```

### 5.4 Error Handling & Recovery

**Comprehensive Error Handling Strategy:**

```
ERROR CATEGORIES & RESPONSES:

1. AUTHENTICATION ERRORS (401)
   ├── Missing token → "Authentication required"
   ├── Expired token → Attempt auto-refresh, then prompt re-login
   ├── Invalid token → Clear auth, redirect to login
   └── Insufficient permissions → "Access denied"

2. VALIDATION ERRORS (400)
   ├── Missing required field → List which fields
   ├── Invalid format (email, date, etc.) → Show expected format
   ├── Character limit exceeded → Show limit
   └── Constraint violation → Explain unique, min/max constraints

3. RESOURCE ERRORS (404)
   ├── Post not found → "This post was deleted or doesn't exist"
   ├── Account not found → "Please reconnect this account"
   └── User not found → "Session expired, please login again"

4. RATE LIMIT ERRORS (429)
   ├── Too many requests → "Too many requests. Retry after 60 seconds"
   ├── API quota exceeded → "Monthly limit reached. Upgrade plan?"
   └── Platform rate limit → "Platform temporarily unavailable"

5. PLATFORM API ERRORS (varies)
   ├── Facebook Graph API down → "Facebook is temporarily unavailable"
   ├── Instagram API error → "Couldn't sync Instagram data"
   ├── Token revoked → "Please reconnect your account"
   └── Insufficient permissions → "Reconnect account with required permissions"

6. SERVER ERRORS (500-599)
   ├── Database connection failed → Retry with exponential backoff
   ├── Service unavailable → Show maintenance message
   ├── Unhandled exception → Log to Sentry, show generic error
   └── Timeout → "Request took too long, please try again"

RECOVERY MECHANISMS:

Circuit Breaker Pattern:
  ├── Monitor API call success rate
  ├── If >50% failures in 5-min window: OPEN (reject calls)
  ├── Wait 30 seconds, then HALF-OPEN (allow 1 test call)
  ├── If test succeeds: CLOSED (resume normal)
  └── If test fails: back to OPEN

Exponential Backoff Retry:
  ├── Attempt 1: Immediate
  ├── Attempt 2: Wait 2 seconds
  ├── Attempt 3: Wait 4 seconds
  ├── Attempt 4: Wait 8 seconds
  ├── Attempt 5: Wait 16 seconds (then fail permanently)
  └── Max jitter: ±20% to prevent thundering herd

Graceful Degradation:
  ├── Analytics unavailable → Show cached data from last successful sync
  ├── AI generation failed → Show empty state with retry option
  ├── Comments sync failed → Show previously cached comments
  └── Metrics delay → Show "last updated 2 hours ago" notice
```

### 5.5 Performance Optimization

**Bun-Specific Performance Tuning:**

```
CACHING STRATEGY:

Level 1: In-Memory Cache (Bun process)
  ├── User profile data (cache 5 minutes)
  ├── Social account list (cache 10 minutes)
  ├── Recent posts (cache 2 minutes)
  └── Analytics metrics (cache 5 minutes)

Level 2: Redis Cache (shared across servers)
  ├── Frequently accessed posts (cache 1 hour)
  ├── Analytics dashboard data (cache 15 minutes)
  ├── User permissions/roles (cache 30 minutes)
  └── Social account metadata (cache 1 hour)

Level 3: Database Query Optimization
  ├── Use prepared statements (prevent SQL injection)
  ├── Batch queries: fetch 10 posts in 1 query vs 10 queries
  ├── Denormalization: posts.followers_count (avoid JOINs)
  └── Pagination: limit 20, offset math (don't fetch all rows)

QUERY OPTIMIZATION EXAMPLES:

❌ Slow:
SELECT * FROM posts WHERE user_id = 123;
SELECT * FROM engagement_metrics WHERE post_id = 456;
// Result: 10 queries per post rendering

✅ Fast:
SELECT p.* FROM posts p WHERE p.user_id = 123 
  AND p.status IN ('published', 'scheduled') 
  LIMIT 20 OFFSET 0;
SELECT em.* FROM engagement_metrics em 
  WHERE em.post_id = ANY($1) 
  LIMIT 500; // Batch fetch all metrics
// Result: 2 queries for entire page

DATABASE CONNECTION POOLING:

├── Min connections: 5
├── Max connections: 20
├── Idle timeout: 30 seconds
├── Connection validation: ping every 60 seconds
└── Reconnect on timeout

COMPRESSION:

├── Enable gzip on all JSON responses (90%+ size reduction)
├── Enable brotli for modern browsers (10% better than gzip)
└── Exclude already-compressed content (images, videos)
```

### 5.6 Background Jobs & Scheduling

**Bun Worker Threads for Async Tasks:**

```
SCHEDULED TASKS:

Job: SyncSocialMediaMetrics
├── Frequency: Every 15 minutes
├── Duration: ~5-10 seconds per user
├── Implementation: Bun worker thread + cron schedule
├── Process:
│   ├── Query all accounts with last_synced_at > 15 mins
│   ├── For each account, call platform API
│   ├── Update posts table with new engagement metrics
│   ├── Update social_accounts.followers_count
│   └── Mark last_synced_at = now()
└── Failure handling: Log error, retry in next cycle

Job: PublishScheduledPosts
├── Frequency: Every 1 minute (check for posts due)
├── Duration: ~1 second per post
├── Implementation: Bun worker thread
├── Process:
│   ├── Query posts WHERE status='scheduled' AND scheduled_at <= now()
│   ├── For each post:
│   │   ├── Call platform APIs (multi-platform posting)
│   │   ├── Update post status to 'publishing'
│   │   ├── Capture platform post IDs
│   │   └── Update status to 'published' on success
│   └── Log results
└── Retry logic: Up to 3 retries on failure, then mark as failed

Job: GenerateStrategyRecommendations
├── Frequency: Weekly (Monday 10 AM)
├── Duration: ~30-60 seconds per user
├── Implementation: Bun worker thread + cron
├── Process:
│   ├── Query analytics data for past 30 days
│   ├── Analyze engagement patterns
│   ├── Call OpenAI API for strategy recommendations
│   ├── Insert into strategy_recommendations table
│   └── Send email notification to user
└── Optimization: Parallel processing for multiple users

Job: CleanupExpiredData
├── Frequency: Daily (2 AM)
├── Duration: ~5-10 seconds
├── Implementation: Bun worker thread
├── Process:
│   ├── Delete webhook_events older than 30 days
│   ├── Archive engagement_metrics older than 90 days
│   ├── Delete api_call_log older than 30 days
│   └── Vacuum database (free unused space)
└── Safety: Run in transaction, log deletions

Job: GenerateAnalyticsReports
├── Frequency: On-demand (triggered by user)
├── Duration: ~15-30 seconds
├── Implementation: Bun worker thread + queue system
├── Process:
│   ├── Fetch analytics data for date range
│   ├── Generate charts/graphs using Chart.js
│   ├── Compile PDF or Excel file
│   ├── Upload to CDN (AWS S3)
│   ├── Store URL in analytics_reports table
│   └── Send download link via email
└── Caching: Cache report for 7 days (user can re-download)

IMPLEMENTATION WITH BUN:

// Using Bun's native cron support
import { CronJob } from "cron";

const syncJob = new CronJob('*/15 * * * *', async () => {
  console.log('Starting metrics sync...');
  await syncSocialMediaMetrics();
});

// Or using background tasks in worker threads
const worker = new Worker(new URL('./workers/sync-task.ts', import.meta.url).href);
worker.onmessage = (msg) => console.log('Worker result:', msg.data);
worker.postMessage({ command: 'sync' });
```

---

## 6. FRONTEND ARCHITECTURE WITH NEXT.JS & VERCEL

### 6.1 Next.js Project Structure (Optimized for Cursor)

```
apps/web/ (Vercel deployment)
├── app/ (App Router - Next.js 13+)
│   ├── (auth)/
│   │   ├── login/
│   │   │   ├── page.tsx (login page component)
│   │   │   ├── layout.tsx (auth layout, no sidebar)
│   │   │   ├── components/
│   │   │   │   ├── LoginForm.tsx
│   │   │   │   ├── SocialOAuthButtons.tsx
│   │   │   │   └── ForgotPasswordLink.tsx
│   │   │   └── actions.ts (server actions for auth)
│   │   ├── register/
│   │   │   ├── page.tsx
│   │   │   ├── layout.tsx
│   │   │   └── components/
│   │   │       ├── RegisterForm.tsx
│   │   │       └── TermsAcceptance.tsx
│   │   ├── verify-email/
│   │   │   └── page.tsx
│   │   └── reset-password/
│   │       └── page.tsx
│   │
│   ├── (dashboard)/
│   │   ├── layout.tsx (main dashboard layout with sidebar)
│   │   ├── middleware.ts (protected route authentication)
│   │   ├── x/
│   │   │   ├── page.tsx (X - Multi-Account Management)
│   │   │   ├── components/
│   │   │   │   ├── AccountCard.tsx
│   │   │   │   ├── PostCard.tsx
│   │   │   │   ├── CommentsMiniModal.tsx
│   │   │   │   ├── PostsGrid.tsx
│   │   │   │   ├── AccountsSection.tsx
│   │   │   │   ├── FilterBar.tsx
│   │   │   │   └── ConnectAccountFlow.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useAccounts.ts
│   │   │   │   ├── usePosts.ts
│   │   │   │   └── useEngagementMetrics.ts
│   │   │   └── actions.ts (server actions: fetch posts, sync)
│   │   │
│   │   ├── o/
│   │   │   ├── page.tsx (O - Content Calendar)
│   │   │   ├── components/
│   │   │   │   ├── CalendarGrid.tsx
│   │   │   │   ├── DayCell.tsx
│   │   │   │   ├── DayPostsPanel.tsx
│   │   │   │   ├── MonthNavigation.tsx
│   │   │   │   ├── ScheduledPostCard.tsx
│   │   │   │   ├── RescheduleModal.tsx
│   │   │   │   └── PostPreviewThumbnails.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useCalendarData.ts
│   │   │   │   └── useDragReschedule.ts
│   │   │   └── actions.ts
│   │   │
│   │   ├── c/
│   │   │   ├── page.tsx (C - AI Content Creation)
│   │   │   ├── components/
│   │   │   │   ├── ContentBriefInput.tsx
│   │   │   │   ├── ConfigurationPanel.tsx
│   │   │   │   ├── PreviewPanel.tsx
│   │   │   │   ├── PlatformTabs.tsx
│   │   │   │   ├── GeneratedCaption.tsx
│   │   │   │   ├── HashtagSuggestions.tsx
│   │   │   │   ├── RefineSection.tsx
│   │   │   │   ├── SchedulePostModal.tsx
│   │   │   │   └── GenerationHistory.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useAIGeneration.ts
│   │   │   │   ├── useContentPreview.ts
│   │   │   │   └── useGenerationHistory.ts
│   │   │   └── actions.ts (call OpenAI API)
│   │   │
│   │   ├── a/
│   │   │   ├── page.tsx (A - Analytics & Insights)
│   │   │   ├── components/
│   │   │   │   ├── KPIDashboard.tsx
│   │   │   │   ├── MetricCard.tsx
│   │   │   │   ├── ChartsSection.tsx
│   │   │   │   ├── TimeSeriesChart.tsx
│   │   │   │   ├── EngagementPieChart.tsx
│   │   │   │   ├── TopPostsBarChart.tsx
│   │   │   │   ├── PlatformComparisonChart.tsx
│   │   │   │   ├── TopicsPerformanceTable.tsx
│   │   │   │   ├── CustomReportGenerator.tsx
│   │   │   │   ├── DateRangePicker.tsx
│   │   │   │   └── DetailedAnalysisModal.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useAnalyticsData.ts
│   │   │   │   ├── useChartData.ts
│   │   │   │   └── useReportGeneration.ts
│   │   │   └── actions.ts
│   │   │
│   │   ├── l/
│   │   │   ├── page.tsx (L - Growth Strategy)
│   │   │   ├── components/
│   │   │   │   ├── WeeklyFocusCard.tsx
│   │   │   │   ├── NextWeekPreview.tsx
│   │   │   │   ├── ContentPipelineTimeline.tsx
│   │   │   │   ├── StrategyOptionCard.tsx
│   │   │   │   ├── StrategyDetailsModal.tsx
│   │   │   │   ├── AIInsightsPanel.tsx
│   │   │   │   ├── TrendingTopics.tsx
│   │   │   │   └── ImplementStrategyButton.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useStrategyRecommendations.ts
│   │   │   │   ├── useContentPipeline.ts
│   │   │   │   └── useAIInsights.ts
│   │   │   └── actions.ts
│   │   │
│   │   ├── i/
│   │   │   └── page.tsx (I - Coming Soon placeholder)
│   │   │
│   │   └── settings/
│   │       ├── page.tsx (User settings)
│   │       ├── components/
│   │       │   ├── ProfileSettings.tsx
│   │       │   ├── SecuritySettings.tsx
│   │       │   ├── NotificationPreferences.tsx
│   │       │   ├── BillingInfo.tsx
│   │       │   └── DangerZone.tsx
│   │       └── actions.ts
│   │
│   ├── api/ (Route handlers)
│   │   ├── auth/
│   │   │   ├── register/route.ts
│   │   │   ├── login/route.ts
│   │   │   ├── logout/route.ts
│   │   │   ├── refresh/route.ts
│   │   │   └── oauth/callback/route.ts
│   │   │
│   │   ├── accounts/
│   │   │   ├── route.ts (GET all, POST create)
│   │   │   ├── [id]/route.ts (GET, PUT, DELETE)
│   │   │   └── [id]/sync/route.ts (POST force sync)
│   │   │
│   │   ├── posts/
│   │   │   ├── route.ts (GET paginated, POST create)
│   │   │   ├── [id]/route.ts (GET, PUT, DELETE)
│   │   │   ├── [id]/publish/route.ts (POST publish now)
│   │   │   ├── [id]/schedule/route.ts (POST schedule)
│   │   │   └── [id]/comments/route.ts (GET comments)
│   │   │
│   │   ├── ai/
│   │   │   ├── generate/route.ts (POST AI generation)
│   │   │   ├── refine/route.ts (POST apply suggestions)
│   │   │   └── history/route.ts (GET generation history)
│   │   │
│   │   ├── analytics/
│   │   │   ├── metrics/route.ts (GET KPI data)
│   │   │   ├── time-series/route.ts (GET chart data)
│   │   │   ├── posts/top/route.ts (GET top posts)
│   │   │   └── report/generate/route.ts (POST generate report)
│   │   │
│   │   ├── strategy/
│   │   │   ├── weekly/route.ts (GET recommendations)
│   │   │   ├── pipeline/route.ts (GET content pipeline)
│   │   │   └── options/route.ts (GET available strategies)
│   │   │
│   │   ├── webhooks/
│   │   │   ├── facebook/route.ts (POST webhook handler)
│   │   │   ├── instagram/route.ts
│   │   │   ├── youtube/route.ts
│   │   │   ├── linkedin/route.ts
│   │   │   └── twitter/route.ts
│   │   │
│   │   └── health/
│   │       └── route.ts (GET service health)
│   │
│   ├── global.css (Tailwind directives)
│   ├── layout.tsx (root layout)
│   └── page.tsx (landing page / redirect to /x)
│
├── components/
│   ├── shared/
│   │   ├── Sidebar.tsx (navigation, X.O.C.I.A.L menu)
│   │   ├── Header.tsx (top bar with user menu)
│   │   ├── TopNavigation.tsx
│   │   ├── UserMenu.tsx
│   │   ├── NotificationBell.tsx
│   │   └── Breadcrumbs.tsx
│   │
│   ├── ui/ (shadcn-style components)
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Modal.tsx
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   ├── Checkbox.tsx
│   │   ├── Badge.tsx
│   │   ├── Spinner.tsx
│   │   ├── Skeleton.tsx
│   │   ├── Avatar.tsx
│   │   ├── Tooltip.tsx
│   │   ├── Popover.tsx
│   │   ├── Tabs.tsx
│   │   ├── Alert.tsx
│   │   ├── Toast.tsx
│   │   └── ... (all primitives)
│   │
│   ├── layouts/
│   │   ├── Container.tsx
│   │   ├── Grid.tsx
│   │   ├── Flex.tsx
│   │   ├── Stack.tsx
│   │   └── TwoColumn.tsx
│   │
│   ├── forms/
│   │   ├── FormField.tsx
│   │   ├── FormSection.tsx
│   │   ├── useForm.ts (custom hook)
│   │   └── validation.ts
│   │
│   └── analytics/
│       ├── LineChart.tsx
│       ├── PieChart.tsx
│       ├── BarChart.tsx
│       └── ChartContainer.tsx
│
├── hooks/
│   ├── useAuth.ts (authentication context)
│   ├── useUser.ts (current user data)
│   ├── useAsync.ts (API calls with loading/error)
│   ├── useDebounce.ts (input throttling)
│   ├── useLocalStorage.ts (client-side persistence)
│   ├── useInfiniteScroll.ts (pagination)
│   ├── usePermission.ts (RBAC checking)
│   ├── useToast.ts (toast notifications)
│   └── usePlatformAPI.ts (social media API calls)
│
├── lib/
│   ├── api-client.ts (fetch wrapper with auth)
│   ├── auth.ts (JWT token management)
│   ├── supabase.ts (Supabase client initialization)
│   ├── constants.ts (app-wide constants)
│   ├── format.ts (date, number formatting utilities)
│   ├── validators.ts (email, password validation)
│   ├── errors.ts (custom error classes)
│   └── permissions.ts (RBAC logic)
│
├── store/ (Zustand state management)
│   ├── authStore.ts (user, token, permissions)
│   ├── uiStore.ts (sidebar collapsed, theme, modals)
│   ├── postsStore.ts (posts cache, filters)
│   ├── analyticsStore.ts (cached analytics data)
│   └── notificationStore.ts (toast messages)
│
├── types/
│   ├── index.ts (all TypeScript interfaces)
│   ├── auth.ts (AuthUser, JWT payload, etc.)
│   ├── posts.ts (Post, ScheduledPost, etc.)
│   ├── accounts.ts (SocialAccount, Platform types)
│   ├── analytics.ts (AnalyticsMetric, Chart data)
│   ├── strategy.ts (Strategy recommendation types)
│   └── api.ts (API request/response shapes)
│
├── services/
│   ├── authService.ts (login, register, logout logic)
│   ├── postsService.ts (fetch, create, edit, delete)
│   ├── accountsService.ts (manage social accounts)
│   ├── aiService.ts (call OpenAI API)
│   ├── analyticsService.ts (fetch analytics data)
│   ├── strategyService.ts (get recommendations)
│   └── webhookService.ts (handle incoming webhooks)
│
├── styles/
│   ├── globals.css (Tailwind imports, CSS custom props)
│   ├── colors.css (design token colors as CSS vars)
│   ├── typography.css (font definitions)
│   └── animations.css (custom animations)
│
├── utils/
│   ├── cn.ts (classname utility)
│   ├── logger.ts (client-side logging)
│   └── sentry.ts (error tracking integration)
│
├── public/
│   ├── images/
│   ├── icons/
│   └── fonts/
│
├── .env.local (development secrets)
├── .env.production (production secrets)
├── next.config.js (Next.js configuration)
├── tsconfig.json (TypeScript configuration)
├── tailwind.config.js (Tailwind customization)
└── package.json
```

### 6.2 State Management with Zustand

**Why Zustand Over Redux:**
- Smaller bundle size (3KB vs 15KB for Redux)
- Less boilerplate
- Better TypeScript support
- Simpler learning curve
- Direct mutation-like API

**Store Architecture:**

```typescript
// store/authStore.ts
import { create } from 'zustand';
import type { AuthUser, JWT } from '@/types/auth';

interface AuthState {
  // State
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: AuthUser) => void;
  refreshToken: (token: string) => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  
  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      const { data } = await res.json();
      set({
        user: data.user,
        accessToken: data.accessToken,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err) {
      set({ error: err.message, isLoading: false });
    }
  },
  
  logout: () => {
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
    });
  },
  
  setUser: (user) => set({ user }),
  refreshToken: async (token) => {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: token }),
    });
    const { data } = await res.json();
    set({ accessToken: data.accessToken });
  },
  
  clearError: () => set({ error: null }),
}));
```

### 6.3 Client-Side Data Fetching & Caching

**Pattern: SWR (Stale-While-Revalidate)**

```typescript
// hooks/useAsync.ts - Wrapper around fetch with caching
import useSWR from 'swr';
import { useAuthStore } from '@/store/authStore';

const fetcher = async (url: string) => {
  const { accessToken } = useAuthStore.getState();
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });
  
  if (!res.ok) {
    if (res.status === 401) {
      // Token expired, refresh and retry
      await useAuthStore.getState().refreshToken();
      return fetcher(url);
    }
    throw new Error('Failed to fetch');
  }
  
  return res.json();
};

export function usePosts(userId: string) {
  const { data, error, isLoading, mutate } = useSWR(
    `/api/posts?user_id=${userId}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1 minute
      focusThrottleInterval: 300000, // 5 minutes
    }
  );
  
  return {
    posts: data?.data || [],
    isLoading,
    error,
    refetch: mutate,
  };
}
```

### 6.4 Server Actions vs Route Handlers

**When to Use Each:**

```typescript
// Route Handler: External API calls, webhooks
// POST /api/posts
export async function POST(request: Request) {
  const { caption, platforms } = await request.json();
  
  // Call backend API
  const res = await fetch(`${BACKEND_URL}/api/posts`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${backendToken}` },
    body: JSON.stringify({ caption, platforms }),
  });
  
  return Response.json(res.json());
}

// Server Action: Direct database operations, sensitive logic
// app/x/actions.ts
'use server';

import { createClient } from '@supabase/supabase-js';
import { auth } from '@/lib/auth';

export async function fetchUserPosts() {
  const user = await auth.getCurrentUser();
  if (!user) throw new Error('Unauthorized');
  
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY! // Service key, never client-side
  );
  
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20);
  
  if (error) throw error;
  return data;
}
```

### 6.5 Performance Optimization in Next.js

**Image Optimization:**

```typescript
// ✅ Good: Using Next.js Image component
import Image from 'next/image';

export function PostCard({ imageUrl }: { imageUrl: string }) {
  return (
    <Image
      src={imageUrl}
      alt="Post image"
      width={400}
      height={400}
      placeholder="blur"
      blurDataURL={blurHash} // low-quality placeholder
      priority={false} // lazy load by default
      quality={85} // 85% quality, 15% savings
    />
  );
}

// ❌ Bad: Native img tag
<img src={imageUrl} alt="Post image" />
```

**Code Splitting:**

```typescript
// ✅ Good: Dynamic imports for heavy components
import dynamic from 'next/dynamic';

const AnalyticsCharts = dynamic(
  () => import('@/components/analytics/ChartsSection'),
  {
    loading: () => <Skeleton />,
    ssr: false, // Don't render on server, only client
  }
);

export function AnalyticsPage() {
  return (
    <div>
      <MetricsCards /> {/* Small, renders immediately */}
      <AnalyticsCharts /> {/* Loaded on-demand */}
    </div>
  );
}
```

**Hydration Mismatch Prevention:**

```typescript
// ✅ Good: Client-side marker
'use client';

import { useEffect, useState } from 'react';

export function DateFormatter({ date }: { date: string }) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) return null; // Don't render on server
  
  return new Date(date).toLocaleDateString();
}
```

---

## 7. DEBUGGING & ERROR HANDLING STRATEGY

### 7.1 Error Tracking & Monitoring

**Multi-Layer Error Tracking:**

```
Layer 1: Client-Side (Sentry)
  ├── Capture unhandled exceptions
  ├── Log console.error calls
  ├── Track performance (page load, API latency)
  ├── Breadcrumb tracking (user actions before error)
  └── Session replay (record user interaction leading to error)

Layer 2: API/Backend (Bun logging)
  ├── Log all API requests (method, endpoint, duration)
  ├── Log database queries (SQL, execution time)
  ├── Log platform API calls (response status, errors)
  ├── Error stack traces with context
  └── Performance metrics per endpoint

Layer 3: Database (Supabase)
  ├── Query performance analysis
  ├── Connection pool monitoring
  ├── Replication lag detection
  └── Storage usage tracking

Layer 4: Infrastructure (Vercel)
  ├── Deployment logs
  ├── Build failures
  ├── Runtime errors
  └── Performance analytics
```

**Sentry Integration Example:**

```typescript
// lib/sentry.ts - Client-side setup
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0, // Adjust for production
  integrations: [
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true, // Don't record sensitive content
    }),
  ],
});

// Usage in components
try {
  await publishPost(postId);
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      page: 'x',
      action: 'publish_post',
      post_id: postId,
    },
    contexts: {
      post: {
        id: postId,
        platforms: post.platforms,
        caption_length: post.caption.length,
      },
    },
  });
}
```

### 7.2 Structured Logging

**Logging Standards:**

```typescript
// lib/logger.ts
interface LogContext {
  userId?: string;
  requestId?: string;
  endpoint?: string;
  duration?: number;
  [key: string]: any;
}

export const logger = {
  info: (message: string, context?: LogContext) => {
    console.log(JSON.stringify({
      level: 'INFO',
      timestamp: new Date().toISOString(),
      message,
      ...context,
    }));
  },
  
  error: (message: string, error?: Error, context?: LogContext) => {
    console.error(JSON.stringify({
      level: 'ERROR',
      timestamp: new Date().toISOString(),
      message,
      error: {
        name: error?.name,
        message: error?.message,
        stack: error?.stack,
      },
      ...context,
    }));
  },
  
  warn: (message: string, context?: LogContext) => {
    console.warn(JSON.stringify({
      level: 'WARN',
      timestamp: new Date().toISOString(),
      message,
      ...context,
    }));
  },
};

// Usage in Bun backend
logger.info('User login attempt', {
  userId: user.id,
  email: user.email,
  requestId: req.id,
});

logger.error('Post publication failed', publishError, {
  postId: post.id,
  platforms: post.platforms,
  endpoint: '/api/posts/:id/publish',
  duration: 5000,
});
```

### 7.3 Health Checks & Monitoring

**Health Check Endpoints:**

```typescript
// api/health/route.ts
export async function GET() {
  const checks = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    services: {
      database: 'checking...',
      redis: 'checking...',
      openai: 'checking...',
      supabase: 'checking...',
    },
  };
  
  try {
    // Check database connection
    const supabase = createClient(...);
    await supabase.from('users').select('count()', { count: 'exact', head: true });
    checks.services.database = 'ok';
  } catch (e) {
    checks.services.database = 'error';
    checks.status = 'degraded';
  }
  
  try {
    // Check OpenAI API
    const response = await openai.models.list();
    checks.services.openai = 'ok';
  } catch (e) {
    checks.services.openai = 'error';
    checks.status = 'degraded';
  }
  
  return Response.json(checks, {
    status: checks.status === 'healthy' ? 200 : 503,
  });
}
```

---

## 8. SUPABASE-SPECIFIC OPTIMIZATIONS

### 8.1 Real-Time Subscriptions

**WebSocket Subscriptions for Live Updates:**

```typescript
// hooks/usePostsRealtime.ts
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';

export function usePostsRealtime(userId: string) {
  const [posts, setPosts] = useState([]);
  const [subscription, setSubscription] = useState<RealtimeChannel | null>(null);
  
  useEffect(() => {
    // Subscribe to post changes for this user
    const channel = supabase
      .channel(`posts:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // All events: INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'posts',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setPosts(prev => [payload.new, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setPosts(prev =>
              prev.map(p => p.id === payload.new.id ? payload.new : p)
            );
          } else if (payload.eventType === 'DELETE') {
            setPosts(prev => prev.filter(p => p.id !== payload.old.id));
          }
        }
      )
      .subscribe();
    
    setSubscription(channel);
    
    return () => {
      channel.unsubscribe();
    };
  }, [userId]);
  
  return { posts };
}
```

### 8.2 Batch Operations

**Efficient Bulk Updates:**

```typescript
// services/analyticsService.ts
export async function updateEngagementMetrics(
  metrics: EngagementMetric[]
) {
  const supabase = createClient(...);
  
  // ✅ Good: Single batch upsert
  const { data, error } = await supabase
    .from('engagement_metrics')
    .upsert(metrics, { onConflict: 'post_id,platform' });
  
  return { data, error };
}

// ❌ Bad: Individual updates
for (const metric of metrics) {
  await supabase
    .from('engagement_metrics')
    .update(metric)
    .eq('post_id', metric.post_id);
  // Results in N queries instead of 1
}
```

### 8.3 Row-Level Security (RLS) Policies

**Enforcing Data Isolation:**

```sql
-- Enable RLS on all tables
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own posts
CREATE POLICY "users_see_own_posts" ON posts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can only update/delete their own posts
CREATE POLICY "users_update_own_posts" ON posts
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "users_delete_own_posts" ON posts
  FOR DELETE
  USING (auth.uid() = user_id);

-- Policy: Users can insert posts for themselves
CREATE POLICY "users_insert_posts" ON posts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy for team collaboration
CREATE POLICY "team_members_see_team_posts" ON posts
  FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.user_id = auth.uid()
      AND team_members.team_id = posts.team_id
    )
  );
```

---

## 9. VERCEL DEPLOYMENT & OPTIMIZATION

### 9.1 Vercel Configuration

**vercel.json - Deployment Settings:**

```json
{
  "buildCommand": "bun run build",
  "devCommand": "bun run dev",
  "installCommand": "bun install",
  "framework": "nextjs",
  "nodeVersion": "20.x",
  "regions": ["iad1"],
  "functions": {
    "api/**/*.ts": {
      "maxDuration": 60,
      "memory": 1024
    },
    "api/webhooks/**/*.ts": {
      "maxDuration": 30,
      "memory": 512
    }
  },
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "@supabase_url",
    "NEXT_PUBLIC_SUPABASE_KEY": "@supabase_anon_key",
    "SUPABASE_SERVICE_KEY": "@supabase_service_key",
    "OPENAI_API_KEY": "@openai_key"
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-cache, no-store, must-revalidate"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        }
      ]
    },
    {
      "source": "/static/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ],
  "redirects": [
    {
      "source": "/",
      "destination": "/x",
      "permanent": false
    }
  ]
}
```

### 9.2 Edge Middleware for Performance

**middleware.ts - Request Processing at Edge:**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET!
);

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Skip middleware for public routes
  if (pathname.startsWith('/auth') || pathname === '/') {
    return NextResponse.next();
  }
  
  // Verify authentication token
  const token = request.cookies.get('auth')?.value;
  
  if (!token) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }
  
  try {
    await jwtVerify(token, secret);
    return NextResponse.next();
  } catch (error) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }
}

export const config = {
  matcher: [
    '/((?!auth|api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
};
```

### 9.3 Incremental Static Regeneration (ISR)

**Static Pages with Dynamic Updates:**

```typescript
// app/blog/[slug]/page.tsx - Blog post that updates every hour
export const revalidate = 3600; // Revalidate every 1 hour

export async function generateStaticParams() {
  const posts = await fetch(`${API_URL}/api/blog/posts`).then(r => r.json());
  return posts.map(post => ({
    slug: post.slug,
  }));
}

export default async function BlogPost({ params }) {
  const post = await fetch(
    `${API_URL}/api/blog/posts/${params.slug}`
  ).then(r => r.json());
  
  return (
    <article>
      <h1>{post.title}</h1>
      <p>{post.content}</p>
    </article>
  );
}
```

### 9.4 Analytics & Monitoring on Vercel

**Web Vitals Tracking:**

```typescript
// lib/analytics.ts - Send Web Vitals to Vercel Analytics
import { getCLS, getFCP, getFID, getLCP, getTTFB } from 'web-vitals';

export function reportWebVitals(metric) {
  const body = JSON.stringify(metric);
  
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/analytics/vitals', body);
  } else {
    fetch('/api/analytics/vitals', { body, method: 'POST' });
  }
}

getCLS(reportWebVitals);
getFCP(reportWebVitals);
getFID(reportWebVitals);
getLCP(reportWebVitals);
getTTFB(reportWebVitals);
```

---

## 10. DETAILED PAGE COMPONENT FLOW DIAGRAMS

### 10.1 X Page - Multi-Account Management (Execution Flow)

```
USER NAVIGATES TO /x
       ↓
[LAYOUT.TSX] - Dashboard Layout renders
       ├─→ Sidebar (X.O.C.I.A.L navigation)
       ├─→ Header (user menu, notifications)
       └─→ Main content area
              ↓
[X/PAGE.TSX] - Main component mounts
       ├─→ useAuth() hook - verify user logged in
       ├─→ useAccountsStore() - get cached accounts
       └─→ useEffect runs on mount
              ↓
[SERVER ACTION] - fetchUserSocialAccounts()
       ├─→ Verify JWT token valid
       ├─→ Query Supabase: SELECT * FROM social_accounts WHERE user_id = $1
       ├─→ Cache results in Zustand store
       └─→ Return to component
              ↓
[UI RENDERING] - Display accounts
       ├─→ if (loading) → show skeleton cards
       ├─→ if (error) → show error message with retry
       ├─→ if (accounts.length === 0) → show empty state + "Connect Account" button
       └─→ else → render AccountCard components in grid
              ↓
[USER INTERACTION] - User clicks on account
       ├─→ AccountCard click handler triggers
       ├─→ Set selectedAccount in state
       ├─→ Trigger useEffect to fetch posts
              ↓
[SERVER ACTION] - fetchPostsByAccount(accountId)
       ├─→ Call platform API (Facebook Graph, Instagram, etc.)
       ├─→ Parse and format response
       ├─→ Cache posts in store
       └─→ Return to component
              ↓
[UI RENDERING] - Display posts grid
       ├─→ Map through posts array
       ├─→ Render PostCard for each
       │   ├─→ Load image (lazy with blur placeholder)
       │   ├─→ Show engagement metrics
       │   ├─→ Add hover overlay with actions
       │   └─→ Set up intersection observer for infinite scroll
       └─→ Listen for scroll event
              ↓
[INFINITE SCROLL] - User scrolls to bottom
       ├─→ Intersection observer detects trigger element
       ├─→ Fetch next page: offset += 20
       ├─→ Call platform API again with pagination params
       ├─→ Append new posts to existing array
       └─→ Re-render posts grid
              ↓
[USER INTERACTION] - User hovers over post
       ├─→ Show overlay with buttons
       │   ├─→ "View Comments" button
       │   ├─→ "Reply" button
       │   └─→ "More Options" dropdown
       └─→ Listen for clicks
              ↓
[COMMENT MODAL] - User clicks "View Comments"
       ├─→ Modal component mounts
       ├─→ useEffect triggers: fetchComments(postId)
       ├─→ Call platform API to get comments
       ├─→ Parse response, sort by date
       ├─→ Render CommentsList component
       │   ├─→ Show comment author avatar
       │   ├─→ Show comment text
       │   ├─→ Show comment timestamp
       │   └─→ Show like/reply buttons (if available)
       ├─→ Render ReplyInput at bottom
       │   ├─→ TextArea for reply text
       │   ├─→ CharCounter showing remaining chars
       │   └─→ Send button
       └─→ User types reply and clicks Send
              ↓
[SERVER ACTION] - postCommentReply(postId, text, platform)
       ├─→ Validate input (not empty, within char limit)
       ├─→ Get auth user's credentials for platform
       ├─→ Call platform API to post comment
       ├─→ Handle errors (rate limit, auth failure, etc.)
       ├─→ Show success toast or error alert
       └─→ Refetch comments to show new reply
              ↓
[CLEANUP] - User closes modal
       ├─→ Modal close handler executes
       ├─→ Clean up event listeners
       ├─→ Reset form fields
       └─→ Modal unmounts
```

### 10.2 O Page - Content Calendar (Data Flow)

```
USER NAVIGATES TO /o
       ↓
[LAYOUT + CALENDAR SETUP]
       ├─→ Initialize month/year state (current month)
       ├─→ useEffect: fetch calendar data for month
              ↓
[SERVER ACTION] - fetchCalendarData(month, year, userId)
       ├─→ Query Supabase:
       │   SELECT posts, status, scheduled_at 
       │   WHERE user_id = $1 
       │   AND scheduled_at BETWEEN month_start AND month_end
       ├─→ Group posts by day
       ├─→ Calculate post count per day
       ├─→ Create calendar grid (42 cells for 6-week view)
       └─→ Return calendar structure
              ↓
[RENDER CALENDAR GRID]
       ├─→ Display day labels (Sun-Sat)
       ├─→ For each DayCell (1-31):
       │   ├─→ Display day number
       │   ├─→ Display post count badge (if > 0)
       │   ├─→ Display post preview thumbnails (max 3)
       │   ├─→ Set onClick handler
       │   └─→ Set drag zone for rescheduling
       └─→ Display month navigation (prev/next buttons)
              ↓
[USER INTERACTION] - User clicks on day
       ├─→ Set selectedDay state
       ├─→ Trigger DayPostsPanel to slide in from right
       ├─→ useEffect: fetchPostsForDay(selectedDay)
              ↓
[SERVER ACTION] - fetchPostsForDay(date)
       ├─→ Query Supabase:
       │   SELECT * FROM posts
       │   WHERE DATE(scheduled_at) = $1 AND user_id = $2
       │   ORDER BY scheduled_at ASC
       ├─→ Calculate status for each post (draft/scheduled/published/failed)
       └─→ Return post list
              ↓
[RENDER DAY POSTS PANEL]
       ├─→ Display panel header (selected date, post count)
       ├─→ For each ScheduledPost:
       │   ├─→ Display post preview image (small)
       │   ├─→ Display caption (truncated, 2-line)
       │   ├─→ Display scheduled time (HH:MM format)
       │   ├─→ Display platforms (badges: Facebook, Instagram, etc.)
       │   ├─→ Display status badge (colored: draft, scheduled, published)
       │   └─→ Add action buttons (Edit, Delete, Reschedule)
       ├─→ Display platform filter checkboxes (for bulk actions)
       └─→ Display "Add New Post" button
              ↓
[USER INTERACTION] - User clicks "Reschedule"
       ├─→ RescheduleModal component mounts
       ├─→ Modal displays current schedule time
       ├─→ User selects new date in calendar picker
       ├─→ User selects new time in time picker
       ├─→ User clicks "Confirm"
              ↓
[SERVER ACTION] - reschedulePost(postId, newDate, newTime)
       ├─→ Validate new date/time (must be future)
       ├─→ Update Supabase:
       │   UPDATE posts SET scheduled_at = $1 WHERE id = $2
       ├─→ Show success toast
       ├─→ Close modal
       └─→ Refetch calendar data to update UI
              ↓
[DRAG TO RESCHEDULE] - Alternative: User drags post
       ├─→ PostCard has drag handle
       ├─→ On dragStart: show visual feedback, show timeline
       ├─→ On dragOver: allow drop on any day cell
       ├─→ On drop: capture new date from target cell
       ├─→ Call reschedulePost() with new date
       └─→ Show success animation
```

### 10.3 C Page - AI Content Creation (Processing Flow)

```
USER NAVIGATES TO /c
       ↓
[INITIALIZE] - Page mounts
       ├─→ Initialize form state (empty)
       ├─→ Initialize generatedContent state
       ├─→ Render two-column layout (input left, preview right)
       └─→ If returning from history: populate state from clicked history item
              ↓
[USER INPUT] - User enters content brief
       ├─→ User types in BriefInput textarea
       ├─→ On each keystroke: debounce 500ms
       ├─→ Update form state with brief text
       ├─→ Update char counter (max 500)
       └─→ Disable Generate button if brief < 10 chars
              ↓
[USER CONFIGURATION] - User selects platforms & options
       ├─→ PlatformSelect: User checks Facebook, Instagram, LinkedIn
       ├─→ ContentTypeSelect: User selects "Promotional"
       ├─→ ToneSelect: User selects "Casual"
       ├─→ Update form state with selections
       └─→ All selections stored in Zustand state
              ↓
[GENERATE CLICK] - User clicks "Generate Content"
       ├─→ Validate form (brief filled, platforms selected)
       ├─→ Show loading spinner with "AI is crafting..."
       ├─→ Disable Generate button (prevent double-submit)
       └─→ Call server action: generateAIContent()
              ↓
[SERVER ACTION] - generateAIContent(brief, platforms, config)
       ├─→ Validate inputs server-side
       ├─→ Build OpenAI prompt from config
       │   └─→ "Create a promotional, casual social media post for: {brief}"
       ├─→ Call OpenAI API (gpt-4-turbo model)
       │   ├─→ temperature: 0.7 (creative but not random)
       │   ├─→ max_tokens: 1000
       │   └─→ Stream response for faster UI update
       ├─→ Parse OpenAI response
       │   └─→ Extract caption, hashtags, platform-specific versions
       ├─→ Store in database (ai_generations table for history)
       └─→ Return structured response
              ↓
[STREAM RESPONSE] - AI content arrives (real-time if streaming)
       ├─→ Update generatedContent state with caption
       ├─→ Render in PreviewPanel, right column
       ├─→ Show platform preview for each selected platform
       ├─→ Hide loading spinner
       ├─→ Enable action buttons (Copy, Refine, Schedule)
       └─→ Add to history sidebar
              ↓
[PREVIEW RENDERING] - Display generated content
       ├─→ PlatformTabs shows Instagram | Facebook | LinkedIn selected
       ├─→ For each platform:
       │   ├─→ Show platform-specific caption (OpenAI generates variants)
       │   ├─→ Show hashtags (auto-wrapped with # symbols)
       │   ├─→ Show platform preview mock
       │   │   ├─→ Header (platform logo, username)
       │   │   ├─→ Caption text
       │   │   ├─→ Mock engagement (likes, comments)
       │   │   └─→ Platform footer
       │   ├─→ Show char counter (platform-specific limits)
       │   ├─→ Show warning if exceeds platform limit
       │   └─→ Show action buttons (Copy, Regenerate)
       └─→ RefineSection shows suggestion chips below
              ↓
[USER INTERACTION] - User clicks suggestion chip
       ├─→ Suggestion chips include: "Add emoji", "Add urgency", "Make casual", etc.
       ├─→ User clicks chip (e.g., "Add emoji")
       ├─→ Send to server: refineContent(currentContent, suggestion)
              ↓
[SERVER ACTION] - refineContent(content, suggestion)
       ├─→ Build OpenAI prompt: "Refine this text by: {suggestion}"
       ├─→ Call OpenAI API with refined prompt
       ├─→ Return updated caption
       └─→ Update state automatically
              ↓
[USER EDITS] - User manually edits caption
       ├─→ User clicks GeneratedCaption TextArea
       ├─→ Cursor places in text
       ├─→ User types/deletes text
       ├─→ Update state on onChange
       ├─→ Update char counter real-time
       └─→ Show warning if over limit
              ↓
[SCHEDULE POST] - User clicks "Schedule Post"
       ├─→ SchedulePostModal component mounts
       ├─→ Modal displays:
       │   ├─→ Selected platforms (Facebook, Instagram, LinkedIn)
       │   ├─→ Generated caption (read-only or editable)
       │   ├─→ DatePicker (select date)
       │   ├─→ TimePicker (select time)
       │   └─→ Confirm button
       ├─→ User selects date and time
       ├─→ User clicks "Confirm"
              ↓
[SERVER ACTION] - schedulePost(caption, platforms, datetime)
       ├─→ Validate inputs (date is future, caption not empty)
       ├─→ Insert into Supabase posts table:
       │   ├─→ content: caption
       │   ├─→ platforms: [facebook, instagram, linkedin]
       │   ├─→ status: 'scheduled'
       │   ├─→ scheduled_at: datetime
       │   ├─→ ai_generated: true
       │   └─→ user_id: current user
       ├─→ Generate AI content variants for each platform (if needed)
       ├─→ Return success response
       └─→ Trigger background job to publish at scheduled time
              ↓
[CONFIRMATION] - Show success toast
       ├─→ Toast message: "Post scheduled for Oct 20, 2:00 PM"
       ├─→ Show link to view in calendar
       ├─→ Close modal
       ├─→ Clear form (optional)
       └─→ Update calendar page in background
```

### 10.4 A Page - Analytics (Real-Time Update Flow)

```
USER NAVIGATES TO /a
       ↓
[INITIAL LOAD] - Page mounts
       ├─→ Set default date range (last 7 days)
       ├─→ Set default platform filter (all platforms)
       ├─→ Show skeleton loaders for KPI cards
       ├─→ useEffect triggers: fetchAnalyticsData()
              ↓
[PARALLEL API CALLS] - Fetch all data simultaneously
       ├─→ Promise.all() executes parallel:
       │   ├─→ fetchKPIMetrics(dateRange, platforms)
       │   ├─→ fetchTimeSeriesData(dateRange, platforms)
       │   ├─→ fetchTopPosts(dateRange, platforms)
       │   ├─→ fetchTopicPerformance(dateRange)
       │   └─→ fetchEngagementBreakdown(dateRange, platforms)
       │
       ├─→ For each API call (backend):
       │   ├─→ Query Supabase engagement_metrics table
       │   ├─→ Apply date range filters
       │   ├─→ Apply platform filters
       │   ├─→ Aggregate/group data as needed
       │   ├─→ Cache in Redis for 5 minutes
       │   └─→ Return formatted response
       │
       └─→ All responses received together
              ↓
[RENDER KPI CARDS] - Display high-level metrics
       ├─→ MetricCard for Impressions
       │   ├─→ Large metric value (e.g., 125,432)
       │   ├─→ Percent change from previous period (e.g., +12.5%)
       │   ├─→ Mini sparkline chart (trend over time)
       │   └─→ OnClick: Navigate to detailed impressions view
       ├─→ MetricCard for Engagement
       ├─→ MetricCard for Followers
       └─→ MetricCard for Engagement Rate
              ↓
[RENDER CHARTS] - Display visualizations (2x2 grid)
       ├─→ ChartContainer 1: Time Series Line Chart
       │   ├─→ X-axis: Dates (formatted: "Oct 15", "Oct 16", etc.)
       │   ├─→ Y-axis: Impressions count
       │   ├─→ Lines: One per platform (different colors)
       │   ├─→ Tooltip: Shows date, value, platform
       │   ├─→ Legend: Clickable to toggle platforms
       │   └─→ Responsive: Scales to container width
       ├─→ ChartContainer 2: Pie Chart - Engagement Breakdown
       │   ├─→ Segments: Likes | Comments | Shares | Saves
       │   ├─→ Center label: Total engagement count
       │   ├─→ Legend: Clickable to toggle segments
       │   └─→ Tooltip: Shows count and percentage
       ├─→ ChartContainer 3: Bar Chart - Top Posts
       │   ├─→ Horizontal bars (post descriptions on Y-axis)
       │   ├─→ Bar length: Engagement count (X-axis)
       │   ├─→ OnClick: Navigate to post details
       │   └─→ Tooltip: Shows full post info
       └─→ ChartContainer 4: Grouped Bar Chart - Platform Comparison
           ├─→ Grouped bars by platform
           ├─→ Segments: Impressions | Engagement | Followers
           ├─→ Legend: Toggleable
           └─→ Responsive colors per platform
              ↓
[RENDER DATA TABLE] - Topics Performance Table
       ├─→ Table headers (sortable):
       │   ├─→ Topic | Posts | Total Impressions | Avg Engagement | Rate
       ├─→ For each topic row:
       │   ├─→ Topic name (clickable → detailed analysis modal)
       │   ├─→ Post count
       │   ├─→ Sum of impressions
       │   ├─→ Average engagement per post
       │   ├─→ Engagement rate with bar indicator
       │   └─→ Trend arrow (up/down/flat)
       ├─→ Virtualized table (if >50 rows):
       │   └─→ Only render visible rows, rest loaded on scroll
       └─→ OnColumnHeaderClick: Sort by that column (asc/desc)
              ↓
[USER INTERACTION] - Change date range
       ├─→ User clicks DateRangePicker
       ├─→ User selects "Last 30 days" (or custom range)
       ├─→ Trigger refetch: fetchAnalyticsData(newDateRange, currentPlatforms)
       ├─→ Show loading overlay on charts (semi-transparent)
       ├─→ Animate chart updates (smooth transitions)
       └─→ Update all KPI cards with new data
              ↓
[USER INTERACTION] - Filter by platform
       ├─→ User clicks PlatformFilter dropdown
       ├─→ User checks/unchecks platforms
       ├─→ Trigger refetch with filtered platforms
       ├─→ Charts re-render with only selected platforms
       ├─→ Legend updates to show only selected
       └─→ Avoid unnecessary re-renders using React.memo
              ↓
[DRILL DOWN] - User clicks on chart element
       ├─→ User clicks on a bar in bar chart (e.g., top post)
       ├─→ DetailedAnalysisModal component mounts
       ├─→ Modal fetches detailed data for that post
       ├─→ Display larger chart (full window size)
       ├─→ Display statistics panel
       │   ├─→ Peak value (date & time)
       │   ├─→ Lowest value (date & time)
       │   ├─→ Average over period
       │   ├─→ 7-day trend
       │   └─→ 30-day trend
       ├─→ Display day-by-day breakdown table
       ├─→ Allow export to CSV
       └─→ Show AI-generated insights ("This post performed 23% better than average")
              ↓
[GENERATE REPORT] - User clicks "Generate Report"
       ├─→ CustomReportGenerator section
       ├─→ User selects report type (Executive Summary, Detailed, etc.)
       ├─→ User selects format (PDF or Excel)
       ├─→ User selects delivery (Download or Email)
       ├─→ User clicks "Generate"
              ↓
[SERVER ACTION] - generateAnalyticsReport()
       ├─→ Validate report parameters
       ├─→ Queue as background job (Bun worker thread)
       ├─→ Worker fetches all data for report
       ├─→ Generate charts/visualizations (using Chart.js or similar)
       ├─→ Compile PDF or Excel file
       ├─→ Upload to CDN (AWS S3)
       ├─→ Store report URL in database
       ├─→ If email delivery: send with download link
       ├─→ If download: return direct link
       └─→ Show success toast with download button
              ↓
[REAL-TIME UPDATES] - WebSocket subscription (optional)
       ├─→ useEffect: Subscribe to real-time changes
       ├─→ supabase.realtime.on('engagement_metrics', ...)
       ├─→ When new metrics arrive:
       │   ├─→ Update state with new data
       │   ├─→ Animate chart updates
       │   └─→ Update KPI cards with new values
       └─→ Cleanup: Unsubscribe on component unmount
```

---

## 11. IMPLEMENTATION ROADMAP FOR CURSOR

### Phase 1: Foundation (Weeks 1-2)
**Using Cursor Composer for scaffolding:**
- [ ] Initialize Bun project with Next.js
- [ ] Create Cursor `.rules.md` with coding standards
- [ ] Set up Supabase database schema (migrations)
- [ ] Configure authentication with Supabase Auth
- [ ] Create UI component library (primitives)
- [ ] Deploy frontend skeleton to Vercel
- [ ] Set up error tracking (Sentry)

**Cursor Command:** "Using Composer, generate Next.js app structure with Bun, following these design tokens..."

### Phase 2: Core Features (Weeks 3-6)
**Build X, O, C pages in parallel:**
- [ ] X Page: Account management, post grid, comments modal
- [ ] O Page: Calendar, drag-reschedule, day posts panel
- [ ] C Page: AI integration with OpenAI API
- [ ] Authentication flows (login, register, OAuth)
- [ ] Supabase RLS policies enforcement
- [ ] Real-time sync background jobs

**Cursor Command:** "Generate all server actions for X page: fetchAccounts, fetchPosts, syncMetrics..."

### Phase 3: Analytics & Intelligence (Weeks 7-8)
**Complete A and L pages:**
- [ ] A Page: Charts (recharts), KPI metrics, reports
- [ ] L Page: Strategy recommendations, content pipeline
- [ ] Analytics data pipeline (Supabase → charts)
- [ ] Report generation (PDF/Excel export)
- [ ] AI-generated insights

### Phase 4: Optimization & Hardening (Weeks 9-10)
**Performance and security:**
- [ ] Performance testing (Lighthouse, Web Vitals)
- [ ] Security audit (OWASP top 10)
- [ ] Database indexing optimization
- [ ] API rate limiting
- [ ] Error handling edge cases
- [ ] Load testing (concurrent users)

### Phase 5: Deployment & Monitoring (Week 11)
**Go live with confidence:**
- [ ] Vercel production deployment
- [ ] DNS/CDN configuration
- [ ] Monitoring dashboards (Datadog/New Relic)
- [ ] Incident response procedures
- [ ] User documentation

### Phase 6: Post-Launch (Week 12+)
**Iterations and enhancements:**
- [ ] User feedback incorporation
- [ ] Performance tuning
- [ ] Additional platform integrations
- [ ] I Page: Influencer marketplace (coming soon)

---

## 12. CODING STANDARDS FOR CURSOR CONSISTENCY

### 12.1 TypeScript Best Practices

```typescript
// ✅ GOOD: Explicit types, no implicit any
interface UserProfile {
  id: string;
  email: string;
  createdAt: Date;
  role: 'admin' | 'user';
}

const getUserProfile = async (userId: string): Promise<UserProfile> => {
  // implementation
};

// ❌ BAD: Implicit any, loose typing
const getUserProfile = async (userId) => {
  // implementation
};
```

### 12.2 Component Organization

```typescript
// pages/x/components/PostCard.tsx - Organized structure

'use client'; // Client component marker at top

// 1. Imports (grouped: React, external, internal)
import { useState } from 'react';
import Image from 'next/image';
import { Card } from '@/components/ui/Card';
import type { Post } from '@/types/posts';
import { formatDate } from '@/lib/format';

// 2. Types (local to component)
interface PostCardProps {
  post: Post;
  onReply?: (postId: string) => void;
}

// 3. Component
export function PostCard({ post, onReply }: PostCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <Card
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Content */}
    </Card>
  );
}

// 4. Export as named export (not default)
export default PostCard; // ← AVOID, use named exports
```

### 12.3 Server Actions Pattern

```typescript
// app/x/actions.ts - Server-only file
'use server';

import { createClient } from '@supabase/supabase-js';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';
import type { Post } from '@/types/posts';

// 1. Input validation schema
interface FetchPostsInput {
  accountId: string;
  limit?: number;
  offset?: number;
}

// 2. Server action with error handling
export async function fetchUserPosts(
  input: FetchPostsInput
): Promise<{ data: Post[]; total: number }> {
  const { accountId, limit = 20, offset = 0 } = input;
  
  try {
    // Verify authentication
    const user = await auth.getCurrentUser();
    if (!user) {
      throw new Error('Unauthorized');
    }
    
    // Initialize Supabase with service key (server-only)
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
    
    // Query with RLS (automatic user_id filter)
    const { data, count, error } = await supabase
      .from('posts')
      .select('*', { count: 'exact' })
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) throw error;
    
    logger.info('Fetched user posts', {
      userId: user.id,
      accountId,
      count: data?.length,
    });
    
    return {
      data: data || [],
      total: count || 0,
    };
  } catch (error) {
    logger.error('Failed to fetch posts', error as Error, {
      accountId,
    });
    throw error;
  }
}
```

### 12.4 Error Handling Pattern

```typescript
// lib/errors.ts - Custom error classes
export class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 500,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super('VALIDATION_ERROR', message, 400, details);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super('AUTH_ERROR', message, 401);
    this.name = 'AuthenticationError';
  }
}

// Usage in components:
try {
  await publishPost(postId);
} catch (error) {
  if (error instanceof ValidationError) {
    showToast({ message: error.message, type: 'error' });
  } else if (error instanceof AuthenticationError) {
    redirectToLogin();
  } else {
    showToast({ message: 'Something went wrong', type: 'error' });
    Sentry.captureException(error);
  }
}
```

### 12.5 Accessibility & Semantic HTML

```typescript
// ✅ GOOD: Semantic HTML, ARIA labels
export function CommentsMiniModal({ postId }: { postId: string }) {
  return (
    <dialog
      aria-labelledby="comments-title"
      aria-describedby="comments-desc"
      role="dialog"
    >
      <h2 id="comments-title">Comments on Post</h2>
      <p id="comments-desc">View and reply to comments</p>
      
      <ul role="list" aria-live="polite" aria-label="Comments list">
        {comments.map(comment => (
          <li key={comment.id}>
            <article>
              <header>
                <img
                  src={comment.author.avatar}
                  alt={comment.author.name}
                  width={40}
                  height={40}
                />
                <strong>{comment.author.name}</strong>
              </header>
              <p>{comment.text}</p>
            </article>
          </li>
        ))}
      </ul>
      
      <textarea
        aria-label="Reply to comment"
        placeholder="Write a reply..."
      />
      <button>
        Send Reply
        <span className="sr-only">Send reply to comment</span>
      </button>
    </dialog>
  );
}

// ❌ BAD: Non-semantic, poor accessibility
<div className="modal">
  <div>Comments</div>
  <div>
    {comments.map(comment => (
      <div key={comment.id}>
        <img src={comment.author.avatar} />
        {comment.author.name}
        {comment.text}
      </div>
    ))}
  </div>
  <input type="text" placeholder="Reply..." />
  <div onClick={handleReply}>Send</div>
</div>
```

---

## 13. TESTING STRATEGY & QA FRAMEWORK

### 13.1 Testing Pyramid

```
           /\
          /  \        E2E Tests (5-10%)
         /____\       Cypress, Playwright
        /      \
       /        \     Integration Tests (20-30%)
      /          \    API + DB interactions
     /____________\
    /              \   Unit Tests (60-70%)
   /                \ Component & function tests
  /__________________\
   Jest, React Testing Library
```

### 13.2 Testing Examples

**Unit Test (Component):**
```typescript
// components/__tests__/MetricCard.test.tsx
import { render, screen } from '@testing-library/react';
import { MetricCard } from '../MetricCard';

describe('MetricCard', () => {
  it('renders metric value and change percentage', () => {
    render(
      <MetricCard
        title="Impressions"
        value={125432}
        change={12.5}
        trend="up"
      />
    );
    
    expect(screen.getByText('125,432')).toBeInTheDocument();
    expect(screen.getByText('+12.5%')).toBeInTheDocument();
    expect(screen.getByTestId('trend-up')).toBeInTheDocument();
  });
  
  it('shows error state when loading fails', () => {
    render(<MetricCard title="Test" value={0} isError={true} />);
    expect(screen.getByText('Failed to load metrics')).toBeInTheDocument();
  });
});
```

**Integration Test (API + Component):**
```typescript
// app/x/__tests__/page.integration.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import XPage from '../page';
import { mockFetch } from '@/__tests__/mocks/fetch';

describe('X Page Integration', () => {
  beforeEach(() => {
    mockFetch.setResponse('/api/accounts', {
      success: true,
      data: [
        { id: '1', platform: 'facebook', username: 'testuser' },
      ],
    });
  });
  
  it('fetches and displays user accounts on load', async () => {
    render(<XPage />);
    
    await waitFor(() => {
      expect(screen.getByText('testuser')).toBeInTheDocument();
    });
  });
  
  it('displays error message when API fails', async () => {
    mockFetch.setError('/api/accounts', new Error('API Error'));
    
    render(<XPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load accounts')).toBeInTheDocument();
    });
  });
});
```

**E2E Test (Full User Flow):**
```typescript
// e2e/create-post.spec.ts - Playwright
import { test, expect } from '@playwright/test';

test('user can create and schedule a post', async ({ page, browser }) => {
  // Login
  await page.goto('/auth/login');
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'Password123!');
  await page.click('button[type="submit"]');
  await page.waitForURL('/x');
  
  // Navigate to AI Content page
  await page.click('a[href="/c"]');
  await expect(page).toHaveURL('/c');
  
  // Generate content
  await page.fill('textarea[name="brief"]', 'Launch summer collection');
  await page.check('input[value="instagram"]');
  await page.click('button:has-text("Generate Content")');
  
  // Wait for AI response
  await page.waitForSelector('text=Generated caption');
  const caption = await page.textContent('.generated-caption');
  expect(caption).toContain('summer');
  
  // Schedule post
  await page.click('button:has-text("Schedule Post")');
  await page.click('input[name="date"]');
  await page.click('[data-date="2025-10-25"]');
  await page.fill('input[name="time"]', '14:00');
  await page.click('button:has-text("Confirm")');
  
  // Verify success
  await expect(page).toHaveText('Post scheduled');
  
  // Verify in calendar
  await page.click('a[href="/o"]');
  await page.waitForURL('/o');
  await expect(page.locator('[data-date="2025-10-25"]')).toContainText('1');
});
```

---

## 14. MONITORING & OBSERVABILITY CHECKLIST

### 14.1 Metrics to Track

**Frontend Metrics:**
- [ ] Page load time (first contentful paint, largest contentful paint)
- [ ] Time to interactive (TTI)
- [ ] Cumulative layout shift (CLS)
- [ ] JavaScript bundle size
- [ ] Component render times
- [ ] API request latency
- [ ] Error rate by page
- [ ] User session duration
- [ ] Conversion rate (post scheduled, account connected, etc.)

**Backend Metrics:**
- [ ] API endpoint response time (p50, p95, p99)
- [ ] Database query latency
- [ ] Cache hit rate
- [ ] Error rate by endpoint
- [ ] Throughput (requests/sec)
- [ ] Queue depth (background jobs)
- [ ] Platform API call success rate
- [ ] Token refresh rate (auth)
- [ ] Memory usage per process

**Database Metrics:**
- [ ] Connection pool usage
- [ ] Query count by table
- [ ] Slow query log (>500ms)
- [ ] Index effectiveness
- [ ] Replication lag
- [ ] Storage growth rate

### 14.2 Alerting Thresholds

```yaml
Alerts:
  - name: "High API Error Rate"
    condition: "error_rate > 5% for 5 minutes"
    action: "Notify on-call engineer"
    
  - name: "Database Connection Pool Exhausted"
    condition: "available_connections < 2"
    action: "Auto-scale connections, alert team"
    
  - name: "Slow Page Load"
    condition: "LCP > 3 seconds for 10 minutes"
    action: "Create incident ticket"
    
  - name: "High Memory Usage"
    condition: "memory_usage > 90% for 2 minutes"
    action: "Restart service, alert team"
    
  - name: "Background Job Queue Backlog"
    condition: "queue_size > 1000"
    action: "Trigger auto-scaling, notify team"
```

---

## 15. SECURITY HARDENING CHECKLIST

### 15.1 Pre-Launch Security Audit

- [ ] **Authentication**
  - [ ] JWT token validation on all protected endpoints
  - [ ] Refresh token rotation implemented
  - [ ] Password hashing (bcrypt) with adequate salt rounds
  - [ ] Email verification before account activation
  - [ ] MFA option available (Phase 2)

- [ ] **Authorization**
  - [ ] RBAC policies enforced
  - [ ] Supabase RLS policies tested
  - [ ] No privilege escalation possible
  - [ ] Data isolation between teams/users verified

- [ ] **Data Protection**
  - [ ] HTTPS only (no HTTP)
  - [ ] Sensitive data encrypted at rest (AES-256)
  - [ ] OAuth tokens encrypted in database
  - [ ] No sensitive data in logs
  - [ ] API keys rotated regularly

- [ ] **API Security**
  - [ ] Rate limiting implemented
  - [ ] CORS properly configured
  - [ ] CSRF protection on state-changing endpoints
  - [ ] Input validation on all endpoints
  - [ ] SQL injection prevented (using parameterized queries)
  - [ ] XSS prevention (sanitize outputs)

- [ ] **Infrastructure**
  - [ ] Vercel security settings configured
  - [ ] Supabase firewall rules set
  - [ ] Environment variables secure
  - [ ] No hardcoded secrets
  - [ ] API keys in Vercel environment variables

- [ ] **Third-Party Integrations**
  - [ ] OAuth redirects validated (no open redirects)
  - [ ] API responses from platforms verified
  - [ ] Webhook signatures validated
  - [ ] Rate limits respected (don't exceed platform quotas)

---

## 16. FINAL IMPLEMENTATION NOTES

### For Cursor AI Integration:
1. **Create `.cursor/rules.md`** with project-specific rules
2. **Use Composer for multi-file generation** - it can create entire feature sets at once
3. **Reference this SRS document** in prompts to maintain consistency
4. **Leverage Cursor's context window** to pass entire component structures
5. **Use cursor commands**: `/explain`, `/refactor`, `/test` for code quality

### Performance Targets:
- **Lighthouse Score**: 90+ (all metrics)
- **Page Load Time**: <2s (LCP)
- **API Response**: <200ms (p95)
- **Time to Interactive**: <3s
- **Core Web Vitals**: All green

### Success Criteria:
- ✅ All 6 pages (X.O.C.I.A.L) functional
- ✅ Zero unhandled errors in production
- ✅ Sub-200ms API latency (p95)
- ✅ 99.9% uptime (Vercel SLA)
- ✅ All authentication flows working
- ✅ Real-time sync within 15 minutes
- ✅ AI content generation <5 seconds
- ✅ Responsive on mobile/tablet/desktop
- ✅ Full accessibility (WCAG AA)
- ✅ Comprehensive test coverage (>80%)

---

**Document Version**: 2.0  
**Last Updated**: October 16, 2025  
**Framework**: Next.js 14+ with Bun Runtime  
**Status**: Ready for Development with Cursor IDE
    