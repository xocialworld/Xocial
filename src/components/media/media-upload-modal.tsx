"use client";

import { useRef, useState, useCallback } from "react";
import Image from "next/image";
import {
    X,
    Upload,
    Image as ImageIcon,
    Video,
    Loader2,
    CheckCircle,
    AlertCircle,
    CloudUpload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { createClient as createBrowserSupabaseClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface UploadFile {
    id: string;
    file: File;
    progress: number;
    status: "pending" | "uploading" | "success" | "error";
    error?: string;
}

interface MediaUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUploadComplete: () => void;
    workspaceId?: string;
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function authHeader(): Promise<Record<string, string>> {
    const {
        data: { session },
    } = await createBrowserSupabaseClient().auth.getSession();

    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
}

export function MediaUploadModal({
    isOpen,
    onClose,
    onUploadComplete,
    workspaceId,
}: MediaUploadModalProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [files, setFiles] = useState<UploadFile[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const handleFiles = useCallback((selectedFiles: FileList | null) => {
        if (!selectedFiles) return;

        const newFiles: UploadFile[] = Array.from(selectedFiles).map((file) => ({
            id: Math.random().toString(36).substr(2, 9),
            file,
            progress: 0,
            status: "pending" as const,
        }));

        setFiles((prev) => [...prev, ...newFiles]);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragging(false);
            handleFiles(e.dataTransfer.files);
        },
        [handleFiles]
    );

    const removeFile = useCallback((id: string) => {
        setFiles((prev) => prev.filter((f) => f.id !== id));
    }, []);

    const uploadFiles = async () => {
        if (files.length === 0 || isUploading) return;

        setIsUploading(true);

        for (const uploadFile of files) {
            if (uploadFile.status !== "pending") continue;

            setFiles((prev) =>
                prev.map((f) =>
                    f.id === uploadFile.id ? { ...f, status: "uploading" as const, progress: 10 } : f
                )
            );

            try {
                const formData = new FormData();
                formData.append("file", uploadFile.file);
                if (workspaceId) formData.append("workspaceId", workspaceId);

                // Simulate progress updates
                const progressInterval = setInterval(() => {
                    setFiles((prev) =>
                        prev.map((f) =>
                            f.id === uploadFile.id && f.progress < 90
                                ? { ...f, progress: f.progress + 20 }
                                : f
                        )
                    );
                }, 300);

                const response = await fetch("/api/media/upload", {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        ...(workspaceId ? { "x-workspace-id": workspaceId } : {}),
                        ...(await authHeader()),
                    },
                    body: formData,
                });

                clearInterval(progressInterval);

                if (!response.ok) {
                    const err = await response.json().catch(() => ({}));
                    throw new Error(err.error || "Upload failed");
                }

                setFiles((prev) =>
                    prev.map((f) =>
                        f.id === uploadFile.id
                            ? { ...f, status: "success" as const, progress: 100 }
                            : f
                    )
                );
            } catch (error: any) {
                setFiles((prev) =>
                    prev.map((f) =>
                        f.id === uploadFile.id
                            ? { ...f, status: "error" as const, error: error.message }
                            : f
                    )
                );
            }
        }

        setIsUploading(false);
        const successCount = files.filter((f) => f.status === "success").length;
        if (successCount > 0) {
            toast.success(`${successCount} file(s) uploaded successfully`);
            onUploadComplete();
        }
    };

    const handleClose = () => {
        if (isUploading) return;
        setFiles([]);
        onClose();
    };

    const pendingCount = files.filter((f) => f.status === "pending").length;
    const successCount = files.filter((f) => f.status === "success").length;

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 z-40"
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-secondary-200">
                        <div className="flex items-center gap-2">
                            <div className="h-9 w-9 rounded-lg bg-primary-100 flex items-center justify-center">
                                <CloudUpload className="h-5 w-5 text-primary-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-secondary-900">Upload Media</h3>
                                <p className="text-xs text-secondary-500">
                                    Images and videos up to 50MB
                                </p>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleClose}
                            disabled={isUploading}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Drop Zone */}
                    <div className="p-4">
                        <div
                            className={cn(
                                "border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer",
                                isDragging
                                    ? "border-primary-500 bg-primary-50"
                                    : "border-secondary-200 hover:border-primary-300 hover:bg-secondary-50"
                            )}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => inputRef.current?.click()}
                        >
                            <input
                                ref={inputRef}
                                type="file"
                                multiple
                                accept="image/*,video/*"
                                className="hidden"
                                onChange={(e) => handleFiles(e.target.files)}
                            />
                            <div className="h-12 w-12 rounded-full bg-secondary-100 flex items-center justify-center mx-auto mb-3">
                                <Upload className="h-6 w-6 text-secondary-500" />
                            </div>
                            <p className="text-secondary-900 font-medium mb-1">
                                Drag and drop files here
                            </p>
                            <p className="text-sm text-secondary-500">
                                or click to browse your computer
                            </p>
                            <p className="text-xs text-secondary-400 mt-2">
                                Supports: JPG, PNG, GIF, MP4, MOV, WEBP
                            </p>
                        </div>
                    </div>

                    {/* File List */}
                    {files.length > 0 && (
                        <div className="px-4 pb-4 max-h-64 overflow-y-auto">
                            <p className="text-sm font-medium text-secondary-900 mb-2">
                                {files.length} file(s) selected
                            </p>
                            <div className="space-y-2">
                                {files.map((uploadFile) => {
                                    const isImage = uploadFile.file.type.startsWith("image/");
                                    const Icon = isImage ? ImageIcon : Video;

                                    return (
                                        <div
                                            key={uploadFile.id}
                                            className="flex items-center gap-3 p-2 rounded-lg bg-secondary-50"
                                        >
                                            <div className="h-10 w-10 rounded-lg bg-secondary-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                                                {isImage ? (
                                                    <Image
                                                        src={URL.createObjectURL(uploadFile.file)}
                                                        alt={uploadFile.file.name}
                                                        width={40}
                                                        height={40}
                                                        className="h-full w-full object-cover"
                                                    />
                                                ) : (
                                                    <Icon className="h-5 w-5 text-secondary-500" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-secondary-900 truncate">
                                                    {uploadFile.file.name}
                                                </p>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-secondary-500">
                                                        {formatFileSize(uploadFile.file.size)}
                                                    </span>
                                                    {uploadFile.status === "uploading" && (
                                                        <Progress value={uploadFile.progress} className="h-1 flex-1" />
                                                    )}
                                                    {uploadFile.status === "success" && (
                                                        <span className="text-xs text-green-600 flex items-center gap-1">
                                                            <CheckCircle className="h-3 w-3" /> Uploaded
                                                        </span>
                                                    )}
                                                    {uploadFile.status === "error" && (
                                                        <span className="text-xs text-red-600 flex items-center gap-1">
                                                            <AlertCircle className="h-3 w-3" /> {uploadFile.error}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {uploadFile.status === "pending" && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        removeFile(uploadFile.id);
                                                    }}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            )}
                                            {uploadFile.status === "uploading" && (
                                                <Loader2 className="h-4 w-4 text-primary-500 animate-spin" />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Footer */}
                    <div className="p-4 border-t border-secondary-200 flex justify-end gap-2">
                        <Button variant="outline" onClick={handleClose} disabled={isUploading}>
                            Cancel
                        </Button>
                        <Button
                            onClick={uploadFiles}
                            disabled={pendingCount === 0 || isUploading}
                            className="gap-2"
                        >
                            {isUploading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Uploading...
                                </>
                            ) : (
                                <>
                                    <Upload className="h-4 w-4" />
                                    Upload {pendingCount > 0 ? `(${pendingCount})` : ""}
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </>
    );
}
