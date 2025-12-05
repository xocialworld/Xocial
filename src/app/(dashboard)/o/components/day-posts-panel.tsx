import { format } from "date-fns";
import { Post } from "@/types";
import { Button } from "@/components/ui/button";
import { X, Clock, Edit2, Trash2, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DayPostsPanelProps {
  date: Date;
  posts: Post[];
  onClose: () => void;
  onEditPost: (post: Post) => void;
  onDeletePost: (postId: string) => void;
  onReschedulePost: (postId: string) => void;
}

export function DayPostsPanel({
  date,
  posts,
  onClose,
  onEditPost,
  onDeletePost,
  onReschedulePost,
}: DayPostsPanelProps) {
  function getPostTextSafe(post: Post): string {
    const c: any = (post as any).content;
    if (!c) return "No content";
    if (typeof c === "string") return c;
    if (typeof c.text === "string") return c.text;
    const platforms = (post as any).platforms;
    const first = Array.isArray(platforms) ? (platforms[0] as any) : undefined;
    const key = typeof first === "string" ? first : Array.isArray(first) ? first[0] : undefined;
    const candidate = key && c[key];
    if (candidate && typeof candidate.text === "string") return candidate.text;
    try {
      const s = JSON.stringify(c);
      return s.length > 200 ? s.slice(0, 200) + "…" : s;
    } catch {
      return "No content";
    }
  }
  return (
    <div className="h-full flex flex-col border-l border-secondary-200 bg-white shadow-xl">
      <div className="flex items-center justify-between p-4 border-b border-secondary-100">
        <div>
          <h2 className="text-lg font-semibold text-secondary-900">
            {format(date, "EEEE")}
          </h2>
          <p className="text-sm text-secondary-500">{format(date, "MMMM d, yyyy")}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      <ScrollArea className="flex-1 p-4">
        {posts.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-secondary-50 rounded-full h-12 w-12 flex items-center justify-center mx-auto mb-3">
              <CalendarIcon className="h-6 w-6 text-secondary-400" />
            </div>
            <p className="text-secondary-500 font-medium">No posts scheduled</p>
            <p className="text-xs text-secondary-400 mt-1">
              Click &quot;Schedule Post&quot; to add one
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <div
                key={post.id}
                className="group bg-white border border-secondary-200 rounded-lg p-3 hover:border-primary-300 hover:shadow-md transition-all"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider",
                        post.status === "published"
                          ? "bg-green-100 text-green-700"
                          : post.status === "scheduled"
                            ? "bg-blue-100 text-blue-700"
                            : post.status === "failed"
                              ? "bg-red-100 text-red-700"
                              : "bg-gray-100 text-gray-700"
                      )}
                    >
                      {post.status}
                    </span>
                    {post.scheduled_at && (
                      <div className="flex items-center text-xs text-secondary-500">
                        <Clock className="h-3 w-3 mr-1" />
                        {format(new Date(post.scheduled_at), "h:mm a")}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-secondary-400 hover:text-primary-600"
                      onClick={() => onEditPost(post)}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-secondary-400 hover:text-red-600"
                      onClick={() => onDeletePost(post.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <p className="text-sm text-secondary-700 line-clamp-3 mb-3">
                  {getPostTextSafe(post)}
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-secondary-50">
                  <div className="flex gap-1">
                    {post.platforms.map((p) => (
                      <span
                        key={p}
                        className="text-[10px] bg-secondary-100 text-secondary-600 px-1.5 py-0.5 rounded capitalize"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-primary-600 hover:text-primary-700 p-0"
                    onClick={() => onReschedulePost(post.id)}
                  >
                    Reschedule
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
