"use client";

import { useState } from "react";
import {
    X,
    Copy,
    Edit,
    Trash2,
    Eye,
    Calendar,
    Instagram,
    Facebook,
    Twitter,
    Linkedin,
    Youtube,
    Clock,
    Tag,
    MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { InstagramPreview } from "@/components/previews/instagram-preview";
import { TwitterPreview } from "@/components/previews/twitter-preview";
import { FacebookPreview } from "@/components/previews/facebook-preview";

interface Template {
    id: string;
    name: string;
    description?: string;
    content: string;
    platforms: string[];
    category: string;
    tags?: string[];
    usageCount?: number;
    createdAt: Date;
    updatedAt: Date;
}

interface TemplatePreviewModalProps {
    open: boolean;
    onClose: () => void;
    template: Template | null;
    onUse?: (template: Template) => void;
    onEdit?: (template: Template) => void;
    onDuplicate?: (template: Template) => void;
    onDelete?: (template: Template) => void;
}

const platformIcons: Record<string, typeof Instagram> = {
    instagram: Instagram,
    facebook: Facebook,
    twitter: Twitter,
    linkedin: Linkedin,
    youtube: Youtube,
};

const platformColors: Record<string, string> = {
    instagram: "text-pink-600 bg-pink-50 border-pink-200",
    facebook: "text-blue-600 bg-blue-50 border-blue-200",
    twitter: "text-sky-600 bg-sky-50 border-sky-200",
    linkedin: "text-indigo-600 bg-indigo-50 border-indigo-200",
    youtube: "text-red-600 bg-red-50 border-red-200",
};

export function TemplatePreviewModal({
    open,
    onClose,
    template,
    onUse,
    onEdit,
    onDuplicate,
    onDelete,
}: TemplatePreviewModalProps) {
    const [previewPlatform, setPreviewPlatform] = useState<string>("instagram");

    if (!template) return null;

    const renderPreview = () => {
        switch (previewPlatform) {
            case "instagram":
                return (
                    <InstagramPreview
                        content={template.content}
                        username="your_brand"
                        className="mx-auto"
                    />
                );
            case "twitter":
                return (
                    <TwitterPreview
                        content={template.content}
                        displayName="Your Brand"
                        username="yourbrand"
                        className="mx-auto"
                    />
                );
            case "facebook":
                return (
                    <FacebookPreview
                        content={template.content}
                        pageName="Your Brand"
                        className="mx-auto"
                    />
                );
            default:
                return (
                    <div className="bg-secondary-50 rounded-lg p-6 text-center text-secondary-500">
                        Preview not available for {previewPlatform}
                    </div>
                );
        }
    };

    return (
        <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader className="border-b border-secondary-200 pb-4">
                    <div className="flex items-start justify-between">
                        <div>
                            <DialogTitle className="text-xl font-semibold text-secondary-900">
                                {template.name}
                            </DialogTitle>
                            {template.description && (
                                <p className="text-sm text-secondary-500 mt-1">
                                    {template.description}
                                </p>
                            )}
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-auto grid md:grid-cols-2 gap-6 py-4">
                    {/* Left: Template Details */}
                    <div className="space-y-4">
                        {/* Category & Tags */}
                        <div>
                            <h4 className="text-sm font-medium text-secondary-700 mb-2">Category</h4>
                            <Badge variant="secondary" className="capitalize">
                                {template.category}
                            </Badge>
                        </div>

                        {template.tags && template.tags.length > 0 && (
                            <div>
                                <h4 className="text-sm font-medium text-secondary-700 mb-2">Tags</h4>
                                <div className="flex flex-wrap gap-1">
                                    {template.tags.map((tag) => (
                                        <Badge key={tag} variant="outline" className="text-xs">
                                            <Tag className="h-3 w-3 mr-1" />
                                            {tag}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Platforms */}
                        <div>
                            <h4 className="text-sm font-medium text-secondary-700 mb-2">Platforms</h4>
                            <div className="flex flex-wrap gap-2">
                                {template.platforms.map((platform) => {
                                    const Icon = platformIcons[platform] || Calendar;
                                    return (
                                        <span
                                            key={platform}
                                            className={cn(
                                                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border capitalize",
                                                platformColors[platform] || "bg-secondary-50 text-secondary-600"
                                            )}
                                        >
                                            <Icon className="h-3.5 w-3.5" />
                                            {platform}
                                        </span>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Content Text */}
                        <div>
                            <h4 className="text-sm font-medium text-secondary-700 mb-2">Content</h4>
                            <div className="bg-secondary-50 rounded-lg p-4 text-sm text-secondary-700 whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                                {template.content}
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-4 text-xs text-secondary-500 pt-2 border-t border-secondary-100">
                            <span className="flex items-center gap-1">
                                <Eye className="h-3.5 w-3.5" />
                                Used {template.usageCount || 0} times
                            </span>
                            <span className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                Updated {template.updatedAt.toLocaleDateString()}
                            </span>
                        </div>
                    </div>

                    {/* Right: Platform Preview */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium text-secondary-700">Preview</h4>
                            <div className="flex gap-1">
                                {template.platforms.slice(0, 3).map((platform) => {
                                    const Icon = platformIcons[platform] || Calendar;
                                    return (
                                        <button
                                            key={platform}
                                            onClick={() => setPreviewPlatform(platform)}
                                            className={cn(
                                                "p-2 rounded-lg transition-colors",
                                                previewPlatform === platform
                                                    ? "bg-primary-100 text-primary-600"
                                                    : "text-secondary-400 hover:text-secondary-600 hover:bg-secondary-100"
                                            )}
                                            title={`Preview on ${platform}`}
                                        >
                                            <Icon className="h-4 w-4" />
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="bg-secondary-100/50 rounded-xl p-4 flex items-center justify-center min-h-[300px]">
                            {renderPreview()}
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="border-t border-secondary-200 pt-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {onDuplicate && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onDuplicate(template)}
                                className="gap-1.5"
                            >
                                <Copy className="h-4 w-4" />
                                Duplicate
                            </Button>
                        )}
                        {onEdit && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onEdit(template)}
                                className="gap-1.5"
                            >
                                <Edit className="h-4 w-4" />
                                Edit
                            </Button>
                        )}
                        {onDelete && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onDelete(template)}
                                className="gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                            >
                                <Trash2 className="h-4 w-4" />
                                Delete
                            </Button>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={onClose}>
                            Close
                        </Button>
                        {onUse && (
                            <Button onClick={() => onUse(template)}>
                                Use Template
                            </Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
