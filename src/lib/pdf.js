import { extractText, getDocumentProxy } from "unpdf";

export async function extractTextFromPDF(buffer) {
  try {
    // Convert Buffer to Uint8Array for unpdf
    const uint8 = new Uint8Array(buffer);

    const pdf = await getDocumentProxy(uint8);
    const { text } = await extractText(pdf, { mergePages: true });

    if (!text || !text.trim()) {
      throw new Error("No text could be extracted from this PDF.");
    }

    // Limit to ~20000 characters to avoid huge prompt payloads
    let result = text;
    if (result.length > 20000) {
      result = result.substring(0, 20000);
    }
    return result.trim();
  } catch (error) {
    console.error("Error extracting PDF:", error);
    throw new Error("Failed to parse PDF document: " + error.message);
  }
}
