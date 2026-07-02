import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(_request: Request, { params }: { params: { token: string } }) {
  const supabase = createAdminClient();

  // .maybeSingle() collapses to `never` here regardless of the Database generic
  // (same confirmed upstream typing defect as the mutation methods elsewhere).
  const selectResult = await supabase
    .from("readiness")
    .select("*")
    .eq("token", params.token)
    .maybeSingle();
  const data = selectResult.data as { data: unknown; pct: number; submitted_at: string | null } | null;

  if (selectResult.error) {
    return NextResponse.json({ error: selectResult.error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request, { params }: { params: { token: string } }) {
  const body = await request.json();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("readiness")
    .update({
      data: body.data ?? {},
      pct: typeof body.pct === "number" ? body.pct : 0,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("token", params.token);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
