// Platform configurations
export const PLATFORMS = {
  facebook: {
    name: "Facebook",
    color: "#1877F2",
    icon: "facebook",
    maxChars: 63206,
  },
  instagram: {
    name: "Instagram",
    color: "#E4405F",
    icon: "instagram",
    maxChars: 2200,
  },
  twitter: {
    name: "Twitter",
    color: "#1DA1F2",
    icon: "twitter",
    maxChars: 280,
  },
  linkedin: {
    name: "LinkedIn",
    color: "#0A66C2",
    icon: "linkedin",
    maxChars: 3000,
  },
  youtube: {
    name: "YouTube",
    color: "#FF0000",
    icon: "youtube",
    maxChars: 5000,
  },
  tiktok: {
    name: "TikTok",
    color: "#000000",
    icon: "tiktok",
    maxChars: 2200,
  },
} as const;

export type PlatformKey = keyof typeof PLATFORMS;

// Post statuses
export const POST_STATUS = {
  draft: {
    label: "Draft",
    color: "default",
    description: "Post is being drafted",
  },
  pending_approval: {
    label: "Pending Approval",
    color: "warning",
    description: "Waiting for approval",
  },
  approved: {
    label: "Approved",
    color: "success",
    description: "Post has been approved",
  },
  scheduled: {
    label: "Scheduled",
    color: "info",
    description: "Post is scheduled",
  },
  published: {
    label: "Published",
    color: "success",
    description: "Post has been published",
  },
  failed: {
    label: "Failed",
    color: "error",
    description: "Post failed to publish",
  },
} as const;

// Content types
export const CONTENT_TYPES = [
  "promotional",
  "educational",
  "entertaining",
  "inspirational",
  "community",
] as const;

// Tone of voice options
export const TONE_OPTIONS = [
  "professional",
  "casual",
  "humorous",
  "motivational",
  "friendly",
] as const;

// Date range presets
export const DATE_RANGES = [
  { label: "Last 7 days", value: "7" },
  { label: "Last 30 days", value: "30" },
  { label: "Last 90 days", value: "90" },
  { label: "Custom Range", value: "custom" },
] as const;

// Timezones
export const TIMEZONES = [
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "Europe/London", label: "London (GMT)" },
  { value: "Europe/Paris", label: "Paris (CET)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Asia/Kolkata", label: "India (IST)" },
  { value: "Australia/Sydney", label: "Sydney (AEDT)" },
] as const;

// User roles
export const USER_ROLES = {
  owner: {
    label: "Owner",
    permissions: ["all"],
  },
  admin: {
    label: "Admin",
    permissions: ["manage_users", "manage_posts", "view_analytics", "manage_settings"],
  },
  editor: {
    label: "Editor",
    permissions: ["create_posts", "edit_posts", "view_analytics"],
  },
  viewer: {
    label: "Viewer",
    permissions: ["view_posts", "view_analytics"],
  },
  client: {
    label: "Client",
    permissions: ["view_posts", "comment"],
  },
} as const;

// API endpoints
export const API_ROUTES = {
  POSTS: "/api/posts",
  POST_BY_ID: (id: string) => `/api/posts/${id}`,
  INTEGRATIONS: {
    FACEBOOK: "/api/integrations/facebook",
    INSTAGRAM: "/api/integrations/instagram",
    // Route kept for backward compatibility; prefer OAuth connect flow:
    // `/api/oauth/connect?platform=youtube`
    YOUTUBE: "/api/oauth/connect?platform=youtube",
    TWITTER: "/api/integrations/twitter",
    LINKEDIN: "/api/integrations/linkedin",
  },
} as const;

// App configuration
export const APP_CONFIG = {
  name: "Xocial",
  description: "AI-Powered Social Media Management Platform",
  url: process.env.NEXT_PUBLIC_APP_URL || "https://xocial.world",
  email: "support@xocial.world",
  social: {
    twitter: "@xocial",
    linkedin: "company/xocial",
  },
} as const;

// Feature flags
export const FEATURES = {
  AI_CONTENT_GENERATION: true,
  ADVANCED_ANALYTICS: true,
  TEAM_COLLABORATION: false,
  BULK_UPLOAD: false,
  CUSTOM_BRANDING: false,
} as const;

