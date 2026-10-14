// Strings of the public home page. home.js registers them into the shared dictionary in common.js,
// so t() and applyI18n() work as on every other page. Pure data on purpose: test/home.test.js imports
// this file in Node to check that both languages are complete.
// TODO(native review): the Azerbaijani copy is written to read naturally, not word for word. Have a native speaker read it before launch.
// Placeholders in [BRACKETS] are business details that are not decided yet (see README "Home page").
export const HOME = {
  en: {
    m_title: 'PromptPlay: kids learn to create with AI by playing',
    m_desc: 'A classroom adventure for ages 8 to 17. Kids invent heroes, build games and learn to direct AI. A teacher runs every class and sees everything.',

    n_skip: 'Skip to content', n_nav: 'Main menu', n_enter: 'Enter class', n_teacher: 'Teacher login',
    n_lang: 'AZ EN, switch to Azerbaijani',
    cta: 'Book a free trial class', // [PRIMARY CTA]

    // welcome
    hr_hi: 'Welcome to PromptPlay',
    hr_h1a: 'Your child will grow up with AI.', hr_h1b: 'Let them learn to lead it.',
    hr_sub: 'PromptPlay is a classroom adventure where kids learn to create with AI by playing. A teacher runs every class.',
    hr_how: 'Follow the story',
    hr_t2: 'Ages 8 to 17', hr_t3: 'Azerbaijani and English', hr_t4: 'Nothing to install',

    // the story, in five chapters
    sy_k: 'How it works', sy_h: 'Follow one child through a class',

    c1_h: 'It starts with a curious kid',
    c1_p: 'Every child picks a player and brings their own ideas: a hero, a creature, a whole new world. No coding needed.',
    pl_title: 'Pick a player for the story',
    pl1: 'Fox', pl2: 'Panda', pl3: 'Tiger', pl4: 'Lion', pl5: 'Frog', pl6: 'Unicorn', pl7: 'Rocket', pl8: 'Robot',
    mq1: 'make a game where I catch falling stars', mq2: 'invent a superhero who is scared of the dark',
    mq3: 'design a creature that lives inside a volcano', mq4: 'build a world where the rain falls upwards',

    c2_h: 'They learn to say exactly what they mean',
    c2_p: 'A prompt is simply telling the AI clearly what you want. The more detail they give, the better the result. That is the core skill, and they practise it in every level.',
    pu_say: 'You tell the AI', pu_s1: 'Plain', pu_s2: 'Better', pu_s3: 'Super',
    pu_p1: 'make a game', pu_p2: 'make a game where I catch falling stars',
    pu_p3: 'make a space game where I catch falling stars for 20 seconds. Golden stars give 5 points, and it gets faster and faster.',

    c3_h: 'The AI builds it. They make it better.',
    c3_p: 'In seconds the idea becomes a game they can play. Then they ask for changes, test them and get anything broken fixed.',
    lb_lv: 'Level', lv6t: 'Your First Game',
    pw_p1: 'make a space game where I catch falling stars', pw_safe: 'Safety checked', pw_build: 'Building your game…',
    pw_r1: 'Your game is ready! Play it, then tell me what to change.', pw_p2: 'make the stars fall faster', pw_r2: 'Done! The stars zoom down now.',

    c4_h: 'Every level ends with stars',
    c4_p: 'Ten short missions take them from meeting the AI to presenting their own hero game. They earn up to three stars and unlock the next level.',
    lv1t: 'Hello, AI!', lv2t: 'The Clear Prompt Challenge', lv3t: 'Invent a Superhero', lv4t: 'Design a Creature', lv5t: 'Build a World',
    lv7t: 'Game Designer', lv8t: 'Bug Hunter', lv9t: 'Hero Game', lv10t: 'Show and Tell',
    mp_note: 'Teachers can also create their own courses.',
    pw_check: 'Check my work', pw_unlock: 'Level unlocked!',

    c5_h: 'A teacher is there the whole way',
    c5_p: 'The teacher opens the class, sees every message and every AI reply live, and can pause one child or the whole class at any moment.',
    sa1: 'Every message is safety checked before it reaches the AI.',
    sa2: 'The AI stays on the lesson and keeps everything age appropriate.',
    sa3: 'Games run in a sealed sandbox with no internet access.',
    sa4: 'Kids sign in with a nickname, an avatar and a 4 digit PIN. No real names, emails or phone numbers.',
    hb1: 'Every message is safety checked', hb2: 'The teacher sees it live', live: 'LIVE',

    // after the story
    sk_h: 'Skills that last beyond the game', sk_lead: 'Kids play for fun. Along the way they practise skills that matter far beyond the game.',
    sk1t: 'Clear communication', sk2t: 'Creativity', sk3t: 'Problem solving', sk4t: 'Critical thinking', sk5t: 'Safe online habits', sk6t: 'Confidence to build',

    fq_h: 'Questions parents ask',
    q1: 'Does my child need to know coding?', a1: 'No. The AI writes the game code. Kids learn to direct it, test it and get bugs fixed.',
    q2: 'What age is it for?', a2: 'Ages 8 to 17. Missions are open ended, so younger kids keep it simple and older kids go deeper.',
    q3: 'Is it safe?', a3: 'It is built with several layers of protection. The teacher sees every message and AI reply live, every message is safety checked before it reaches the AI, and the teacher can pause one child or the whole class at any moment. No tool is perfect, so the teacher stays in charge. See all protections above.',
    q4: 'Is this just more screen time?', a4: 'It is creating with a teacher, not scrolling. Kids invent heroes and build games, and accounts only work during class.',
    q5: 'What device do we need?', a5: 'Any modern browser on a laptop, tablet or phone. There is nothing to install.',
    q6: 'Which languages does it use?', a6: 'Azerbaijani and English. The AI answers in the language your child writes in.',
    q7: 'What happens to my child’s data?', a7: 'Kids sign in with a nickname, an avatar and a 4 digit PIN. No real names, emails or phone numbers are asked for. Chat history is deleted automatically after 30 days (the current default setting). Full policy: [PRIVACY POLICY LINK]',
    q8: 'Where and when are classes?', a8: '[LOCATIONS AND SCHEDULE]',
    q9: 'How much does it cost?', a9: '[PRICE]',

    fi_h: 'Ready to start the adventure?', fi_code: 'Already have a class code?',
    ft_contact: 'Contact', ft_privacy: 'Privacy policy',
  },

  az: {
    m_title: 'PromptPlay: uşaqlar oynayaraq süni intellektlə öz ideyalarını gerçəkləşdirməyi öyrənir',
    m_desc: '8 ilə 17 yaş arası uşaqlar üçün sinif macərası. Uşaqlar qəhrəman icad edir, oyun qurur və süni intellektə yön verməyi öyrənir. Hər sinfi müəllim aparır və hər şeyi görür.',

    n_skip: 'Məzmuna keç', n_nav: 'Əsas menyu', n_enter: 'Sinfə qoşul', n_teacher: 'Müəllim girişi',
    n_lang: 'AZ EN, İngilis dilinə keç',
    cta: 'Pulsuz sınaq dərsinə yazıl', // [PRIMARY CTA]

    hr_hi: 'PromptPlay-ə xoş gəlmisiniz',
    hr_h1a: 'Övladınız süni intellektlə böyüyəcək.', hr_h1b: 'Qoy ona yön verməyi öyrənsin.',
    hr_sub: 'PromptPlay uşaqların oynayaraq süni intellektlə öz ideyalarını gerçəkləşdirməyi öyrəndiyi sinif macərasıdır. Hər sinfi müəllim aparır.',
    hr_how: 'Hekayəni izləyin',
    hr_t2: '8 ilə 17 yaş arası', hr_t3: 'Azərbaycan və ingilis dilləri', hr_t4: 'Quraşdırma lazım deyil',

    sy_k: 'Necə işləyir', sy_h: 'Bir uşağın dərsini birlikdə izləyək',

    c1_h: 'Hər şey maraqlı bir uşaqla başlayır',
    c1_p: 'Hər uşaq özünə oyunçu seçir və öz ideyalarını gətirir: qəhrəman, məxluq, tamamilə yeni bir dünya. Kodlaşdırma lazım deyil.',
    pl_title: 'Hekayə üçün oyunçu seçin',
    pl1: 'Tülkü', pl2: 'Panda', pl3: 'Pələng', pl4: 'Aslan', pl5: 'Qurbağa', pl6: 'Təkbuynuz', pl7: 'Raket', pl8: 'Robot',
    mq1: 'düşən ulduzları tutduğum oyun düzəlt', mq2: 'qaranlıqdan qorxan super qəhrəman icad et',
    mq3: 'vulkanın içində yaşayan məxluq dizayn et', mq4: 'yağışın yuxarı yağdığı dünya qur',

    c2_h: 'Nə istədiyini dəqiq deməyi öyrənir',
    c2_p: 'Prompt, süni intellektə nə istədiyini aydın şəkildə bildirməkdir. Nə qədər çox detal verilsə, nəticə o qədər yaxşı olur. Əsas bacarıq budur və uşaqlar onu hər səviyyədə məşq edir.',
    pu_say: 'Süni intellektə deyirsən', pu_s1: 'Sadə', pu_s2: 'Daha yaxşı', pu_s3: 'Super',
    pu_p1: 'oyun düzəlt', pu_p2: 'düşən ulduzları tutduğum oyun düzəlt',
    pu_p3: 'düşən ulduzları 20 saniyə ərzində tutduğum kosmos oyunu düzəlt. Qızıl ulduzlar 5 xal versin, oyun isə getdikcə sürətlənsin.',

    c3_h: 'Süni intellekt qurur. Uşaq onu daha da yaxşılaşdırır.',
    c3_p: 'Bir neçə saniyədə ideya oynana bilən oyuna çevrilir. Sonra uşaq dəyişiklik istəyir, onları sınayır və xətaları düzəltdirir.',
    lb_lv: 'Səviyyə', lv6t: 'İlk Oyunun',
    pw_p1: 'düşən ulduzları tutduğum kosmos oyunu düzəlt', pw_safe: 'Təhlükəsizlik yoxlandı', pw_build: 'Oyunun qurulur…',
    pw_r1: 'Oyunun hazırdır! Oyna, sonra nəyi dəyişək, de.', pw_p2: 'ulduzlar daha sürətlə düşsün', pw_r2: 'Hazırdır! İndi ulduzlar sürətlə düşür.',

    c4_h: 'Hər səviyyə ulduzlarla bitir',
    c4_p: 'On qısa missiya uşağı süni intellektlə tanışlıqdan öz qəhrəman oyununu təqdim etməyə qədər aparır. Uşaqlar üç ulduza qədər qazanır və növbəti səviyyəni açır.',
    lv1t: 'Salam, Süni İntellekt!', lv2t: 'Aydın Prompt Çağırışı', lv3t: 'Super Qəhrəman İcad Et', lv4t: 'Məxluq Dizayn Et', lv5t: 'Dünya Qur',
    lv7t: 'Oyun Dizayneri', lv8t: 'Xəta Ovçusu', lv9t: 'Qəhrəman Oyunu', lv10t: 'Göstər və Danış',
    mp_note: 'Müəllimlər öz kurslarını da hazırlaya bilər.',
    pw_check: 'İşimi yoxla', pw_unlock: 'Yeni səviyyə açıldı!',

    c5_h: 'Müəllim hər addımda yanındadır',
    c5_p: 'Müəllim sinfi açır, hər mesajı və süni intellektin hər cavabını canlı görür, istənilən anda bir uşağı və ya bütün sinfi dayandıra bilər.',
    sa1: 'Hər mesaj süni intellektə çatmazdan əvvəl yoxlanılır.',
    sa2: 'Süni intellekt dərsdən kənara çıxmır və hər şeyi yaşa uyğun saxlayır.',
    sa3: 'Oyunlar internetə çıxışı olmayan qapalı mühitdə işləyir.',
    sa4: 'Uşaqlar ləqəb, avatar və 4 rəqəmli PIN ilə daxil olur. Real ad, e-poçt və ya telefon nömrəsi istənilmir.',
    hb1: 'Hər mesaj yoxlanılır', hb2: 'Müəllim hər şeyi canlı görür', live: 'CANLI',

    sk_h: 'Oyundan kənarda da lazım olan bacarıqlar', sk_lead: 'Uşaqlar əyləncə üçün oynayır. Bu arada oyundan kənarda da lazım olan bacarıqları məşq edirlər.',
    sk1t: 'Aydın ünsiyyət', sk2t: 'Təxəyyül', sk3t: 'Problem həlli', sk4t: 'Tənqidi düşüncə', sk5t: 'Təhlükəsiz onlayn vərdişlər', sk6t: 'Bacarığına inam',

    fq_h: 'Valideynlərin sualları',
    q1: 'Övladımın kodlaşdırma bilməsi lazımdırmı?', a1: 'Xeyr. Oyun kodunu süni intellekt yazır. Uşaqlar ona yön verməyi, nəticəni sınamağı və xətaları düzəltdirməyi öyrənir.',
    q2: 'Hansı yaş üçündür?', a2: '8 ilə 17 yaş arası. Missiyalar açıq xarakterlidir: kiçik uşaqlar sadə saxlayır, böyüklər isə daha dərinə gedir.',
    q3: 'Təhlükəsizdirmi?', a3: 'Bir neçə qoruma qatı ilə qurulub. Müəllim hər mesajı və süni intellektin hər cavabını canlı görür, hər mesaj süni intellektə çatmazdan əvvəl yoxlanılır, müəllim isə istənilən anda bir uşağı və ya bütün sinfi dayandıra bilər. Heç bir vasitə qüsursuz deyil, ona görə rəhbərlik həmişə müəllimdədir. Bütün qorumalar yuxarıda göstərilib.',
    q4: 'Bu, sadəcə daha çox ekran vaxtıdırmı?', a4: 'Bu, sonsuz sürüşdürmə yox, müəllimlə birgə nəsə düzəltməkdir. Uşaqlar qəhrəman icad edir, oyun qurur; hesablar isə yalnız dərs zamanı işləyir.',
    q5: 'Hansı cihaz lazımdır?', a5: 'Noutbuk, planşet və ya telefonda istənilən müasir brauzer kifayətdir. Heç nə quraşdırmaq lazım deyil.',
    q6: 'Hansı dillərdə işləyir?', a6: 'Azərbaycan və ingilis dillərində. Süni intellekt uşağın yazdığı dildə cavab verir.',
    q7: 'Övladımın məlumatlarına nə olur?', a7: 'Uşaqlar ləqəb, avatar və 4 rəqəmli PIN ilə daxil olur. Real ad, e-poçt və ya telefon nömrəsi istənilmir. Söhbət tarixçəsi 30 gündən sonra avtomatik silinir (hazırkı standart ayar). Tam siyasət: [PRIVACY POLICY LINK]',
    q8: 'Siniflər harada və nə vaxt keçirilir?', a8: '[LOCATIONS AND SCHEDULE]',
    q9: 'Qiyməti nə qədərdir?', a9: '[PRICE]',

    fi_h: 'Macəraya başlamağa hazırsınız?', fi_code: 'Sinif kodunuz artıq var?',
    ft_contact: 'Əlaqə', ft_privacy: 'Məxfilik siyasəti',
  },
};
