import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !serviceKey) {
    return NextResponse.json({ providers: [], configured: false });
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  let { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .in("role", ["doctor", "caregiver"])
    .order("full_name", { ascending: true });

  if (error?.message?.includes("email")) {
    const fallback = await supabase
      .from("profiles")
      .select("id, full_name, role")
      .in("role", ["doctor", "caregiver"])
      .order("full_name", { ascending: true });
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    return NextResponse.json({ providers: [], error: error.message }, { status: 200 });
  }

  return NextResponse.json({ providers: data ?? [], configured: true });
}
