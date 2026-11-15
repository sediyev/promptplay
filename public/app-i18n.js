// Strings of the app pages (student, teacher, admin, join) that the public home page does not need:
// video meeting rooms, replies that ended badly, the safety notices and the admin's teacher controls.
// Kept out of common.js, which the home page loads and which counts towards its weight budget.
import { addStrings } from '/common.js';

addStrings({
  en: {
    mt_label: '📹 Video meeting', mt_wait: 'Your teacher has not opened the meeting yet. Stay on this page: the button to join appears here.',
    mt_ready: 'Your teacher is in the meeting. Come in!', seenMeet: '👀 Your teacher can see whether this page is open in front of you. Nothing is recorded.',
    cutOffMsg: '✂️ That answer got too long and was cut off before it finished. Ask for something smaller or simpler, or ask for one change at a time.',
    refusedMsg: "I can't help with that one. Let's get back to our task. 😊",
    withdrawnMsg: '🧹 I took that answer back because it was not right for our class. Please ask me again in other words.',
    busy: 'Wait for the answer to your last message first.', bad_nick_words: 'Please pick another nickname: a friendly one, with no phone number or surname.',
    login_locked: 'Too many wrong tries. Please wait 15 minutes and try again.', sharedPill: '📤 shared with the class', stopShare: 'Stop sharing',
    deleteRoom: '🗑️ Delete this room', confirmDeleteRoom: 'Delete this room for good? Its students, their chats, games and progress are deleted with it. The course stays.',
    sc_withheld: 'AI answer taken back', withheldMsg: 'AI answer taken back',
    adm_newPw: '🔑 New password', adm_pwPrompt: 'New password for {name} (at least 6 characters). They will have to log in again.', adm_pwDone: 'Password changed.',
    adm_removeTeacher: 'Remove', adm_confirmTeacher: 'Remove {name} for good? Their {rooms} rooms (with all student work) and {courses} courses are deleted too.',
  },
  az: {
    mt_label: '📹 Video görüş', mt_wait: 'Müəllim hələ görüşü açmayıb. Bu səhifədə qal: qoşulma düyməsi burada görünəcək.',
    mt_ready: 'Müəllim görüşdədir. Gəl, qoşul!', seenMeet: '👀 Müəllim bu səhifənin qarşında açıq olub-olmadığını görə bilir. Heç nə yazılmır.',
    cutOffMsg: '✂️ Cavab çox uzun oldu və yarımçıq qaldı. Daha kiçik və ya sadə bir şey istə, ya da dəyişiklikləri bir-bir istə.',
    refusedMsg: 'Bu barədə kömək edə bilmirəm. Gəl tapşırığımıza qayıdaq. 😊',
    withdrawnMsg: '🧹 Bu cavabı geri götürdüm, çünki sinfimizə uyğun deyildi. Zəhmət olmasa, başqa sözlərlə yenidən soruş.',
    busy: 'Əvvəlcə son mesajının cavabını gözlə.', bad_nick_words: 'Zəhmət olmasa, başqa ləqəb seç: mehriban olsun, telefon nömrəsi və ya soyad olmasın.',
    login_locked: 'Çox səhv cəhd oldu. 15 dəqiqə gözləyin və yenidən cəhd edin.', sharedPill: '📤 siniflə paylaşılıb', stopShare: 'Paylaşmanı dayandır',
    deleteRoom: '🗑️ Bu otağı sil', confirmDeleteRoom: 'Bu otaq həmişəlik silinsin? Şagirdləri, onların çatları, oyunları və irəliləyişi də silinəcək. Kurs qalır.',
    sc_withheld: 'Süni intellektin cavabı geri götürüldü', withheldMsg: 'Süni intellektin cavabı geri götürüldü',
    adm_newPw: '🔑 Yeni parol', adm_pwPrompt: '{name} üçün yeni parol (ən azı 6 simvol). Yenidən daxil olmalı olacaq.', adm_pwDone: 'Parol dəyişdirildi.',
    adm_removeTeacher: 'Sil', adm_confirmTeacher: '{name} həmişəlik silinsin? Onun {rooms} otağı (bütün şagird işləri ilə) və {courses} kursu da silinəcək.',
  },
});
