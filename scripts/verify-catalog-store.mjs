import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const queriesToTest = [
  { name: 'product_variants complex', query: supabase.from('product_variants').select('*, sizes(name), colors(name)').limit(1) },
  { name: 'product_variants simple', query: supabase.from('product_variants').select('*').limit(1) },
  { name: 'sizes', query: supabase.from('sizes').select('*').order('name').limit(1) },
  { name: 'colors', query: supabase.from('colors').select('*').order('name').limit(1) },
  { name: 'payment_methods', query: supabase.from('payment_methods').select('*').order('name').limit(1) },
  { name: 'business_units', query: supabase.from('business_units').select('*').order('name').limit(1) },
  { name: 'products', query: supabase.from('products').select('*').order('name').limit(1) },
  { name: 'customers', query: supabase.from('customers').select('*').order('name').limit(1) },
  { name: 'personalization_types', query: supabase.from('personalization_types').select('*').order('name').limit(1) },
  { name: 'services', query: supabase.from('services').select('*').order('name').limit(1) },
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