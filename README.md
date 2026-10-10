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
- `/` the public home page for parents and kids (see "Home page" below). `/join` is where students join (class code) and teachers or admins log in; `/join/<token>` is the room invite link, `/join#teacher` opens the teacher tab. Admin (from `.env`) adds teachers at `/admin.html`.
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

## Home page
`public/index.html` is the public landing page. Plain HTML, CSS and ES modules: no framework, no build step, no CDN, fonts, images or trackers (zero third-party requests). Page weight: about 140 KB on first load, 157 KB with the lazily loaded sections (about 43 KB and 50 KB gzipped; `npm test` enforces the budget).
- **Files**: `index.html` (markup), `home.css` (on top of the tokens in `style.css`), `home.js` (language, top bar, player picker, loads the rest), `home-hero.js` (the living product window), `home-power.js` (Prompt Power-Up and "Your turn"), `home-map.js` (adventure map), `home-game.js` (playable example, run through `gameFrame()` so it is sandboxed without network), `home-fx.js` (typewriter, confetti, tilt), `home-i18n.js` (all strings).
- **Languages**: Azerbaijani (default) and English, same `lang` localStorage key as the rest of the app; the toggle switches without a reload. Strings live in `home-i18n.js` and are registered into the shared dictionary of `common.js`, so `t()` and `applyI18n()` work as everywhere else. **The Azerbaijani copy needs a read-through by a native speaker before launch.**
- **Static baseline**: the page is complete HTML in Azerbaijani before any script runs (no empty flash, no layout shift, readable without JavaScript). After editing the `az` strings run `npm run home:sync` to rewrite that text in `index.html`; `npm test` fails if it is out of date.
- **Player**: the avatar chosen in the hero is saved in localStorage (`avatar`), shown in the demo window, on the map and in the shield, and preselected on the join page.
- **Motion**: animations only touch `transform` and `opacity`, loops pause off screen, and with `prefers-reduced-motion` every demo shows its final state. Colours reuse the `style.css` tokens; `home.css` adds a few AA-safe text shades (checked for both themes in `test/home.test.js`).
- **Placeholders to fill in** (business details not decided yet; they are bracketed and highlighted on the page):

| Placeholder | Where |
| --- | --- |
| `[PRIMARY CTA]` | button label: key `cta` in `home-i18n.js` (an example label is shown, "Book a free trial class") |
| `[CTA LINK]` | `href` of the four primary buttons in `index.html` (until set, they scroll to the footer contact line) |
| `[ORG NAME]`, `[CONTACT]` | footer in `index.html` |
| `[PRIVACY POLICY LINK]` | footer `href` in `index.html` (until set, it jumps to the FAQ) and the text of FAQ answer `a7` |
| `[PRICE]` | FAQ answer `a9` in `home-i18n.js` |
| `[LOCATIONS AND SCHEDULE]` | FAQ answer `a8` in `home-i18n.js` |
| `[OG IMAGE]` | `og:image` and `twitter:image` in the `<head>` of `index.html` |

  There is also a hidden social proof section (`#proof`) with a TODO: only add real, permitted quotes or numbers, never invented ones.

## Known pilot limits
- Replies stream to the student as they are generated; they are not re-checked after generation (input filter + system prompt only). If the pilot needs "zero unsafe replies" strictly, buffer and classify replies before display.
- The level evaluator is an AI judgement: a student could try to talk it into a pass. The teacher sees every submission and can reset a level, or switch the room to "teacher approves".
- No password reset (admin adds teachers; reset by editing the DB or re-adding), no rate limiting on login.
