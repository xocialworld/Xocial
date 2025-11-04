'use client';

import { Avatar } from '@/components/ui/avatar';
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal } from 'lucide-react';

interface InstagramPreviewProps {
  content: string;
  mediaFiles: File[];
}

export function InstagramPreview({ content, mediaFiles }: InstagramPreviewProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden max-w-md mx-auto">
      {/* Post Header */}
      <div className="p-3 flex items-center gap-3">
        <Avatar className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 text-white">
          <span className="text-xs font-semibold">YB</span>
        </Avatar>
        <div className="flex-1">
          <span className="font-semibold text-sm text-gray-900">yourbusiness</span>
        </div>
        <button className="text-gray-900">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* Media Preview */}
      {mediaFiles.length > 0 ? (
        <div className="relative aspect-square bg-gray-100">
          {mediaFiles[0].type.startsWith('image/') && (
            <img
              src={URL.createObjectURL(mediaFiles[0])}
              alt="Preview"
              className="w-full h-full object-cover"
            />
          )}
          {mediaFiles[0].type.startsWith('video/') && (
            <video
              src={URL.createObjectURL(mediaFiles[0])}
              className="w-full h-full object-cover"
            />
          )}
          {mediaFiles.length > 1 && (
            <div className="absolute top-4 right-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-xs font-medium">
              1/{mediaFiles.length}
            </div>
          )}
        </div>
      ) : (
        <div className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
          <p className="text-gray-400 text-sm">Add images or videos</p>
        </div>
      )}

      {/* Post Actions */}
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button>
              <Heart className="w-6 h-6 text-gray-900" />
            </button>
            <button>
              <MessageCircle className="w-6 h-6 text-gray-900" />
            </button>
            <button>
              <Send className="w-6 h-6 text-gray-900" />
            </button>
          </div>
          <button>
            <Bookmark className="w-6 h-6 text-gray-900" />
          </button>
        </div>

        {/* Caption */}
        {content && (
          <div className="text-sm">
            <span className="font-semibold text-gray-900">yourbusiness </span>
            <span className="text-gray-900">{content}</span>
          </div>
        )}

        <div className="text-xs text-gray-500 uppercase">
          Just now
        </div>
      </div>
    </div>
  );
}

