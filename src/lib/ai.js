import { generateWithFallback } from "./gemini";

const QWEN_API_KEY = process.env.QWEN_API_KEY;

const MAX_CONTEXT_CHARS = 4000;
const MAX_RETRIES = 2;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function generateWithQwen(prompt) {
  let lastError = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = 3000; // 3s between retries
      console.log(`[QWEN] Retry ${attempt + 1}/${MAX_RETRIES} after ${delay}ms...`);
      await sleep(delay);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 min timeout

    try {
      console.log(`[QWEN] Making request (attempt ${attempt + 1})...`);
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${QWEN_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "qwen/qwen-2.5-72b-instruct",
          messages: [{ role: "user", content: prompt }],
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 429) {
        lastError = new Error("Rate limited by OpenRouter");
        console.warn("[QWEN] Rate limited (429), will retry...");
        continue;
      }

      if (response.status === 502 || response.status === 503) {
        lastError = new Error(`OpenRouter server error: ${response.status}`);
        console.warn(`[QWEN] Server error (${response.status}), will retry...`);
        continue;
      }

      if (!response.ok) {
        const errBody = await response.text().catch(() => "");
        throw new Error(`OpenRouter API error ${response.status}: ${errBody.substring(0, 200)}`);
      }

      const data = await response.json();
      console.log("[QWEN] ✅ Response received successfully");
      return data.choices[0].message.content;
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error;
      if (error.name === "AbortError") {
        console.error("[QWEN] Request timed out");
        continue;
      }
      console.error(`[QWEN] Attempt ${attempt + 1} failed:`, error.message);
    }
  }

  // NO fallback to Gemini — throw the error so the user knows Qwen failed
  console.error("[QWEN] ❌ All retries exhausted. NOT falling back to Gemini.");
  throw lastError || new Error("Qwen generation failed after all retries");
}

function parseJSON(text) {
  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return [];
  } catch (err) {
    console.error("Failed to parse AI output as JSON:", err);
    return [];
  }
}

// Truncate text to a safe size for AI context
function truncateContext(text, maxChars = MAX_CONTEXT_CHARS) {
  if (text.length <= maxChars) return text;
  return text.substring(0, maxChars) + "\n\n[Content truncated for processing...]";
}

// Generates quiz questions, routing to different models based on input source.
// - Topic-based quizzes → Gemini
// - Document/URL-based quizzes → Qwen (NO Gemini fallback)
export async function generateMultiModelQuiz(sourceContext, requestedDifficulty, totalQuestions, inputType = "topic", quizType = "mixed", images = []) {
  const trimmedContext = truncateContext(sourceContext);

  let difficultyInstruction = "";
  let allowedTags = '["easy", "medium", "hard"]';

  if (requestedDifficulty === "easy") {
    difficultyInstruction = "Generate ONLY 'easy' difficulty questions.";
    allowedTags = '["easy"]';
  } else if (requestedDifficulty === "medium") {
    difficultyInstruction = "Generate ONLY 'medium' difficulty questions.";
    allowedTags = '["medium"]';
  } else if (requestedDifficulty === "hard") {
    difficultyInstruction = "Generate ONLY 'hard' difficulty questions.";
    allowedTags = '["hard"]';
  } else {
    difficultyInstruction = "Generate a mix of 'easy', 'medium', and 'hard' difficulty questions.";
  }

  let typeInstruction = "";
  if (quizType === "mcq") {
    typeInstruction = "- ONLY generate MCQ (multiple choice) questions.\\n- For MCQ questions, provide exactly 4 options.";
  } else if (quizType === "true-false") {
    typeInstruction = "- ONLY generate true-false questions.\\n- For true-false questions, provide [\\\"True\\\", \\\"False\\\"] as options.";
  } else if (quizType === "fill-blank") {
    typeInstruction = "- ONLY generate fill-in-the-blank questions.\\n- For fill-in-the-blank questions, provide an empty options array [] AND the \\\"correctAnswer\\\" MUST be exactly ONE single word.";
  } else {
    typeInstruction = "- Mix of question types: MCQ (multiple choice), true-false, and fill-in-the-blank\\n- For MCQ questions, provide exactly 4 options\\n- For true-false questions, provide [\\\"True\\\", \\\"False\\\"] as options\\n- For fill-in-the-blank questions, provide an empty options array [] AND the \\\"correctAnswer\\\" MUST be exactly ONE single word.";
  }

  const prompt = `Generate exactly ${totalQuestions} quiz questions based on the following context:

${trimmedContext}

${difficultyInstruction}

Requirements:
${typeInstruction}
- Each question MUST have a difficulty tag from the allowed list: ${allowedTags}
- Include the correct answer for each question
- Include a brief explanation for each answer
- MANDATORY: You MUST generate EXACTLY ${totalQuestions} questions. This is a non-negotiable requirement.
- The output MUST be a single JSON array containing EXACTLY ${totalQuestions} objects.

Return ONLY a valid JSON array with no additional text or Markdown blocks outside the array. Each question object should have:
{
  "id": <unique number>,
  "question": "<question text>",
  "type": "mcq" | "true-false" | "fill-blank",
  "options": ["option1", "option2", ...] or [],
  "correctAnswer": "<correct answer>",
  "difficulty": "<difficulty>",
  "topic": "extracted sub-topic",
  "explanation": "<brief explanation>"
}`;

  // Route based on input type — strictly Qwen for document/url, Gemini for topic (and images)
  if ((inputType === "document" || inputType === "url") && images.length === 0) {
    console.log(`[ROUTER] Using QWEN for ${inputType} quiz generation`);
    const rawOutput = await generateWithQwen(prompt);
    let allQuestions = parseJSON(rawOutput);
    allQuestions = allQuestions.filter(q => q && q.question && q.options && q.correctAnswer);
    allQuestions.forEach((q, index) => { q.id = index + 1; });
    return allQuestions;
  } else {
    console.log("[ROUTER] Using Gemini for topic or multimodal quiz generation");
    const rawOutput = await generateWithFallback(prompt, 3, images);
    let allQuestions = parseJSON(rawOutput);
    allQuestions = allQuestions.filter(q => q && q.question && q.options && q.correctAnswer);
    allQuestions.forEach((q, index) => { q.id = index + 1; });
    return allQuestions;
  }
}

// Generate a short, descriptive title from extracted content (supports text and/or images)
export async function generateContentTitle(sourceText, images = []) {
  try {
    const hasImages = images && images.length > 0;
    const hasText = sourceText && sourceText.trim().length > 0;

    if (!hasImages && !hasText) return null;

    const snippet = hasText ? sourceText.substring(0, 500) : "";
    const prompt = hasImages
      ? `Based on the attached image(s) ${hasText ? "and this text snippet: " + snippet : ""}, generate a short highly descriptive title (max 6 words) for a quiz. Return ONLY the title text, no quotes or additional text.`
      : `Based on the following content, generate a short descriptive title (max 6 words). Return ONLY the title text, nothing else.\n\nContent:\n${snippet}`;

    if (hasImages) {
      console.log("[ROUTER] Using Gemini (multimodal) for title generation");
      const result = await generateWithFallback(prompt, 2, images);
      const title = result.replace(/["""]/g, "").replace(/\n/g, " ").trim();
      return title.substring(0, 60);
    } else {
      console.log("[ROUTER] Using QWEN for title generation");
      const result = await generateWithQwen(prompt);
      const title = result.replace(/["""]/g, "").replace(/\n/g, " ").trim();
      return title.substring(0, 60);
    }
  } catch (error) {
    console.error("Failed to generate title:", error);
    return null;
  }
}
