import { NextResponse } from "next/server";
import { runStrategyAnalysis } from "@/lib/ai/strategy-engine";

export async function POST(request: Request) {
  const { workspaceId } = await request.json();

  if (!workspaceId) {
    return NextResponse.json(
      { error: "Workspace ID is required" },
      { status: 400 }
    );
  }

  try {
    const { recommendations } = await runStrategyAnalysis(workspaceId);

    return NextResponse.json({ data: recommendations });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
