"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Calendar,
  Sparkles,
  BarChart3,
  Menu,
  X,
  Keyboard,
  ChevronsLeft,
  ChevronsRight,
  MessageCircle,
  LayoutDashboard,
  FileText,
  Image,
  Megaphone,
  CheckSquare,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { KeyboardShortcutsHelp, useKeyboardShortcutsHelp } from "@/components/shared/keyboard-shortcuts-help";

const navigation = [
  {
    name: "Dashboard",
    shortName: "D",
    href: "/x",
    icon: LayoutDashboard,
    shortcut: "⌥X",
    description: "Workspace overview",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10"
  },
  {
    name: "Create",
    shortName: "C",
    href: "/c",
    icon: Sparkles,
    shortcut: "⌥C",
    description: "Compose new posts",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10"
  },
  {
    name: "Calendar",
    shortName: "Cal",
    href: "/o",
    icon: Calendar,
    shortcut: "⌥O",
    description: "Plan and schedule",
    color: "text-green-500",
    bgColor: "bg-green-500/10"
  },
  {
    name: "Content/Posts",
    shortName: "P",
    href: "/posts",
    icon: FileText,
    shortcut: "⌥P",
    description: "Manage content",
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/10"
  },
  {
    name: "Media",
    shortName: "M",
    href: "/media",
    icon: Image,
    shortcut: "⌥M",
    description: "Assets library",
    color: "text-teal-500",
    bgColor: "bg-teal-500/10"
  },
  {
    name: "Inbox/Engagement",
    shortName: "I",
    href: "/i",
    icon: MessageCircle,
    shortcut: "⌥I",
    description: "Replies and mentions",
    color: "text-pink-500",
    bgColor: "bg-pink-500/10"
  },
  {
    name: "Analytics",
    shortName: "A",
    href: "/a",
    icon: BarChart3,
    shortcut: "⌥A",
    description: "Analytics & insights",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10"
  },
  {
    name: "Campaigns",
    shortName: "Cm",
    href: "/campaigns",
    icon: Megaphone,
    shortcut: "⌥G",
    description: "Track campaigns",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10"
  },
  {
    name: "Approvals",
    shortName: "Ap",
    href: "/approvals",
    icon: CheckSquare,
    shortcut: "⌥R",
    description: "Review workflow",
    color: "text-indigo-500",
    bgColor: "bg-indigo-500/10"
  },
  {
    name: "Settings",
    shortName: "S",
    href: "/settings",
    icon: Settings,
    shortcut: "⌥S",
    description: "Workspace settings",
    color: "text-slate-400",
    bgColor: "bg-slate-500/10"
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { open: helpOpen, setOpen: setHelpOpen } = useKeyboardShortcutsHelp();

  // Load collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    if (saved === 'true') setCollapsed(true);
  }, []);

  // Save collapsed state
  const toggleCollapsed = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', String(newState));
  };

  const closeMobile = () => setMobileOpen(false);

  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <>
      {/* Header with Logo */}
      <div className={cn(
        "flex h-14 items-center border-b border-white/10",
        collapsed && !isMobile ? "justify-center px-2" : "justify-between px-4"
      )}>
        <Link
          href="/x"
          className={cn(
            "flex items-center gap-2 group",
            collapsed && !isMobile && "justify-center"
          )}
        >
          <div className="relative flex-shrink-0">
            <Sparkles className="h-6 w-6 text-primary-400 group-hover:scale-110 transition-transform duration-200" />
          </div>
          {(!collapsed || isMobile) && (
            <span className="text-lg font-bold text-white">
              Xocial
            </span>
          )}
        </Link>

        {/* Desktop collapse toggle */}
        {!isMobile && (
          <button
            onClick={toggleCollapsed}
            className="p-1.5 rounded-md text-secondary-400 hover:text-white hover:bg-white/10 transition-colors"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronsRight className="h-4 w-4" />
            ) : (
              <ChevronsLeft className="h-4 w-4" />
            )}
          </button>
        )}

        {/* Mobile close button */}
        {isMobile && (
          <button
            onClick={closeMobile}
            className="p-1.5 text-secondary-400 hover:text-white rounded-md hover:bg-white/10 transition-colors"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className={cn(
        "flex-1 py-3 overflow-y-auto",
        collapsed && !isMobile ? "px-2" : "px-3"
      )}>
        <div className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={closeMobile}
                title={collapsed && !isMobile ? item.name : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg text-sm font-medium transition-colors duration-150 group relative",
                  collapsed && !isMobile
                    ? "justify-center p-2.5"
                    : "px-3 py-2",
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-secondary-400 hover:bg-white/5 hover:text-white"
                )}
              >
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-primary-400 rounded-r-full" />
                )}

                <div className={cn(
                  "p-1 rounded-md flex-shrink-0",
                  isActive ? `${item.bgColor} ${item.color}` : ""
                )}>
                  <item.icon className={cn(
                    "h-4 w-4",
                    isActive ? "" : "text-secondary-400 group-hover:text-white"
                  )} />
                </div>

                {(!collapsed || isMobile) && (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "font-mono text-[10px] px-1 py-0.5 rounded",
                        isActive
                          ? "bg-primary-500/30 text-primary-300"
                          : "bg-white/10 text-secondary-500"
                      )}>
                        {item.shortName}
                      </span>
                      <span className="truncate">{item.name}</span>
                    </div>
                    <span className={cn(
                      "text-xs truncate block",
                      isActive ? "text-white/60" : "text-secondary-500"
                    )}>
                      {item.description}
                    </span>
                  </div>
                )}

                {(!collapsed || isMobile) && (
                  <kbd className={cn(
                    "hidden lg:inline-flex px-1 py-0.5 text-[10px] rounded font-mono flex-shrink-0",
                    isActive
                      ? "bg-primary-500/20 text-primary-300"
                      : "bg-white/5 text-secondary-500 opacity-0 group-hover:opacity-100"
                  )}>
                    {item.shortcut}
                  </kbd>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Bottom section */}
      <div className={cn(
        "border-t border-white/10 py-2",
        collapsed && !isMobile ? "px-2" : "px-3"
      )}>
        <button
          onClick={() => setHelpOpen(true)}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg text-sm font-medium text-secondary-400 transition-colors hover:bg-white/5 hover:text-white group",
            collapsed && !isMobile ? "justify-center p-2.5" : "px-3 py-2"
          )}
          title={collapsed && !isMobile ? "Keyboard Shortcuts" : undefined}
        >
          <Keyboard className="h-4 w-4 text-secondary-500 group-hover:text-white transition-colors flex-shrink-0" />
          {(!collapsed || isMobile) && (
            <>
              <span className="flex-1 text-left">Shortcuts</span>
              <kbd className="hidden lg:inline-flex px-1 py-0.5 text-[10px] rounded bg-white/10 text-secondary-500 font-mono">
                ?
              </kbd>
            </>
          )}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-3 left-3 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setMobileOpen(true)}
          className="bg-white shadow-md border-secondary-200 h-9 w-9 p-0"
          aria-label="Open menu"
        >
          <Menu className="h-4 w-4" />
        </Button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={closeMobile}
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={cn(
          "lg:hidden fixed inset-y-0 left-0 z-50 w-64 flex flex-col bg-secondary-900 shadow-2xl transition-transform duration-200",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent isMobile />
      </div>

      {/* Desktop sidebar */}
      <div className={cn(
        "hidden lg:flex h-screen flex-col bg-secondary-900 border-r border-secondary-800 transition-[width] duration-200",
        collapsed ? "w-16" : "w-56"
      )}>
        <SidebarContent />
      </div>

      {/* Keyboard shortcuts help modal */}
      <KeyboardShortcutsHelp open={helpOpen} onOpenChange={setHelpOpen} />
    </>
  );
}
