export interface AiModelDisclosure {
  component: string;
  service_or_model: string;
  provider: string;
  execution_environment: 'local_server' | 'external_cloud_api';
  zero_retention_guarantee: boolean;
  purpose: string;
  masking_applied: boolean;
}

export function getAboutAiManifest(): {
  service: string;
  version: string;
  disclosure_statement: string;
  models: AiModelDisclosure[];
} {
  return {
    service: 'Parakh Brand Governance AI',
    version: '1.0.0',
    disclosure_statement:
      'Parakh enforces strict responsible AI principles. All deterministic checks and vector embeddings execute locally. External LLM calls are strictly tenant-isolated, PII-masked, and subject to verbatim Citation Gate verification.',
    models: [
      {
        component: 'Tone & Messaging Review',
        service_or_model: 'llama-3.3-70b-versatile',
        provider: 'Groq Cloud',
        execution_environment: 'external_cloud_api',
        zero_retention_guarantee: true,
        purpose: 'Detects nuanced tone, alarmist phrasing, and messaging violations against client clauses.',
        masking_applied: true
      },
      {
        component: 'Citation Gate',
        service_or_model: 'Deterministic AST & Verbatim Substring Verifier',
        provider: 'Local Engine (Node.js)',
        execution_environment: 'local_server',
        zero_retention_guarantee: true,
        purpose: 'Drops any LLM finding that cannot be verified verbatim against approved guidelines.',
        masking_applied: false
      },
      {
        component: 'Brand Case Law Vector Matcher',
        service_or_model: 'Deterministic Local Semantic Embedding Engine (64-dim)',
        provider: 'Local Engine',
        execution_environment: 'local_server',
        zero_retention_guarantee: true,
        purpose: 'Matches incoming drafts to historical precedents without sending data outside the vault.',
        masking_applied: false
      },
      {
        component: 'Guideline Debugger Synthesizer',
        service_or_model: 'llama-3.3-70b-versatile',
        provider: 'Groq Cloud',
        execution_environment: 'external_cloud_api',
        zero_retention_guarantee: true,
        purpose: 'Synthesizes clearer guideline rewrites strictly using past override examples as evidence.',
        masking_applied: true
      },
      {
        component: 'Visual Contrast & Accessibility Calculator',
        service_or_model: 'WCAG 2.1 Relative Luminance Formula',
        provider: 'Local Math Engine',
        execution_environment: 'local_server',
        zero_retention_guarantee: true,
        purpose: 'Calculates color contrast ratios mathematically with 0% AI hallucination risk.',
        masking_applied: false
      }
    ]
  };
}
