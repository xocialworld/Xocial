import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { X, Clock, Edit2, Trash2, Calendar as CalendarIcon, Loader2, ExternalLink, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

// Content variant type
type ContentVariant = {
  id: string;
  platform: string;
  socialAccountId?: string;
  caption?: string;
  status: string;
  scheduledAt?: string;
  publishedAt?: string;
};

// Calendar post type - flexible to handle both Post and CalendarEntry shapes
type CalendarPost = {
  id: string;
  status: string;
  platforms?: string[];
  scheduled_at?: string;
  published_at?: string;
  created_at?: string;
  content?: Record<string, unknown>;
  _source?: string;
  _calendarDate?: string;
  _title?: string;
  _postType?: string;
  _permalink?: string;
  _metrics?: Record<string, unknown>;
  _variants?: ContentVariant[];
  external_post_id?: string;
  [key: string]: unknown;
};

interface DayPostsPanelProps {
  date: Date;
  posts: CalendarPost[];
  onClose: () => void;
  onEditPost: (post: CalendarPost) => void;
  onDeletePost: (postId: string) => void;
  onReschedulePost: (postId: string) => void;
  isLoading?: boolean;
}

/**
 * Loading skeleton for the day posts panel
 */
function DayPostsPanelSkeleton({ date, onClose }: { date: Date; onClose: () => void }) {
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
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white border border-secondary-200 rounded-lg p-3 animate-pulse"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-16 rounded" />
                  <Skeleton className="h-4 w-12 rounded" />
                </div>
              </div>
              <Skeleton className="h-4 w-full rounded mb-1" />
              <Skeleton className="h-4 w-3/4 rounded mb-1" />
              <Skeleton className="h-4 w-1/2 rounded mb-3" />
              <div className="flex items-center justify-between pt-2 border-t border-secondary-50">
                <div className="flex gap-1">
                  <Skeleton className="h-4 w-12 rounded" />
                  <Skeleton className="h-4 w-12 rounded" />
                </div>
                <Skeleton className="h-4 w-16 rounded" />
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

export function DayPostsPanel({
  date,
  posts,
  onClose,
  onEditPost,
  onDeletePost,
  onReschedulePost,
  onApprovePost,
  onRejectPost,
  isLoading = false,
}: DayPostsPanelProps & {
  onApprovePost?: (postId: string) => void;
  onRejectPost?: (postId: string) => void;
}) {
  // Show skeleton during loading
  if (isLoading) {
    return <DayPostsPanelSkeleton date={date} onClose={onClose} />;
  }
  function getPostTextSafe(post: CalendarPost): string {
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
            {posts.map((post: any) => {
              const isExternal = post._source === 'external';
              const permalink = post._permalink || post.external_post_id;
              const postType = post._postType;
              
              return (
              <div
                key={post.id}
                className={cn(
                  "group bg-white border rounded-lg p-3 hover:shadow-md transition-all",
                  isExternal 
                    ? "border-secondary-200/70 bg-secondary-50/30 hover:border-secondary-300" 
                    : "border-secondary-200 hover:border-primary-300"
                )}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Source indicator */}
                    {isExternal && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-secondary-200 text-secondary-600 flex items-center gap-1">
                        <Globe className="h-2.5 w-2.5" />
                        Imported
                      </span>
                    )}
                    {/* Status badge */}
                    <span
                      className={cn(
                        "text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider",
                        post.status === "published"
                          ? "bg-green-100 text-green-700"
                          : post.status === "scheduled"
                            ? "bg-blue-100 text-blue-700"
                            : post.status === "failed"
                              ? "bg-red-100 text-red-700"
                              : post.status === "pending_approval" || post.status === "in_review"
                                ? "bg-yellow-100 text-yellow-700"
                              : post.status === "approved"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-gray-100 text-gray-700"
                      )}
                    >
                      {(post.status || 'unknown').replace('_', ' ')}
                    </span>
                    {/* Post type badge (for external) */}
                    {postType && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-600 capitalize">
                        {postType}
                      </span>
                    )}
                    {/* Time indicator */}
                    {(post.scheduled_at || post.published_at) && (
                      <div className="flex items-center text-xs text-secondary-500">
                        <Clock className="h-3 w-3 mr-1" />
                        {format(new Date(post.scheduled_at || post.published_at), "h:mm a")}
                      </div>
                    )}
                  </div>
                  {/* Action buttons - only show for internal posts */}
                  {!isExternal && (
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
                  )}
                  {/* External link for imported posts */}
                  {isExternal && permalink && (
                    <a
                      href={permalink.startsWith('http') ? permalink : `https://${post.platforms?.[0] || 'platform'}.com/${permalink}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-secondary-400 hover:text-primary-600 transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>

                {/* Title (for internal items with title) */}
                {post._title && (
                  <p className="text-sm font-medium text-secondary-900 mb-1 line-clamp-1">
                    {post._title}
                  </p>
                )}

                <p className="text-sm text-secondary-700 line-clamp-3 mb-3">
                  {getPostTextSafe(post)}
                </p>

                {/* Platform variants - only for internal posts with variants */}
                {!isExternal && post._variants && post._variants.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[10px] font-medium text-secondary-500 uppercase tracking-wider mb-1.5">
                      Platform Variants
                    </p>
                    <div className="space-y-1.5">
                      {post._variants.map((variant: ContentVariant) => (
                        <div
                          key={variant.id}
                          className="flex items-center justify-between py-1 px-2 bg-secondary-50 rounded text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium capitalize text-secondary-700">
                              {variant.platform}
                            </span>
                            {variant.caption && (
                              <span className="text-secondary-500 line-clamp-1 max-w-[150px]">
                                {variant.caption.slice(0, 30)}...
                              </span>
                            )}
                          </div>
                          <span
                            className={cn(
                              "text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase",
                              variant.status === 'published'
                                ? "bg-green-100 text-green-700"
                                : variant.status === 'scheduled'
                                  ? "bg-blue-100 text-blue-700"
                                  : variant.status === 'ready'
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-gray-100 text-gray-600"
                            )}
                          >
                            {variant.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Approval actions - only for internal posts */}
                {!isExternal && (post.status === 'pending_approval' || post.status === 'in_review') && (
                  <div className="flex gap-2 mb-3">
                    {onApprovePost && (
                      <Button
                        variant="default"
                        size="sm"
                        className="flex-1 h-7 text-xs bg-green-600 hover:bg-green-700"
                        onClick={() => onApprovePost(post.id)}
                      >
                        Approve
                      </Button>
                    )}
                    {onRejectPost && (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="flex-1 h-7 text-xs"
                        onClick={() => onRejectPost(post.id)}
                      >
                        Reject
                      </Button>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-secondary-50">
                  <div className="flex gap-1 flex-wrap">
                    {(post.platforms || []).map((p: string) => (
                      <span
                        key={p}
                        className="text-[10px] bg-secondary-100 text-secondary-600 px-1.5 py-0.5 rounded capitalize"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                  {/* Reschedule button - only for internal non-published posts */}
                  {!isExternal && post.status !== 'published' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs text-primary-600 hover:text-primary-700 p-0"
                      onClick={() => onReschedulePost(post.id)}
                    >
                      Reschedule
                    </Button>
                  )}
                  {/* View metrics for external/published posts */}
                  {(isExternal || post.status === 'published') && post._metrics && Object.keys(post._metrics).length > 0 && (
                    <div className="flex items-center gap-2 text-[10px] text-secondary-500">
                      {typeof post._metrics.views === 'number' && post._metrics.views > 0 && (
                        <span>{post._metrics.views.toLocaleString()} views</span>
                      )}
                      {typeof post._metrics.likes === 'number' && post._metrics.likes > 0 && (
                        <span>{post._metrics.likes.toLocaleString()} likes</span>
                      )}
                      {typeof post._metrics.comments === 'number' && post._metrics.comments > 0 && (
                        <span>{post._metrics.comments.toLocaleString()} comments</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
