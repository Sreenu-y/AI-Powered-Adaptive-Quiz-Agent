import mongoose from "mongoose";

const AnswerEntrySchema = new mongoose.Schema({
  questionIndex: { type: Number, required: true },
  answer: { type: String, default: "" },
  isCorrect: { type: Boolean, default: false },
  responseTimeMs: { type: Number, default: 0 },
  points: { type: Number, default: 0 },
});

const RoomAttemptSchema = new mongoose.Schema(
  {
    roomCode: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    userName: {
      type: String,
      default: "Anonymous",
    },
    totalScore: {
      type: Number,
      default: 0,
    },
    answers: {
      type: [AnswerEntrySchema],
      default: [],
    },
  },
  { timestamps: true }
);

// Compound index for quick lookups
RoomAttemptSchema.index({ roomCode: 1, userId: 1 }, { unique: true });

const RoomAttempt =
  mongoose.models.RoomAttempt ||
  mongoose.model("RoomAttempt", RoomAttemptSchema);

export default RoomAttempt;
