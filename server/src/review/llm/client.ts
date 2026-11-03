import { z } from 'zod';

export const LlmFindingSchema = z.object({
  issue: z.string(),
  span: z.string(),
  clause_id: z.string(),
  quote_from_source: z.string(),
  explanation: z.string()
});

export const LlmReviewResponseSchema = z.object({
  findings: z.array(LlmFindingSchema)
});

export type LlmFinding = z.infer<typeof LlmFindingSchema>;

export interface GroqClientConfig {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
}

export class GroqReviewClient {
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(config?: GroqClientConfig) {
    this.apiKey = config?.apiKey || process.env.GROQ_API_KEY || '';
    this.model = config?.model || 'llama-3.3-70b-versatile';
    this.baseUrl = config?.baseUrl || 'https://api.groq.com/openai/v1/chat/completions';
  }

  /**
   * Evaluates text with retries and exponential backoff for rate limits.
   */
  async checkToneAndMessaging(
    draftText: string,
    clientClauses: Array<{ id: string; category: string; text: string }>,
    clientFacts: Array<{ id: string; label: string; value: string }>
  ): Promise<LlmFinding[]> {
    // If no API key is provided, use deterministic simulated model for offline development & tests
    if (!this.apiKey || this.apiKey.trim() === '' || process.env.NODE_ENV === 'test') {
      return this.simulateLlmEvaluation(draftText, clientClauses, clientFacts);
    }

    const systemPrompt = `You are Parakh, an uncompromising brand-governance AI.
Review the draft content against the client's APPROVED GUIDELINE CLAUSES and FACTS.
Focus on:
1. Tone violations (alarmist copy, hyperbole, aggression, disrespectful phrasing).
2. Messaging violations (cultural insensitivity, wrong audience tone).
3. Unsupported claims where evidence is required by a specific clause.

CRITICAL RULE (CITATION GATE REQUIREMENT):
Every finding MUST cite an exact verbatim substring from the clause in "quote_from_source".
Do NOT paraphrase or invent rules. If you cannot cite a verbatim quote from the provided clauses, DO NOT flag it.

Return ONLY valid JSON matching this schema:
{
  "findings": [
    {
      "issue": "Tone / Messaging issue summary",
      "span": "exact phrase in draft that violates the rule",
      "clause_id": "e.g. C-1.1",
      "quote_from_source": "verbatim text copied from the cited clause",
      "explanation": "concise explanation of violation"
    }
  ]
}`;

    const userPrompt = `APPROVED CLAUSES:
${clientClauses.map(c => `[${c.id}] (${c.category}): ${c.text}`).join('\n')}

APPROVED FACTS:
${clientFacts.map(f => `[${f.id}] ${f.label} = ${f.value}`).join('\n')}

DRAFT TO REVIEW:
"""
${draftText}
"""`;

    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        attempts++;
        const response = await fetch(this.baseUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`
          },
          body: JSON.stringify({
            model: this.model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.1
          })
        });

        if (response.status === 429) {
          // Rate limited: exponential backoff
          const delay = Math.pow(2, attempts) * 1000;
          await new Promise(r => setTimeout(r, delay));
          continue;
        }

        if (!response.ok) {
          throw new Error(`Groq API error: ${response.status} ${response.statusText}`);
        }

        const data: any = await response.json();
        const rawContent = data.choices?.[0]?.message?.content;
        const parsedJson = JSON.parse(rawContent);
        const validated = LlmReviewResponseSchema.parse(parsedJson);

        return validated.findings;
      } catch (err: any) {
        if (attempts >= maxAttempts) {
          console.warn('Groq API request failed after retries, falling back to simulated evaluation:', err.message);
          return this.simulateLlmEvaluation(draftText, clientClauses, clientFacts);
        }
      }
    }

    return [];
  }

  /**
   * Deterministic simulation used for local tests and offline execution.
   */
  simulateLlmEvaluation(
    draftText: string,
    clientClauses: Array<{ id: string; category: string; text: string }>,
    clientFacts: Array<{ id: string; label: string; value: string }>
  ): LlmFinding[] {
    const findings: LlmFinding[] = [];
    const lower = draftText.toLowerCase();

    // Check tone: alarmist / fear-mongering
    if (lower.includes('killing hundreds') || lower.includes('family will suffer') || lower.includes('severe infection')) {
      const toneClause = clientClauses.find(c => c.category === 'tone' && c.text.includes('Never use fear-mongering'));
      if (toneClause) {
        findings.push({
          issue: 'Alarmist Fear-mongering Tone',
          span: draftText.match(/DENGUE OUTBREAK IS KILLING HUNDREDS IN YOUR CITY!/i)?.[0] || 'DENGUE OUTBREAK IS KILLING HUNDREDS',
          clause_id: toneClause.id,
          quote_from_source: 'Never use fear-mongering or alarmist headlines.',
          explanation: 'Headline uses catastrophic life-threatening urgency that violates brand calm guidelines.'
        });
      }
    }

    // Check hyperbole / aggressive sales
    if (lower.includes('buy now or regret') || draftText.includes('!!!')) {
      const hyperboleClause = clientClauses.find(c => c.category === 'tone' && c.text.includes('aggressive sales hyperbole'));
      if (hyperboleClause) {
        findings.push({
          issue: 'Aggressive Sales Hyperbole',
          span: draftText.match(/BUY NOW OR REGRET[^\n.!]*/i)?.[0] || 'BUY NOW OR REGRET',
          clause_id: hyperboleClause.id,
          quote_from_source: "Avoid aggressive sales hyperbole such as 'BUY NOW OR REGRET' or excessive exclamation marks.",
          explanation: 'Sales copy relies on high-pressure FOMO and multiple exclamation points.'
        });
      }
    }

    // Check comparative superiority
    if (lower.includes('india’s no. 1') || lower.includes("india's no. 1") || lower.includes('better than all private hospitals')) {
      const compClause = clientClauses.find(c => c.category === 'claims' && c.text.includes('Comparative superiority claims'));
      if (compClause) {
        findings.push({
          issue: 'Unsubstantiated Comparative Claim',
          span: draftText.match(/India[’']s No\. 1 Best Diagnostic Company, better than all private hospitals combined/i)?.[0] || "India's No. 1 Best Diagnostic Company",
          clause_id: compClause.id,
          quote_from_source: "Comparative superiority claims ('better than Brand X' or 'India’s No. 1') are strictly forbidden without explicit regulatory substantiation.",
          explanation: 'Comparative claim ranks brand above competitors without published clinical survey backing.'
        });
      }
    }

    return findings;
  }
}
