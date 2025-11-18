'use client';
/* eslint-disable @next/next/no-img-element -- Header avatar falls back to social platform URLs requiring <img> usage */

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Bell, Search, Settings, LogOut, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { WorkspaceSwitcher } from "@/components/shared/workspace-switcher";

interface HeaderProps {
  user?: {
    name: string;
    email: string;
    avatar_url?: string;
  };
}

export function Header({ user }: HeaderProps) {
  const [showUserMenu, setShowUserMenu] = React.useState(false);
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      toast.error("Failed to sign out");
    } else {
      toast.success("Signed out successfully");
      router.push("/auth/login");
      router.refresh();
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-secondary-200 bg-white">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Search */}
        <div className="flex flex-1 items-center gap-4">
          <WorkspaceSwitcher />
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary-500" />
            <input
              type="text"
              placeholder="Search..."
              className="w-full rounded-lg border border-secondary-300 bg-secondary-50 py-2 pl-10 pr-4 text-sm focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-3">
          {/* Notifications */}
          <button className="relative rounded-lg p-2 text-secondary-600 hover:bg-secondary-100">
            <Bell className="h-5 w-5" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-error-500" />
          </button>

          {/* Settings */}
          <Link href="/settings">
            <button className="rounded-lg p-2 text-secondary-600 hover:bg-secondary-100">
              <Settings className="h-5 w-5" />
            </button>
          </Link>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-secondary-100"
            >
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.name}
                  className="h-8 w-8 rounded-full"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-sm font-medium text-white">
                  {user?.name?.charAt(0).toUpperCase() || "U"}
                </div>
              )}
              <div className="hidden text-left md:block">
                <p className="text-sm font-medium text-secondary-900">
                  {user?.name || "User"}
                </p>
                <p className="text-xs text-secondary-500">
                  {user?.email || "user@example.com"}
                </p>
              </div>
            </button>

            {/* User Dropdown */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 rounded-lg border border-secondary-200 bg-white shadow-lg">
                <Link href="/settings">
                  <button
                    className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-secondary-700 hover:bg-secondary-50"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <User className="h-4 w-4" />
                    Profile
                  </button>
                </Link>
                <Link href="/settings">
                  <button
                    className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-secondary-700 hover:bg-secondary-50"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </button>
                </Link>
                <hr className="my-1 border-secondary-200" />
                <button
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-error-600 hover:bg-error-50"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

