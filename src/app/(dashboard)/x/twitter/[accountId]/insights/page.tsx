'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { TwitterAnalytics } from '@/components/twitter/twitter-analytics';
import { TwitterEngagement } from '@/components/twitter/twitter-engagement';

export default function TwitterInsightsPage() {
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
                    onClick={() => router.push(`/x/twitter/${accountId}`)}
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Profile
                </Button>
            </div>

            <div>
                <h1 className="text-3xl font-bold">Account Insights</h1>
                <p className="text-muted-foreground mt-2">
                    Detailed analytics and engagement metrics for your Twitter account
                </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-2">
                    <TabsTrigger value="analytics">Analytics</TabsTrigger>
                    <TabsTrigger value="engagement">Engagement</TabsTrigger>
                </TabsList>

                <TabsContent value="analytics" className="mt-6">
                    <TwitterAnalytics />
                </TabsContent>

                <TabsContent value="engagement" className="mt-6">
                    <TwitterEngagement />
                </TabsContent>
            </Tabs>
        </div>
    );
}
