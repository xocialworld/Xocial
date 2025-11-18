"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { toast } from "sonner";

export default function LeveragePage() {
  const [interested, setInterested] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleNotifyToggle = async () => {
    try {
      setLoading(true);
      const next = !interested;
      const res = await fetch("/api/feature-waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feature_name: "leverage", interested: next }),
      });
      if (!res.ok) throw new Error("Failed to update preference");
      setInterested(next);
      toast.success(next ? "You'll be notified when Leverage goes live" : "Removed from notifications");
    } catch (e) {
      toast.error("Unable to update your preference right now");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <PageHeader
        title="L — Leverage"
        description="Strategy engine functionality deferred in Phase 1."
        breadcrumbs={[{ label: "Dashboard", href: "/x" }, { label: "Leverage" }]}
      />
      <div className="mx-auto max-w-2xl">
        <Card className="rounded-2xl p-8 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-secondary-100">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 21s-8-4.5-8-11a8 8 0 0116 0c0 6.5-8 11-8 11z" stroke="currentColor" strokeWidth="1.5" />
              <path d="M9 10l3 3 5-5" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-secondary-900">Coming Soon</h2>
          <p className="mt-3 text-secondary-700">
            AI-powered weekly planning, campaigns, and timelines are on the roadmap.
          </p>
          <div className="mt-6">
            <Button onClick={handleNotifyToggle} disabled={loading} variant={interested ? "secondary" : "primary"}>
              {interested ? "Notify me when live — On" : "Notify me when live"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

