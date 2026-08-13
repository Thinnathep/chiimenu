const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function run() {
  const { data, error } = await sb.rpc('exec_sql', {
    query: `
      SELECT tablename, policyname, permissive, roles, cmd, qual, with_check 
      FROM pg_policies 
      WHERE schemaname = 'public';
    `
  });
  if (error) {
      console.error("RPC Error:", error);
  } else {
      console.log(JSON.stringify(data, null, 2));
  }
}
run();
