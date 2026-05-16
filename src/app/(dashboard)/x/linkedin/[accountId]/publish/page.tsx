'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Send, Linkedin } from 'lucide-react';
import { toast } from 'sonner';
import { fetchWithWorkspace } from '@/lib/fetch-with-workspace';
import { useSelectedWorkspace } from '@/store/workspaceStore';

export default function PublishToLinkedInPage() {
    const params = useParams();
    const router = useRouter();
    const accountId = params.accountId as string;
    const selectedWorkspace = useSelectedWorkspace();

    const [account, setAccount] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [posting, setPosting] = useState(false);
    const [postText, setPostText] = useState('');
    const [visibility, setVisibility] = useState<'PUBLIC' | 'CONNECTIONS'>('PUBLIC');

    const MAX_CHARS = 3000;

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
            toast.error('Failed to load account');
        } finally {
            setLoading(false);
        }
    }, [accountId, selectedWorkspace?.id]);

    useEffect(() => {
        fetchAccount();
    }, [accountId, fetchAccount]);

    const handlePost = async () => {
        if (!postText.trim()) {
            toast.error('Please enter post text');
            return;
        }
        if (postText.length > MAX_CHARS) {
            toast.error(`Post exceeds ${MAX_CHARS} characters`);
            return;
        }

        try {
            setPosting(true);

            const response = await fetch('/api/linkedin/publish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    accountId,
                    text: postText,
                    visibility,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to publish post');
            }

            toast.success('Post published successfully!');
            setPostText('');

            setTimeout(() => {
                router.push(`/x/linkedin/${accountId}`);
            }, 1500);
        } catch (error: any) {
            toast.error(error.message || 'Failed to publish post');
        } finally {
            setPosting(false);
        }
    };

    if (loading) return <div className="p-6">Loading...</div>;
    if (!account) return <div className="p-6">Account not found</div>;

    const charsRemaining = MAX_CHARS - postText.length;
    const isOverLimit = charsRemaining < 0;

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => router.push(`/x/linkedin/${accountId}`)}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                </Button>
            </div>

            <div>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                    <Linkedin className="h-8 w-8 text-[#0A66C2]" />
                    Publish to LinkedIn
                </h1>
                <p className="text-muted-foreground mt-2">
                    Posting as: <span className="font-semibold">{account.account_name}</span>
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Create Post</CardTitle>
                    <CardDescription>Share professional insights and updates</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="visibility">Visibility</Label>
                        <Select value={visibility} onValueChange={(val: any) => setVisibility(val)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="PUBLIC">Public</SelectItem>
                                <SelectItem value="CONNECTIONS">Connections Only</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="post">
                            Post Text <span className="text-red-500">*</span>
                        </Label>
                        <Textarea
                            id="post"
                            placeholder="Share your thoughts..."
                            value={postText}
                            onChange={(e) => setPostText(e.target.value)}
                            rows={8}
                            disabled={posting}
                            className={isOverLimit ? 'border-red-500' : ''}
                        />
                        <div className="flex items-center justify-between">
                            <p className={`text-sm ${isOverLimit ? 'text-red-500 font-semibold' : 'text-muted-foreground'}`}>
                                {charsRemaining} characters remaining
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {postText.length}/{MAX_CHARS}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="flex items-center justify-between">
                <Button variant="outline" onClick={() => router.push(`/x/linkedin/${accountId}`)}>
                    Cancel
                </Button>
                <Button onClick={handlePost} disabled={posting || !postText.trim() || isOverLimit} size="lg">
                    <Send className="h-4 w-4 mr-2" />
                    {posting ? 'Publishing...' : 'Publish Post'}
                </Button>
            </div>

            <Card className="bg-muted/50">
                <CardContent className="pt-6">
                    <h3 className="font-semibold mb-2">Publishing Tips</h3>
                    <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Maximum 3000 characters per post</li>
                        <li>• Use hashtags for better discoverability</li>
                        <li>• Tag people and companies with @ and #</li>
                        <li>• Professional tone resonates best</li>
                        <li>• Engage with your network through comments</li>
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
}
