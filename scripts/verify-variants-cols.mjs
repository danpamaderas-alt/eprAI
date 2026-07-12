import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data } = await supabase.from('product_variants').select('*').limit(1);
  if (data && data.length > 0) {
    console.log(Object.keys(data[0]));
  } else {
    // try to get columns by creating an error
    const { error } = await supabase.from('product_variants').select('non_existent_column').limit(1);
    console.log(error.hint || error.message);
  }
}
run();