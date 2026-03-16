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

  const { habitId, currentPlan, refinementMessage } = await request.json();

  if (!habitId || !currentPlan || !refinementMessage) {
    return new Response(
      JSON.stringify({ error: "habitId, currentPlan, and refinementMessage are required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `You are an Islamic habit advisor. The user has requested a refinement to their 28-day plan.

Current plan JSON:
${JSON.stringify(currentPlan)}

User's refinement request: "${refinementMessage}"

Apply the refinement and return a COMPLETE revised plan with the SAME JSON structure:
{
  "corePhilosophy": "...",
  "actionableSteps": [ ...3 items... ],
  "weeklyRoadmap": [ ...4 weeks... ],
  "dailyActions": [ ...all 28 entries with day, action, tip... ]
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
        console.error("Plan refine stream error:", error);
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
