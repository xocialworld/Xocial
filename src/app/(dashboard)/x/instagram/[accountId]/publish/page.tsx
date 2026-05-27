/* eslint-disable @next/next/no-img-element */
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Film,
  Image as ImageIcon,
  Images,
  Instagram,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { MediaLibraryModal } from '@/components/features/create/media-library-modal';
import { fetchWithWorkspace } from '@/lib/fetch-with-workspace';
import { nearlyNineSixteen, type InstagramPostType, type ReelCropRect } from '@/lib/instagram-publishing';
import { cn } from '@/lib/utils';
import { useSelectedWorkspace } from '@/store/workspaceStore';
import type { MediaFile } from '@/types';

type VideoMeta = {
  width: number;
  height: number;
};

type CropJob = {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  error_message?: string | null;
  output_media_asset_id?: string | null;
  output?: {
    mediaAsset?: {
      id: string;
      url: string;
      file_name?: string;
      size_bytes?: number;
      width?: number;
      height?: number;
    };
  };
};

const POST_TYPES: Array<{
  id: InstagramPostType;
  label: string;
  description: string;
  icon: typeof ImageIcon;
}> = [
  { id: 'feed', label: 'Feed', description: 'Single image post', icon: ImageIcon },
  { id: 'carousel', label: 'Carousel', description: '2-10 media items', icon: Images },
  { id: 'reel', label: 'Reel', description: 'Vertical video', icon: Film },
  { id: 'story', label: 'Story', description: '24-hour image/video', icon: Sparkles },
];

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseJsonArrayInput(value: string, label: string) {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  try {
    const parsed = JSON.parse(trimmed);
    if (!Array.isArray(parsed)) {
      throw new Error(`${label} must be a JSON array`);
    }
    return parsed;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : `${label} is not valid JSON`);
  }
}

function buildReelCrop(meta: VideoMeta, position: number): ReelCropRect {
  const targetRatio = 9 / 16;
  const sourceRatio = meta.width / meta.height;
  const offset = Math.max(0, Math.min(100, position)) / 100;

  if (sourceRatio > targetRatio) {
    const cropHeight = meta.height;
    const cropWidth = cropHeight * targetRatio;
    return {
      x: (meta.width - cropWidth) * offset,
      y: 0,
      width: cropWidth,
      height: cropHeight,
    };
  }

  const cropWidth = meta.width;
  const cropHeight = cropWidth / targetRatio;
  return {
    x: 0,
    y: Math.max(0, meta.height - cropHeight) * offset,
    width: cropWidth,
    height: cropHeight,
  };
}

function mediaHint(postType: InstagramPostType) {
  if (postType === 'feed') return 'Upload or choose one image.';
  if (postType === 'carousel') return 'Upload or choose 2-10 images/videos.';
  if (postType === 'reel') return 'Upload or choose one video. Xocial will prepare it as 9:16.';
  return 'Upload or choose one image/video for a 24-hour Story.';
}

export default function PublishToInstagramPage() {
  const params = useParams();
  const router = useRouter();
  const accountId = params.accountId as string;
  const selectedWorkspace = useSelectedWorkspace();

  const [account, setAccount] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [postType, setPostType] = useState<InstagramPostType>('feed');
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [caption, setCaption] = useState('');
  const [libraryMode, setLibraryMode] = useState<'media' | 'cover' | null>(null);
  const [videoMeta, setVideoMeta] = useState<VideoMeta | null>(null);
  const [cropPosition, setCropPosition] = useState(50);
  const [cropJob, setCropJob] = useState<CropJob | null>(null);
  const [preparedReelAssetId, setPreparedReelAssetId] = useState<string | null>(null);

  const [altText, setAltText] = useState('');
  const [shareToFeed, setShareToFeed] = useState(true);
  const [thumbOffset, setThumbOffset] = useState('0');
  const [audioName, setAudioName] = useState('');
  const [collaborators, setCollaborators] = useState('');
  const [userTags, setUserTags] = useState('');
  const [locationId, setLocationId] = useState('');
  const [productTags, setProductTags] = useState('');
  const [trialStrategy, setTrialStrategy] = useState<'none' | 'MANUAL' | 'SS_PERFORMANCE'>('none');
  const [coverAsset, setCoverAsset] = useState<MediaFile | null>(null);

  const selectedVideo = postType === 'reel' ? media[0] : null;
  const reelNeedsCrop = Boolean(
    postType === 'reel' &&
      selectedVideo?.type === 'video' &&
      videoMeta &&
      !nearlyNineSixteen(videoMeta.width, videoMeta.height) &&
      preparedReelAssetId !== selectedVideo.id
  );

  const fetchAccount = useCallback(async () => {
    if (!selectedWorkspace?.id) return;

    try {
      const response = await fetchWithWorkspace(`/api/accounts/${accountId}`, {
        workspaceId: selectedWorkspace.id,
      });
      if (!response.ok) throw new Error('Failed to fetch account');
      const data = await response.json();
      setAccount(data.data);
    } catch (error: any) {
      console.error('Error fetching account:', error);
      toast.error('Failed to load account');
    } finally {
      setLoading(false);
    }
  }, [accountId, selectedWorkspace?.id]);

  useEffect(() => {
    fetchAccount();
  }, [fetchAccount]);

  useEffect(() => {
    setVideoMeta(null);
    setCropJob(null);
    setPreparedReelAssetId(null);

    if (postType !== 'reel' || media[0]?.type !== 'video') return;

    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = media[0].url;
    video.onloadedmetadata = () => {
      setVideoMeta({
        width: video.videoWidth,
        height: video.videoHeight,
      });
    };
    video.onerror = () => {
      toast.error('Could not read video dimensions');
    };
  }, [media, postType]);

  const resetForPostType = (nextType: string) => {
    setPostType(nextType as InstagramPostType);
    setMedia([]);
    setCaption('');
    setVideoMeta(null);
    setCropJob(null);
    setPreparedReelAssetId(null);
    setCoverAsset(null);
  };

  const applyMediaSelection = (files: MediaFile[]) => {
    if (files.length === 0) return;

    if (postType === 'carousel') {
      setMedia((current) => [...current, ...files].slice(0, 10));
      return;
    }

    setMedia([files[0]]);
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length || !selectedWorkspace?.id) return;

    setUploading(true);
    try {
      const uploaded: MediaFile[] = [];

      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetchWithWorkspace('/api/media/upload', {
          method: 'POST',
          workspaceId: selectedWorkspace.id,
          body: formData,
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data?.error?.message || data?.error || 'Failed to upload media');
        }

        uploaded.push({
          id: data.id,
          url: data.url,
          type: data.type === 'video' ? 'video' : 'image',
          name: data.name || file.name,
          size: data.size || file.size,
        });
      }

      applyMediaSelection(uploaded);
      toast.success(`${uploaded.length} media file${uploaded.length === 1 ? '' : 's'} uploaded`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload media');
    } finally {
      setUploading(false);
    }
  };

  const removeMedia = (id: string) => {
    setMedia((current) => current.filter((item) => item.id !== id));
    if (preparedReelAssetId === id) {
      setPreparedReelAssetId(null);
    }
  };

  const applyCompletedCropJob = (job: CropJob) => {
    const output = job.output?.mediaAsset;
    if (!output) return false;

    const preparedAsset: MediaFile = {
      id: output.id,
      url: output.url,
      type: 'video',
      name: output.file_name || 'instagram-reel-9x16.mp4',
      size: output.size_bytes || 0,
    };
    setMedia([preparedAsset]);
    setPreparedReelAssetId(preparedAsset.id);
    setVideoMeta({ width: output.width || 1080, height: output.height || 1920 });
    toast.success('Reel prepared and saved to media library');
    return true;
  };

  const pollCropJob = async (jobId: string) => {
    for (let attempt = 0; attempt < 90; attempt++) {
      await delay(2000);
      const response = await fetchWithWorkspace(
        `/api/media/video/crop-reel?jobId=${encodeURIComponent(jobId)}`,
        {
          workspaceId: selectedWorkspace?.id,
        }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error?.message || 'Failed to check crop status');
      }

      const job = data.job as CropJob;
      setCropJob(job);

      if (job.status === 'completed' && applyCompletedCropJob(job)) {
        return;
      }

      if (job.status === 'failed') {
        throw new Error(job.error_message || 'Reel crop failed');
      }
    }

    throw new Error('Reel crop timed out');
  };

  const prepareReel = async () => {
    if (!selectedVideo || !videoMeta || !selectedWorkspace?.id) {
      toast.error('Select a video before preparing the Reel');
      return;
    }

    try {
      setCropJob({ id: 'pending', status: 'queued', progress: 0 });
      const crop = buildReelCrop(videoMeta, cropPosition);
      const response = await fetchWithWorkspace('/api/media/video/crop-reel', {
        method: 'POST',
        workspaceId: selectedWorkspace.id,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceMediaAssetId: selectedVideo.id,
          crop,
          targetWidth: 1080,
          targetHeight: 1920,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error?.message || 'Failed to start Reel crop');
      }

      setCropJob(data.job);
      if (data.job?.status === 'completed' && applyCompletedCropJob(data.job)) {
        return;
      }
      await pollCropJob(data.job.id);
    } catch (error: any) {
      setCropJob((current) =>
        current ? { ...current, status: 'failed', error_message: error.message } : null
      );
      toast.error(error.message || 'Failed to prepare Reel');
    }
  };

  const validateBeforePublish = () => {
    if (media.length === 0) throw new Error('Select media before publishing');
    if (postType === 'feed' && (media.length !== 1 || media[0].type !== 'image')) {
      throw new Error('Feed posts require one image');
    }
    if (postType === 'carousel' && (media.length < 2 || media.length > 10)) {
      throw new Error('Carousels require 2-10 media files');
    }
    if (postType === 'reel') {
      if (media.length !== 1 || media[0].type !== 'video') throw new Error('Reels require one video');
      if (reelNeedsCrop) throw new Error('Prepare the Reel crop before publishing');
    }
    if (postType === 'story' && media.length !== 1) {
      throw new Error('Stories require one media file');
    }
    if (caption.length > 2200) throw new Error('Caption must be under 2200 characters');
  };

  const handlePublish = async () => {
    try {
      validateBeforePublish();

      const parsedUserTags = parseJsonArrayInput(userTags, 'User tags');
      const parsedProductTags = parseJsonArrayInput(productTags, 'Product tags');

      setPublishing(true);
      const response = await fetchWithWorkspace('/api/instagram/publish', {
        method: 'POST',
        workspaceId: selectedWorkspace?.id,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          postType,
          assetIds: media.map((item) => item.id),
          caption: postType === 'story' ? '' : caption,
          instagramOptions: {
            altText,
            shareToFeed,
            thumbOffset,
            audioName,
            collaborators,
            userTags: parsedUserTags,
            locationId,
            productTags: parsedProductTags,
            coverAssetId: coverAsset?.id,
            trialParams:
              trialStrategy === 'none'
                ? undefined
                : {
                    graduation_strategy: trialStrategy,
                  },
          },
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error?.message || data?.error || 'Failed to publish Instagram content');
      }

      toast.success(data.message || 'Instagram content published successfully');
      router.push(`/x/instagram/${accountId}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to publish Instagram content');
    } finally {
      setPublishing(false);
    }
  };

  const publishDisabled = useMemo(() => {
    if (publishing || uploading) return true;
    if (postType === 'reel' && (cropJob?.status === 'queued' || cropJob?.status === 'processing')) {
      return true;
    }
    if (postType === 'reel' && reelNeedsCrop) return true;
    return false;
  }, [cropJob?.status, postType, publishing, reelNeedsCrop, uploading]);

  if (loading) return <div className="p-6">Loading...</div>;
  if (!account) return <div className="p-6">Account not found</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push(`/x/instagram/${accountId}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Instagram className="h-8 w-8 text-pink-600" />
          Publish to Instagram
        </h1>
        <p className="text-muted-foreground mt-2">
          Publishing to: <span className="font-semibold">{account.account_name}</span>
        </p>
      </div>

      <Tabs value={postType} onValueChange={resetForPostType} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          {POST_TYPES.map((type) => {
            const Icon = type.icon;
            return (
              <TabsTrigger key={type.id} value={type.id} className="gap-2">
                <Icon className="h-4 w-4" />
                {type.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {POST_TYPES.map((type) => (
          <TabsContent key={type.id} value={type.id} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{type.label}</CardTitle>
                <CardDescription>{type.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <Label>Media</Label>
                      <p className="text-xs text-muted-foreground mt-1">{mediaHint(postType)}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setLibraryMode('media')}
                        disabled={!selectedWorkspace?.id}
                      >
                        <Images className="h-4 w-4 mr-2" />
                        Library
                      </Button>
                      <Button type="button" variant="outline" asChild disabled={uploading}>
                        <label className="cursor-pointer">
                          {uploading ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4 mr-2" />
                          )}
                          Upload
                          <input
                            type="file"
                            accept={postType === 'reel' ? 'video/*' : 'image/*,video/*'}
                            multiple={postType === 'carousel'}
                            className="hidden"
                            onChange={(event) => {
                              void handleUpload(event.target.files);
                              event.target.value = '';
                            }}
                          />
                        </label>
                      </Button>
                    </div>
                  </div>

                  {media.length === 0 ? (
                    <div className="flex min-h-44 flex-col items-center justify-center rounded-lg border border-dashed bg-secondary-50 text-center">
                      <Plus className="h-8 w-8 text-secondary-400" />
                      <p className="mt-2 text-sm text-secondary-600">Choose media from library or upload a file</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {media.map((item) => (
                        <div key={item.id} className="relative aspect-square overflow-hidden rounded-lg bg-secondary-100">
                          {item.type === 'image' ? (
                            <img src={item.url} alt={item.name} className="h-full w-full object-cover" />
                          ) : (
                            <video src={item.url} className="h-full w-full object-cover" muted playsInline />
                          )}
                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            className="absolute right-2 top-2 h-8 w-8 p-0"
                            onClick={() => removeMedia(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {postType === 'reel' && selectedVideo && (
                  <Card className="bg-secondary-50">
                    <CardContent className="pt-6 space-y-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="font-semibold">Reel frame</h3>
                          <p className="text-sm text-muted-foreground">
                            {videoMeta
                              ? `${videoMeta.width}x${videoMeta.height}${reelNeedsCrop ? ' needs 9:16 preparation' : ' is ready for Reel publishing'}`
                              : 'Reading video dimensions...'}
                          </p>
                        </div>
                        {reelNeedsCrop && (
                          <Button
                            type="button"
                            onClick={prepareReel}
                            disabled={cropJob?.status === 'queued' || cropJob?.status === 'processing'}
                          >
                            {cropJob?.status === 'queued' || cropJob?.status === 'processing' ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Film className="h-4 w-4 mr-2" />
                            )}
                            Prepare Reel
                          </Button>
                        )}
                      </div>

                      {videoMeta && reelNeedsCrop && (
                        <div className="space-y-3">
                          <div className="relative mx-auto aspect-video max-h-[420px] overflow-hidden rounded-lg bg-black">
                            <video src={selectedVideo.url} controls className="h-full w-full object-contain" />
                            <div
                              className={cn(
                                'pointer-events-none absolute border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]',
                                videoMeta.width / videoMeta.height > 9 / 16
                                  ? 'top-0 h-full aspect-[9/16]'
                                  : 'left-0 w-full aspect-[9/16]'
                              )}
                              style={
                                videoMeta.width / videoMeta.height > 9 / 16
                                  ? { left: `${cropPosition}%`, transform: 'translateX(-50%)' }
                                  : { top: `${cropPosition}%`, transform: 'translateY(-50%)' }
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="crop-position">Crop frame position</Label>
                            <input
                              id="crop-position"
                              type="range"
                              min={0}
                              max={100}
                              value={cropPosition}
                              onChange={(event) => setCropPosition(Number(event.target.value))}
                              className="w-full"
                            />
                          </div>
                        </div>
                      )}

                      {cropJob && cropJob.status !== 'failed' && cropJob.status !== 'completed' && (
                        <div className="space-y-2">
                          <Progress value={cropJob.progress || 10} className="h-2" />
                          <p className="text-xs text-muted-foreground">Preparing cropped Reel...</p>
                        </div>
                      )}
                      {cropJob?.status === 'failed' && (
                        <p className="text-sm text-red-600">{cropJob.error_message || 'Crop failed'}</p>
                      )}
                    </CardContent>
                  </Card>
                )}

                {postType !== 'story' && (
                  <div className="space-y-2">
                    <Label htmlFor="caption">Caption</Label>
                    <Textarea
                      id="caption"
                      placeholder="Write your caption..."
                      value={caption}
                      onChange={(event) => setCaption(event.target.value)}
                      maxLength={2200}
                      rows={6}
                      disabled={publishing}
                    />
                    <p className="text-xs text-muted-foreground">{caption.length}/2200 characters</p>
                  </div>
                )}

                <Accordion type="single" collapsible>
                  <AccordionItem value="advanced">
                    <AccordionTrigger>Advanced options</AccordionTrigger>
                    <AccordionContent className="grid gap-4 md:grid-cols-2">
                      {postType === 'feed' && (
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="altText">Image alt text</Label>
                          <Input
                            id="altText"
                            value={altText}
                            onChange={(event) => setAltText(event.target.value)}
                            maxLength={1000}
                            placeholder="Describe the image for accessibility"
                          />
                        </div>
                      )}

                      {postType === 'reel' && (
                        <>
                          <div className="space-y-2">
                            <Label>Share to feed</Label>
                            <div className="flex h-10 items-center gap-3">
                              <Switch checked={shareToFeed} onCheckedChange={setShareToFeed} />
                              <span className="text-sm text-muted-foreground">
                                Allow this Reel to also appear in feed
                              </span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="thumbOffset">Thumbnail offset (ms)</Label>
                            <Input
                              id="thumbOffset"
                              type="number"
                              min={0}
                              value={thumbOffset}
                              onChange={(event) => setThumbOffset(event.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="audioName">Audio name</Label>
                            <Input
                              id="audioName"
                              value={audioName}
                              onChange={(event) => setAudioName(event.target.value)}
                              placeholder="Original audio name"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Cover image</Label>
                            <div className="flex gap-2">
                              <Button type="button" variant="outline" onClick={() => setLibraryMode('cover')}>
                                {coverAsset ? 'Change cover' : 'Choose cover'}
                              </Button>
                              {coverAsset && (
                                <Button type="button" variant="ghost" onClick={() => setCoverAsset(null)}>
                                  Remove
                                </Button>
                              )}
                            </div>
                            {coverAsset && <p className="text-xs text-muted-foreground">{coverAsset.name}</p>}
                          </div>
                          <div className="space-y-2">
                            <Label>Trial Reel</Label>
                            <Select value={trialStrategy} onValueChange={(value: any) => setTrialStrategy(value)}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Off</SelectItem>
                                <SelectItem value="MANUAL">Manual graduation</SelectItem>
                                <SelectItem value="SS_PERFORMANCE">Performance graduation</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      )}

                      {postType !== 'story' && (
                        <div className="space-y-2">
                          <Label htmlFor="collaborators">Collaborators</Label>
                          <Input
                            id="collaborators"
                            value={collaborators}
                            onChange={(event) => setCollaborators(event.target.value)}
                            placeholder="username1, username2"
                          />
                        </div>
                      )}

                      {postType !== 'story' && (
                        <div className="space-y-2">
                          <Label htmlFor="locationId">Location Page ID</Label>
                          <Input
                            id="locationId"
                            value={locationId}
                            onChange={(event) => setLocationId(event.target.value)}
                            placeholder="Meta location page ID"
                          />
                        </div>
                      )}

                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="userTags">User tags JSON</Label>
                        <Textarea
                          id="userTags"
                          value={userTags}
                          onChange={(event) => setUserTags(event.target.value)}
                          rows={3}
                          placeholder='[{"username":"example","x":0.5,"y":0.5}]'
                        />
                      </div>

                      {(postType === 'feed' || postType === 'carousel') && (
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="productTags">Product tags JSON</Label>
                          <Textarea
                            id="productTags"
                            value={productTags}
                            onChange={(event) => setProductTags(event.target.value)}
                            rows={3}
                            placeholder='[{"product_id":"123","x":0.5,"y":0.5}]'
                          />
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => router.push(`/x/instagram/${accountId}`)}>
          Cancel
        </Button>
        <Button onClick={handlePublish} disabled={publishDisabled} size="lg">
          {publishing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
          {publishing ? 'Publishing...' : `Publish ${POST_TYPES.find((type) => type.id === postType)?.label}`}
        </Button>
      </div>

      <MediaLibraryModal
        isOpen={libraryMode !== null}
        onClose={() => setLibraryMode(null)}
        workspaceId={selectedWorkspace?.id}
        onSelect={(files) => {
          if (libraryMode === 'cover') {
            const image = files.find((file) => file.type === 'image');
            if (!image) {
              toast.error('Choose an image for the Reel cover');
              return;
            }
            setCoverAsset(image);
          } else {
            applyMediaSelection(files);
          }
        }}
      />
    </div>
  );
}
