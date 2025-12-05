"use client";

import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Sparkles, Upload, Settings2, Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import type { AIGenerationOptions } from './unified-post-composer';
import { useEffect, useState } from 'react';
import { MediaUploadZone } from './media-upload-zone';
import type { MediaFile } from '@/types';

import { AI_MODELS, DEFAULT_AI_MODEL, type AIModelCategory } from '@/lib/ai/models';

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
    media: MediaFile[];
    onUpload: (files: File[]) => void;
    onRemove: (mediaId: string) => void;
    onBrowseLibrary: () => void;
};

const MODEL_CATEGORIES: { id: AIModelCategory; label: string }[] = [
    { id: 'recommended', label: 'Recommended (Best Value)' },
    { id: 'premium', label: 'Premium (High Intelligence)' },
    { id: 'standard', label: 'Other Models' },
];

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
    media,
    onUpload,
    onRemove,
    onBrowseLibrary,
}: ComposerInputProps) {
    const placeholder =
        "Write your caption or describe what you want to create...\n\nExamples:\n• \"Launching our new sustainable water bottles next week\"\n• \"Tips for better time management for entrepreneurs\"\n• \"Behind the scenes of our product photoshoot\"";

    const currentModelId = aiOptions.model || DEFAULT_AI_MODEL;

    const [gatewayModels, setGatewayModels] = useState<{ providers: Record<string, any[]>; models: any[] } | null>(null);
    const [modelsLoading, setModelsLoading] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [isOptionsOpen, setIsOptionsOpen] = useState(false);
    useEffect(() => {
        let cancelled = false;
        setMounted(true);
        async function load() {
            try {
                setModelsLoading(true);
                const res = await fetch('/api/ai/models');
                const json = await res.json();
                if (!cancelled && json?.success !== false) {
                    setGatewayModels(json.data);
                }
            } catch { }
            finally { if (!cancelled) setModelsLoading(false); }
        }
        load();
        return () => { cancelled = true; };
    }, []);

    return (
        <div className="rounded-2xl border border-secondary-200 bg-white p-6 shadow-sm">
            <div className="mb-4">
                <Label htmlFor="composer-input" className="text-sm font-medium text-secondary-700">
                    Caption / AI Prompt
                </Label>
                <p className="mt-1 text-xs text-secondary-500">
                    Write your post caption directly, or describe it for AI generation
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

                {/* AI Options Dialog */}
                {mounted && (
                    <>
                        <Button
                            variant="outline"
                            className="gap-2"
                            onClick={() => setIsOptionsOpen(true)}
                        >
                            <Settings2 className="h-4 w-4" />
                            AI Options
                        </Button>

                        <Dialog open={isOptionsOpen} onOpenChange={setIsOptionsOpen}>
                            <DialogContent onClose={() => setIsOptionsOpen(false)} className="sm:max-w-[500px] max-h-[85vh] flex flex-col">
                                <DialogHeader>
                                    <DialogTitle>AI Generation Settings</DialogTitle>
                                    <DialogDescription>
                                        Customize the model, tone, and audience for your content.
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="space-y-6 overflow-y-auto pr-2 flex-1 mt-4">
                                    {/* Model Selector */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-sm font-medium text-secondary-900">AI Model</Label>
                                            {modelsLoading && <Loader2 className="h-3 w-3 animate-spin text-secondary-400" />}
                                        </div>

                                        <div className="grid gap-2">
                                            {gatewayModels ? (
                                                Object.entries(gatewayModels.providers).map(([provider, models]) => (
                                                    <div key={provider} className="space-y-2">
                                                        <Label className="text-[10px] font-bold text-secondary-400 uppercase tracking-wider pl-1">
                                                            {provider}
                                                        </Label>
                                                        <div className="grid gap-2">
                                                            {models.map((model: any) => (
                                                                <div
                                                                    key={model.id}
                                                                    className={cn(
                                                                        "relative flex items-start justify-between rounded-lg border p-3 text-sm transition-all cursor-pointer hover:bg-secondary-50",
                                                                        currentModelId === model.id
                                                                            ? "border-primary-500 bg-primary-50 ring-1 ring-primary-500"
                                                                            : "border-secondary-200"
                                                                    )}
                                                                    onClick={() => onAIOptionsChange({ ...aiOptions, model: model.id })}
                                                                >
                                                                    <div className="flex-1 pr-2">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="font-medium text-secondary-900">{model.label}</span>
                                                                            {currentModelId === model.id && (
                                                                                <Check className="h-3 w-3 text-primary-600" />
                                                                            )}
                                                                        </div>
                                                                        <div className="text-xs text-secondary-500 mt-0.5 leading-relaxed">
                                                                            {model.description}
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-[10px] font-medium text-primary-600 bg-primary-50 px-2 py-1 rounded-md whitespace-nowrap">
                                                                        {(model.priceHint || '').split('/')[0]}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                MODEL_CATEGORIES.map((category) => {
                                                    const categoryModels = AI_MODELS.filter(m => m.category === category.id);
                                                    if (categoryModels.length === 0) return null;
                                                    return (
                                                        <div key={category.id} className="space-y-2">
                                                            <Label className="text-[10px] font-bold text-secondary-400 uppercase tracking-wider pl-1">
                                                                {category.label}
                                                            </Label>
                                                            <div className="grid gap-2">
                                                                {categoryModels.map((model) => (
                                                                    <div
                                                                        key={model.id}
                                                                        className={cn(
                                                                            "relative flex items-start justify-between rounded-lg border p-3 text-sm transition-all cursor-pointer hover:bg-secondary-50",
                                                                            currentModelId === model.id
                                                                                ? "border-primary-500 bg-primary-50 ring-1 ring-primary-500"
                                                                                : "border-secondary-200"
                                                                        )}
                                                                        onClick={() => onAIOptionsChange({ ...aiOptions, model: model.id })}
                                                                    >
                                                                        <div className="flex-1 pr-2">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="font-medium text-secondary-900">{model.label}</span>
                                                                            {model.isNew && (
                                                                                <span className="px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold">NEW</span>
                                                                            )}
                                                                            {currentModelId === model.id && (
                                                                                <Check className="h-3 w-3 text-primary-600" />
                                                                            )}
                                                                        </div>
                                                                        <div className="text-xs text-secondary-500 mt-0.5 leading-relaxed">{model.description}</div>
                                                                    </div>
                                                                        <div className="text-[10px] font-medium text-primary-600 bg-primary-50 px-2 py-1 rounded-md whitespace-nowrap">{model.priceHint.split('/')[0]}</div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>

                                    <div className="h-px bg-secondary-100" />

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {/* Tone */}
                                        <div className="space-y-2">
                                            <Label htmlFor="tone" className="text-xs font-medium text-secondary-700">
                                                Tone
                                            </Label>
                                            <Select
                                                value={aiOptions.tone || 'professional'}
                                                onValueChange={(value) => onAIOptionsChange({ ...aiOptions, tone: value })}
                                            >
                                                <SelectTrigger id="tone">
                                                    <SelectValue placeholder="Select tone" />
                                                </SelectTrigger>
                                                <SelectContent className="z-[60]">
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
                                            <Label htmlFor="audience" className="text-xs font-medium text-secondary-700">
                                                Target Audience
                                            </Label>
                                            <Select
                                                value={aiOptions.audience || 'general'}
                                                onValueChange={(value) => onAIOptionsChange({ ...aiOptions, audience: value })}
                                            >
                                                <SelectTrigger id="audience">
                                                    <SelectValue placeholder="Select audience" />
                                                </SelectTrigger>
                                                <SelectContent className="z-[60]">
                                                    <SelectItem value="gen-z">Gen Z (18-24)</SelectItem>
                                                    <SelectItem value="millennials">Millennials (25-40)</SelectItem>
                                                    <SelectItem value="professionals">Professionals (25-55)</SelectItem>
                                                    <SelectItem value="general">General Audience</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Length */}
                                        <div className="space-y-2 sm:col-span-2">
                                            <Label htmlFor="length" className="text-xs font-medium text-secondary-700">
                                                Content Length
                                            </Label>
                                            <Select
                                                value={aiOptions.length || 'medium'}
                                                onValueChange={(value) => onAIOptionsChange({ ...aiOptions, length: value })}
                                            >
                                                <SelectTrigger id="length">
                                                    <SelectValue placeholder="Select length" />
                                                </SelectTrigger>
                                                <SelectContent className="z-[60]">
                                                    <SelectItem value="short">Short & Punchy</SelectItem>
                                                    <SelectItem value="medium">Medium</SelectItem>
                                                    <SelectItem value="long">Long & Detailed</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </>
                )}
            </div>

            {/* Hint Text */}
            {!canUseAI && value.length > 0 && value.length < 20 && (
                <p className="mt-3 text-xs text-amber-600 flex items-center gap-1.5">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
                    Add {20 - value.length} more characters to use AI generation
                </p>
            )}

            {/* Media Upload Zone */}
            {showMediaUpload && (
                <div className="mt-4 border-t border-secondary-100 pt-4">
                    <MediaUploadZone
                        media={media}
                        onUpload={onUpload}
                        onRemove={onRemove}
                        onBrowseLibrary={onBrowseLibrary}
                    />
                </div>
            )}
        </div>
    );
}
