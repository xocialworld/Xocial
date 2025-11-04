'use client';

import { Avatar } from '@/components/ui/avatar';
import { ThumbsUp, MessageCircle, Repeat2, Send, MoreHorizontal } from 'lucide-react';

interface LinkedInPreviewProps {
  content: string;
  mediaFiles: File[];
}

export function LinkedInPreview({ content, mediaFiles }: LinkedInPreviewProps) {
  return (
    <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
      {/* Post Header */}
      <div className="p-4 flex items-start gap-3">
        <Avatar className="w-12 h-12 bg-blue-700 text-white">
          <span className="text-sm font-semibold">YB</span>
        </Avatar>
        <div className="flex-1">
          <div className="font-semibold text-gray-900">Your Business</div>
          <div className="text-sm text-gray-500">Company Page</div>
          <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
            <span>Just now</span>
            <span>•</span>
            <span>🌐</span>
          </div>
        </div>
        <button className="text-gray-600 hover:text-gray-800">
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
        <div className="bg-gray-100">
          {mediaFiles[0].type.startsWith('image/') && (
            <img
              src={URL.createObjectURL(mediaFiles[0])}
              alt="Preview"
              className="w-full max-h-96 object-contain"
            />
          )}
          {mediaFiles[0].type.startsWith('video/') && (
            <video
              src={URL.createObjectURL(mediaFiles[0])}
              className="w-full max-h-96 object-contain"
              controls
            />
          )}
          {mediaFiles.length > 1 && (
            <div className="px-4 py-2 bg-white border-t border-gray-200">
              <p className="text-sm text-gray-600">
                +{mediaFiles.length - 1} more media file{mediaFiles.length > 2 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Engagement Stats */}
      <div className="px-4 py-2 flex items-center justify-between text-sm text-gray-600 border-t border-gray-200">
        <div className="flex items-center gap-1">
          <span className="text-xs">👍 0</span>
        </div>
        <div className="flex items-center gap-3">
          <span>0 comments</span>
        </div>
      </div>

      {/* Post Actions */}
      <div className="border-t border-gray-200">
        <div className="flex items-center justify-around">
          <button className="flex items-center gap-2 px-4 py-3 hover:bg-gray-50 flex-1 justify-center">
            <ThumbsUp className="w-5 h-5 text-gray-600" />
            <span className="text-gray-700 font-medium text-sm">Like</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-3 hover:bg-gray-50 flex-1 justify-center">
            <MessageCircle className="w-5 h-5 text-gray-600" />
            <span className="text-gray-700 font-medium text-sm">Comment</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-3 hover:bg-gray-50 flex-1 justify-center">
            <Repeat2 className="w-5 h-5 text-gray-600" />
            <span className="text-gray-700 font-medium text-sm">Repost</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-3 hover:bg-gray-50 flex-1 justify-center">
            <Send className="w-5 h-5 text-gray-600" />
            <span className="text-gray-700 font-medium text-sm">Send</span>
          </button>
        </div>
      </div>
    </div>
  );
}

