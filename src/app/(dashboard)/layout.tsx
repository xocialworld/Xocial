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
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header user={profile || { name: user.email || "User", email: user.email || "" }} />
        <main id="main-content" className="flex-1 overflow-y-auto bg-secondary-50">
          {children}
        </main>
      </div>
    </div>
  );
}

