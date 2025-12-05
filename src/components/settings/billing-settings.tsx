"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Shield, Zap, Building } from "lucide-react";

interface BillingSettingsProps {
    workspaceId: string;
}

export function BillingSettings({ workspaceId }: BillingSettingsProps) {
    return (
        <div className="space-y-6">
            {/* Current Plan */}
            <Card className="border-primary-100 bg-primary-50/50">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-primary-900">Current Plan</CardTitle>
                            <CardDescription className="text-primary-700">
                                You are currently on the Free Plan
                            </CardDescription>
                        </div>
                        <Badge className="bg-primary-600 hover:bg-primary-700">Free</Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-primary-900">Billing Cycle</p>
                            <p className="text-sm text-primary-700">Monthly</p>
                        </div>
                        <div className="space-y-1 text-right">
                            <p className="text-sm font-medium text-primary-900">Next Payment</p>
                            <p className="text-sm text-primary-700">Free Forever</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Available Plans */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Free */}
                <Card className="relative">
                    <CardHeader>
                        <CardTitle>Free</CardTitle>
                        <CardDescription>For solo creators</CardDescription>
                        <div className="mt-4">
                            <span className="text-3xl font-bold">$0</span>
                            <span className="text-secondary-500">/mo</span>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-3 mb-6">
                            <li className="flex items-center gap-2 text-sm">
                                <Check className="h-4 w-4 text-green-500" />
                                1 Workspace
                            </li>
                            <li className="flex items-center gap-2 text-sm">
                                <Check className="h-4 w-4 text-green-500" />
                                3 Social Profiles
                            </li>
                            <li className="flex items-center gap-2 text-sm">
                                <Check className="h-4 w-4 text-green-500" />
                                Basic Analytics
                            </li>
                        </ul>
                        <Button variant="outline" className="w-full" disabled>Current Plan</Button>
                    </CardContent>
                </Card>

                {/* Pro */}
                <Card className="relative border-primary-200 shadow-md">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-600 text-white px-3 py-1 rounded-full text-xs font-medium">
                        Popular
                    </div>
                    <CardHeader>
                        <CardTitle>Pro</CardTitle>
                        <CardDescription>For small teams</CardDescription>
                        <div className="mt-4">
                            <span className="text-3xl font-bold">$39</span>
                            <span className="text-secondary-500">/mo</span>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-3 mb-6">
                            <li className="flex items-center gap-2 text-sm">
                                <Check className="h-4 w-4 text-green-500" />
                                1 Workspace
                            </li>
                            <li className="flex items-center gap-2 text-sm">
                                <Check className="h-4 w-4 text-green-500" />
                                10 Social Profiles
                            </li>
                            <li className="flex items-center gap-2 text-sm">
                                <Check className="h-4 w-4 text-green-500" />
                                AI Assistant
                            </li>
                        </ul>
                        <Button className="w-full">Upgrade to Pro</Button>
                    </CardContent>
                </Card>

                {/* Growth */}
                <Card>
                    <CardHeader>
                        <CardTitle>Growth</CardTitle>
                        <CardDescription>For agencies</CardDescription>
                        <div className="mt-4">
                            <span className="text-3xl font-bold">$99</span>
                            <span className="text-secondary-500">/mo</span>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-3 mb-6">
                            <li className="flex items-center gap-2 text-sm">
                                <Check className="h-4 w-4 text-green-500" />
                                3 Workspaces
                            </li>
                            <li className="flex items-center gap-2 text-sm">
                                <Check className="h-4 w-4 text-green-500" />
                                30 Social Profiles
                            </li>
                            <li className="flex items-center gap-2 text-sm">
                                <Check className="h-4 w-4 text-green-500" />
                                Advanced Analytics
                            </li>
                        </ul>
                        <Button variant="outline" className="w-full">Upgrade to Growth</Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
