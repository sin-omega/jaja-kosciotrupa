import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { supabaseAnon } from "../../../lib/supabase";

interface RouteParams {
  params: Promise<{ code: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { code } = await params;

  const { data } = await supabaseAnon
    .from("short_links")
    .select("original_url")
    .eq("code", code)
    .maybeSingle();

  if (data?.original_url) {
    return NextResponse.redirect(data.original_url, { status: 302 });
  }

  // Fallback: redirect to submit page
  const origin = request.nextUrl.origin;
  return NextResponse.redirect(new URL("/submit", origin), { status: 302 });
}
