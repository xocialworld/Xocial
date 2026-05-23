import type { Post } from '@/types';
import {
  buildPostDetailVariants,
  getPostDetailDescription,
  getPostDetailPlatforms,
  getPostDetailTitle,
  getPostFromDetailResponse,
} from '../post-detail';

const basePost: Post = {
  id: 'post-1',
  workspace_id: 'workspace-1',
  content: {
    instagram: {
      text: 'Instagram draft copy',
      hashtags: ['launch'],
      mentions: ['xocial'],
    },
    linkedin: {
      text: 'LinkedIn draft copy',
    },
  },
  platforms: ['instagram', 'linkedin'],
  status: 'draft',
  created_at: '2026-05-22T10:00:00.000Z',
  updated_at: '2026-05-22T10:00:00.000Z',
  metadata: {
    title: 'Launch draft',
    brief: 'A short launch post',
    accountIds: {
      instagram: 'account-instagram',
    },
  },
};

describe('post detail normalization', () => {
  it('builds platform variants from canonical posts table rows', () => {
    const variants = buildPostDetailVariants(basePost);

    expect(variants).toEqual([
      expect.objectContaining({
        id: 'post-1:instagram',
        platform: 'instagram',
        caption: 'Instagram draft copy',
        hashtags: ['launch'],
        mentions: ['xocial'],
        status: 'draft',
        social_account: expect.objectContaining({ id: 'account-instagram' }),
      }),
      expect.objectContaining({
        id: 'post-1:linkedin',
        platform: 'linkedin',
        caption: 'LinkedIn draft copy',
        social_account: null,
      }),
    ]);
  });

  it('infers platforms from content when the platforms column is empty', () => {
    const post = {
      ...basePost,
      platforms: [],
    };

    expect(getPostDetailPlatforms(post)).toEqual(['instagram', 'linkedin']);
  });

  it('uses metadata for title and description when present', () => {
    expect(getPostDetailTitle(basePost)).toBe('Launch draft');
    expect(getPostDetailDescription(basePost)).toBe('A short launch post');
  });

  it('accepts both detail and create API response envelopes', () => {
    expect(getPostFromDetailResponse({ data: basePost })).toBe(basePost);
    expect(getPostFromDetailResponse({ data: { post: basePost } })).toBe(basePost);
    expect(getPostFromDetailResponse({ post: basePost })).toBe(basePost);
  });
});
