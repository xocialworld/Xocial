'use client';

import { FacebookPreview } from './previews/facebook-preview';
import { InstagramPreview } from './previews/instagram-preview';
import { TwitterPreview } from './previews/twitter-preview';
import { LinkedInPreview } from './previews/linkedin-preview';
import { YouTubePreview } from './previews/youtube-preview';
import type { PreviewMedia } from './previews/types';

interface PreviewPanelProps {
  platform: string;
  content: string;
  mediaItems: PreviewMedia[];
}

export function PreviewPanel({ platform, content, mediaItems }: PreviewPanelProps) {
  if (!content && mediaItems.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>Start typing to see a preview</p>
      </div>
    );
  }

  const previewProps = { content, mediaItems };

  switch (platform.toLowerCase()) {
    case 'facebook':
      return <FacebookPreview {...previewProps} />;
    case 'instagram':
      return <InstagramPreview {...previewProps} />;
    case 'twitter':
      return <TwitterPreview {...previewProps} />;
    case 'linkedin':
      return <LinkedInPreview {...previewProps} />;
    case 'youtube':
      return <YouTubePreview {...previewProps} />;
    default:
      return (
        <div className="text-center py-12 text-gray-500">
          <p>Select a platform to see preview</p>
        </div>
      );
  }
}

