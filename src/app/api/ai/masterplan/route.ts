import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export const runtime = "edge";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(request: NextRequest) {
  // Auth guard — Edge-compatible: read cookies from request directly (no next/headers)
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

  const { habitName, ramadanAmount, acceptedAmount, gender } = await request.json();

  if (!habitName || !ramadanAmount) {
    return new Response(
      JSON.stringify({ error: "habitName and ramadanAmount are required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

  const prompt = `You are a knowledgeable Islamic advisor helping a ${gender || "Muslim"} transition their Ramadan habits into a sustainable post-Ramadan lifestyle.

Habit: ${habitName}
Ramadan amount: ${ramadanAmount}
Committed post-Ramadan goal: ${acceptedAmount || ramadanAmount}

Generate a personalized masterplan JSON with exactly this structure:
{
  "suggestedAmount": "the specific sustainable daily/weekly amount",
  "motivation": "brief Islamic motivation sentence referencing Sunnah or Quran",
  "tip": "one practical tip to stay consistent",
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
  ]
}

Return ONLY valid JSON. No markdown, no code blocks, no extra text.`;

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const result = await model.generateContentStream(prompt);
        const encoder = new TextEncoder();

        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
          }
        }

        controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
        controller.close();
      } catch (error) {
        console.error("Masterplan stream error:", error);
        controller.enqueue(
          new TextEncoder().encode(`data: ${JSON.stringify({ error: "Stream failed" })}\n\n`)
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
