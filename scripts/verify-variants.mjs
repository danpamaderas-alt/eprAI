import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { error } = await supabase.from('product_variants').select('*').limit(1);
  console.log(error ? error.message : 'SUCCESS product_variants');

  const { error: e2 } = await supabase.from('product_variants').insert({ THIS_COL_DOES_NOT_EXIST: 1 });
  console.log(e2 ? (e2.details || e2.hint || e2.message) : 'SUCCESS insert');
}
run();