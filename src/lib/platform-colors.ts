/**
 * Platform-specific color system
 * Based on Xocial SRS Section 3.1.1
 */

export type Platform = 'instagram' | 'facebook' | 'twitter' | 'youtube' | 'linkedin' | 'tiktok';

export interface PlatformColors {
  primary: string;
  gradient: string;
  light: string;
  dark: string;
}

/**
 * Platform color mappings with brand colors and gradients
 */
export const platformColors: Record<Platform, PlatformColors> = {
  instagram: {
    primary: '#E4405F',
    gradient: 'from-[#F58529] via-[#DD2A7B] to-[#8134AF]',
    light: '#F77F9A',
    dark: '#C13584',
  },
  facebook: {
    primary: '#1877F2',
    gradient: 'from-[#1877F2] via-[#166FE5] to-[#0A58CA]',
    light: '#4A9FF5',
    dark: '#0D5DBF',
  },
  twitter: {
    primary: '#1DA1F2',
    gradient: 'from-[#1DA1F2] via-[#1A91DA] to-[#0C7ABF]',
    light: '#5AB9F5',
    dark: '#0C85D0',
  },
  youtube: {
    primary: '#FF0000',
    gradient: 'from-[#FF0000] via-[#E60000] to-[#CC0000]',
    light: '#FF4D4D',
    dark: '#CC0000',
  },
  linkedin: {
    primary: '#0A66C2',
    gradient: 'from-[#0A66C2] via-[#0958A5] to-[#004182]',
    light: '#3B82C8',
    dark: '#084D94',
  },
  tiktok: {
    primary: '#000000',
    gradient: 'from-[#000000] via-[#FF0050] to-[#00F2EA]',
    light: '#333333',
    dark: '#000000',
  },
};

/**
 * Get platform color by name
 */
export function getPlatformColor(platform: Platform): string {
  return platformColors[platform]?.primary || '#6B7280'; // Default gray
}

/**
 * Get platform gradient classes
 */
export function getPlatformGradient(platform: Platform): string {
  return platformColors[platform]?.gradient || 'from-gray-600 to-gray-400';
}

/**
 * Get platform badge color (for status indicators)
 */
export function getPlatformBadgeColor(platform: Platform): string {
  const colors: Record<Platform, string> = {
    instagram: 'bg-pink-500',
    facebook: 'bg-blue-600',
    twitter: 'bg-sky-500',
    youtube: 'bg-red-600',
    linkedin: 'bg-blue-700',
    tiktok: 'bg-gray-900',
  };
  return colors[platform] || 'bg-gray-500';
}

/**
 * Get platform text color (for dark backgrounds)
 */
export function getPlatformTextColor(platform: Platform): string {
  return platform === 'tiktok' ? 'text-white' : 'text-white';
}

/**
 * Platform display names
 */
export const platformNames: Record<Platform, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  twitter: 'Twitter',
  youtube: 'YouTube',
  linkedin: 'LinkedIn',
  tiktok: 'TikTok',
};

/**
 * Platform character limits for captions
 */
export const platformCharacterLimits: Record<Platform, number> = {
  instagram: 2200,
  facebook: 63206,
  twitter: 280,
  youtube: 5000,
  linkedin: 3000,
  tiktok: 2200,
};

/**
 * Get character limit for platform
 */
export function getCharacterLimit(platform: Platform): number {
  return platformCharacterLimits[platform] || 280;
}

/**
 * Get character count color based on usage
 * Green: < 90%, Yellow: 90-100%, Red: > 100%
 */
export function getCharacterCountColor(current: number, limit: number): string {
  const percentage = (current / limit) * 100;

  if (percentage > 100) return 'text-red-600';
  if (percentage >= 90) return 'text-yellow-600';
  return 'text-green-600';
}
