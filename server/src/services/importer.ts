import mammoth from 'mammoth';
import { VaultDb } from '../db/vaultDb.js';

export class InvalidDocumentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidDocumentError';
  }
}

export class DecompressionBombError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DecompressionBombError';
  }
}

/**
 * Checks for decompression bombs (Zip Bombs) and validates DOCX magic bytes.
 */
export function inspectDocxBuffer(buffer: Buffer, maxUncompressedBytes = 25 * 1024 * 1024, maxEntries = 200): void {
  // 1. Verify ZIP Magic Bytes: PK\x03\x04
  if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b || buffer[2] !== 0x03 || buffer[3] !== 0x04) {
    throw new InvalidDocumentError('File signature mismatch. Expected valid OpenXML DOCX archive.');
  }

  // 2. Scan Central Directory headers (PK\x01\x02) to verify total uncompressed size
  let offset = 0;
  let entryCount = 0;
  let totalUncompressedSize = 0;

  while (offset < buffer.length - 4) {
    if (buffer.readUInt32LE(offset) === 0x02014b50) {
      entryCount++;
      if (entryCount > maxEntries) {
        throw new DecompressionBombError(`DOCX archive exceeds maximum entry limit (${maxEntries} files).`);
      }
      if (offset + 28 <= buffer.length) {
        const uncompressedSize = buffer.readUInt32LE(offset + 24);
        totalUncompressedSize += uncompressedSize;
        if (totalUncompressedSize > maxUncompressedBytes) {
          throw new DecompressionBombError(
            `Total uncompressed content (${totalUncompressedSize} bytes) exceeds safe limit of ${maxUncompressedBytes} bytes.`
          );
        }
      }
      offset += 46;
    } else {
      offset++;
    }
  }
}

/**
 * Validates text buffer for UTF-8 integrity and absence of binary/null bytes.
 */
export function inspectTextBuffer(buffer: Buffer, maxBytes = 5 * 1024 * 1024): string {
  if (buffer.length > maxBytes) {
    throw new InvalidDocumentError(`Text content exceeds maximum allowed limit of ${maxBytes} bytes.`);
  }
  if (buffer.includes(0x00)) {
    throw new InvalidDocumentError('File contains binary null bytes and is not valid plain text or markdown.');
  }
  return buffer.toString('utf-8');
}

export interface ExtractedKnowledge {
  clauses: Array<{
    id: string;
    category: 'tone' | 'terminology' | 'claims' | 'visuals' | 'accessibility';
    text: string;
  }>;
  terms: Array<{
    term: string;
    type: 'preferred' | 'banned';
    replacement?: string;
  }>;
  facts: Array<{
    label: string;
    value: string;
    valid_from?: string;
    valid_until?: string;
  }>;
  palette: string[];
}

export class KnowledgeImporter {
  /**
   * Safely extracts raw text from markdown, docx buffer, or plain text with bomb & signature inspection.
   * Catches parsing anomalies and guarantees that bad files never crash the process.
   */
  async extractText(input: Buffer | string, fileType: 'docx' | 'pdf' | 'md' | 'txt'): Promise<string> {
    try {
      if (fileType === 'docx') {
        const buffer = typeof input === 'string' ? Buffer.from(input) : input;
        inspectDocxBuffer(buffer);
        const result = await mammoth.extractRawText({ buffer });
        if (!result.value || !result.value.trim()) {
          throw new InvalidDocumentError('DOCX file is empty or contains no readable text.');
        }
        return result.value;
      }

      if (typeof input === 'string') {
        return input;
      }

      return inspectTextBuffer(input);
    } catch (err: any) {
      if (err instanceof InvalidDocumentError || err instanceof DecompressionBombError) {
        throw err;
      }
      throw new InvalidDocumentError(`Failed to parse ${fileType} document safely: ${err.message || 'corrupted document'}`);
    }
  }

  /**
   * Parses structured guideline document into numbered clauses, terms, facts, and color tokens.
   */
  parseContent(rawText: string): ExtractedKnowledge {
    const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const clauses: ExtractedKnowledge['clauses'] = [];
    const terms: ExtractedKnowledge['terms'] = [];
    const facts: ExtractedKnowledge['facts'] = [];
    const palette: string[] = [];

    // Detect hex colors in document
    const hexRegex = /#(?:[0-9a-fA-F]{3}){1,2}\b/g;
    const foundColors = rawText.match(hexRegex);
    if (foundColors) {
      for (const col of foundColors) {
        if (!palette.includes(col.toUpperCase())) {
          palette.push(col.toUpperCase());
        }
      }
    }

    let currentCategory: ExtractedKnowledge['clauses'][0]['category'] = 'tone';
    let clauseCounter = 1;

    for (const line of lines) {
      const lower = line.toLowerCase();

      // Check category headers
      if (lower.includes('tone') || lower.includes('voice')) {
        currentCategory = 'tone';
      } else if (lower.includes('terminology') || lower.includes('word choice') || lower.includes('banned terms')) {
        currentCategory = 'terminology';
      } else if (lower.includes('claim') || lower.includes('pricing') || lower.includes('guarantee')) {
        currentCategory = 'claims';
      } else if (lower.includes('visual') || lower.includes('color') || lower.includes('logo') || lower.includes('imagery')) {
        currentCategory = 'visuals';
      } else if (lower.includes('accessib') || lower.includes('contrast') || lower.includes('alt text')) {
        currentCategory = 'accessibility';
      }

      // Check for Banned / Preferred Term entries
      if (lower.startsWith('banned:') || lower.startsWith('banned term:')) {
        const parts = line.split(/:\s*/);
        if (parts.length > 1) {
          const [termPart, replPart] = parts[1].split(/->|replace with/i);
          terms.push({
            term: termPart.trim(),
            type: 'banned',
            replacement: replPart ? replPart.trim() : undefined
          });
        }
        continue;
      }

      if (lower.startsWith('preferred:') || lower.startsWith('preferred term:')) {
        const parts = line.split(/:\s*/);
        if (parts.length > 1) {
          terms.push({
            term: parts[1].trim(),
            type: 'preferred'
          });
        }
        continue;
      }

      // Check for Fact entries (e.g., Fact: Basic Checkup Price = ₹499)
      if (lower.startsWith('fact:')) {
        const rawFact = line.substring(5).trim();
        const splitIdx = rawFact.indexOf('=');
        if (splitIdx !== -1) {
          const label = rawFact.substring(0, splitIdx).trim();
          const value = rawFact.substring(splitIdx + 1).trim();
          facts.push({ label, value });
        }
        continue;
      }

      // Detect numbered clauses or guideline statements
      const numberedMatch = line.match(/^(?:Clause\s+)?(?:(C-\d+(?:\.\d+)?|\d+(?:\.\d+)?))[.:\s-]\s*(.+)$/i);
      if (numberedMatch) {
        const rawId = numberedMatch[1].toUpperCase().startsWith('C-') ? numberedMatch[1].toUpperCase() : `C-${numberedMatch[1]}`;
        const text = numberedMatch[2].trim();
        clauses.push({
          id: rawId,
          category: currentCategory,
          text
        });
      } else if (line.length > 30 && !line.startsWith('#') && !line.startsWith('---')) {
        // Unnumbered significant guideline sentence
        const autoId = `C-AUTO-${clauseCounter++}`;
        clauses.push({
          id: autoId,
          category: currentCategory,
          text: line
        });
      }
    }

    return { clauses, terms, facts, palette };
  }

  /**
   * Imports parsed knowledge directly into a client's vault.
   */
  async importIntoVault(
    clientId: string,
    rawText: string,
    vault: VaultDb
  ): Promise<{ clausesCount: number; termsCount: number; factsCount: number; paletteCount: number }> {
    const extracted = this.parseContent(rawText);

    // Insert clauses
    for (const c of extracted.clauses) {
      vault.insertClause(clientId, {
        id: c.id,
        category: c.category,
        text: c.text,
        version: 1
      });
    }

    // Insert terms
    let termIdx = 1;
    for (const t of extracted.terms) {
      vault.insertTerm(clientId, {
        id: `T-IMP-${Date.now()}-${termIdx++}`,
        term: t.term,
        type: t.type,
        replacement: t.replacement
      });
    }

    // Insert facts
    let factIdx = 1;
    for (const f of extracted.facts) {
      vault.insertFact(clientId, {
        id: `F-IMP-${Date.now()}-${factIdx++}`,
        label: f.label,
        value: f.value,
        valid_from: f.valid_from,
        valid_until: f.valid_until
      });
    }

    return {
      clausesCount: extracted.clauses.length,
      termsCount: extracted.terms.length,
      factsCount: extracted.facts.length,
      paletteCount: extracted.palette.length
    };
  }
}
