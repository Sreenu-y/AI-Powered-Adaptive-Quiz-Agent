import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKeys = (process.env.GEMINI_API_KEYS || "")
  .split(",")
  .map((k) => k.trim())
  .filter(Boolean);

if (apiKeys.length === 0) {
  console.warn("No GEMINI_API_KEYS found in environment variables");
}

let currentKeyIndex = 0;

function getNextClient() {
  if (apiKeys.length === 0) {
    throw new Error("No Gemini API keys configured");
  }
  const key = apiKeys[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
  return new GoogleGenerativeAI(key);
}

export async function generateWithFallback(prompt, retries = apiKeys.length, images = []) {
  let lastError;

  // 1. Try Qwen first, IF no images are present (Qwen 72B Instruct is text-only)
  const qwenKey = process.env.QWEN_API_KEY;
  if (qwenKey && images.length === 0) {
    console.log("[AI-FALLBACK] Attempting Qwen first...");
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${qwenKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
          "X-Title": "AI Tutor"
        },
        body: JSON.stringify({
          model: "qwen/qwen-2.5-72b-instruct",
          messages: [
            { role: "user", content: prompt }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`OpenRouter Qwen API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      if (data.choices && data.choices[0] && data.choices[0].message) {
        console.log("[AI-FALLBACK] Successfully generated with Qwen");
        return data.choices[0].message.content;
      }
    } catch (error) {
      lastError = error;
      console.warn("[AI-FALLBACK] Qwen API failed. Falling back to Gemini:", error.message);
    }
  }

  // 2. Fallback to Gemini
  console.log("[AI-FALLBACK] Attempting Gemini fallback...");
  const modelsToTry = [
    "gemini-2.0-flash", 
    "gemini-2.5-flash", 
    "gemini-flash-latest", 
    "gemini-2.0-flash-lite"
  ];

  for (let i = 0; i < Math.max(retries, 1); i++) {
    const genAI = getNextClient();
    
    for (const modelName of modelsToTry) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        
        let contentToGenerate = prompt;
        if (images && images.length > 0) {
          contentToGenerate = [
            prompt,
            ...images.map(img => ({
              inlineData: {
                data: img.base64,
                mimeType: img.mimeType
              }
            }))
          ];
        }

        const result = await model.generateContent(contentToGenerate);
        return result.response.text();
      } catch (error) {
        lastError = error;
        console.warn(
          `Model ${modelName} on key ${
            currentKeyIndex === 0 ? apiKeys.length : currentKeyIndex
          } failed:`,
          error.message
        );
        // If it's a rate limit or quota error, log it and try the next model
        if (error.message.includes("429") || error.message.includes("quota")) {
          continue;
        } else {
          // Break inner loop and try next key for non-quota errors
          break;
        }
      }
    }
  }

  throw new Error(
    `All available AI models (Qwen + Gemini fallback) failed. Last error: ${lastError?.message}`
  );
}
