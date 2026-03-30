import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import connectDB from "@/lib/db";
import QuizAttempt from "@/models/QuizAttempt";

export async function GET(request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // Fetch all quiz attempts for the user, sort by newest first.
    // We only select the basic fields needed for the list to optimize network payload.
    const attempts = await QuizAttempt.find({ userId })
      .select("_id topic score totalQuestions accuracy createdAt difficultyProgression")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, attempts });
  } catch (error) {
    console.error("Error fetching history:", error);
    return NextResponse.json(
      { error: "Failed to fetch history" },
      { status: 500 }
    );
  }
}
