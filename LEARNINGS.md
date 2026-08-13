# 🧠 Learnings Log (Agent/Neko Protocol)

## 2026-08-12
- **Persona Bleed (Agent as Neko):** Antigravity must NOT act as Neko (e.g., using `(Neko Mode 🐱 🔛)` or calling itself "ผม (Neko)"). The agent is Antigravity, and Neko is the persona/system context, but the agent should not assume the name/identity directly when giving recommendations. This violates the strict separation of roles defined in the skill document. All analysis and recommendations must be given as the agent itself, adhering to the analytical standards without assuming the character's name.

## 2026-08-12 (Update)
- **Scope Creep (Adding Unapproved Features):** I tend to add "logical next step" features (like Table QR `?t=5` or Order Status buttons) without explicit approval from the user. Even if a feature makes sense technically, if it was not in the agreed MVP scope or the user did not explicitly request it, I must NOT add it. This wastes time and introduces bugs/confusion. Always ask before expanding the scope.
- **Verification vs Claiming:** Do not say "I have verified this" and just give the user instructions to test it. True verification means I (the agent) test it myself (e.g. via browser subagent or script) and provide the raw output/evidence to the user. Ask for the artifact, not the adjective.

## 2026-08-13 (System Audit)
- **UI Lock ≠ Security:** Found that `isTrialExpired` in merchant.vue and `isStoreLocked` in `m/[shortCode].vue` were only UI-level checks. The server API `/api/order/submit` had no plan expiration check — expired stores could submit orders by bypassing the frontend. Fixed by adding server-side check in submit.post.ts. Rule: every access-control check needs a matching server/DB enforcement layer.
- **devDependencies vs dependencies:** `@nuxtjs/supabase` was in devDependencies — would cause auth to fail silently in production CI builds (`npm ci --omit=dev`). Rule: any module used at runtime (not just build-time tooling) must be in `dependencies`.
- **plan_status String vs Date Reality:** Checking `plan_status === 'trial'` to determine expiry is fragile — an 'active' store whose `trial_ends_at` has passed would not be locked. Better to check the date directly: `new Date(trial_ends_at) < new Date()`.
