'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { TextArea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { MessageCircle, Reply, EyeOff, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Comment {
  id: string;
  message: string;
  from: { name: string; id: string };
  created_time: string;
  like_count: number;
  comment_count: number;
}

export function PostComments({ postId }: { postId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  
  const fetchComments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/posts/${postId}/comments`);
      const data = await res.json();
      setComments(data.comments || []);
    } catch (error) {
      toast.error('Failed to load comments');
    } finally {
      setLoading(false);
    }
  }, [postId]);
  
  useEffect(() => {
    fetchComments();
  }, [fetchComments]);
  
  async function handleReply(commentId: string) {
    if (!replyText.trim()) return;
    
    try {
      await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reply',
          commentId,
          message: replyText,
        }),
      });
      
      toast.success('Reply posted');
      setReplyingTo(null);
      setReplyText('');
      fetchComments();
    } catch (error) {
      toast.error('Failed to post reply');
    }
  }
  
  async function handleHide(commentId: string) {
    try {
      await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'hide', commentId }),
      });
      
      toast.success('Comment hidden');
      fetchComments();
    } catch (error) {
      toast.error('Failed to hide comment');
    }
  }
  
  async function handleDelete(commentId: string) {
    if (!confirm('Delete this comment?')) return;
    
    try {
      await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', commentId }),
      });
      
      toast.success('Comment deleted');
      fetchComments();
    } catch (error) {
      toast.error('Failed to delete comment');
    }
  }
  
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <MessageCircle className="h-4 w-4" />
        <span>{comments.length} comments</span>
      </div>
      
      {comments.map(comment => (
        <div key={comment.id} className="border rounded-lg p-4 space-y-2">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium text-sm">{comment.from.name}</p>
              <p className="text-sm text-gray-600 mt-1">{comment.message}</p>
              <p className="text-xs text-gray-400 mt-1">
                {new Date(comment.created_time).toLocaleDateString()}
              </p>
            </div>
            
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setReplyingTo(comment.id)}
              >
                <Reply className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleHide(comment.id)}
              >
                <EyeOff className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDelete(comment.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
          
          {replyingTo === comment.id && (
            <div className="mt-2 space-y-2">
              <TextArea
                placeholder="Write a reply..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={2}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleReply(comment.id)}>
                  Send Reply
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setReplyingTo(null)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}
      
      {comments.length === 0 && (
        <p className="text-center text-gray-500 py-8">No comments yet</p>
      )}
    </div>
  );
}

