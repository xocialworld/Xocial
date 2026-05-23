"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
    AlertTriangle,
    Calendar,
    CheckCircle2,
    ChevronDown,
    Edit3,
    FileText,
    Image as ImageIcon,
    Loader2,
    RefreshCw,
    Save,
    Send,
    Sparkles,
    Upload,
    Video,
    Wand2,
    X,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { FacebookPreview } from "@/components/features/compose/previews/facebook-preview";
import { InstagramPreview } from "@/components/features/compose/previews/instagram-preview";
import { LinkedInPreview } from "@/components/features/compose/previews/linkedin-preview";
import { TikTokPreview } from "@/components/features/compose/previews/tiktok-preview";
import { TwitterPreview } from "@/components/features/compose/previews/twitter-preview";
import { YouTubePreview } from "@/components/features/compose/previews/youtube-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { PlatformIcon } from "@/components/ui/platform-icon";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { useAccounts } from "@/hooks/use-accounts";
import { getCompatiblePlatforms, PLATFORM_CAPABILITIES } from "@/lib/platforms/capabilities";
import { platformNames } from "@/lib/platform-colors";
import { invalidateAllPostQueries } from "@/lib/react-query";
import { createClient as createBrowserSupabaseClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { useSelectedWorkspace } from "@/store/workspaceStore";
import type { MediaFile, Platform, PostStatus } from "@/types";
import { MediaLibraryModal } from "./media-library-modal";

type Account = {
    id: string;
    platform: Platform;
    account_name: string;
    account_avatar?: string;
    is_active: boolean;
    token_expires_at?: string;
};

export type CreateContent = {
    text: string;
    platforms: Platform[];
    media: MediaFile[];
    platformContent: Partial<Record<Platform, string>>;
};

export type AIGenerationOptions = {
    tone?: string;
    audience?: string;
    style?: string;
    length?: string;
    model?: string;
};

type InitialSchedule = {
    date: string;
    time: string;
};

type AIGenerationMeta = {
    generationId?: string;
    model?: string;
    platforms: Platform[];
    sourcePrompt: string;
};

type RefinementType =
    | "shorter"
    | "longer"
    | "more_emojis"
    | "more_professional"
    | "more_casual"
    | "add_urgency"
    | "hashtags";

const PLATFORM_ORDER: Platform[] = [
    "instagram",
    "facebook",
    "twitter",
    "linkedin",
    "youtube",
    "tiktok",
];

const EMPTY_CONTENT: CreateContent = {
    text: "",
    platforms: [],
    media: [],
    platformContent: {},
};

const QUICK_REGEN_OPTIONS: Array<{ value: RefinementType; label: string }> = [
    { value: "shorter", label: "Shorter" },
    { value: "longer", label: "More detailed" },
    { value: "more_professional", label: "More professional" },
    { value: "more_casual", label: "More casual" },
    { value: "add_urgency", label: "Stronger CTA" },
    { value: "hashtags", label: "Add hashtags" },
];

const STEP_LABELS = ["Compose", "Preview", "Publish"] as const;

function formatLocalDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function formatLocalTime(date: Date): string {
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
}

function parseInitialSchedule(dateParam: string | null, timeParam: string | null): InitialSchedule | undefined {
    if (!dateParam) return undefined;

    const cleanTime = timeParam && /^\d{2}:\d{2}$/.test(timeParam) ? timeParam : undefined;

    if (/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
        return {
            date: dateParam,
            time: cleanTime || "10:00",
        };
    }

    const parsedDate = new Date(dateParam);
    if (Number.isNaN(parsedDate.getTime())) return undefined;

    return {
        date: formatLocalDate(parsedDate),
        time: cleanTime || formatLocalTime(parsedDate),
    };
}

function getPlatformLabel(platform: Platform) {
    return platformNames[platform] || platform;
}

function formatPlatformList(platforms: Platform[]) {
    return platforms.map(getPlatformLabel).join(", ");
}

function platformAccounts(accounts: Account[], platform: Platform) {
    return accounts.filter((account) => account.platform?.toLowerCase() === platform);
}

function getPreviewMedia(media: MediaFile[]) {
    return media.map((item) => ({
        id: item.id,
        url: item.url,
        type: item.type,
    }));
}

function getPlatformIssue(platform: Platform, content: Pick<CreateContent, "media">, hasText: boolean) {
    const hasImages = content.media.some((item) => item.type === "image");
    const hasVideos = content.media.some((item) => item.type === "video");
    const { incompatible } = getCompatiblePlatforms([platform], {
        hasText,
        hasImages,
        hasVideos,
        imageCount: content.media.filter((item) => item.type === "image").length,
        videoCount: content.media.filter((item) => item.type === "video").length,
    });

    return incompatible[0]?.reason;
}

function buildPostPayload({
    content,
    includedPlatforms,
    accountSelections,
    status,
    scheduledAt,
    aiOptions,
    aiMetadata,
}: {
    content: CreateContent;
    includedPlatforms: Platform[];
    accountSelections: Partial<Record<Platform, string>>;
    status: PostStatus;
    scheduledAt?: Date;
    aiOptions?: AIGenerationOptions;
    aiMetadata?: AIGenerationMeta;
}) {
    const postContent = includedPlatforms.reduce((acc, platform) => {
        acc[platform] = {
            text: content.platformContent[platform] || content.text,
        };
        return acc;
    }, {} as Record<string, { text: string }>);

    const platformAccountsPayload = includedPlatforms.reduce((acc, platform) => {
        const accountId = accountSelections[platform];
        if (accountId) {
            acc[platform] = accountId;
        }
        return acc;
    }, {} as Partial<Record<Platform, string>>);

    const mediaPayload = content.media.map((item) => ({
        id: item.id,
        url: item.url,
        type: item.type,
        filename: item.name,
        size: item.size,
    }));

    return {
        content: postContent,
        platforms: includedPlatforms,
        platformAccounts: Object.keys(platformAccountsPayload).length > 0 ? platformAccountsPayload : undefined,
        status,
        scheduled_at: scheduledAt?.toISOString(),
        media: mediaPayload,
        mediaIds: content.media.map((item) => item.id),
        ai_generated: Boolean(aiMetadata),
        ai_generation_id: aiMetadata?.generationId,
        ai_prompt: aiMetadata?.sourcePrompt,
        ai_metadata: aiMetadata
            ? {
                ...aiOptions,
                model: aiMetadata?.model || aiOptions?.model,
                platforms: includedPlatforms,
            }
            : undefined,
    };
}

function withWorkspace(path: string, workspaceId?: string) {
    if (!workspaceId) return path;
    const separator = path.includes("?") ? "&" : "?";
    return `${path}${separator}workspaceId=${encodeURIComponent(workspaceId)}`;
}

function workspaceHeader(workspaceId?: string): Record<string, string> {
    return workspaceId ? { "x-workspace-id": workspaceId } : {};
}

async function authHeader(): Promise<Record<string, string>> {
    const {
        data: { session },
    } = await createBrowserSupabaseClient().auth.getSession();

    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
}

function getPublishResultsMessage(payload: any) {
    const results =
        payload?.results ||
        payload?.error?.details?.errors ||
        payload?.error?.details?.results ||
        payload?.data?.results;

    if (!Array.isArray(results)) return "";

    return results
        .filter((result: any) => result && result.success === false)
        .map((result: any) => `${getPlatformLabel(result.platform as Platform)}: ${result.error || "Publish failed"}`)
        .join("; ");
}

function getSubmitErrorMessage(payload: any, fallback: string) {
    return (
        getPublishResultsMessage(payload) ||
        payload?.error?.message ||
        (typeof payload?.error === "string" ? payload.error : "") ||
        payload?.message ||
        fallback
    );
}

async function submitPost(
    payload: ReturnType<typeof buildPostPayload>,
    workspaceId?: string
): Promise<{ post: any; success: boolean }> {
    const url = workspaceId ? `/api/posts?workspaceId=${encodeURIComponent(workspaceId)}` : "/api/posts";

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...workspaceHeader(workspaceId),
        },
        body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        const errorMsg = getSubmitErrorMessage(data, `Request failed with status ${response.status}`);
        throw new Error(errorMsg);
    }

    return {
        post: data.data?.post || data.post,
        success: true,
    };
}

export function UnifiedPostComposer() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const queryClient = useQueryClient();
    const workspace = useSelectedWorkspace();
    const workspaceId = workspace?.id;
    const { accounts: connectedAccounts, loading: loadingAccounts, error, refetch } = useAccounts();

    const [content, setContent] = useState<CreateContent>(EMPTY_CONTENT);
    const [accountSelections, setAccountSelections] = useState<Partial<Record<Platform, string>>>({});
    const [includedPlatforms, setIncludedPlatforms] = useState<Platform[]>([]);
    const [previewsReady, setPreviewsReady] = useState(false);
    const [isGeneratingBase, setIsGeneratingBase] = useState(false);
    const [isCreatingPreviews, setIsCreatingPreviews] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showMediaLibrary, setShowMediaLibrary] = useState(false);
    const [aiMetadata, setAiMetadata] = useState<AIGenerationMeta | undefined>();
    const [aiOptions] = useState<AIGenerationOptions>({
        tone: "professional",
        length: "medium",
    });
    const [initialSchedule, setInitialSchedule] = useState<InitialSchedule | undefined>();
    const [scheduledDate, setScheduledDate] = useState("");
    const [scheduledTime, setScheduledTime] = useState("10:00");
    const [publishMenuOpen, setPublishMenuOpen] = useState(false);
    const [showScheduleFields, setShowScheduleFields] = useState(false);
    const [regeneratePlatform, setRegeneratePlatform] = useState<Platform | null>(null);
    const [customInstruction, setCustomInstruction] = useState("");
    const [regeneratingPlatform, setRegeneratingPlatform] = useState<Platform | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const prefillApplied = useRef(false);

    const accounts = connectedAccounts as Account[];

    useEffect(() => {
        if (prefillApplied.current) return;

        const schedule = parseInitialSchedule(searchParams.get("date"), searchParams.get("time"));
        if (schedule) {
            setInitialSchedule(schedule);
            setScheduledDate(schedule.date);
            setScheduledTime(schedule.time);
            prefillApplied.current = true;
            return;
        }

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setScheduledDate(formatLocalDate(tomorrow));
        setScheduledTime("10:00");
    }, [searchParams]);

    useEffect(() => {
        if (!error) return;
        const message =
            typeof error === "string" ? error : (error as any)?.message || "Failed to load connected accounts";
        toast.error(message);
    }, [error]);

    useEffect(() => {
        setAccountSelections((prev) => {
            let changed = false;
            const next: Partial<Record<Platform, string>> = {};

            content.platforms.forEach((platform) => {
                const options = platformAccounts(accounts, platform);
                const current = prev[platform];
                const currentIsValid = Boolean(current && options.some((account) => account.id === current));
                const preferred = currentIsValid
                    ? current
                    : options.find((account) => account.is_active)?.id || options[0]?.id;

                if (preferred) {
                    next[platform] = preferred;
                }
                if (prev[platform] !== next[platform]) {
                    changed = true;
                }
            });

            Object.keys(prev).forEach((platform) => {
                if (!content.platforms.includes(platform as Platform)) {
                    changed = true;
                }
            });

            return changed ? next : prev;
        });
    }, [accounts, content.platforms]);

    const hasPlatformText = Object.values(content.platformContent).some((value) => value?.trim());
    const hasText = content.text.trim().length > 0 || hasPlatformText;
    const hasContent = hasText || content.media.length > 0;
    const previewMedia = useMemo(() => getPreviewMedia(content.media), [content.media]);
    const currentStep = previewsReady ? (includedPlatforms.length > 0 ? 2 : 1) : 0;

    const compatiblePlatforms = useMemo(() => {
        const hasImages = content.media.some((item) => item.type === "image");
        const hasVideos = content.media.some((item) => item.type === "video");

        return getCompatiblePlatforms(content.platforms, {
            hasText,
            hasImages,
            hasVideos,
            imageCount: content.media.filter((item) => item.type === "image").length,
            videoCount: content.media.filter((item) => item.type === "video").length,
        });
    }, [content.media, content.platforms, hasText]);

    const selectedIncludedPlatforms = includedPlatforms.filter((platform) => content.platforms.includes(platform));

    const canCreatePreviews =
        content.platforms.length > 0 && content.text.trim().length >= 10 && !isCreatingPreviews;

    const resetPreviewsForBaseChange = useCallback(() => {
        setPreviewsReady(false);
        setIncludedPlatforms([]);
    }, []);

    const handlePlatformToggle = useCallback((platform: Platform) => {
        setContent((prev) => {
            const exists = prev.platforms.includes(platform);
            const platforms = exists
                ? prev.platforms.filter((item) => item !== platform)
                : [...prev.platforms, platform];

            return { ...prev, platforms };
        });
        resetPreviewsForBaseChange();
    }, [resetPreviewsForBaseChange]);

    const handleTextChange = useCallback((value: string) => {
        setContent((prev) => ({ ...prev, text: value }));
        setAiMetadata(undefined);
        resetPreviewsForBaseChange();
    }, [resetPreviewsForBaseChange]);

    const handleAccountSelect = useCallback((platform: Platform, accountId: string) => {
        setAccountSelections((prev) => ({ ...prev, [platform]: accountId }));
        setContent((prev) => {
            if (prev.platforms.includes(platform)) return prev;
            return { ...prev, platforms: [...prev.platforms, platform] };
        });
    }, []);

    const handleMediaUpload = useCallback(async (files: File[]) => {
        if (!workspaceId) {
            toast.error("Select a workspace before uploading media");
            return;
        }

        const validFiles = files.filter((file) => file.type.startsWith("image/") || file.type.startsWith("video/"));
        if (validFiles.length === 0) {
            toast.error("Upload images or videos only");
            return;
        }

        const uploadPromises = validFiles.map(async (file) => {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("workspaceId", workspaceId);
            const response = await fetch(withWorkspace("/api/media/upload", workspaceId), {
                method: "POST",
                credentials: "include",
                headers: {
                    ...workspaceHeader(workspaceId),
                    ...(await authHeader()),
                },
                body: formData,
            });
            const payload = await response.json().catch(() => null);

            if (!response.ok) {
                throw new Error(payload?.error || `Failed to upload ${file.name}`);
            }

            return {
                id: payload.id,
                url: payload.url,
                type: payload.type,
                name: payload.name,
                size: payload.size,
            } as MediaFile;
        });

        const results = await Promise.allSettled(uploadPromises);
        const succeeded = results.filter((result): result is PromiseFulfilledResult<MediaFile> => result.status === "fulfilled");
        const failed = results.filter((result): result is PromiseRejectedResult => result.status === "rejected");

        if (succeeded.length > 0) {
            setContent((prev) => ({
                ...prev,
                media: [...prev.media, ...succeeded.map((result) => result.value)],
            }));
            resetPreviewsForBaseChange();
            toast.success(`${succeeded.length} file${succeeded.length > 1 ? "s" : ""} uploaded`);
        }
        if (failed.length > 0) {
            toast.error(failed[0].reason?.message || "Some uploads failed");
        }
    }, [resetPreviewsForBaseChange, workspaceId]);

    const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || []);
        if (files.length > 0) {
            void handleMediaUpload(files);
        }
        event.target.value = "";
    }, [handleMediaUpload]);

    const handleLibrarySelect = useCallback((selectedMedia: MediaFile[]) => {
        setContent((prev) => ({
            ...prev,
            media: [...prev.media, ...selectedMedia],
        }));
        resetPreviewsForBaseChange();
        toast.success(`${selectedMedia.length} file${selectedMedia.length > 1 ? "s" : ""} added`);
    }, [resetPreviewsForBaseChange]);

    const handleMediaRemove = useCallback((mediaId: string) => {
        setContent((prev) => ({
            ...prev,
            media: prev.media.filter((item) => item.id !== mediaId),
        }));
        resetPreviewsForBaseChange();
    }, [resetPreviewsForBaseChange]);

    const handleGenerateBase = useCallback(async () => {
        if (content.platforms.length === 0) {
            toast.error("Select at least one platform first");
            return;
        }
        if (content.text.trim().length < 10) {
            toast.error("Write a short brief before using AI");
            return;
        }
        if (!workspaceId) {
            toast.error("Select a workspace before using AI");
            return;
        }

        setIsGeneratingBase(true);
        try {
            const sourcePrompt = content.text;
            const response = await fetch(withWorkspace("/api/ai/generate", workspaceId), {
                method: "POST",
                headers: { "Content-Type": "application/json", ...workspaceHeader(workspaceId) },
                body: JSON.stringify({
                    prompt: sourcePrompt,
                    platforms: content.platforms,
                    tone: aiOptions.tone,
                    length: aiOptions.length,
                    model: aiOptions.model,
                }),
            });

            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(payload?.error?.message || payload?.message || "Failed to generate content");
            }

            const platformContent = payload?.data?.platformContent || {};
            const firstPlatform = content.platforms[0];
            const firstGenerated = Object.values(platformContent).find(
                (item): item is { text: string } => Boolean((item as any)?.text)
            );
            const firstText =
                platformContent[firstPlatform]?.text ||
                firstGenerated?.text ||
                "";

            if (!firstText) {
                throw new Error("AI returned empty content");
            }

            setContent((prev) => ({
                ...prev,
                text: firstText,
                platformContent: {},
            }));
            setAiMetadata({
                generationId: payload?.data?.generationId,
                model: payload?.data?.model,
                platforms: content.platforms,
                sourcePrompt,
            });
            resetPreviewsForBaseChange();
            toast.success("Base content generated");
        } catch (generateError: any) {
            console.error("[Create] AI base generation failed:", generateError);
            toast.error("AI generation failed. Please retry or check AI Gateway configuration.");
        } finally {
            setIsGeneratingBase(false);
        }
    }, [aiOptions.length, aiOptions.model, aiOptions.tone, content.platforms, content.text, resetPreviewsForBaseChange, workspaceId]);

    const validatePreviewCreation = useCallback(() => {
        if (content.platforms.length === 0) {
            toast.error("Select at least one platform");
            return false;
        }
        if (content.text.trim().length < 10) {
            toast.error("Add a base caption or brief with at least 10 characters");
            return false;
        }
        if (!workspaceId) {
            toast.error("Select a workspace before creating previews");
            return false;
        }

        return true;
    }, [content.platforms.length, content.text, workspaceId]);

    const handleCreateDirectPreviews = useCallback(() => {
        if (!validatePreviewCreation()) return;

        const platformContent = content.platforms.reduce((acc, platform) => {
            acc[platform] = content.text;
            return acc;
        }, {} as Partial<Record<Platform, string>>);
        const defaultIncluded = compatiblePlatforms.compatible.filter((platform) => content.platforms.includes(platform));

        setContent((prev) => ({ ...prev, platformContent }));
        setAiMetadata(undefined);
        setIncludedPlatforms(defaultIncluded);
        setPreviewsReady(true);
        toast.success("Previews created from pasted content");
    }, [compatiblePlatforms.compatible, content.platforms, content.text, validatePreviewCreation]);

    const handleCreateAIPreviews = useCallback(async () => {
        if (!validatePreviewCreation()) return;

        setIsCreatingPreviews(true);
        try {
            const sourcePrompt = content.text;
            const response = await fetch(withWorkspace("/api/ai/generate", workspaceId), {
                method: "POST",
                headers: { "Content-Type": "application/json", ...workspaceHeader(workspaceId) },
                body: JSON.stringify({
                    prompt: sourcePrompt,
                    platforms: content.platforms,
                    tone: aiOptions.tone,
                    length: aiOptions.length,
                    model: aiOptions.model,
                    addHashtags: true,
                    addCTA: true,
                }),
            });

            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(payload?.error?.message || payload?.message || "Failed to create previews");
            }

            const generated = payload?.data?.platformContent || {};
            const platformContent = content.platforms.reduce((acc, platform) => {
                acc[platform] = generated[platform]?.text || content.text;
                return acc;
            }, {} as Partial<Record<Platform, string>>);

            const defaultIncluded = compatiblePlatforms.compatible.filter((platform) => content.platforms.includes(platform));

            setContent((prev) => ({ ...prev, platformContent }));
            setAiMetadata({
                generationId: payload?.data?.generationId,
                model: payload?.data?.model,
                platforms: content.platforms,
                sourcePrompt,
            });
            setIncludedPlatforms(defaultIncluded);
            setPreviewsReady(true);
            toast.success("Platform previews created");
        } catch (previewError: any) {
            console.error("[Create] AI preview generation failed:", previewError);
            const platformContent = content.platforms.reduce((acc, platform) => {
                acc[platform] = content.text;
                return acc;
            }, {} as Partial<Record<Platform, string>>);
            const defaultIncluded = compatiblePlatforms.compatible.filter((platform) => content.platforms.includes(platform));

            setContent((prev) => ({ ...prev, platformContent }));
            setIncludedPlatforms(defaultIncluded);
            setPreviewsReady(true);
            toast.warning("AI adaptation failed. Editable base-content previews were created instead.");
        } finally {
            setIsCreatingPreviews(false);
        }
    }, [aiOptions.length, aiOptions.model, aiOptions.tone, compatiblePlatforms.compatible, content.platforms, content.text, validatePreviewCreation, workspaceId]);

    const handlePlatformContentChange = useCallback((platform: Platform, value: string) => {
        setContent((prev) => ({
            ...prev,
            platformContent: {
                ...prev.platformContent,
                [platform]: value,
            },
        }));
    }, []);

    const handleIncludedChange = useCallback((platform: Platform, checked: boolean) => {
        setIncludedPlatforms((prev) => {
            if (checked) {
                return prev.includes(platform) ? prev : [...prev, platform];
            }
            return prev.filter((item) => item !== platform);
        });
    }, []);

    const regeneratePlatformContent = useCallback(async (
        platform: Platform,
        refinementType: RefinementType | "custom",
        instruction?: string
    ) => {
        const currentContent = content.platformContent[platform] || content.text;
        if (!currentContent.trim()) {
            toast.error("Add content before regenerating");
            return;
        }

        setRegeneratingPlatform(platform);
        try {
            let nextContent = currentContent;

            if (refinementType === "hashtags") {
                const response = await fetch(withWorkspace("/api/ai/hashtags", workspaceId), {
                    method: "POST",
                    headers: { "Content-Type": "application/json", ...workspaceHeader(workspaceId) },
                    body: JSON.stringify({ content: currentContent, platform, count: 8 }),
                });
                const payload = await response.json().catch(() => ({}));
                if (!response.ok) {
                    throw new Error(payload?.error?.message || "Failed to generate hashtags");
                }
                const hashtags = payload?.data?.hashtags || [];
                if (hashtags.length > 0) {
                    nextContent = `${currentContent}\n\n${hashtags.map((tag: string) => `#${tag.replace(/^#/, "")}`).join(" ")}`;
                }
            } else {
                const response = await fetch(withWorkspace("/api/ai/refine", workspaceId), {
                    method: "POST",
                    headers: { "Content-Type": "application/json", ...workspaceHeader(workspaceId) },
                    body: JSON.stringify({
                        content: currentContent,
                        platform,
                        refinementType,
                        customInstruction: instruction,
                    }),
                });
                const payload = await response.json().catch(() => ({}));
                if (!response.ok) {
                    throw new Error(payload?.error?.message || "Failed to regenerate content");
                }
                nextContent = payload?.data?.text || currentContent;
            }

            handlePlatformContentChange(platform, nextContent);
            setRegeneratePlatform(null);
            setCustomInstruction("");
            toast.success(`${getPlatformLabel(platform)} preview updated`);
        } catch (regenerateError: any) {
            toast.error(regenerateError.message || "Failed to regenerate content");
        } finally {
            setRegeneratingPlatform(null);
        }
    }, [content.platformContent, content.text, handlePlatformContentChange, workspaceId]);

    const validateBeforeSubmit = useCallback((status: PostStatus, scheduledAt?: Date) => {
        if (selectedIncludedPlatforms.length === 0) {
            toast.error("Select at least one preview to continue");
            return false;
        }

        const blocked = selectedIncludedPlatforms
            .map((platform) => ({ platform, reason: getPlatformIssue(platform, content, hasText) }))
            .filter((item): item is { platform: Platform; reason: string } => Boolean(item.reason));

        if (blocked.length > 0) {
            toast.error(`Fix platform requirements: ${blocked.map((item) => `${getPlatformLabel(item.platform)}: ${item.reason}`).join("; ")}`);
            return false;
        }

        if (status !== "draft") {
            const missingAccounts = selectedIncludedPlatforms.filter((platform) => !accountSelections[platform]);
            if (missingAccounts.length > 0) {
                toast.error(`Select accounts for: ${formatPlatformList(missingAccounts)}`);
                return false;
            }
        }

        if (status === "scheduled") {
            if (!scheduledAt) {
                toast.error("Choose a schedule date and time");
                return false;
            }
            if (scheduledAt <= new Date()) {
                toast.error("Schedule time must be in the future");
                return false;
            }
        }

        if (!workspaceId) {
            toast.error("Select a workspace first");
            return false;
        }

        return true;
    }, [accountSelections, content, hasText, selectedIncludedPlatforms, workspaceId]);

    const handleSubmitPost = useCallback(async (status: PostStatus, scheduledAt?: Date) => {
        if (!validateBeforeSubmit(status, scheduledAt)) return;

        setIsSubmitting(true);
        try {
            const payload = buildPostPayload({
                content,
                includedPlatforms: selectedIncludedPlatforms,
                accountSelections,
                status,
                scheduledAt,
                aiOptions,
                aiMetadata,
            });
            const result = await submitPost(payload, workspaceId);
            const finalStatus = result.post?.status || status;

            if (finalStatus === "published") {
                toast.success("Post published successfully");
            } else if (finalStatus === "partial") {
                toast.warning(result.post?.error_message || "Published to some platforms with errors");
            } else if (finalStatus === "scheduled") {
                toast.success(`Post scheduled for ${scheduledAt?.toLocaleString()}`);
            } else if (finalStatus === "pending_approval") {
                toast.success("Post submitted for approval");
            } else {
                toast.success("Draft saved");
            }

            await invalidateAllPostQueries(queryClient);
            setContent(EMPTY_CONTENT);
            setIncludedPlatforms([]);
            setPreviewsReady(false);
            setAccountSelections({});
            setAiMetadata(undefined);
            setTimeout(() => router.push("/o"), 300);
        } catch (submitError: any) {
            toast.error(submitError.message || "Failed to create post");
        } finally {
            setIsSubmitting(false);
        }
    }, [accountSelections, aiMetadata, aiOptions, content, queryClient, router, selectedIncludedPlatforms, validateBeforeSubmit, workspaceId]);

    const handleScheduleSubmit = useCallback(() => {
        const scheduledAt = scheduledDate && scheduledTime ? new Date(`${scheduledDate}T${scheduledTime}`) : undefined;
        void handleSubmitPost("scheduled", scheduledAt);
    }, [handleSubmitPost, scheduledDate, scheduledTime]);

    const selectedPreviewCount = selectedIncludedPlatforms.length;
    const missingPublishAccounts = selectedIncludedPlatforms.filter((platform) => !accountSelections[platform]);
    const publishBlockedReason = missingPublishAccounts.length > 0
        ? `Connect or select accounts for: ${formatPlatformList(missingPublishAccounts)}`
        : undefined;

    return (
        <div className="mx-auto max-w-[1320px] space-y-6 pb-12">
            <StepIndicator currentStep={currentStep} />

            <section className="rounded-xl border border-secondary-200 bg-white shadow-sm">
                <div className="border-b border-secondary-100 px-4 py-4 sm:px-6">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h2 className="text-base font-semibold text-secondary-900">Create post</h2>
                            <p className="mt-1 text-sm text-secondary-500">
                                Select channels, prepare content, then create previews for each platform.
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={refetch}
                            disabled={loadingAccounts}
                            className="w-fit gap-2"
                        >
                            <RefreshCw className={cn("h-4 w-4", loadingAccounts && "animate-spin")} />
                            Refresh accounts
                        </Button>
                    </div>
                </div>

                <div className="space-y-6 p-4 sm:p-6">
                    <DestinationBar
                        accounts={accounts}
                        selectedPlatforms={content.platforms}
                        accountSelections={accountSelections}
                        onPlatformToggle={handlePlatformToggle}
                        onAccountSelect={handleAccountSelect}
                        loadingAccounts={loadingAccounts}
                    />

                    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between gap-3">
                                <Label htmlFor="base-content" className="text-sm font-medium text-secondary-800">
                                    Content box
                                </Label>
                                <span className="text-xs text-secondary-500">{content.text.length} characters</span>
                            </div>
                            <Textarea
                                id="base-content"
                                value={content.text}
                                onChange={(event) => handleTextChange(event.target.value)}
                                placeholder="Paste an existing caption, or write a brief for AI to turn into platform-specific posts..."
                                className="min-h-[220px] resize-y border-secondary-200 text-base leading-relaxed focus:border-primary-500 focus:ring-primary-500"
                            />
                            {content.text.length > 0 && content.text.length < 10 && (
                                <p className="text-xs text-amber-600">
                                    Add {10 - content.text.length} more characters to create previews.
                                </p>
                            )}
                        </div>

                        <ComposerActions
                            canGenerateBase={content.platforms.length > 0 && content.text.trim().length >= 10}
                            canCreatePreviews={canCreatePreviews}
                            isGeneratingBase={isGeneratingBase}
                            isCreatingPreviews={isCreatingPreviews}
                            onGenerateBase={handleGenerateBase}
                            onCreateDirectPreviews={handleCreateDirectPreviews}
                            onCreateAIPreviews={handleCreateAIPreviews}
                            onUpload={() => fileInputRef.current?.click()}
                            onBrowseLibrary={() => setShowMediaLibrary(true)}
                            selectedPlatformCount={content.platforms.length}
                        />
                    </div>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,video/*"
                        multiple
                        className="hidden"
                        onChange={handleFileSelect}
                    />

                    <MediaStrip
                        media={content.media}
                        onUploadClick={() => fileInputRef.current?.click()}
                        onBrowseLibrary={() => setShowMediaLibrary(true)}
                        onRemove={handleMediaRemove}
                    />
                </div>
            </section>

            {previewsReady && (
                <section className="space-y-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <h2 className="text-base font-semibold text-secondary-900">Platform previews</h2>
                            <p className="mt-1 text-sm text-secondary-500">
                                Review each post as it will appear on the selected channel. Only checked previews are saved or published.
                            </p>
                        </div>
                        <Badge variant="primary" size="lg">
                            {selectedPreviewCount}/{content.platforms.length} selected
                        </Badge>
                    </div>

                    <div className="grid gap-5 xl:grid-cols-2">
                        {content.platforms.map((platform) => {
                            const platformText = content.platformContent[platform] || content.text;
                            const issue = getPlatformIssue(platform, { media: content.media }, Boolean(platformText.trim()));
                            const checked = includedPlatforms.includes(platform);

                            return (
                                <PreviewCard
                                    key={platform}
                                    platform={platform}
                                    content={platformText}
                                    media={previewMedia}
                                    checked={checked}
                                    issue={issue}
                                    accountIssue={!accountSelections[platform] ? "Drafts allowed. Select an account before publishing or scheduling." : undefined}
                                    charLimit={PLATFORM_CAPABILITIES[platform].maxTextLength}
                                    account={accounts.find((account) => account.id === accountSelections[platform])}
                                    onCheckedChange={(nextChecked) => handleIncludedChange(platform, nextChecked)}
                                    onContentChange={(value) => handlePlatformContentChange(platform, value)}
                                    onRegenerate={() => setRegeneratePlatform(platform)}
                                />
                            );
                        })}
                    </div>

                    <PublishActionBar
                        selectedCount={selectedPreviewCount}
                        totalCount={content.platforms.length}
                        isSubmitting={isSubmitting}
                        publishMenuOpen={publishMenuOpen}
                        showScheduleFields={showScheduleFields}
                        publishBlockedReason={publishBlockedReason}
                        scheduledDate={scheduledDate}
                        scheduledTime={scheduledTime}
                        initialSchedule={initialSchedule}
                        onPublishMenuOpenChange={(open) => {
                            setPublishMenuOpen(open);
                            if (!open) setShowScheduleFields(false);
                        }}
                        onShowScheduleFields={() => setShowScheduleFields(true)}
                        onScheduledDateChange={setScheduledDate}
                        onScheduledTimeChange={setScheduledTime}
                        onSaveDraft={() => void handleSubmitPost("draft")}
                        onPublishNow={() => void handleSubmitPost("published")}
                        onSchedule={handleScheduleSubmit}
                    />
                </section>
            )}

            <RegenerateDialog
                platform={regeneratePlatform}
                customInstruction={customInstruction}
                isRegenerating={Boolean(regeneratingPlatform)}
                onCustomInstructionChange={setCustomInstruction}
                onClose={() => {
                    setRegeneratePlatform(null);
                    setCustomInstruction("");
                }}
                onQuickRegenerate={(platform, type) => void regeneratePlatformContent(platform, type)}
                onCustomRegenerate={(platform, instruction) => void regeneratePlatformContent(platform, "custom", instruction)}
            />

            <MediaLibraryModal
                isOpen={showMediaLibrary}
                onClose={() => setShowMediaLibrary(false)}
                onSelect={handleLibrarySelect}
                workspaceId={workspaceId}
            />
        </div>
    );
}

function StepIndicator({ currentStep }: { currentStep: number }) {
    return (
        <div className="rounded-xl border border-secondary-200 bg-white px-4 py-3 shadow-sm">
            <div className="grid grid-cols-3 gap-2">
                {STEP_LABELS.map((label, index) => {
                    const isComplete = currentStep > index;
                    const isCurrent = currentStep === index;

                    return (
                        <div
                            key={label}
                            className={cn(
                                "flex min-w-0 items-center gap-2 rounded-lg px-3 py-2",
                                isComplete && "bg-emerald-50 text-emerald-800",
                                isCurrent && "bg-primary-50 text-primary-800",
                                !isComplete && !isCurrent && "bg-secondary-50 text-secondary-500"
                            )}
                        >
                            {isComplete ? (
                                <CheckCircle2 className="h-4 w-4 shrink-0" />
                            ) : (
                                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold">
                                    {index + 1}
                                </span>
                            )}
                            <span className="truncate text-sm font-medium">{label}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function DestinationBar({
    accounts,
    selectedPlatforms,
    accountSelections,
    onPlatformToggle,
    onAccountSelect,
    loadingAccounts,
}: {
    accounts: Account[];
    selectedPlatforms: Platform[];
    accountSelections: Partial<Record<Platform, string>>;
    onPlatformToggle: (platform: Platform) => void;
    onAccountSelect: (platform: Platform, accountId: string) => void;
    loadingAccounts: boolean;
}) {
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
                <Label className="text-sm font-medium text-secondary-800">Platforms and accounts</Label>
                {selectedPlatforms.length === 0 && (
                    <span className="text-xs text-amber-600">Select at least one platform</span>
                )}
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
                {PLATFORM_ORDER.map((platform) => {
                    const isSelected = selectedPlatforms.includes(platform);
                    const options = platformAccounts(accounts, platform);
                    const selectedAccountId = accountSelections[platform] || "";
                    const selectedAccount = options.find((account) => account.id === selectedAccountId);
                    const hasAccounts = options.length > 0;

                    return (
                        <div
                            key={platform}
                            className={cn(
                                "min-w-[180px] rounded-lg border bg-white p-3 transition-colors",
                                isSelected ? "border-primary-300 bg-primary-50/50" : "border-secondary-200 hover:border-secondary-300",
                                loadingAccounts && "opacity-60"
                            )}
                        >
                            <button
                                type="button"
                                onClick={() => onPlatformToggle(platform)}
                                disabled={loadingAccounts}
                                className="flex w-full items-center gap-2 text-left"
                            >
                                <span className={cn(
                                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-white",
                                    platform === "instagram" && "bg-pink-500",
                                    platform === "facebook" && "bg-blue-600",
                                    platform === "twitter" && "bg-sky-500",
                                    platform === "linkedin" && "bg-blue-700",
                                    platform === "youtube" && "bg-red-600",
                                    platform === "tiktok" && "bg-secondary-950"
                                )}>
                                    <PlatformIcon platform={platform} className="h-4 w-4" />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-semibold text-secondary-900">
                                        {getPlatformLabel(platform)}
                                    </span>
                                    <span className="block truncate text-xs text-secondary-500">
                                        {selectedAccount?.account_name || (hasAccounts ? `${options.length} account${options.length > 1 ? "s" : ""}` : "Draft only")}
                                    </span>
                                </span>
                                <span
                                    className={cn(
                                        "h-3 w-3 rounded-full border",
                                        isSelected ? "border-primary-600 bg-primary-600" : "border-secondary-300 bg-white"
                                    )}
                                />
                            </button>

                            {isSelected && hasAccounts && (
                                <select
                                    aria-label={`${getPlatformLabel(platform)} account`}
                                    value={selectedAccountId}
                                    onChange={(event) => onAccountSelect(platform, event.target.value)}
                                    className="mt-3 h-8 w-full rounded-md border border-secondary-200 bg-white px-2 text-xs text-secondary-700 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                                >
                                    {options.map((account) => (
                                        <option key={account.id} value={account.id}>
                                            {account.account_name}{account.is_active ? "" : " (reconnect)"}
                                        </option>
                                    ))}
                                </select>
                            )}

                            {isSelected && !hasAccounts && (
                                <p className="mt-3 rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-700">
                                    Drafts allowed. Connect an account before publish.
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function ComposerActions({
    canGenerateBase,
    canCreatePreviews,
    isGeneratingBase,
    isCreatingPreviews,
    onGenerateBase,
    onCreateDirectPreviews,
    onCreateAIPreviews,
    onUpload,
    onBrowseLibrary,
    selectedPlatformCount,
}: {
    canGenerateBase: boolean;
    canCreatePreviews: boolean;
    isGeneratingBase: boolean;
    isCreatingPreviews: boolean;
    onGenerateBase: () => void;
    onCreateDirectPreviews: () => void;
    onCreateAIPreviews: () => void;
    onUpload: () => void;
    onBrowseLibrary: () => void;
    selectedPlatformCount: number;
}) {
    return (
        <div className="rounded-lg border border-secondary-200 bg-secondary-50/60 p-4">
            <div className="space-y-3">
                <Button
                    type="button"
                    onClick={onGenerateBase}
                    disabled={!canGenerateBase || isGeneratingBase}
                    variant="outline"
                    className="w-full justify-start gap-2 bg-white"
                >
                    {isGeneratingBase ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    Generate with AI
                </Button>
                <Button
                    type="button"
                    onClick={onUpload}
                    variant="outline"
                    className="w-full justify-start gap-2 bg-white"
                >
                    <Upload className="h-4 w-4" />
                    Upload media
                </Button>
                <Button
                    type="button"
                    onClick={onBrowseLibrary}
                    variant="outline"
                    className="w-full justify-start gap-2 bg-white"
                >
                    <ImageIcon className="h-4 w-4" />
                    Browse library
                </Button>
                <Button
                    type="button"
                    disabled
                    variant="outline"
                    className="w-full justify-start gap-2 bg-white"
                    title="Future AI media generation feature"
                >
                    <Wand2 className="h-4 w-4" />
                    Create media with AI
                    <span className="ml-auto rounded-full bg-secondary-100 px-2 py-0.5 text-[10px] text-secondary-500">
                        Soon
                    </span>
                </Button>
            </div>

            <div className="mt-4 border-t border-secondary-200 pt-4">
                <p className="mb-2 text-sm font-medium text-secondary-900">Previews</p>
                <Button
                    type="button"
                    onClick={onCreateDirectPreviews}
                    disabled={!canCreatePreviews}
                    className="w-full gap-2"
                >
                    <FileText className="h-4 w-4" />
                    Use pasted content
                </Button>
                <Button
                    type="button"
                    onClick={onCreateAIPreviews}
                    disabled={!canCreatePreviews}
                    variant="outline"
                    className="mt-2 w-full gap-2 bg-white"
                >
                    {isCreatingPreviews ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    Create with AI
                </Button>
                <p className="mt-2 text-xs text-secondary-500">
                    {selectedPlatformCount > 0
                        ? `Pasted content stays unchanged. AI adapts it for ${selectedPlatformCount} selected platform${selectedPlatformCount > 1 ? "s" : ""}.`
                        : "Select platforms before creating previews."}
                </p>
            </div>
        </div>
    );
}

function MediaStrip({
    media,
    onUploadClick,
    onBrowseLibrary,
    onRemove,
}: {
    media: MediaFile[];
    onUploadClick: () => void;
    onBrowseLibrary: () => void;
    onRemove: (mediaId: string) => void;
}) {
    return (
        <div className="rounded-lg border border-secondary-200 bg-white p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h3 className="text-sm font-medium text-secondary-900">Media</h3>
                    <p className="mt-1 text-xs text-secondary-500">
                        Add saved images or videos for platform previews and publishing.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={onUploadClick} className="gap-2">
                        <Upload className="h-4 w-4" />
                        Upload
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={onBrowseLibrary} className="gap-2">
                        <ImageIcon className="h-4 w-4" />
                        Library
                    </Button>
                </div>
            </div>

            {media.length === 0 ? (
                <div className="mt-4 rounded-lg border border-dashed border-secondary-300 bg-secondary-50 px-4 py-6 text-center text-sm text-secondary-500">
                    No media selected.
                </div>
            ) : (
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                    {media.map((item) => (
                        <div key={item.id} className="group relative aspect-square overflow-hidden rounded-lg bg-secondary-100">
                            {item.type === "image" ? (
                                <Image src={item.url} alt={item.name} fill className="object-cover" />
                            ) : (
                                <div className="flex h-full flex-col items-center justify-center gap-2 p-3 text-secondary-600">
                                    <Video className="h-7 w-7" />
                                    <span className="max-w-full truncate text-xs">{item.name}</span>
                                </div>
                            )}
                            <button
                                type="button"
                                onClick={() => onRemove(item.id)}
                                className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition-opacity group-hover:opacity-100"
                                aria-label={`Remove ${item.name}`}
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function PreviewCard({
    platform,
    content,
    media,
    checked,
    issue,
    accountIssue,
    charLimit,
    account,
    onCheckedChange,
    onContentChange,
    onRegenerate,
}: {
    platform: Platform;
    content: string;
    media: Array<{ id?: string; url: string; type: "image" | "video" }>;
    checked: boolean;
    issue?: string;
    accountIssue?: string;
    charLimit: number;
    account?: Account;
    onCheckedChange: (checked: boolean) => void;
    onContentChange: (value: string) => void;
    onRegenerate: () => void;
}) {
    const isOverLimit = content.length > charLimit;
    const canInclude = !issue && !isOverLimit;

    return (
        <article className="overflow-hidden rounded-xl border border-secondary-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-secondary-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                    <Checkbox
                        checked={checked}
                        disabled={!canInclude}
                        onCheckedChange={(nextChecked) => onCheckedChange(Boolean(nextChecked))}
                        aria-label={`Include ${getPlatformLabel(platform)} preview`}
                    />
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary-900 text-white">
                        <PlatformIcon platform={platform} className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-secondary-900">{getPlatformLabel(platform)}</h3>
                        <p className="truncate text-xs text-secondary-500">
                            {account?.account_name || "No account selected"}
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {issue ? (
                        <Badge variant="warning">Needs fix</Badge>
                    ) : isOverLimit ? (
                        <Badge variant="error">Over limit</Badge>
                    ) : checked ? (
                        <Badge variant="success">Included</Badge>
                    ) : (
                        <Badge variant="outline">Skipped</Badge>
                    )}
                    <Button type="button" size="sm" variant="outline" onClick={onRegenerate} className="gap-2">
                        <RefreshCw className="h-3.5 w-3.5" />
                        Regenerate
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_300px]">
                <div className="min-w-0 overflow-x-auto rounded-lg bg-secondary-50 p-3">
                    <NativePreview platform={platform} content={content} media={media} />
                </div>
                <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                        <Label className="text-sm font-medium text-secondary-800">
                            Platform text
                        </Label>
                        <span className={cn(
                            "text-xs",
                            isOverLimit ? "text-red-600" : content.length > charLimit * 0.9 ? "text-amber-600" : "text-secondary-500"
                        )}>
                            {content.length}/{charLimit.toLocaleString()}
                        </span>
                    </div>
                    <Textarea
                        value={content}
                        onChange={(event) => onContentChange(event.target.value)}
                        className="min-h-[180px] resize-y border-secondary-200 text-sm leading-relaxed"
                    />
                    {(issue || isOverLimit) && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                            <div className="flex gap-2">
                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                                <p>{issue || `Reduce by ${content.length - charLimit} characters before including this preview.`}</p>
                            </div>
                        </div>
                    )}
                    {accountIssue && (
                        <div className="rounded-lg border border-secondary-200 bg-secondary-50 p-3 text-sm text-secondary-700">
                            <div className="flex gap-2">
                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                                <p>{accountIssue}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </article>
    );
}

function NativePreview({
    platform,
    content,
    media,
}: {
    platform: Platform;
    content: string;
    media: Array<{ id?: string; url: string; type: "image" | "video" }>;
}) {
    switch (platform) {
        case "instagram":
            return <InstagramPreview content={content} mediaItems={media} />;
        case "facebook":
            return <FacebookPreview content={content} mediaItems={media} />;
        case "twitter":
            return <TwitterPreview content={content} mediaItems={media} />;
        case "linkedin":
            return <LinkedInPreview content={content} mediaItems={media} />;
        case "youtube":
            return <YouTubePreview content={content} mediaItems={media} />;
        case "tiktok":
            return <TikTokPreview content={content} mediaItems={media} />;
        default:
            return null;
    }
}

function PublishActionBar({
    selectedCount,
    totalCount,
    isSubmitting,
    publishMenuOpen,
    showScheduleFields,
    publishBlockedReason,
    scheduledDate,
    scheduledTime,
    initialSchedule,
    onPublishMenuOpenChange,
    onShowScheduleFields,
    onScheduledDateChange,
    onScheduledTimeChange,
    onSaveDraft,
    onPublishNow,
    onSchedule,
}: {
    selectedCount: number;
    totalCount: number;
    isSubmitting: boolean;
    publishMenuOpen: boolean;
    showScheduleFields: boolean;
    publishBlockedReason?: string;
    scheduledDate: string;
    scheduledTime: string;
    initialSchedule?: InitialSchedule;
    onPublishMenuOpenChange: (open: boolean) => void;
    onShowScheduleFields: () => void;
    onScheduledDateChange: (value: string) => void;
    onScheduledTimeChange: (value: string) => void;
    onSaveDraft: () => void;
    onPublishNow: () => void;
    onSchedule: () => void;
}) {
    return (
        <div className="rounded-xl border border-secondary-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <p className="text-sm font-medium text-secondary-900">
                        {selectedCount} of {totalCount} previews selected
                    </p>
                    <p className="mt-1 text-xs text-secondary-500">
                        Save selected previews as drafts, publish now, or schedule for an exact time.
                    </p>
                    {publishBlockedReason && (
                        <p className="mt-2 text-xs text-amber-700">
                            {publishBlockedReason}
                        </p>
                    )}
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onSaveDraft}
                        disabled={selectedCount === 0 || isSubmitting}
                        className="gap-2"
                    >
                        <Save className="h-4 w-4" />
                        Save Draft
                    </Button>

                    <Popover open={publishMenuOpen} onOpenChange={onPublishMenuOpenChange}>
                        <PopoverTrigger asChild>
                            <Button
                                type="button"
                                disabled={selectedCount === 0 || isSubmitting || Boolean(publishBlockedReason)}
                                className="gap-2"
                            >
                                <Send className="h-4 w-4" />
                                Publish
                                <ChevronDown className="h-4 w-4" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80" align="end">
                            <div className="space-y-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={onPublishNow}
                                    disabled={isSubmitting || Boolean(publishBlockedReason)}
                                    className="w-full justify-start gap-2"
                                >
                                    <Send className="h-4 w-4" />
                                    Publish now
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={onShowScheduleFields}
                                    disabled={isSubmitting || Boolean(publishBlockedReason)}
                                    className="w-full justify-start gap-2"
                                >
                                    <Calendar className="h-4 w-4" />
                                    Schedule
                                </Button>

                                {showScheduleFields && (
                                    <div className="space-y-3 rounded-lg border border-secondary-200 bg-secondary-50 p-3">
                                        {initialSchedule?.date && (
                                            <p className="text-xs text-secondary-500">
                                                Opened from calendar: {initialSchedule.date} at {initialSchedule.time}
                                            </p>
                                        )}
                                        <div className="grid gap-2">
                                            <Label htmlFor="schedule-date" className="text-xs">
                                                Date
                                            </Label>
                                            <input
                                                id="schedule-date"
                                                type="date"
                                                value={scheduledDate}
                                                min={formatLocalDate(new Date())}
                                                onChange={(event) => onScheduledDateChange(event.target.value)}
                                                className="h-9 rounded-md border border-secondary-200 bg-white px-3 text-sm"
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="schedule-time" className="text-xs">
                                                Time
                                            </Label>
                                            <input
                                                id="schedule-time"
                                                type="time"
                                                value={scheduledTime}
                                                onChange={(event) => onScheduledTimeChange(event.target.value)}
                                                className="h-9 rounded-md border border-secondary-200 bg-white px-3 text-sm"
                                            />
                                        </div>
                                        <Button
                                            type="button"
                                            onClick={onSchedule}
                                            disabled={isSubmitting}
                                            className="w-full gap-2"
                                        >
                                            <Calendar className="h-4 w-4" />
                                            Confirm Schedule
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
            </div>
        </div>
    );
}

function RegenerateDialog({
    platform,
    customInstruction,
    isRegenerating,
    onCustomInstructionChange,
    onClose,
    onQuickRegenerate,
    onCustomRegenerate,
}: {
    platform: Platform | null;
    customInstruction: string;
    isRegenerating: boolean;
    onCustomInstructionChange: (value: string) => void;
    onClose: () => void;
    onQuickRegenerate: (platform: Platform, type: RefinementType) => void;
    onCustomRegenerate: (platform: Platform, instruction: string) => void;
}) {
    return (
        <Dialog open={Boolean(platform)} onOpenChange={(open) => !open && onClose()}>
            <DialogContent onClose={onClose} className="sm:max-w-[520px]">
                <DialogHeader>
                    <DialogTitle>
                        Regenerate {platform ? getPlatformLabel(platform) : "platform"} preview
                    </DialogTitle>
                    <DialogDescription>
                        Use a quick change or describe exactly what should be different.
                    </DialogDescription>
                </DialogHeader>

                {platform && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-2">
                            {QUICK_REGEN_OPTIONS.map((option) => (
                                <Button
                                    key={option.value}
                                    type="button"
                                    variant="outline"
                                    disabled={isRegenerating}
                                    onClick={() => onQuickRegenerate(platform, option.value)}
                                    className="justify-start gap-2"
                                >
                                    {isRegenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Edit3 className="h-4 w-4" />}
                                    {option.label}
                                </Button>
                            ))}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="custom-regeneration">Custom instruction</Label>
                            <Textarea
                                id="custom-regeneration"
                                value={customInstruction}
                                onChange={(event) => onCustomInstructionChange(event.target.value)}
                                placeholder="Example: Make it sound more premium, remove emojis, and add a direct booking CTA."
                                className="min-h-[110px]"
                            />
                        </div>

                        <DialogFooter className="gap-2 sm:gap-2">
                            <Button type="button" variant="outline" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                disabled={isRegenerating || customInstruction.trim().length < 3}
                                onClick={() => onCustomRegenerate(platform, customInstruction.trim())}
                                className="gap-2"
                            >
                                {isRegenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                                Regenerate
                            </Button>
                        </DialogFooter>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
