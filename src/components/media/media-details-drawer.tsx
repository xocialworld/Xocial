"use client";

import { useRef } from "react";
import Image from "next/image";
import {
    X,
    Image as ImageIcon,
    Video,
    Calendar,
    Tag,
    Copy,
    Download,
    Trash2,
    ExternalLink,
    Loader2,
    Check,
    Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";

interface MediaFile {
    id: string;
    filename: string;
    original_filename?: string;
    file_size: number;
    mime_type: string;
    file_type: "image" | "video";
    url: string;
    thumbnail_url: string | null;
    width?: number | null;
    height?: number | null;
    created_at: string;
    ai_labels: string[] | null;
    ai_description: string | null;
}

interface MediaDetailsDrawerProps {
    media: MediaFile | null;
    isOpen: boolean;
    onClose: () => void;
    onDelete: (id: string) => void;
    isDeleting?: boolean;
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MediaDetailsDrawer({
    media,
    isOpen,
    onClose,
    onDelete,
    isDeleting,
}: MediaDetailsDrawerProps) {
    const [copied, setCopied] = useState(false);

    if (!media) return null;

    const handleCopyUrl = async () => {
        try {
            await navigator.clipboard.writeText(media.url);
            setCopied(true);
            toast.success("URL copied to clipboard");
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error("Failed to copy URL");
        }
    };

    const handleDownload = () => {
        const link = document.createElement("a");
        link.href = media.url;
        link.download = media.filename || "media";
        link.target = "_blank";
        link.rel = "noopener";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleOpenOriginal = () => {
        window.open(media.url, "_blank", "noopener");
    };

    const TypeIcon = media.file_type === "video" ? Video : ImageIcon;

    return (
        <>
            {/* Backdrop */}
            <div
                className={cn(
                    "fixed inset-0 bg-black/50 z-40 transition-opacity duration-300",
                    isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={onClose}
            />

            {/* Drawer */}
            <div
                className={cn(
                    "fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50",
                    "transform transition-transform duration-300 ease-out",
                    isOpen ? "translate-x-0" : "translate-x-full"
                )}
            >
                <div className="h-full flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-secondary-200">
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-secondary-100 flex items-center justify-center">
                                <TypeIcon className="h-4 w-4 text-secondary-600" />
                            </div>
                            <div>
                                <h3 className="font-medium text-secondary-900 truncate max-w-[200px]">
                                    {media.original_filename || media.filename}
                                </h3>
                                <p className="text-xs text-secondary-500">{formatFileSize(media.file_size)}</p>
                            </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={onClose}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Preview */}
                    <div className="p-4 bg-secondary-50">
                        <div className="aspect-video rounded-lg overflow-hidden bg-secondary-900 flex items-center justify-center">
                            {media.file_type === "video" ? (
                                <video
                                    src={media.url}
                                    controls
                                    className="w-full h-full object-contain"
                                />
                            ) : (
                                <Image
                                    src={media.thumbnail_url || media.url}
                                    alt={media.filename}
                                    fill
                                    className="object-contain"
                                />
                            )}
                        </div>
                    </div>

                    {/* Details */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-6">
                        {/* File Info */}
                        <div className="space-y-3">
                            <h4 className="text-sm font-medium text-secondary-900">File Information</h4>
                            <div className="grid gap-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-secondary-500">Type</span>
                                    <span className="text-secondary-900">{media.mime_type}</span>
                                </div>
                                {media.width && media.height && (
                                    <div className="flex justify-between">
                                        <span className="text-secondary-500">Dimensions</span>
                                        <span className="text-secondary-900">
                                            {media.width} × {media.height}
                                        </span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span className="text-secondary-500">Size</span>
                                    <span className="text-secondary-900">{formatFileSize(media.file_size)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-secondary-500">Uploaded</span>
                                    <span className="text-secondary-900">
                                        {format(new Date(media.created_at), "MMM d, yyyy 'at' h:mm a")}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* AI Labels */}
                        {media.ai_labels && media.ai_labels.length > 0 && (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-purple-500" />
                                    <h4 className="text-sm font-medium text-secondary-900">AI Labels</h4>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {media.ai_labels.map((label) => (
                                        <Badge key={label} variant="secondary" className="text-xs">
                                            {label}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* AI Description */}
                        {media.ai_description && (
                            <div className="space-y-3">
                                <h4 className="text-sm font-medium text-secondary-900">AI Description</h4>
                                <p className="text-sm text-secondary-600 leading-relaxed">
                                    {media.ai_description}
                                </p>
                            </div>
                        )}

                        {/* URL */}
                        <div className="space-y-3">
                            <Label className="text-sm font-medium text-secondary-900">File URL</Label>
                            <div className="flex gap-2">
                                <Input
                                    value={media.url}
                                    readOnly
                                    className="text-xs bg-secondary-50"
                                />
                                <Button variant="outline" size="sm" onClick={handleCopyUrl}>
                                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="p-4 border-t border-secondary-200 space-y-2">
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                className="flex-1 gap-2"
                                onClick={handleOpenOriginal}
                            >
                                <ExternalLink className="h-4 w-4" />
                                Open Original
                            </Button>
                            <Button variant="outline" className="flex-1 gap-2" onClick={handleDownload}>
                                <Download className="h-4 w-4" />
                                Download
                            </Button>
                        </div>
                        <Button
                            variant="outline"
                            className="w-full gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                            onClick={() => {
                                if (confirm("Delete this media? This cannot be undone.")) {
                                    onDelete(media.id);
                                    onClose();
                                }
                            }}
                            disabled={isDeleting}
                        >
                            {isDeleting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Trash2 className="h-4 w-4" />
                            )}
                            Delete Media
                        </Button>
                    </div>
                </div>
            </div>
        </>
    );
}
