import { NextResponse } from "next/server";
import { generateWithFallback } from "@/lib/gemini";

export async function POST(req) {
  try {
    const { topic, subtopic } = await req.json();

    if (!topic) {
      return NextResponse.json(
        { error: "Topic is required" },
        { status: 400 }
      );
    }

    const subtopicClause = subtopic
      ? ` focusing on the subtopic: "${subtopic}"`
      : "";

    const prompt = `Generate exactly 5 multiple-choice quiz questions about "${topic}"${subtopicClause}.

Return ONLY a valid JSON array (no markdown, no code fences) where each object has:
{
  "id": <number>,
  "question": "<question text>",
  "options": ["A) option1", "B) option2", "C) option3", "D) option4"],
  "correctAnswer": "<the full correct option text, e.g. 'A) option1'>",
  "explanation": "<brief explanation of why this answer is correct>"
}

Make questions educational and progressively harder. Mix conceptual and application-based questions.`;

    const rawOutput = await generateWithFallback(prompt);

    let questions;
    try {
      const jsonMatch = rawOutput.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        questions = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON array found in response");
      }
    } catch (parseErr) {
      console.error("Failed to parse practice quiz:", parseErr);
      return NextResponse.json(
        { error: "Failed to parse quiz questions. Please try again." },
        { status: 500 }
      );
    }

    questions = questions
      .filter((q) => q && q.question && q.options && q.correctAnswer)
      .map((q, i) => ({ ...q, id: i + 1 }));

    return NextResponse.json({ questions });
  } catch (error) {
    console.error("Generate practice quiz error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate quiz" },
      { status: 500 }
    );
  }
}
