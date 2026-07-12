import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const queriesToTest = [
  { name: 'products explicit', query: supabase.from('products').select('id, company_id, sku, name, category, cost_price, price, location, notes').limit(1) },
  { name: 'sizes explicit', query: supabase.from('sizes').select('id, name').limit(1) },
  { name: 'treasury explicit', query: supabase.from('treasury').select('id, date, description, category, business_unit, payment_method, type, amount, status').limit(1) },
  { name: 'orders explicit', query: supabase.from('orders').select('total_amount, advance_payment, status').limit(1) },
  { name: 'suppliers explicit', query: supabase.from('suppliers').select('id, name, contact, phone, balance').limit(1) },
];

async function run() {
  let allGood = true;
  for (const q of queriesToTest) {
    const { data, error } = await q.query;
    if (error) {
      console.error(`[FAIL] ${q.name} -> Code: ${error.code}, Message: ${error.message}`);
      allGood = false;
    } else {
      console.log(`[OK]   ${q.name} -> Success`);
    }
  }
  if (!allGood) process.exit(1);
}
run();