'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Upload, Youtube, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { fetchWithWorkspace } from '@/lib/fetch-with-workspace';
import { useSelectedWorkspace } from '@/store/workspaceStore';

const YOUTUBE_CATEGORIES = [
    { id: '1', name: 'Film & Animation' },
    { id: '2', name: 'Autos & Vehicles' },
    { id: '10', name: 'Music' },
    { id: '15', name: 'Pets & Animals' },
    { id: '17', name: 'Sports' },
    { id: '19', name: 'Travel & Events' },
    { id: '20', name: 'Gaming' },
    { id: '22', name: 'People & Blogs' },
    { id: '23', name: 'Comedy' },
    { id: '24', name: 'Entertainment' },
    { id: '25', name: 'News & Politics' },
    { id: '26', name: 'Howto & Style' },
    { id: '27', name: 'Education' },
    { id: '28', name: 'Science & Technology' },
];

export default function PublishToYouTubePage() {
    const params = useParams();
    const router = useRouter();
    const accountId = params.accountId as string;
    const selectedWorkspace = useSelectedWorkspace();

    const [account, setAccount] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [publishing, setPublishing] = useState(false);

    // Form state
    const [videoUrl, setVideoUrl] = useState('');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [tags, setTags] = useState('');
    const [category, setCategory] = useState('22'); // People & Blogs default
    const [privacy, setPrivacy] = useState<'public' | 'unlisted' | 'private'>('unlisted');
    const [thumbnailUrl, setThumbnailUrl] = useState('');
    const [schedule, setSchedule] = useState(false);
    const [publishAt, setPublishAt] = useState('');

    const fetchAccount = useCallback(async () => {
        if (!selectedWorkspace?.id) return;

        try {
            const response = await fetchWithWorkspace(`/api/accounts/${accountId}`, {
                workspaceId: selectedWorkspace.id,
            });
            if (!response.ok) throw new Error('Failed to fetch account');
            const data = await response.json();
            setAccount(data.data);
        } catch (error: any) {
            console.error('Error fetching account:', error);
            toast.error('Failed to load account');
        } finally {
            setLoading(false);
        }
    }, [accountId, selectedWorkspace?.id]);

    useEffect(() => {
        fetchAccount();
    }, [accountId, fetchAccount]);

    const handlePublish = async () => {
        // Validation
        if (!videoUrl) {
            toast.error('Please provide a video URL');
            return;
        }
        if (!title || title.length > 100) {
            toast.error('Title is required and must be under 100 characters');
            return;
        }
        if (description.length > 5000) {
            toast.error('Description must be under 5000 characters');
            return;
        }

        try {
            setPublishing(true);

            const payload = {
                accountId,
                videoUrl,
                title,
                description,
                tags: tags.split(',').map(t => t.trim()).filter(Boolean),
                categoryId: category,
                privacyStatus: privacy,
                thumbnailUrl: thumbnailUrl || undefined,
                publishAt: schedule && publishAt ? new Date(publishAt).toISOString() : undefined,
            };

            const response = await fetch('/api/youtube/publish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to publish video');
            }

            await response.json();

            toast.success(
                schedule
                    ? 'Video scheduled successfully!'
                    : 'Video published successfully!'
            );

            // Reset form
            setVideoUrl('');
            setTitle('');
            setDescription('');
            setTags('');
            setThumbnailUrl('');
            setSchedule(false);
            setPublishAt('');

            // Redirect to channel page
            setTimeout(() => {
                router.push(`/x/youtube/${accountId}`);
            }, 1500);
        } catch (error: any) {
            console.error('Publish error:', error);
            toast.error(error.message || 'Failed to publish video');
        } finally {
            setPublishing(false);
        }
    };

    if (loading) {
        return (
            <div className="p-6">
                <p>Loading...</p>
            </div>
        );
    }

    if (!account) {
        return (
            <div className="p-6">
                <p className="text-muted-foreground">Account not found</p>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => router.push(`/x/youtube/${accountId}`)}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Channel
                    </Button>
                </div>
            </div>

            <div>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                    <Youtube className="h-8 w-8 text-red-600" />
                    Publish to YouTube
                </h1>
                <p className="text-muted-foreground mt-2">
                    Publishing to: <span className="font-semibold">{account.account_name}</span>
                </p>
            </div>

            {/* Main Form */}
            <Card>
                <CardHeader>
                    <CardTitle>Video Details</CardTitle>
                    <CardDescription>
                        Provide your video URL and metadata. Video must be publicly accessible.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Video URL */}
                    <div className="space-y-2">
                        <Label htmlFor="videoUrl">
                            Video URL <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="videoUrl"
                            placeholder="https://example.com/video.mp4"
                            value={videoUrl}
                            onChange={(e) => setVideoUrl(e.target.value)}
                            disabled={publishing}
                        />
                        <p className="text-xs text-muted-foreground">
                            Direct link to your video file (MP4, MOV, AVI, etc.)
                        </p>
                    </div>

                    {/* Title */}
                    <div className="space-y-2">
                        <Label htmlFor="title">
                            Title <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="title"
                            placeholder="My Awesome Video"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            maxLength={100}
                            disabled={publishing}
                        />
                        <p className="text-xs text-muted-foreground">
                            {title.length}/100 characters
                        </p>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            placeholder="Tell viewers about your video..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            maxLength={5000}
                            rows={6}
                            disabled={publishing}
                        />
                        <p className="text-xs text-muted-foreground">
                            {description.length}/5000 characters
                        </p>
                    </div>

                    {/* Tags */}
                    <div className="space-y-2">
                        <Label htmlFor="tags">Tags</Label>
                        <Input
                            id="tags"
                            placeholder="tag1, tag2, tag3"
                            value={tags}
                            onChange={(e) => setTags(e.target.value)}
                            disabled={publishing}
                        />
                        <p className="text-xs text-muted-foreground">
                            Comma-separated tags (up to 500 characters total)
                        </p>
                    </div>

                    {/* Category */}
                    <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <Select value={category} onValueChange={setCategory} disabled={publishing}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {YOUTUBE_CATEGORIES.map((cat) => (
                                    <SelectItem key={cat.id} value={cat.id}>
                                        {cat.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Privacy */}
                    <div className="space-y-2">
                        <Label htmlFor="privacy">Privacy</Label>
                        <Select value={privacy} onValueChange={(val: any) => setPrivacy(val)} disabled={publishing}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="public">Public - Anyone can search and view</SelectItem>
                                <SelectItem value="unlisted">Unlisted - Only people with link can view</SelectItem>
                                <SelectItem value="private">Private - Only you can view</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Thumbnail URL */}
                    <div className="space-y-2">
                        <Label htmlFor="thumbnailUrl">Custom Thumbnail URL (Optional)</Label>
                        <div className="flex gap-2">
                            <Input
                                id="thumbnailUrl"
                                placeholder="https://example.com/thumbnail.jpg"
                                value={thumbnailUrl}
                                onChange={(e) => setThumbnailUrl(e.target.value)}
                                disabled={publishing}
                            />
                            <Button variant="outline" size="sm" disabled>
                                <ImageIcon className="h-4 w-4" />
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            JPG, PNG, or GIF image (1280x720 recommended)
                        </p>
                    </div>

                    {/* Scheduling */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label htmlFor="schedule">Schedule for Later</Label>
                                <p className="text-xs text-muted-foreground">
                                    Publish at a specific date and time
                                </p>
                            </div>
                            <Switch
                                id="schedule"
                                checked={schedule}
                                onCheckedChange={setSchedule}
                                disabled={publishing}
                            />
                        </div>

                        {schedule && (
                            <div className="space-y-2">
                                <Label htmlFor="publishAt">Publish Date & Time</Label>
                                <Input
                                    id="publishAt"
                                    type="datetime-local"
                                    value={publishAt}
                                    onChange={(e) => setPublishAt(e.target.value)}
                                    min={new Date().toISOString().slice(0, 16)}
                                    disabled={publishing}
                                />
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex items-center justify-between">
                <Button variant="outline" onClick={() => router.push(`/x/youtube/${accountId}`)}>
                    Cancel
                </Button>
                <Button onClick={handlePublish} disabled={publishing} size="lg">
                    <Upload className="h-4 w-4 mr-2" />
                    {publishing ? 'Publishing...' : schedule ? 'Schedule Video' : 'Publish Now'}
                </Button>
            </div>

            {/* Help Text */}
            <Card className="bg-muted/50">
                <CardContent className="pt-6">
                    <h3 className="font-semibold mb-2">Publishing Tips</h3>
                    <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Video must be accessible via direct URL (not YouTube/Vimeo links)</li>
                        <li>• Supported formats: MP4, MOV, AVI, WMV, FLV, 3GP, MPEG</li>
                        <li>• Maximum file size: 256 GB (or 12 hours duration)</li>
                        <li>• Title is required and should be descriptive</li>
                        <li>• Tags help with discoverability (use relevant keywords)</li>
                        <li>• Unlisted videos are great for testing before going public</li>
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
}
