// Strings of the course library (library.html), the library controls on the admin page and the library hints on the teacher page.
// Kept out of common.js so the public home page does not pay for them. The Azerbaijani text needs a native-speaker read-through before launch.
import { addStrings } from '/common.js';

addStrings({
  en: {
    lib_h: 'Course library', lib_lead: 'Ready-made courses for every age. Preview one, then open a room from it in about a minute. No writing needed.',
    lib_age: 'Age', lib_all: 'All', lib_theme: 'Theme', lib_length: 'Length', lib_prog: 'Programme', lib_search: 'Search courses', lib_courseLang: 'Course language',
    'lib_age_8-11': 'Ages 8 to 11', 'lib_age_12-17': 'Ages 12 to 17', lib_agesFmt: 'Ages {a} to {b}',
    th_starter: 'Start here', th_stories: 'Stories and writing', th_science: 'Science', 'th_ai-literacy': 'Understanding AI', th_games: 'Games', th_trial: 'Trial class',
    len_one: 'One session', len_short: '2 to 4 sessions', len_long: '5 or more sessions', lib_sessionsN: '{n} sessions', lib_mins: '{a} to {b} minutes',
    pr_trial: 'Trial class', 'pr_term-1': 'Term 1', 'pr_term-2': 'Term 2', 'pr_term-3': 'Term 3', pr_holiday: 'Holiday camp',
    lib_none: 'No course matches these filters.', lib_open: 'View course', lib_learn: 'What your child will learn', lib_levels: 'Every level, as your students will see it',
    lib_story: 'Story intro', lib_task: 'Task', lib_done: 'What counts as done', lib_ai: 'How the AI will guide (students never see this)',
    lib_expand: 'Open all', lib_collapse: 'Close all', lib_actions: 'Use this course',
    lib_openRoom: 'Open a room with this course', lib_roomHelp: 'Creates a room with its invite link and class code. Nothing to write.',
    lib_copy: 'Make my own copy to edit', lib_copyHelp: 'You get your own course to reword, reorder, remove or add levels. The library course stays as it is for everyone.',
    lib_parent: 'Copy a summary for parents', lib_parentCopied: 'Summary copied', lib_parentGoals: 'What your child will learn:',
    lib_hidden: 'Hidden from teachers by the admin', lib_adminView: 'You are viewing as admin. Teachers open rooms from here.',
    lib_reviewAz: 'Azerbaijani text is waiting for a native-speaker review', lib_next: 'What comes next',
    lib_partial: 'This course is not complete in this language yet. Missing parts show in the other language.',
    lib_back: '← Library', lib_made: 'From the library', lib_browse: 'Browse the course library',
    lib_quick: 'Pick a ready-made course', lib_quickSub: 'Filter by age, theme and length, preview every level and open a room in a minute.',
    adm_lib: 'Course library', adm_libHelp: 'Choose which library courses teachers can see. Hiding a course does not change rooms or copies that teachers already made.',
    adm_visible: 'Visible', adm_hiddenL: 'Hidden', adm_add: 'Add an in-house course', adm_addHelp: 'Upload a course in the library JSON format (see the README). It appears in the library next to the built-in courses.',
    adm_upload: '⬆ Upload library course (JSON)', adm_delete: 'Remove', adm_builtin: 'Built in', adm_inhouse: 'In-house', adm_preview: 'Preview', adm_download: '⬇ JSON',
    adm_bad: 'That file is not a valid library course. Problem with:', adm_exists: 'This id belongs to a built-in course. Choose another id.', adm_confirmDelete: 'Remove this in-house course from the library?',
  },
  az: {
    lib_h: 'Kurs kitabxanası', lib_lead: 'Hər yaş üçün hazır kurslar. Birinə bax, sonra təxminən bir dəqiqəyə ondan otaq aç. Heç nə yazmaq lazım deyil.',
    lib_age: 'Yaş', lib_all: 'Hamısı', lib_theme: 'Mövzu', lib_length: 'Müddət', lib_prog: 'Proqram', lib_search: 'Kurs axtar', lib_courseLang: 'Kursun dili',
    'lib_age_8-11': '8-11 yaş', 'lib_age_12-17': '12-17 yaş', lib_agesFmt: '{a}-{b} yaş',
    th_starter: 'Başlanğıc', th_stories: 'Hekayə və yazı', th_science: 'Elm', 'th_ai-literacy': 'Süni intellekti tanımaq', th_games: 'Oyunlar', th_trial: 'Sınaq dərsi',
    len_one: 'Bir dərs', len_short: '2-4 dərs', len_long: '5 və daha çox dərs', lib_sessionsN: '{n} dərs', lib_mins: '{a}-{b} dəqiqə',
    pr_trial: 'Sınaq dərsi', 'pr_term-1': '1-ci dövr', 'pr_term-2': '2-ci dövr', 'pr_term-3': '3-cü dövr', pr_holiday: 'Tətil düşərgəsi',
    lib_none: 'Bu filtrlərə uyğun kurs tapılmadı.', lib_open: 'Kursa bax', lib_learn: 'Övladınız nə öyrənəcək', lib_levels: 'Bütün səviyyələr, şagirdlərin görəcəyi kimi',
    lib_story: 'Hekayə girişi', lib_task: 'Tapşırıq', lib_done: 'Nə zaman tamamlanmış sayılır', lib_ai: 'Süni intellekt necə yönləndirəcək (şagirdlər bunu görmür)',
    lib_expand: 'Hamısını aç', lib_collapse: 'Hamısını bağla', lib_actions: 'Bu kursdan istifadə et',
    lib_openRoom: 'Bu kursla otaq aç', lib_roomHelp: 'Dəvət linki və sinif kodu olan otaq düzəldir. Heç nə yazmaq lazım deyil.',
    lib_copy: 'Redaktə üçün öz nüsxəmi düzəlt', lib_copyHelp: 'Səviyyələri başqa sözlərlə yaza, yerini dəyişə, silə və ya əlavə edə biləcəyin öz kursun olur. Kitabxanadakı kurs hamı üçün olduğu kimi qalır.',
    lib_parent: 'Valideynlər üçün xülasəni kopyala', lib_parentCopied: 'Xülasə kopyalandı', lib_parentGoals: 'Övladınız nə öyrənəcək:',
    lib_hidden: 'Admin tərəfindən müəllimlərdən gizlədilib', lib_adminView: 'Admin olaraq baxırsan. Otaqları müəllimlər buradan açır.',
    lib_reviewAz: 'Azərbaycan dilindəki mətn ana dilli oxucunun yoxlamasını gözləyir', lib_next: 'Növbəti macəra',
    lib_partial: 'Bu kurs hələ bu dildə tam deyil. Çatışmayan hissələr digər dildə göstərilir.',
    lib_back: '← Kitabxana', lib_made: 'Kitabxanadan', lib_browse: 'Kurs kitabxanasına bax',
    lib_quick: 'Hazır kurs seç', lib_quickSub: 'Yaşa, mövzuya və müddətə görə axtar, hər səviyyəyə bax və bir dəqiqəyə otaq aç.',
    adm_lib: 'Kurs kitabxanası', adm_libHelp: 'Müəllimlərin hansı kitabxana kurslarını görəcəyini seç. Kursu gizlətmək müəllimlərin artıq düzəltdiyi otaqlara və nüsxələrə təsir etmir.',
    adm_visible: 'Görünür', adm_hiddenL: 'Gizli', adm_add: 'Öz kursunu əlavə et', adm_addHelp: 'Kursu kitabxana JSON formatında yüklə (README-yə bax). O, daxili kurslarla yanaşı kitabxanada görünəcək.',
    adm_upload: '⬆ Kitabxana kursu yüklə (JSON)', adm_delete: 'Sil', adm_builtin: 'Daxili', adm_inhouse: 'Öz kursumuz', adm_preview: 'Bax', adm_download: '⬇ JSON',
    adm_bad: 'Bu fayl düzgün kitabxana kursu deyil. Problem burada:', adm_exists: 'Bu id daxili kursa məxsusdur. Başqa id seç.', adm_confirmDelete: 'Bu kurs kitabxanadan silinsin?',
  },
});

// "Ages {a} to {b}" -> filled in
export const fmt = (s, vars) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
