export interface MaskResult {
  maskedText: string;
  restoreMap: Record<string, string>;
  tokensMaskedCount: number;
}

export class PrivacyMasker {
  /**
   * Masks sensitive PII (emails, phone numbers, confidential prices, and client-specified terms)
   * before sending prompts to any external LLM provider.
   */
  mask(text: string, confidentialList?: string[]): MaskResult {
    let masked = text;
    const restoreMap: Record<string, string> = {};
    let counter = 1;

    // 1. Mask Email addresses
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    masked = masked.replace(emailRegex, match => {
      const token = `[EMAIL_MASKED_${counter++}]`;
      restoreMap[token] = match;
      return token;
    });

    // 2. Mask Phone numbers (10-digit Indian mobile formats)
    const phoneRegex = /\b(?:\+91[-\s]?)?[6-9]\d{4}[-\s]?\d{5}\b/g;
    masked = masked.replace(phoneRegex, match => {
      const token = `[PHONE_MASKED_${counter++}]`;
      restoreMap[token] = match;
      return token;
    });

    // 3. Mask User-defined confidential keywords
    if (confidentialList && confidentialList.length > 0) {
      for (const term of confidentialList) {
        if (!term.trim()) continue;
        const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const termRegex = new RegExp(`\\b${escaped}\\b`, 'gi');
        masked = masked.replace(termRegex, match => {
          const token = `[CONFIDENTIAL_MASKED_${counter++}]`;
          restoreMap[token] = match;
          return token;
        });
      }
    }

    return {
      maskedText: masked,
      restoreMap,
      tokensMaskedCount: Object.keys(restoreMap).length
    };
  }

  /**
   * Restores masked tokens back to their original values after LLM response is received.
   */
  unmask(text: string, restoreMap: Record<string, string>): string {
    let unmasked = text;
    for (const [token, original] of Object.entries(restoreMap)) {
      unmasked = unmasked.split(token).join(original);
    }
    return unmasked;
  }
}
