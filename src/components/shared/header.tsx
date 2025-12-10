'use client';
/* eslint-disable @next/next/no-img-element -- Header avatar falls back to social platform URLs requiring <img> usage */

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Search,
  LogOut,
  User,
  ChevronDown,
  Sparkles,
  Command,
  HelpCircle,
  Zap,
  Settings,
  CreditCard,
  Bell,
  Inbox
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { WorkspaceSwitcher } from "@/components/shared/workspace-switcher";
import { NotificationCenter } from "@/components/shared/notification-center";
import { HelpDrawer } from "@/components/shared/help-drawer";

interface HeaderProps {
  user?: {
    name: string;
    email: string;
    avatar_url?: string;
  };
}

export function Header({ user }: HeaderProps) {
  const [showUserMenu, setShowUserMenu] = React.useState(false);
  const [searchFocused, setSearchFocused] = React.useState(false);
  const [showHelpDrawer, setShowHelpDrawer] = React.useState(false);
  const router = useRouter();
  const menuRef = React.useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    <header className="sticky top-0 z-40 border-b border-secondary-200/80 bg-white/80 backdrop-blur-xl">
      <div className="flex h-14 items-center justify-between px-4 lg:px-6">
        {/* Left section - Workspace & Search */}
        <div className="flex flex-1 items-center gap-4">
          {/* Workspace Switcher */}
          <div className="hidden sm:block">
            <WorkspaceSwitcher />
          </div>

          {/* Divider */}
          <div className="hidden sm:block h-5 w-px bg-secondary-200" />

          {/* Search */}
          <div className={cn(
            "relative flex-1 max-w-md transition-all duration-300",
            searchFocused && "max-w-xl"
          )}>
            <div className="relative">
              <Search className={cn(
                "absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors",
                searchFocused ? "text-primary-500" : "text-secondary-400"
              )} />
              <input
                type="text"
                placeholder="Search posts, accounts..."
                className={cn(
                  "w-full rounded-lg border bg-secondary-50/80 py-2 pl-10 pr-12 text-sm transition-all duration-300",
                  searchFocused
                    ? "border-primary-300 bg-white ring-2 ring-primary-500/10 outline-none"
                    : "border-secondary-200 hover:border-secondary-300 focus:border-primary-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/10"
                )}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-secondary-400 bg-secondary-100 rounded border border-secondary-200">
                <Command className="h-2.5 w-2.5" />
                K
              </kbd>
            </div>
          </div>
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-1">
          {/* AI Assistant Quick Access */}
          <Button
            variant="ghost"
            size="sm"
            className="hidden md:flex gap-1.5 h-8 px-2.5 text-secondary-600 hover:text-primary-600 hover:bg-primary-50"
          >
            <Sparkles className="h-4 w-4" />
            <span className="text-xs font-medium">AI</span>
          </Button>

          {/* Upgrade Button */}
          <Button
            variant="ghost"
            size="sm"
            className="hidden lg:flex gap-1.5 h-8 px-2.5 text-secondary-600 hover:text-primary-600 hover:bg-primary-50"
          >
            <Zap className="h-4 w-4" />
            <span className="text-xs font-medium">Upgrade</span>
          </Button>

          {/* Help */}
          <button
            onClick={() => setShowHelpDrawer(true)}
            className="p-2 rounded-lg text-secondary-400 hover:text-secondary-600 hover:bg-secondary-100 transition-colors"
            title="Help & Resources"
          >
            <HelpCircle className="h-[18px] w-[18px]" />
          </button>

          {/* Engagement Inbox */}
          <Link href="/e">
            <button
              className="p-2 rounded-lg text-secondary-400 hover:text-pink-600 hover:bg-pink-50 transition-colors relative"
              title="Engagement Inbox"
            >
              <Inbox className="h-[18px] w-[18px]" />
            </button>
          </Link>

          {/* Notifications */}
          <NotificationCenter />

          {/* User Menu */}
          <div className="relative ml-1" ref={menuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-2 py-1.5 transition-all",
                showUserMenu
                  ? "bg-secondary-100"
                  : "hover:bg-secondary-50"
              )}
            >
              {user?.avatar_url?.length ? (
                <img
                  src={user.avatar_url}
                  alt={user.name}
                  className="h-7 w-7 rounded-full ring-2 ring-white shadow-sm"
                />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-600 text-xs font-medium text-white ring-2 ring-white shadow-sm">
                  {user?.name?.charAt(0).toUpperCase() || "U"}
                </div>
              )}
              <ChevronDown className={cn(
                "hidden sm:block h-3.5 w-3.5 text-secondary-400 transition-transform",
                showUserMenu && "rotate-180"
              )} />
            </button>

            {/* User Dropdown */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl border border-secondary-200 bg-white shadow-xl shadow-secondary-200/50 overflow-hidden animate-in slide-in-from-top-2 fade-in duration-200">
                {/* User info header */}
                <div className="px-4 py-3 bg-gradient-to-r from-secondary-50 to-secondary-100 border-b border-secondary-100">
                  <div className="flex items-center gap-3">
                    {user?.avatar_url?.length ? (
                      <img
                        src={user.avatar_url}
                        alt={user.name}
                        className="h-10 w-10 rounded-full"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-600 text-sm font-medium text-white">
                        {user?.name?.charAt(0).toUpperCase() || "U"}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-secondary-900 truncate">{user?.name || "User"}</p>
                      <p className="text-xs text-secondary-500 truncate">{user?.email || "user@example.com"}</p>
                    </div>
                  </div>
                </div>

                <div className="p-1.5">
                  <Link href="/settings?tab=profile" onClick={() => setShowUserMenu(false)}>
                    <button className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-secondary-700 hover:bg-secondary-50 rounded-lg transition-colors">
                      <User className="h-4 w-4 text-secondary-400" />
                      Profile
                    </button>
                  </Link>
                  <Link href="/settings" onClick={() => setShowUserMenu(false)}>
                    <button className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-secondary-700 hover:bg-secondary-50 rounded-lg transition-colors">
                      <Settings className="h-4 w-4 text-secondary-400" />
                      Settings
                    </button>
                  </Link>
                  <Link href="/settings?tab=billing" onClick={() => setShowUserMenu(false)}>
                    <button className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-secondary-700 hover:bg-secondary-50 rounded-lg transition-colors">
                      <CreditCard className="h-4 w-4 text-secondary-400" />
                      Billing
                    </button>
                  </Link>
                  <Link href="/settings?tab=notifications" onClick={() => setShowUserMenu(false)}>
                    <button className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-secondary-700 hover:bg-secondary-50 rounded-lg transition-colors">
                      <Bell className="h-4 w-4 text-secondary-400" />
                      Notifications
                    </button>
                  </Link>
                </div>

                <div className="border-t border-secondary-100 p-1.5">
                  <button
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-error-600 hover:bg-error-50 rounded-lg transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Help Drawer */}
      <HelpDrawer open={showHelpDrawer} onClose={() => setShowHelpDrawer(false)} />
    </header>
  );
}
