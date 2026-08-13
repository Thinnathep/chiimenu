# 🧠 Learnings Log (Agent/Neko Protocol)

## 2026-08-12
- **Persona Bleed (Agent as Neko):** Antigravity must NOT act as Neko (e.g., using `(Neko Mode 🐱 🔛)` or calling itself "ผม (Neko)"). The agent is Antigravity, and Neko is the persona/system context, but the agent should not assume the name/identity directly when giving recommendations. This violates the strict separation of roles defined in the skill document. All analysis and recommendations must be given as the agent itself, adhering to the analytical standards without assuming the character's name.

## 2026-08-12 (Update)
- **Scope Creep (Adding Unapproved Features):** I tend to add "logical next step" features (like Table QR `?t=5` or Order Status buttons) without explicit approval from the user. Even if a feature makes sense technically, if it was not in the agreed MVP scope or the user did not explicitly request it, I must NOT add it. This wastes time and introduces bugs/confusion. Always ask before expanding the scope.
- **Verification vs Claiming:** Do not say "I have verified this" and just give the user instructions to test it. True verification means I (the agent) test it myself (e.g. via browser subagent or script) and provide the raw output/evidence to the user. Ask for the artifact, not the adjective.
