import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import QuizRoom from "@/models/QuizRoom";
import RoomAttempt from "@/models/RoomAttempt";

export async function POST(request, { params }) {
  try {
    const { roomCode } = await params;
    const body = await request.json();
    const { userId, userName, questionIndex, answer, responseTimeMs } = body;

    if (!userId || questionIndex === undefined || answer === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    await dbConnect();

    const room = await QuizRoom.findOne({
      roomCode: roomCode.toUpperCase(),
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (room.status !== "active") {
      return NextResponse.json(
        { error: "Quiz is not active" },
        { status: 400 }
      );
    }

    const question = room.questions[questionIndex];
    if (!question) {
      return NextResponse.json(
        { error: "Invalid question index" },
        { status: 400 }
      );
    }

    // Find or create attempt
    let attempt = await RoomAttempt.findOne({
      roomCode: roomCode.toUpperCase(),
      userId,
    });

    if (!attempt) {
      attempt = await RoomAttempt.create({
        roomCode: roomCode.toUpperCase(),
        userId,
        userName: userName || "Anonymous",
        totalScore: 0,
        answers: [],
      });
    }

    // Check if already answered
    const alreadyAnswered = attempt.answers.some(
      (a) => a.questionIndex === questionIndex
    );
    if (alreadyAnswered) {
      return NextResponse.json(
        { error: "Already answered this question", alreadyAnswered: true },
        { status: 400 }
      );
    }

    // Check correctness
    const normalizedUser = String(answer).trim().toLowerCase();
    const normalizedCorrect = String(question.correctAnswer)
      .trim()
      .toLowerCase();
    const isCorrect = normalizedUser === normalizedCorrect;

    // Calculate points
    const timerMs = room.timerPerQuestion * 1000;
    const clampedTime = Math.min(
      Math.max(responseTimeMs || 0, 0),
      timerMs
    );
    const speedBonus = Math.round(50 * (1 - clampedTime / timerMs));
    const points = isCorrect ? 100 + speedBonus : 0;

    attempt.answers.push({
      questionIndex,
      answer: String(answer),
      isCorrect,
      responseTimeMs: clampedTime,
      points,
    });
    attempt.totalScore = attempt.answers.reduce((sum, a) => sum + a.points, 0);
    await attempt.save();

    return NextResponse.json({
      success: true,
      isCorrect,
      points,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      totalScore: attempt.totalScore,
    });
  } catch (error) {
    console.error("Submit answer error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
