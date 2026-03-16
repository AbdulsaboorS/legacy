import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export const runtime = "edge";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(request: NextRequest) {
  // Edge-compatible auth guard — reads cookies from request (never next/headers)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {
          // no-op — session refresh handled by middleware, not this edge route
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const { habitId, habitName, ramadanAmount, acceptedAmount, gender } =
    await request.json();

  if (!habitId || !habitName) {
    return new Response(
      JSON.stringify({ error: "habitId and habitName are required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `You are a knowledgeable Islamic advisor creating a 28-day post-Ramadan habit plan for a ${gender || "Muslim"}.

Habit: ${habitName}
Ramadan amount: ${ramadanAmount || "daily"}
Committed post-Ramadan goal: ${acceptedAmount || ramadanAmount || "daily"}

Generate a complete plan JSON with exactly this structure:
{
  "corePhilosophy": "2-3 sentences on the deeper spiritual purpose and mindset behind this habit",
  "actionableSteps": [
    { "step": "Step 1 title", "description": "concrete action to take" },
    { "step": "Step 2 title", "description": "concrete action to take" },
    { "step": "Step 3 title", "description": "concrete action to take" }
  ],
  "weeklyRoadmap": [
    { "week": 1, "focus": "short focus theme", "target": "specific measurable target" },
    { "week": 2, "focus": "short focus theme", "target": "specific measurable target" },
    { "week": 3, "focus": "short focus theme", "target": "specific measurable target" },
    { "week": 4, "focus": "short focus theme", "target": "specific measurable target" }
  ],
  "dailyActions": [
    { "day": 1, "action": "specific task for day 1", "tip": "motivational tip" },
    { "day": 2, "action": "specific task for day 2", "tip": "motivational tip" },
    ...
    { "day": 28, "action": "specific task for day 28", "tip": "motivational tip" }
  ]
}

All 28 dailyActions entries are required. Do not stop before day 28. Keep each action under 80 characters. Keep each tip under 100 characters. Return ONLY valid JSON. No markdown. No code blocks. No extra text.`;

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const result = await model.generateContentStream(prompt);
        const encoder = new TextEncoder();

        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
            );
          }
        }

        controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
        controller.close();
      } catch (error) {
        console.error("Plan generate stream error:", error);
        controller.enqueue(
          new TextEncoder().encode(
            `data: ${JSON.stringify({ error: "Stream failed" })}\n\n`
          )
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
