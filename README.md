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
- **Courses** (`/course.html`): the teacher builds a course of levels in the browser, or uploads one as JSON. A starter course of 10 levels ships with the app (`server/starter-course.json`), and the **course library** (below) adds six ready-made, bilingual courses. Each level has a story intro, a task, hidden guidance for the AI, completion criteria and an output type: `game` (HTML game), `creation` (a text card such as a superhero profile) or `chat` (conversation only).
- **Course library** (`/library.html`): teachers browse ready-made courses, preview every level and open a room in a minute (see "Course library").
- **Rooms** (`/teacher.html`): one course can be opened as many rooms as needed. Each room has its own invite link (`/join/<token>`, also as a QR code), a short class code, consent checkbox, daily limit and approval mode. "New link" revokes the old one.
- **Sessions**: students can only join while the teacher has started the session. "End session" logs every student out at once; accounts and progress stay for next time. If the teacher's dashboard is closed for 15 minutes (`SESSION_GRACE_MS`), the room closes by itself.
- **Students** open the link, pick a nickname, a 4-digit PIN and an avatar. The same nickname and PIN log back in from any device. The teacher can reset a forgotten PIN.
- **Level map** (`/student.html`): levels unlock in order. Inside a level the student chats with the AI on the left and sees the game or creation card on the right. "Check my work" saves the output and asks an AI evaluator to judge it against the level's criteria (1 to 3 stars). In "teacher approves" mode the result waits in the teacher's approval queue with the AI's suggestion. Finished levels can be replayed for more stars.
- **Teacher dashboard**: class map with each student's avatar on their current level, online and typing indicators, live feed with AI replies streamed token by token, safety alerts, approval queue, per-student progress with Pass/Reset overrides, and a gallery of every game and creation (with "show to class").
- **Student view**: the 👁 button next to a student (or "Open their screen" on their progress card) opens the page that student sees, in a new tab and read-only (`/student.html?student=<id>`): the level they are working on, their chat, their game or creation and their gallery. New messages, AI replies and "typing…" appear live, so the teacher can guide a student over a video call (Zoom for now). It also works after the session, to review where a student got stuck.

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

## Course library
Ready-made, classroom-ready courses, so a teacher can run a class without writing anything. Teachers reach it from the first card on `/teacher.html` ("Pick a ready-made course") or at `/library.html`.

**What a teacher can do**
- **Browse and filter** by age group (8 to 11, 12 to 17), theme, length (one session, 2 to 4, 5 or more) and programme (trial, term 1 to 3, holiday camp), or search by name. Every card shows the one-line promise for parents, the ages, sessions, minutes and levels.
- **Preview** the whole course: the plain-language learning goals ("What your child will learn", with a button that copies a parent summary), and every level with its story intro, task, what counts as done and how the AI will guide (students never see the last two).
- **Choose the course language** (Azerbaijani or English) independently of the app language.
- **Open a room**: one form (room name, approval mode, daily limit, consent) on the course page. It makes the room, its invite link and class code in one request. An untouched copy of the course is reused, so five rooms from one course do not fill "My courses".
- **Make my own copy**: creates a normal course of the teacher's own (same editor, same JSON download) to reword, reorder, remove or add levels. The library course and other teachers' courses never change. Once a copy is edited, new rooms from the library start again from the original.
- Finished courses point onward: the room header shows "Next adventure" links for the teacher, and a student who finishes the last level sees what comes next and is asked to tell the teacher.

**What the admin can do** (`/admin.html`, "Course library"): show or hide any course for teachers (rooms and copies that already exist keep working), preview, download any course as library JSON, and upload in-house courses in the same format, which then appear next to the built-in ones and can be replaced (upload the same `id`) or removed. Built-in courses can only be hidden.

**How it works**: built-in courses are JSON files in `server/library/` (`server/library.js` validates, filters and flattens them). In-house courses live in the `library_courses` table, hidden ones in `library_hidden`. A teacher's course remembers where it came from (`courses.library_slug`, `library_lang`, `library_hash`, `edited`); the library course itself is never touched by anything a teacher does.

### The courses
<!-- library:start (generated by "npm run library:docs", do not edit by hand) -->
| Course | Ages | Length | Levels | Programme |
| --- | --- | --- | --- | --- |
| **Trial Class: Make Your First Game with AI** (`trial-class`) | 8 to 17 | 1 session, 45 to 60 min | 4 | trial class |
| **AI Adventure: Junior Explorers** (`starter-junior`) | 8 to 11 | 6 sessions, 45 to 60 min | 10 | term 1 |
| **AI Adventure: Senior Makers** (`starter-senior`) | 12 to 17 | 5 sessions, 45 to 60 min | 10 | term 1 |
| **Storytelling Studio** (`storytelling-studio`) | 8 to 14 | 4 sessions, 45 to 60 min | 8 | term 2, holiday camp |
| **Science Explainers** (`science-explainers`) | 9 to 15 | 5 sessions, 45 to 60 min | 9 | term 2, holiday camp |
| **AI Detective** (`ai-detective`) | 10 to 17 | 5 sessions, 45 to 60 min | 9 | term 3 |

Learning goals, in plain words (the same text teachers see and can copy for parents):

**Trial Class: Make Your First Game with AI**: In one fun session, your child invents a hero, builds a game with an AI helper and plays it, learning the one skill behind it all: asking clearly.
- See that AI answers better when the request is clear.
- Invent an original hero and describe it with details.
- Build and play a real game, and change it by asking for what they want.
- Feel confident to keep learning with a full course.

**AI Adventure: Junior Explorers**: Your child learns to ask AI clearly while inventing heroes, creatures and worlds, then builds games they can play and share.
- Say clearly what they want from an AI: who, what and how.
- Improve a request step by step instead of giving up after the first try.
- Invent their own hero, creature and world using describing words.
- Plan a simple game (goal, winning, losing, controls) and ask for it in their own words.
- Explain what to fix when the AI's answer is wrong or not what they meant.
- Show their work to others with confidence.

**AI Adventure: Senior Makers**: Teens learn to direct AI with precision, from first experiments to a polished game of their own, and to judge what the AI gives back.
- Write precise requests: goal, audience, format and limits.
- Change one thing at a time, test the result and decide what to try next.
- Push past the AI's first, obvious ideas to reach original characters, creatures and worlds.
- Design a game on paper (core loop, rules, difficulty) before asking for it, then playtest and refine.
- Report a problem clearly: what happened, what was expected and how to repeat it.
- Present their work and explain the thinking behind their choices.

**Storytelling Studio**: Children invent characters, places and plot twists with an AI helper, write their own short story and read it aloud to the class.
- Turn a spark of an idea into a story with a beginning, a problem and an ending.
- Describe characters and places with details and senses instead of just 'big' or 'nice'.
- Plan a plot twist that surprises readers but still makes sense.
- Ask an AI for ideas and feedback while making every important choice themselves.
- Read their own story aloud with expression and confidence.

**Science Explainers**: Children learn to explain a science idea in their own words with AI help, check the facts, and turn it into a quiz game for their classmates.
- Ask better 'why' and 'how' questions to understand how things work.
- Explain a science idea simply, with an everyday example and a comparison.
- Check an AI's science facts against a book or a teacher instead of trusting them blindly.
- Plan a safe, simple experiment: question, prediction, steps and observations.
- Turn knowledge into a quiz game with fair questions and helpful hints.

**AI Detective**: Children learn how AI really works, why it makes mistakes, how to check facts, how to keep personal information private and how to spot unfair answers.
- Explain in simple words that AI predicts likely answers from patterns and does not think like a person.
- Spot confident but wrong answers and test an AI with follow-up questions.
- Check a claim in a second, trusted source before believing or sharing it.
- Know which personal information never goes into an AI chat, and rewrite a prompt to protect it.
- Notice when an AI answer is unfair or one-sided and ask for a fairer one.
<!-- library:end -->

### How to add a library course
1. Copy a file in `server/library/` (for example `trial-class.json`) to `server/library/<id>.json`. The file name must equal the `id` (lowercase letters, digits and hyphens, 3 to 40 characters).
2. Fill it in. Every text is an object with both languages, `{ "az": "...", "en": "..." }`; a plain string means the same text in both.

   | Field | Meaning |
   | --- | --- |
   | `id`, `emoji` | slug and the icon shown on cards |
   | `title`, `promise` | course name and the one line for parents (max 200 characters) |
   | `description` | a few sentences for teachers: how to run it |
   | `age` | `{ "min": 8, "max": 11 }` (a course matches an age filter when the ranges overlap) |
   | `themes` | one or more of `starter`, `stories`, `science`, `ai-literacy`, `games`, `trial` |
   | `programmes` | any of `trial`, `term-1`, `term-2`, `term-3`, `holiday` (the year plan) |
   | `sessions`, `minutes` | rough number of sessions, and `[min, max]` minutes per session |
   | `next` | ids of courses to suggest afterwards |
   | `goals` | `{ "az": [...], "en": [...] }` learning goals in plain words, 4 to 6 |
   | `az_reviewed` | set to `true` once a native speaker has read the Azerbaijani text |
   | `levels` | each `{ emoji, output, title, intro, task, ai_guide, criteria }` with `output` one of `game`, `creation`, `chat`, using the same limits as the course editor |
3. Run `npm run library:docs` to refresh the list above, then `npm test`. The tests check that both languages are complete, that levels fit the editor limits, the content rules below, and that the README is current.
4. For an in-house course, the admin uploads the same JSON on `/admin.html` instead of adding a file (both languages are not required there, a missing one falls back to the other).

**Content rules** (enforced by `test/library.test.js`): both languages written naturally, never word for word; in Azerbaijani avoid "yaratmaq" ("yarat") for what children make and use everyday verbs (düzəlt, qur, icad et, hazırla, yaz); no dashes as punctuation, no links; 8 to 10 levels (the trial 3 or 4) mixing games, creation cards and conversations; the last level makes something the child can show; every level practises saying clearly what you want, then improving it; made-up names only, no personal information, nothing adult or frightening, cartoon-level action only in games. The tutor's own prompt carries the same "yarat" rule so its Azerbaijani replies match.

**The Azerbaijani text of every library course needs a read-through by a native speaker before launch** (same as the home page). Until `az_reviewed` is `true`, the admin list and library show a warning on the course.

## Safety model
1. Every student message goes through a Haiku classifier first. Unsafe messages are logged, shown to the teacher as an alert (self-harm is highlighted red), and never reach the main AI. Classifier errors fail closed.
2. Lesson-scoped, child-safe system prompt (no personal info, refuse adult/off-topic).
3. Games run in `<iframe sandbox="allow-scripts">` (opaque origin) with a CSP of `default-src 'none'`: no network, storage, cookies or access to the platform.
4. Only a nickname, an avatar and a hashed PIN are stored. Wrong PINs lock that account for 5 minutes after 5 tries. Messages, games and idle students are deleted after the admin-set retention (default 30 days).
5. Admin spend cap is checked before every chat; cost is logged per class/teacher.

## Home page
`public/index.html` is the public landing page. Plain HTML, CSS and ES modules: no framework, no build step, no CDN, fonts, images or trackers (zero third-party requests). Page weight: about 125 KB in total (about 41 KB gzipped; `npm test` enforces the budget).
- **Layout**: a minimal, story-first page. A spacious welcome screen (one greeting, one headline, one sentence, one button), then a scroll story of five chapters, a short line of skills, the parent FAQ and one closing call to action.
- **The story**: the chapters follow one child through a class: (1) a curious kid with ideas, who picks a player; (2) they learn to say exactly what they mean, and each better prompt makes a better game; (3) the AI builds the game and the child asks for a change (level 6 "Your First Game"); (4) "Check my work", stars and the ten levels of the starter course; (5) the teacher and the layers of protection. On wide screens the chapters scroll on the left while one sticky stage on the right plays the chapter being read; on phones the stage sticks under the top bar and the chapters slide up beneath it.
- **Files**: `index.html` (markup), `home.css` (on top of the tokens in `style.css`), `home.js` (language, top bar, player picker, scroll reveal, loads the story), `home-story.js` (the scroll story: picks the current chapter and plays its scene), `home-mini.js` (the animated game preview used by chapters 2 and 3), `home-fx.js` (typewriter, star burst, avatar), `home-i18n.js` (all strings).
- **Languages**: Azerbaijani (default) and English, same `lang` localStorage key as the rest of the app; the toggle switches without a reload and the current scene starts over in the new language. Strings live in `home-i18n.js` and are registered into the shared dictionary of `common.js`, so `t()` and `applyI18n()` work as everywhere else. **The Azerbaijani copy needs a read-through by a native speaker before launch.**
- **Static baseline**: the page is complete HTML in Azerbaijani before any script runs (no empty flash, no layout shift, readable without JavaScript; the stage only shows when scripts run). After editing the `az` strings run `npm run home:sync` to rewrite that text in `index.html`; `npm test` fails if it is out of date.
- **Player**: the avatar chosen in chapter 1 is saved in localStorage (`avatar`), shown on the stage, and preselected on the join page.
- **Motion**: animations only touch `transform` and `opacity` (including the `translate`, `scale` and `rotate` properties). The welcome text rises in and drifts away as the page scrolls (CSS scroll timelines where supported), scenes pause while the story is off screen or the tab is hidden, and with `prefers-reduced-motion` every scene shows its finished state and the reveal and background drift are off. Colours reuse the `style.css` tokens; `home.css` adds a few AA-safe text shades (checked for both themes in `test/home.test.js`).
- **Placeholders to fill in** (business details not decided yet; they are bracketed and highlighted on the page):

| Placeholder | Where |
| --- | --- |
| `[PRIMARY CTA]` | button label: key `cta` in `home-i18n.js` (an example label is shown, "Book a free trial class") |
| `[CTA LINK]` | `href` of the three primary buttons in `index.html` (until set, they scroll to the footer contact line) |
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
