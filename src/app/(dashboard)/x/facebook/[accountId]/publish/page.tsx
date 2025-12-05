'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Upload, Facebook } from 'lucide-react';
import { toast } from 'sonner';

export default function PublishToFacebookPage() {
    const params = useParams();
    const router = useRouter();
    const accountId = params.accountId as string;

    const [account, setAccount] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [publishing, setPublishing] = useState(false);

    const [message, setMessage] = useState('');
    const [link, setLink] = useState('');
    const [type, setType] = useState<'status' | 'link' | 'photo' | 'video'>('status');

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

    const handlePublish = async () => {
        if (!message) {
            toast.error('Please enter a message');
            return;
        }

        try {
            setPublishing(true);

            const response = await fetch('/api/facebook/publish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    accountId,
                    message,
                    link: link || undefined,
                    type,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to publish post');
            }

            toast.success('Post published successfully!');
            setMessage('');
            setLink('');

            setTimeout(() => {
                router.push(`/x/facebook/${accountId}`);
            }, 1500);
        } catch (error: any) {
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
                <Button variant="ghost" size="sm" onClick={() => router.push(`/x/facebook/${accountId}`)}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                </Button>
            </div>

            <div>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                    <Facebook className="h-8 w-8 text-[#1877F2]" />
                    Publish to Facebook
                </h1>
                <p className="text-muted-foreground mt-2">
                    Publishing to: <span className="font-semibold">{account.account_name}</span>
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Post Details</CardTitle>
                    <CardDescription>Create a post for your Facebook page</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="type">Post Type</Label>
                        <Select value={type} onValueChange={(val: any) => setType(val)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="status">Status Update</SelectItem>
                                <SelectItem value="link">Link Post</SelectItem>
                                <SelectItem value="photo">Photo Post</SelectItem>
                                <SelectItem value="video">Video Post</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="message">
                            Message <span className="text-red-500">*</span>
                        </Label>
                        <Textarea
                            id="message"
                            placeholder="What's on your mind?"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            rows={6}
                            disabled={publishing}
                        />
                        <p className="text-xs text-muted-foreground">
                            {message.length} characters
                        </p>
                    </div>

                    {(type === 'link' || type === 'photo' || type === 'video') && (
                        <div className="space-y-2">
                            <Label htmlFor="link">
                                {type === 'photo' ? 'Photo URL' : type === 'video' ? 'Video URL' : 'Link URL'}
                            </Label>
                            <Input
                                id="link"
                                placeholder="https://example.com"
                                value={link}
                                onChange={(e) => setLink(e.target.value)}
                                disabled={publishing}
                            />
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="flex items-center justify-between">
                <Button variant="outline" onClick={() => router.push(`/x/facebook/${accountId}`)}>
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
                        <li>• Status updates can include text only</li>
                        <li>• Link posts automatically fetch preview from URL</li>
                        <li>• Photo/Video posts require publicly accessible URLs</li>
                        <li>• Posts appear immediately on your page</li>
                        <li>• Use hashtags for better reach</li>
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
}
