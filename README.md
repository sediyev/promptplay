# PromptPlay (pilot)

Classroom web app where kids learn prompting with Claude (Haiku 4.5 by default) by playing through a map of levels: inventing superheroes, building worlds, making games. The teacher writes the course, opens rooms from it, and sees and controls everything live. One Node process, SQLite file, no build step.

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
- **Courses** (`/course.html`): the teacher builds a course of levels in the browser, or uploads one as JSON. A starter course of 10 levels ships with the app (`server/starter-course.json`). Each level has a story intro, a task, hidden guidance for the AI, completion criteria and an output type: `game` (HTML game), `creation` (a text card such as a superhero profile) or `chat` (conversation only).
- **Rooms** (`/teacher.html`): one course can be opened as many rooms as needed. Each room has its own invite link (`/join/<token>`, also as a QR code), a short class code, consent checkbox, daily limit and approval mode. "New link" revokes the old one.
- **Sessions**: students can only join while the teacher has started the session. "End session" logs every student out at once; accounts and progress stay for next time. If the teacher's dashboard is closed for 15 minutes (`SESSION_GRACE_MS`), the room closes by itself.
- **Students** open the link, pick a nickname, a 4-digit PIN and an avatar. The same nickname and PIN log back in from any device. The teacher can reset a forgotten PIN.
- **Level map** (`/student.html`): levels unlock in order. Inside a level the student chats with the AI on the left and sees the game or creation card on the right. "Check my work" saves the output and asks an AI evaluator to judge it against the level's criteria (1 to 3 stars). In "teacher approves" mode the result waits in the teacher's approval queue with the AI's suggestion. Finished levels can be replayed for more stars.
- **Teacher dashboard**: class map with each student's avatar on their current level, online and typing indicators, live feed with AI replies streamed token by token, safety alerts, approval queue, per-student progress with Pass/Reset overrides, and a gallery of every game and creation (with "show to class").

## Course JSON
```json
{
  "title": "My course",
  "description": "optional",
  "levels": [
    { "title": "Invent a Superhero", "emoji": "🦸", "output": "creation",
      "intro": "Story shown to students", "task": "What the student must do",
      "ai_guide": "How the AI should help (hidden from students)",
      "criteria": "What counts as complete (used by the evaluator)" }
  ]
}
```
`title` and `task` are required for every level; `output` is `game`, `creation` or `chat` (default `game`); up to 100 levels. "Download JSON" in the course editor exports this format. Editing a course updates every room that uses it; student progress is kept for levels that still exist. Classes from the pilot are migrated automatically: their lessons become a course.

## Safety model
1. Every student message goes through a Haiku classifier first. Unsafe messages are logged, shown to the teacher as an alert (self-harm is highlighted red), and never reach the main AI. Classifier errors fail closed.
2. Lesson-scoped, child-safe system prompt (no personal info, refuse adult/off-topic).
3. Games run in `<iframe sandbox="allow-scripts">` (opaque origin) with a CSP of `default-src 'none'`: no network, storage, cookies or access to the platform.
4. Only a nickname, an avatar and a hashed PIN are stored. Wrong PINs lock that account for 5 minutes after 5 tries. Messages, games and idle students are deleted after the admin-set retention (default 30 days).
5. Admin spend cap is checked before every chat; cost is logged per class/teacher.

## Known pilot limits
- Replies stream to the student as they are generated; they are not re-checked after generation (input filter + system prompt only). If the pilot needs "zero unsafe replies" strictly, buffer and classify replies before display.
- The level evaluator is an AI judgement: a student could try to talk it into a pass. The teacher sees every submission and can reset a level, or switch the room to "teacher approves".
- No password reset (admin adds teachers; reset by editing the DB or re-adding), no rate limiting on login.
