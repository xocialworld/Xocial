'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Upload, Music } from 'lucide-react';
import { toast } from 'sonner';

export default function PublishToTikTokPage() {
    const params = useParams();
    const router = useRouter();
    const accountId = params.accountId as string;

    const [account, setAccount] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [posting, setPosting] = useState(false);
    const [videoUrl, setVideoUrl] = useState('');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');

    const MAX_TITLE_CHARS = 150;
    const MAX_DESC_CHARS = 2200;

    const fetchAccount = useCallback(async () => {
        try {
            const response = await fetch(`/api/accounts/${accountId}`);
            if (!response.ok) throw new Error('Failed to fetch account');
            const data = await response.json();
            setAccount(data.data);
        } catch (error: any) {
            toast.error('Failed to load account');
        } finally {
            setLoading(false);
        }
    }, [accountId]);

    useEffect(() => {
        fetchAccount();
    }, [accountId, fetchAccount]);

    const handlePost = async () => {
        if (!videoUrl.trim()) {
            toast.error('Please enter video URL');
            return;
        }
        if (title.length > MAX_TITLE_CHARS) {
            toast.error(`Title exceeds ${MAX_TITLE_CHARS} characters`);
            return;
        }
        if (description.length > MAX_DESC_CHARS) {
            toast.error(`Description exceeds ${MAX_DESC_CHARS} characters`);
            return;
        }

        try {
            setPosting(true);

            const response = await fetch('/api/tiktok/publish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    accountId,
                    videoUrl,
                    title,
                    description,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to upload video');
            }

            toast.success('Video uploaded successfully!');
            setVideoUrl('');
            setTitle('');
            setDescription('');

            setTimeout(() => {
                router.push(`/x/tiktok/${accountId}`);
            }, 1500);
        } catch (error: any) {
            toast.error(error.message || 'Failed to upload video');
        } finally {
            setPosting(false);
        }
    };

    if (loading) return <div className="p-6">Loading...</div>;
    if (!account) return <div className="p-6">Account not found</div>;

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => router.push(`/x/tiktok/${accountId}`)}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                </Button>
            </div>

            <div>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                    <Music className="h-8 w-8" />
                    Upload to TikTok
                </h1>
                <p className="text-muted-foreground mt-2">
                    Uploading as: <span className="font-semibold">@{account.account_handle}</span>
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Video Details</CardTitle>
                    <CardDescription>Upload your short-form video</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="videoUrl">
                            Video URL <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="videoUrl"
                            placeholder="https://example.com/video.mp4"
                            value={videoUrl}
                            onChange={(e) => setVideoUrl(e.target.value)}
                            disabled={posting}
                        />
                        <p className="text-xs text-muted-foreground">
                            Direct URL to your video file (MP4 format recommended)
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="title">Title (optional)</Label>
                        <Input
                            id="title"
                            placeholder="Give your video a catchy title..."
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            disabled={posting}
                        />
                        <p className="text-xs text-muted-foreground">
                            {title.length}/{MAX_TITLE_CHARS} characters
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description (optional)</Label>
                        <Textarea
                            id="description"
                            placeholder="Describe your video and add hashtags..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={4}
                            disabled={posting}
                        />
                        <p className="text-xs text-muted-foreground">
                            {description.length}/{MAX_DESC_CHARS} characters
                        </p>
                    </div>
                </CardContent>
            </Card>

            <div className="flex items-center justify-between">
                <Button variant="outline" onClick={() => router.push(`/x/tiktok/${accountId}`)}>
                    Cancel
                </Button>
                <Button onClick={handlePost} disabled={posting || !videoUrl.trim()} size="lg">
                    <Upload className="h-4 w-4 mr-2" />
                    {posting ? 'Uploading...' : 'Upload Video'}
                </Button>
            </div>

            <Card className="bg-muted/50">
                <CardContent className="pt-6">
                    <h3 className="font-semibold mb-2">Upload Tips</h3>
                    <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Videos should be 15-60 seconds for best engagement</li>
                        <li>• Use trending sounds and hashtags</li>
                        <li>• Vertical format (9:16 ratio) works best</li>
                        <li>• Add captions for better accessibility</li>
                        <li>• Upload during peak hours for your audience</li>
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
}
