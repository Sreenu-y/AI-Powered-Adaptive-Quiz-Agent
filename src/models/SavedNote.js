import mongoose from "mongoose";

const SavedNoteSchema = new mongoose.Schema(
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
    content: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  { timestamps: true }
);

const SavedNote =
  mongoose.models.SavedNote || mongoose.model("SavedNote", SavedNoteSchema);

export default SavedNote;
