import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const { location_id } = await request.json();
  if (!location_id || typeof location_id !== "string") {
    return NextResponse.json({ error: "location_id is required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // .maybeSingle() collapses to `never` here regardless of the Database generic
  // (same confirmed upstream typing defect as the mutation methods elsewhere).
  const selectResult = await supabase
    .from("readiness")
    .select("*")
    .eq("location_id", location_id)
    .maybeSingle();
  const existing = selectResult.data as { token: string } | null;

  if (selectResult.error) {
    return NextResponse.json({ error: selectResult.error.message }, { status: 500 });
  }

  if (existing) {
    return NextResponse.json({ token: existing.token });
  }

  const token = randomUUID();
  const { error: insertError } = await supabase
    .from("readiness")
    .insert({ location_id, token, data: {}, pct: 0 } as never);

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ token });
}
