"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Calendar,
  Sparkles,
  BarChart3,
  Users,
  LogOut,
  Lightbulb,
  MessageSquare,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const navigation = [
  { name: "X — Accounts", href: "/x", icon: Users },
  { name: "O — Organize", href: "/o", icon: Calendar },
  { name: "C — Create", href: "/c", icon: Sparkles },
  { name: "I — Influence", href: "/i", icon: Users },
  { name: "A — Analyze", href: "/a", icon: BarChart3 },
  { name: "L — Leverage", href: "/l", icon: Lightbulb },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Logged out successfully");
      router.push("/auth/login");
      router.refresh();
    } catch (error: any) {
      toast.error("Failed to logout");
    }
  };

  return (
    <div className="flex h-screen w-64 flex-col bg-secondary-900 text-white">
      {/* Logo */}
      <div className="flex h-16 items-center px-6 border-b border-secondary-800">
        <h1 className="text-2xl font-bold">Xocial</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary-600 text-white"
                  : "text-secondary-300 hover:bg-secondary-800 hover:text-white"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-secondary-800 p-4">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-secondary-300 transition-colors hover:bg-secondary-800 hover:text-white"
        >
          <LogOut className="h-5 w-5" />
          Logout
        </button>
      </div>
    </div>
  );
}

