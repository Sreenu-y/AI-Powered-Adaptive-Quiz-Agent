import mongoose from "mongoose";

const ParticipantSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  name: { type: String, default: "Anonymous" },
  joinedAt: { type: Date, default: Date.now },
});

const QuestionSchema = new mongoose.Schema({
  id: Number,
  question: String,
  type: { type: String },
  options: [String],
  correctAnswer: String,
  difficulty: String,
  topic: String,
  explanation: String,
});

const QuizRoomSchema = new mongoose.Schema(
  {
    roomCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    hostUserId: {
      type: String,
      required: true,
    },
    hostName: {
      type: String,
      default: "Host",
    },
    topic: {
      type: String,
      required: true,
    },
    difficulty: {
      type: String,
      default: "mixed",
    },
    subtopic: {
      type: String,
      default: "",
    },
    questions: {
      type: [QuestionSchema],
      default: [],
    },
    numQuestions: {
      type: Number,
      default: 5,
    },
    timerPerQuestion: {
      type: Number,
      default: 20,
    },
    maxParticipants: {
      type: Number,
      default: 5,
    },
    status: {
      type: String,
      enum: ["waiting", "full", "countdown", "active", "completed"],
      default: "waiting",
    },
    currentQuestionIndex: {
      type: Number,
      default: -1,
    },
    questionStartedAt: {
      type: Date,
      default: null,
    },
    participants: {
      type: [ParticipantSchema],
      default: [],
    },
    chatMessages: [
      {
        userId: String,
        userName: String,
        message: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

const QuizRoom =
  mongoose.models.QuizRoom || mongoose.model("QuizRoom", QuizRoomSchema);

export default QuizRoom;
