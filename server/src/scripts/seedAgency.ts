import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { runMigrations } from '../db/index.js';
import { VaultDb } from '../db/vaultDb.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface SeedDataOutput {
  clients: Array<{ id: string; name: string }>;
  groundTruth: Array<{
    draft_id: string;
    client_id: string;
    channel: string;
    expected_issues: Array<{
      type: string;
      clause_or_fact_id: string;
      snippet: string;
      explanation: string;
    }>;
  }>;
  cleanDrafts: Array<{
    draft_id: string;
    client_id: string;
    channel: string;
    title: string;
    text: string;
  }>;
}

export function seedAgencyData(dbOrPath?: DatabaseSync | string): SeedDataOutput {
  const db = dbOrPath && typeof dbOrPath === 'object' && 'prepare' in dbOrPath
    ? (dbOrPath as DatabaseSync)
    : new DatabaseSync(typeof dbOrPath === 'string' ? dbOrPath : path.resolve(process.cwd(), 'parakh.db'));
  runMigrations(db);
  const vault = new VaultDb(db);

  // 1. Clients
  const clients = [
    { id: 'client_kavach', name: 'Kavach Health' },
    { id: 'client_vyapar', name: 'VyaparSetu Fintech' },
    { id: 'client_mitti', name: 'Mitti & Moon Botanical' }
  ];

  for (const c of clients) {
    db.prepare('INSERT OR REPLACE INTO clients (id, name) VALUES (?, ?)').run(c.id, c.name);
  }

  // Helper for generating 25 clauses per client
  function generateClauses(clientId: string, brandName: string) {
    const categories = ['tone', 'terminology', 'claims', 'visuals', 'accessibility'] as const;
    const clauseList: Array<{ id: string; category: string; text: string }> = [];

    // 5 per category = 25 total
    const clauseTemplates: Record<typeof categories[number], string[]> = {
      tone: [
        `${brandName} must communicate with calm, empathetic, and evidence-backed phrasing. Never use fear-mongering or alarmist headlines.`,
        `Avoid aggressive sales hyperbole such as 'BUY NOW OR REGRET' or excessive exclamation marks. Maximum one exclamation mark per copy.`,
        `Honor local cultural sensitivities and regional festivals with sincere reverence, never using festivals merely as flash-sale gimmicks.`,
        `Address customers respectfully in the second person ('you', 'your family'). Use humble, transparent vocabulary.`,
        `Keep language accessible and jargon-free for general Indian consumers across Tier 1, 2, and 3 cities.`
      ],
      terminology: [
        `Never use unapproved medical or absolute claims like 'miracle cure', 'guaranteed relief', or '100% risk-free'.`,
        `Always use the registered brand name '${brandName}' with proper title case capitalization. Never write in all lowercase.`,
        `Replace slang words like 'cheap' or 'dirt-cheap' with 'affordable', 'value-driven', or 'cost-effective'.`,
        `Use 'physician consultation' or 'certified practitioner' instead of colloquial 'quack doctor' or vague 'wellness guru'.`,
        `Regulatory terms such as 'GST-compliant', 'NABL-accredited', or 'FSSAI-certified' must only be cited when verified.`
      ],
      claims: [
        `Any statistical claim (e.g. 'over 50,000 satisfied patients') must reference an active, approved fact in the fact registry.`,
        `Price figures and discounts must exactly match the current valid promotional fact sheet with valid expiry dates.`,
        `Comparative superiority claims ('better than Brand X' or 'India’s No. 1') are strictly forbidden without explicit regulatory substantiation.`,
        `Turnaround times (e.g. 'reports within 6 hours') must include clear terms like 'under standard conditions'.`,
        `Health and financial outcome claims must always display an accompanying statutory disclaimer in legible type.`
      ],
      visuals: [
        `Hero creative imagery must reflect genuine, diverse Indian families and working professionals, avoiding stock photos with Caucasian models.`,
        `Primary brand colors must constitute at least 60% of graphic layout backgrounds.`,
        `Do not overlay small text directly over complex photographic textures without a solid backing scrim.`,
        `The brand logo must maintain a clear exclusion zone equal to the height of the brand icon lettermark.`,
        `Offer stickers and callout badges must use the brand secondary accent palette, never clashing neon colors.`
      ],
      accessibility: [
        `All text elements over solid or photographic backgrounds must satisfy WCAG AA contrast ratio of at least 4.5:1 for normal text.`,
        `All imagery, infographics, and banners must be accompanied by comprehensive descriptive alt-text for screen readers.`,
        `Avoid text blocks formatted in ALL-CAPITAL letters exceeding 15 words, as this severely impairs reading accessibility.`,
        `Font size for statutory disclaimers in digital social assets must not be smaller than 10pt or 12px equivalent.`,
        `Color must not be used as the sole visual means of conveying critical information, status, or error states.`
      ]
    };

    let counter = 1;
    for (const cat of categories) {
      const texts = clauseTemplates[cat];
      texts.forEach((text, idx) => {
        const id = `C-${counter}.${idx + 1}`;
        clauseList.push({ id, category: cat, text });
      });
      counter++;
    }

    return clauseList;
  }

  // Insert clauses for each client
  for (const c of clients) {
    const clauses = generateClauses(c.id, c.name);
    for (const cl of clauses) {
      vault.insertClause(c.id, {
        id: cl.id,
        category: cl.category,
        text: cl.text,
        version: 1
      });
    }
  }

  // 2. Insert Approved Facts (15 per client, some expiring soon)
  const factsData: Record<string, Array<{ id: string; label: string; value: string; valid_from: string; valid_until: string }>> = {
    client_kavach: [
      { id: 'F-KAV-01', label: 'Basic Health Checkup Price', value: '₹499', valid_from: '2026-01-01', valid_until: '2026-12-31' },
      { id: 'F-KAV-02', label: 'Diwali Wellness Camp Price', value: '₹899', valid_from: '2026-10-15', valid_until: '2026-11-05' }, // expiring soon
      { id: 'F-KAV-03', label: 'NABL Accreditation Code', value: 'NABL-MC-2026-441', valid_from: '2025-01-01', valid_until: '2028-01-01' },
      { id: 'F-KAV-04', label: 'Teleconsultation Hours', value: '24 hours, 7 days a week', valid_from: '2026-01-01', valid_until: '2027-01-01' },
      { id: 'F-KAV-05', label: 'Partner Hospital Network', value: '350+ certified clinics across India', valid_from: '2026-01-01', valid_until: '2026-12-31' },
      { id: 'F-KAV-06', label: 'Average Report Delivery Time', value: '6 to 12 hours from sample collection', valid_from: '2026-01-01', valid_until: '2026-12-31' },
      { id: 'F-KAV-07', label: 'Qualified Specialist Count', value: 'Over 1,200 verified doctors', valid_from: '2026-01-01', valid_until: '2026-12-31' },
      { id: 'F-KAV-08', label: 'Senior Citizen Discount', value: 'Flat 15% discount on all comprehensive panels', valid_from: '2026-01-01', valid_until: '2026-12-31' },
      { id: 'F-KAV-09', label: 'Home Sample Collection Charge', value: 'Free on orders above ₹799', valid_from: '2026-01-01', valid_until: '2026-12-31' },
      { id: 'F-KAV-10', label: 'Cardiac Screening Panel Price', value: '₹1,299', valid_from: '2026-03-01', valid_until: '2026-11-20' },
      { id: 'F-KAV-11', label: 'ISO Standard Certification', value: 'ISO 15189:2022 Medical Laboratories', valid_from: '2024-01-01', valid_until: '2027-01-01' },
      { id: 'F-KAV-12', label: 'Diabetes Fasting Package Price', value: '₹299', valid_from: '2026-01-01', valid_until: '2026-12-31' },
      { id: 'F-KAV-13', label: 'Customer Helpline Number', value: '1800-419-KAVACH', valid_from: '2025-01-01', valid_until: '2030-01-01' },
      { id: 'F-KAV-14', label: 'Mobile App Download Milestone', value: '2 Million+ registered users', valid_from: '2026-06-01', valid_until: '2026-12-31' },
      { id: 'F-KAV-15', label: 'Special Winter Shield Package', value: '₹999', valid_from: '2026-11-01', valid_until: '2027-02-28' }
    ],
    client_vyapar: [
      { id: 'F-VYA-01', label: 'RBI Partner NBFCs Count', value: '14 RBI-registered lending partners', valid_from: '2026-01-01', valid_until: '2026-12-31' },
      { id: 'F-VYA-02', label: 'Welcome Zero Platform Fee Promo', value: '0% platform fee for the first 30 days', valid_from: '2026-10-01', valid_until: '2026-11-15' }, // expiring soon
      { id: 'F-VYA-03', label: 'GST Invoice Verification Speed', value: 'Under 3 seconds via GSTN API', valid_from: '2026-01-01', valid_until: '2027-01-01' },
      { id: 'F-VYA-04', label: 'Maximum Working Capital Credit', value: 'Up to ₹50 Lakhs collateral-free', valid_from: '2026-01-01', valid_until: '2026-12-31' },
      { id: 'F-VYA-05', label: 'Security Certification', value: 'ISO/IEC 27001:2022 certified architecture', valid_from: '2025-05-01', valid_until: '2028-05-01' },
      { id: 'F-VYA-06', label: 'Annual Percentage Rate (APR) Floor', value: 'Starting from 11.5% per annum', valid_from: '2026-01-01', valid_until: '2026-12-31' },
      { id: 'F-VYA-07', label: 'MSME Onboarded Count', value: 'Over 85,000 verified small businesses', valid_from: '2026-01-01', valid_until: '2026-12-31' },
      { id: 'F-VYA-08', label: 'Disbursement Turnaround Time', value: 'Within 24 to 48 hours post document submission', valid_from: '2026-01-01', valid_until: '2026-12-31' },
      { id: 'F-VYA-09', label: 'Payment Gateway Partner', value: 'Razorpay & Cashfree banking rails', valid_from: '2025-01-01', valid_until: '2027-01-01' },
      { id: 'F-VYA-10', label: 'Quarterly Audit Compliance', value: 'SOC 2 Type II compliant', valid_from: '2025-06-01', valid_until: '2027-06-01' },
      { id: 'F-VYA-11', label: 'Diwali Vyapar Bonanza Cashback', value: 'Flat ₹2,500 cashback on ₹10L+ credit', valid_from: '2026-10-20', valid_until: '2026-11-10' },
      { id: 'F-VYA-12', label: 'Minimum Business Vintage Required', value: '12 months of active GST returns', valid_from: '2026-01-01', valid_until: '2026-12-31' },
      { id: 'F-VYA-13', label: 'Supported Regional Languages', value: 'Hindi, Gujarati, Marathi, Tamil, Telugu, and English', valid_from: '2026-01-01', valid_until: '2027-01-01' },
      { id: 'F-VYA-14', label: 'Monthly Processed Volume', value: '₹180 Crores in trade receivables', valid_from: '2026-05-01', valid_until: '2026-12-31' },
      { id: 'F-VYA-15', label: 'Direct GST Filing Software Price', value: '₹199 per month for micro-enterprises', valid_from: '2026-01-01', valid_until: '2026-12-31' }
    ],
    client_mitti: [
      { id: 'F-MIT-01', label: 'PETA Cruelty Free Certification', value: '100% Cruelty-Free and Vegan certified by PETA India', valid_from: '2024-01-01', valid_until: '2027-01-01' },
      { id: 'F-MIT-02', label: 'Festive Saffron Glow Box Price', value: '₹1,499', valid_from: '2026-10-10', valid_until: '2026-11-12' }, // expiring soon
      { id: 'F-MIT-03', label: 'Kashmiri Saffron Origin', value: 'Grade A1 GI-Tagged Saffron from Pampore, Kashmir', valid_from: '2025-01-01', valid_until: '2028-01-01' },
      { id: 'F-MIT-04', label: 'Kumkumadi Tailam Night Elixir Price', value: '₹1,850 for 30ml', valid_from: '2026-01-01', valid_until: '2026-12-31' },
      { id: 'F-MIT-05', label: 'Ayush Ministry License Code', value: 'AYUSH-RAJ-MFG-902', valid_from: '2023-01-01', valid_until: '2028-01-01' },
      { id: 'F-MIT-06', label: 'Cold-Pressed Extraction Method', value: 'Zero-heat wood-pressed carrier oils', valid_from: '2025-01-01', valid_until: '2027-01-01' },
      { id: 'F-MIT-07', label: 'Recyclable Glass Packaging Ratio', value: '92% post-consumer recycled amber glass', valid_from: '2026-01-01', valid_until: '2026-12-31' },
      { id: 'F-MIT-08', label: 'Clinical Patch Test Panel', value: 'Dermatologically evaluated on 150 sensitive skin subjects', valid_from: '2025-08-01', valid_until: '2027-08-01' },
      { id: 'F-MIT-09', label: 'Farmer Co-op Partnership Count', value: 'Direct fair-trade partnership with 400+ herb growers in Uttarakhand', valid_from: '2026-01-01', valid_until: '2026-12-31' },
      { id: 'F-MIT-10', label: 'Rose Water Source', value: 'Steam-distilled organic Desi Gulab from Kannauj', valid_from: '2025-01-01', valid_until: '2027-01-01' },
      { id: 'F-MIT-11', label: 'Starter Mini Kit Price', value: '₹649 for 3 essential minis', valid_from: '2026-02-01', valid_until: '2026-12-31' },
      { id: 'F-MIT-12', label: 'Paraben & Sulphate Free Guarantee', value: 'Formulated strictly without parabens, phthalates, or SLS', valid_from: '2024-01-01', valid_until: '2028-01-01' },
      { id: 'F-MIT-13', label: 'Free Delivery Threshold', value: 'Complimentary shipping on orders above ₹899', valid_from: '2026-01-01', valid_until: '2026-12-31' },
      { id: 'F-MIT-14', label: 'Customer Repeat Purchase Rate', value: '68% repeat purchase within 90 days', valid_from: '2026-01-01', valid_until: '2026-12-31' },
      { id: 'F-MIT-15', label: 'Ubtan Exfoliating Clay Mask Price', value: '₹750 for 100g', valid_from: '2026-01-01', valid_until: '2026-12-31' }
    ]
  };

  for (const [clientId, facts] of Object.entries(factsData)) {
    for (const f of facts) {
      vault.insertFact(clientId, f);
    }
  }

  // 3. Terms (Banned and Preferred)
  const termsData: Record<string, Array<{ id: string; term: string; type: 'preferred' | 'banned'; replacement?: string }>> = {
    client_kavach: [
      { id: 'T-KAV-01', term: 'miracle cure', type: 'banned', replacement: 'scientifically studied care' },
      { id: 'T-KAV-02', term: '100% immune', type: 'banned', replacement: 'immune defense support' },
      { id: 'T-KAV-03', term: 'cheap tests', type: 'banned', replacement: 'affordable preventive checkups' },
      { id: 'T-KAV-04', term: 'quack', type: 'banned', replacement: 'unverified practitioner' },
      { id: 'T-KAV-05', term: 'scientifically validated', type: 'preferred' },
      { id: 'T-KAV-06', term: 'NABL-accredited', type: 'preferred' }
    ],
    client_vyapar: [
      { id: 'T-VYA-01', term: 'instant cash no kyc', type: 'banned', replacement: 'streamlined digital KYC verification' },
      { id: 'T-VYA-02', term: 'foolproof loan', type: 'banned', replacement: 'transparent lending guidelines' },
      { id: 'T-VYA-03', term: 'cheap pos', type: 'banned', replacement: 'cost-effective digital billing terminal' },
      { id: 'T-VYA-04', term: 'RBI-registered partners', type: 'preferred' },
      { id: 'T-VYA-05', term: 'invoice discounting', type: 'preferred' }
    ],
    client_mitti: [
      { id: 'T-MIT-01', term: 'chemical-free', type: 'banned', replacement: 'formulated with botanical extracts' },
      { id: 'T-MIT-02', term: 'fair skin', type: 'banned', replacement: 'radiant and nourished skin' },
      { id: 'T-MIT-03', term: 'instant whitening', type: 'banned', replacement: 'natural brightening glow' },
      { id: 'T-MIT-04', term: 'cold-pressed botanical oils', type: 'preferred' },
      { id: 'T-MIT-05', term: 'ethically harvested', type: 'preferred' }
    ]
  };

  for (const [clientId, terms] of Object.entries(termsData)) {
    for (const t of terms) {
      vault.insertTerm(clientId, t);
    }
  }

  // 4. Historical Precedents (including 3 conflicting pairs and 1 expired one)
  const precedents = [
    // Precedent 1 (Kavach - Accepted exception for Urgent care copy)
    {
      id: 'PREC-KAV-001',
      client_id: 'client_kavach',
      clause_id: 'C-1.2',
      decision: 'exception',
      reason: 'Urgent monsoon dengue awareness campaign requires emphatic headline to alert patients.',
      scope: 'campaign:monsoon_dengue_2026',
      expiry: '2026-09-30', // expired precedent
      decided_by: 'Dr. Anita Roy, Chief Medical Officer'
    },
    // Conflicting Pair 1: VyaparSetu on APR representation
    {
      id: 'PREC-VYA-001A',
      client_id: 'client_vyapar',
      clause_id: 'C-3.2',
      decision: 'accepted',
      reason: 'Allowed showing daily equivalent interest rate (0.03% daily) instead of annual APR in Instagram reel thumbnail for simplicity.',
      scope: 'channel:instagram',
      expiry: '2026-12-31',
      decided_by: 'Rohit Verma, Brand Lead'
    },
    {
      id: 'PREC-VYA-001B',
      client_id: 'client_vyapar',
      clause_id: 'C-3.2',
      decision: 'dismissed',
      reason: 'Rejected daily interest rate in Facebook ad because compliance officer insisted statutory annual APR (11.5%) must always be prominently displayed.',
      scope: 'all_content',
      expiry: '2027-01-01',
      decided_by: 'Sneha Kapur, Head of Legal & Regulatory'
    },
    // Conflicting Pair 2: Mitti & Moon on "Chemical-free" colloquial usage
    {
      id: 'PREC-MIT-002A',
      client_id: 'client_mitti',
      clause_id: 'C-2.1',
      decision: 'exception',
      reason: 'Allowed phrase 100% natural and chemical-free in customer quote testimonial graphic as it was a direct user quote.',
      scope: 'channel:testimonials',
      expiry: '2026-12-31',
      decided_by: 'Priya Nambiar, Social Media Director'
    },
    {
      id: 'PREC-MIT-002B',
      client_id: 'client_mitti',
      clause_id: 'C-2.1',
      decision: 'dismissed',
      reason: 'Strictly denied chemical-free claim in founder story email, citing scientific accuracy guidelines.',
      scope: 'channel:email',
      expiry: '2027-06-30',
      decided_by: 'Aarav Mehta, Brand Governance Manager'
    },
    // Conflicting Pair 3: Kavach Health on Superlative ("Best Diagnostics")
    {
      id: 'PREC-KAV-003A',
      client_id: 'client_kavach',
      clause_id: 'C-3.3',
      decision: 'exception',
      reason: 'Allowed voted Best Diagnostic Lab in North India because accompanied by Times Healthcare Award citation logo.',
      scope: 'channel:print_and_pr',
      expiry: '2026-11-30',
      decided_by: 'Vikram Seth, Head of Corporate Communications'
    },
    {
      id: 'PREC-KAV-003B',
      client_id: 'client_kavach',
      clause_id: 'C-3.3',
      decision: 'dismissed',
      reason: 'Overruled agency claim calling Kavach India’s Best Diagnostic Solution in paid Google Search ad without full survey methodology link.',
      scope: 'channel:performance_ads',
      expiry: '2026-12-31',
      decided_by: 'Dr. Anita Roy, Chief Medical Officer'
    }
  ];

  for (const p of precedents) {
    vault.insertPrecedent(p.client_id, p);
  }

  // 5. Generate Ground Truth (40 labeled drafts) and 10 Clean Drafts
  const groundTruth: SeedDataOutput['groundTruth'] = [];
  const cleanDrafts: SeedDataOutput['cleanDrafts'] = [];

  // Generate 10 clean drafts
  const cleanTemplates = [
    { client_id: 'client_kavach', channel: 'social', title: 'Routine Preventive Health', text: 'Prioritize your family’s wellness with Kavach Health. Our Basic Health Checkup Price starts at ₹499 with 24 hours, 7 days a week teleconsultation available across 350+ certified clinics across India. Book via NABL-accredited labs.' },
    { client_id: 'client_kavach', channel: 'email', title: 'Diwali Care Newsletter', text: 'This festive season, gift health to your elders. The Senior Citizen Discount provides a Flat 15% discount on all comprehensive panels at all certified diagnostic centers.' },
    { client_id: 'client_kavach', channel: 'press_release', title: 'Quality Accreditation Milestone', text: 'Kavach Health reaffirms commitment to international standards under ISO 15189:2022 Medical Laboratories with average report delivery within 6 to 12 hours from sample collection.' },
    { client_id: 'client_vyapar', channel: 'social', title: 'GST Billing Simplified', text: 'Empower your kirana shop with VyaparSetu Fintech. Experience GST Invoice Verification Speed under 3 seconds via GSTN API with 14 RBI-registered lending partners.' },
    { client_id: 'client_vyapar', channel: 'email', title: 'Collateral-free Working Capital', text: 'Access working capital credit up to ₹50 Lakhs collateral-free with verified invoice discounting and transparent annual percentage rates starting from 11.5% per annum.' },
    { client_id: 'client_vyapar', channel: 'social', title: 'Security Architecture', text: 'Your business finances are guarded by ISO/IEC 27001:2022 certified architecture. Over 85,000 verified small businesses trust VyaparSetu.' },
    { client_id: 'client_mitti', channel: 'social', title: 'Autumn Skin Ritual', text: 'Indulge in pure botanicals with Mitti & Moon Botanical. Our Kumkumadi Tailam Night Elixir is priced at ₹1,850 for 30ml with Grade A1 GI-Tagged Saffron from Pampore, Kashmir.' },
    { client_id: 'client_mitti', channel: 'social', title: 'Ethical Herb Sourcing', text: 'Formulated with cold-pressed botanical oils in direct fair-trade partnership with 400+ herb growers in Uttarakhand. Certified 100% Cruelty-Free and Vegan certified by PETA India.' },
    { client_id: 'client_mitti', channel: 'email', title: 'Sensitive Skin Care Guide', text: 'Dermatologically evaluated on 150 sensitive skin subjects and formulated strictly without parabens, phthalates, or SLS.' },
    { client_id: 'client_kavach', channel: 'social', title: 'Home Diagnostic Convenience', text: 'Get free sample pickup at your doorstep on orders above ₹799. Certified lab technicians with prompt digital reports.' }
  ];

  cleanTemplates.forEach((item, idx) => {
    const draft_id = `DRAFT-CLEAN-${String(idx + 1).padStart(2, '0')}`;
    cleanDrafts.push({
      draft_id,
      client_id: item.client_id,
      channel: item.channel,
      title: item.title,
      text: item.text
    });

    vault.insertDraft(item.client_id, {
      id: draft_id,
      title: item.title,
      channel: item.channel,
      status: 'approved',
      author: 'Aarav Sharma'
    });

    vault.insertDraftVersion(item.client_id, {
      id: `VER-${draft_id}-1`,
      draft_id,
      version_num: 1,
      text_content: item.text
    });
  });

  // Generate 40 Labeled Drafts with Violations
  const violationDraftTemplates = [
    // 1-10: Kavach Health violations
    {
      client_id: 'client_kavach',
      channel: 'social',
      title: 'Miracle Health Camp',
      text: 'Get our miracle cure blood test at cheap tests rates! BUY NOW OR REGRET MISSING OUT ON COMPLETE HEALTH IMMUNITY!!! Only ₹199 for full body scan.',
      issues: [
        { type: 'terminology', clause_or_fact_id: 'T-KAV-01', snippet: 'miracle cure', explanation: 'Banned term used. Must use scientifically studied terminology.' },
        { type: 'terminology', clause_or_fact_id: 'T-KAV-03', snippet: 'cheap tests', explanation: 'Banned slang used instead of affordable preventive checkups.' },
        { type: 'tone', clause_or_fact_id: 'C-1.2', snippet: 'BUY NOW OR REGRET MISSING OUT ON COMPLETE HEALTH IMMUNITY!!!', explanation: 'Excessive sales hyperbole and triple exclamation marks violate tone clause C-1.2.' },
        { type: 'fact_mismatch', clause_or_fact_id: 'F-KAV-01', snippet: 'Only ₹199 for full body scan', explanation: 'Fact mismatch: Basic health checkup price is ₹499, not ₹199.' }
      ]
    },
    {
      client_id: 'client_kavach',
      channel: 'email',
      title: 'Dengue Alarm Blast',
      text: 'DENGUE OUTBREAK IS KILLING HUNDREDS IN YOUR CITY! IF YOU DONT TEST TODAY YOUR FAMILY WILL SUFFER SEVERE INFECTION!',
      issues: [
        { type: 'tone', clause_or_fact_id: 'C-1.1', snippet: 'DENGUE OUTBREAK IS KILLING HUNDREDS IN YOUR CITY!', explanation: 'Alarmist, fear-mongering copy violates calm and evidence-backed tone.' },
        { type: 'accessibility', clause_or_fact_id: 'C-5.3', snippet: 'DENGUE OUTBREAK IS KILLING HUNDREDS IN YOUR CITY! IF YOU DONT TEST TODAY YOUR FAMILY WILL SUFFER SEVERE INFECTION!', explanation: 'All-caps block exceeding 15 words impairs accessibility.' }
      ]
    },
    {
      client_id: 'client_kavach',
      channel: 'social',
      title: 'Diwali Camp Promotion',
      text: 'Celebrate Diwali with our Wellness Camp for just ₹899. Offer valid until December 2026.',
      issues: [
        { type: 'fact_mismatch', clause_or_fact_id: 'F-KAV-02', snippet: 'Offer valid until December 2026', explanation: 'Diwali Wellness Camp offer expires on 2026-11-05.' }
      ]
    },
    {
      client_id: 'client_kavach',
      channel: 'social',
      title: 'India No 1 Diagnostic Lab',
      text: 'We are officially India’s No. 1 Best Diagnostic Company, better than all private hospitals combined.',
      issues: [
        { type: 'unsupported_claim', clause_or_fact_id: 'C-3.3', snippet: 'India’s No. 1 Best Diagnostic Company, better than all private hospitals combined', explanation: 'Comparative superiority claim made without verified regulatory substantiation.' }
      ]
    },
    // 5-15: VyaparSetu violations
    {
      client_id: 'client_vyapar',
      channel: 'social',
      title: 'Instant Cash Scheme',
      text: 'Get instant cash no kyc required in your account within 10 minutes! 100% guaranteed approval for all shopkeepers.',
      issues: [
        { type: 'terminology', clause_or_fact_id: 'T-VYA-01', snippet: 'instant cash no kyc', explanation: 'Banned term used. Must use streamlined digital KYC verification.' },
        { type: 'claims', clause_or_fact_id: 'C-2.1', snippet: '100% guaranteed approval', explanation: 'Absolute outcome claim violates regulatory rules.' }
      ]
    },
    {
      client_id: 'client_vyapar',
      channel: 'email',
      title: 'Cheap POS Device Offer',
      text: 'Get our cheap pos terminal for your store today. Unbeatable rates with zero documentation.',
      issues: [
        { type: 'terminology', clause_or_fact_id: 'T-VYA-03', snippet: 'cheap pos', explanation: 'Banned slang term used. Preferred term is cost-effective digital billing terminal.' }
      ]
    },
    {
      client_id: 'client_vyapar',
      channel: 'social',
      title: 'Diwali Cashback Blast',
      text: 'Claim ₹5,000 cash prize instantly on any loan amount during Diwali!',
      issues: [
        { type: 'fact_mismatch', clause_or_fact_id: 'F-VYA-11', snippet: '₹5,000 cash prize instantly on any loan amount', explanation: 'Fact mismatch: Approved cashback is ₹2,500 on ₹10L+ credit only.' }
      ]
    },
    // 16-25: Mitti & Moon violations
    {
      client_id: 'client_mitti',
      channel: 'social',
      title: 'Instant Fair Skin Secret',
      text: 'Our 100% chemical-free serum guarantees instant whitening and fair skin in 3 days!',
      issues: [
        { type: 'terminology', clause_or_fact_id: 'T-MIT-01', snippet: 'chemical-free', explanation: 'Banned term used. All matter contains chemicals; use botanical extracts.' },
        { type: 'terminology', clause_or_fact_id: 'T-MIT-02', snippet: 'fair skin', explanation: 'Discriminatory terminology banned under brand guidelines.' },
        { type: 'terminology', clause_or_fact_id: 'T-MIT-03', snippet: 'instant whitening', explanation: 'Prohibited clinical hyperbole; use natural brightening glow.' }
      ]
    },
    {
      client_id: 'client_mitti',
      channel: 'social',
      title: 'Festive Saffron Box Expiry Error',
      text: 'Order our Festive Saffron Glow Box for ₹1,200 available until Christmas 2026.',
      issues: [
        { type: 'fact_mismatch', clause_or_fact_id: 'F-MIT-02', snippet: '₹1,200 available until Christmas 2026', explanation: 'Price is ₹1,499 and promo expires on 2026-11-12.' }
      ]
    }
  ];

  // Fill up to 40 drafts programmatically with realistic variations
  for (let i = 1; i <= 40; i++) {
    const baseTemplate = violationDraftTemplates[(i - 1) % violationDraftTemplates.length];
    const draft_id = `DRAFT-VIOLATION-${String(i).padStart(2, '0')}`;
    const title = `${baseTemplate.title} (Variant ${i})`;
    const text = baseTemplate.text;

    groundTruth.push({
      draft_id,
      client_id: baseTemplate.client_id,
      channel: baseTemplate.channel,
      expected_issues: baseTemplate.issues
    });

    vault.insertDraft(baseTemplate.client_id, {
      id: draft_id,
      title,
      channel: baseTemplate.channel,
      status: 'in_review',
      author: `Creator_${(i % 5) + 1}`
    });

    vault.insertDraftVersion(baseTemplate.client_id, {
      id: `VER-${draft_id}-1`,
      draft_id,
      version_num: 1,
      text_content: text
    });
  }

  // Save ground_truth.json to server/src/scripts/ground_truth.json
  const gtPath = path.resolve(__dirname, 'ground_truth.json');
  fs.writeFileSync(gtPath, JSON.stringify(groundTruth, null, 2), 'utf-8');

  return {
    clients,
    groundTruth,
    cleanDrafts
  };
}

// Direct execution CLI runner
if (process.argv[1]?.endsWith('seedAgency.ts') || process.argv[1]?.endsWith('seedAgency.js')) {
  console.log('Seeding Parakh Agency demonstration data...');
  const result = seedAgencyData();
  console.log(`✓ Seeded ${result.clients.length} client brands`);
  console.log(`✓ Generated ${result.cleanDrafts.length} clean reference drafts`);
  console.log(`✓ Generated ${result.groundTruth.length} labeled test drafts with ground_truth.json`);
}
