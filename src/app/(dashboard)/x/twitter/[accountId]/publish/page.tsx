'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Send, Twitter } from 'lucide-react';
import { toast } from 'sonner';

export default function PostToTwitterPage() {
    const params = useParams();
    const router = useRouter();
    const accountId = params.accountId as string;

    const [account, setAccount] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [posting, setPosting] = useState(false);
    const [tweetText, setTweetText] = useState('');

    const MAX_CHARS = 280;

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
        if (!tweetText.trim()) {
            toast.error('Please enter tweet text');
            return;
        }
        if (tweetText.length > MAX_CHARS) {
            toast.error(`Tweet exceeds ${MAX_CHARS} characters`);
            return;
        }

        try {
            setPosting(true);

            const response = await fetch('/api/twitter/publish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    accountId,
                    text: tweetText,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to post tweet');
            }

            toast.success('Tweet posted successfully!');
            setTweetText('');

            setTimeout(() => {
                router.push(`/x/twitter/${accountId}`);
            }, 1500);
        } catch (error: any) {
            toast.error(error.message || 'Failed to post tweet');
        } finally {
            setPosting(false);
        }
    };

    if (loading) return <div className="p-6">Loading...</div>;
    if (!account) return <div className="p-6">Account not found</div>;

    const charsRemaining = MAX_CHARS - tweetText.length;
    const isOverLimit = charsRemaining < 0;

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => router.push(`/x/twitter/${accountId}`)}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                </Button>
            </div>

            <div>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                    <Twitter className="h-8 w-8" />
                    Post Tweet
                </h1>
                <p className="text-muted-foreground mt-2">
                    Posting as: <span className="font-semibold">@{account.account_handle}</span>
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Compose Tweet</CardTitle>
                    <CardDescription>What&apos;s happening?</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="tweet">
                            Tweet Text <span className="text-red-500">*</span>
                        </Label>
                        <Textarea
                            id="tweet"
                            placeholder="What&apos;s happening?"
                            value={tweetText}
                            onChange={(e) => setTweetText(e.target.value)}
                            rows={6}
                            disabled={posting}
                            className={isOverLimit ? 'border-red-500' : ''}
                        />
                        <div className="flex items-center justify-between">
                            <p className={`text-sm ${isOverLimit ? 'text-red-500 font-semibold' : 'text-muted-foreground'}`}>
                                {charsRemaining} characters remaining
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {tweetText.length}/{MAX_CHARS}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>


            <div className="flex items-center justify-between">
                <Button variant="outline" onClick={() => router.push(`/x/twitter/${accountId}`)}>
                    Cancel
                </Button>
                <Button onClick={handlePost} disabled={posting || !tweetText.trim() || isOverLimit} size="lg">
                    <Send className="h-4 w-4 mr-2" />
                    {posting ? 'Posting...' : 'Post Tweet'}
                </Button>
            </div>

            <Card className="bg-muted/50">
                <CardContent className="pt-6">
                    <h3 className="font-semibold mb-2">Posting Tips</h3>
                    <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Maximum 280 characters per tweet</li>
                        <li>• Use hashtags to increase reach</li>
                        <li>• Mention other users with @username</li>
                        <li>• Tweets appear immediately on your timeline</li>
                        <li>• Add links to share content (auto-shortened)</li>
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
}
