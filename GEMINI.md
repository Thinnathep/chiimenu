# ChiiMenu Project Rules (GEMINI.md)

## Bug Fix Completeness Rule

When a system audit has been performed and the user says "แก้ไข", "fix the bugs", "fix the issues", or any equivalent phrasing:

1. **Fix ALL identified bugs** across every layer simultaneously:
   - Frontend code (Vue, TypeScript, composables)
   - Backend code (Nitro server API endpoints)
   - SQL / Database migration scripts
   - Configuration files
   
2. **Never assume scope limitation** unless the user explicitly narrows it:
   - ✅ "fix only the SQL bugs" → fix only SQL
   - ✅ "fix only the code side" → fix only code files
   - ❌ User says "แก้ไขสิ" → must fix ALL layers, not just one

3. **Always report results as a complete status table** after fixing:
   | Bug | Layer | Status |
   |-----|-------|--------|
   | Bug name | Code / SQL / Config | ✅ Fixed / ⚠️ Needs manual step |

4. **SQL scripts that require manual execution** (e.g., run in Supabase Dashboard) must be:
   - Created as numbered migration files in `_database_scripts/`
   - Clearly documented with step-by-step instructions for the user to run them

---

## Project Context

- **Stack:** Nuxt 4 + Supabase + Cloudflare Workers AI + LINE Messaging API
- **Database:** Supabase PostgreSQL with RLS (Row Level Security)
- **Real column names in `orders` table:** `table_no`, `items` (JSONB) — NOT `table_number`, `total_price`, `items_count`
- **LINE status field in `stores` table:** `line_user_id` — NOT `line_notify_token`
- **Admin access:** 3-layer check (ADMIN_EMAILS env → public.admins table → profiles.role = 'admin')
- **Billing flow:** Manual — store owner contacts via LINE, admin renews via `/admin/stores`
