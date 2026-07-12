import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data: pData } = await supabase.from('products').select('*').limit(1);
  console.log('Products columns:', pData && pData.length > 0 ? Object.keys(pData[0]) : 'No data');

  const { data: tData } = await supabase.from('treasury').select('*').limit(1);
  console.log('Treasury columns:', tData && tData.length > 0 ? Object.keys(tData[0]) : 'No data');
}
run();