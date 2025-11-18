"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Platform = {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  isConfigured: boolean;
  comingSoon?: boolean;
};

export default function ConnectAccountPage() {
  const router = useRouter();
  const [connecting, setConnecting] = useState<string | null>(null);

  const platforms: Platform[] = [
    {
      id: "facebook",
      name: "Facebook",
      description: "Connect your Facebook pages to manage posts and insights",
      icon: "📘",
      color: "bg-[#1877F2]",
      isConfigured: !!process.env.NEXT_PUBLIC_FACEBOOK_ENABLED,
    },
    {
      id: "instagram",
      name: "Instagram",
      description: "Connect Instagram Business accounts linked to your Facebook pages",
      icon: "📷",
      color: "bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF]",
      isConfigured: !!process.env.NEXT_PUBLIC_FACEBOOK_ENABLED,
    },
    {
      id: "twitter",
      name: "Twitter / X",
      description: "Connect your Twitter account to schedule tweets and track engagement",
      icon: "🐦",
      color: "bg-[#1DA1F2]",
      isConfigured: !!process.env.NEXT_PUBLIC_TWITTER_ENABLED,
    },
    {
      id: "linkedin",
      name: "LinkedIn",
      description: "Connect your LinkedIn profile and company pages",
      icon: "💼",
      color: "bg-[#0A66C2]",
      isConfigured: false,
      comingSoon: !process.env.NEXT_PUBLIC_LINKEDIN_ENABLED,
    },
    {
      id: "youtube",
      name: "YouTube",
      description: "Connect your YouTube channel to manage video uploads and analytics",
      icon: "🎥",
      color: "bg-[#FF0000]",
      isConfigured: !!process.env.NEXT_PUBLIC_YOUTUBE_ENABLED,
    },
    {
      id: "tiktok",
      name: "TikTok",
      description: "Connect your TikTok account to schedule videos and track performance",
      icon: "🎵",
      color: "bg-black",
      isConfigured: false,
      comingSoon: !process.env.NEXT_PUBLIC_TIKTOK_ENABLED,
    },
  ];

  const handleConnect = async (platformId: string) => {
    const platform = platforms.find(p => p.id === platformId);
    if (platform && !platform.isConfigured) {
      toast.error(`${platform.name} is not configured. Please contact your administrator.`);
      return;
    }
    setConnecting(platformId);
    try {
      window.location.href = `/api/oauth/connect?platform=${platformId}&redirect=/x`;
    } catch (error) {
      toast.error(`Failed to connect to ${platformId}. Please try again.`);
      setConnecting(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Header */}
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <Link
            href="/x"
            className="inline-flex items-center text-sm text-secondary-600 hover:text-secondary-900 mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Accounts
          </Link>
          
          <h1 className="text-3xl font-bold text-secondary-900">
            Connect Social Media Account
          </h1>
          <p className="mt-2 text-secondary-600">
            Choose a platform below to connect your account and start managing your social media presence
          </p>
        </div>

        {/* Platform Cards */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {platforms.map((platform) => (
            <div
              key={platform.id}
              className="relative overflow-hidden rounded-lg border border-secondary-200 bg-white shadow-sm transition-all hover:shadow-md"
            >
              {/* Platform Icon Header */}
              <div className={`${platform.color} flex h-24 items-center justify-center text-5xl`}>
                {platform.icon}
              </div>

              {/* Platform Info */}
              <div className="p-6">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-secondary-900">
                    {platform.name}
                  </h3>
                  {platform.isConfigured && !platform.comingSoon && (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  )}
                </div>
                
                <p className="mb-4 text-sm text-secondary-600">
                  {platform.description}
                </p>

                {platform.comingSoon ? (
                  <Button
                    disabled
                    className="w-full"
                    variant="secondary"
                  >
                    Coming Soon
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleConnect(platform.id)}
                    disabled={connecting === platform.id}
                    className="w-full"
                  >
                    {connecting === platform.id ? (
                      <>
                        <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                        Connecting...
                      </>
                    ) : (
                      <>Connect {platform.name}</>
                    )}
                  </Button>
                )}
              </div>

              {/* Configuration Status Badge */}
              {!platform.comingSoon && (
                <div className="absolute right-2 top-2">
                  {platform.isConfigured ? (
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                      Ready
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                      Setup Required
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Help Section */}
        <div className="mt-12 rounded-lg border border-blue-200 bg-blue-50 p-6">
          <h3 className="mb-2 text-lg font-semibold text-blue-900">
            Need Help?
          </h3>
          <p className="mb-4 text-sm text-blue-800">
            If you encounter any issues connecting your accounts, please check:
          </p>
          <ul className="list-inside list-disc space-y-2 text-sm text-blue-800">
            <li>You have the necessary permissions to authorize the app</li>
            <li>Pop-up blockers are disabled for this site</li>
            <li>For Instagram: You must have a Business account linked to a Facebook page</li>
            <li>For YouTube: You must have a YouTube channel associated with your Google account</li>
            <li>
              For platforms showing &quot;Setup Required&quot;: Contact your administrator to configure credentials
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

