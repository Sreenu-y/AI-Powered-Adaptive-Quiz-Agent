import { NextResponse } from "next/server";
import { generateWithFallback } from "@/lib/gemini";

export async function POST(req) {
  try {
    const { message, topic, subtopic, history } = await req.json();

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const topicContext = topic
      ? `The user is currently studying "${topic}"${subtopic ? ` (subtopic: "${subtopic}")` : ""}.`
      : "";

    const chatHistory =
      history && history.length > 0
        ? history
            .slice(-8)
            .map((m) => `${m.role === "user" ? "Student" : "Tutor"}: ${m.text}`)
            .join("\n")
        : "";

    const prompt = `You are a helpful, friendly AI tutor. ${topicContext}

${chatHistory ? `Recent conversation:\n${chatHistory}\n` : ""}
Student: ${message}

Instructions:
- Give a clear, educational response
- Use bullet points (- ) for listing items
- Use numbered lists (1. 2. 3.) for step-by-step explanations
- Use **bold** for key terms and important concepts
- Break your response into short paragraphs (2-3 sentences each)
- Keep responses concise (2-4 paragraphs max)
- If the student asks something unrelated to the topic, gently redirect them
- Be encouraging and supportive

Tutor:`;

    const reply = await generateWithFallback(prompt);

    return NextResponse.json({ reply: reply.trim() });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate response" },
      { status: 500 }
    );
  }
}
