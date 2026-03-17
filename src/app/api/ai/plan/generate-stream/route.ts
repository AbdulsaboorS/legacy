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
          // no-op
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

  const { habitId, habitName, gender } = await request.json();

  if (!habitId || !habitName) {
    return new Response(
      JSON.stringify({ error: "habitId and habitName are required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

  const genderContext = gender ? ` The user identifies as ${gender}.` : "";

  const prompt = `You are an Islamic habit advisor helping a Muslim maintain spiritual habits after Ramadan.${genderContext}

The user wants to build a sustainable routine around: "${habitName}"

Generate a personalized habit plan and return ONLY valid JSON with this exact structure:
{
  "corePhilosophy": "2-3 sentences explaining the Islamic wisdom and spiritual significance behind this habit",
  "actionableSteps": [
    { "step": "Step name", "description": "Clear actionable description" },
    { "step": "Step name", "description": "Clear actionable description" },
    { "step": "Step name", "description": "Clear actionable description" }
  ],
  "weeklyRoadmap": [
    { "week": 1, "focus": "Week 1 theme", "target": "Specific measurable target for week 1" },
    { "week": 2, "focus": "Week 2 theme", "target": "Specific measurable target for week 2" },
    { "week": 3, "focus": "Week 3 theme", "target": "Specific measurable target for week 3" },
    { "week": 4, "focus": "Week 4 theme", "target": "Specific measurable target for week 4" }
  ]
}

Return ONLY valid JSON. No markdown. No code blocks. No extra text.`;

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
