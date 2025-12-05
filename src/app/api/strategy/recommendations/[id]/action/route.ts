import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = await createClient();
    const { action } = await request.json();
    const { id } = await params;

    if (!id || !action) {
        return NextResponse.json(
            { error: "ID and action are required" },
            { status: 400 }
        );
    }

    const updates: any = {
        status: action === "implement" ? "completed" : "dismissed",
        updated_at: new Date().toISOString(),
    };

    if (action === "implement") {
        updates.implemented_at = new Date().toISOString();
        // In a real app, we might capture implemented_by from the session here
    }

    try {
        const { data, error } = await supabase
            .from("strategy_recommendations")
            .update(updates)
            .eq("id", id)
            .select()
            .single();

        if (error) {
            console.error("Error updating recommendation:", error);
            return NextResponse.json(
                { error: "Failed to update recommendation" },
                { status: 500 }
            );
        }

        return NextResponse.json({ data });
    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
