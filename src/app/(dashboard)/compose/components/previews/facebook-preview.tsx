'use client';

import { Avatar } from '@/components/ui/avatar';
import { ThumbsUp, MessageCircle, Share2, MoreHorizontal } from 'lucide-react';

interface FacebookPreviewProps {
  content: string;
  mediaFiles: File[];
}

export function FacebookPreview({ content, mediaFiles }: FacebookPreviewProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
      {/* Post Header */}
      <div className="p-4 flex items-start gap-3">
        <Avatar className="w-10 h-10 bg-blue-500 text-white">
          <span className="text-sm font-semibold">YB</span>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900">Your Business</span>
            <span className="text-gray-500 text-sm">• Just now</span>
          </div>
          <div className="text-gray-500 text-xs">🌐 Public</div>
        </div>
        <button className="text-gray-500 hover:text-gray-700">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* Post Content */}
      {content && (
        <div className="px-4 pb-3">
          <p className="text-gray-900 whitespace-pre-wrap">{content}</p>
        </div>
      )}

      {/* Media Preview */}
      {mediaFiles.length > 0 && (
        <div className={`
          grid gap-0.5
          ${mediaFiles.length === 1 ? 'grid-cols-1' : mediaFiles.length === 2 ? 'grid-cols-2' : 'grid-cols-2'}
        `}>
          {mediaFiles.slice(0, 4).map((file, index) => (
            <div key={index} className="relative aspect-square bg-gray-100">
              {file.type.startsWith('image/') && (
                <img
                  src={URL.createObjectURL(file)}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              )}
              {file.type.startsWith('video/') && (
                <video
                  src={URL.createObjectURL(file)}
                  className="w-full h-full object-cover"
                />
              )}
              {mediaFiles.length > 4 && index === 3 && (
                <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
                  <span className="text-white text-3xl font-bold">
                    +{mediaFiles.length - 4}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Post Actions */}
      <div className="border-t border-gray-200">
        <div className="flex items-center justify-around p-1">
          <button className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 rounded-lg flex-1 justify-center">
            <ThumbsUp className="w-5 h-5 text-gray-600" />
            <span className="text-gray-700 font-medium">Like</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 rounded-lg flex-1 justify-center">
            <MessageCircle className="w-5 h-5 text-gray-600" />
            <span className="text-gray-700 font-medium">Comment</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 rounded-lg flex-1 justify-center">
            <Share2 className="w-5 h-5 text-gray-600" />
            <span className="text-gray-700 font-medium">Share</span>
          </button>
        </div>
      </div>
    </div>
  );
}

