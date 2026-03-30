import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import dbConnect from "@/lib/db";
import QuizAttempt from "@/models/QuizAttempt";

export async function GET(req, { params }) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await dbConnect();

    const attempt = await QuizAttempt.findOne({ _id: id, userId }).lean();

    if (!attempt) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: attempt._id.toString(),
      topic: attempt.topic,
      subtopic: attempt.subtopic || "",
      topicLevel: attempt.topicLevel || "",
      inputType: attempt.inputType || "topic",
      numQuestions: attempt.numQuestions || attempt.totalQuestions || 10,
      questions: attempt.questions || [],
      selectedQuestions: attempt.selectedQuestions || [],
    });
  } catch (error) {
    console.error("Error fetching quiz attempt:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
