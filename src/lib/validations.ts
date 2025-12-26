import { z } from "zod";

// Auth validation schemas
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Post validation schemas
export const createPostSchema = z.object({
  content: z.object({
    text: z.string().min(1, "Content is required"),
    hashtags: z.array(z.string()).optional(),
    mentions: z.array(z.string()).optional(),
  }),
  platforms: z.array(z.enum(["facebook", "instagram", "twitter", "linkedin", "tiktok", "youtube"])).min(1, "At least one platform is required"),
  scheduled_at: z.string().optional(),
  status: z.enum(["draft", "pending_approval", "approved", "scheduled", "published", "failed"]).optional(),
  media: z.array(z.object({
    id: z.string(),
    url: z.string().url(),
    type: z.enum(["image", "video"]),
    thumbnail: z.string().url().optional(),
    filename: z.string(),
    size: z.number(),
  })).optional(),
  tags: z.array(z.string()).optional(),
  campaign_id: z.string().uuid().optional(),
});

export const updatePostSchema = createPostSchema.partial();

// Profile validation schemas
export const updateProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  bio: z.string().max(500, "Bio must be less than 500 characters").optional(),
  timezone: z.string().optional(),
  avatar_url: z.string().url().optional(),
  notification_preferences: z.object({
    push: z.boolean(),
    email: z.boolean(),
    in_app: z.boolean(),
    digest_frequency: z.enum(["daily", "weekly", "monthly"]),
  }).optional(),
});

// Workspace validation schemas
export const createWorkspaceSchema = z.object({
  name: z.string().min(2, "Workspace name must be at least 2 characters").max(80, "Workspace name must be less than 80 characters"),
  slug: z.string().regex(/^[a-z0-9-]+$/, "Slug must only contain lowercase letters, numbers, and hyphens").min(3, "Slug must be at least 3 characters").max(100).optional().or(z.literal('')),
  logoUrl: z.string().url("Invalid logo URL").optional().or(z.literal('')),
  timezone: z.string().optional(),
  color_theme: z.string().optional(),
  settings: z.record(z.any()).optional(),
});

export const updateWorkspaceSchema = createWorkspaceSchema.partial();

// Social account validation schemas
export const connectSocialAccountSchema = z.object({
  platform: z.enum(["facebook", "instagram", "twitter", "linkedin", "tiktok", "youtube"]),
  account_id: z.string(),
  account_name: z.string(),
  account_avatar: z.string().url().optional(),
  access_token: z.string(),
  refresh_token: z.string().optional(),
  token_expires_at: z.string().optional(),
});

// Type exports
export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type ConnectSocialAccountInput = z.infer<typeof connectSocialAccountSchema>;

