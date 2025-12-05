'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { InstagramAnalytics } from '@/components/instagram/instagram-analytics';
import { InstagramComments } from '@/components/instagram/instagram-comments';

export default function InstagramInsightsPage() {
    const params = useParams();
    const router = useRouter();
    const accountId = params.accountId as string;
    const [activeTab, setActiveTab] = useState('analytics');

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/x/instagram/${accountId}`)}
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Profile
                </Button>
            </div>

            <div>
                <h1 className="text-3xl font-bold">Account Insights</h1>
                <p className="text-muted-foreground mt-2">
                    Detailed analytics and engagement metrics for your Instagram account
                </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-2">
                    <TabsTrigger value="analytics">Analytics</TabsTrigger>
                    <TabsTrigger value="comments">Comments</TabsTrigger>
                </TabsList>

                <TabsContent value="analytics" className="mt-6">
                    <InstagramAnalytics />
                </TabsContent>

                <TabsContent value="comments" className="mt-6">
                    <InstagramComments />
                </TabsContent>
            </Tabs>
        </div>
    );
}
