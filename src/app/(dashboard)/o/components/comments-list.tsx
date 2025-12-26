
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Comment } from "@/hooks/use-comments";
import { formatDistanceToNow } from "date-fns";

interface CommentsListProps {
    comments: Comment[];
    isLoading: boolean;
}

export function CommentsList({ comments, isLoading }: CommentsListProps) {
    if (isLoading) {
        return <div className="text-center py-4 text-sm text-muted-foreground">Loading comments...</div>;
    }

    if (comments.length === 0) {
        return (
            <div className="text-center py-8 text-sm text-muted-foreground">
                No comments yet. Be the first to start the conversation!
            </div>
        );
    }

    return (
        <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-4">
                {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3 text-sm">
                        <Avatar className="h-8 w-8">
                            <AvatarImage src={comment.author?.avatar_url} />
                            <AvatarFallback>{comment.author?.name?.[0] || '?'}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                                <span className="font-medium text-foreground">{comment.author?.name || 'Unknown User'}</span>
                                <span className="text-xs text-muted-foreground">
                                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                                </span>
                            </div>
                            <p className="text-muted-foreground leading-relaxed text-sm">
                                {comment.body}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </ScrollArea>
    );
}
