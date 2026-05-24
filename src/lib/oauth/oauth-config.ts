export type OAuthPlatform =
  | 'youtube'
  | 'facebook'
  | 'instagram'
  | 'twitter'
  | 'linkedin'
  | 'tiktok';

export interface PlatformConfig {
  clientId: string;
  clientSecret: string;
  scopes: string[];
  authUrl: string;
  tokenUrl: string;
}

export const OAUTH_CONFIG: Record<
  OAuthPlatform,
  {
    scopes: string[];
    endpoints: {
      auth: string;
      token: string;
      user: string;
    };
  }
> = {
  youtube: {
    scopes: [
      'https://www.googleapis.com/auth/youtube',
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/yt-analytics.readonly',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
    endpoints: {
      auth: 'https://accounts.google.com/o/oauth2/v2/auth',
      token: 'https://oauth2.googleapis.com/token',
      user: 'https://www.googleapis.com/oauth2/v3/userinfo',
    },
  },
  facebook: {
    scopes: [
      'pages_show_list',
      'pages_read_engagement',
      'pages_manage_posts',
      'pages_read_user_content',
      'pages_manage_engagement',
      'read_insights',
    ],
    endpoints: {
      auth: 'https://www.facebook.com/v25.0/dialog/oauth',
      token: 'https://graph.facebook.com/v25.0/oauth/access_token',
      user: 'https://graph.facebook.com/v25.0/me',
    },
  },
  instagram: {
    scopes: [
      'instagram_business_basic',
      'instagram_business_content_publish',
      'instagram_business_manage_comments',
      'instagram_business_manage_insights',
    ],
    endpoints: {
      auth: 'https://www.instagram.com/oauth/authorize',
      token: 'https://api.instagram.com/oauth/access_token',
      user: 'https://graph.instagram.com/v24.0/me',
    },
  },
  twitter: {
    scopes: ['tweet.read', 'tweet.write', 'users.read', 'offline.access', 'media.write'],
    endpoints: {
      auth: 'https://twitter.com/i/oauth2/authorize',
      token: 'https://api.x.com/2/oauth2/token',
      user: 'https://api.x.com/2/users/me',
    },
  },
  linkedin: {
    scopes: [
      'openid',
      'profile',
      'email',
      'w_member_social',
      'r_member_postAnalytics',
      'r_organization_social',
      'w_organization_social',
      'rw_organization_admin',
      'r_organization_social_feed',
      'w_member_social_feed',
      'w_organization_social_feed',
    ],
    endpoints: {
      auth: 'https://www.linkedin.com/oauth/v2/authorization',
      token: 'https://www.linkedin.com/oauth/v2/accessToken',
      user: 'https://api.linkedin.com/v2/userinfo',
    },
  },
  tiktok: {
    scopes: [
      'user.info.basic',
      'user.info.profile',
      'user.info.stats',
      'video.list',
      'video.upload',
      'video.publish',
    ],
    endpoints: {
      auth: 'https://www.tiktok.com/v2/auth/authorize',
      token: 'https://open.tiktokapis.com/v2/oauth/token/',
      user: 'https://open.tiktokapis.com/v2/user/info/',
    },
  },
};

export function getPlatformConfig(platform: OAuthPlatform) {
  const config = OAUTH_CONFIG[platform];
  if (!config) {
    throw new Error(`Unsupported platform: ${platform}`);
  }
  return config;
}
