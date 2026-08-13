import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || "https://qfvcevwskxfluscqclpq.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmdmNldndza3hmbHVzY3FjbHBxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjM0OTU5MiwiZXhwIjoyMTAxOTI1NTkyfQ.gaotBZ4hqZnKg9MYJbnuGeZJSb9OYnXt-SWwOjwLpxk";
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDb() {
    console.log('--- STORES ---');
    const { data: stores, error: e1 } = await supabase.from('stores').select('id, name_en, line_user_id, owner_id');
    console.log(stores, e1);

    console.log('--- RLS STATUS ---');
    const { data: rls, error: e3 } = await supabase.from('pg_class')
      .select('relname, relrowsecurity')
      .in('relname', ['orders', 'stores']).throwOnError();
    console.log(rls);
}
checkDb();
