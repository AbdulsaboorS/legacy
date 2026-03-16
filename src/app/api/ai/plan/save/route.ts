import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { habitId, plan } = await request.json();

  if (!habitId || !plan) {
    return NextResponse.json(
      { error: "habitId and plan are required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase.rpc("save_habit_plan", {
    p_habit_id:          habitId,
    p_core_philosophy:   plan.corePhilosophy ?? null,
    p_actionable_steps:  plan.actionableSteps ?? [],
    p_weekly_roadmap:    plan.weeklyRoadmap ?? [],
    p_daily_actions:     plan.dailyActions ?? [],
  });

  if (error) {
    console.error("save_habit_plan error:", error);
    return NextResponse.json({ error: "Failed to save plan" }, { status: 500 });
  }

  return NextResponse.json(data);
}
