'use client';

import { Avatar } from '@/components/ui/avatar';
import { ThumbsUp, ThumbsDown, Share2, MoreHorizontal, Bell } from 'lucide-react';

interface YouTubePreviewProps {
  content: string;
  mediaFiles: File[];
}

export function YouTubePreview({ content, mediaFiles }: YouTubePreviewProps) {
  const hasVideo = mediaFiles.some(f => f.type.startsWith('video/'));
  const thumbnail = mediaFiles.find(f => f.type.startsWith('image/'));

  return (
    <div className="bg-white rounded-lg overflow-hidden">
      {/* Video Player Area */}
      <div className="relative aspect-video bg-black">
        {hasVideo ? (
          <video
            src={URL.createObjectURL(mediaFiles.find(f => f.type.startsWith('video/'))!)}
            className="w-full h-full"
            controls
          />
        ) : thumbnail ? (
          <img
            src={URL.createObjectURL(thumbnail)}
            alt="Thumbnail"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white">
            <span className="text-gray-500">Video player</span>
          </div>
        )}
      </div>

      {/* Video Info */}
      <div className="p-4 space-y-4">
        {/* Title */}
        {content && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
              {content.split('\n')[0] || 'Your Video Title'}
            </h3>
          </div>
        )}

        {/* Channel Info & Actions */}
        <div className="flex items-start gap-4">
          <Avatar className="w-10 h-10 bg-red-600 text-white">
            <span className="text-sm font-semibold">YB</span>
          </Avatar>
          <div className="flex-1">
            <div className="font-medium text-gray-900">Your Business</div>
            <div className="text-sm text-gray-600">0 subscribers</div>
          </div>
          <button className="px-4 py-2 bg-gray-900 text-white rounded-full font-medium text-sm hover:bg-gray-800 flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Subscribe
          </button>
        </div>

        {/* Engagement Buttons */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-gray-100 rounded-full overflow-hidden">
            <button className="flex items-center gap-2 px-4 py-2 hover:bg-gray-200">
              <ThumbsUp className="w-5 h-5" />
              <span className="font-medium">0</span>
            </button>
            <div className="w-px h-6 bg-gray-300" />
            <button className="px-4 py-2 hover:bg-gray-200">
              <ThumbsDown className="w-5 h-5" />
            </button>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full hover:bg-gray-200">
            <Share2 className="w-5 h-5" />
            <span className="font-medium">Share</span>
          </button>
          <button className="px-4 py-2 bg-gray-100 rounded-full hover:bg-gray-200">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>

        {/* Description */}
        {content && content.includes('\n') && (
          <div className="bg-gray-100 rounded-lg p-3">
            <div className="text-sm font-medium text-gray-900 mb-1">
              0 views · Just now
            </div>
            <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-3">
              {content}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

