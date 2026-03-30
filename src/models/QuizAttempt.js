import mongoose from "mongoose";

const QuestionSchema = new mongoose.Schema({
  id: Number,
  question: String,
  type: { type: String },
  options: [String],
  correctAnswer: String,
  correctAnswers: { type: [String], default: [] },
  difficulty: String,
  topic: String,
  explanation: String,
});

const AnswerSchema = new mongoose.Schema({
  question: String,
  questionType: {
    type: String,
    enum: ["mcq", "true-false", "fill-blank"],
    default: "mcq",
  },
  userAnswer: String,
  correctAnswer: String,
  isCorrect: Boolean,
  difficulty: {
    type: String,
    enum: ["easy", "medium", "hard"],
  },
  explanation: String,
});

const QuizAttemptSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    topic: {
      type: String,
      required: true,
    },
    subtopic: {
      type: String,
      default: "",
    },
    topicLevel: {
      type: String,
      enum: ["Beginner", "Intermediate", "Advanced", ""],
      default: "",
    },
    inputType: {
      type: String,
      enum: ["topic", "document", "url"],
      default: "topic",
    },
    questions: {
      type: [QuestionSchema],
      default: [],
    },
    selectedQuestions: {
      type: [QuestionSchema],
      default: [],
    },
    score: {
      type: Number,
      default: 0,
    },
    totalQuestions: {
      type: Number,
      default: 0,
    },
    numQuestions: {
      type: Number,
      default: 10,
    },
    accuracy: {
      type: Number,
      default: 0,
    },
    answers: [AnswerSchema],
    difficultyProgression: {
      type: [String],
      default: [],
    },
    weakTopics: {
      type: [String],
      default: [],
    },
    tips: {
      type: [String],
      default: [],
    },
    resources: {
      type: [
        {
          title: String,
          description: String,
          url: String,
        },
      ],
      default: [],
    },
  },
  { timestamps: true },
);

const QuizAttempt =
  mongoose.models.QuizAttempt ||
  mongoose.model("QuizAttempt", QuizAttemptSchema);

export default QuizAttempt;
