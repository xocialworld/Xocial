/**
 * Shared Post Content Helpers
 * 
 * Provides consistent utilities for extracting and normalizing post content
 * across different data sources (planner, sync, external platforms).
 * 
 * The post content structure can vary:
 * - Planner posts: { twitter: { text: "..." }, instagram: { text: "..." }, ... }
 * - Synced posts: { text: "...", caption: "...", message: "...", title: "..." }
 * - Legacy: Just a string
 * 
 * These helpers normalize all variations into a consistent API.
 */

import type { Post, Platform } from '@/types';

// Type for the various content structures we encounter
export type PostContentShape = 
  | string 
  | { text?: string; caption?: string; message?: string; title?: string; description?: string; default?: { text?: string }; [platform: string]: any }
  | null
  | undefined;

/**
 * Extract the primary text content from a post for display purposes.
 * Handles all known content structure variations.
 * 
 * @param post - The post object
 * @returns The best text representation for display
 */
export function getPostText(post: Post | null | undefined): string {
  if (!post) return '';
  
  const content = post.content as PostContentShape;
  return extractTextFromContent(content, post.platforms);
}

/**
 * Extract text from a content object, checking all known fields.
 * 
 * @param content - The content object/string
 * @param platforms - Optional platforms list to try platform-specific content
 * @returns The extracted text
 */
export function extractTextFromContent(
  content: PostContentShape,
  platforms?: Platform[] | string[]
): string {
  if (!content) return '';
  
  // Handle direct string content
  if (typeof content === 'string') {
    return content;
  }
  
  // Handle object content - try various known fields
  
  // 1. Try default content first (normalized planner format)
  if (content.default?.text) {
    return content.default.text;
  }
  
  // 2. Try direct text field
  if (typeof content.text === 'string') {
    return content.text;
  }
  
  // 3. Try platform-specific fields in order
  if (Array.isArray(platforms) && platforms.length > 0) {
    for (const platform of platforms) {
      const platformContent = content[platform];
      if (platformContent?.text) {
        return platformContent.text;
      }
    }
  }
  
  // 4. Try common external platform field names (synced posts)
  if (typeof content.caption === 'string') return content.caption;
  if (typeof content.message === 'string') return content.message;
  if (typeof content.title === 'string') return content.title;
  if (typeof content.description === 'string') return content.description;
  
  // 5. Last resort: find any platform content that has text
  for (const key of Object.keys(content)) {
    if (key !== 'default' && content[key]?.text) {
      return content[key].text;
    }
  }
  
  return '';
}

/**
 * Get text content for a specific platform from a post.
 * Falls back to default content if platform-specific content doesn't exist.
 * 
 * @param post - The post object
 * @param platform - The platform to get content for
 * @returns Platform-specific or fallback text
 */
export function getPostTextForPlatform(post: Post | null | undefined, platform: Platform): string {
  if (!post) return '';
  
  const content = post.content as PostContentShape;
  if (!content || typeof content === 'string') {
    return typeof content === 'string' ? content : '';
  }
  
  // Try platform-specific content first
  if (content[platform]?.text) {
    return content[platform].text;
  }
  
  // Fall back to default or any available text
  return extractTextFromContent(content, post.platforms);
}

/**
 * Get a preview/truncated version of post content for cards and lists.
 * 
 * @param post - The post object
 * @param maxLength - Maximum length before truncation (default 100)
 * @returns Truncated text with ellipsis if needed
 */
export function getPostPreview(post: Post | null | undefined, maxLength: number = 100): string {
  const text = getPostText(post);
  
  if (!text) return 'No content';
  if (text.length <= maxLength) return text;
  
  return text.slice(0, maxLength).trim() + '...';
}

/**
 * Get a display title for a post (first line or truncated content).
 * 
 * @param post - The post object
 * @param maxLength - Maximum length (default 60)
 * @returns A suitable title for display
 */
export function getPostTitle(post: Post | null | undefined, maxLength: number = 60): string {
  const text = getPostText(post);
  
  if (!text) return 'Untitled Post';
  
  // Try to get first line as title
  const firstLine = text.split('\n')[0].trim();
  if (firstLine.length <= maxLength) return firstLine;
  
  return firstLine.slice(0, maxLength).trim() + '...';
}

/**
 * Normalize content for writing to the database.
 * Ensures consistent structure: { default: { text }, [platform]: { text } }
 * 
 * @param input - Input content (string or object)
 * @param platforms - Platforms to write content for
 * @returns Normalized content object
 */
export function normalizeContentForWrite(
  input: string | Record<string, { text: string }>,
  platforms: Platform[]
): Record<string, { text: string }> {
  // If input is a string, create default and platform-specific entries
  if (typeof input === 'string') {
    const result: Record<string, { text: string }> = {
      default: { text: input },
    };
    
    for (const platform of platforms) {
      result[platform] = { text: input };
    }
    
    return result;
  }
  
  // If input is already structured, ensure default exists
  const result = { ...input };
  
  if (!result.default) {
    // Find any existing text to use as default
    const firstPlatform = platforms.find(p => result[p]?.text);
    result.default = { text: firstPlatform ? result[firstPlatform].text : '' };
  }
  
  return result;
}

/**
 * Update content for a specific platform while preserving other platform content.
 * 
 * @param existingContent - Current content object
 * @param platform - Platform to update
 * @param newText - New text for the platform
 * @param platforms - All platforms for the post
 * @returns Updated content object
 */
export function updateContentForPlatform(
  existingContent: PostContentShape,
  platform: Platform,
  newText: string,
  platforms: Platform[]
): Record<string, { text: string }> {
  // Start with normalized existing content
  const content = typeof existingContent === 'string' 
    ? normalizeContentForWrite(existingContent, platforms)
    : { ...(existingContent as Record<string, any>) };
  
  // Update the specific platform
  content[platform] = { text: newText };
  
  // Ensure default exists
  if (!content.default?.text) {
    content.default = { text: newText };
  }
  
  return content as Record<string, { text: string }>;
}

/**
 * Check if a post has any content (text or media).
 * 
 * @param post - The post object
 * @returns True if the post has content
 */
export function hasContent(post: Post | null | undefined): boolean {
  if (!post) return false;
  
  const text = getPostText(post);
  const hasText = text.trim().length > 0;
  const hasMedia = Array.isArray(post.media) && post.media.length > 0;
  
  return hasText || hasMedia;
}

/**
 * Get media URLs from a post.
 * 
 * @param post - The post object
 * @returns Array of media URLs
 */
export function getPostMediaUrls(post: Post | null | undefined): string[] {
  if (!post) return [];
  
  // Handle array of media objects
  if (Array.isArray(post.media)) {
    return post.media
      .map((m: any) => m?.url || m)
      .filter((url): url is string => typeof url === 'string');
  }
  
  // Handle legacy media_urls field
  if (Array.isArray((post as any).media_urls)) {
    return (post as any).media_urls.filter((url: any): url is string => typeof url === 'string');
  }
  
  return [];
}

/**
 * Get the display date for a post based on its status.
 * Priority: scheduled_at > published_at > created_at
 * 
 * @param post - The post object
 * @returns The most relevant date for display
 */
export function getPostDisplayDate(post: Post | null | undefined): Date | null {
  if (!post) return null;
  
  const dateString = post.scheduled_at || post.published_at || post.created_at;
  if (!dateString) return null;
  
  try {
    return new Date(dateString);
  } catch {
    return null;
  }
}

