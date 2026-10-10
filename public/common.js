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
let lang = 'az';
try { lang = localStorage.getItem('lang') || 'az'; } catch {}
export const t = (k) => DICT[lang][k] ?? DICT.en[k] ?? k;
export const getLang = () => lang;
export function toggleLang() { try { localStorage.setItem('lang', lang === 'az' ? 'en' : 'az'); } catch {} location.reload(); }

// Fill [data-t] / [data-ph] elements
export function applyI18n(root = document) {
  root.querySelectorAll('[data-t]').forEach((e) => (e.textContent = t(e.dataset.t)));
  root.querySelectorAll('[data-ph]').forEach((e) => (e.placeholder = t(e.dataset.ph)));
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

// Last complete ```html block in an AI reply, or null
export function extractGame(text) {
  let m, last = null;
  const re = /```html\s*([\s\S]*?)```/g;
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
