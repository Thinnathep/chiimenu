const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function run() {
  const { data, error } = await sb.rpc('exec_sql', {
    query: `
      SELECT tablename, policyname, permissive, roles, cmd, qual, with_check 
      FROM pg_policies 
      WHERE tablename = 'usage_logs';
    `
  });
  if (error) console.error("RPC Error:", error);
  else console.log("RLS Policies for usage_logs:", data);
  
  const res2 = await sb.rpc('exec_sql', {
    query: `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'stores';
    `
  });
  if (res2.data) console.log("Stores schema:", res2.data.map(r => r.column_name).join(', '));
}
run();
