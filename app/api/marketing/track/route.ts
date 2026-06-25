import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Lightweight event sink for the Marketing Solutions page. The repo has no
// analytics SDK, so events land in the marketing_events table (admin-readable).
export async function POST(req: Request) {
  let body: { event?: string; props?: Record<string, unknown>; employer_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (!body.event || typeof body.event !== "string") {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const supabase = await createClient();
  await supabase.from("marketing_events").insert({
    event: body.event,
    props: body.props ?? {},
    employer_id: body.employer_id ?? null,
  });
  return new NextResponse(null, { status: 204 });
}
