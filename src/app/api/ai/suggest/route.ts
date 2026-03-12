import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(request: NextRequest) {
  try {
    const { habitName, ramadanAmount } = await request.json();

    if (!habitName || !ramadanAmount) {
      return NextResponse.json(
        { error: "habitName and ramadanAmount are required" },
        { status: 400 }
      );
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `You are a knowledgeable Islamic advisor helping a Muslim transition their Ramadan habits into sustainable daily routines after Ramadan ends.

The person did the following during Ramadan:
- Habit: ${habitName}
- Ramadan Amount: ${ramadanAmount}

Generate a personalized, realistic, and sustainable post-Ramadan suggestion for this habit. The suggestion should:
1. Be significantly scaled down from the Ramadan amount (graceful step-down)
2. Be specific and actionable (not vague)
3. Feel achievable and not overwhelming
4. Include a brief Islamic motivation (1 sentence, reference Sunnah or Quran if relevant)

Respond in valid JSON format only, no markdown:
{
  "suggestedAmount": "the specific sustainable daily/weekly amount",
  "motivation": "brief Islamic motivation sentence",
  "tip": "one practical tip to stay consistent"
}`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Parse the JSON from the response
    const cleanedText = text.replace(/```json\n?|\n?```/g, "").trim();
    const suggestion = JSON.parse(cleanedText);

    return NextResponse.json(suggestion);
  } catch (error) {
    console.error("AI suggestion error:", error);
    return NextResponse.json(
      { error: "Failed to generate suggestion" },
      { status: 500 }
    );
  }
}
