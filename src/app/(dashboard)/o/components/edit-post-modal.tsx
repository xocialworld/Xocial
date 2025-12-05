import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Post } from "@/types";

interface EditPostModalProps {
    post: Post | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (postId: string, updates: Partial<Post>) => Promise<void>;
}

export function EditPostModal({ post, isOpen, onClose, onSave }: EditPostModalProps) {
    const [text, setText] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (post) {
            const c: any = (post as any).content;
            let initial = "";
            if (typeof c === "string") initial = c;
            else if (c && typeof c.text === "string") initial = c.text;
            else {
                const platforms = (post as any).platforms;
                const first = Array.isArray(platforms) ? (platforms[0] as any) : undefined;
                const key = typeof first === "string" ? first : Array.isArray(first) ? first[0] : undefined;
                const entry = key && c && c[key];
                if (entry && typeof entry.text === "string") initial = entry.text;
            }
            setText(initial);
        }
    }, [post]);

    const handleSave = async () => {
        if (!post) return;

        try {
            setSaving(true);
            const c: any = (post as any).content;
            let nextContent: any = c;
            if (typeof c === "string") {
                nextContent = text;
            } else if (c && typeof c.text === "string") {
                nextContent = { ...c, text };
            } else {
                const platforms = (post as any).platforms;
                const first = Array.isArray(platforms) ? (platforms[0] as any) : undefined;
                const key = typeof first === "string" ? first : Array.isArray(first) ? first[0] : "fallback";
                nextContent = { ...c, [key]: { ...(c?.[key] || {}), text } };
            }
            await onSave(post.id, { content: nextContent });
            onClose();
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Edit Post</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="content">Post Content</Label>
                        <Textarea
                            id="content"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            className="min-h-[150px]"
                            placeholder="What's on your mind?"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={saving}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? "Saving..." : "Save Changes"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
