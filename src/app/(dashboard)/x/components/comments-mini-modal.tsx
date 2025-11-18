'use client';
/* eslint-disable @next/next/no-img-element -- Comment threads render user-provided avatars that rely on <img> for flexibility */

import * as React from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
} from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Heart, Reply, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Post } from "@/types";

interface Comment {
  id: string;
  author_name: string;
  author_avatar?: string;
  content: string;
  likes: number;
  created_at: string;
  is_reply: boolean;
  parent_comment_id?: string;
}

interface CommentsMiniModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: Post;
  comments?: Comment[];
}

export function CommentsMiniModal({
  open,
  onOpenChange,
  post,
  comments = [],
}: CommentsMiniModalProps) {
  const [replyTo, setReplyTo] = React.useState<string | null>(null);
  const [replyText, setReplyText] = React.useState("");

  const handleReply = (commentId: string) => {
    setReplyTo(commentId);
  };

  const handleSubmitReply = () => {
    // TODO: Implement reply submission
    console.log('Reply to', replyTo, ':', replyText);
    setReplyText("");
    setReplyTo(null);
  };

  const topLevelComments = comments.filter((c) => !c.is_reply);

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent size="lg">
        <ModalHeader onClose={() => onOpenChange(false)}>
          <ModalTitle>Comments</ModalTitle>
        </ModalHeader>

        <ModalBody className="max-h-[60vh] overflow-y-auto">
          {/* Post Preview */}
          <div className="mb-4 rounded-lg bg-secondary-50 p-4">
            <p className="text-sm text-secondary-700 line-clamp-2">
              {Object.values(post.content)[0]?.text}
            </p>
          </div>

          {/* Comments List */}
          <div className="space-y-4">
            {topLevelComments.length === 0 ? (
              <p className="text-center text-sm text-secondary-500 py-8">
                No comments yet
              </p>
            ) : (
              topLevelComments.map((comment) => (
                <div key={comment.id} className="space-y-3">
                  {/* Comment */}
                  <div className="flex gap-3">
                    {/* Avatar */}
                    {comment.author_avatar ? (
                      <img
                        src={comment.author_avatar}
                        alt={comment.author_name}
                        className="h-10 w-10 rounded-full"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-medium">
                        {comment.author_name.charAt(0).toUpperCase()}
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1">
                      <div className="rounded-lg bg-secondary-50 px-4 py-2">
                        <p className="text-sm font-medium text-secondary-900">
                          {comment.author_name}
                        </p>
                        <p className="text-sm text-secondary-700 mt-1">
                          {comment.content}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="mt-2 flex items-center gap-4">
                        <button className="flex items-center gap-1 text-xs text-secondary-600 hover:text-primary-600">
                          <Heart className="h-3 w-3" />
                          {comment.likes > 0 && (
                            <span>{comment.likes}</span>
                          )}
                        </button>
                        <button
                          onClick={() => handleReply(comment.id)}
                          className="flex items-center gap-1 text-xs text-secondary-600 hover:text-primary-600"
                        >
                          <Reply className="h-3 w-3" />
                          Reply
                        </button>
                        <span className="text-xs text-secondary-500">
                          {new Date(comment.created_at).toLocaleString()}
                        </span>
                      </div>

                      {/* Reply Input */}
                      {replyTo === comment.id && (
                        <div className="mt-3 flex gap-2">
                          <Input
                            placeholder="Write a reply..."
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            className="flex-1"
                          />
                          <Button
                            size="sm"
                            onClick={handleSubmitReply}
                            disabled={!replyText.trim()}
                          >
                            Send
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setReplyTo(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      )}

                      {/* Replies */}
                      {comments
                        .filter((r) => r.parent_comment_id === comment.id)
                        .map((reply) => (
                          <div key={reply.id} className="mt-3 ml-8 flex gap-3">
                            {reply.author_avatar ? (
                              <img
                                src={reply.author_avatar}
                                alt={reply.author_name}
                                className="h-8 w-8 rounded-full"
                              />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-secondary-600 flex items-center justify-center text-white text-xs font-medium">
                                {reply.author_name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="flex-1">
                              <div className="rounded-lg bg-secondary-50 px-3 py-2">
                                <p className="text-xs font-medium text-secondary-900">
                                  {reply.author_name}
                                </p>
                                <p className="text-xs text-secondary-700 mt-1">
                                  {reply.content}
                                </p>
                              </div>
                              <p className="mt-1 text-xs text-secondary-500">
                                {new Date(reply.created_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ModalBody>

        <ModalFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

