import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const tables = [
  'raw_materials', 'sales', 'deliveries', 'clients', 'deals', 'workers', 'resellers', 'quotes', 'worker_tasks'
];

async function run() {
  for (const t of tables) {
    const { error } = await supabase.from(t).select('*').limit(1);
    if (error) {
      console.log(`[MISSING TABLE] ${t} -> ${error.message}`);
    } else {
      console.log(`[EXISTS] ${t}`);
    }
  }
}
run();