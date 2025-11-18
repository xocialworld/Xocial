'use client';

import { TextArea } from '@/components/ui/textarea';
import { AlertCircle } from 'lucide-react';

interface ContentEditorProps {
  value: string;
  onChange: (value: string) => void;
  platforms: string[];
  getCharacterLimit: (platform: string) => number;
}

export function ContentEditor({ value, onChange, platforms, getCharacterLimit }: ContentEditorProps) {
  const characterCount = value.length;
  
  // Get the most restrictive limit among selected platforms
  const limits = platforms.map(p => ({
    platform: p,
    limit: getCharacterLimit(p),
    remaining: getCharacterLimit(p) - characterCount,
  }));
  
  const mostRestrictive = limits.length > 0
    ? limits.reduce((min, curr) => curr.limit < min.limit ? curr : min)
    : null;

  const isOverLimit = mostRestrictive && mostRestrictive.remaining < 0;

  return (
    <div className="space-y-3">
      <TextArea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="What's on your mind? Share your thoughts..."
        rows={8}
        className={`resize-none ${isOverLimit ? 'border-red-300 focus:border-red-500' : ''}`}
      />
      
      <div className="flex items-center justify-between text-sm">
        <div>
          {platforms.length > 0 ? (
            <span className="text-gray-600">
              {characterCount} / {mostRestrictive?.limit} characters
            </span>
          ) : (
            <span className="text-gray-400">
              Select platforms to see character limits
            </span>
          )}
        </div>
        
        {mostRestrictive && (
          <div className={`
            font-medium
            ${isOverLimit ? 'text-red-600' : mostRestrictive.remaining < 50 ? 'text-yellow-600' : 'text-gray-600'}
          `}>
            {mostRestrictive.remaining} remaining
          </div>
        )}
      </div>

      {isOverLimit && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">
              Content exceeds character limit
            </p>
            <p className="text-sm text-red-600 mt-1">
              Your content is {Math.abs(mostRestrictive.remaining)} characters too long for {mostRestrictive.platform}
            </p>
          </div>
        </div>
      )}

      {/* Platform-specific limits */}
      {platforms.length > 1 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-700">Platform Limits:</p>
          <div className="grid grid-cols-2 gap-2">
            {limits.map(({ platform, limit, remaining }) => (
              <div
                key={platform}
                className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded text-xs"
              >
                <span className="capitalize font-medium text-gray-700">
                  {platform}
                </span>
                <span className={`
                  font-medium
                  ${remaining < 0 ? 'text-red-600' : remaining < 50 ? 'text-yellow-600' : 'text-gray-600'}
                `}>
                  {remaining < 0 ? remaining : `${remaining} left`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

