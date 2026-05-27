import { NextRequest, NextResponse } from 'next/server';
import { APIError, handleAPIError } from '@/lib/api-middleware';
import { platformPublisher, type PlatformContent } from '@/lib/platforms/publisher';
import { requireWorkspaceContext } from '@/lib/workspace-context';
import {
  normalizeInstagramPostType,
  parseCommaList,
  type InstagramPostType,
  type InstagramPublishOptions,
} from '@/lib/instagram-publishing';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { serviceClient, workspace } = await requireWorkspaceContext(request, {
      roles: ['owner', 'admin', 'manager', 'creator'],
    });

    const body = await request.json();
    const {
      accountId,
      postType,
      caption,
      mediaUrl,
      mediaUrls,
      assetIds,
      mediaType,
      instagramOptions,
    } = body;

    if (!accountId) {
      throw new APIError(400, 'accountId is required');
    }

    const selectedAssetIds = Array.isArray(assetIds)
      ? assetIds.map((id) => String(id)).filter(Boolean)
      : [];

    let selectedAssets: Array<{
      id: string;
      url: string | null;
      storage_path: string;
      file_type: string;
      mime_type: string | null;
      file_name: string;
    }> = [];

    if (selectedAssetIds.length > 0) {
      const { data: assets, error: assetsError } = await serviceClient
        .from('media_assets')
        .select('id, url, storage_path, file_type, mime_type, file_name')
        .eq('workspace_id', workspace.id)
        .in('id', selectedAssetIds);

      if (assetsError) {
        throw new APIError(500, assetsError.message, 'MEDIA_ASSET_LOOKUP_FAILED');
      }

      const assetsById = new Map((assets || []).map((asset: any) => [asset.id, asset]));
      selectedAssets = selectedAssetIds
        .map((id) => assetsById.get(id))
        .filter(Boolean) as typeof selectedAssets;

      if (selectedAssets.length !== selectedAssetIds.length) {
        throw new APIError(404, 'One or more selected media assets were not found', 'MEDIA_ASSET_NOT_FOUND');
      }
    }

    const mediaSourcesFromAssets = selectedAssets.map((asset) => {
      if (asset.url) return asset.url;
      const { data } = serviceClient.storage.from('media').getPublicUrl(asset.storage_path);
      return data.publicUrl;
    });

    const legacyMediaSources: string[] = mediaUrls?.length
      ? mediaUrls
      : mediaUrl
      ? [mediaUrl]
      : [];
    const mediaSources = mediaSourcesFromAssets.length ? mediaSourcesFromAssets : legacyMediaSources;
    const resolvedPostType = normalizeInstagramPostType({
      postType,
      mediaType,
      mediaCount: mediaSources.length,
    });

    if (mediaSources.length === 0) {
      throw new APIError(400, 'Select at least one media asset for Instagram publishing');
    }

    if (caption && caption.length > 2200) {
      throw new APIError(400, 'Instagram captions must be 2200 characters or fewer');
    }

    const selectedTypes = selectedAssets.map((asset) => asset.file_type);
    const hasKnownAssetTypes = selectedTypes.length > 0;

    if (resolvedPostType === 'feed') {
      if (mediaSources.length !== 1) {
        throw new APIError(400, 'Feed publishing requires exactly one image');
      }
      if (hasKnownAssetTypes && selectedTypes[0] !== 'image') {
        throw new APIError(400, 'Feed publishing supports image assets only. Use Reel for videos.');
      }
    }

    if (resolvedPostType === 'carousel') {
      if (mediaSources.length < 2 || mediaSources.length > 10) {
        throw new APIError(400, 'Instagram carousels require 2-10 media assets');
      }
    }

    if (resolvedPostType === 'reel') {
      if (mediaSources.length !== 1) {
        throw new APIError(400, 'Reel publishing requires exactly one video');
      }
      if (hasKnownAssetTypes && selectedTypes[0] !== 'video') {
        throw new APIError(400, 'Reel publishing requires a video asset');
      }
    }

    if (resolvedPostType === 'story') {
      if (mediaSources.length !== 1) {
        throw new APIError(400, 'Story publishing requires exactly one media asset');
      }
    }

    const {
      data: account,
      error: accountError,
    } = await serviceClient
      .from('social_accounts')
      .select('id, workspace_id, platform, is_active')
      .eq('id', accountId)
      .eq('workspace_id', workspace.id)
      .eq('platform', 'instagram')
      .maybeSingle();

    if (accountError || !account || !account.is_active) {
      throw new APIError(404, 'Instagram account not found in this workspace');
    }

    const normalizedOptions = await resolveInstagramOptions(
      instagramOptions || {},
      serviceClient,
      workspace.id
    );

    const content: PlatformContent = {
      text: caption || '',
      assetIds: selectedAssetIds,
      mediaUrls: mediaSources,
      mediaType: mapPostTypeToMediaType(resolvedPostType, mediaSources.length, mediaType),
      postType: resolvedPostType,
      instagramOptions: normalizedOptions,
    };

    const results = await platformPublisher.publishToAll({
      platforms: ['instagram'],
      accountIds: { instagram: accountId },
      content,
    });

    const result = results[0];
    if (!result?.success) {
      throw new APIError(502, result?.error || 'Failed to publish Instagram post', 'PUBLISH_FAILED');
    }

    return NextResponse.json({
      success: true,
      postId: result.platformPostId,
      message: `Instagram ${resolvedPostType} published successfully`,
    });
  } catch (error) {
    return handleAPIError(error);
  }
}

function mapPostTypeToMediaType(
  postType: InstagramPostType,
  mediaCount: number,
  legacyMediaType?: PlatformContent['mediaType']
): PlatformContent['mediaType'] {
  if (postType === 'carousel' || mediaCount > 1) return 'CAROUSEL_ALBUM';
  if (postType === 'reel') return 'REELS';
  if (postType === 'story') return 'STORIES';
  return legacyMediaType || 'IMAGE';
}

async function resolveInstagramOptions(
  raw: any,
  serviceClient: any,
  workspaceId: string
): Promise<InstagramPublishOptions> {
  const options: InstagramPublishOptions = {
    altText: typeof raw.altText === 'string' ? raw.altText.trim() || undefined : undefined,
    shareToFeed: typeof raw.shareToFeed === 'boolean' ? raw.shareToFeed : undefined,
    thumbOffset:
      raw.thumbOffset === '' || raw.thumbOffset === undefined || raw.thumbOffset === null
        ? undefined
        : Number(raw.thumbOffset),
    audioName: typeof raw.audioName === 'string' ? raw.audioName.trim() || undefined : undefined,
    collaborators: parseCommaList(raw.collaborators),
    userTags: Array.isArray(raw.userTags) ? raw.userTags : undefined,
    locationId: typeof raw.locationId === 'string' ? raw.locationId.trim() || undefined : undefined,
    productTags: Array.isArray(raw.productTags) ? raw.productTags : undefined,
    trialParams: raw.trialParams,
  };

  if (raw.coverAssetId) {
    const { data: coverAsset, error } = await serviceClient
      .from('media_assets')
      .select('id, url, storage_path, file_type')
      .eq('id', raw.coverAssetId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (error || !coverAsset) {
      throw new APIError(404, 'Selected Reel cover image was not found', 'COVER_ASSET_NOT_FOUND');
    }

    if (coverAsset.file_type !== 'image') {
      throw new APIError(400, 'Reel cover must be an image asset', 'COVER_ASSET_NOT_IMAGE');
    }

    options.coverAssetId = coverAsset.id;
    options.coverUrl =
      coverAsset.url ||
      serviceClient.storage.from('media').getPublicUrl(coverAsset.storage_path).data.publicUrl;
  }

  if (Number.isNaN(options.thumbOffset)) {
    delete options.thumbOffset;
  }

  return options;
}
