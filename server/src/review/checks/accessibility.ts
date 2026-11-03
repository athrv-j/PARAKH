import { FindingDraft } from './terminology.js';

/**
 * Calculates WCAG 2.1 relative luminance of an sRGB hex color.
 */
export function getRelativeLuminance(hex: string): number {
  let cleanHex = hex.replace('#', '').trim();
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(c => c + c).join('');
  }

  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));

  const R = toLinear(r);
  const G = toLinear(g);
  const B = toLinear(b);

  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

/**
 * Calculates contrast ratio between two hex colors.
 * Returns ratio: 1 (e.g. 4.5 means 4.5:1)
 */
export function calculateContrastRatio(hex1: string, hex2: string): number {
  const l1 = getRelativeLuminance(hex1);
  const l2 = getRelativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
}

export function checkAccessibility(
  text: string,
  options?: {
    colorPair?: [string, string]; // [foreground, background]
  }
): FindingDraft[] {
  const findings: FindingDraft[] = [];

  // 1. Long All-Caps Blocks Check (Exceeding 10 uppercase words)
  const allCapsRegex = /\b[A-Z0-9\s!,?'-]{35,}\b/g;
  let capsMatch: RegExpExecArray | null;

  while ((capsMatch = allCapsRegex.exec(text)) !== null) {
    const rawSnippet = capsMatch[0].trim();
    const wordCount = rawSnippet.split(/\s+/).filter(w => w.length > 1).length;

    if (wordCount >= 8) {
      findings.push({
        id: `f_caps_${capsMatch.index}_${Date.now()}`,
        type: 'accessibility',
        severity: 'medium',
        span_start: capsMatch.index,
        span_end: capsMatch.index + capsMatch[0].length,
        span_text: rawSnippet,
        source_type: 'rule',
        source_id: 'C-5.3',
        source_text: 'Avoid text blocks formatted in ALL-CAPITAL letters exceeding 15 words, as this severely impairs reading accessibility.',
        model_name: 'rule_engine',
        explanation: `All-caps paragraph detected (${wordCount} words). Continuous capitalization reduces readability and disrupts screen-reader speech cadence.`,
        suggested_fix: 'Convert text to standard sentence case.'
      });
    }
  }

  // 2. Missing Alt-Text Check in Markdown or HTML Snippets
  const emptyAltMarkdownRegex = /!\[\s*\]\((.*?)\)/g;
  let mdImgMatch: RegExpExecArray | null;
  while ((mdImgMatch = emptyAltMarkdownRegex.exec(text)) !== null) {
    findings.push({
      id: `f_alt_${mdImgMatch.index}_${Date.now()}`,
      type: 'accessibility',
      severity: 'high',
      span_start: mdImgMatch.index,
      span_end: mdImgMatch.index + mdImgMatch[0].length,
      span_text: mdImgMatch[0],
      source_type: 'rule',
      source_id: 'C-5.2',
      source_text: 'All imagery, infographics, and banners must be accompanied by comprehensive descriptive alt-text for screen readers.',
      model_name: 'rule_engine',
      explanation: 'Image markup is missing descriptive alt-text.',
      suggested_fix: 'Provide concise, descriptive alternative text describing the graphic content.'
    });
  }

  // 3. WCAG Contrast Ratio Check (if color pair provided)
  if (options?.colorPair) {
    const [fg, bg] = options.colorPair;
    const ratio = calculateContrastRatio(fg, bg);
    const minRequired = 4.5; // WCAG AA for normal text

    if (ratio < minRequired) {
      findings.push({
        id: `f_contrast_${Date.now()}`,
        type: 'accessibility',
        severity: 'high',
        span_start: 0,
        span_end: 0,
        span_text: `${fg} on ${bg}`,
        source_type: 'rule',
        source_id: 'C-5.1',
        source_text: 'All text elements over solid or photographic backgrounds must satisfy WCAG AA contrast ratio of at least 4.5:1 for normal text.',
        model_name: 'rule_engine',
        explanation: `Calculated contrast ratio is ${ratio}:1, which fails the WCAG AA minimum threshold of 4.5:1.`,
        suggested_fix: 'Increase color contrast between foreground text and background surface.'
      });
    }
  }

  return findings;
}
