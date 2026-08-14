import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://qfvcevwskxfluscqclpq.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmdmNldndza3hmbHVzY3FjbHBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzNDk1OTIsImV4cCI6MjEwMTkyNTU5Mn0.CPq8O4IS7XNPRCOg6k0l5q_1LlGX5ioUDFv5Z0O_5SQ";

const client = createClient(supabaseUrl, supabaseKey);

async function checkStores() {
  const { data, error } = await client
    .from('stores')
    .select('id, name, slug, line_user_id');
  
  if (error) {
    console.error('Error fetching stores:', error);
    return;
  }
  
  console.log('Stores in Database:');
  console.table(data);
}

checkStores();
