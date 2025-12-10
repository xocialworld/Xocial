"use client";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { CommentList } from "./comment-list";
import { MessageSquare } from "lucide-react";

interface CommentsPanelProps {
    contentItemId: string;
    workspaceId: string;
    commentCount?: number;
    trigger?: React.ReactNode;
}

export function CommentsPanel({
    contentItemId,
    workspaceId,
    commentCount = 0,
    trigger,
}: CommentsPanelProps) {
    return (
        <Sheet>
            <SheetTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="sm" className="gap-2">
                        <MessageSquare className="h-4 w-4" />
                        {commentCount > 0 && <span>{commentCount}</span>}
                        Comments
                    </Button>
                )}
            </SheetTrigger>
            <SheetContent className="w-[400px] sm:w-[540px]">
                <SheetHeader>
                    <SheetTitle>Comments</SheetTitle>
                </SheetHeader>
                <div className="mt-6 h-[calc(100vh-100px)] overflow-y-auto">
                    <CommentList
                        contentItemId={contentItemId}
                        workspaceId={workspaceId}
                    />
                </div>
            </SheetContent>
        </Sheet>
    );
}
