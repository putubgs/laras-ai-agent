/**
 * Pull plain text from uploaded CV files for LLM keyword extraction (server-only).
 * PDFs: `pdf-parse` (v2 `PDFParse` API). DOCX: Mammoth raw text.
 * Keyword extraction uses OpenRouter separately (`extractKeywordsFromCvPlainText`).
 */

export type CvTextSource = "pdf_parse" | "mammoth";

export type CvPlainTextResult =
  | { text: string; source: CvTextSource }
  | { error: string };

export async function extractCvPlainText(
  buffer: Buffer,
  mimeType: string
): Promise<CvPlainTextResult> {
  try {
    if (mimeType === "application/pdf") {
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: buffer });
      try {
        const result = await parser.getText();
        const text = (result.text ?? "").trim();
        return { text, source: "pdf_parse" };
      } finally {
        await parser.destroy();
      }
    }

    if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      const mammoth = await import("mammoth");
      const { value } = await mammoth.extractRawText({ buffer });
      return { text: (value ?? "").trim(), source: "mammoth" };
    }

    return { error: "Unsupported document type for text extraction." };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Text extraction failed.";
    return { error: message };
  }
}
