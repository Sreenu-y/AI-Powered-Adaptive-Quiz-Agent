import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import dbConnect from "@/lib/db";
import QuizAttempt from "@/models/QuizAttempt";

export async function GET(req) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const topicParam = searchParams.get("topic");

    if (topicParam) {
      // Return all attempts for a specific topic
      const attempts = await QuizAttempt.find({ userId, topic: topicParam })
        .sort({ createdAt: -1 })
        .select("score totalQuestions accuracy createdAt")
        .lean();

      return NextResponse.json({
        topic: topicParam,
        attempts: attempts.map((a) => ({
          id: a._id.toString(),
          score: a.score,
          totalQuestions: a.totalQuestions,
          accuracy: a.accuracy || (a.totalQuestions > 0 ? Math.round((a.score / a.totalQuestions) * 100) : 0),
          createdAt: a.createdAt.toISOString(),
        })),
      });
    }

    // Return grouped topic summaries
    const attempts = await QuizAttempt.find({ userId })
      .sort({ createdAt: -1 })
      .select("topic score totalQuestions accuracy createdAt")
      .lean();

    const topicMap = {};
    for (const a of attempts) {
      const t = a.topic || "Unknown";
      if (!topicMap[t]) {
        topicMap[t] = { topic: t, scores: [], lastAttemptDate: a.createdAt };
      }
      const pct = a.totalQuestions > 0 ? Math.round((a.score / a.totalQuestions) * 100) : 0;
      topicMap[t].scores.push(pct);
      if (new Date(a.createdAt) > new Date(topicMap[t].lastAttemptDate)) {
        topicMap[t].lastAttemptDate = a.createdAt;
      }
    }

    const topics = Object.values(topicMap).map((t) => ({
      topic: t.topic,
      attempts: t.scores.length,
      avgScore: Math.round(t.scores.reduce((s, v) => s + v, 0) / t.scores.length),
      lastAttemptDate: t.lastAttemptDate.toISOString ? t.lastAttemptDate.toISOString() : t.lastAttemptDate,
    }));

    // Sort by most recent attempt
    topics.sort((a, b) => new Date(b.lastAttemptDate) - new Date(a.lastAttemptDate));

    return NextResponse.json({ topics });
  } catch (error) {
    console.error("Analytics API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
