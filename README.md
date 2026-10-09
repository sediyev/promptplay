# PromptPlay (pilot)

Classroom web app: kids join with a class code + nickname, chat with Claude (Haiku 4.5 by default) to learn prompting and build small games. Teacher sees and controls everything live. One Node process, SQLite file, no build step.

## Run
```
npm install
cp .env.example .env   # set ANTHROPIC_API_KEY, ADMIN_EMAIL, ADMIN_PASSWORD
npm start              # http://localhost:3000
npm test               # offline end-to-end test with a fake Anthropic API
```
Needs Node >= 22.5 (built-in `node:sqlite`). Put it behind HTTPS (e.g. Caddy) for the pilot; students connect from home.

## Flow
- `/` student join, teacher/admin login. Admin (from `.env`) adds teachers at `/admin.html`.
- Teacher (`/teacher.html`): create class (parental-consent checkbox required, daily limit), add lessons (goal), share the code, watch the live feed, pause student/class, review any past day, show games to the class.
- Student (`/student.html`): chat on the left, game runs on the right, save/share games.

## Safety model
1. Every student message goes through a Haiku classifier first. Unsafe messages are logged, shown to the teacher as an alert (self-harm is highlighted red), and never reach the main AI. Classifier errors fail closed.
2. Lesson-scoped, child-safe system prompt (no personal info, refuse adult/off-topic).
3. Games run in `<iframe sandbox="allow-scripts">` (opaque origin) with a CSP of `default-src 'none'`: no network, storage, cookies or access to the platform.
4. Only a nickname is stored. Messages, games and idle students are deleted after the admin-set retention (default 30 days).
5. Admin spend cap is checked before every chat; cost is logged per class/teacher.

## Known pilot limits
- Replies stream to the student as they are generated; they are not re-checked after generation (input filter + system prompt only). If the pilot needs "zero unsafe replies" strictly, buffer and classify replies before display.
- Teacher feed shows AI replies when complete, not token by token.
- No password reset (admin adds teachers; reset by editing the DB or re-adding), no rate limiting on login.
