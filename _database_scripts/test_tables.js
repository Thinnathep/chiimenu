import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = "https://qfvcevwskxfluscqclpq.supabase.co"
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmdmNldndza3hmbHVzY3FjbHBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzNDk1OTIsImV4cCI6MjEwMTkyNTU5Mn0.CPq8O4IS7XNPRCOg6k0l5q_1LlGX5ioUDFv5Z0O_5SQ"

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function checkTables() {
  const tables = [
    'profiles',
    'stores',
    'menu_categories',
    'menu_items',
    'menu_item_allergens',
    'menu_item_customizations',
    'customization_groups',
    'customization_options',
    'qr_codes',
    'orders',
    'order_items'
  ]

  console.log("Starting database check...");
  
  for (const table of tables) {
    const { error } = await supabase.from(table).select('*').limit(1)
    if (error) {
      console.log(`[ERROR] ${table}:`, error.message)
    } else {
      console.log(`[OK] ${table}`)
    }
  }
}

checkTables()
