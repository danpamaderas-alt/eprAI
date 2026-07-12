import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const tests = [
  { name: 'update_product_stock_atomic', args: { p_id: '00000000-0000-0000-0000-000000000000', p_qty: 1 } },
  { name: 'delete_product_variation', args: { p_id: '00000000-0000-0000-0000-000000000000' } },
  { name: 'create_order_atomic', args: { p_order: {} } },
  { name: 'register_partial_delivery', args: { p_id: '00000000-0000-0000-0000-000000000000', p_qty: 1 } },
  { name: 'upsert_stock', args: { p_product_id: '00000000-0000-0000-0000-000000000000', p_size_id: '00000000-0000-0000-0000-000000000000', p_color_id: '00000000-0000-0000-0000-000000000000', p_quantity: 1 } },
  { name: 'transform_to_finished', args: { p_variant_id: '00000000-0000-0000-0000-000000000000', p_quantity: 1 } },
  { name: 'process_sale_atomic', args: { customer_id_param: '00000000-0000-0000-0000-000000000000', cart_items: [], total_amount_param: 1 } },
  { name: 'reserve_inventory_stock', args: { p_variant_id: '00000000-0000-0000-0000-000000000000', p_qty: 1 } },
  { name: 'process_personalization_atomic', args: { p_variant_id: '00000000-0000-0000-0000-000000000000', p_qty: 1 } },
];

async function run() {
  console.log('Testing RPC functions with dummy args...');
  for (const t of tests) {
    const { error } = await supabase.rpc(t.name, t.args);
    if (error) {
      if (error.code === 'PGRST202') {
        console.error(`[MISSING] ${t.name} -> ${error.message}`);
      } else {
        console.log(`[EXISTS ] ${t.name} -> Failed with: ${error.message} (Code: ${error.code})`);
      }
    } else {
      console.log(`[EXISTS ] ${t.name} -> Success`);
    }
  }
}
run();