export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { generateWithFallback } from "@/lib/gemini";

export async function POST(req) {
  try {
    const body = await req.json();
    const { question, correctAnswers, userAnswer, questionType } = body;

    if (!question || userAnswer === undefined || userAnswer === null) {
      return NextResponse.json(
        { error: "Question and user answer are required" },
        { status: 400 }
      );
    }

    // Only use AI evaluation for fill-in-the-blank questions
    if (questionType === "fill-blank" || questionType === "fill_blank") {
      try {
        const correctAnswersList = Array.isArray(correctAnswers)
          ? correctAnswers.join(", ")
          : String(correctAnswers);

        const prompt = `You are an answer evaluator for a quiz application. Evaluate whether the user's answer is correct for the given question.

Question: ${question}
Correct Answer(s): ${correctAnswersList}
User Answer: ${userAnswer}

Consider the following when evaluating:
- Minor spelling mistakes should still be marked CORRECT
- Case differences should be ignored (e.g., "CPU" vs "cpu" are the same)
- Synonyms or equivalent meanings should be marked CORRECT (e.g., "Operating System" vs "OS")
- Abbreviations that match the full form should be CORRECT
- Conceptually correct answers that convey the same meaning should be CORRECT
- Clearly wrong or unrelated answers should be INCORRECT

Return your response in EXACTLY this format (two lines only):
CORRECT or INCORRECT
<brief explanation of why the answer is correct or incorrect>`;

        const response = await generateWithFallback(prompt);
        const lines = response.trim().split("\n");
        const verdict = lines[0].trim().toUpperCase();
        const explanation = lines.slice(1).join(" ").trim() || 
          `The correct answer is: ${Array.isArray(correctAnswers) ? correctAnswers[0] : correctAnswers}`;

        const isCorrect = verdict.includes("CORRECT") && !verdict.includes("INCORRECT");

        return NextResponse.json({
          isCorrect,
          explanation,
          correctAnswer: Array.isArray(correctAnswers) ? correctAnswers[0] : correctAnswers,
        });
      } catch (aiError) {
        console.warn("AI evaluation failed, falling back to basic matching:", aiError.message);

        // Fallback: basic string matching
        const normalizedUser = String(userAnswer).trim().toLowerCase();
        const answersArray = Array.isArray(correctAnswers)
          ? correctAnswers
          : [correctAnswers];

        const isCorrect = answersArray.some(
          (ans) => String(ans).trim().toLowerCase() === normalizedUser
        );

        return NextResponse.json({
          isCorrect,
          explanation: isCorrect
            ? "Your answer matches the expected answer."
            : `The correct answer is: ${answersArray[0]}`,
          correctAnswer: answersArray[0],
        });
      }
    }

    // For non-fill-blank types, do basic string comparison
    const normalizedUser = String(userAnswer).trim().toLowerCase();
    const normalizedCorrect = String(
      Array.isArray(correctAnswers) ? correctAnswers[0] : correctAnswers
    ).trim().toLowerCase();
    const isCorrect = normalizedUser === normalizedCorrect;

    return NextResponse.json({
      isCorrect,
      explanation: isCorrect
        ? "Correct!"
        : `The correct answer is: ${Array.isArray(correctAnswers) ? correctAnswers[0] : correctAnswers}`,
      correctAnswer: Array.isArray(correctAnswers) ? correctAnswers[0] : correctAnswers,
    });
  } catch (error) {
    console.error("Evaluate answer error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to evaluate answer" },
      { status: 500 }
    );
  }
}
