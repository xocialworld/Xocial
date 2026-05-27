import Image from 'next/image';
import { useMediaAssets, MediaAsset, useUploadMedia, useDeleteMedia } from '@/hooks/use-media-assets';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { FilmIcon, ImageIcon, Check, UploadIcon, Loader2, Trash2, X } from 'lucide-react';
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface MediaLibraryPanelProps {
    className?: string;
    onSelect?: (asset: MediaAsset) => void;
}

export function MediaLibraryPanel({ className, onSelect }: MediaLibraryPanelProps) {
    const [filter, setFilter] = useState<'image' | 'video' | undefined>(undefined);
    const { data: media, isLoading } = useMediaAssets(filter);
    const deleteMutation = useDeleteMedia();
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const handleDragStart = (e: React.DragEvent, asset: MediaAsset) => {
        e.dataTransfer.setData('media', JSON.stringify(asset));
        e.dataTransfer.setData('mediaId', asset.id);
        e.dataTransfer.setData('mediaUrl', asset.url);
        e.dataTransfer.effectAllowed = 'copy';
    };

    const uploadMutation = useUploadMedia();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            uploadMutation.mutate(file);
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setDeletingId(id);
    };

    const confirmDelete = async () => {
        if (!deletingId) return;
        await deleteMutation.mutateAsync(deletingId);
        setDeletingId(null);
    }

    return (
        <div className="flex select-none flex-col border-r bg-background h-full">
            <div className="p-4 border-b space-y-4">
                <div className="flex items-center justify-between px-1">
                    <h2 className="font-semibold">Media Library</h2>
                    <Button variant="outline" size="icon" onClick={handleUploadClick} disabled={uploadMutation.isPending}>
                        {uploadMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <UploadIcon className="h-4 w-4" />
                        )}
                    </Button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*,video/*"
                        onChange={handleFileChange}
                    />
                </div>
                <Tabs
                    value={filter || 'all'}
                    onValueChange={(val) => setFilter(val === 'all' ? undefined : val as 'image' | 'video')}
                    className="w-full"
                >
                    <TabsList className="w-full grid grid-cols-3">
                        <TabsTrigger value="all">All</TabsTrigger>
                        <TabsTrigger value="image">Images</TabsTrigger>
                        <TabsTrigger value="video">Videos</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-4 grid grid-cols-2 gap-2">
                    {isLoading ? (
                        Array.from({ length: 8 }).map((_, i) => (
                            <Skeleton key={i} className="aspect-square rounded-md w-full" />
                        ))
                    ) : media?.length === 0 ? (
                        <div className="col-span-2 py-8 text-center text-muted-foreground text-sm">
                            No media found
                        </div>
                    ) : (
                        media?.map((asset) => (
                            <Card
                                key={asset.id}
                                draggable={!onSelect}
                                onDragStart={(e) => !onSelect && handleDragStart(e, asset)}
                                onClick={() => onSelect?.(asset)}
                                className={cn(
                                    "overflow-hidden transition-all group relative border-0 shadow-sm",
                                    onSelect ? "cursor-pointer hover:ring-2 hover:ring-primary" : "cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-primary/20",
                                    deleteMutation.isPending && deletingId === asset.id && "opacity-50 pointer-events-none"
                                )}
                            >
                                <div className="aspect-square relative bg-muted/20">
                                    {asset.file_type === 'video' || asset.mime_type?.startsWith('video/') ? (
                                        <div className="w-full h-full flex items-center justify-center bg-muted">
                                            <FilmIcon className="w-8 h-8 text-muted-foreground" />
                                            {(asset.thumbnail_url || asset.url) && (
                                                <video
                                                    src={asset.url}
                                                    className="absolute inset-0 w-full h-full object-cover pointer-events-none opacity-50"
                                                    muted
                                                />
                                            )}
                                        </div>
                                    ) : (
                                        <Image
                                            src={asset.thumbnail_url || asset.url}
                                            alt={asset.original_filename}
                                            fill
                                            sizes="160px"
                                            className="object-cover"
                                            unoptimized
                                        />
                                    )}

                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-2">
                                        <p className="text-[10px] text-white truncate font-medium flex-1 mr-2">
                                            {asset.original_filename}
                                        </p>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-white/80 hover:text-white hover:bg-white/20"
                                            onClick={(e) => handleDelete(e, asset.id)}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        ))
                    )}
                </div>
            </ScrollArea>

            <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Media Asset?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the media asset from your library.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {deleteMutation.isPending ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
