/**
 * Edit Post Modal Component
 * Based on Xocial SRS Section 3.2.3
 * Modal for editing scheduled posts with platform selector, date/time pickers
 */

'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Loader2, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getPlatformBadgeColor, platformNames, getCharacterLimit, getCharacterCountColor, Platform } from '@/lib/platform-colors';
import type { Post } from '@/types';
import { toast } from 'sonner';

interface EditPostModalProps {
    post: Post | null;
    isOpen: boolean;
    onClose: () => void;
    onSave?: (postId: string, updates: Partial<Post>) => Promise<void>;
}

export function EditPostModal({ post, isOpen, onClose, onSave }: EditPostModalProps) {
    const [caption, setCaption] = useState('');
    const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([]);
    const [scheduledDate, setScheduledDate] = useState('');
    const [scheduledTime, setScheduledTime] = useState('');
    const [status, setStatus] = useState<'draft' | 'scheduled'>('scheduled');
    const [saving, setSaving] = useState(false);

    // Initialize form when post changes
    useEffect(() => {
        if (post) {
            // Extract caption from content
            const contentText = typeof post.content === 'string'
                ? post.content
                : Object.values(post.content)[0]?.text || '';
            setCaption(contentText);

            setSelectedPlatforms(post.platforms || []);

            if (post.scheduled_at) {
                const date = new Date(post.scheduled_at);
                setScheduledDate(date.toISOString().split('T')[0]);
                setScheduledTime(date.toTimeString().slice(0, 5));
            } else {
                const now = new Date();
                setScheduledDate(now.toISOString().split('T')[0]);
                setScheduledTime('10:00');
            }

            setStatus(post.status === 'draft' ? 'draft' : 'scheduled');
        }
    }, [post]);

    const togglePlatform = (platform: Platform) => {
        setSelectedPlatforms(prev =>
            prev.includes(platform)
                ? prev.filter(p => p !== platform)
                : [...prev, platform]
        );
    };

    const handleSave = async () => {
        if (!post || !onSave) return;

        if (selectedPlatforms.length === 0) {
            toast.error('Please select at least one platform');
            return;
        }

        if (!caption.trim()) {
            toast.error('Please enter a caption');
            return;
        }

        setSaving(true);

        try {
            const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);

            await onSave(post.id, {
                content: { default: { text: caption } },
                platforms: selectedPlatforms,
                scheduled_at: scheduledDateTime.toISOString(),
                status,
            });

            toast.success('Post updated successfully');
            onClose();
        } catch (error) {
            toast.error('Failed to update post');
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    // Calculate character limit based on selected platforms
    const characterLimit = selectedPlatforms.length > 0
        ? Math.min(...selectedPlatforms.map(p => getCharacterLimit(p)))
        : 280;

    const characterCount = caption.length;
    const characterColor = getCharacterCountColor(characterCount, characterLimit);

    if (!post) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Post</DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Platform Selector */}
                    <div>
                        <Label className="text-sm font-medium mb-2 block">Platforms</Label>
                        <div className="flex flex-wrap gap-2">
                            {(['instagram', 'facebook', 'twitter', 'youtube', 'linkedin', 'tiktok'] as Platform[]).map((platform) => (
                                <button
                                    key={platform}
                                    type="button"
                                    onClick={() => togglePlatform(platform)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                                        selectedPlatforms.includes(platform)
                                            ? cn("text-white", getPlatformBadgeColor(platform))
                                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                    )}
                                >
                                    {platformNames[platform]}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Caption */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <Label htmlFor="caption" className="text-sm font-medium">Caption</Label>
                            <span className={cn("text-xs font-medium", characterColor)}>
                                {characterCount} / {characterLimit}
                            </span>
                        </div>
                        <Textarea
                            id="caption"
                            value={caption}
                            onChange={(e) => setCaption(e.target.value)}
                            placeholder="Write your caption..."
                            className="min-h-[120px] resize-none"
                            maxLength={characterLimit}
                        />
                    </div>

                    {/* Media Preview (Read-only) */}
                    {post.media && post.media.length > 0 && (
                        <div>
                            <Label className="text-sm font-medium mb-2 block">Media</Label>
                            <div className="flex gap-2">
                                {post.media.slice(0, 4).map((media, index) => (
                                    <div
                                        key={media.id || index}
                                        className="relative h-20 w-20 rounded-lg overflow-hidden bg-gray-100 border border-gray-200"
                                    >
                                        {media.type === 'image' ? (
                                            <img
                                                src={media.url}
                                                alt="Media"
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex items-center justify-center h-full">
                                                <ImageIcon className="h-8 w-8 text-gray-400" />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Date and Time */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="date" className="text-sm font-medium mb-2 block">
                                <Calendar className="inline h-4 w-4 mr-1" />
                                Date
                            </Label>
                            <input
                                id="date"
                                type="date"
                                value={scheduledDate}
                                onChange={(e) => setScheduledDate(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                        <div>
                            <Label htmlFor="time" className="text-sm font-medium mb-2 block">
                                <Clock className="inline h-4 w-4 mr-1" />
                                Time
                            </Label>
                            <input
                                id="time"
                                type="time"
                                value={scheduledTime}
                                onChange={(e) => setScheduledTime(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                    </div>

                    {/* Status Selector */}
                    <div>
                        <Label className="text-sm font-medium mb-2 block">Status</Label>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setStatus('draft')}
                                className={cn(
                                    "px-4 py-2 rounded-md text-sm font-medium transition-all",
                                    status === 'draft'
                                        ? "bg-yellow-100 text-yellow-800 ring-2 ring-yellow-500"
                                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                )}
                            >
                                Draft
                            </button>
                            <button
                                type="button"
                                onClick={() => setStatus('scheduled')}
                                className={cn(
                                    "px-4 py-2 rounded-md text-sm font-medium transition-all",
                                    status === 'scheduled'
                                        ? "bg-green-100 text-green-800 ring-2 ring-green-500"
                                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                )}
                            >
                                Scheduled
                            </button>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t">
                    <Button variant="outline" onClick={onClose} disabled={saving}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={saving || selectedPlatforms.length === 0}>
                        {saving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            'Save Changes'
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
