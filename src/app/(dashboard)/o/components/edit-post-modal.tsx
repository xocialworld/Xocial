import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Post, PostStatus } from "@/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CommentsList } from "./comments-list";
import { useComments } from "@/hooks/use-comments";
import { Input } from "@/components/ui/input";
import { Send, Calendar as CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { DateTimePicker } from "@/components/ui/date-time-picker";

import { MediaLibraryPanel } from "./media-library-panel";
import { PlatformPreview } from "./platform-preview";
import { MediaAsset } from "@/hooks/use-media-assets";
import { ImageIcon, X } from "lucide-react";

// Calendar post type - flexible to handle both Post and CalendarEntry shapes
type CalendarPost = {
  id: string;
  status: string;
  platforms?: string[];
  scheduled_at?: string;
  published_at?: string;
  created_at?: string;
  content?: Record<string, unknown>;
  workspace_id?: string;
  _source?: string;
  _calendarDate?: string;
  _title?: string;
  [key: string]: unknown;
};

interface EditPostModalProps {
    post: CalendarPost | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (postId: string, updates: Partial<Post>) => Promise<void>;
    onUpdateStatus?: (postId: string, status: PostStatus) => Promise<void>;
}

export function EditPostModal({ post, isOpen, onClose, onSave, onUpdateStatus }: EditPostModalProps) {
    const [text, setText] = useState("");
    const [saving, setSaving] = useState(false);
    const [commentText, setCommentText] = useState("");
    const [selectedMedia, setSelectedMedia] = useState<MediaAsset[]>([]);
    const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
    const [scheduledDate, setScheduledDate] = useState<Date | undefined>(undefined);

    // Comments hook
    const { comments, isLoading: isLoadingComments, addComment, isAdding: isAddingComment } = useComments(post?.id || "");

    useEffect(() => {
        if (post) {
            const c: any = (post as any).content;
            let initial = "";
            let initialMedia: MediaAsset[] = [];

            if (typeof c === "string") initial = c;
            else if (c && typeof c.text === "string") {
                initial = c.text;
                if (c.media) initialMedia = c.media;
            }
            else {
                const platforms = (post as any).platforms;
                const first = Array.isArray(platforms) ? (platforms[0] as any) : undefined;
                const key = typeof first === "string" ? first : Array.isArray(first) ? first[0] : undefined;
                const entry = key && c && c[key];
                if (entry && typeof entry.text === "string") initial = entry.text;
                // Try to find media in content logic or root post if available (mock logic for now as we don't have full Post type)
                if (c && c.media) initialMedia = c.media;
            }
            setText(initial);
            setSelectedMedia(initialMedia);

            if (post.scheduled_at) {
                setScheduledDate(new Date(post.scheduled_at));
            } else {
                setScheduledDate(undefined);
            }
        }
    }, [post]);

    const handleSave = async () => {
        if (!post) return;

        try {
            setSaving(true);
            const c: any = (post as any).content;
            let nextContent: any = c;

            if (typeof c === "string") {
                nextContent = { text, media: selectedMedia };
            } else if (c && typeof c.text === "string") {
                nextContent = { ...c, text, media: selectedMedia };
            } else {
                const platforms = (post as any).platforms;
                const first = Array.isArray(platforms) ? (platforms[0] as any) : undefined;
                const key = typeof first === "string" ? first : Array.isArray(first) ? first[0] : "fallback";
                nextContent = { ...c, [key]: { ...(c?.[key] || {}), text }, media: selectedMedia };
            }

            const updates: Partial<Post> = {
                content: nextContent,
            };

            if (scheduledDate) {
                updates.scheduled_at = scheduledDate.toISOString();
                updates.status = 'scheduled';
            } else if (post.status === 'scheduled') {
                // If it was scheduled but date is cleared, revert to draft? Or just clear schedule.
                // Let's set it to draft if schedule is removed.
                updates.scheduled_at = undefined; // Assuming backend handles null/undefined
                updates.status = 'draft';
            }

            await onSave(post.id, updates);
            onClose();
        } finally {
            setSaving(false);
        }
    };

    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!commentText.trim() || !post) return;

        try {
            await addComment(commentText);
            setCommentText("");
        } catch (error) {
            // Error handled in hook (toast)
        }
    };

    const isReviewMode = post?.status === 'pending_approval';

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="sm:max-w-[700px] h-[80vh] flex flex-col">
                    <DialogHeader>
                        <div className="flex items-center justify-between">
                            <DialogTitle>Edit Post</DialogTitle>
                            {post?.status && (
                                <span className={cn(
                                    "text-xs px-2 py-1 rounded-full uppercase font-medium",
                                    post.status === 'published' ? "bg-green-100 text-green-700" :
                                        post.status === 'scheduled' ? "bg-blue-100 text-blue-700" :
                                            post.status === 'pending_approval' ? "bg-yellow-100 text-yellow-700" :
                                                post.status === 'rejected' ? "bg-red-100 text-red-700" :
                                                    "bg-gray-100 text-gray-700"
                                )}>
                                    {post.status.replace('_', ' ')}
                                </span>
                            )}
                        </div>
                    </DialogHeader>

                    <Tabs defaultValue="content" className="flex-1 flex flex-col min-h-0">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="content">Content</TabsTrigger>
                            <TabsTrigger value="preview">Preview</TabsTrigger>
                            <TabsTrigger value="comments">Comments ({comments?.length || 0})</TabsTrigger>
                        </TabsList>

                        <TabsContent value="content" className="flex-1 py-4 flex flex-col gap-4">
                            <div className="grid gap-2 flex-1 min-h-0">
                                <Label htmlFor="content">Post Content</Label>
                                <Textarea
                                    id="content"
                                    value={text}
                                    onChange={(e) => setText(e.target.value)}
                                    className="flex-1 resize-none min-h-[150px]"
                                    placeholder="What's on your mind?"
                                />
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label>Media</Label>
                                        <Button variant="outline" size="sm" onClick={() => setIsMediaPickerOpen(true)}>
                                            <ImageIcon className="w-4 h-4 mr-2" />
                                            Add Media
                                        </Button>
                                    </div>

                                    {selectedMedia.length > 0 ? (
                                        <div className="grid grid-cols-4 gap-2">
                                            {selectedMedia.map((media) => (
                                                <div key={media.id} className="relative group aspect-square rounded-md overflow-hidden bg-muted">
                                                    {media.file_type === 'video' || media.mime_type?.startsWith('video/') ? (
                                                        <video src={media.url} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <img src={media.url} alt="media" className="w-full h-full object-cover" />
                                                    )}
                                                    <button
                                                        onClick={() => setSelectedMedia(prev => prev.filter(p => p.id !== media.id))}
                                                        className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="border border-dashed rounded-md p-4 text-center text-muted-foreground text-sm">
                                            No media selected
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label>Schedule</Label>
                                    <div className="flex items-center gap-2">
                                        <DateTimePicker date={scheduledDate} setDate={setScheduledDate} />
                                        {scheduledDate && (
                                            <Button variant="ghost" size="icon" onClick={() => setScheduledDate(undefined)}>
                                                <X className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="preview" className="flex-1 py-4 overflow-y-auto">
                            <Tabs defaultValue="instagram" className="w-full">
                                <TabsList className="grid w-full grid-cols-3 mb-4">
                                    <TabsTrigger value="instagram">Instagram</TabsTrigger>
                                    <TabsTrigger value="facebook">Facebook</TabsTrigger>
                                    <TabsTrigger value="linkedin">LinkedIn</TabsTrigger>
                                </TabsList>
                                <TabsContent value="instagram" className="flex justify-center">
                                    <PlatformPreview content={text} media={selectedMedia} platform="instagram" />
                                </TabsContent>
                                <TabsContent value="facebook" className="flex justify-center">
                                    <PlatformPreview content={text} media={selectedMedia} platform="facebook" />
                                </TabsContent>
                                <TabsContent value="linkedin" className="flex justify-center">
                                    <PlatformPreview content={text} media={selectedMedia} platform="linkedin" />
                                </TabsContent>
                            </Tabs>
                        </TabsContent>

                        <TabsContent value="comments" className="flex-1 py-4 flex flex-col min-h-0">
                            <div className="flex-1 overflow-hidden rounded-md border p-4 mb-4">
                                <CommentsList comments={comments} isLoading={isLoadingComments} />
                            </div>
                            <form onSubmit={handleAddComment} className="flex gap-2">
                                <Input
                                    value={commentText}
                                    onChange={(e) => setCommentText(e.target.value)}
                                    placeholder="Add a comment..."
                                    disabled={isAddingComment}
                                />
                                <Button type="submit" size="icon" disabled={isAddingComment || !commentText.trim()}>
                                    <Send className="h-4 w-4" />
                                </Button>
                            </form>
                        </TabsContent>
                    </Tabs>

                    <DialogFooter className="mt-auto pt-2 border-t flex justify-between items-center bg-gray-50 -mx-6 -mb-6 p-4">

                        <div className="flex gap-2">
                            {onUpdateStatus && post?.status === 'draft' && (
                                <Button
                                    variant="outline"
                                    onClick={async () => {
                                        setSaving(true);
                                        await onUpdateStatus(post.id, 'pending_approval');
                                        setSaving(false);
                                        onClose();
                                    }}
                                    disabled={saving}
                                    className="border-yellow-500 text-yellow-600 hover:bg-yellow-50"
                                >
                                    Request Review
                                </Button>
                            )}

                            {onUpdateStatus && post?.status === 'pending_approval' && (
                                <>
                                    <Button
                                        variant="default"
                                        onClick={async () => {
                                            setSaving(true);
                                            await onUpdateStatus(post.id, 'approved');
                                            setSaving(false);
                                            onClose();
                                        }}
                                        disabled={saving}
                                        className="bg-green-600 hover:bg-green-700 text-white"
                                    >
                                        Approve
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={async () => {
                                            setSaving(true);
                                            await onUpdateStatus(post.id, 'rejected');
                                            setSaving(false);
                                            onClose();
                                        }}
                                        disabled={saving}
                                        className="border-red-500 text-red-600 hover:bg-red-50"
                                    >
                                        Reject
                                    </Button>
                                </>
                            )}
                        </div>

                        <div className="flex gap-2">
                            <Button variant="ghost" onClick={onClose} disabled={saving}>
                                Cancel
                            </Button>
                            <Button onClick={handleSave} disabled={saving}>
                                {saving ? "Saving..." : scheduledDate ? "Schedule Post" : "Save Changes"}
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isMediaPickerOpen} onOpenChange={setIsMediaPickerOpen}>
                <DialogContent className="sm:max-w-[800px] h-[600px] p-0 overflow-hidden flex flex-col">
                    <DialogHeader className="p-4 border-b">
                        <DialogTitle>Select Media</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-hidden">
                        <MediaLibraryPanel
                            onSelect={(asset) => {
                                setSelectedMedia(prev => [...prev, asset]);
                                setIsMediaPickerOpen(false);
                            }}
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
