import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import QuizRoom from "@/models/QuizRoom";

export async function GET(request, { params }) {
  try {
    const { roomCode } = await params;
    await dbConnect();

    const room = await QuizRoom.findOne({
      roomCode: roomCode.toUpperCase(),
    }).lean();

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // Build response — hide correct answers if quiz is active
    const safeRoom = {
      roomCode: room.roomCode,
      hostUserId: room.hostUserId,
      hostName: room.hostName,
      topic: room.topic,
      subtopic: room.subtopic,
      numQuestions: room.numQuestions,
      timerPerQuestion: room.timerPerQuestion,
      status: room.status,
      currentQuestionIndex: room.currentQuestionIndex,
      questionStartedAt: room.questionStartedAt,
      participants: room.participants.map((p) => ({
        userId: p.userId,
        name: p.name,
      })),
      totalQuestions: room.questions.length,
    };

    // Include current question (without correct answer) if active
    if (
      room.status === "active" &&
      room.currentQuestionIndex >= 0 &&
      room.currentQuestionIndex < room.questions.length
    ) {
      const q = room.questions[room.currentQuestionIndex];
      safeRoom.currentQuestion = {
        id: q.id,
        question: q.question,
        type: q.type,
        options: q.options,
        difficulty: q.difficulty,
        topic: q.topic,
        // NO correctAnswer or explanation
      };
    }

    return NextResponse.json(safeRoom);
  } catch (error) {
    console.error("GET room error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
