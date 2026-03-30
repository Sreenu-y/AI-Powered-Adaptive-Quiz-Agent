import { NextResponse } from "next/server";
import { generateWithFallback } from "@/lib/gemini";

export async function POST(req) {
  try {
    const { topic, subtopic } = await req.json();

    if (!topic) {
      return NextResponse.json(
        { error: "Topic is required" },
        { status: 400 }
      );
    }

    const subtopicClause = subtopic
      ? ` with a specific focus on the subtopic: "${subtopic}"`
      : "";

    const prompt = `Generate comprehensive, structured learning content about "${topic}"${subtopicClause}.

Return ONLY a valid JSON object (no markdown, no code fences) with exactly these fields:
{
  "title": "A clear, descriptive title for this learning material",
  "introduction": "A 2-3 paragraph introduction explaining the topic, its importance, and what the learner will gain",
  "keyConcepts": ["concept 1 with brief description", "concept 2 with brief description", ...at least 5-8 key concepts],
  "detailedExplanation": "A thorough 4-6 paragraph explanation covering the core ideas, theories, mechanisms, and how they relate to each other. Use clear language suitable for learners.",
  "examples": ["Real-world example 1 with explanation", "Example 2 with explanation", ...at least 3-5 practical examples],
  "summary": "A concise 2-3 paragraph summary of the most important takeaways",
  "resources": [
    {"title": "Resource title", "url": "https://actual-url-to-resource", "source": "Platform name"},
    ...at least 4-6 resources
  ]
}

For the "resources" field, provide real, working URLs to free learning resources about this topic from reputable platforms such as GeeksforGeeks (geeksforgeeks.org), W3Schools (w3schools.com), MDN Web Docs (developer.mozilla.org), TutorialsPoint (tutorialspoint.com), JavaTPoint (javatpoint.com), freeCodeCamp (freecodecamp.org), Khan Academy (khanacademy.org), or official documentation. Each resource must have an accurate title, a real URL, and the source platform name.

Make the content educational, well-structured, and suitable for self-study. Use clear explanations and practical examples.`;

    const rawOutput = await generateWithFallback(prompt);

    let content;
    try {
      const jsonMatch = rawOutput.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        content = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON object found in response");
      }
    } catch (parseErr) {
      console.error("Failed to parse learning content:", parseErr);
      content = {
        title: topic + (subtopic ? ` - ${subtopic}` : ""),
        introduction: rawOutput.substring(0, 500),
        keyConcepts: ["Content generation produced unstructured output. Please try again."],
        detailedExplanation: rawOutput,
        examples: [],
        summary: "Please regenerate for structured content.",
      };
    }

    return NextResponse.json({ content });
  } catch (error) {
    console.error("Generate learning error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate content" },
      { status: 500 }
    );
  }
}
