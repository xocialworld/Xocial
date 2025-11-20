"use client";

import { useCallback, useState } from 'react';
import { Upload, X, Image as ImageIcon, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { MediaFile } from './unified-post-composer';

type MediaUploadZoneProps = {
    media: MediaFile[];
    onUpload: (files: File[]) => void;
    onRemove: (mediaId: string) => void;
};

export function MediaUploadZone({ media, onUpload, onRemove }: MediaUploadZoneProps) {
    const [isDragging, setIsDragging] = useState(false);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const files = Array.from(e.dataTransfer.files);
        const validFiles = files.filter(file =>
            file.type.startsWith('image/') || file.type.startsWith('video/')
        );

        if (validFiles.length > 0) {
            onUpload(validFiles);
        }
    }, [onUpload]);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) {
            onUpload(files);
        }
        // Reset input
        e.target.value = '';
    }, [onUpload]);

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    return (
        <div className="rounded-xl border border-secondary-200 bg-white p-6 shadow-sm">
            <div className="mb-4">
                <h3 className="text-sm font-medium text-secondary-900">Media Files</h3>
                <p className="mt-1 text-xs text-secondary-500">
                    Upload images or videos for your post
                </p>
            </div>

            {/* Drop Zone */}
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                    "relative rounded-lg border-2 border-dashed p-8 text-center transition-colors",
                    isDragging
                        ? "border-primary-500 bg-primary-50"
                        : "border-secondary-300 bg-secondary-50 hover:border-secondary-400"
                )}
            >
                <input
                    type="file"
                    id="media-upload"
                    accept="image/*,video/*"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                />

                <Upload className={cn(
                    "mx-auto h-10 w-10 mb-3",
                    isDragging ? "text-primary-600" : "text-secondary-400"
                )} />

                <label
                    htmlFor="media-upload"
                    className="cursor-pointer"
                >
                    <p className="text-sm text-secondary-600">
                        <span className="font-medium text-primary-600 hover:text-primary-700">
                            Click to upload
                        </span>
                        {' '}or drag and drop
                    </p>
                    <p className="mt-1 text-xs text-secondary-500">
                        PNG, JPG, GIF, MP4, MOV up to 100MB
                    </p>
                </label>
            </div>

            {/* Uploaded Media Grid */}
            {media.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                    {media.map((file) => (
                        <div
                            key={file.id}
                            className="group relative aspect-square overflow-hidden rounded-lg bg-secondary-100"
                        >
                            {file.type === 'image' ? (
                                <img
                                    src={file.url}
                                    alt={file.name}
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <div className="flex h-full flex-col items-center justify-center gap-2 p-3">
                                    <Video className="h-8 w-8 text-secondary-600" />
                                    <p className="text-xs text-center text-secondary-600 truncate w-full">
                                        {file.name}
                                    </p>
                                </div>
                            )}

                            {/* Remove Button */}
                            <Button
                                variant="danger"
                                size="sm"
                                className="absolute top-1.5 right-1.5 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => onRemove(file.id)}
                            >
                                <X className="h-4 w-4" />
                            </Button>

                            {/* File Info Overlay */}
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <p className="text-xs text-white truncate">{file.name}</p>
                                <p className="text-xs text-white/80">{formatFileSize(file.size)}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
