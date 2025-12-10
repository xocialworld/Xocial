import { Sidebar } from "@/components/layouts/sidebar";
import { Header } from "@/components/shared/header";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Get user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-secondary-50 via-white to-secondary-50/50">
      {/* Subtle background pattern */}
      <div className="fixed inset-0 -z-10 opacity-40">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-bl from-primary-100/30 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-blue-100/30 to-transparent rounded-full blur-3xl" />
      </div>

      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header user={profile || { name: user.email || "User", email: user.email || "" }} />
        <main
          id="main-content"
          className="flex-1 overflow-y-auto scrollbar-thin"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
