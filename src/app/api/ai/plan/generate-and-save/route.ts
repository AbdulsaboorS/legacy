import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { habitId, habitName, gender } = await request.json();

  if (!habitId || !habitName) {
    return NextResponse.json({ error: "habitId and habitName are required" }, { status: 400 });
  }

  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: { responseMimeType: "application/json" },
  });

  const prompt = `You are a knowledgeable Islamic advisor creating a 28-day post-Ramadan habit continuation plan for a ${gender || "Muslim"}.

Habit: ${habitName}

Return a JSON object with exactly this structure:
{
  "corePhilosophy": "2-3 sentences on the deeper spiritual purpose and mindset behind maintaining this habit after Ramadan",
  "actionableSteps": [
    { "step": "Step title", "description": "concrete action to take" },
    { "step": "Step title", "description": "concrete action to take" },
    { "step": "Step title", "description": "concrete action to take" }
  ],
  "weeklyRoadmap": [
    { "week": 1, "focus": "short focus theme", "target": "specific measurable target" },
    { "week": 2, "focus": "short focus theme", "target": "specific measurable target" },
    { "week": 3, "focus": "short focus theme", "target": "specific measurable target" },
    { "week": 4, "focus": "short focus theme", "target": "specific measurable target" }
  ]
}`;

  try {
    const result = await model.generateContent(prompt);
    const plan = JSON.parse(result.response.text());

    const { error } = await supabase.rpc("save_habit_plan", {
      p_habit_id:          habitId,
      p_core_philosophy:   plan.corePhilosophy ?? null,
      p_actionable_steps:  plan.actionableSteps ?? [],
      p_weekly_roadmap:    plan.weeklyRoadmap ?? [],
      p_daily_actions:     [],
    });

    if (error) {
      console.error("save_habit_plan error:", error);
      return NextResponse.json({ error: "Failed to save plan" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("generate-and-save error:", error);
    return NextResponse.json({ error: "Failed to generate plan" }, { status: 500 });
  }
}
