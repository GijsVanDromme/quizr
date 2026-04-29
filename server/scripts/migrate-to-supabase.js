// Migration script: import data from server/data/db.json into Supabase quizzes table
// Run with: node scripts/migrate-to-supabase.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');

async function main() {
  if (!fs.existsSync(DB_PATH)) {
    console.error('No db.json found at', DB_PATH);
    process.exit(1);
  }

  const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  const quizzes = db.quizzes || [];

  console.log(`Migrating ${quizzes.length} quiz(zes) to Supabase...`);

  for (const q of quizzes) {
    const row = {
      id: q.id,
      title: q.title || 'Untitled Quiz',
      description: q.description || '',
      questions: q.questions || [],
      round_titles: q.roundTitles || {},
      created_at: q.createdAt || new Date().toISOString(),
      updated_at: q.updatedAt || new Date().toISOString(),
    };

    const { error } = await supabase
      .from('quizzes')
      .upsert(row, { onConflict: 'id' });

    if (error) {
      console.error(`❌ Failed to migrate quiz ${q.id}:`, error.message);
    } else {
      console.log(`✅ Migrated quiz: ${q.title} (${q.id})`);
    }
  }

  console.log('Done.');
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
