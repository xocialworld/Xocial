"use client";

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, Image as ImageIcon, Loader2, Search, Video, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';
import type { MediaFile } from '@/types';

interface MediaLibraryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (files: MediaFile[]) => void;
}

export function MediaLibraryModal({ isOpen, onClose, onSelect }: MediaLibraryModalProps) {
    const [media, setMedia] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('date_desc');

    const fetchMedia = useCallback(async (search?: string) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.append('search', search);
            params.append('sort', sortBy);

            const response = await fetch(`/api/media?${params.toString()}`);
            if (response.ok) {
                const data = await response.json();
                setMedia(data.data.media || []);
            }
        } catch (error) {
            console.error('Failed to fetch media:', error);
        } finally {
            setLoading(false);
        }
    }, [sortBy]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchMedia(searchQuery);
    };

    useEffect(() => {
        if (isOpen) {
            fetchMedia(searchQuery);
        }
    }, [isOpen, searchQuery, fetchMedia]);

    useEffect(() => {
        if (isOpen) {
            fetchMedia();
            setSelectedIds(new Set());
        }
    }, [isOpen, fetchMedia]);

    const toggleSelection = (item: any) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(item.id)) {
            newSelected.delete(item.id);
        } else {
            newSelected.add(item.id);
        }
        setSelectedIds(newSelected);
    };

    const handleConfirm = () => {
        const selectedFiles = media
            .filter(item => selectedIds.has(item.id))
            .map(item => ({
                id: item.id,
                url: item.url,
                type: item.file_type === 'video' ? 'video' : 'image',
                name: item.original_filename || item.filename,
                size: item.file_size
            })) as MediaFile[];

        onSelect(selectedFiles);
        onClose();
    };

    const handleDelete = async (e: React.MouseEvent, item: any) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this file?')) return;

        try {
            const response = await fetch(`/api/media/${item.id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                setMedia(prev => prev.filter(m => m.id !== item.id));
                if (selectedIds.has(item.id)) {
                    const newSelected = new Set(selectedIds);
                    newSelected.delete(item.id);
                    setSelectedIds(newSelected);
                }
            } else {
                console.error('Failed to delete media');
            }
        } catch (error) {
            console.error('Error deleting media:', error);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="w-[95vw] max-w-4xl h-[90vh] md:h-[80vh] flex flex-col p-0 gap-0 overflow-hidden">
                <div className="p-6 pb-2">
                    <DialogHeader>
                        <DialogTitle>Media Library</DialogTitle>
                    </DialogHeader>

                    <div className="flex items-center gap-2 py-4">
                        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                                <Input
                                    placeholder="Search media..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                            <Button type="submit" variant="secondary">Search</Button>
                        </form>
                        <Select value={sortBy} onValueChange={setSortBy}>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <SelectTrigger className="w-auto min-w-[80px]">
                                            <span>Sort</span>
                                        </SelectTrigger>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>
                                            {sortBy === 'date_desc' && 'Newest First'}
                                            {sortBy === 'date_asc' && 'Oldest First'}
                                            {sortBy === 'name_asc' && 'Name (A-Z)'}
                                            {sortBy === 'name_desc' && 'Name (Z-A)'}
                                            {sortBy === 'size_desc' && 'Size (Largest)'}
                                            {sortBy === 'size_asc' && 'Size (Smallest)'}
                                        </p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                            <SelectContent>
                                <SelectItem value="date_desc">Newest First</SelectItem>
                                <SelectItem value="date_asc">Oldest First</SelectItem>
                                <SelectItem value="name_asc">Name (A-Z)</SelectItem>
                                <SelectItem value="name_desc">Name (Z-A)</SelectItem>
                                <SelectItem value="size_desc">Size (Largest)</SelectItem>
                                <SelectItem value="size_asc">Size (Smallest)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 bg-secondary-50 p-4">
                    {loading ? (
                        <div className="flex h-full items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
                        </div>
                    ) : media.length === 0 ? (
                        <div className="flex h-full flex-col items-center justify-center text-gray-500">
                            <ImageIcon className="h-12 w-12 mb-2 opacity-20" />
                            <p>No media found</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                            {media.map((item) => {
                                const isSelected = selectedIds.has(item.id);
                                return (
                                    <div
                                        key={item.id}
                                        onClick={() => toggleSelection(item)}
                                        className={cn(
                                            "group relative aspect-square cursor-pointer overflow-hidden rounded-lg border-2 transition-all",
                                            isSelected
                                                ? "border-primary-500 ring-2 ring-primary-200"
                                                : "border-transparent hover:border-gray-300"
                                        )}
                                    >
                                        {item.file_type === 'image' ? (
                                            <Image
                                                src={item.thumbnail_url || item.url}
                                                alt={item.original_filename || 'Media'}
                                                fill
                                                className="object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-full items-center justify-center bg-gray-100">
                                                <Video className="h-8 w-8 text-gray-400" />
                                            </div>
                                        )}

                                        {/* Selection Overlay */}
                                        <div className={cn(
                                            "absolute inset-0 bg-black/40 transition-opacity flex items-center justify-center",
                                            isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                                        )}>
                                            {isSelected && (
                                                <div className="bg-primary-500 rounded-full p-1">
                                                    <Check className="h-4 w-4 text-white" />
                                                </div>
                                            )}

                                            {!isSelected && (
                                                <Button
                                                    variant="destructive"
                                                    size="icon"
                                                    className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2"
                                                    onClick={(e) => handleDelete(e, item)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>

                                        {/* File Name Overlay */}
                                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                                            <p className="text-xs text-white truncate">
                                                {item.original_filename}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-2 p-4 border-t bg-white">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleConfirm} disabled={selectedIds.size === 0}>
                        Insert Selected ({selectedIds.size})
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
