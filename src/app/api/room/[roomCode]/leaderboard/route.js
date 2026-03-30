import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import RoomAttempt from "@/models/RoomAttempt";

export async function GET(request, { params }) {
  try {
    const { roomCode } = await params;
    await dbConnect();

    const attempts = await RoomAttempt.find({
      roomCode: roomCode.toUpperCase(),
    })
      .sort({ totalScore: -1 })
      .lean();

    const leaderboard = attempts.map((a, idx) => ({
      rank: idx + 1,
      userId: a.userId,
      userName: a.userName,
      totalScore: a.totalScore,
      answeredCount: a.answers.length,
      correctCount: a.answers.filter((ans) => ans.isCorrect).length,
    }));

    return NextResponse.json({ leaderboard });
  } catch (error) {
    console.error("Leaderboard error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
