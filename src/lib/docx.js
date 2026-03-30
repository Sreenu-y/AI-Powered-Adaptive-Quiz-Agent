import mammoth from "mammoth";

export async function extractTextFromDOCX(buffer) {
  try {
    const result = await mammoth.extractRawText({ buffer });
    let text = result.value;
    if (!text || !text.trim()) {
      throw new Error("No text could be extracted from this Word document.");
    }
    // Limit to ~20000 characters
    if (text.length > 20000) {
      text = text.substring(0, 20000);
    }
    return text.trim();
  } catch (error) {
    console.error("Error extracting DOCX:", error);
    throw new Error("Failed to parse Word document.");
  }
}
