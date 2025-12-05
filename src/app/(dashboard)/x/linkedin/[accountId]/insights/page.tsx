'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { LinkedInAnalytics } from '@/components/linkedin/linkedin-analytics';
import { LinkedInEngagement } from '@/components/linkedin/linkedin-engagement';

export default function LinkedInInsightsPage() {
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
                    onClick={() => router.push(`/x/linkedin/${accountId}`)}
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Profile
                </Button>
            </div>

            <div>
                <h1 className="text-3xl font-bold">Profile Insights</h1>
                <p className="text-muted-foreground mt-2">
                    Detailed analytics and engagement metrics for your LinkedIn profile
                </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-2">
                    <TabsTrigger value="analytics">Analytics</TabsTrigger>
                    <TabsTrigger value="engagement">Engagement</TabsTrigger>
                </TabsList>

                <TabsContent value="analytics" className="mt-6">
                    <LinkedInAnalytics />
                </TabsContent>

                <TabsContent value="engagement" className="mt-6">
                    <LinkedInEngagement />
                </TabsContent>
            </Tabs>
        </div>
    );
}
