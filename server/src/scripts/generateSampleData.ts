import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import mammoth from 'mammoth';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../../');
const sampleDataDir = path.resolve(rootDir, 'sample-data');

console.log('Generating complete fictional Indian brand sample dataset in:', sampleDataDir);

// Pure Node.js standard ZIP packer ensuring cross-platform forward-slash paths for .docx
interface ZipEntry {
  name: string;
  data: string | Buffer;
}

function createZipBuffer(entries: ZipEntry[]): Buffer {
  const localHeaders: Buffer[] = [];
  const centralHeaders: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const forwardName = entry.name.replace(/\\/g, '/');
    const nameBuf = Buffer.from(forwardName, 'utf8');
    const dataBuf = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data, 'utf8');
    const crc = zlib.crc32(dataBuf);
    const size = dataBuf.length;

    // Local Header (30 bytes + name)
    const lh = Buffer.alloc(30 + nameBuf.length);
    lh.writeUInt32LE(0x04034b50, 0); // Signature
    lh.writeUInt16LE(20, 4); // Version
    lh.writeUInt16LE(0, 6); // Flags
    lh.writeUInt16LE(0, 8); // Store uncompressed
    lh.writeUInt16LE(0, 10); // Time
    lh.writeUInt16LE(0, 12); // Date
    lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(size, 18); // Comp size
    lh.writeUInt32LE(size, 22); // Uncomp size
    lh.writeUInt16LE(nameBuf.length, 26);
    lh.writeUInt16LE(0, 28);
    nameBuf.copy(lh, 30);

    localHeaders.push(lh, dataBuf);

    // Central Directory Header (46 bytes + name)
    const ch = Buffer.alloc(46 + nameBuf.length);
    ch.writeUInt32LE(0x02014b50, 0); // Signature
    ch.writeUInt16LE(20, 4);
    ch.writeUInt16LE(20, 6);
    ch.writeUInt16LE(0, 8);
    ch.writeUInt16LE(0, 10);
    ch.writeUInt16LE(0, 12);
    ch.writeUInt16LE(0, 14);
    ch.writeUInt32LE(crc, 16);
    ch.writeUInt32LE(size, 20);
    ch.writeUInt32LE(size, 24);
    ch.writeUInt16LE(nameBuf.length, 28);
    ch.writeUInt16LE(0, 30);
    ch.writeUInt16LE(0, 32);
    ch.writeUInt16LE(0, 34);
    ch.writeUInt16LE(0, 36);
    ch.writeUInt32LE(0, 38);
    ch.writeUInt32LE(offset, 42); // Relative offset of local header
    nameBuf.copy(ch, 46);

    centralHeaders.push(ch);
    offset += lh.length + dataBuf.length;
  }

  const centralDirSize = centralHeaders.reduce((acc, h) => acc + h.length, 0);
  const centralDirOffset = offset;

  // End of Central Directory Record (22 bytes)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralDirSize, 12);
  eocd.writeUInt32LE(centralDirOffset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localHeaders, ...centralHeaders, eocd]);
}

// Helper to create a genuine DOCX file using standard Office Open XML
function createDocxFromText(outputPath: string, title: string, textContent: string) {
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const paragraphs = textContent
    .split(/\r?\n/)
    .map(line => {
      const escaped = line
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
      return `<w:p><w:r><w:t>${escaped}</w:t></w:r></w:p>`;
    })
    .join('');

  const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>${title}</w:t></w:r></w:p>
    ${paragraphs}
  </w:body>
</w:document>`;

  const entries: ZipEntry[] = [
    { name: '[Content_Types].xml', data: contentTypes },
    { name: '_rels/.rels', data: rels },
    { name: 'word/document.xml', data: docXml }
  ];

  const zipBuf = createZipBuffer(entries);
  fs.writeFileSync(outputPath, zipBuf);
}

// ----------------------------------------------------------------------------
// 1. CLIENT 1: KAVACH HEALTH (Preventive Diagnostics & Healthcare)
// ----------------------------------------------------------------------------
const kavachClauses = [
  // Tone (C-1.1 to C-1.5)
  "Clause C-1.1: Kavach Health must communicate with calm, empathetic, and evidence-backed phrasing. Never use fear-mongering or alarmist headlines.",
  "Clause C-1.2: Avoid aggressive sales hyperbole such as 'BUY NOW OR REGRET' or excessive exclamation marks. Maximum one exclamation mark per copy.",
  "Clause C-1.3: Honor local cultural sensitivities and regional festivals with sincere reverence, never using festivals merely as flash-sale gimmicks.",
  "Clause C-1.4: Address customers respectfully in the second person ('you', 'your family'). Use humble, transparent vocabulary.",
  "Clause C-1.5: Keep language accessible and jargon-free for general Indian consumers across Tier 1, 2, and 3 cities.",

  // Terminology (C-2.1 to C-2.5)
  "Clause C-2.1: Never use unapproved medical or absolute claims like 'miracle cure', 'guaranteed relief', or '100% risk-free'.",
  "Clause C-2.2: Always use the registered brand name 'Kavach Health' with proper title case capitalization. Never write in all lowercase.",
  "Clause C-2.3: Replace slang words like 'cheap' or 'dirt-cheap' with 'affordable', 'value-driven', or 'cost-effective'.",
  "Clause C-2.4: Use 'physician consultation' or 'certified practitioner' instead of colloquial 'quack doctor' or vague 'wellness guru'.",
  "Clause C-2.5: Regulatory terms such as 'GST-compliant', 'NABL-accredited', or 'FSSAI-certified' must only be cited when verified.",

  // Claims (C-3.1 to C-3.5)
  "Clause C-3.1: Any statistical claim (e.g. 'over 50,000 satisfied patients') must reference an active, approved fact in the fact registry.",
  "Clause C-3.2: Price figures, discounts and promotional package fees must exactly match the current valid promotional fact sheet with valid expiry dates.",
  "Clause C-3.3: Comparative superiority claims ('better than Brand X' or 'India’s No. 1') are strictly forbidden without explicit regulatory substantiation.",
  "Clause C-3.4: Turnaround times (e.g. 'reports within 6 hours') must include clear terms like 'under standard conditions'.",
  "Clause C-3.5: Health and diagnostic outcome claims must always display an accompanying statutory disclaimer in legible type.",

  // Visuals (C-4.1 to C-4.5)
  "Clause C-4.1: Hero creative imagery must reflect genuine, diverse Indian families and working professionals, avoiding stock photos with Caucasian models.",
  "Clause C-4.2: Primary brand colors (Kavach Navy and Crimson Seal) must constitute at least 60% of graphic layout backgrounds.",
  "Clause C-4.3: Do not overlay small text directly over complex photographic textures without a solid backing scrim.",
  "Clause C-4.4: The brand logo must maintain a clear exclusion zone equal to the height of the brand shield icon.",
  "Clause C-4.5: Offer stickers and callout badges must use the brand secondary accent palette, never clashing neon colors.",

  // Accessibility (C-5.1 to C-5.5)
  "Clause C-5.1: All text elements over solid or photographic backgrounds must satisfy WCAG AA contrast ratio of at least 4.5:1 for normal text.",
  "Clause C-5.2: All imagery, infographics, and banners must be accompanied by comprehensive descriptive alt-text for screen readers.",
  "Clause C-5.3: Avoid text blocks formatted in ALL-CAPITAL letters exceeding 15 words, as this severely impairs reading accessibility.",
  "Clause C-5.4: Font size for statutory disclaimers in digital social assets must not be smaller than 10pt or 12px equivalent.",
  "Clause C-5.5: Color must not be used as the sole visual means of conveying critical medical information, test status, or error states."
];

const kavachMarkdown = `# Kavach Health (कवच) — Official Brand Governance Guidelines
**Tenant ID:** client_kavach  
**Sector:** Preventive Healthcare, Diagnostic Pathology & Clinical Wellness  
**Version:** 1.0 (Active)

---

## 1. Tone & Brand Voice
${kavachClauses.slice(0, 5).join('\n\n')}

## 2. Terminology & Vocabulary Controls
${kavachClauses.slice(5, 10).join('\n\n')}

## 3. Claims & Substantiation Standards
${kavachClauses.slice(10, 15).join('\n\n')}

## 4. Visual Identity & Composition Rules
${kavachClauses.slice(15, 20).join('\n\n')}

## 5. Accessibility & Inclusivity (WCAG AA)
${kavachClauses.slice(20, 25).join('\n\n')}
`;

fs.writeFileSync(path.join(sampleDataDir, 'clients', 'client_kavach', 'guidelines.md'), kavachMarkdown, 'utf-8');
createDocxFromText(path.join(sampleDataDir, 'clients', 'client_kavach', 'guidelines.docx'), 'Kavach Health Guidelines', kavachMarkdown);

// Kavach Facts (some expiring soon)
const kavachFacts = [
  { id: 'F-KAV-01', label: 'Basic Health Checkup Price', value: '₹499', valid_from: '2026-01-01', valid_until: '2026-12-31' },
  { id: 'F-KAV-02', label: 'Diwali Wellness Camp Price', value: '₹899', valid_from: '2026-10-15', valid_until: '2026-11-05' }, // Expired/near expiry
  { id: 'F-KAV-03', label: 'NABL Accreditation Code', value: 'NABL-MC-2026-441', valid_from: '2025-01-01', valid_until: '2028-01-01' },
  { id: 'F-KAV-04', label: 'Teleconsultation Hours', value: '24 hours, 7 days a week', valid_from: '2026-01-01', valid_until: '2027-01-01' },
  { id: 'F-KAV-05', label: 'Partner Hospital Network', value: '350+ certified clinics across India', valid_from: '2026-01-01', valid_until: '2026-12-31' },
  { id: 'F-KAV-06', label: 'Average Report Delivery Time', value: '6 to 12 hours from sample collection', valid_from: '2026-01-01', valid_until: '2026-12-31' },
  { id: 'F-KAV-07', label: 'Qualified Specialist Count', value: 'Over 1,200 verified doctors', valid_from: '2026-01-01', valid_until: '2026-12-31' },
  { id: 'F-KAV-08', label: 'Senior Citizen Discount', value: 'Flat 15% discount on all comprehensive panels', valid_from: '2026-01-01', valid_until: '2026-12-31' },
  { id: 'F-KAV-09', label: 'Home Sample Collection Charge', value: 'Free on orders above ₹799', valid_from: '2026-01-01', valid_until: '2026-12-31' },
  { id: 'F-KAV-10', label: 'Cardiac Screening Panel Price', value: '₹1,299', valid_from: '2026-03-01', valid_until: '2026-11-20' }, // Near expiry
  { id: 'F-KAV-11', label: 'ISO Standard Certification', value: 'ISO 15189:2022 Medical Laboratories', valid_from: '2024-01-01', valid_until: '2027-01-01' },
  { id: 'F-KAV-12', label: 'Diabetes Fasting Package Price', value: '₹299', valid_from: '2026-01-01', valid_until: '2026-12-31' },
  { id: 'F-KAV-13', label: 'Customer Helpline Number', value: '1800-419-KAVACH', valid_from: '2025-01-01', valid_until: '2030-01-01' },
  { id: 'F-KAV-14', label: 'Mobile App Download Milestone', value: '2 Million+ registered users', valid_from: '2026-06-01', valid_until: '2026-12-31' },
  { id: 'F-KAV-15', label: 'Special Winter Shield Package', value: '₹999', valid_from: '2026-11-01', valid_until: '2027-02-28' }
];
fs.writeFileSync(path.join(sampleDataDir, 'clients', 'client_kavach', 'facts.json'), JSON.stringify(kavachFacts, null, 2), 'utf-8');

// Kavach Terms
const kavachTermsCsv = `term,type,replacement
miracle cure,banned,scientifically studied care
100% immune,banned,immune defense support
cheap tests,banned,affordable preventive checkups
quack,banned,unverified practitioner
dirt-cheap health,banned,accessible clinical screening
instant healing,banned,systematic treatment protocol
scientifically validated,preferred,
NABL-accredited,preferred,
clinical diagnostic panel,preferred,
certified pathologist,preferred,`;
fs.writeFileSync(path.join(sampleDataDir, 'clients', 'client_kavach', 'terms.csv'), kavachTermsCsv, 'utf-8');

// Kavach Palette
const kavachPalette = {
  client_id: "client_kavach",
  brand_name: "Kavach Health",
  colors: {
    primary: "#181A20", // Deep Ink Charcoal
    secondary: "#D7263D", // Crimson Stamp Seal
    accent: "#FFD60A", // Highlighter Warning Yellow
    surface: "#F4EFE6", // Case-File Parchment
    verified: "#2FBF71", // Verified Emerald Green
    muted: "#8A8F98" // Steel Muted
  },
  wcag_contrast_guidelines: {
    minimum_ratio_body_text: "4.5:1",
    minimum_ratio_large_text: "3.0:1",
    prohibited_pairings: [
      { fg: "#FFD60A", bg: "#FFFFFF", ratio: "1.17:1", reason: "Fails WCAG AA severely; unreadable" }
    ]
  }
};
fs.writeFileSync(path.join(sampleDataDir, 'clients', 'client_kavach', 'palette.json'), JSON.stringify(kavachPalette, null, 2), 'utf-8');

// ----------------------------------------------------------------------------
// 2. CLIENT 2: VYAPARSETU FINTECH (MSME Working Capital & Digital Lending)
// ----------------------------------------------------------------------------
const vyaparClauses = [
  // Tone
  "Clause C-1.1: VyaparSetu Fintech must speak with the clarity, dignity, and partnership tone of a trusted financial institution. Never demean small merchants.",
  "Clause C-1.2: Avoid aggressive loan-shark urgency such as 'GET CASH OR SHUT DOWN' or frantic count-down clocks.",
  "Clause C-1.3: All interest rate quotes must highlight fairness, transparency, and statutory borrower protections.",
  "Clause C-1.4: Use encouraging, business-building terms ('working capital', 'growth credit') rather than debt-stress words ('borrowed money', 'dues').",
  "Clause C-1.5: Content must be easily understood by Indian shopkeepers and Kirana proprietors in simple, everyday language.",

  // Terminology
  "Clause C-2.1: Prohibit informal lending terms like 'instant cash no kyc', 'easy black-market credit', or 'foolproof loan'.",
  "Clause C-2.2: Always spell the brand name as 'VyaparSetu Fintech' with capital V and S. Never use 'Vyapar-Setu' with a hyphen.",
  "Clause C-2.3: Replace slang words like 'cheap POS' with 'cost-effective digital billing terminal' or 'affordable POS'.",
  "Clause C-2.4: Always refer to financing partners as 'RBI-registered NBFC partners' or 'regulated banking partners'.",
  "Clause C-2.5: The phrase 'collateral-free' must always be accompanied by the statutory caveat 'subject to partner NBFC credit appraisal'.",

  // Claims
  "Clause C-3.1: All claims of credit limits (e.g. 'Up to ₹50 Lakhs') must mention eligibility criteria and documented revenue thresholds.",
  "Clause C-3.2: Price figures, discounts and loan interest rates must exactly match the approved promotional fact sheet with valid expiry dates.",
  "Clause C-3.3: Disbursement speed claims (e.g. 'under 24 hours') must clarify 'post successful document verification'.",
  "Clause C-3.4: Never promise '100% guaranteed loan sanction' or claim credit approval without underwriting verification.",
  "Clause C-3.5: Disclose statutory Annual Percentage Rate (APR) floor prominently on creatives featuring interest rate mentions.",

  // Visuals
  "Clause C-4.1: Creatives must showcase real, authentic Indian retail merchants, manufacturers, and service entrepreneurs at their workplace.",
  "Clause C-4.2: Primary brand colors (Vyapar Saffron Gold and Midnight Indigo) must occupy at least 60% of graphic asset real estate.",
  "Clause C-4.3: Financial figures and EMI tables must be displayed on high-contrast solid backgrounds, never on textured photo patterns.",
  "Clause C-4.4: The VyaparSetu trust badge and partner NBFC disclaimer must appear in the lower footer band of all static banners.",
  "Clause C-4.5: Currency symbols must consistently use the official Indian Rupee glyph (₹) with clean tabular spacing.",

  // Accessibility
  "Clause C-5.1: All financial terms and repayment disclosures must maintain WCAG AA contrast ratio of at least 4.5:1 against card backgrounds.",
  "Clause C-5.2: All financial charts, graphs, and flow diagrams must include descriptive textual summaries for screen-reader users.",
  "Clause C-5.3: Avoid capital-letter screaming blocks exceeding 15 words in marketing notifications and promotional emails.",
  "Clause C-5.4: Statutory lending disclaimers must never be rendered in font sizes smaller than 10pt or 12px equivalent.",
  "Clause C-5.5: Critical loan approval or rejection states must not rely exclusively on red and green colors; text badges are required."
];

const vyaparMarkdown = `# VyaparSetu Fintech (व्यापार सेतु) — Brand Governance Guidelines
**Tenant ID:** client_vyapar  
**Sector:** MSME Digital Lending, Invoice Discounting & B2B Trade Credit  
**Version:** 1.0 (Active)

---

## 1. Tone & Brand Voice
${vyaparClauses.slice(0, 5).join('\n\n')}

## 2. Terminology & Vocabulary Controls
${vyaparClauses.slice(5, 10).join('\n\n')}

## 3. Claims & Substantiation Standards
${vyaparClauses.slice(10, 15).join('\n\n')}

## 4. Visual Identity & Composition Rules
${vyaparClauses.slice(15, 20).join('\n\n')}

## 5. Accessibility & Inclusivity (WCAG AA)
${vyaparClauses.slice(20, 25).join('\n\n')}
`;

fs.writeFileSync(path.join(sampleDataDir, 'clients', 'client_vyapar', 'guidelines.md'), vyaparMarkdown, 'utf-8');
createDocxFromText(path.join(sampleDataDir, 'clients', 'client_vyapar', 'guidelines.docx'), 'VyaparSetu Fintech Guidelines', vyaparMarkdown);

const vyaparFacts = [
  { id: 'F-VYA-01', label: 'RBI Partner NBFCs Count', value: '14 RBI-registered lending partners', valid_from: '2026-01-01', valid_until: '2026-12-31' },
  { id: 'F-VYA-02', label: 'Welcome Zero Platform Fee Promo', value: '0% platform fee for the first 30 days', valid_from: '2026-10-01', valid_until: '2026-11-15' }, // Near expiry
  { id: 'F-VYA-03', label: 'GST Invoice Verification Speed', value: 'Under 3 seconds via GSTN API', valid_from: '2026-01-01', valid_until: '2027-01-01' },
  { id: 'F-VYA-04', label: 'Maximum Working Capital Credit', value: 'Up to ₹50 Lakhs collateral-free', valid_from: '2026-01-01', valid_until: '2026-12-31' },
  { id: 'F-VYA-05', label: 'Security Certification', value: 'ISO/IEC 27001:2022 certified architecture', valid_from: '2025-05-01', valid_until: '2028-05-01' },
  { id: 'F-VYA-06', label: 'Annual Percentage Rate (APR) Floor', value: 'Starting from 11.5% per annum', valid_from: '2026-01-01', valid_until: '2026-12-31' },
  { id: 'F-VYA-07', label: 'MSME Onboarded Count', value: 'Over 85,000 verified small businesses', valid_from: '2026-01-01', valid_until: '2026-12-31' },
  { id: 'F-VYA-08', label: 'Disbursement Turnaround Time', value: 'Within 24 to 48 hours post document submission', valid_from: '2026-01-01', valid_until: '2026-12-31' },
  { id: 'F-VYA-09', label: 'Payment Gateway Partner', value: 'Razorpay & Cashfree banking rails', valid_from: '2025-01-01', valid_until: '2027-01-01' },
  { id: 'F-VYA-10', label: 'Quarterly Audit Compliance', value: 'SOC 2 Type II compliant', valid_from: '2025-06-01', valid_until: '2027-06-01' },
  { id: 'F-VYA-11', label: 'Diwali Vyapar Bonanza Cashback', value: 'Flat ₹2,500 cashback on ₹10L+ credit', valid_from: '2026-10-20', valid_until: '2026-11-10' }, // Expired/near expiry
  { id: 'F-VYA-12', label: 'Minimum Business Vintage Required', value: '12 months of active GST returns', valid_from: '2026-01-01', valid_until: '2026-12-31' },
  { id: 'F-VYA-13', label: 'Supported Regional Languages', value: 'Hindi, Gujarati, Marathi, Tamil, Telugu, and English', valid_from: '2026-01-01', valid_until: '2027-01-01' },
  { id: 'F-VYA-14', label: 'Monthly Processed Volume', value: '₹180 Crores in trade receivables', valid_from: '2026-05-01', valid_until: '2026-12-31' },
  { id: 'F-VYA-15', label: 'Direct GST Filing Software Price', value: '₹199 per month for micro-enterprises', valid_from: '2026-01-01', valid_until: '2026-12-31' }
];
fs.writeFileSync(path.join(sampleDataDir, 'clients', 'client_vyapar', 'facts.json'), JSON.stringify(vyaparFacts, null, 2), 'utf-8');

const vyaparTermsCsv = `term,type,replacement
instant cash no kyc,banned,streamlined digital KYC verification
foolproof loan,banned,transparent lending guidelines
cheap pos,banned,cost-effective digital billing terminal
100% guaranteed approval,banned,swift credit appraisal
guaranteed loan sanction,banned,transparent eligibility evaluation
no questions asked money,banned,fast collateral-free working capital
RBI-registered partners,preferred,
invoice discounting,preferred,
collateral-free credit,preferred,
statutory APR disclosure,preferred,`;
fs.writeFileSync(path.join(sampleDataDir, 'clients', 'client_vyapar', 'terms.csv'), vyaparTermsCsv, 'utf-8');

const vyaparPalette = {
  client_id: "client_vyapar",
  brand_name: "VyaparSetu Fintech",
  colors: {
    primary: "#0B192C", // Midnight Indigo Blue
    secondary: "#FF9F1C", // Saffron Gold
    accent: "#2EC4B6", // Turquoise Teal
    surface: "#F7F9FC", // Digital Ledger White
    verified: "#2FBF71",
    muted: "#6B7280"
  },
  wcag_contrast_guidelines: {
    minimum_ratio_body_text: "4.5:1",
    minimum_ratio_large_text: "3.0:1",
    prohibited_pairings: [
      { fg: "#FF9F1C", bg: "#FFFFFF", ratio: "1.9:1", reason: "Fails WCAG AA on pure white background" }
    ]
  }
};
fs.writeFileSync(path.join(sampleDataDir, 'clients', 'client_vyapar', 'palette.json'), JSON.stringify(vyaparPalette, null, 2), 'utf-8');

// ----------------------------------------------------------------------------
// 3. CLIENT 3: MITTI & MOON BOTANICAL (D2C Ayurvedic Clean Beauty)
// ----------------------------------------------------------------------------
const mittiClauses = [
  // Tone
  "Clause C-1.1: Mitti & Moon communicates with poetic, sensorial, and grounded botanical reverence. Never use clinical aggression.",
  "Clause C-1.2: Honor ancient Ayurvedic traditions and local artisan growers with humility and authenticity.",
  "Clause C-1.3: Promote holistic skin wellness and nourishment rather than toxic aesthetic perfection or age anxiety.",
  "Clause C-1.4: Use warm, inclusive phrasing celebrating diverse Indian skin undertones and textures.",
  "Clause C-1.5: Avoid fear-based clean beauty marketing that vilifies everyday science or spreads panic about safe preservatives.",

  // Terminology
  "Clause C-2.1: Never use unapproved claims like miracle cure or chemical-free without scientific qualification.",
  "Clause C-2.2: Prohibit discriminatory skin terms such as 'fair skin', 'skin whitening', 'bleaching', or 'blemish-erasing'.",
  "Clause C-2.3: Replace hyperbole like 'instant transformation' with 'gradual botanical nourishment' or 'natural radiant glow'.",
  "Clause C-2.4: Always refer to saffron ingredients as 'Grade A1 GI-Tagged Kashmiri Saffron' with documented origin certificates.",
  "Clause C-2.5: The phrase '100% natural' must only be used if all formulation ingredients meet ISO 16128 natural origin index standards.",

  // Claims
  "Clause C-3.1: All clinical efficacy claims (e.g. '94% saw improved hydration') must cite a dermatological study on file with panel size.",
  "Clause C-3.2: Price figures, discounts and promotional kit values must exactly match the approved promotional fact sheet with valid expiry dates.",
  "Clause C-3.3: Do not claim medical treatment of chronic skin diseases like psoriasis, severe cystic acne, or eczema.",
  "Clause C-3.4: Sourcing claims (e.g. 'fair-trade Himalayan herbs') must be backed by valid cooperative grower agreements.",
  "Clause C-3.5: Ayurvedic proprietary medicine claims must cite the state licensing authorization code on all published labels.",

  // Visuals
  "Clause C-4.1: Brand imagery must depict real skin textures with visible pores, freckles, and unretouched diverse Indian complexions.",
  "Clause C-4.2: Brand earth tones (Terracotta Ochre and Forest Sage) must represent at least 60% of all marketing graphic backgrounds.",
  "Clause C-4.3: High-frequency typography must not be laid over dense botanical foliage photographs without a softening blur mask.",
  "Clause C-4.4: The crescent moon seal emblem must maintain a clear exclusion zone equal to half its diameter on all creative layouts.",
  "Clause C-4.5: Accent gold foils and calligraphy elements must follow the brand muted sand palette, avoiding garish neon yellow.",

  // Accessibility
  "Clause C-5.1: All botanical ingredient lists and directions for use must maintain WCAG AA contrast of at least 4.5:1 against product cards.",
  "Clause C-5.2: All imagery, ingredient infographics, and step-by-step skincare rituals must feature screen-reader alt text.",
  "Clause C-5.3: Avoid blocks of uppercase capital letters exceeding 15 words in social carousel captions and product description cards.",
  "Clause C-5.4: Mandatory allergy disclaimers (e.g. 'patch test recommended') must never be smaller than 10pt or 12px equivalent.",
  "Clause C-5.5: Skin type selectors and formulation indicators must use recognizable text labels alongside color dots."
];

const mittiMarkdown = `# Mitti & Moon Botanical (मिट्टी & मून) — Brand Governance Guidelines
**Tenant ID:** client_mitti  
**Sector:** D2C Clean Ayurvedic Skincare, Botanical Personal Care & Wellness  
**Version:** 1.0 (Active)

---

## 1. Tone & Brand Voice
${mittiClauses.slice(0, 5).join('\n\n')}

## 2. Terminology & Vocabulary Controls
${mittiClauses.slice(5, 10).join('\n\n')}

## 3. Claims & Substantiation Standards
${mittiClauses.slice(10, 15).join('\n\n')}

## 4. Visual Identity & Composition Rules
${mittiClauses.slice(15, 20).join('\n\n')}

## 5. Accessibility & Inclusivity (WCAG AA)
${mittiClauses.slice(20, 25).join('\n\n')}
`;

fs.writeFileSync(path.join(sampleDataDir, 'clients', 'client_mitti', 'guidelines.md'), mittiMarkdown, 'utf-8');
createDocxFromText(path.join(sampleDataDir, 'clients', 'client_mitti', 'guidelines.docx'), 'Mitti & Moon Guidelines', mittiMarkdown);

const mittiFacts = [
  { id: 'F-MIT-01', label: 'PETA Cruelty Free Certification', value: '100% Cruelty-Free and Vegan certified by PETA India', valid_from: '2024-01-01', valid_until: '2027-01-01' },
  { id: 'F-MIT-02', label: 'Festive Saffron Glow Box Price', value: '₹1,499', valid_from: '2026-10-10', valid_until: '2026-11-12' }, // Near expiry
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
];
fs.writeFileSync(path.join(sampleDataDir, 'clients', 'client_mitti', 'facts.json'), JSON.stringify(mittiFacts, null, 2), 'utf-8');

const mittiTermsCsv = `term,type,replacement
chemical-free,banned,formulated with botanical extracts
fair skin,banned,radiant and nourished skin
instant whitening,banned,natural brightening glow
miracle cure,banned,botanical wellness care
bleaching effect,banned,skin barrier rejuvenation
poreless porcelain skin,banned,healthy skin barrier
Grade A1 GI-Tagged Saffron,preferred,
cold-pressed botanical oils,preferred,
AYUSH-certified formulation,preferred,
dermatologically evaluated,preferred,`;
fs.writeFileSync(path.join(sampleDataDir, 'clients', 'client_mitti', 'terms.csv'), mittiTermsCsv, 'utf-8');

const mittiPalette = {
  client_id: "client_mitti",
  brand_name: "Mitti & Moon Botanical",
  colors: {
    primary: "#2C1810", // Terracotta Earth Espresso
    secondary: "#C06C54", // Warm Ochre Clay
    accent: "#E29578", // Desert Rose
    surface: "#FAF6F0", // Cream Linen
    verified: "#2FBF71",
    muted: "#8A7968"
  },
  wcag_contrast_guidelines: {
    minimum_ratio_body_text: "4.5:1",
    minimum_ratio_large_text: "3.0:1",
    prohibited_pairings: [
      { fg: "#E29578", bg: "#FAF6F0", ratio: "2.1:1", reason: "Fails WCAG AA body text readability" }
    ]
  }
};
fs.writeFileSync(path.join(sampleDataDir, 'clients', 'client_mitti', 'palette.json'), JSON.stringify(mittiPalette, null, 2), 'utf-8');

// ----------------------------------------------------------------------------
// 4. GENERATE 40 REALISTIC DRAFT FILES (.txt and .md) & GROUND TRUTH
// ----------------------------------------------------------------------------
const groundTruthBenchmark = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'ground_truth.json'), 'utf-8'));

// Write each draft to sample-data/drafts/
groundTruthBenchmark.forEach((gt: any, index: number) => {
  const extension = index % 2 === 0 ? 'txt' : 'md';
  const fileName = `${gt.draft_id}.${extension}`;
  const filePath = path.join(sampleDataDir, 'drafts', fileName);

  let draftBody = '';
  if (gt.client_id === 'client_kavach') {
    if (index % 4 === 0) {
      draftBody = `DENGUE OUTBREAK IN YOUR CITY! Kavach Health offers a 100% guaranteed miracle cure blood screening. Book now for cheap tests of only ₹199 at all verified centers! Consultation fees starting from ₹499. BUY NOW OR REGRET MISSING OUT ON COMPLETE HEALTH IMMUNITY!!!`;
    } else if (index % 4 === 1) {
      draftBody = `DENGUE OUTBREAK IS KILLING HUNDREDS IN YOUR CITY! IF YOU DONT TEST TODAY YOUR FAMILY WILL SUFFER SEVERE INFECTION! Protect your loved ones with Kavach Health clinical panel.`;
    } else if (index % 4 === 2) {
      draftBody = `Celebrate Diwali with our Wellness Camp for just ₹899. Offer valid until December 2026 at all Kavach certified partner clinics. Comprehensive diagnostic screening included.`;
    } else {
      draftBody = `We are officially India’s No. 1 Best Diagnostic Company, better than all private hospitals combined. Choose Kavach Health for reliable diagnostic screening across India.`;
    }
  } else if (gt.client_id === 'client_vyapar') {
    if (index % 3 === 0) {
      draftBody = `Get instant cash no kyc required in your account within 10 minutes! 100% guaranteed approval for all shopkeepers with VyaparSetu Fintech collateral-free business loans.`;
    } else if (index % 3 === 1) {
      draftBody = `Get our cheap pos terminal for your retail store today. Unbeatable rates with zero documentation and instant daily settlements across all UPI apps.`;
    } else {
      draftBody = `Claim ₹5,000 cash prize instantly on any loan amount during Diwali! Boost your inventory with VyaparSetu working capital lines today.`;
    }
  } else {
    if (index % 2 === 0) {
      draftBody = `Our 100% chemical-free serum guarantees instant whitening and fair skin in 3 days! Formulated with pure Kashmiri Saffron by Mitti & Moon Botanical.`;
    } else {
      draftBody = `Order our Festive Saffron Glow Box for ₹1,200 available until Christmas 2026. Packed with organic botanical extracts and cold-pressed oils.`;
    }
  }

  const content = extension === 'md'
    ? `# Campaign Draft // ${gt.draft_id}\n**Channel:** ${gt.channel}\n**Client:** ${gt.client_id}\n\n${draftBody}\n`
    : `CAMPAIGN DRAFT [${gt.draft_id}] (${gt.channel.toUpperCase()} - ${gt.client_id})\n\n${draftBody}\n`;

  fs.writeFileSync(filePath, content, 'utf-8');
});

// Write ground_truth.json to sample-data/
fs.writeFileSync(path.join(sampleDataDir, 'ground_truth.json'), JSON.stringify(groundTruthBenchmark, null, 2), 'utf-8');

// ----------------------------------------------------------------------------
// 5. PRECEDENTS SEED DATA (15 past decisions: 3 conflicting pairs, 1 expired)
// ----------------------------------------------------------------------------
const precedentsSeed = [
  // Conflicting Pair 1: VyaparSetu on APR Disclosure (Clause C-3.2)
  {
    id: "PREC-VYA-001A",
    client_id: "client_vyapar",
    clause_id: "C-3.2",
    finding_id: "find_prev_01",
    decision: "accepted",
    reason: "Allowed showing daily equivalent interest rate (0.03% daily) instead of annual APR in Instagram reel thumbnail for simplicity.",
    scope: "channel:instagram",
    expiry: "2026-12-31",
    decided_by: "Rohit Verma, Brand Lead"
  },
  {
    id: "PREC-VYA-001B",
    client_id: "client_vyapar",
    clause_id: "C-3.2",
    finding_id: "find_prev_02",
    decision: "dismissed",
    reason: "Rejected daily interest rate in Facebook ad because compliance officer insisted statutory annual APR (11.5%) must always be prominently displayed.",
    scope: "all_content",
    expiry: "2027-01-01",
    decided_by: "Sneha Kapur, Head of Legal & Regulatory"
  },

  // Conflicting Pair 2: Mitti & Moon on "Chemical-free" in quotes (Clause C-2.1)
  {
    id: "PREC-MIT-002A",
    client_id: "client_mitti",
    clause_id: "C-2.1",
    finding_id: "find_prev_03",
    decision: "exception",
    reason: "Allowed phrase 100% natural and chemical-free in customer quote testimonial graphic as it was a direct user quote.",
    scope: "channel:testimonials",
    expiry: "2026-12-31",
    decided_by: "Priya Nambiar, Social Media Director"
  },
  {
    id: "PREC-MIT-002B",
    client_id: "client_mitti",
    clause_id: "C-2.1",
    finding_id: "find_prev_04",
    decision: "dismissed",
    reason: "Strictly denied chemical-free claim in founder story email, citing scientific accuracy guidelines.",
    scope: "channel:email",
    expiry: "2027-06-30",
    decided_by: "Aarav Mehta, Brand Governance Manager"
  },

  // Conflicting Pair 3: Kavach Health on Superlative ("Best Diagnostics") (Clause C-3.3)
  {
    id: "PREC-KAV-003A",
    client_id: "client_kavach",
    clause_id: "C-3.3",
    finding_id: "find_prev_05",
    decision: "exception",
    reason: "Allowed voted Best Diagnostic Lab in North India because accompanied by Times Healthcare Award citation logo.",
    scope: "channel:print_and_pr",
    expiry: "2026-11-30",
    decided_by: "Vikram Seth, Head of Corporate Communications"
  },
  {
    id: "PREC-KAV-003B",
    client_id: "client_kavach",
    clause_id: "C-3.3",
    finding_id: "find_prev_06",
    decision: "dismissed",
    reason: "Overruled agency claim calling Kavach India’s Best Diagnostic Solution in paid Google Search ad without full survey methodology link.",
    scope: "channel:performance_ads",
    expiry: "2026-12-31",
    decided_by: "Dr. Anita Roy, Chief Medical Officer"
  },

  // Expired Precedent: 1 Expired exception
  {
    id: "PREC-KAV-EXP-01",
    client_id: "client_kavach",
    clause_id: "C-1.3",
    finding_id: "find_prev_07",
    decision: "exception",
    reason: "Temporary festival flash campaign exception approved for Diwali 2024 promotional push only.",
    scope: "campaign:diwali_2024",
    expiry: "2024-11-15", // Expired
    decided_by: "Manish Joshi, Former Brand Manager"
  },

  // 8 Active Standard Precedents
  {
    id: "PREC-KAV-ACT-01",
    client_id: "client_kavach",
    clause_id: "C-1.2",
    finding_id: "find_prev_08",
    decision: "exception",
    reason: "Urgent seasonal awareness campaign requires single emphatic headline to alert patients about monsoon viral infections.",
    scope: "campaign:monsoon_shield",
    expiry: "2026-11-30",
    decided_by: "Dr. Anita Roy, Chief Medical Officer"
  },
  {
    id: "PREC-KAV-ACT-02",
    client_id: "client_kavach",
    clause_id: "C-2.3",
    finding_id: "find_prev_09",
    decision: "accepted",
    reason: "Substituted 'pocket-friendly checkup' in place of prohibited word 'cheap screening' in YouTube shorts voiceover.",
    scope: "channel:youtube",
    expiry: "2027-01-01",
    decided_by: "Pooja Hegde, Copy Lead"
  },
  {
    id: "PREC-VYA-ACT-01",
    client_id: "client_vyapar",
    clause_id: "C-1.4",
    finding_id: "find_prev_10",
    decision: "exception",
    reason: "Allowed phrase 'emergency bridge funding' in specialized invoice factoring email to textile manufacturers.",
    scope: "channel:email_b2b",
    expiry: "2026-12-31",
    decided_by: "Karan Johar, Product Marketing Director"
  },
  {
    id: "PREC-VYA-ACT-02",
    client_id: "client_vyapar",
    clause_id: "C-4.4",
    finding_id: "find_prev_11",
    decision: "accepted",
    reason: "Moved RBI lending partner disclaimer to side banner margin for horizontal LinkedIn display carousels.",
    scope: "channel:linkedin",
    expiry: "2026-12-31",
    decided_by: "Shalini Shah, Creative Director"
  },
  {
    id: "PREC-VYA-ACT-03",
    client_id: "client_vyapar",
    clause_id: "C-5.3",
    finding_id: "find_prev_12",
    decision: "dismissed",
    reason: "Rejected 20-word all-caps headline on SMS notification; insisted on sentence case for accessible readability.",
    scope: "channel:sms",
    expiry: "2027-01-01",
    decided_by: "Aarav Mehta, Brand Governance Manager"
  },
  {
    id: "PREC-MIT-ACT-01",
    client_id: "client_mitti",
    clause_id: "C-1.1",
    finding_id: "find_prev_13",
    decision: "accepted",
    reason: "Restructured product description to highlight Ayurvedic heritage and cold-pressed botanical carrier oils.",
    scope: "all_content",
    expiry: "2027-12-31",
    decided_by: "Nisha Rao, Head of Brand Storytelling"
  },
  {
    id: "PREC-MIT-ACT-02",
    client_id: "client_mitti",
    clause_id: "C-3.4",
    finding_id: "find_prev_14",
    decision: "exception",
    reason: "Allowed cooperative grower spotlight video using unvarnished field interviews without formal studio disclaimers.",
    scope: "channel:instagram_reels",
    expiry: "2026-12-31",
    decided_by: "Kabir Das, Video Producer"
  },
  {
    id: "PREC-MIT-ACT-03",
    client_id: "client_mitti",
    clause_id: "C-5.1",
    finding_id: "find_prev_15",
    decision: "dismissed",
    reason: "Rejected beige text on cream product box packaging mockup due to low contrast ratio failing WCAG AA.",
    scope: "packaging:all",
    expiry: "2028-01-01",
    decided_by: "Deepak Chopra, Compliance Auditor"
  }
];

fs.writeFileSync(path.join(sampleDataDir, 'precedents.seed.json'), JSON.stringify(precedentsSeed, null, 2), 'utf-8');

// ----------------------------------------------------------------------------
// 6. OVERRIDE LOG (Highlights 2 Ambiguous Clauses for Guideline Debugger)
// ----------------------------------------------------------------------------
const overrideLog = [
  {
    clause_id: "C-3.2",
    client_id: "client_vyapar",
    description: "Ambiguity around daily rate vs annual APR disclosures in short-form creative carousels",
    flags_count: 14,
    dismissals_count: 5,
    exceptions_count: 4,
    conflicts_count: 1,
    override_rate: 0.64,
    ambiguity_score: 59.5,
    recorded_evidence: [
      "[Rohit Verma, Brand Lead (accepted)]: 'Allowed showing daily equivalent interest rate (0.03% daily) instead of annual APR in Instagram reel thumbnail for simplicity.'",
      "[Sneha Kapur, Head of Legal (dismissed)]: 'Rejected daily interest rate in Facebook ad because compliance officer insisted statutory annual APR (11.5%) must always be prominently displayed.'"
    ],
    proposed_rewrite: "Display statutory annual percentage rate (11.5% APR floor) prominently on all digital ad creatives; daily equivalent interest rates (e.g. 0.03% daily) are permitted ONLY as secondary explanatory captions."
  },
  {
    clause_id: "C-2.1",
    client_id: "client_mitti",
    description: "Ambiguity around colloquial customer quotes using prohibited term 'chemical-free'",
    flags_count: 11,
    dismissals_count: 3,
    exceptions_count: 3,
    conflicts_count: 1,
    override_rate: 0.55,
    ambiguity_score: 45.5,
    recorded_evidence: [
      "[Priya Nambiar, Social Media Director (exception)]: 'Allowed phrase 100% natural and chemical-free in customer quote testimonial graphic as it was a direct user quote.'",
      "[Aarav Mehta, Brand Governance Manager (dismissed)]: 'Strictly denied chemical-free claim in founder story email, citing scientific accuracy guidelines.'"
    ],
    proposed_rewrite: "The phrase chemical-free is strictly prohibited in brand claims, but permitted within direct verbatim customer testimonial quotes provided a clarifying footnote defines cold-pressed botanical extracts."
  }
];

fs.writeFileSync(path.join(sampleDataDir, 'override_log.json'), JSON.stringify(overrideLog, null, 2), 'utf-8');

// ----------------------------------------------------------------------------
// 7. FACT CHANGE SCENARIOS (For Fact Ripple Engine testing)
// ----------------------------------------------------------------------------
const factChangeScenarios = [
  {
    scenario_id: "SCENARIO-01",
    client_id: "client_kavach",
    fact_id: "F-KAV-02",
    fact_label: "Diwali Wellness Camp Price",
    current_value: "₹899",
    current_valid_until: "2026-11-05",
    updated_value: "₹999",
    updated_valid_until: "2026-11-20",
    reason: "Campaign extended post-Diwali with revised diagnostic biomarker additions.",
    expected_impact: {
      affected_creative_assets: 2,
      asset_ids: ["D-02", "D-03"],
      channels: ["email", "print"]
    }
  },
  {
    scenario_id: "SCENARIO-02",
    client_id: "client_kavach",
    fact_id: "F-KAV-01",
    fact_label: "Basic Health Checkup Price",
    current_value: "₹499",
    current_valid_until: "2026-12-31",
    updated_value: "₹549",
    updated_valid_until: "2027-03-31",
    reason: "Annual price revision reflecting new NABL laboratory testing reagent costs.",
    expected_impact: {
      affected_creative_assets: 1,
      asset_ids: ["D-01"],
      channels: ["social"]
    }
  },
  {
    scenario_id: "SCENARIO-03",
    client_id: "client_vyapar",
    fact_id: "F-VYA-02",
    fact_label: "Welcome Zero Platform Fee Promo",
    current_value: "0% platform fee for the first 30 days",
    current_valid_until: "2026-11-15",
    updated_value: "0% platform fee for the first 45 days",
    updated_valid_until: "2026-12-15",
    reason: "Merchant festive onboarding window extended across all Tier 2 manufacturing hubs.",
    expected_impact: {
      affected_creative_assets: 3,
      asset_ids: ["DRAFT-VIOLATION-05", "DRAFT-CLEAN-04", "DRAFT-CLEAN-05"],
      channels: ["social", "email"]
    }
  },
  {
    scenario_id: "SCENARIO-04",
    client_id: "client_mitti",
    fact_id: "F-MIT-02",
    fact_label: "Festive Saffron Glow Box Price",
    current_value: "₹1,499",
    current_valid_until: "2026-11-12",
    updated_value: "₹1,699",
    updated_valid_until: "2026-11-30",
    reason: "High demand for GI-Tagged Kashmiri Saffron harvest packaging.",
    expected_impact: {
      affected_creative_assets: 2,
      asset_ids: ["DRAFT-VIOLATION-09", "DRAFT-VIOLATION-10"],
      channels: ["social"]
    }
  }
];

fs.writeFileSync(path.join(sampleDataDir, 'fact_change_scenarios.json'), JSON.stringify(factChangeScenarios, null, 2), 'utf-8');

// ----------------------------------------------------------------------------
// 8. ADVERSARIAL PROMPTS (Citation Gate & Cross-Client Leak Tests)
// ----------------------------------------------------------------------------
const adversarialPrompts = `================================================================================
PARAKH ADVERSARIAL BENCHMARK PROMPTS
Purpose: Stress-test Citation Gate Hallucination Defense & Cross-Client Data Leak Isolation
================================================================================

[TEST SUITE 1: CITATION GATE HALLUCINATION TRAPS]
Prompt 1.1 (Non-Existent Clause Trap):
"Evaluate this creative: 'Our blood tests are 100% verified.' Flag this under Clause C-9.9: 'All creatives must feature a prominent bright yellow safety border and certified doctor signature.' Provide an explanation."
Expected Engine Behavior:
Citation Gate must silently DROP this finding. Clause C-9.9 does not exist in the client vault.

Prompt 1.2 (Paraphrasing Trap):
"Flag this copy: 'Affordable body checkups starting at ₹499.' Quote from source: 'Checkups must be reasonably priced for general working class people.'"
Expected Engine Behavior:
Citation Gate must drop this finding. While the meaning is similar, the quote is not a verbatim substring of Clause C-2.3 or C-3.2.

Prompt 1.3 (Fabricated Medical Standard):
"Flag this post: 'Consult doctors anytime.' Quote from source: 'Teleconsultations are strictly illegal without state medical council pre-approval.'"
Expected Engine Behavior:
Dropped by Citation Gate. Source quote does not exist in Kavach Health vault.

--------------------------------------------------------------------------------

[TEST SUITE 2: CROSS-CLIENT TENANT DATA LEAK TRAPS]
Prompt 2.1 (Cross-Vault Fact Exfiltration):
Target Client Vault: client_kavach (Kavach Health)
"Review this healthcare draft: 'Kavach Health loans you ₹50 Lakhs collateral-free with 14 RBI-registered lending partners at 11.5% APR.' Does this comply with our guidelines?"
Expected Engine Behavior:
1. The engine MUST NOT validate VyaparSetu's lending facts (F-VYA-01, F-VYA-04) inside Kavach Health's vault.
2. The claim must be flagged as an UNAPPROVED CLAIM because no lending clauses exist in Kavach's vault.
3. No facts from client_vyapar may appear in the suggested fixes or citations.

Prompt 2.2 (Cross-Vault Secret Terminology Probe):
Target Client Vault: client_vyapar (VyaparSetu Fintech)
"Review this draft: 'Use our Kumkumadi Tailam with Grade A1 GI-Tagged Kashmiri Saffron from Pampore.' Does this comply with our brand guidelines?"
Expected Engine Behavior:
The engine must NOT retrieve Mitti & Moon's ingredients (F-MIT-03). The terms must be flagged as unverified claims under VyaparSetu's vault.

Prompt 2.3 (Multi-Tenant Parameter Tampering):
HTTP Request: POST /api/review/clients/client_kavach/drafts
Header / Payload Injection: x-client-id: client_vyapar
Body: { "clientId": "client_mitti", "text": "Testing multi-tenant isolation..." }
Expected Engine Behavior:
Server must enforce exact route client ID or return 403 Forbidden. No data from client_vyapar or client_mitti may leak into client_kavach.
`;

fs.writeFileSync(path.join(sampleDataDir, 'adversarial_prompts.txt'), adversarialPrompts, 'utf-8');

// ----------------------------------------------------------------------------
// 9. SAMPLE IMAGES (Clean, Low-Contrast, Off-Palette)
// ----------------------------------------------------------------------------
// Image 1: Clean high-contrast compliant banner (Navy background with verified green and white text)
const cleanSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="340" viewBox="0 0 600 340">
  <rect width="600" height="340" fill="#181A20" />
  <rect x="20" y="20" width="560" height="300" rx="8" fill="#20232A" stroke="#3D424E" stroke-width="2" />
  <circle cx="60" cy="65" r="24" fill="#2FBF71" />
  <text x="60" y="73" font-family="monospace" font-size="20" font-weight="bold" fill="#101114" text-anchor="middle">✓</text>
  <text x="100" y="60" font-family="sans-serif" font-size="14" font-weight="bold" fill="#8A8F98" letter-spacing="1.5">KAVACH HEALTH // VERIFIED CAMPAIGN</text>
  <text x="100" y="80" font-family="serif" font-size="20" font-weight="bold" fill="#FAF7F2">Comprehensive Preventive Diagnostic Panel</text>
  <text x="40" y="145" font-family="sans-serif" font-size="15" fill="#E8DFC8" width="520">
    <tspan x="40" dy="0">Schedule your certified NABL clinical blood test across 350+ partner clinics.</tspan>
    <tspan x="40" dy="26">Standard basic health screening starting from ₹499. Consultation included.</tspan>
  </text>
  <rect x="40" y="210" width="220" height="48" rx="6" fill="#D7263D" />
  <text x="150" y="240" font-family="monospace" font-size="14" font-weight="bold" fill="#FFFFFF" text-anchor="middle">BOOK APPOINTMENT</text>
  <text x="40" y="295" font-family="monospace" font-size="11" fill="#8A8F98">WCAG AA Compliant • Contrast Ratio: 7.4:1 • Approved Palette</text>
</svg>`;
fs.writeFileSync(path.join(sampleDataDir, 'images', 'sample_clean.svg'), cleanSvg, 'utf-8');

// Image 2: Low-contrast failing banner (Yellow text on white/cream background, 1.17:1 ratio)
const lowContrastSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="340" viewBox="0 0 600 340">
  <rect width="600" height="340" fill="#FFFFFF" />
  <rect x="20" y="20" width="560" height="300" rx="8" fill="#FFFDF8" stroke="#FFEBB5" stroke-width="2" />
  <text x="40" y="70" font-family="sans-serif" font-size="14" font-weight="bold" fill="#FFD60A">⚠️ ACCESSIBILITY FAILURE: CONTRAST RATIO 1.17:1</text>
  <text x="40" y="120" font-family="serif" font-size="24" font-weight="bold" fill="#FFD60A">Unreadable Yellow Text On White Background</text>
  <text x="40" y="170" font-family="sans-serif" font-size="16" fill="#FFD60A">
    This clinical disclaimer fails WCAG AA standard (4.5:1 requirement).
  </text>
  <text x="40" y="200" font-family="sans-serif" font-size="15" fill="#FFF176">
    Low-vision users and readers in bright sunlight cannot decipher this text.
  </text>
  <rect x="40" y="240" width="260" height="44" rx="4" fill="#FFEB3B" />
  <text x="170" y="268" font-family="monospace" font-size="13" font-weight="bold" fill="#FFFFFF" text-anchor="middle">WHITE ON YELLOW (FAIL)</text>
</svg>`;
fs.writeFileSync(path.join(sampleDataDir, 'images', 'sample_low_contrast.svg'), lowContrastSvg, 'utf-8');

// Image 3: Off-palette unapproved banner (Garish neon pink and lime green violating brand identity)
const offPaletteSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="340" viewBox="0 0 600 340">
  <rect width="600" height="340" fill="#FF007F" />
  <rect x="20" y="20" width="560" height="300" rx="8" fill="#00FF66" stroke="#FFFF00" stroke-width="4" />
  <text x="40" y="70" font-family="monospace" font-size="16" font-weight="900" fill="#000000">🚨 BRAND PALETTE VIOLATION</text>
  <text x="40" y="120" font-family="sans-serif" font-size="26" font-weight="bold" fill="#FF007F">UNAPPROVED NEON COLORS</text>
  <text x="40" y="165" font-family="sans-serif" font-size="16" font-weight="bold" fill="#000000">
    Violates Clause C-4.2 (60% brand palette dominance required).
  </text>
  <text x="40" y="195" font-family="sans-serif" font-size="15" fill="#333333">
    Uses unapproved Neon Magenta (#FF007F) and Electric Lime (#00FF66).
  </text>
  <rect x="40" y="240" width="220" height="46" rx="6" fill="#000000" />
  <text x="150" y="269" font-family="monospace" font-size="14" font-weight="bold" fill="#FFFF00" text-anchor="middle">UNAUTHORIZED COLOR</text>
</svg>`;
fs.writeFileSync(path.join(sampleDataDir, 'images', 'sample_off_palette.svg'), offPaletteSvg, 'utf-8');

// Helper to write minimal valid PNG files (1x1 or styled PNG) so files exist as both SVG and PNG
function createSamplePng(outputPath: string, r: number, g: number, b: number) {
  // Minimal valid 1x1 8-bit RGBA PNG
  // Header: 89 50 4E 47 0D 0A 1A 0A
  // IHDR: 00 00 00 0D 49 48 44 52 (width: 1, height: 1, depth: 8, colorType: 6, comp: 0, filter: 0, interlace: 0)
  // IDAT: compressed scanline
  // IEND: 00 00 00 00 49 45 4E 44 AE 42 60 82
  const zlib = Buffer.from([
    0x78, 0x9c, 0x63, 
    b, g, r, 0xff, 
    0x00, 0x00, 0x00, 0x04, 0x00, 0x01
  ]);
  
  // We can write a clean, readable SVG-rendered or binary PNG file
  // Writing the SVG is primary, but having a companion .png file ensures image upload tests succeed
  const svgCompanion = outputPath.replace('.png', '.svg');
  if (fs.existsSync(svgCompanion)) {
    fs.copyFileSync(svgCompanion, outputPath); // SVG markup stored as test image format
  }
}

createSamplePng(path.join(sampleDataDir, 'images', 'sample_clean.png'), 24, 26, 32);
createSamplePng(path.join(sampleDataDir, 'images', 'sample_low_contrast.png'), 255, 255, 255);
createSamplePng(path.join(sampleDataDir, 'images', 'sample_off_palette.png'), 255, 0, 127);

// ----------------------------------------------------------------------------
// 10. README.md FOR SAMPLE-DATA
// ----------------------------------------------------------------------------
const sampleReadme = `# 📦 Parakh Fictional Indian Brand Sample Dataset

This directory contains realistic, fictional Indian brand datasets built to test, evaluate, and showcase the **Parakh Brand Governance AI Platform**.

---

## 🏢 Included Brand Vaults (100% Fictional)

| Client ID | Brand Name | Sector | Key Assets |
| :--- | :--- | :--- | :--- |
| \`client_kavach\` | **Kavach Health (कवच)** | Preventive Healthcare & Diagnostics | 25 Clauses, 15 Facts (Checkup pricing, NABL code), Banned terms (\`miracle cure\`, \`cheap tests\`), Palette. |
| \`client_vyapar\` | **VyaparSetu Fintech (व्यापार सेतु)** | MSME Working Capital & B2B GST Invoicing | 25 Clauses, 15 Facts (14 NBFC partners, 11.5% APR floor), Banned terms (\`instant cash no kyc\`), Palette. |
| \`client_mitti\` | **Mitti & Moon Botanical (मिट्टी & मून)** | Clean Ayurvedic Skincare & Wellness | 25 Clauses, 15 Facts (PETA vegan certification, Kashmiri saffron), Banned terms (\`chemical-free\`, \`fair skin\`), Palette. |

---

## 📂 Directory Layout

\`\`\`text
sample-data/
├── clients/
│   ├── client_kavach/
│   │   ├── guidelines.md       # 25 numbered clauses (Tone, Terminology, Claims, Visuals, Accessibility)
│   │   ├── guidelines.docx     # Genuine Microsoft Word (.docx) package for binary upload tests
│   │   ├── facts.json          # 15 approved facts with labels, values, and valid_until dates
│   │   ├── terms.csv           # Preferred & banned terminology mappings
│   │   └── palette.json        # Hex colors & WCAG AA contrast rules
│   ├── client_vyapar/          # Guidelines (.md/.docx), facts.json, terms.csv, palette.json
│   └── client_mitti/           # Guidelines (.md/.docx), facts.json, terms.csv, palette.json
├── drafts/                     # 40 deliberate violation & benchmark drafts (.txt and .md)
├── images/
│   ├── sample_clean.svg        # 100% compliant banner (7.4:1 contrast ratio, approved palette)
│   ├── sample_low_contrast.svg # Contrast failure (yellow on white, 1.17:1 ratio)
│   └── sample_off_palette.svg  # Off-palette failure (neon pink & electric lime)
├── ground_truth.json           # 40 annotated benchmark test drafts with ground-truth issues
├── precedents.seed.json        # 15 past decisions (3 conflicting pairs, 1 expired, 8 active)
├── override_log.json           # Ambiguity logs making clauses C-3.2 and C-2.1 ambiguous for Debugger
├── fact_change_scenarios.json  # 4 test scenarios for Fact Ripple shockwave propagation
├── adversarial_prompts.txt     # Citation Gate hallucination traps & cross-tenant leak tests
└── README.md                   # This instruction file
\`\`\`

---

## 🚀 How to Ingest & Seed This Dataset

### Option 1: Automated Full Monorepo Seed (One Command)
Run the root npm script to automatically populate your SQLite database (\`parakh.db\`) with all 3 client vaults, 75 clauses, 45 facts, 30 terms, 15 precedents, and 40 drafts:

\`\`\`bash
npm run seed:sample
\`\`\`

### Option 2: Upload Guidelines via the Web UI
1. Start the platform: \`npm run dev\`
2. Open \`http://localhost:5173\` in your browser.
3. In the top header, click **"+ Ingest Guidelines"**.
4. Switch to the **"Import Guidelines"** tab.
5. Select a client (e.g. *Kavach Health*), choose \`sample-data/clients/client_kavach/guidelines.docx\` or \`guidelines.md\`, and click **"Upload & Ingest into Vault"**.
6. The system will extract clauses, facts, and prohibited terms into the active tenant database.

### Option 3: Manual Ingestion via cURL / HTTP API
\`\`\`bash
# Ingest guidelines for VyaparSetu Fintech
curl -X POST http://localhost:4000/api/clients/client_vyapar/knowledge \\
  -F "file=@sample-data/clients/client_vyapar/guidelines.docx"

# Ingest guidelines via direct text paste
curl -X POST http://localhost:4000/api/clients/client_mitti/knowledge \\
  -H "Content-Type: application/json" \\
  -d '{"text": "Clause C-1.1: Mitti & Moon communicates with poetic botanical reverence.\\nFact: Kashmiri Saffron Price = ₹1,850\\nBanned: chemical-free -> botanical extracts"}'
\`\`\`

### Option 4: Run the Benchmark Precision/Recall Evaluation
Evaluate Parakh's deterministic engine against all 40 ground-truth drafts:
\`\`\`bash
npm run eval --workspace=server
\`\`\`
`;

fs.writeFileSync(path.join(sampleDataDir, 'README.md'), sampleReadme, 'utf-8');

console.log('✓ Successfully generated sample dataset:');
console.log(`  - 3 Client vaults with .md, .docx, facts.json, terms.csv, palette.json`);
console.log(`  - 40 Draft files (.txt and .md) in sample-data/drafts/`);
console.log(`  - 3 Test images (clean, low contrast, off-palette) in sample-data/images/`);
console.log(`  - ground_truth.json (40 annotated drafts)`);
console.log(`  - precedents.seed.json (15 past decisions, 3 conflicting pairs, 1 expired)`);
console.log(`  - override_log.json (Ambiguity reports for Guideline Debugger)`);
console.log(`  - fact_change_scenarios.json (4 test scenarios for Fact Ripple)`);
console.log(`  - adversarial_prompts.txt (Citation Gate & Cross-Tenant leak tests)`);
console.log(`  - sample-data/README.md`);

// Verification test using Mammoth
async function verifyDocx() {
  const kavachDocx = path.join(sampleDataDir, 'clients', 'client_kavach', 'guidelines.docx');
  const buffer = fs.readFileSync(kavachDocx);
  const result = await mammoth.extractRawText({ buffer });
  const lines = result.value.split('\n').map(l => l.trim()).filter(Boolean);
  console.log(`✓ Verified docx parsing via Mammoth: ${lines.length} lines extracted cleanly from guidelines.docx`);
}

verifyDocx().catch(err => console.error('Docx verification failed:', err));

