import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import dbConnect from "@/lib/db";
import SavedNote from "@/models/SavedNote";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const notes = await SavedNote.find({ userId })
      .sort({ createdAt: -1 })
      .select("topic subtopic createdAt")
      .lean();

    return NextResponse.json({ notes });
  } catch (error) {
    console.error("Fetch saved notes error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch notes" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { topic, subtopic, content } = await req.json();

    if (!topic || !content) {
      return NextResponse.json(
        { error: "Topic and content are required" },
        { status: 400 }
      );
    }

    await dbConnect();
    const note = await SavedNote.create({
      userId,
      topic,
      subtopic: subtopic || "",
      content,
    });

    return NextResponse.json({ note, message: "Note saved successfully" });
  } catch (error) {
    console.error("Save note error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save note" },
      { status: 500 }
    );
  }
}
