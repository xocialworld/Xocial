import { NextRequest, NextResponse } from "next/server";

// Legacy endpoint retained for backward compatibility.
// Redirect to the unified OAuth connect flow which applies correct scopes and state.
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const search = url.search ? url.search : "";
  return NextResponse.redirect(`/api/auth/connect?platform=youtube${search}`);
}

export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const search = url.search ? url.search : "";
  return NextResponse.redirect(`/api/auth/connect?platform=youtube${search}`);
}
