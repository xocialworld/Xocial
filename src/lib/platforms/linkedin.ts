/**
 * LinkedIn REST API integration.
 * Handles member/page publishing, media upload, and engagement metrics.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { decryptToken } from '@/lib/encryption';
import { mediaUrlLooksLikeVideo } from './publish-utils';

export const LINKEDIN_API_VERSION = process.env.LINKEDIN_API_VERSION || '202605';
const LINKEDIN_REST_BASE_URL = 'https://api.linkedin.com/rest';
const LINKEDIN_PROFILE_BASE_URL = 'https://api.linkedin.com/v2';

export interface LinkedInConfig {
  accessToken: string;
  personUrn?: string;
  organizationUrn?: string;
}

export interface LinkedInPost {
  text: string;
  visibility?: 'PUBLIC' | 'CONNECTIONS';
  mediaUrls?: string[];
  mediaType?: 'IMAGE' | 'VIDEO' | 'REELS' | 'CAROUSEL_ALBUM';
  title?: string;
  article?: {
    source: string;
    title: string;
    description?: string;
  };
}

type LinkedInUpload = {
  id: string;
  type: 'image' | 'video';
};

export class LinkedInClient {
  private accessToken: string;
  private personUrn?: string;
  private organizationUrn?: string;

  constructor(config: LinkedInConfig) {
    this.accessToken = config.accessToken;
    this.personUrn = config.personUrn;
    this.organizationUrn = config.organizationUrn;
  }

  private get author() {
    return this.organizationUrn || this.personUrn;
  }

  private headers(contentType = true): HeadersInit {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'LinkedIn-Version': LINKEDIN_API_VERSION,
      'X-Restli-Protocol-Version': '2.0.0',
      ...(contentType ? { 'Content-Type': 'application/json' } : {}),
    };
  }

  private async parseError(response: Response, fallback: string) {
    const text = await response.text();
    if (!text) return fallback;

    try {
      const json = JSON.parse(text);
      return json.message || json.detail || json.error_description || fallback;
    } catch {
      return text;
    }
  }

  private async requestJson<T>(path: string, init: RequestInit): Promise<T> {
    const response = await fetch(`${LINKEDIN_REST_BASE_URL}${path}`, {
      ...init,
      headers: {
        ...this.headers(),
        ...(init.headers || {}),
      },
    });

    if (!response.ok) {
      throw new Error(await this.parseError(response, `LinkedIn API request failed: ${response.status}`));
    }

    if (response.status === 204) {
      return {} as T;
    }

    const text = await response.text();
    return text ? JSON.parse(text) : ({} as T);
  }

  private async downloadMedia(mediaUrl: string) {
    const response = await fetch(mediaUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch media for LinkedIn upload: ${response.status}`);
    }

    const contentType =
      response.headers.get('content-type') ||
      (mediaUrlLooksLikeVideo(mediaUrl) ? 'video/mp4' : 'image/jpeg');

    return {
      bytes: Buffer.from(await response.arrayBuffer()),
      contentType,
    };
  }

  private async uploadToLinkedIn(uploadUrl: string, bytes: Buffer, contentType: string) {
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': contentType,
        'Content-Length': bytes.byteLength.toString(),
      },
      body: new Uint8Array(bytes),
    });

    if (!response.ok) {
      throw new Error(await this.parseError(response, `LinkedIn media upload failed: ${response.status}`));
    }

    return response.headers.get('etag')?.replace(/"/g, '') || null;
  }

  private async uploadImage(mediaUrl: string): Promise<LinkedInUpload> {
    const author = this.author;
    if (!author) {
      throw new Error('No LinkedIn author URN provided for image upload');
    }

    const media = await this.downloadMedia(mediaUrl);
    const init = await this.requestJson<{
      value?: { uploadUrl?: string; image?: string };
      uploadUrl?: string;
      image?: string;
    }>('/images?action=initializeUpload', {
      method: 'POST',
      body: JSON.stringify({
        initializeUploadRequest: {
          owner: author,
        },
      }),
    });

    const uploadUrl = init.value?.uploadUrl || init.uploadUrl;
    const image = init.value?.image || init.image;

    if (!uploadUrl || !image) {
      throw new Error('LinkedIn image upload initialization did not return an upload URL and image URN');
    }

    await this.uploadToLinkedIn(uploadUrl, media.bytes, media.contentType);
    return { id: image, type: 'image' };
  }

  private async uploadVideo(mediaUrl: string): Promise<LinkedInUpload> {
    const author = this.author;
    if (!author) {
      throw new Error('No LinkedIn author URN provided for video upload');
    }

    const media = await this.downloadMedia(mediaUrl);
    const init = await this.requestJson<{
      value?: {
        video?: string;
        uploadToken?: string;
        uploadInstructions?: Array<{
          uploadUrl: string;
          firstByte?: number;
          lastByte?: number;
        }>;
      };
    }>('/videos?action=initializeUpload', {
      method: 'POST',
      body: JSON.stringify({
        initializeUploadRequest: {
          owner: author,
          fileSizeBytes: media.bytes.byteLength,
          uploadCaptions: false,
          uploadThumbnail: false,
        },
      }),
    });

    const value = init.value;
    const video = value?.video;
    const instructions = value?.uploadInstructions || [];

    if (!video || instructions.length === 0) {
      throw new Error('LinkedIn video upload initialization did not return upload instructions');
    }

    const uploadedPartIds: string[] = [];

    for (const instruction of instructions) {
      const firstByte = instruction.firstByte ?? 0;
      const lastByte = instruction.lastByte ?? media.bytes.byteLength - 1;
      const part = media.bytes.subarray(firstByte, lastByte + 1);
      const etag = await this.uploadToLinkedIn(instruction.uploadUrl, part, media.contentType);
      if (etag) uploadedPartIds.push(etag);
    }

    await this.requestJson('/videos?action=finalizeUpload', {
      method: 'POST',
      body: JSON.stringify({
        finalizeUploadRequest: {
          video,
          uploadToken: value?.uploadToken,
          uploadedPartIds,
        },
      }),
    });

    return { id: video, type: 'video' };
  }

  private async uploadMediaForPost(post: LinkedInPost): Promise<LinkedInUpload[]> {
    const urls = post.mediaUrls || [];
    if (!urls.length) return [];

    const hasVideo =
      post.mediaType === 'VIDEO' ||
      post.mediaType === 'REELS' ||
      urls.some((url) => mediaUrlLooksLikeVideo(url));

    if (hasVideo && urls.length > 1) {
      throw new Error('LinkedIn supports one video per organic post.');
    }

    if (!hasVideo && urls.length > 9) {
      throw new Error('LinkedIn supports up to nine images per organic post.');
    }

    if (hasVideo) {
      return [await this.uploadVideo(urls[0])];
    }

    return Promise.all(urls.map((url) => this.uploadImage(url)));
  }

  /**
   * Create an organic LinkedIn member or organization post.
   */
  async createPost(post: LinkedInPost): Promise<{ id: string }> {
    const author = this.author;
    if (!author) {
      throw new Error('No author URN provided (person or organization)');
    }

    const uploads = post.article ? [] : await this.uploadMediaForPost(post);
    const body: any = {
      author,
      commentary: post.text,
      visibility: post.visibility || 'PUBLIC',
      distribution: {
        feedDistribution: 'MAIN_FEED',
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false,
    };

    if (post.article) {
      body.content = {
        article: {
          source: post.article.source,
          title: post.article.title,
          description: post.article.description || '',
        },
      };
    } else if (uploads.length === 1) {
      body.content = {
        media: {
          id: uploads[0].id,
          title: post.title || post.text.substring(0, 200) || 'Media',
        },
      };
    } else if (uploads.length > 1) {
      body.content = {
        multiImage: {
          images: uploads.map((upload) => ({
            id: upload.id,
            altText: post.text.substring(0, 4086),
          })),
        },
      };
    }

    const response = await fetch(`${LINKEDIN_REST_BASE_URL}/posts`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(await this.parseError(response, `Failed to create LinkedIn post: ${response.status}`));
    }

    const restliId = response.headers.get('x-restli-id');
    const text = await response.text();
    const data = text ? JSON.parse(text) : {};
    const id = data.id || restliId;

    if (!id) {
      throw new Error('LinkedIn post was created but no post URN was returned');
    }

    return { id };
  }

  /**
   * Get post engagement summary. Deep impression/click analytics require the
   * member or organization analytics endpoints and approved LinkedIn products.
   */
  async getPostStats(postId: string): Promise<any> {
    const data = await this.requestJson<any>(`/socialActions/${encodeURIComponent(postId)}`, {
      method: 'GET',
    });

    return {
      likes: data.likesSummary?.totalLikes || data.likesSummary?.aggregatedTotalLikes || 0,
      comments: data.commentsSummary?.totalComments || data.commentsSummary?.aggregatedTotalComments || 0,
      shares: data.sharesSummary?.totalShares || data.sharesSummary?.aggregatedTotalShares || 0,
      raw: data,
    };
  }

  /**
   * Get profile information for the authenticated member.
   */
  async getProfile(): Promise<any> {
    const response = await fetch(`${LINKEDIN_PROFILE_BASE_URL}/userinfo`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(await this.parseError(response, 'Failed to fetch LinkedIn profile'));
    }

    return response.json();
  }

  /**
   * Get organization information.
   */
  async getOrganization(orgId: string): Promise<any> {
    return this.requestJson(`/organizations/${orgId}`, {
      method: 'GET',
    });
  }

  /**
   * Delete a post.
   */
  async deletePost(postId: string): Promise<{ success: boolean }> {
    await this.requestJson(`/posts/${encodeURIComponent(postId)}`, {
      method: 'DELETE',
    });

    return { success: true };
  }

  async validateToken(): Promise<boolean> {
    try {
      await this.getProfile();
      return true;
    } catch {
      return false;
    }
  }
}

export function createLinkedInClientFromToken(accessToken: string): LinkedInClient {
  return new LinkedInClient({ accessToken });
}

/**
 * Helper function to create LinkedIn client from database.
 */
export async function createLinkedInClient(accountId: string): Promise<LinkedInClient> {
  const supabase = createAdminClient();

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

  const accessToken = decryptToken(account.access_token);
  const metadata = account.metadata || {};
  const type = metadata.type || 'personal';

  return new LinkedInClient({
    accessToken,
    personUrn:
      metadata.personUrn ||
      (type === 'personal' ? `urn:li:person:${account.account_id}` : undefined),
    organizationUrn:
      metadata.organizationUrn ||
      (type === 'organization' ? `urn:li:organization:${account.account_id}` : undefined),
  });
}
