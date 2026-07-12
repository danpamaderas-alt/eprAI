import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { error } = await supabase.from('treasury').select('id, amount, date, description, type, status').limit(1);
  console.log('Without optional fields:', error ? error.message : 'SUCCESS');
}
run();