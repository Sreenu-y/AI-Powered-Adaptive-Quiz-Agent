export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import QuizAttempt from "@/models/QuizAttempt";
import { getTopicLevel } from "@/lib/topic";
import { generateMultiModelQuiz, generateContentTitle } from "@/lib/ai";
import { extractTextFromPDF } from "@/lib/pdf";
import { extractTextFromDOCX } from "@/lib/docx";
import { extractTextFromYouTube } from "@/lib/youtube";
import { extractTextFromURL } from "@/lib/web";
import { generateWithFallback } from "@/lib/gemini";

function getDifficultyForQuiz(previousLevel) {
  switch (previousLevel) {
    case "Beginner": return "medium";
    case "Intermediate": return "hard";
    case "Advanced": return "hard";
    default: return "medium";
  }
}

export async function POST(req) {
  try {
    const formData = await req.formData();
    const inputType = formData.get("inputType"); // 'topic', 'document', 'url'
    const subtopic = formData.get("subtopic") || "";
    let difficulty = formData.get("difficulty") || "";
    const numQuestions = parseInt(formData.get("numQuestions") || "10");
    const userId = formData.get("userId") || "";
    const quizType = formData.get("quizType") || "mixed";

    let sourceContext = "";
    let attemptTopic = "General";
    let extractedText = ""; // raw text for title generation
    
    // 1. EXTRACTION STEP
    if (inputType === "topic") {
      const topic = formData.get("topic");
      if (!topic) return NextResponse.json({ error: "Topic is required" }, { status: 400 });

      // --- AI Topic Validation ---
      try {
        const validationInput = subtopic 
          ? `Topic: "${topic}", Subtopic: "${subtopic}"` 
          : `Topic: "${topic}"`;

        const validationPrompt = `Determine if the following input is a meaningful topic that can be used to generate a quiz.
A valid topic should represent a real subject, concept, or idea.
CRITICAL RULE: If a subtopic is provided, BOTH the topic and the subtopic MUST be meaningful. If the subtopic is random keyboard smashing or gibberish, you MUST return NO.

Return ONLY YES or NO.

Examples:
Valid: Topic: "Operating Systems", Subtopic: "Deadlocks"
Valid: Topic: "React Hooks"
Invalid: Topic: "hello", Subtopic: "abc"
Invalid: Topic: "India", Subtopic: "ouuhfuf"
Invalid: Topic: "Cars", Subtopic: "abudhiwdu"

Input: ${validationInput}`;
        const validationResult = await generateWithFallback(validationPrompt);
        const isValid = validationResult.trim().toUpperCase().startsWith("YES");
        if (!isValid) {
          const errMsg = subtopic 
            ? "Please enter a valid and meaningful subtopic" 
            : "Please enter a meaningful topic (e.g., React, Climate Change, Data Structures)";
          return NextResponse.json(
            { error: errMsg },
            { status: 400 }
          );
        }
      } catch (err) {
        console.warn("Topic validation failed, proceeding anyway:", err.message);
      }
      // --- End AI Topic Validation ---

      attemptTopic = topic;
      sourceContext = subtopic 
        ? `Topic: ${topic}, specifically about: ${subtopic}` 
        : `Topic: ${topic}`;
    } 
    else if (inputType === "url") {
      const url = formData.get("url");
      if (!url) return NextResponse.json({ error: "URL is required" }, { status: 400 });
      
      try {
        const isYouTube = url.includes("youtube.com") || url.includes("youtu.be");
        if (isYouTube) {
          extractedText = await extractTextFromYouTube(url);
          sourceContext = `Video Transcript Context:\n${extractedText}`;
        } else {
          extractedText = await extractTextFromURL(url);
          if (!extractedText || extractedText.length < 50) {
            throw new Error("No meaningful content extracted from the URL. Ensure the site is accessible.");
          }
          sourceContext = `Webpage Context:\n${extractedText}`;
        }
        attemptTopic = url; // Temporary — will be replaced by AI title below
      } catch (err) {
        return NextResponse.json({ error: "Failed to extract content from the provided URL." }, { status: 400 });
      }
    } 
    else if (inputType === "document") {
      const files = formData.getAll("document");
      if (!files || files.length === 0) return NextResponse.json({ error: "Document or image is required" }, { status: 400 });

      let combinedText = "";
      const imageBuffers = [];
      let firstFileName = "Uploaded Document(s)";

      for (const file of files) {
        if (!file.name) continue;
        const buffer = Buffer.from(await file.arrayBuffer());

        try {
          if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
            const text = await extractTextFromPDF(buffer);
            combinedText += `\n--- PDF: ${file.name} ---\n${text}\n`;
          } else if (
            file.type.includes("wordprocessingml") ||
            file.name.endsWith(".docx")
          ) {
            const text = await extractTextFromDOCX(buffer);
            combinedText += `\n--- DOCX: ${file.name} ---\n${text}\n`;
          } else if (file.type.startsWith("image/") || file.name.match(/\.(png|jpe?g|webp)$/i)) {
            imageBuffers.push({
              base64: buffer.toString("base64"),
              mimeType: file.type || "image/jpeg"
            });
          } else {
            return NextResponse.json({ error: "Unsupported document format. Only PDF, DOCX, and images (PNG, JPG, WEBP) are allowed." }, { status: 400 });
          }
        } catch (err) {
          console.error("Extraction error:", err);
          return NextResponse.json({ error: `Failed to process file: ${file.name}` }, { status: 400 });
        }

        if (firstFileName === "Uploaded Document(s)") firstFileName = file.name;
      }

      extractedText = combinedText.trim();
      sourceContext = `Document/Image Context:\n${extractedText}`;
      attemptTopic = files.length > 1 ? `${files.length} files uploaded` : firstFileName;
      
      // Store images in req to pass to AI
      req.imageBuffers = imageBuffers;
    } 
    else {
      return NextResponse.json({ error: "Invalid inputType" }, { status: 400 });
    }

    // 2. DETECT USER LEVEL
    await dbConnect();
    let resolvedDifficulty = difficulty;
    let isNewTopic = true;
    let previousLevel = null;

    if (!resolvedDifficulty && userId && inputType === "topic") {
      const levelInfo = await getTopicLevel(userId, attemptTopic);
      if (!levelInfo.isNew && levelInfo.topicLevel) {
        resolvedDifficulty = getDifficultyForQuiz(levelInfo.topicLevel);
        previousLevel = levelInfo.topicLevel;
        isNewTopic = false;
      }
    }

    // 3. QUIZ GENERATION + TITLE GENERATION (in parallel for document/url)
    let questions;
    const images = req.imageBuffers || [];
    
    if (inputType === "document" || inputType === "url") {
      // Run quiz generation and title generation IN PARALLEL to save time
      const [quizResult, titleResult] = await Promise.allSettled([
        generateMultiModelQuiz(sourceContext, resolvedDifficulty, numQuestions, inputType, quizType, images),
        (extractedText || images.length > 0) ? generateContentTitle(extractedText, images) : Promise.resolve(attemptTopic),
      ]);

      questions = quizResult.status === "fulfilled" ? quizResult.value : [];
      const contentTitle = titleResult.status === "fulfilled" ? titleResult.value : null;
      
      if (contentTitle && contentTitle !== attemptTopic) {
        attemptTopic = contentTitle;
      }
    } else {
      // Topic-based: just generate quiz (no title needed)
      questions = await generateMultiModelQuiz(sourceContext, resolvedDifficulty, numQuestions, inputType, quizType, images);
    }

    if (!questions || questions.length === 0) {
      return NextResponse.json({ error: "Failed to generate valid quiz questions. Please try again." }, { status: 500 });
    }

    // 4. SAVE QUIZ ATTEMPT
    // Map difficulty to valid topicLevel enum values
    function mapToTopicLevel(diff, prevLevel) {
      if (prevLevel) return prevLevel;
      if (diff === "easy") return "Beginner";
      if (diff === "medium") return "Intermediate";
      if (diff === "hard") return "Advanced";
      return "Beginner";
    }

    let quizId = null;
    if (userId) {
      const attempt = await QuizAttempt.create({
        userId,
        topic: attemptTopic,
        subtopic,
        topicLevel: mapToTopicLevel(resolvedDifficulty, previousLevel),
        inputType,
        numQuestions,
        questions: questions,
        score: 0,
        totalQuestions: questions.length,
        accuracy: 0,
        answers: [],
        difficultyProgression: [],
      });
      quizId = attempt._id.toString();
    }

    return NextResponse.json({
      quizId,
      questions,
      topic: attemptTopic,
      subtopic,
      inputType,
      requestedCount: questions.length,
      previousTopicLevel: previousLevel,
      isNewTopic,
      selectedDifficulty: resolvedDifficulty
    });

  } catch (error) {
    console.error("Quiz generation error:", error);
    return NextResponse.json({ error: error.message || "Something went wrong" }, { status: 500 });
  }
}
