'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Upload, Instagram } from 'lucide-react';
import { toast } from 'sonner';

export default function PublishToInstagramPage() {
    const params = useParams();
    const router = useRouter();
    const accountId = params.accountId as string;

    const [account, setAccount] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [publishing, setPublishing] = useState(false);

    const [mediaUrl, setMediaUrl] = useState('');
    const [caption, setCaption] = useState('');
    const [mediaType, setMediaType] = useState<'IMAGE' | 'VIDEO' | 'REELS'>('IMAGE');

    const fetchAccount = useCallback(async () => {
        try {
            const response = await fetch(`/api/accounts/${accountId}`);
            if (!response.ok) throw new Error('Failed to fetch account');
            const data = await response.json();
            setAccount(data.data);
        } catch (error: any) {
            console.error('Error fetching account:', error);
            toast.error('Failed to load account');
        } finally {
            setLoading(false);
        }
    }, [accountId]);

    useEffect(() => {
        fetchAccount();
    }, [accountId, fetchAccount]);

    const handlePublish = async () => {
        if (!mediaUrl) {
            toast.error('Please provide a media URL');
            return;
        }
        if (caption.length > 2200) {
            toast.error('Caption must be under 2200 characters');
            return;
        }

        try {
            setPublishing(true);

            const response = await fetch('/api/instagram/publish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    accountId,
                    mediaUrl,
                    caption,
                    mediaType,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to publish post');
            }

            toast.success('Post published successfully!');
            setMediaUrl('');
            setCaption('');

            setTimeout(() => {
                router.push(`/x/instagram/${accountId}`);
            }, 1500);
        } catch (error: any) {
            console.error('Publish error:', error);
            toast.error(error.message || 'Failed to publish post');
        } finally {
            setPublishing(false);
        }
    };

    if (loading) return <div className="p-6">Loading...</div>;
    if (!account) return <div className="p-6">Account not found</div>;

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => router.push(`/x/instagram/${accountId}`)}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                </Button>
            </div>

            <div>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                    <Instagram className="h-8 w-8 text-pink-600" />
                    Publish to Instagram
                </h1>
                <p className="text-muted-foreground mt-2">
                    Publishing to: <span className="font-semibold">{account.account_name}</span>
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Post Details</CardTitle>
                    <CardDescription>
                        Provide your media URL and caption. Media must be publicly accessible.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="mediaType">Media Type</Label>
                        <Select value={mediaType} onValueChange={(val: any) => setMediaType(val)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="IMAGE">Image</SelectItem>
                                <SelectItem value="VIDEO">Video</SelectItem>
                                <SelectItem value="REELS">Reels</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="mediaUrl">
                            Media URL <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="mediaUrl"
                            placeholder="https://example.com/image.jpg"
                            value={mediaUrl}
                            onChange={(e) => setMediaUrl(e.target.value)}
                            disabled={publishing}
                        />
                        <p className="text-xs text-muted-foreground">
                            Direct link to your {mediaType.toLowerCase()} file
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="caption">Caption</Label>
                        <Textarea
                            id="caption"
                            placeholder="Write your caption..."
                            value={caption}
                            onChange={(e) => setCaption(e.target.value)}
                            maxLength={2200}
                            rows={6}
                            disabled={publishing}
                        />
                        <p className="text-xs text-muted-foreground">
                            {caption.length}/2200 characters
                        </p>
                    </div>
                </CardContent>
            </Card>

            <div className="flex items-center justify-between">
                <Button variant="outline" onClick={() => router.push(`/x/instagram/${accountId}`)}>
                    Cancel
                </Button>
                <Button onClick={handlePublish} disabled={publishing} size="lg">
                    <Upload className="h-4 w-4 mr-2" />
                    {publishing ? 'Publishing...' : 'Publish Now'}
                </Button>
            </div>

            <Card className="bg-muted/50">
                <CardContent className="pt-6">
                    <h3 className="font-semibold mb-2">Publishing Tips</h3>
                    <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Media must be accessible via direct URL</li>
                        <li>• Images: JPG or PNG format</li>
                        <li>• Videos: MP4 format, H.264 codec</li>
                        <li>• Reels: Vertical video (9:16 aspect ratio)</li>
                        <li>• Caption supports hashtags and mentions</li>
                        <li>• Posts appear immediately on your profile</li>
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
}
