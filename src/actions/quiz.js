"use server";

import dbConnect from "@/lib/db";
import QuizAttempt from "@/models/QuizAttempt";

export async function saveQuizAttempt(data) {
  try {
    await dbConnect();

    if (data.quizId) {
      await QuizAttempt.findByIdAndUpdate(data.quizId, {
        score: data.score,
        totalQuestions: data.totalQuestions,
        numQuestions: data.numQuestions || data.totalQuestions || 10,
        accuracy: data.accuracy,
        answers: data.answers,
        selectedQuestions: data.selectedQuestions || [],
        difficultyProgression: data.difficultyProgression,
        weakTopics: data.weakTopics,
        tips: data.tips,
        resources: data.resources,
        subtopic: data.subtopic || "",
        topicLevel: data.topicLevel || "",
      });
      return { success: true, id: data.quizId };
    }

    // Fallback if no quizId provided
    const attempt = await QuizAttempt.create({
      userId: data.userId,
      topic: data.topic,
      subtopic: data.subtopic || "",
      topicLevel: data.topicLevel || "",
      inputType: data.inputType || "topic",
      score: data.score,
      totalQuestions: data.totalQuestions,
      accuracy: data.accuracy,
      answers: data.answers,
      difficultyProgression: data.difficultyProgression,
      weakTopics: data.weakTopics,
      tips: data.tips,
      resources: data.resources,
    });

    return { success: true, id: attempt._id.toString() };
  } catch (error) {
    console.error("Error saving quiz attempt:", error);
    return { success: false, error: error.message };
  }
}

export async function getUserQuizHistory(userId, limit = 20) {
  try {
    await dbConnect();

    const attempts = await QuizAttempt.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return attempts.map((a) => ({
      id: a._id.toString(),
      topic: a.topic,
      inputType: a.inputType,
      score: a.score,
      totalQuestions: a.totalQuestions,
      accuracy: a.accuracy,
      weakTopics: a.weakTopics,
      createdAt: a.createdAt.toISOString(),
    }));
  } catch (error) {
    console.error("Error fetching quiz history:", error);
    return [];
  }
}

// --- TOPIC LEVEL HELPERS --- //

import { generateWithFallback } from "@/lib/gemini";

import { getTopicLevel } from "@/lib/topic";

function computeNextTopicLevel(currentLevel, accuracy) {
  const levels = ["Beginner", "Intermediate", "Advanced"];
  const idx = levels.indexOf(currentLevel);
  const safeIdx = idx === -1 ? 0 : idx;

  if (accuracy >= 80) {
    return levels[Math.min(safeIdx + 1, 2)];
  } else if (accuracy < 50) {
    return levels[Math.max(safeIdx - 1, 0)];
  }
  return levels[safeIdx];
}

function getDifficultyForQuiz(previousLevel) {
  switch (previousLevel) {
    case "Beginner":
      return "medium"; // generate Intermediate-level questions
    case "Intermediate":
      return "hard"; // generate Advanced-level questions
    case "Advanced":
      return "hard";
    default:
      return "medium";
  }
}

function mapLevelToDifficultyLabel(level) {
  switch (level) {
    case "Beginner":
      return "easy";
    case "Intermediate":
      return "medium";
    case "Advanced":
      return "hard";
    default:
      return "medium";
  }
}

// --- QUIZ GENERATION --- //

export async function generateQuizAction(payload) {
  try {
    const {
      topic,
      subtopic,
      document: docContent,
      url,
      difficulty: manualDifficulty,
      numQuestions,
      userId,
    } = payload;

    const questionsCount = numQuestions || 10;
    const generateCount = Math.min(questionsCount + 5, 15);

    let sourceContext = "";
    let attemptInputType = "topic";
    let attemptTopic = "General";

    if (topic) {
      // If subtopic is provided, focus quiz content on subtopic
      if (subtopic && subtopic.trim()) {
        sourceContext = `Topic: ${topic}, specifically about: ${subtopic.trim()}`;
      } else {
        sourceContext = `Topic: ${topic}`;
      }
      attemptInputType = "topic";
      attemptTopic = topic;
    } else if (docContent) {
      sourceContext = `Document content: ${docContent.substring(0, 4000)}`;
      attemptInputType = "document";
      attemptTopic = "Document Upload";
    } else if (url) {
      sourceContext = `Content from URL: ${url}`;
      attemptInputType = "url";
      attemptTopic = url;
    } else {
      return { error: "Please provide a topic, document, or URL" };
    }

    // Determine difficulty: manual selection (first-time) or auto from previous level (returning)
    let resolvedDifficulty = manualDifficulty || "";

    if (!resolvedDifficulty && userId && topic) {
      const levelInfo = await getTopicLevel(userId, topic);
      if (!levelInfo.isNew && levelInfo.topicLevel) {
        resolvedDifficulty = getDifficultyForQuiz(levelInfo.topicLevel);
      }
    }

    const difficultyInstruction = resolvedDifficulty
      ? `Generate ALL questions at ${resolvedDifficulty} difficulty level. Do not mix difficulties.`
      : "Include a balanced mix of easy, medium, and hard questions.";

    const prompt = `Generate exactly ${generateCount} quiz questions based on the following:

${sourceContext}

${difficultyInstruction}

Requirements:
- Mix of question types: MCQ (multiple choice), true-false, and fill-in-the-blank
- Each question must have a difficulty tag: "easy", "medium", or "hard"
- For MCQ questions, provide exactly 4 options
- For true-false questions, provide ["True", "False"] as options
- For fill-in-the-blank questions, provide an empty options array []
- Include the correct answer for each question
- Include a brief explanation for each answer

Return ONLY a valid JSON array with no additional text. Each question object should have:
{
  "id": <number>,
  "question": "<question text>",
  "type": "mcq" | "true-false" | "fill-blank",
  "options": ["option1", "option2", ...] or [],
  "correctAnswer": "<correct answer>",
  "difficulty": "easy" | "medium" | "hard",
  "topic": "<sub-topic>",
  "explanation": "<brief explanation>"
}`;

    const response = await generateWithFallback(prompt);

    let questions;
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        questions = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON array found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", parseError);
      return { error: "Failed to parse quiz questions. Please try again." };
    }

    let quizId = null;
    if (userId) {
      try {
        await dbConnect();

        const attempt = await QuizAttempt.create({
          userId,
          topic: attemptTopic,
          subtopic: subtopic?.trim() || "",
          inputType: attemptInputType,
          questions: questions,
        });

        quizId = attempt._id.toString();
      } catch (dbError) {
        console.error("Failed to save initial quiz attempt:", dbError);
      }
    }

    return { questions, quizId };
  } catch (error) {
    console.error("Generate quiz error:", error);
    return { error: error.message || "Failed to generate quiz" };
  }
}

export async function evaluateAnswerAction({
  question,
  userAnswer,
  correctAnswer,
  questionType,
  explanation,
}) {
  try {
    if (!question || userAnswer === undefined || userAnswer === null) {
      return { error: "Question and user answer are required" };
    }

    const normalizedUser = String(userAnswer).trim().toLowerCase();
    const normalizedCorrect = String(correctAnswer).trim().toLowerCase();
    const isCorrect = normalizedUser === normalizedCorrect;

    return {
      isCorrect,
      correctAnswer,
      explanation: explanation || "The correct answer is: " + correctAnswer,
    };
  } catch (error) {
    console.error("Evaluate answer error:", error);
    return { error: error.message || "Failed to evaluate answer" };
  }
}

export async function finalFeedbackAction({ results, topic }) {
  try {
    if (!results || !Array.isArray(results)) {
      return { error: "Quiz results array is required" };
    }

    const totalQuestions = results.length;
    const correctCount = results.filter((r) => r.isCorrect).length;
    const accuracy =
      totalQuestions > 0
        ? Math.round((correctCount / totalQuestions) * 100)
        : 0;

    const wrongAnswers = results
      .filter((r) => !r.isCorrect)
      .map((r) => `- Topic: ${r.topic || "General"}, Question: ${r.question}`)
      .join("\n");

    const prompt = `A student has completed a quiz on "${topic || "General Topics"}".

Results:
- Score: ${correctCount}/${totalQuestions} (${accuracy}%)
- Questions answered incorrectly:
${wrongAnswers || "None - perfect score!"}

Based on these results, provide:
1. 3-5 specific improvement tips tailored to their weak areas
2. 3-5 recommended learning resources (real websites like GeeksforGeeks, Khan Academy, MDN, W3Schools, Coursera, etc.)
3. A list of weak topics they should focus on
4. "overallFeedback": "A brief motivational summary of their performance"

Return ONLY a valid JSON object:
{
  "tips": ["tip1", "tip2", "tip3"],
  "resources": [
    { "title": "Resource Name", "url": "https://...", "description": "Brief description" }
  ],
  "weakTopics": ["topic1", "topic2"],
  "overallFeedback": "A brief motivational summary of their performance"
}`;

    const response = await generateWithFallback(prompt);

    let feedback;
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        feedback = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found");
      }
    } catch {
      feedback = {
        tips: [
          "Review the topics you got wrong",
          "Practice with more quizzes",
          "Focus on understanding concepts rather than memorizing",
        ],
        resources: [
          {
            title: "GeeksforGeeks",
            url: "https://www.geeksforgeeks.org",
            description: "Comprehensive resource for CS topics",
          },
        ],
        weakTopics: [],
        overallFeedback: `You scored ${accuracy}%. Keep practicing to improve!`,
      };
    }

    return feedback;
  } catch (error) {
    console.error("Final feedback error:", error);
    return { error: error.message || "Failed to generate feedback" };
  }
}
