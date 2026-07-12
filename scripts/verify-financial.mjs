import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const queriesToTest = [
  { name: 'v_treasury_summary', query: supabase.from('v_treasury_summary').select('*').limit(1) },
  { name: 'v_customer_balances', query: supabase.from('v_customer_balances').select('*').limit(1) },
  { name: 'treasury', query: supabase.from('treasury').select('*').limit(1) },
];

async function run() {
  for (const q of queriesToTest) {
    const { data, error } = await q.query;
    if (error) {
      console.error(`[FAIL] ${q.name} -> Code: ${error.code}, Message: ${error.message}`);
    } else {
      console.log(`[OK]   ${q.name} -> Success`);
    }
  }
}
run();