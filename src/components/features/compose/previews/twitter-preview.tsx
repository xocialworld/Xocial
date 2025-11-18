'use client';
/* eslint-disable @next/next/no-img-element -- Social previews mirror native platform markup and require <img> for accurate styling */

import { Avatar } from '@/components/ui/avatar';
import { MessageCircle, Repeat2, Heart, BarChart3, Share, MoreHorizontal } from 'lucide-react';
import type { PreviewMedia } from './types';

interface TwitterPreviewProps {
  content: string;
  mediaItems: PreviewMedia[];
}

export function TwitterPreview({ content, mediaItems }: TwitterPreviewProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden max-w-xl mx-auto">
      <div className="p-4">
        {/* Tweet Header */}
        <div className="flex gap-3">
          <Avatar className="w-10 h-10 bg-sky-500 text-white">
            <span className="text-sm font-semibold">YB</span>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-900">Your Business</span>
              <span className="text-gray-500 text-sm">@yourbusiness · now</span>
              <button className="ml-auto text-gray-500 hover:text-gray-700">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>

            {/* Tweet Content */}
            {content && (
              <p className="text-gray-900 text-[15px] mt-1 whitespace-pre-wrap">
                {content}
              </p>
            )}

            {/* Media Preview */}
            {mediaItems.length > 0 && (
              <div className={`
                mt-3 rounded-2xl overflow-hidden border border-gray-200
                ${mediaItems.length === 1 ? 'grid-cols-1' : 'grid grid-cols-2 gap-0.5'}
              `}>
                {mediaItems.slice(0, 4).map((item, index) => (
                  <div 
                    key={index} 
                    className={`
                      relative bg-gray-100
                      ${mediaItems.length === 1 ? 'aspect-video' : 'aspect-square'}
                    `}
                  >
                    {item.type === 'image' && item.url && (
                      <img
                        src={item.url}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    )}
                    {item.type === 'video' && item.url && (
                      <video
                        src={item.url}
                        className="w-full h-full object-cover"
                      />
                    )}
                    {mediaItems.length > 4 && index === 3 && (
                      <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
                        <span className="text-white text-2xl font-bold">
                          +{mediaItems.length - 4}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Tweet Actions */}
            <div className="flex items-center justify-between mt-3 text-gray-500">
              <button className="flex items-center gap-2 hover:text-sky-500 group">
                <div className="p-2 rounded-full group-hover:bg-sky-50 transition-colors">
                  <MessageCircle className="w-[18px] h-[18px]" />
                </div>
                <span className="text-sm">0</span>
              </button>
              <button className="flex items-center gap-2 hover:text-green-500 group">
                <div className="p-2 rounded-full group-hover:bg-green-50 transition-colors">
                  <Repeat2 className="w-[18px] h-[18px]" />
                </div>
                <span className="text-sm">0</span>
              </button>
              <button className="flex items-center gap-2 hover:text-pink-500 group">
                <div className="p-2 rounded-full group-hover:bg-pink-50 transition-colors">
                  <Heart className="w-[18px] h-[18px]" />
                </div>
                <span className="text-sm">0</span>
              </button>
              <button className="flex items-center gap-2 hover:text-sky-500 group">
                <div className="p-2 rounded-full group-hover:bg-sky-50 transition-colors">
                  <BarChart3 className="w-[18px] h-[18px]" />
                </div>
              </button>
              <button className="hover:text-sky-500 group">
                <div className="p-2 rounded-full group-hover:bg-sky-50 transition-colors">
                  <Share className="w-[18px] h-[18px]" />
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

