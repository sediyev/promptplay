// Small group video call (the teacher and a few students), shown in a panel over the page or, in a meeting room, as the page itself.
// Every browser connects straight to every other one (WebRTC); the server only relays the setup messages.
// Each connection always has one audio and one video slot, so turning the camera, microphone or screen on and off
// only swaps what goes into the slot and never needs a new handshake.
import { api, t, esc, toast, addStrings } from '/common.js';

addStrings({
  en: {
    call_title: '📹 Video call', call_start: '📹 Start video call', call_join: '📹 Join call', call_end: '■ End call for everyone',
    call_leave: 'Leave', call_mic: 'Microphone', call_cam: 'Camera', call_screen: 'Share screen', call_stopScreen: 'Stop sharing',
    call_full: 'The call is full', call_ended: 'The video call has ended.', call_removed: 'Your teacher took you out of the call.',
    call_replaced: 'You joined the call from another tab.', call_muted: 'Your teacher muted your microphone.',
    call_banner: 'Your teacher started a video call.', call_you: 'you', call_mute: 'Mute', call_remove: 'Remove from call',
    call_noDevice: 'Could not use the camera or microphone. Check that the browser is allowed to use them.',
    call_https: 'Video calls need a secure (https) connection and a modern browser.', call_connecting: 'connecting…',
    call_min: 'Make smaller', call_max: 'Make bigger', call_confirmEnd: 'End the video call for everyone?', call_inCall: 'in the video call',
    call_private: 'Nothing is recorded. Your camera and microphone stay off until you turn them on.',
    call_noconn: '⚠️ no connection', call_sound: '🔊 Tap to hear everyone',
    call_failNoRelay: 'Video cannot get through to someone in the call. Their internet (often mobile data or a school network) blocks direct video calls. Whoever runs PromptPlay can fix this by turning on a TURN relay (README, "Video call").',
    call_failRelay: 'Video cannot get through to someone in the call. Ask them to reload the page, or to try another network.',
    call_failStudent: 'The video call cannot connect from this internet. Reload the page, or try another Wi-Fi.',
    call_endMeet: '■ End meeting for everyone', call_confirmEndMeet: 'End the meeting? Everyone will be logged out until you start it again.',
    call_pin: 'Click a picture to make it bigger',
  },
  az: {
    call_title: '📹 Video zəng', call_start: '📹 Video zəngə başla', call_join: '📹 Zəngə qoşul', call_end: '■ Zəngi hamı üçün bitir',
    call_leave: 'Çıx', call_mic: 'Mikrofon', call_cam: 'Kamera', call_screen: 'Ekranı paylaş', call_stopScreen: 'Paylaşmanı dayandır',
    call_full: 'Zəngdə yer yoxdur', call_ended: 'Video zəng bitdi.', call_removed: 'Müəllim səni zəngdən çıxardı.',
    call_replaced: 'Zəngə başqa vərəqdən qoşuldun.', call_muted: 'Müəllim mikrofonunu söndürdü.',
    call_banner: 'Müəllim video zəngə başladı.', call_you: 'sən', call_mute: 'Səsi söndür', call_remove: 'Zəngdən çıxar',
    call_noDevice: 'Kamera və ya mikrofon işə düşmədi. Brauzerin onlardan istifadəsinə icazə verdiyini yoxla.',
    call_https: 'Video zəng üçün təhlükəsiz (https) bağlantı və müasir brauzer lazımdır.', call_connecting: 'qoşulur…',
    call_min: 'Kiçilt', call_max: 'Böyüt', call_confirmEnd: 'Video zəng hamı üçün bitirilsin?', call_inCall: 'video zəngdədir',
    call_private: 'Heç nə yazılmır. Kamera və mikrofon sən açana qədər sönülü qalır.',
    call_noconn: '⚠️ bağlantı yoxdur', call_sound: '🔊 Səsi açmaq üçün toxun',
    call_failNoRelay: 'Zəngdəki kiminləsə video bağlantısı qurulmur. Onun interneti (çox vaxt mobil internet və ya məktəb şəbəkəsi) birbaşa video zəngləri bloklayır. PromptPlay-i idarə edən şəxs serverdə TURN relay qoşaraq bunu düzəldə bilər (README, "Video call").',
    call_failRelay: 'Zəngdəki kiminləsə video bağlantısı qurulmur. Ondan səhifəni yeniləməsini və ya başqa şəbəkə yoxlamasını xahiş et.',
    call_failStudent: 'Video zəng bu internetdən qoşula bilmir. Səhifəni yenilə və ya başqa Wi-Fi yoxla.',
    call_endMeet: '■ Görüşü hamı üçün bitir', call_confirmEndMeet: 'Görüş bitirilsin? Yenidən başladana qədər hamı çıxarılacaq.',
    call_pin: 'Böyütmək üçün şəklin üstünə bas',
  },
});

export const callSupported = () => !!(window.RTCPeerConnection && navigator.mediaDevices?.getUserMedia && window.isSecureContext);
// Picture quality follows the number of people in the call. Every browser sends its video to each of the others, so two
// people can have HD while a full meeting keeps each picture small; either way one person uploads about 2 to 3 Mbit/s at most.
// These are ceilings: on a slow connection or a slow computer the browser lowers the picture by itself.
const TIERS = [ // up to this many people: picture height, frames per second, bits per second to each of the others
  { n: 2, h: 720, fps: 30, rate: 2500000 },
  { n: 4, h: 540, fps: 24, rate: 900000 },
  { n: 6, h: 360, fps: 20, rate: 500000 },
  { n: Infinity, h: 270, fps: 15, rate: 280000 },
];
export const tierFor = (n) => TIERS.find((x) => n <= x.n);
const cameraWants = (q) => ({ width: { ideal: Math.round(q.h * 16 / 9) }, height: { ideal: q.h }, frameRate: { ideal: q.fps, max: q.fps } });
// A shared screen is mostly text: full HD and sharp before smooth, with the bitrate shared between the viewers.
const SCREEN = { width: { max: 1920 }, height: { max: 1080 }, frameRate: { ideal: 15, max: 15 } };
const screenRate = (n) => Math.round(Math.min(2500000, Math.max(600000, 4000000 / Math.max(1, n - 1))));
// Chrome starts every video stream at about 0.3 Mbit/s and needs half a minute to find out that it may send more, so the
// picture begins blurry. A Chrome-only hint in the description it applies says where to start instead; other browsers
// ignore the hint, and nothing changes in what is sent to the other person. Small tiers start low anyway and are left alone.
const startRate = (n) => Math.min(1000, Math.round(tierFor(n).rate / 2000)); // kbit/s
export function quickStart(desc, n) {
  const kbps = startRate(n);
  if (!desc?.sdp || kbps <= 300 || desc.sdp.includes('x-google-start-bitrate')) return desc;
  const lines = desc.sdp.split('\r\n'), hint = `x-google-start-bitrate=${kbps}`;
  // the video codecs on offer, and which of them already have a settings (fmtp) line to add the hint to
  const codecs = new Set(), has = new Set(), out = [];
  let video = false;
  for (const l of lines) {
    if (l.startsWith('m=')) video = l.startsWith('m=video');
    if (!video) continue;
    const map = l.match(/^a=rtpmap:(\d+) (VP8|VP9|H264|H265|AV1)\//i), fmtp = l.match(/^a=fmtp:(\d+) /);
    if (map) codecs.add(map[1]); if (fmtp) has.add(fmtp[1]);
  }
  for (const l of lines) {
    const pt = l.match(/^a=(?:rtpmap|fmtp):(\d+) /)?.[1];
    if (!codecs.has(pt)) out.push(l);
    else if (l.startsWith('a=fmtp:')) out.push(`${l};${hint}`);
    else if (has.has(pt)) out.push(l);
    else out.push(l, `a=fmtp:${pt} ${hint}`); // a codec with no settings line of its own (VP8) gets one
  }
  return { type: desc.type, sdp: out.join('\r\n') };
}
let active = null; // one call per page

/**
 * Joins the call and shows the panel. Resolves to the call, or null when it could not start.
 * opts: { events: stream url, teacher: bool, classId, me: {name, avatar}, mic: bool, cam: bool, label(info): extra tile text, onLeave(reason),
 *         mount: element to show the call in as a full "stage" (a meeting room) instead of the floating panel, meeting: bool }
 */
export async function joinCall(opts) {
  if (active) return active;
  if (!callSupported()) { toast(t('call_https'), 'bad'); return null; }
  const call = new Call(opts);
  active = call;
  await call.start();
  return call;
}
export const inCall = () => !!active;

class Call {
  constructor(opts) {
    this.opts = opts; this.id = null; this.ice = []; this.peers = new Map(); this.infos = new Map();
    this.mic = null; this.cam = null; this.screen = null; this.local = new MediaStream();
    this.inbox = Promise.resolve(); this.left = false;
    this.trying = new Map(); // peer id -> when we first tried to reach them; kept across retries until it works
    this.buildPanel();
  }

  async start() {
    // Ask for the devices first (only when they should start on), so the first handshake already carries them.
    if (this.opts.mic) await this.setMic(true, false);
    if (this.opts.cam) await this.setCam(true, false);
    this.es = new EventSource(this.opts.events);
    this.es.onmessage = (e) => this.onEvent(JSON.parse(e.data));
    // A refused stream (the session ended, logged out) closes for good; a dropped one reconnects by itself.
    this.es.onerror = () => { if (this.es.readyState === EventSource.CLOSED) this.leave('ended'); };
    this.render();
  }

  // ---------- server events ----------
  onEvent(ev) {
    if (['ended', 'full', 'removed', 'replaced'].includes(ev.type)) return this.leave(ev.type);
    if (ev.type === 'welcome') { // also after a reconnect: start every connection again with the new id
      for (const p of this.peers.values()) this.closePeer(p);
      this.id = ev.id; this.ice = ev.iceServers || []; this.max = ev.max; this.relay = !!ev.relay; this.infos.clear();
      ev.peers.forEach((info) => this.infos.set(info.id, info));
      this.sendState();
      ev.peers.forEach((info) => this.connect(info).catch((e) => console.warn('call:', e)));
    }
    if (ev.type === 'join') this.infos.set(ev.peer.id, ev.peer);
    if (ev.type === 'peer') { this.infos.set(ev.peer.id, ev.peer); const p = this.peers.get(ev.peer.id); if (p) { p.info = ev.peer; this.renderTile(p); } }
    if (ev.type === 'leave') { this.infos.delete(ev.id); this.trying.delete(ev.id); const p = this.peers.get(ev.id); if (p) this.closePeer(p); }
    if (ev.type === 'mute') { if (this.mic?.enabled) { this.setMic(false); toast(t('call_muted')); } }
    if (ev.type === 'signal') this.inbox = this.inbox.then(() => this.onSignal(ev.from, ev.data)).catch((e) => console.warn('call:', e));
    this.render();
  }

  // ---------- connections ----------
  newPeer(info, offerer) {
    const pc = new RTCPeerConnection({ iceServers: this.ice });
    // Video plays muted, which every browser allows by itself; the sound has its own element, which some browsers
    // (Safari on iPhone and iPad) only start after a tap, so it never holds the picture back.
    const p = { info, offerer, pc, stream: new MediaStream(), audio: new Audio(), since: this.trying.get(info.id) ?? Date.now(), pending: [], out: Promise.resolve(), senders: {} };
    this.peers.set(info.id, p); this.trying.set(info.id, p.since);
    pc.onicecandidate = (e) => e.candidate && this.signal(p, { candidate: e.candidate.toJSON() });
    pc.ontrack = (e) => {
      p.stream.addTrack(e.track);
      if (e.track.kind === 'audio') { p.audio.srcObject = new MediaStream([e.track]); this.playSound(p); }
      else if (p.video) { p.video.srcObject = p.stream; p.video.play().catch(() => {}); }
    };
    // Still not connected after a while: say so on the tile, and tell people why once, instead of "connecting…" for ever.
    setTimeout(() => { if (this.peers.get(info.id) === p) this.render(); }, 20000);
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') { this.trying.delete(info.id); p.since = Date.now(); this.limitBitrate(p); }
      this.render();
      // The one who started a connection starts it again when it fails (for example after a network change).
      if (pc.connectionState === 'failed' && p.offerer) setTimeout(() => {
        if (this.peers.get(info.id) !== p || this.left || !this.infos.has(info.id)) return;
        this.closePeer(p); this.connect(this.infos.get(info.id)).catch(() => {});
      }, 1000);
    };
    this.addTile(p);
    return p;
  }
  // The newcomer calls everyone already in the call.
  async connect(info) {
    const p = this.newPeer(info, true);
    for (const kind of ['audio', 'video']) p.senders[kind] = p.pc.addTransceiver(this.track(kind) || kind, { direction: 'sendrecv' }).sender;
    await p.pc.setLocalDescription(await p.pc.createOffer());
    this.signal(p, { sdp: p.pc.localDescription.toJSON() });
    this.limitBitrate(p);
  }
  async onSignal(from, data) {
    let p = this.peers.get(from);
    if (data.sdp?.type === 'offer') {
      if (p) this.closePeer(p); // they started over: so do we
      p = this.newPeer(this.infos.get(from) || { id: from, name: '', avatar: '🙂' }, false);
      await this.setRemote(p, data.sdp);
      for (const tr of p.pc.getTransceivers()) {
        const kind = tr.receiver.track.kind;
        tr.direction = 'sendrecv'; p.senders[kind] = tr.sender;
        await tr.sender.replaceTrack(this.track(kind));
      }
      await p.pc.setLocalDescription(await p.pc.createAnswer());
      this.signal(p, { sdp: p.pc.localDescription.toJSON() });
      this.limitBitrate(p);
    } else if (data.sdp?.type === 'answer' && p) {
      await this.setRemote(p, data.sdp);
    } else if (data.candidate && p) {
      if (!p.pc.remoteDescription) return p.pending.push(data.candidate);
      await p.pc.addIceCandidate(data.candidate).catch(() => {});
    }
    if (p?.pc.remoteDescription) for (const c of p.pending.splice(0)) await p.pc.addIceCandidate(c).catch(() => {});
  }
  // The other person's description, with the quick-start hint; if a browser will not take the hint, without it.
  async setRemote(p, desc) {
    const hinted = quickStart(desc, this.people());
    try { await p.pc.setRemoteDescription(hinted); }
    catch (e) { if (hinted === desc) throw e; await p.pc.setRemoteDescription(desc); }
  }
  // Messages to one person go out one after another, so the answer never overtakes the offer.
  signal(p, data) {
    p.out = p.out.then(() => this.id && api('/api/call/signal', 'POST', { peer: this.id, to: p.info.id, data })).catch(() => {});
  }
  // ---------- picture quality ----------
  people() { return Math.max(this.peers.size, this.infos.size) + 1; }
  // The ceiling for what this browser sends to one person: bitrate, frame rate and (if the camera could not be set to it) size.
  limitBitrate(p) {
    const s = p.senders.video; let prm;
    try { prm = s?.getParameters(); } catch { return; }
    if (!prm?.encodings?.length) return;
    const q = tierFor(this.people()), e = prm.encodings[0];
    if (this.screen) {
      e.maxBitrate = screenRate(this.people()); e.maxFramerate = SCREEN.frameRate.max; e.scaleResolutionDownBy = 1;
      prm.degradationPreference = 'maintain-resolution'; // text must stay readable: drop frames first
    } else {
      const h = this.cam?.getSettings?.().height || q.h;
      e.maxBitrate = q.rate; e.maxFramerate = q.fps; e.scaleResolutionDownBy = Math.max(1, h / q.h);
      prm.degradationPreference = 'balanced';
    }
    s.setParameters(prm).catch(() => {});
  }
  // Called whenever someone joins or leaves, or the camera or screen goes on or off: move to the tier for that many people.
  async applyQuality() {
    const n = this.people(), key = `${n}|${!!this.screen}|${this.cam?.id || ''}`;
    if (key === this.quality) return;
    this.quality = key;
    if (this.cam) await this.cam.applyConstraints(cameraWants(tierFor(n))).catch(() => {});
    for (const p of this.peers.values()) this.limitBitrate(p);
  }
  // Some browsers only play sound after a tap on the page: a button says so, and any tap starts every sound.
  playSound(p) {
    p.audio.play().then(() => this.soundBlocked(false)).catch(() => this.soundBlocked(true));
  }
  soundBlocked(on) {
    this.panel.querySelector('[data-act="sound"]').hidden = !on;
    if (!on || this.unlocking) return;
    this.unlocking = true;
    document.addEventListener('click', () => { this.unlocking = false; for (const p of this.peers.values()) if (p.audio.srcObject) this.playSound(p); }, { once: true, capture: true });
  }
  // No connection to someone: failed, or still trying after 20 seconds.
  stuck(p) {
    const st = p.pc.connectionState;
    return st === 'failed' || ((st === 'new' || st === 'connecting') && Date.now() - p.since > 19000);
  }
  closePeer(p) {
    p.pc.close(); p.tile?.remove(); p.audio.srcObject = null;
    if (this.peers.get(p.info.id) === p) this.peers.delete(p.info.id);
    this.render();
  }

  // ---------- my microphone, camera and screen ----------
  track(kind) { return kind === 'audio' ? (this.mic?.enabled ? this.mic : null) : this.screen || this.cam; }
  async useTrack(kind) {
    const tr = this.track(kind);
    this.local.getTracks().filter((x) => x.kind === kind).forEach((x) => this.local.removeTrack(x));
    if (tr && kind === 'video') this.local.addTrack(tr);
    for (const p of this.peers.values()) await p.senders[kind]?.replaceTrack(tr).catch(() => {});
    if (kind === 'video') { this.quality = null; await this.applyQuality(); }
    this.renderMine(); this.render();
  }
  async setMic(on, send = true) {
    if (on && !this.mic) {
      try { [this.mic] = (await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } })).getAudioTracks(); }
      catch { toast(t('call_noDevice'), 'bad'); return; }
    }
    if (this.mic) this.mic.enabled = on; // muting keeps the device so unmuting is instant
    await this.useTrack('audio'); if (send) this.sendState();
  }
  async setCam(on, send = true) {
    if (on && !this.cam) {
      try { [this.cam] = (await navigator.mediaDevices.getUserMedia({ video: cameraWants(tierFor(this.people())) })).getVideoTracks(); }
      catch { toast(t('call_noDevice'), 'bad'); return; }
      try { this.cam.contentHint = 'motion'; } catch {}
    }
    if (!on && this.cam) { this.cam.stop(); this.cam = null; } // the camera light goes off too
    await this.useTrack('video'); if (send) this.sendState();
  }
  async setScreen(on) {
    if (on && !this.screen) {
      try { [this.screen] = (await navigator.mediaDevices.getDisplayMedia({ video: SCREEN, audio: false })).getVideoTracks(); }
      catch { return; }
      try { this.screen.contentHint = 'detail'; } catch {} // tells the encoder to keep text sharp
      this.screen.onended = () => this.setScreen(false); // the browser's own "stop sharing" button
    }
    if (!on && this.screen) { this.screen.onended = null; this.screen.stop(); this.screen = null; }
    await this.useTrack('video'); this.sendState();
  }
  sendState() {
    if (!this.id) return;
    api('/api/call/state', 'POST', { peer: this.id, mic: !!this.mic?.enabled, cam: !!this.cam, screen: !!this.screen }).catch(() => {});
  }

  leave(reason = 'left') {
    if (this.left) return;
    this.left = true; active = null;
    this.es?.close();
    for (const p of this.peers.values()) { p.pc.close(); p.audio.srcObject = null; }
    for (const tr of [this.mic, this.cam, this.screen]) tr?.stop();
    this.panel.remove();
    if (reason !== 'left') toast(t('call_' + reason) || t('call_ended'));
    this.opts.onLeave?.(reason);
  }

  // ---------- panel ----------
  buildPanel() {
    const el = this.panel = document.createElement('section');
    const stage = !!this.opts.mount; // a meeting room shows the call as the page itself
    el.className = 'callbox' + (stage ? ' stage' : ''); el.setAttribute('aria-label', t('call_title'));
    el.innerHTML = `<div class="callhead"><b>${t('call_title')}</b><span class="muted" data-count></span><span class="grow"></span>
        ${stage ? `<span class="muted callhint">${t('call_pin')}</span>` : `<button class="ghost icon" data-act="size" title="${t('call_max')}" aria-label="${t('call_max')}">⤢</button>
        <button class="ghost icon" data-act="min" title="${t('call_min')}" aria-label="${t('call_min')}">▁</button>`}</div>
      <div class="tiles"></div>
      <button class="callsound" data-act="sound" hidden>${t('call_sound')}</button>
      <p class="callwarn" role="status" hidden></p>
      <p class="muted callnote">${t('call_private')}</p>
      <div class="callbar">
        <button class="ghost" data-act="mic" aria-pressed="false"></button><button class="ghost" data-act="cam" aria-pressed="false"></button>
        ${navigator.mediaDevices?.getDisplayMedia ? '<button class="ghost" data-act="screen" aria-pressed="false"></button>' : ''}
        <span class="grow"></span><button class="ghost" data-act="leave">${t('call_leave')}</button>
        ${this.opts.teacher ? `<button class="bad" data-act="end">${t(this.opts.meeting ? 'call_endMeet' : 'call_end')}</button>` : ''}</div>`;
    el.querySelector('.callnote').hidden = !!this.opts.teacher;
    el.onclick = (e) => {
      const b = e.target.closest('[data-act]');
      // On the stage a click on a picture makes it the big one (and a second click puts it back).
      if (!b) { const tile = stage && e.target.closest('.tile'); if (tile) for (const x of el.querySelectorAll('.tile')) x.classList.toggle('zoomed', x === tile && !x.classList.contains('zoomed')); return; }
      const act = b.dataset.act;
      if (act === 'mic') this.setMic(!this.mic?.enabled);
      if (act === 'cam') this.setCam(!this.cam);
      if (act === 'screen') this.setScreen(!this.screen);
      if (act === 'leave') this.leave();
      if (act === 'sound') for (const p of this.peers.values()) if (p.audio.srcObject) this.playSound(p);
      if (act === 'end' && confirm(t(this.opts.meeting ? 'call_confirmEndMeet' : 'call_confirmEnd'))) api(`/api/classes/${this.opts.classId}/call`, 'POST', { open: false }).catch(() => {});
      if (act === 'min') el.classList.toggle('min');
      if (act === 'size') el.classList.toggle('big');
      if (act === 'mute' || act === 'remove') api(`/api/classes/${this.opts.classId}/call/peers/${b.dataset.peer}`, 'POST', { action: act }).catch(() => {});
    };
    this.mine = this.makeTile(true);
    this.mine.video.srcObject = this.local;
    el.querySelector('.tiles').append(this.mine.el);
    (this.opts.mount || document.body).append(el);
  }
  makeTile(me) {
    const el = document.createElement('div'); el.className = 'tile' + (me ? ' me' : '');
    el.innerHTML = '<video autoplay playsinline></video><span class="tav"></span><span class="tname"></span><span class="tact"></span>';
    const video = el.querySelector('video'); video.muted = true; // sound plays from its own element (and never hear yourself)
    return { el, video };
  }
  addTile(p) {
    const tile = this.makeTile(false);
    p.tile = tile.el; p.video = tile.video; p.video.srcObject = p.stream;
    this.panel.querySelector('.tiles').append(tile.el);
    this.renderTile(p);
  }
  fillTile(el, info, label, extra = '') {
    const showVideo = info.cam || info.screen;
    el.classList.toggle('novideo', !showVideo); el.classList.toggle('screen', !!info.screen);
    el.querySelector('.tav').textContent = info.avatar || '🙂';
    el.querySelector('.tname').innerHTML = `${info.mic ? '' : '🔇 '}${esc(info.avatar || '')} ${esc(info.name || '')}${label ? ` <span>${esc(label)}</span>` : ''}`;
    el.querySelector('.tact').innerHTML = extra;
  }
  renderTile(p) {
    if (!p.tile) return;
    const st = p.pc.connectionState, waiting = st === 'new' || st === 'connecting' || st === 'failed';
    const ctl = this.opts.teacher && p.info.kind === 'student'
      ? `${p.info.mic ? `<button class="ghost icon" data-act="mute" data-peer="${esc(p.info.id)}" title="${t('call_mute')}" aria-label="${t('call_mute')}">🔇</button>` : ''}
         <button class="ghost icon" data-act="remove" data-peer="${esc(p.info.id)}" title="${t('call_remove')}" aria-label="${t('call_remove')}">✕</button>` : '';
    this.fillTile(p.tile, p.info, this.stuck(p) ? t('call_noconn') : waiting ? t('call_connecting') : this.opts.label?.(p.info) || '', ctl);
  }
  renderMine() {
    const me = this.opts.me || {};
    this.fillTile(this.mine.el, { ...me, mic: !!this.mic?.enabled, cam: !!this.cam, screen: !!this.screen }, t('call_you'));
    this.mine.el.classList.toggle('mirror', !!this.cam && !this.screen);
  }
  render() {
    if (this.left) return;
    const n = this.peers.size + 1, set = (act, on, onLabel, offLabel = onLabel) => {
      const b = this.panel.querySelector(`[data-act="${act}"]`); if (!b) return;
      b.setAttribute('aria-pressed', String(on)); b.classList.toggle('on', on); b.textContent = on ? onLabel : offLabel;
    };
    this.panel.querySelector('[data-count]').textContent = `${n}/${this.max || 4}`;
    this.panel.dataset.n = n;
    this.panel.style.setProperty('--cols', n <= 1 ? 1 : n <= 4 ? 2 : n <= 9 ? 3 : 4);
    this.applyQuality();
    set('mic', !!this.mic?.enabled, `🎤 ${t('call_mic')}`, `🔇 ${t('call_mic')}`);
    set('cam', !!this.cam, `📷 ${t('call_cam')}`, `🚫 ${t('call_cam')}`);
    set('screen', !!this.screen, `🖥️ ${t('call_stopScreen')}`, `🖥️ ${t('call_screen')}`);
    this.renderMine();
    for (const p of this.peers.values()) this.renderTile(p);
    // The reason stays in the panel for as long as someone cannot be reached, so there is time to read it.
    const warn = this.panel.querySelector('.callwarn');
    warn.hidden = ![...this.peers.values()].some((p) => this.stuck(p));
    if (!warn.hidden) warn.textContent = t(!this.opts.teacher ? 'call_failStudent' : this.relay ? 'call_failRelay' : 'call_failNoRelay');
  }
}
