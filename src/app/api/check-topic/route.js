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

    const { searchParams } = new URL(request.url);
    const topic = searchParams.get("topic");

    if (!topic || topic.trim() === "") {
      return NextResponse.json({ level: null });
    }

    await connectDB();

    // Find the latest attempt for this user and topic
    const lastAttempt = await QuizAttempt.findOne(
      {
        userId,
        topic: { $regex: new RegExp(topic.trim(), "i") }, // Case-insensitive match
        topicLevel: { $exists: true, $nin: [null, ""] }
      },
      {},
      { sort: { createdAt: -1 } }
    );

    if (lastAttempt && lastAttempt.topicLevel) {
      return NextResponse.json({ level: lastAttempt.topicLevel });
    }

    return NextResponse.json({ level: null });
  } catch (error) {
    console.error("Error checking topic:", error);
    return NextResponse.json(
      { error: "Internal Server Error", level: null },
      { status: 500 }
    );
  }
}
