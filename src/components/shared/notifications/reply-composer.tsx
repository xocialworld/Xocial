"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ReplyComposerProps {
    onSubmit: (text: string) => Promise<void>;
    onCancel: () => void;
}

export function ReplyComposer({ onSubmit, onCancel }: ReplyComposerProps) {
    const [text, setText] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!text.trim()) return;

        setIsSubmitting(true);
        try {
            await onSubmit(text);
            setText("");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-3">
            <Textarea
                placeholder="Write a reply..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="min-h-[100px] resize-none"
            />
            <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={onCancel} disabled={isSubmitting}>
                    Cancel
                </Button>
                <Button size="sm" onClick={handleSubmit} disabled={!text.trim() || isSubmitting}>
                    {isSubmitting ? "Sending..." : "Reply"}
                </Button>
            </div>
        </div>
    );
}
