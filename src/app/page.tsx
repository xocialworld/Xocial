import { redirect } from "next/navigation";

export default function Home() {
  // Redirect to login page or dashboard
  redirect("/auth/login");
}

