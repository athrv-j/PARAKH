import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { runMigrations } from '../db/index.js';
import { VaultDb } from '../db/vaultDb.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../../');
const sampleDataDir = path.resolve(rootDir, 'sample-data');

export function loadSampleDataIntoDb(dbPath?: string) {
  const targetDbPath = dbPath || path.resolve(rootDir, 'server', 'parakh.db');
  console.log('🏛️  Loading Parakh Sample Dataset into database:', targetDbPath);

  const db = new DatabaseSync(targetDbPath);
  runMigrations(db);
  const vault = new VaultDb(db);

  // 1. Load Clients
  const clientDirs = [
    { id: 'client_kavach', name: 'Kavach Health', dir: 'client_kavach' },
    { id: 'client_vyapar', name: 'VyaparSetu Fintech', dir: 'client_vyapar' },
    { id: 'client_mitti', name: 'Mitti & Moon Botanical', dir: 'client_mitti' }
  ];

  let totalClauses = 0;
  let totalFacts = 0;
  let totalTerms = 0;

  for (const client of clientDirs) {
    db.prepare('INSERT OR REPLACE INTO clients (id, name) VALUES (?, ?)').run(client.id, client.name);
    const clientPath = path.join(sampleDataDir, 'clients', client.dir);

    // Load Guidelines (.md)
    const mdPath = path.join(clientPath, 'guidelines.md');
    if (fs.existsSync(mdPath)) {
      const content = fs.readFileSync(mdPath, 'utf-8');
      const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      let currentCategory = 'tone';

      const insertClauseStmt = db.prepare(`
        INSERT OR REPLACE INTO clauses (id, client_id, version, category, text, is_active)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const line of lines) {
        const lower = line.toLowerCase();
        if (lower.includes('## 1. tone')) currentCategory = 'tone';
        else if (lower.includes('## 2. terminology')) currentCategory = 'terminology';
        else if (lower.includes('## 3. claims')) currentCategory = 'claims';
        else if (lower.includes('## 4. visual')) currentCategory = 'visuals';
        else if (lower.includes('## 5. accessib')) currentCategory = 'accessibility';

        const match = line.match(/^Clause\s+(C-\d+\.\d+):\s*(.+)$/i);
        if (match) {
          const clauseId = match[1].toUpperCase();
          const clauseText = match[2].trim();
          insertClauseStmt.run(clauseId, client.id, 1, currentCategory, clauseText, 1);
          totalClauses++;
        }
      }
    }

    // Load Facts (.json)
    const factsPath = path.join(clientPath, 'facts.json');
    if (fs.existsSync(factsPath)) {
      const facts = JSON.parse(fs.readFileSync(factsPath, 'utf-8'));
      const insertFactStmt = db.prepare(`
        INSERT OR REPLACE INTO facts (id, client_id, label, value, valid_from, valid_until)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      for (const f of facts) {
        insertFactStmt.run(f.id, client.id, f.label, f.value, f.valid_from || null, f.valid_until || null);
        totalFacts++;
      }
    }

    // Load Terms (.csv)
    const termsPath = path.join(clientPath, 'terms.csv');
    if (fs.existsSync(termsPath)) {
      const lines = fs.readFileSync(termsPath, 'utf-8').split(/\r?\n/).slice(1).filter(Boolean);
      let tIdx = 1;
      const insertTermStmt = db.prepare(`
        INSERT OR REPLACE INTO terms (id, client_id, term, type, replacement)
        VALUES (?, ?, ?, ?, ?)
      `);
      for (const line of lines) {
        const [term, type, replacement] = line.split(',');
        if (term && type) {
          insertTermStmt.run(
            `T-${client.id.replace('client_', '').toUpperCase()}-${String(tIdx++).padStart(2, '0')}`,
            client.id,
            term.trim(),
            type.trim() === 'preferred' ? 'preferred' : 'banned',
            replacement ? replacement.trim() : null
          );
          totalTerms++;
        }
      }
    }

    // Load Palette (.json)
    const palettePath = path.join(clientPath, 'palette.json');
    if (fs.existsSync(palettePath)) {
      const pal = JSON.parse(fs.readFileSync(palettePath, 'utf-8'));
      db.prepare(`
        INSERT OR REPLACE INTO assets (id, client_id, kind, palette_values, notes)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        `PAL-${client.id.toUpperCase()}`,
        client.id,
        'palette',
        JSON.stringify(pal.colors),
        JSON.stringify(pal.wcag_contrast_guidelines)
      );
    }
  }

  // 2. Load Precedents (.json)
  let totalPrecedents = 0;
  const precedentsPath = path.join(sampleDataDir, 'precedents.seed.json');
  if (fs.existsSync(precedentsPath)) {
    const precedents = JSON.parse(fs.readFileSync(precedentsPath, 'utf-8'));
    const insertPrecedentStmt = db.prepare(`
      INSERT OR REPLACE INTO precedents (
        id, client_id, clause_id, finding_id, decision, reason, scope, expiry, decided_by, embedding
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const p of precedents) {
      insertPrecedentStmt.run(
        p.id,
        p.client_id,
        p.clause_id,
        p.finding_id || null,
        p.decision,
        p.reason,
        p.scope,
        p.expiry || null,
        p.decided_by,
        p.embedding || null
      );
      totalPrecedents++;
    }
  }

  // 3. Load Drafts (.txt and .md) from ground_truth.json
  let totalDrafts = 0;
  const gtPath = path.join(sampleDataDir, 'ground_truth.json');
  if (fs.existsSync(gtPath)) {
    const groundTruth = JSON.parse(fs.readFileSync(gtPath, 'utf-8'));
    const insertDraftStmt = db.prepare(`
      INSERT OR REPLACE INTO drafts (id, client_id, title, channel, status, author)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const insertVersionStmt = db.prepare(`
      INSERT OR REPLACE INTO draft_versions (id, draft_id, client_id, version_num, text_content, file_path)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const item of groundTruth) {
      const txtPath = path.join(sampleDataDir, 'drafts', `${item.draft_id}.txt`);
      const mdPath = path.join(sampleDataDir, 'drafts', `${item.draft_id}.md`);
      const filePath = fs.existsSync(txtPath) ? txtPath : fs.existsSync(mdPath) ? mdPath : null;

      let draftText = 'Sample campaign draft text';
      if (filePath) {
        draftText = fs.readFileSync(filePath, 'utf-8');
      }

      const title = `Campaign Draft ${item.draft_id.replace('DRAFT-', '')}`;
      insertDraftStmt.run(item.draft_id, item.client_id, title, item.channel, 'in_review', 'Agency Copywriter');
      insertVersionStmt.run(`VER-${item.draft_id}-1`, item.draft_id, item.client_id, 1, draftText, filePath);
      totalDrafts++;
    }
  }

  console.log('✓ Successfully seeded sample dataset into SQLite database:');
  console.log(`  - Clients:     ${clientDirs.length}`);
  console.log(`  - Clauses:     ${totalClauses}`);
  console.log(`  - Facts:       ${totalFacts}`);
  console.log(`  - Terms:       ${totalTerms}`);
  console.log(`  - Precedents:  ${totalPrecedents}`);
  console.log(`  - Drafts:      ${totalDrafts}`);

  return {
    clients: clientDirs.length,
    clauses: totalClauses,
    facts: totalFacts,
    terms: totalTerms,
    precedents: totalPrecedents,
    drafts: totalDrafts
  };
}

if (process.argv[1]?.endsWith('seedSampleData.ts') || process.argv[1]?.endsWith('seedSampleData.js')) {
  loadSampleDataIntoDb();
}
