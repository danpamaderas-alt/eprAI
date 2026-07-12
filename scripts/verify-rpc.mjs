import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const rpcsToTest = [
  'update_product_stock_atomic',
  'delete_product_variation',
  'create_order_atomic',
  'register_partial_delivery',
  'upsert_stock',
  'transform_to_finished',
  'process_sale_atomic',
  'reserve_inventory_stock',
  'process_personalization_atomic'
];

async function run() {
  console.log('Testing RPC functions existence...');
  for (const rpc of rpcsToTest) {
    // Calling with empty arguments. If it exists but signature mismatches, we get a signature error.
    // If it does NOT exist, we get PGRST202.
    const { error } = await supabase.rpc(rpc, {});
    if (error) {
      if (error.code === 'PGRST202') {
        console.error(`[MISSING] ${rpc} -> ${error.message}`);
      } else {
        // Exists, but probably failed due to arguments or execution logic, which is fine for existence check!
        console.log(`[EXISTS ] ${rpc} -> Failed with: ${error.message} (Code: ${error.code})`);
      }
    } else {
      console.log(`[EXISTS ] ${rpc} -> Success`);
    }
  }
}
run();