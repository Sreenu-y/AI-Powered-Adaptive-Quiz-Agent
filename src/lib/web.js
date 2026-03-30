/**
 * Extension for general website URL extraction.
 * Optimized for educational and article-like content (e.g., GeeksforGeeks, MDN, medium).
 */

export async function extractTextFromURL(url) {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL content: ${response.statusText}`);
    }

    const html = await response.text();

    // 1. Remove non-content blocks
    let cleanedHtml = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
      .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, " ")
      .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, " ")
      .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, " ")
      .replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, " ");

    // 2. Try to target "main content" markers if they exist
    // Many sites use <article>, <main>, or specific class names.
    // However, without a DOM parser, we'll use a heuristic to find the largest text blocks.
    
    // 3. Extract text from paragraphs and headings specifically (better than just stripping all tags)
    const matches = cleanedHtml.match(/<(p|h1|h2|h3|h4|h5|li|td)[^>]*>([\s\S]*?)<\/\1>/gi);
    
    let extractedText = "";
    if (matches) {
      extractedText = matches
        .map(tag => {
          // Strip nested tags from within the tag
          return tag.replace(/<[^>]+>/g, " ").trim();
        })
        .filter(text => text.length > 20) // Ignore very short snippets
        .join("\n\n");
    }

    // Fallback if no matching tags were found or content is too short
    if (extractedText.length < 200) {
      extractedText = cleanedHtml
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    }

    // Final cleanup: Limit length to 30000 characters for AI context safety
    if (extractedText.length > 30000) {
      extractedText = extractedText.substring(0, 30000);
    }

    return extractedText.trim();
  } catch (error) {
    console.error("Error in extractTextFromURL:", error);
    throw new Error(`Extraction failed: ${error.message}`);
  }
}
