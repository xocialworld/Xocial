'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { FacebookAnalytics } from '@/components/facebook/facebook-analytics';
import { FacebookComments } from '@/components/facebook/facebook-comments';

export default function FacebookInsightsPage() {
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
                    onClick={() => router.push(`/x/facebook/${accountId}`)}
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Page
                </Button>
            </div>

            <div>
                <h1 className="text-3xl font-bold">Page Insights</h1>
                <p className="text-muted-foreground mt-2">
                    Detailed analytics and engagement metrics for your Facebook page
                </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-2">
                    <TabsTrigger value="analytics">Analytics</TabsTrigger>
                    <TabsTrigger value="comments">Comments</TabsTrigger>
                </TabsList>

                <TabsContent value="analytics" className="mt-6">
                    <FacebookAnalytics />
                </TabsContent>

                <TabsContent value="comments" className="mt-6">
                    <FacebookComments />
                </TabsContent>
            </Tabs>
        </div>
    );
}
