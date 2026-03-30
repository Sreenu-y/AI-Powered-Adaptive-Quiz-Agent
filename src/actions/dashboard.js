"use server";

import dbConnect from "@/lib/db";
import QuizAttempt from "@/models/QuizAttempt";

export async function getDashboardData(userId) {
  try {
    await dbConnect();

    const attempts = await QuizAttempt.find({ userId })
      .sort({ createdAt: -1 })
      .lean();

    const totalQuizzes = attempts.length;

    const totalCorrect = attempts.reduce((sum, a) => sum + (a.score || 0), 0);
    const totalQuestions = attempts.reduce(
      (sum, a) => sum + (a.totalQuestions || 0),
      0
    );
    const accuracy =
      totalQuestions > 0
        ? Math.round((totalCorrect / totalQuestions) * 100)
        : 0;
    const averageScore =
      totalQuizzes > 0
        ? Math.round(
            attempts.reduce(
              (sum, a) =>
                sum +
                (a.totalQuestions > 0
                  ? (a.score / a.totalQuestions) * 100
                  : 0),
              0
            ) / totalQuizzes
          )
        : 0;

    // Calculate streak (consecutive days with quizzes)
    let streak = 0;
    let playedToday = false;

    if (attempts.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let checkDate = new Date(today);
      
      const dayStartToday = new Date(today);
      const dayEndToday = new Date(today);
      dayEndToday.setDate(dayEndToday.getDate() + 1);
      
      playedToday = attempts.some((a) => {
        const d = new Date(a.createdAt);
        return d >= dayStartToday && d < dayEndToday;
      });

      if (!playedToday) {
        checkDate.setDate(checkDate.getDate() - 1);
      }

      for (let i = 0; i < 30; i++) {
        const dayStart = new Date(checkDate);
        const dayEnd = new Date(checkDate);
        dayEnd.setDate(dayEnd.getDate() + 1);

        const hasQuiz = attempts.some((a) => {
          const d = new Date(a.createdAt);
          return d >= dayStart && d < dayEnd;
        });

        if (hasQuiz) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    }

    // Recent activity (last 3)
    const recentActivity = attempts.slice(0, 3).map((a) => {
      const acc = a.totalQuestions > 0 ? Math.round((a.score / a.totalQuestions) * 100) : 0;
      return {
        id: a._id.toString(),
        topic: a.topic,
        score: a.score,
        totalQuestions: a.totalQuestions,
        accuracy: acc,
        inputType: a.inputType,
        createdAt: a.createdAt.toISOString(),
      };
    });

    // Chart data (last 7 attempts)
    const chartData = attempts
      .slice(0, 7)
      .reverse()
      .map((a) => ({
        date: new Date(a.createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        topic: a.topic || "Unknown Quiz",
        score: a.totalQuestions > 0
          ? Math.round((a.score / a.totalQuestions) * 100)
          : 0,
        accuracy: a.accuracy || 0,
      }));

    return {
      totalQuizzes,
      accuracy,
      averageScore,
      streak,
      isTodayActive: playedToday,
      recentActivity,
      chartData,
    };
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return {
      totalQuizzes: 0,
      accuracy: 0,
      averageScore: 0,
      streak: 0,
      recentActivity: [],
      chartData: [],
    };
  }
}
