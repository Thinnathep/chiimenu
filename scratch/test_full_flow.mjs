import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://qfvcevwskxfluscqclpq.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmdmNldndza3hmbHVzY3FjbHBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzNDk1OTIsImV4cCI6MjEwMTkyNTU5Mn0.CPq8O4IS7XNPRCOg6k0l5q_1LlGX5ioUDFv5Z0O_5SQ";

const client = createClient(supabaseUrl, supabaseAnonKey);

async function diagnose() {
  console.log('--- 1. Testing Anon query to stores table in Supabase ---');
  const { data: stores, error: storeErr } = await client
    .from('stores')
    .select('id, name, slug, line_user_id, plan_status, trial_ends_at')
    .limit(5);

  if (storeErr) {
    console.error('❌ Supabase Anon Query FAILED:', storeErr);
  } else {
    console.log('✅ Supabase Anon Query SUCCESS:');
    console.table(stores);
  }

  console.log('\n--- 2. Testing direct POST to /api/order/submit ---');
  if (stores && stores.length > 0) {
    const testStore = stores[0];
    console.log(`Submitting test order for store: "${testStore.name}" (ID: ${testStore.id}, Line ID in DB: "${testStore.line_user_id}")`);
    
    try {
      const res = await fetch('http://localhost:3000/api/order/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: testStore.id,
          tableNo: 'Test-1',
          cart: [
            {
              id: 'test-item-1',
              name_th: 'ข้าวกะเพราหมูกรอบ (ทดสอบ)',
              quantity: 1,
              price: 65,
              unitPrice: 65
            }
          ]
        })
      });
      const resData = await res.json();
      console.log('Submit Result Status:', res.status);
      console.log('Submit Result Body:', JSON.stringify(resData, null, 2));
    } catch (fetchErr) {
      console.error('Submit Fetch Error:', fetchErr);
    }
  }
}

diagnose();
