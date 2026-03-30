"use server";

import dbConnect from "@/lib/db";
import QuizRoom from "@/models/QuizRoom";
import RoomAttempt from "@/models/RoomAttempt";
import { generateWithFallback } from "@/lib/gemini";
import { revalidatePath } from "next/cache";

// ── Helpers ──

function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1 confusion
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// ── Create Room ──

export async function createRoom({
  topic,
  subtopic,
  difficulty = "mixed",
  document: docContent,
  url,
  inputType,
  numQuestions = 5,
  timerPerQuestion = 20,
  maxParticipants = 5,
  userId,
  userName,
}) {
  try {
    if (!userId) return { error: "You must be signed in" };

    await dbConnect();

    // Build source context based on input type
    const count = Math.min((numQuestions || 5) + 3, 15);
    let sourceContext = "";
    let roomTopic = "General";

    if (inputType === "url" && url?.trim()) {
      sourceContext = `Content from URL: ${url.trim()}`;
      roomTopic = url.trim();
    } else if (inputType === "document" && docContent) {
      sourceContext = `Document content: ${docContent.substring(0, 4000)}`;
      roomTopic = "Document Upload";
    } else if (topic?.trim()) {
      sourceContext = subtopic?.trim()
        ? `Topic: ${topic}, specifically about: ${subtopic.trim()}`
        : `Topic: ${topic}`;
      roomTopic = topic.trim();
    } else {
      return { error: "Please provide a topic, document, or URL" };
    }

    const prompt = `Generate exactly ${count} quiz questions based on the following:

${sourceContext}

Difficulty Level: ${difficulty}

Requirements:
- Mix of question types: MCQ (multiple choice), true-false, and fill-in-the-blank
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
  "difficulty": "${difficulty}",
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
        throw new Error("No JSON array found");
      }
    } catch {
      return { error: "Failed to generate quiz questions. Please try again." };
    }

    const finalQuestions = questions.slice(0, numQuestions || 5);

    let roomCode;
    let attempts = 0;
    do {
      roomCode = generateRoomCode();
      const existing = await QuizRoom.findOne({ roomCode });
      if (!existing) break;
      attempts++;
    } while (attempts < 10);

    if (attempts >= 10) {
      return { error: "Failed to generate unique room code. Try again." };
    }

    const room = await QuizRoom.create({
      roomCode,
      hostUserId: userId,
      hostName: userName || "Host",
      topic: roomTopic,
      subtopic: subtopic?.trim() || "",
      difficulty,
      questions: finalQuestions,
      numQuestions: finalQuestions.length,
      timerPerQuestion: timerPerQuestion || 20,
      maxParticipants: maxParticipants || 5,
      status: "waiting",
      currentQuestionIndex: -1,
      participants: [{ userId, name: userName || "Host" }],
    });

    return { success: true, roomCode: room.roomCode };
  } catch (error) {
    console.error("Create room error:", error);
    return { error: error.message || "Failed to create room" };
  }
}

// ── Join Room ──

export async function joinRoom({ roomCode, userId, userName }) {
  try {
    if (!roomCode?.trim()) return { error: "Room code is required" };
    if (!userId) return { error: "You must be signed in" };

    await dbConnect();

    const room = await QuizRoom.findOne({
      roomCode: roomCode.trim().toUpperCase(),
    });

    if (!room) return { error: "Room not found. Check the code and try again." };
    
    const alreadyJoined = room.participants.some((p) => p.userId === userId);
    
    if (room.status !== "waiting" && room.status !== "full" && !alreadyJoined) {
      return { error: "This quiz has already started or finished." };
    }

    if (!alreadyJoined) {
      if (room.participants.length >= room.maxParticipants) {
        return { error: "Room is full." };
      }
      room.participants.push({ userId, name: userName || "Anonymous" });
      
      // Update status if full
      if (room.participants.length >= room.maxParticipants) {
        room.status = "full";
      }
      
      await room.save();
    }

    return { success: true, roomCode: room.roomCode };
  } catch (error) {
    console.error("Join room error:", error);
    return { error: error.message || "Failed to join room" };
  }
}

// ── Get Room Status (with Lazy Advance) ──

export async function getRoomStatus(roomCode, userId) {
  try {
    await dbConnect();
    const room = await QuizRoom.findOne({ roomCode });
    if (!room) return { error: "Room not found" };

    let needsSave = false;

    // Lazy Advance logic
    if (room.status === "active" && room.questionStartedAt) {
      const now = new Date();
      const elapsed = now - new Date(room.questionStartedAt);
      const limit = (room.timerPerQuestion + 2) * 1000; // Add 2s grace for sync

      if (elapsed > limit) {
        const nextIndex = room.currentQuestionIndex + 1;
        if (nextIndex >= room.questions.length) {
          room.status = "completed";
          room.questionStartedAt = null;
        } else {
          room.currentQuestionIndex = nextIndex;
          room.questionStartedAt = new Date();
        }
        needsSave = true;
      }
    } else if (room.status === "countdown" && room.questionStartedAt) {
      const now = new Date();
      const elapsed = now - new Date(room.questionStartedAt);
      if (elapsed > 5000) {
        room.status = "active";
        room.currentQuestionIndex = 0;
        room.questionStartedAt = new Date();
        needsSave = true;
      }
    }

    if (needsSave) {
      await room.save();
    }

    // Prepare participants data (plain objects)
    const participants = room.participants.map(p => ({
      userId: p.userId,
      name: p.name,
      joinedAt: p.joinedAt,
      score: p.score || 0
    }));

    // Current Question (plain object)
    let currentQuestion = null;
    if (room.status === "active" && room.currentQuestionIndex >= 0 && room.currentQuestionIndex < room.questions.length) {
      const q = room.questions[room.currentQuestionIndex];
      currentQuestion = {
        question: q.question,
        options: q.options,
        type: q.type,
        correctAnswer: q.correctAnswer, // Client handles hiding this if needed, or we filter it here
        explanation: q.explanation
      };
    }

    return {
      success: true,
      status: room.status,
      hostUserId: room.hostUserId,
      topic: room.topic,
      difficulty: room.difficulty,
      currentQuestionIndex: room.currentQuestionIndex,
      questionStartedAt: room.questionStartedAt ? room.questionStartedAt.toISOString() : null,
      timerPerQuestion: room.timerPerQuestion,
      participants,
      numQuestions: room.numQuestions,
      maxParticipants: room.maxParticipants,
      chatMessages: JSON.parse(JSON.stringify(room.chatMessages.slice(-20))), 
      currentQuestion
    };
  } catch (error) {
    console.error("Get room status error:", error);
    return { error: "Failed to fetch room status" };
  }
}

// ── Start Room ──

export async function startRoom({ roomCode, userId }) {
  try {
    await dbConnect();
    const room = await QuizRoom.findOne({ roomCode });
    if (!room) return { error: "Room not found" };
    if (room.hostUserId !== userId) return { error: "Only the host can start" };
    
    room.status = "countdown";
    room.currentQuestionIndex = -1;
    room.questionStartedAt = new Date();
    await room.save();

    // Initialize attempts
    const bulkOps = room.participants.map((p) => ({
      updateOne: {
        filter: { roomCode, userId: p.userId },
        update: {
          $setOnInsert: {
            roomCode,
            userId: p.userId,
            userName: p.name,
            totalScore: 0,
            answers: [],
          },
        },
        upsert: true,
      },
    }));
    if (bulkOps.length > 0) {
      await RoomAttempt.bulkWrite(bulkOps);
    }

    return { success: true };
  } catch (error) {
    return { error: error.message || "Failed to start" };
  }
}

// ── Submit Answer ──

export async function submitAnswer({
  roomCode,
  userId,
  userName,
  questionIndex,
  answer,
  responseTimeMs,
}) {
  try {
    await dbConnect();
    const room = await QuizRoom.findOne({ roomCode });
    if (!room || room.status !== "active") return { error: "Room not active" };

    const question = room.questions[questionIndex];
    if (!question) return { error: "Invalid question" };

    let attempt = await RoomAttempt.findOne({ roomCode, userId });
    if (!attempt) {
      attempt = await RoomAttempt.create({
        roomCode, userId, userName, totalScore: 0, answers: []
      });
    }

    if (attempt.answers.some(a => a.questionIndex === questionIndex)) {
      return { error: "Already answered" };
    }

    const isCorrect = String(answer).trim().toLowerCase() === String(question.correctAnswer).trim().toLowerCase();
    const timerMs = room.timerPerQuestion * 1000;
    const clampedTime = Math.min(Math.max(responseTimeMs, 0), timerMs);
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

    return { success: true, isCorrect, points, totalScore: attempt.totalScore };
  } catch (error) {
    return { error: error.message || "Submission failed" };
  }
}

// ── Chat ──

export async function sendChatMessage({ roomCode, userId, userName, message }) {
  try {
    await dbConnect();
    const room = await QuizRoom.findOne({ roomCode });
    if (!room) return { error: "Room not found" };

    room.chatMessages.push({ userId, userName, message });
    if (room.chatMessages.length > 50) {
      room.chatMessages = room.chatMessages.slice(-50);
    }
    await room.save();
    return { success: true };
  } catch (error) {
    return { error: "Failed to send message" };
  }
}

// ── Leaderboard ──

export async function getLeaderboard(roomCode) {
  try {
    await dbConnect();
    const attempts = await RoomAttempt.find({ roomCode }).sort({ totalScore: -1 });
    
    const leaderboard = attempts.map((a, idx) => ({
      userId: a.userId,
      userName: a.userName,
      totalScore: a.totalScore,
      answeredCount: a.answers.length,
      correctCount: a.answers.filter(ans => ans.isCorrect).length,
      rank: idx + 1
    }));

    return { success: true, leaderboard };
  } catch (error) {
    console.error("Get leaderboard error:", error);
    return { error: "Failed to fetch leaderboard" };
  }
}

// ── List Active Rooms ──

export async function listActiveRooms() {
  try {
    await dbConnect();
    const rooms = await QuizRoom.find({ 
      status: { $in: ["waiting", "full", "countdown", "active"] } 
    }).sort({ createdAt: -1 }).limit(10);

    const [active, live, total, past] = await Promise.all([
      QuizRoom.countDocuments({ status: { $in: ["waiting", "full", "countdown"] } }),
      QuizRoom.countDocuments({ status: "active" }),
      QuizRoom.countDocuments(),
      QuizRoom.countDocuments({ status: "completed" }),
    ]);

    return {
      success: true,
      rooms: rooms.map(r => ({
        roomCode: r.roomCode,
        hostName: r.hostName,
        topic: r.topic,
        participantsCount: r.participants.length,
        maxParticipants: r.maxParticipants,
        status: r.status,
        difficulty: r.difficulty
      })),
      stats: { active, live, total, past }
    };
  } catch (error) {
    return { error: "Failed to list rooms" };
  }
}
// ── List User Past Team Rooms ──

export async function getUserTeamHistory(userId) {
  try {
    if (!userId) return { success: false, error: "Unauthorized" };
    await dbConnect();

    // Find user's attempts
    const myAttempts = await RoomAttempt.find({ userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const history = await Promise.all(
      myAttempts.map(async (attempt) => {
        const room = await QuizRoom.findOne({ roomCode: attempt.roomCode }).lean();
        if (!room) return null;

        // Get all attempts for this room to calculate rank
        const allAttempts = await RoomAttempt.find({ roomCode: attempt.roomCode })
          .sort({ totalScore: -1 })
          .lean();

        const rank = allAttempts.findIndex((a) => a.userId === userId) + 1;

        return {
          roomCode: attempt.roomCode,
          topic: room.topic,
          hostName: room.hostName,
          score: attempt.totalScore,
          numQuestions: room.numQuestions,
          rank,
          totalParticipants: allAttempts.length,
          createdAt: attempt.createdAt.toISOString(),
        };
      })
    );

    return {
      success: true,
      history: history.filter(h => h !== null),
    };
  } catch (error) {
    console.error("Get user team history error:", error);
    return { success: false, error: "Failed to fetch history" };
  }
}
