import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { error } = await supabase.from('treasury').insert({ XYZ_INVALID: 1 });
  console.log(error.message);
  console.log(error.details || error.hint);
}
run();