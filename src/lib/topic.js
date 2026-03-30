import dbConnect from "@/lib/db";
import QuizAttempt from "@/models/QuizAttempt";

export async function getTopicLevel(userId, topic) {
  try {
    if (!userId || !topic) return { isNew: true, topicLevel: null };

    await dbConnect();

    const lastAttempt = await QuizAttempt.findOne({
      userId,
      topic: { $regex: new RegExp(topic.trim(), "i") },
      topicLevel: { $exists: true, $nin: [null, ""] },
    })
      .sort({ createdAt: -1 })
      .lean();

    if (!lastAttempt || !lastAttempt.topicLevel) {
      return { isNew: true, topicLevel: null };
    }

    return { isNew: false, topicLevel: lastAttempt.topicLevel };
  } catch (error) {
    console.error("Error fetching topic level:", error);
    return { isNew: true, topicLevel: null };
  }
}
