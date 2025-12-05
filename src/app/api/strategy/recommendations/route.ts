import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) {
        return NextResponse.json(
            { error: "Workspace ID is required" },
            { status: 400 }
        );
    }

    try {
        const { data: recommendations, error } = await supabase
            .from("strategy_recommendations")
            .select("*")
            .eq("workspace_id", workspaceId)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching recommendations:", error);
            return NextResponse.json(
                { error: "Failed to fetch recommendations" },
                { status: 500 }
            );
        }

        return NextResponse.json({ data: recommendations });
    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
