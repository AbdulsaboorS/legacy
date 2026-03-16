import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const habitId = request.nextUrl.searchParams.get("habitId");
  if (!habitId) {
    return NextResponse.json(
      { error: "habitId is required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("habit_plans")
    .select("*")
    .eq("habit_id", habitId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("habit_plans list error:", error);
    return NextResponse.json({ error: "Failed to fetch plans" }, { status: 500 });
  }

  return NextResponse.json(data);
}
