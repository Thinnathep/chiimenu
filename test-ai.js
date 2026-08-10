import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const { data, error } = await sb.from('stores').select('name_en').limit(1);
if (error && error.code === '42703') {
  console.log('MISSING: name_en/name_zh columns do NOT exist yet.');
  console.log('Run this SQL in Supabase Dashboard:');
  console.log("ALTER TABLE stores ADD COLUMN IF NOT EXISTS name_en TEXT, ADD COLUMN IF NOT EXISTS name_zh TEXT;");
} else {
  console.log('OK: name_en column exists. Data:', data);
}
