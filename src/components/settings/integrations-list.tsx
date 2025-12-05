"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Facebook, Instagram, Linkedin, Twitter } from "lucide-react";

interface IntegrationsListProps {
    workspaceId: string;
}

export function IntegrationsList({ workspaceId }: IntegrationsListProps) {
    // Mock data
    const integrations = [
        { id: "instagram", name: "Instagram", icon: Instagram, connected: true, account: "@xocial_app" },
        { id: "facebook", name: "Facebook", icon: Facebook, connected: false },
        { id: "twitter", name: "X (Twitter)", icon: Twitter, connected: false },
        { id: "linkedin", name: "LinkedIn", icon: Linkedin, connected: true, account: "Xocial Company" },
    ];

    return (
        <Card>
            <CardHeader>
                <CardTitle>Connected Channels</CardTitle>
                <CardDescription>
                    Manage your social media connections
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {integrations.map((integration) => (
                    <div key={integration.id} className="flex items-center justify-between p-4 border border-secondary-100 rounded-lg">
                        <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-lg ${integration.connected ? "bg-primary-50 text-primary-600" : "bg-secondary-100 text-secondary-500"}`}>
                                <integration.icon className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="font-medium text-secondary-900">{integration.name}</p>
                                {integration.connected ? (
                                    <p className="text-sm text-green-600 flex items-center gap-1">
                                        <span className="w-2 h-2 rounded-full bg-green-500" />
                                        Connected as {integration.account}
                                    </p>
                                ) : (
                                    <p className="text-sm text-secondary-500">Not connected</p>
                                )}
                            </div>
                        </div>
                        <Button variant={integration.connected ? "outline" : "primary"}>
                            {integration.connected ? "Disconnect" : "Connect"}
                        </Button>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
