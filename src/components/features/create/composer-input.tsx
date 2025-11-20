"use client";

import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Sparkles, Upload, Settings2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { AIGenerationOptions } from './unified-post-composer';

type ComposerInputProps = {
    value: string;
    onChange: (value: string) => void;
    onAIGenerate: () => void;
    onMediaUploadToggle: () => void;
    aiOptions: AIGenerationOptions;
    onAIOptionsChange: (options: AIGenerationOptions) => void;
    canUseAI: boolean;
    isGenerating: boolean;
    showMediaUpload: boolean;
};

export function ComposerInput({
    value,
    onChange,
    onAIGenerate,
    onMediaUploadToggle,
    aiOptions,
    onAIOptionsChange,
    canUseAI,
    isGenerating,
    showMediaUpload,
}: ComposerInputProps) {
    const placeholder =
        "Write your caption or describe what you want to create...\n\nExamples:\n• \"Launching our new sustainable water bottles next week\"\n• \"Tips for better time management for entrepreneurs\"\n• \"Behind the scenes of our product photoshoot\"";

    return (
        <div className="rounded-2xl border border-secondary-200 bg-white p-6 shadow-sm">
            <div className="mb-4">
                <Label htmlFor="composer-input" className="text-sm font-medium text-secondary-700">
                    What would you like to create?
                </Label>
                <p className="mt-1 text-xs text-secondary-500">
                    Write your content or describe it for AI to generate platform-specific versions
                </p>
            </div>

            {/* Main Textarea */}
            <Textarea
                id="composer-input"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className={cn(
                    "min-h-[180px] resize-none border-secondary-300 text-base",
                    "focus:border-primary-500 focus:ring-primary-500",
                    "placeholder:text-secondary-400"
                )}
            />

            {/* Character Count */}
            <div className="mt-2 flex items-center justify-between">
                <span className={cn(
                    "text-xs",
                    value.length < 20 ? "text-secondary-400" : "text-secondary-600"
                )}>
                    {value.length} characters
                    {value.length < 20 && " (min. 20 for AI generation)"}
                </span>
            </div>

            {/* Action Buttons */}
            <div className="mt-4 flex flex-wrap gap-3">
                {/* AI Generate Button */}
                <Button
                    onClick={onAIGenerate}
                    disabled={!canUseAI || isGenerating}
                    className={cn(
                        "gap-2 bg-gradient-to-r from-primary-600 to-primary-700",
                        "hover:from-primary-700 hover:to-primary-800",
                        "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                >
                    {isGenerating ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Generating...
                        </>
                    ) : (
                        <>
                            <Sparkles className="h-4 w-4" />
                            Generate with AI
                        </>
                    )}
                </Button>

                {/* Media Upload Button */}
                <Button
                    onClick={onMediaUploadToggle}
                    variant="outline"
                    className={cn(
                        "gap-2",
                        showMediaUpload && "bg-secondary-50 border-primary-500 text-primary-700"
                    )}
                >
                    <Upload className="h-4 w-4" />
                    {showMediaUpload ? 'Hide' : 'Add'} Media
                </Button>

                {/* AI Options Popover */}
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className="gap-2">
                            <Settings2 className="h-4 w-4" />
                            AI Options
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80" align="start">
                        <div className="space-y-4">
                            <div>
                                <h4 className="font-medium text-sm mb-3">AI Generation Settings</h4>
                            </div>

                            {/* Tone */}
                            <div className="space-y-2">
                                <Label htmlFor="tone" className="text-xs text-secondary-600">
                                    Tone
                                </Label>
                                <Select
                                    value={aiOptions.tone || 'professional'}
                                    onValueChange={(value) => onAIOptionsChange({ ...aiOptions, tone: value })}
                                >
                                    <SelectTrigger id="tone">
                                        <SelectValue placeholder="Select tone" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="professional">💼 Professional</SelectItem>
                                        <SelectItem value="casual">😊 Casual</SelectItem>
                                        <SelectItem value="playful">🎉 Playful</SelectItem>
                                        <SelectItem value="inspirational">✨ Inspirational</SelectItem>
                                        <SelectItem value="educational">📚 Educational</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Audience */}
                            <div className="space-y-2">
                                <Label htmlFor="audience" className="text-xs text-secondary-600">
                                    Target Audience
                                </Label>
                                <Select
                                    value={aiOptions.audience || 'general'}
                                    onValueChange={(value) => onAIOptionsChange({ ...aiOptions, audience: value })}
                                >
                                    <SelectTrigger id="audience">
                                        <SelectValue placeholder="Select audience" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="gen-z">Gen Z (18-24)</SelectItem>
                                        <SelectItem value="millennials">Millennials (25-40)</SelectItem>
                                        <SelectItem value="professionals">Professionals (25-55)</SelectItem>
                                        <SelectItem value="general">General Audience</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Length */}
                            <div className="space-y-2">
                                <Label htmlFor="length" className="text-xs text-secondary-600">
                                    Content Length
                                </Label>
                                <Select
                                    value={aiOptions.length || 'medium'}
                                    onValueChange={(value) => onAIOptionsChange({ ...aiOptions, length: value })}
                                >
                                    <SelectTrigger id="length">
                                        <SelectValue placeholder="Select length" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="short">Short & Punchy</SelectItem>
                                        <SelectItem value="medium">Medium</SelectItem>
                                        <SelectItem value="long">Long & Detailed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>
            </div>

            {/* Hint Text */}
            {!canUseAI && value.length > 0 && value.length < 20 && (
                <p className="mt-3 text-xs text-amber-600 flex items-center gap-1.5">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
                    Add {20 - value.length} more characters to use AI generation
                </p>
            )}
        </div>
    );
}
