import { YoutubeTranscript } from "youtube-transcript";

export async function extractTextFromYouTube(url) {
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(url);
    if (!transcript || transcript.length === 0) {
      throw new Error("No transcript found for this video.");
    }

    let text = transcript.map((t) => t.text).join(" ");
    
    // Limit to ~20000 characters
    if (text.length > 20000) {
      text = text.substring(0, 20000);
    }
    return text.trim();
  } catch (error) {
    console.error("Error extracting YouTube transcript:", error);
    throw new Error("Failed to fetch transcript. Video might not have closed captions enabled.");
  }
}
