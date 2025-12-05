/**
 * LinkedIn API Integration
 * Handles LinkedIn posting and company page management
 */

import { createClient } from '@/lib/supabase/server';
import { decryptToken } from '@/lib/encryption';

export interface LinkedInConfig {
  accessToken: string;
  personUrn?: string;
  organizationUrn?: string;
}

export interface LinkedInPost {
  text: string;
  visibility?: 'PUBLIC' | 'CONNECTIONS';
  mediaUrls?: string[];
  article?: {
    source: string;
    title: string;
    description?: string;
  };
}

export class LinkedInClient {
  private baseUrl = 'https://api.linkedin.com/v2';
  private accessToken: string;
  private personUrn?: string;
  private organizationUrn?: string;

  constructor(config: LinkedInConfig) {
    this.accessToken = config.accessToken;
    this.personUrn = config.personUrn;
    this.organizationUrn = config.organizationUrn;
  }

  /**
   * Create a post (share) on LinkedIn
   */
  async createPost(post: LinkedInPost): Promise<{ id: string }> {
    const url = `${this.baseUrl}/ugcPosts`;

    const author = this.organizationUrn || this.personUrn;
    if (!author) {
      throw new Error('No author URN provided (person or organization)');
    }

    const body: any = {
      author,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: post.text,
          },
          shareMediaCategory: post.mediaUrls && post.mediaUrls.length > 0 ? 'IMAGE' : 'NONE',
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': post.visibility || 'PUBLIC',
      },
    };

    // Add media if present
    if (post.mediaUrls && post.mediaUrls.length > 0) {
      body.specificContent['com.linkedin.ugc.ShareContent'].media = post.mediaUrls.map((url) => ({
        status: 'READY',
        description: {
          text: post.text,
        },
        media: url,
        title: {
          text: 'Image',
        },
      }));
    }

    // Add article if present
    if (post.article) {
      body.specificContent['com.linkedin.ugc.ShareContent'].shareMediaCategory = 'ARTICLE';
      body.specificContent['com.linkedin.ugc.ShareContent'].media = [{
        status: 'READY',
        originalUrl: post.article.source,
        title: {
          text: post.article.title,
        },
        description: {
          text: post.article.description || '',
        },
      }];
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create LinkedIn post');
    }

    const data = await response.json();
    return { id: data.id };
  }

  /**
   * Get post statistics
   */
  async getPostStats(postId: string): Promise<any> {
    const url = `${this.baseUrl}/socialActions/${encodeURIComponent(postId)}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch LinkedIn post stats');
    }

    const data = await response.json();

    return {
      likes: data.likesSummary?.totalLikes || 0,
      comments: data.commentsSummary?.totalComments || 0,
      shares: data.sharesSummary?.totalShares || 0,
    };
  }

  /**
   * Get profile information
   */
  async getProfile(): Promise<any> {
    const url = `${this.baseUrl}/me`;
    const params = new URLSearchParams({
      projection: '(id,firstName,lastName,profilePicture(displayImage~:playableStreams))',
    });

    const response = await fetch(`${url}?${params}`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch LinkedIn profile');
    }

    return response.json();
  }

  /**
   * Get organization information
   */
  async getOrganization(orgId: string): Promise<any> {
    const url = `${this.baseUrl}/organizations/${orgId}`;
    const params = new URLSearchParams({
      projection: '(id,name,vanityName,logoV2(original~:playableStreams))',
    });

    const response = await fetch(`${url}?${params}`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch LinkedIn organization');
    }

    return response.json();
  }

  /**
   * Delete a post
   */
  async deletePost(postId: string): Promise<{ success: boolean }> {
    const url = `${this.baseUrl}/ugcPosts/${encodeURIComponent(postId)}`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete LinkedIn post');
    }

    return { success: true };
  }

  /**
   * Validate access token
   */
  async validateToken(): Promise<boolean> {
    try {
      await this.getProfile();
      return true;
    } catch (error) {
      return false;
    }
  }
}

/**
 * Helper function to create LinkedIn client from database
 */
export async function createLinkedInClient(accountId: string): Promise<LinkedInClient> {
  const supabase = await createClient();

  const { data: account, error } = await supabase
    .from('social_accounts')
    .select('account_id, access_token, metadata, is_active')
    .eq('id', accountId)
    .eq('platform', 'linkedin')
    .single();

  if (error || !account) {
    throw new Error('LinkedIn account not found');
  }

  if (!account.is_active) {
    throw new Error('LinkedIn account is inactive');
  }

  // Decrypt token
  const accessToken = decryptToken(account.access_token);

  return new LinkedInClient({
    accessToken,
    personUrn: account.metadata?.personUrn,
    organizationUrn: account.metadata?.organizationUrn,
  });
}

