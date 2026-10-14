const DICT = {
  en: {
    app: 'PromptPlay', join: 'Join class', code: 'Class code', nickname: 'Nickname (not your real name!)', go: 'Go',
    teacherLogin: 'Teacher / admin login', email: 'Email', password: 'Password', login: 'Log in', logout: 'Log out',
    bad_code: 'Class code not found', bad_nick: 'Nickname is too short', nick_taken: 'That nickname is taken. Pick another one.',
    bad_login: 'Wrong email or password',
    seen: '👀 Your teacher can see everything you write here.', noLesson: 'Your teacher has not started a lesson yet. Please wait…',
    lesson: 'Lesson', placeholder: 'Type your message…', send: 'Send', left: 'messages left today',
    paused: '⏸️ Your teacher paused the class. Take a break and wait for them.',
    pausedYou: '⏸️ Your teacher paused your chat for a moment.',
    limit: "🛑 You've used all your messages for today. See you next time!",
    budget: 'The AI is resting right now. Ask your teacher.', try_again: 'Something went wrong. Please try again.',
    blocked: "I can't send that one. Let's keep it kind, safe and about our lesson. 😊",
    blocked_self_harm: "That sounds important. Please talk to your teacher or a grown-up you trust right now. 💛",
    blocked_personal_info: "Please don't share personal info like your name, school or phone number. Let's try again!",
    thinking: 'Thinking…', building: '🛠️ Building your game…', gameReady: '🎮 Game ready! See it on the right.',
    yourGame: 'Your game', noGame: 'Ask the AI to make a game and it will appear here!', save: '💾 Save', saved: 'Saved!',
    myGames: 'Games', share: 'Share with class', unshare: 'Stop sharing', delete: 'Delete', play: 'Play', by: 'by',
    showcase: '⭐ Your teacher is showing a game', close: 'Close', chat: 'Chat', gamesTab: 'Games',
    classes: 'My classes', newClass: 'New class', className: 'Class name', dailyLimit: 'Daily messages per student',
    consent: 'I confirm that parental consent was collected for every student in this class.', create: 'Create',
    consentNeeded: 'Please confirm parental consent first.', students: 'Students', pauseAll: 'Pause class', resumeAll: 'Resume class',
    pause: 'Pause', resume: 'Resume', kick: 'Remove', live: 'Live chats', everyone: 'Everyone', date: 'Date',
    lessons: 'Lessons', newLesson: 'New lesson', title: 'Title', goal: 'Goal (what should students learn or build?)', start: 'Start lesson',
    active: 'Active', makeActive: 'Make active', games: 'Student games', showToClass: 'Show to class', noGames: 'No games yet.',
    alerts: '🚨 Safety alerts', blockedMsg: 'blocked', today: 'today', save2: 'Save', back: '← Back', empty: 'Nothing yet.',
    code2: 'Join code', admin: 'Admin', teachers: 'Teachers', addTeacher: 'Add teacher', name: 'Name', usage: 'Usage',
    cap: 'Spending cap ($, 0 = none)', retention: 'Keep logs for (days)', spent: 'Spent', cost: 'Cost', tokens: 'Tokens',
    teacher: 'Teacher', cls: 'Class', exists: 'Email already exists', invalid: 'Check the fields (password min 6 chars)', code_label: 'Code',
    codeCopy: 'Share this code with students:', sc_sexual: 'sexual content', sc_violence: 'violence', sc_self_harm: 'possible self-harm / danger',
    sc_hate: 'hate', sc_drugs: 'drugs', sc_personal_info: 'personal info', sc_jailbreak: 'rule bypass attempt', sc_other: 'unsafe',
    showing: 'Showing to class', lang: 'AZ', tagline: 'Learn to talk to AI by building games', student: 'Student', teacher: 'Teacher',
  },
  az: {
    app: 'PromptPlay', join: 'Sinfə qoşul', code: 'Sinif kodu', nickname: 'Ləqəb (real adın yox!)', go: 'Başla',
    teacherLogin: 'Müəllim / admin girişi', email: 'E-poçt', password: 'Parol', login: 'Daxil ol', logout: 'Çıxış',
    bad_code: 'Sinif kodu tapılmadı', bad_nick: 'Ləqəb çox qısadır', nick_taken: 'Bu ləqəb artıq götürülüb. Başqasını seç.',
    bad_login: 'E-poçt və ya parol səhvdir',
    seen: '👀 Müəllimin burada yazdığın hər şeyi görə bilir.', noLesson: 'Müəllim hələ dərsi başlatmayıb. Bir az gözlə…',
    lesson: 'Dərs', placeholder: 'Mesajını yaz…', send: 'Göndər', left: 'mesaj qalıb (bu gün)',
    paused: '⏸️ Müəllim sinfi dayandırdı. Fasilə ver və gözlə.',
    pausedYou: '⏸️ Müəllim çatını qısa müddətə dayandırdı.',
    limit: '🛑 Bu gün üçün bütün mesajlarını istifadə etdin. Növbəti dəfə görüşərik!',
    budget: 'Süni intellekt hazırda dincəlir. Müəllimdən soruş.', try_again: 'Nəsə alınmadı. Yenidən cəhd et.',
    blocked: 'Bunu göndərə bilmirəm. Gəl mehriban, təhlükəsiz və dərsimizə uyğun yazaq. 😊',
    blocked_self_harm: 'Bu vacib səslənir. Zəhmət olmasa, indi müəlliminlə və ya etibar etdiyin böyüklə danış. 💛',
    blocked_personal_info: 'Zəhmət olmasa, adın, məktəbin və ya telefon nömrən kimi şəxsi məlumatları paylaşma. Yenidən cəhd et!',
    thinking: 'Düşünürəm…', building: '🛠️ Oyunun hazırlanır…', gameReady: '🎮 Oyun hazırdır! Sağda bax.',
    yourGame: 'Sənin oyunun', noGame: 'Süni intellektdən oyun düzəltməsini istə, burada görünəcək!', save: '💾 Yadda saxla', saved: 'Saxlanıldı!',
    myGames: 'Oyunlar', share: 'Siniflə paylaş', unshare: 'Paylaşmanı dayandır', delete: 'Sil', play: 'Oyna', by: 'müəllif:',
    showcase: '⭐ Müəllim bir oyun göstərir', close: 'Bağla', chat: 'Çat', gamesTab: 'Oyunlar',
    classes: 'Siniflərim', newClass: 'Yeni sinif', className: 'Sinfin adı', dailyLimit: 'Şagird üçün günlük mesaj sayı',
    consent: 'Bu sinifdəki bütün şagirdlər üçün valideyn razılığının alındığını təsdiq edirəm.', create: 'Yarat',
    consentNeeded: 'Əvvəlcə valideyn razılığını təsdiq edin.', students: 'Şagirdlər', pauseAll: 'Sinfi dayandır', resumeAll: 'Sinfi davam etdir',
    pause: 'Dayandır', resume: 'Davam', kick: 'Çıxar', live: 'Canlı çatlar', everyone: 'Hamı', date: 'Tarix',
    lessons: 'Dərslər', newLesson: 'Yeni dərs', title: 'Başlıq', goal: 'Məqsəd (şagirdlər nə öyrənməli və ya düzəltməlidir?)', start: 'Dərsi başlat',
    active: 'Aktiv', makeActive: 'Aktiv et', games: 'Şagird oyunları', showToClass: 'Sinfə göstər', noGames: 'Hələ oyun yoxdur.',
    alerts: '🚨 Təhlükəsizlik xəbərdarlıqları', blockedMsg: 'bloklandı', today: 'bu gün', save2: 'Yadda saxla', back: '← Geri', empty: 'Hələ heç nə yoxdur.',
    code2: 'Qoşulma kodu', admin: 'Admin', teachers: 'Müəllimlər', addTeacher: 'Müəllim əlavə et', name: 'Ad', usage: 'İstifadə',
    cap: 'Xərc limiti ($, 0 = limitsiz)', retention: 'Qeydləri saxla (gün)', spent: 'Xərclənib', cost: 'Xərc', tokens: 'Token',
    teacher: 'Müəllim', cls: 'Sinif', exists: 'Bu e-poçt artıq var', invalid: 'Sahələri yoxlayın (parol min. 6 simvol)', code_label: 'Kod',
    codeCopy: 'Bu kodu şagirdlərlə paylaş:', sc_sexual: 'qeyri-münasib məzmun', sc_violence: 'zorakılıq', sc_self_harm: 'özünə zərər / təhlükə ehtimalı',
    sc_hate: 'nifrət', sc_drugs: 'narkotik', sc_personal_info: 'şəxsi məlumat', sc_jailbreak: 'qaydaları keçməyə cəhd', sc_other: 'təhlükəli',
    showing: 'Sinfə göstərilir', lang: 'EN', tagline: 'Oyun düzəldərək süni intellektlə danışmağı öyrən', student: 'Şagird', teacher: 'Müəllim',
  },
};
// Rooms, courses and the level map
Object.assign(DICT.en, {
  pin: 'Secret PIN (4 digits, remember it!)', pickAvatar: 'Pick your avatar', invitedTo: "You're invited to", haveCode: 'Have a class code instead?',
  bad_pin: 'Wrong PIN for this nickname. Ask your teacher if you forgot it.', bad_pin_format: 'Your PIN must be exactly 4 digits.',
  pin_locked: 'Too many tries. Wait 5 minutes or ask your teacher.', room_closed: 'This room is closed right now. Wait for your teacher to open it.',
  bad_invite: 'This invite link is not valid. Ask your teacher for a new one.', sessionEnded: 'Your teacher ended the session. See you next time! 👋',
  newHere: 'New here? Pick a nickname and a PIN. Coming back? Use the same ones.',
  map: 'Map', level: 'Level', backToMap: '🗺️ Map', checkWork: '✅ Check my work', checking: 'Checking your work…', task: 'Your task',
  passed: 'Level complete!', notYet: 'Not quite yet!', pendingMsg: 'Sent to your teacher. Waiting for approval ⏳', pending: 'Waiting for teacher',
  no_work: 'Work on the task with the AI first!', no_output: 'Make your creation with the AI first, then check your work.',
  too_fast: 'Wait a few seconds before checking again.', locked: 'This level is still locked.', nextLevel: 'Next level →', keepGoing: 'Keep going',
  yourCreation: 'Your creation', noCreation: 'Ask the AI to help you create it. It will appear here!', creationReady: '✨ Creation updated! See it on the right.',
  chatLevel: 'This level is a conversation. Talk it through with the AI, then press "Check my work".', courseDone: 'You finished the whole course! 🏆',
  teacher_pass: 'Your teacher approved a level! ⭐', teacher_reject: 'Your teacher wants you to keep working on this level.',
  teacher_reset: 'Your teacher reset a level so you can play it again.', youAreHere: 'You are here', myWork: 'Gallery', replay: 'Play again',
  rooms: 'My rooms', newRoom: 'New room', roomName: 'Room name', course: 'Course', courses: 'My courses', newCourse: 'New course',
  importCourse: '⬆ Upload course (JSON)', starter: '+ Starter course', levelsN: 'levels', roomsN: 'rooms', studentsN: 'students',
  approvalMode: 'Who unlocks the next level?', approval_ai: 'AI checks the work (you can override)', approval_teacher: 'I approve each level',
  startSession: '▶ Start session', endSession: '■ End session', liveNow: 'LIVE', closedRoom: 'Closed', inviteLink: 'Invite link', copy: 'Copy',
  copied: 'Copied!', newLink: 'New link', qr: 'QR code', classMap: 'Class map', approvals: 'Waiting for your approval', approve: 'Approve',
  reject: 'Send back', passLevel: 'Pass', resetLevel: 'Reset', resetPin: 'PIN', newPin: 'New PIN for', aiSuggests: 'AI suggests',
  outputs: 'Student work', allLevels: 'All levels', typing: 'typing…', noCourses: 'Pick a ready-made course from the library, or write or upload one first.', finish: 'Finished',
  confirmEnd: 'End the session? All students will be logged out until you start it again.', confirmNewLink: 'Make a new link? The old link will stop working.',
  in_use: 'This course is used by a room, so it cannot be deleted.', deleteCourse: 'Delete course', saveCourse: 'Save course',
  exportJson: '⬇ Download JSON', addLevel: '+ Add level', emoji: 'Emoji', intro: 'Story intro (shown to students)', taskL: 'Task (what the student must do)',
  aiGuide: 'How the AI should guide (students do not see this)', criteria: 'Completion criteria (used to check the work)', outputType: 'Output',
  out_game: '🎮 Game', out_creation: '✨ Creation card', out_chat: '💬 Conversation only', description: 'Description', remove: 'Remove',
  levels_err: 'Every level needs a title and a task (max 100 levels).', title_err: 'The course needs a title.', badFile: 'That file is not a valid course JSON.',
  autoClose: 'The room closes by itself 15 minutes after this dashboard is closed.', progressOf: 'Progress', checked: 'checked',
  passedShort: 'passed', failedShort: 'not yet', sentToYou: 'waiting for you', confirmDelete: 'Delete this course?', unsaved: 'Unsaved changes',
  editCourse: 'Edit course', useCourse: 'Rooms are live copies: changes apply to every room using this course.', share2: 'Students open this link:',
  confirmRemove: 'Remove this student and their progress?', levelsTitle: 'Levels', edit: 'Edit',
  nextAdv: 'Next adventure', askTeacher: 'Ask your teacher to open it!',
});
Object.assign(DICT.az, {
  pin: 'Gizli PIN (4 rəqəm, yadda saxla!)', pickAvatar: 'Avatarını seç', invitedTo: 'Dəvət olundun:', haveCode: 'Sinif kodun var?',
  bad_pin: 'Bu ləqəb üçün PIN səhvdir. Unutmusansa, müəllimindən soruş.', bad_pin_format: 'PIN düz 4 rəqəm olmalıdır.',
  pin_locked: 'Çox cəhd oldu. 5 dəqiqə gözlə və ya müəllimindən soruş.', room_closed: 'Bu otaq hazırda bağlıdır. Müəllimin açmasını gözlə.',
  bad_invite: 'Bu dəvət linki etibarsızdır. Müəllimindən yenisini istə.', sessionEnded: 'Müəllim dərsi bitirdi. Növbəti dəfə görüşərik! 👋',
  newHere: 'Yenisən? Ləqəb və PIN seç. Qayıdırsan? Eynilərini yaz.',
  map: 'Xəritə', level: 'Səviyyə', backToMap: '🗺️ Xəritə', checkWork: '✅ İşimi yoxla', checking: 'İşin yoxlanılır…', task: 'Tapşırığın',
  passed: 'Səviyyə tamamlandı!', notYet: 'Hələ yox!', pendingMsg: 'Müəllimə göndərildi. Təsdiq gözlənilir ⏳', pending: 'Müəllim gözlənilir',
  no_work: 'Əvvəlcə süni intellektlə tapşırıq üzərində işlə!', no_output: 'Əvvəlcə süni intellektlə işini düzəlt, sonra yoxla.',
  too_fast: 'Yenidən yoxlamadan əvvəl bir neçə saniyə gözlə.', locked: 'Bu səviyyə hələ bağlıdır.', nextLevel: 'Növbəti səviyyə →', keepGoing: 'Davam et',
  yourCreation: 'Sənin işin', noCreation: 'Süni intellektdən kömək istə. Burada görünəcək!', creationReady: '✨ İşin yeniləndi! Sağda bax.',
  chatLevel: 'Bu səviyyə söhbətdir. Süni intellektlə danış, sonra "İşimi yoxla" düyməsini bas.', courseDone: 'Bütün kursu bitirdin! 🏆',
  teacher_pass: 'Müəllim səviyyəni təsdiqlədi! ⭐', teacher_reject: 'Müəllim bu səviyyə üzərində işləməyə davam etməyini istəyir.',
  teacher_reset: 'Müəllim bir səviyyəni yenidən oynamağın üçün sıfırladı.', youAreHere: 'Sən buradasan', myWork: 'Qalereya', replay: 'Yenidən oyna',
  rooms: 'Otaqlarım', newRoom: 'Yeni otaq', roomName: 'Otağın adı', course: 'Kurs', courses: 'Kurslarım', newCourse: 'Yeni kurs',
  importCourse: '⬆ Kurs yüklə (JSON)', starter: '+ Başlanğıc kursu', levelsN: 'səviyyə', roomsN: 'otaq', studentsN: 'şagird',
  approvalMode: 'Növbəti səviyyəni kim açır?', approval_ai: 'Süni intellekt yoxlayır (dəyişə bilərsiniz)', approval_teacher: 'Hər səviyyəni mən təsdiqləyirəm',
  startSession: '▶ Dərsi başlat', endSession: '■ Dərsi bitir', liveNow: 'CANLI', closedRoom: 'Bağlı', inviteLink: 'Dəvət linki', copy: 'Kopyala',
  copied: 'Kopyalandı!', newLink: 'Yeni link', qr: 'QR kod', classMap: 'Sinif xəritəsi', approvals: 'Təsdiqinizi gözləyir', approve: 'Təsdiqlə',
  reject: 'Geri qaytar', passLevel: 'Keçir', resetLevel: 'Sıfırla', resetPin: 'PIN', newPin: 'Yeni PIN:', aiSuggests: 'Süni intellektin təklifi',
  outputs: 'Şagird işləri', allLevels: 'Bütün səviyyələr', typing: 'yazır…', noCourses: 'Əvvəlcə kitabxanadan hazır kurs seçin, kurs düzəldin və ya yükləyin.', finish: 'Bitirdi',
  confirmEnd: 'Dərsi bitirmək? Yenidən başladana qədər bütün şagirdlər çıxarılacaq.', confirmNewLink: 'Yeni link yaradılsın? Köhnə link işləməyəcək.',
  in_use: 'Bu kurs otaqda istifadə olunur, silinə bilməz.', deleteCourse: 'Kursu sil', saveCourse: 'Kursu yadda saxla',
  exportJson: '⬇ JSON yüklə', addLevel: '+ Səviyyə əlavə et', emoji: 'Emoji', intro: 'Hekayə girişi (şagirdlər görür)', taskL: 'Tapşırıq (şagird nə etməlidir)',
  aiGuide: 'Süni intellekt necə yönləndirsin (şagirdlər görmür)', criteria: 'Tamamlanma meyarları (işi yoxlamaq üçün)', outputType: 'Nəticə',
  out_game: '🎮 Oyun', out_creation: '✨ İdeya kartı', out_chat: '💬 Yalnız söhbət', description: 'Təsvir', remove: 'Sil',
  levels_err: 'Hər səviyyənin başlığı və tapşırığı olmalıdır (maks. 100 səviyyə).', title_err: 'Kursun başlığı olmalıdır.', badFile: 'Bu fayl düzgün kurs JSON-u deyil.',
  autoClose: 'Bu panel bağlandıqdan 15 dəqiqə sonra otaq avtomatik bağlanır.', progressOf: 'İrəliləyiş', checked: 'yoxladı',
  passedShort: 'keçdi', failedShort: 'hələ yox', sentToYou: 'sizi gözləyir', confirmDelete: 'Bu kurs silinsin?', unsaved: 'Yadda saxlanmamış dəyişikliklər',
  editCourse: 'Kursu redaktə et', useCourse: 'Otaqlar canlı nüsxədir: dəyişikliklər bu kursdan istifadə edən bütün otaqlara aiddir.', share2: 'Şagirdlər bu linki açır:',
  confirmRemove: 'Bu şagird və irəliləyişi silinsin?', levelsTitle: 'Səviyyələr', edit: 'Redaktə',
  nextAdv: 'Növbəti macəra', askTeacher: 'Müəllimindən onu açmasını istə!',
});
let lang = 'az';
try { const saved = localStorage.getItem('lang'); if (DICT[saved]) lang = saved; } catch {}
export const t = (k) => DICT[lang][k] ?? DICT.en[k] ?? k;
export const getLang = () => lang;
export function toggleLang() { try { localStorage.setItem('lang', lang === 'az' ? 'en' : 'az'); } catch {} location.reload(); }
// Switch language without a reload (the home page does this); call applyI18n() afterwards.
export function setLang(l) {
  if (!DICT[l]) return;
  lang = l; document.documentElement.lang = l;
  try { localStorage.setItem('lang', l); } catch {}
}
// A page with many strings of its own registers them here instead of growing DICT for every page.
export function addStrings(extra) { for (const l of Object.keys(extra)) Object.assign((DICT[l] ??= {}), extra[l]); }

// Fill [data-t] / [data-ph] / [data-aria] elements
export function applyI18n(root = document) {
  root.querySelectorAll('[data-t]').forEach((e) => (e.textContent = t(e.dataset.t)));
  root.querySelectorAll('[data-ph]').forEach((e) => (e.placeholder = t(e.dataset.ph)));
  root.querySelectorAll('[data-aria]').forEach((e) => e.setAttribute('aria-label', t(e.dataset.aria)));
}

export async function api(url, method = 'GET', body) {
  const r = await fetch(url, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(data.error || 'error'), { code: data.error, status: r.status });
  return data;
}
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const $ = (s, r = document) => r.querySelector(s);

export function onEvents(url, handler) {
  const es = new EventSource(url); // browser auto-reconnects
  es.onmessage = (e) => handler(JSON.parse(e.data));
  return es;
}

// Last complete ```html (or ```creation) block in an AI reply, or null
export function extractGame(text, tag = 'html') {
  let m, last = null;
  const re = new RegExp('```' + tag + '\\s*([\\s\\S]*?)```', 'g');
  while ((m = re.exec(text))) last = m[1].trim();
  return last;
}

// Sandboxed iframe: scripts only, opaque origin, no network (CSP). Games can't touch the platform or each other.
const CSP = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; media-src data:; font-src data:; form-action 'none'">`;
export function gameDoc(html) {
  const head = html.match(/<head[^>]*>/i);
  if (head) return html.replace(head[0], head[0] + CSP);
  return `<!doctype html><html><head><meta charset="utf-8">${CSP}</head><body>${html}</body></html>`;
}
export function gameFrame(html) {
  const f = document.createElement('iframe');
  f.setAttribute('sandbox', 'allow-scripts');
  f.setAttribute('referrerpolicy', 'no-referrer');
  f.srcdoc = gameDoc(html);
  return f;
}

// Creation card: first line is the name, "Label: value" lines get a bold label. Text only, never HTML.
export function creationCard(text) {
  const card = document.createElement('div'); card.className = 'creation';
  const [name, ...lines] = String(text).trim().split('\n');
  const h = document.createElement('h3'); h.textContent = name.replace(/^[#*\s]+|[*\s]+$/g, ''); card.append(h);
  for (const line of lines) {
    if (!line.trim()) continue;
    const p = document.createElement('p'), m = line.match(/^\s*[-*]?\s*([^:]{1,30}):\s*(.*)$/);
    if (m) { const b = document.createElement('b'); b.textContent = m[1].replace(/\*/g, '') + ': '; p.append(b, m[2].replace(/\*\*/g, '')); }
    else p.textContent = line.replace(/\*\*/g, '');
    card.append(p);
  }
  return card;
}
export const stars = (n, max = 3) => '★'.repeat(n) + '☆'.repeat(Math.max(0, max - n));
export function toast(text, kind = '') {
  const d = Object.assign(document.createElement('div'), { className: 'toast ' + kind, textContent: text });
  document.body.append(d); setTimeout(() => d.remove(), 4000);
}
