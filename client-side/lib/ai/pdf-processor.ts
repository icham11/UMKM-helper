/**
 * PDF Processor — Extract text from PDF files and split into semantic chunks
 *
 * Flow:
 * 1. PDF Buffer → pdf-parse → Raw text
 * 2. Raw text → Clean & normalize
 * 3. Cleaned text → Recursive chunk splitting (max ~800 tokens per chunk)
 * 4. Each chunk gets metadata (page range, position, filename)
 */


// ==================== TYPES ====================

export interface PDFChunk {
  content: string;
  chunkIndex: number;
  metadata: {
    filename: string;
    totalPages: number;
    totalChunks: number;
    chunkPosition: string; // e.g., "1/12"
  };
}

export interface PDFExtractionResult {
  text: string;
  totalPages: number;
  chunks: PDFChunk[];
  filename: string;
}

// ==================== TEXT EXTRACTION ====================

/**
 * Extract text from a PDF buffer using pdf-parse
 */
export async function extractPDFText(
  buffer: Buffer,
  filename: string
): Promise<{ text: string; totalPages: number }> {
  try {
    // Import the internal lib directly to bypass index.js which tries to load
    // a test PDF file (./test/data/05-versions-space.pdf) in debug mode
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse/lib/pdf-parse.js");
    const data = await pdfParse(buffer);
    return {
      text: data.text || "",
      totalPages: data.numpages || 1,
    };
  } catch (error) {
    throw new Error(
      `Gagal membaca PDF "${filename}": ${error instanceof Error ? error.message : "Format tidak didukung"}`
    );
  }
}

// ==================== TEXT CLEANING ====================

/**
 * Clean and normalize extracted PDF text
 */
function cleanText(raw: string): string {
  return (
    raw
      // Normalize whitespace
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      // Remove excessive blank lines (keep max 2)
      .replace(/\n{4,}/g, "\n\n\n")
      // Remove page numbers like "Page 1 of 10", "Halaman 1", "- 1 -"
      .replace(/^(Page|Halaman|Hal\.?)\s*\d+\s*(of|dari)?\s*\d*\s*$/gim, "")
      .replace(/^-\s*\d+\s*-\s*$/gm, "")
      // Remove excessive spaces on a single line
      .replace(/[ \t]{3,}/g, "  ")
      // Trim each line
      .split("\n")
      .map((line) => line.trimEnd())
      .join("\n")
      .trim()
  );
}

// ==================== CHUNKING ====================

/**
 * Split text into semantic chunks using a recursive strategy.
 *
 * Priority order of split boundaries:
 * 1. Double newline (paragraph break)
 * 2. Single newline (line break)
 * 3. Sentence boundary (. ! ?)
 * 4. Hard split at max length
 *
 * Target: ~800 tokens per chunk (~3200 chars), overlap 200 chars
 */
const CHUNK_MAX_CHARS = 3000;
const CHUNK_OVERLAP_CHARS = 200;
const CHUNK_MIN_CHARS = 100; // Skip tiny chunks

function splitIntoChunks(text: string): string[] {
  if (text.length <= CHUNK_MAX_CHARS) {
    return text.length >= CHUNK_MIN_CHARS ? [text] : [];
  }

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= CHUNK_MAX_CHARS) {
      if (remaining.trim().length >= CHUNK_MIN_CHARS) {
        chunks.push(remaining.trim());
      }
      break;
    }

    // Find the best split point within the max window
    const window = remaining.slice(0, CHUNK_MAX_CHARS);
    let splitAt = -1;

    // 1. Try paragraph break
    const paraBreak = window.lastIndexOf("\n\n");
    if (paraBreak > CHUNK_MAX_CHARS * 0.3) {
      splitAt = paraBreak;
    }

    // 2. Try line break
    if (splitAt === -1) {
      const lineBreak = window.lastIndexOf("\n");
      if (lineBreak > CHUNK_MAX_CHARS * 0.3) {
        splitAt = lineBreak;
      }
    }

    // 3. Try sentence boundary
    if (splitAt === -1) {
      const sentenceEnd = Math.max(
        window.lastIndexOf(". "),
        window.lastIndexOf("! "),
        window.lastIndexOf("? ")
      );
      if (sentenceEnd > CHUNK_MAX_CHARS * 0.3) {
        splitAt = sentenceEnd + 1; // include the period
      }
    }

    // 4. Hard split
    if (splitAt === -1) {
      splitAt = CHUNK_MAX_CHARS;
    }

    const chunk = remaining.slice(0, splitAt).trim();
    if (chunk.length >= CHUNK_MIN_CHARS) {
      chunks.push(chunk);
    }

    // Move forward with overlap
    const advance = Math.max(splitAt - CHUNK_OVERLAP_CHARS, 1);
    remaining = remaining.slice(advance);
  }

  return chunks;
}

// ==================== MAIN PIPELINE ====================

/**
 * Full pipeline: PDF buffer → extracted text → cleaned → chunked
 */
export async function processPDF(
  buffer: Buffer,
  filename: string
): Promise<PDFExtractionResult> {
  // 1. Extract raw text
  const { text: rawText, totalPages } = await extractPDFText(buffer, filename);

  if (!rawText || rawText.trim().length < 20) {
    throw new Error(
      `PDF "${filename}" tidak mengandung teks yang bisa dibaca. Pastikan PDF bukan berupa scan/gambar.`
    );
  }

  // 2. Clean text
  const cleanedText = cleanText(rawText);

  // 3. Chunk
  const textChunks = splitIntoChunks(cleanedText);

  if (textChunks.length === 0) {
    throw new Error(
      `PDF "${filename}" menghasilkan teks terlalu pendek setelah diproses.`
    );
  }

  // 4. Build chunk objects with metadata
  const chunks: PDFChunk[] = textChunks.map((content, i) => ({
    content: `[Dokumen: ${filename}]\n${content}`,
    chunkIndex: i,
    metadata: {
      filename,
      totalPages,
      totalChunks: textChunks.length,
      chunkPosition: `${i + 1}/${textChunks.length}`,
    },
  }));

  return {
    text: cleanedText,
    totalPages,
    chunks,
    filename,
  };
}

