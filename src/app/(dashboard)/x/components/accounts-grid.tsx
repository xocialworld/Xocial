"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SocialAccount, Platform } from "@/types";
import { Users, TrendingUp, FileText, Settings, Link2Off } from "lucide-react";
import { getPlatformColor } from "@/lib/utils";

interface AccountsGridProps {
  accounts: SocialAccount[];
}

export function AccountsGrid({ accounts }: AccountsGridProps) {
  if (accounts.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-secondary-300 p-12 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-secondary-100">
          <Users className="h-6 w-6 text-secondary-600" />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-secondary-900">
          No accounts connected
        </h3>
        <p className="mt-2 text-sm text-secondary-600">
          Get started by connecting your first social media account
        </p>
        <Button className="mt-6">
          Connect Account
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {accounts.map((account) => (
        <Card
          key={account.id}
          className="transition-all hover:shadow-lg hover:scale-[1.02]"
        >
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={account.account_avatar} />
                  <AvatarFallback
                    style={{ backgroundColor: getPlatformColor(account.platform) }}
                    className="text-white"
                  >
                    {account.account_name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-secondary-900">
                    {account.account_name}
                  </h3>
                  <p className="text-sm text-secondary-600">
                    @{account.account_id}
                  </p>
                </div>
              </div>
              <Badge
                variant={account.is_active ? "success" : "error"}
              >
                {account.is_active ? "Connected" : "Disconnected"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className="flex items-center justify-center mb-1">
                  <Users className="h-4 w-4 text-secondary-500" />
                </div>
                <p className="text-sm font-medium text-secondary-900">15.2K</p>
                <p className="text-xs text-secondary-600">Followers</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center mb-1">
                  <TrendingUp className="h-4 w-4 text-secondary-500" />
                </div>
                <p className="text-sm font-medium text-secondary-900">4.2%</p>
                <p className="text-xs text-secondary-600">Engagement</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center mb-1">
                  <FileText className="h-4 w-4 text-secondary-500" />
                </div>
                <p className="text-sm font-medium text-secondary-900">142</p>
                <p className="text-xs text-secondary-600">Posts</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" className="flex-1">
                <Settings className="mr-1 h-4 w-4" />
                Settings
              </Button>
              <Button variant="ghost" size="sm" className="flex-1">
                <Link2Off className="mr-1 h-4 w-4" />
                Disconnect
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

