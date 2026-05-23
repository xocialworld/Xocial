"use client";
/* eslint-disable @next/next/no-img-element -- Social previews mirror native platform markup and require <img> for accurate styling */

import { Avatar } from "@/components/ui/avatar";
import { Heart, MessageCircle, Music2, Plus, Send, Volume2 } from "lucide-react";
import type { PreviewMedia } from "./types";

interface TikTokPreviewProps {
  content: string;
  mediaItems: PreviewMedia[];
}

export function TikTokPreview({ content, mediaItems }: TikTokPreviewProps) {
  const video = mediaItems.find((item) => item.type === "video" && item.url);
  const image = mediaItems.find((item) => item.type === "image" && item.url);

  return (
    <div className="mx-auto aspect-[9/16] max-h-[620px] w-full max-w-[340px] overflow-hidden rounded-[28px] bg-neutral-950 text-white shadow-sm">
      <div className="relative h-full w-full">
        {video ? (
          <video src={video.url} className="h-full w-full object-cover" muted />
        ) : image ? (
          <img src={image.url} alt="Preview" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-neutral-900 text-sm text-neutral-500">
            Add a video for TikTok
          </div>
        )}

        <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/50 to-transparent px-4 py-4 text-sm font-semibold">
          <span>Following</span>
          <span className="border-b-2 border-white pb-1">For You</span>
          <Volume2 className="h-4 w-4" />
        </div>

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent p-4 pr-16">
          <p className="text-sm font-semibold">@yourbusiness</p>
          {content && (
            <p className="mt-2 max-h-28 overflow-hidden whitespace-pre-wrap text-sm leading-snug">
              {content}
            </p>
          )}
          <div className="mt-3 flex items-center gap-2 text-xs">
            <Music2 className="h-4 w-4" />
            <span className="truncate">Original sound - Your Business</span>
          </div>
        </div>

        <div className="absolute bottom-24 right-3 flex flex-col items-center gap-5 text-xs font-semibold">
          <div className="relative">
            <Avatar className="h-11 w-11 border-2 border-white bg-neutral-800 text-white">
              <span className="text-xs font-bold">YB</span>
            </Avatar>
            <span className="absolute -bottom-2 left-1/2 flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full bg-red-500">
              <Plus className="h-3 w-3" />
            </span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Heart className="h-8 w-8 fill-white" />
            <span>0</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <MessageCircle className="h-8 w-8 fill-white" />
            <span>0</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Send className="h-8 w-8 fill-white" />
            <span>0</span>
          </div>
          <div className="h-9 w-9 rounded-full border border-white/30 bg-neutral-900" />
        </div>
      </div>
    </div>
  );
}
