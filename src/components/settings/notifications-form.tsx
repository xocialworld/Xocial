"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function NotificationsForm() {
    const [emailNotifications, setEmailNotifications] = useState({
        approvals: true,
        comments: true,
        publishing: true,
        marketing: false,
    });

    const [pushNotifications, setPushNotifications] = useState({
        approvals: true,
        comments: true,
        publishing: false,
    });

    const handleSave = () => {
        toast.success("Notification preferences saved!");
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>
                    Choose how and when you want to be notified
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
                {/* Email Notifications */}
                <div>
                    <h3 className="text-lg font-medium text-secondary-900 mb-4">Email Notifications</h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-secondary-900">Approval Requests</p>
                                <p className="text-sm text-secondary-500">When content needs your review</p>
                            </div>
                            <Switch
                                checked={emailNotifications.approvals}
                                onCheckedChange={(c: boolean) => setEmailNotifications(prev => ({ ...prev, approvals: c }))}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-secondary-900">New Comments</p>
                                <p className="text-sm text-secondary-500">When someone comments on your content</p>
                            </div>
                            <Switch
                                checked={emailNotifications.comments}
                                onCheckedChange={(c: boolean) => setEmailNotifications(prev => ({ ...prev, comments: c }))}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-secondary-900">Publishing Status</p>
                                <p className="text-sm text-secondary-500">When posts are published or fail</p>
                            </div>
                            <Switch
                                checked={emailNotifications.publishing}
                                onCheckedChange={(c: boolean) => setEmailNotifications(prev => ({ ...prev, publishing: c }))}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-secondary-900">Marketing & Updates</p>
                                <p className="text-sm text-secondary-500">News about Xocial features</p>
                            </div>
                            <Switch
                                checked={emailNotifications.marketing}
                                onCheckedChange={(c: boolean) => setEmailNotifications(prev => ({ ...prev, marketing: c }))}
                            />
                        </div>
                    </div>
                </div>

                <div className="border-t border-secondary-100" />

                {/* Push Notifications */}
                <div>
                    <h3 className="text-lg font-medium text-secondary-900 mb-4">In-App Notifications</h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-secondary-900">Approval Requests</p>
                                <p className="text-sm text-secondary-500">When content needs your review</p>
                            </div>
                            <Switch
                                checked={pushNotifications.approvals}
                                onCheckedChange={(c: boolean) => setPushNotifications(prev => ({ ...prev, approvals: c }))}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-secondary-900">New Comments</p>
                                <p className="text-sm text-secondary-500">When someone comments on your content</p>
                            </div>
                            <Switch
                                checked={pushNotifications.comments}
                                onCheckedChange={(c: boolean) => setPushNotifications(prev => ({ ...prev, comments: c }))}
                            />
                        </div>
                    </div>
                </div>

                <Button onClick={handleSave} className="w-full">
                    Save Preferences
                </Button>
            </CardContent>
        </Card>
    );
}
