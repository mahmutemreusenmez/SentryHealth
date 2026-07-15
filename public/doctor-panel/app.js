import { patients as STATIC_PATIENTS } from '../data/patientsMockData.js';
import SimplePeer from 'https://esm.sh/simple-peer@9.11.1';

const STORAGE_KEY = 'sentrymd_doctor_panel_user';
const LOBBY_ROOM = 'triage-lobby';

// Sadece doktor ve hemşire girebilir
const USERS = [
  { username: 'dr.ahmet', password: 'dr123', displayName: 'Dr. Ahmet Yılmaz', role: 'doctor' },
  { username: 'dr.zeynep', password: 'dr123', displayName: 'Dr. Zeynep Demir', role: 'doctor' },
  { username: 'hs.ayse', password: 'nurse123', displayName: 'Hemşire Ayşe Kaya', role: 'nurse' },
  { username: 'hs.mehmet', password: 'nurse123', displayName: 'Hemşire Mehmet Can', role: 'nurse' },
];

const els = {
  loginScreen: document.getElementById('login-screen'),
  loginForm: document.getElementById('login-form'),
  loginError: document.getElementById('login-error'),
  panel: document.getElementById('panel'),
  logoutBtn: document.getElementById('logout-btn'),
  userName: document.getElementById('user-name'),
  userRole: document.getElementById('user-role'),
  listenerDot: document.getElementById('listener-dot'),
  listenerText: document.getElementById('listener-text'),
  callIdle: document.getElementById('call-idle'),
  callActive: document.getElementById('call-active'),
  callStatus: document.getElementById('call-status'),
  localVideo: document.getElementById('local-video'),
  remoteVideo: document.getElementById('remote-video'),
  remoteLabel: document.getElementById('remote-label'),
  endCallBtn: document.getElementById('end-call-btn'),
  incomingModal: document.getElementById('incoming-modal'),
  incomingCaller: document.getElementById('incoming-caller'),
  acceptCallBtn: document.getElementById('accept-call-btn'),
  rejectCallBtn: document.getElementById('reject-call-btn'),
  patientEmpty: document.getElementById('patient-empty'),
  patientPanel: document.getElementById('patient-panel'),
  pName: document.getElementById('p-name'),
  pSub: document.getElementById('p-sub'),
  pVitals: document.getElementById('p-vitals'),
  pThresholds: document.getElementById('p-thresholds'),
  pLog: document.getElementById('p-log'),
  pCaregiver: document.getElementById('p-caregiver'),
};

let currentUser = null;
let ws = null;
let myPeerId = null;
let inLobby = false;
let localStream = null;
let peer = null;
let currentCall = null; // { roomId, patient }
let pendingCall = null;
let reconnectTimer = null;

/* ================= Ses: zil ================= */
let audioCtx = null;
let ringInterval = null;

function startRingtone() {
  stopRingtone();
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const ringOnce = () => {
      const now = audioCtx.currentTime;
      [0, 0.35].forEach((offset) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now + offset);
        osc.frequency.setValueAtTime(660, now + offset + 0.15);
        gain.gain.setValueAtTime(0.0001, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.28, now + offset + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.3);
        osc.connect(gain).connect(audioCtx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.32);
      });
    };
    ringOnce();
    ringInterval = setInterval(ringOnce, 1500);
  } catch (e) {
    console.warn('Zil sesi çalınamadı:', e);
  }
}

function stopRingtone() {
  if (ringInterval) {
    clearInterval(ringInterval);
    ringInterval = null;
  }
}

/* ================= Yardımcılar ================= */
function getSignalingUrl() {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${location.host}/api/webrtc/signaling`;
}

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function setListenerStatus(online, text) {
  els.listenerDot.classList.toggle('online', online);
  els.listenerText.textContent = text;
}

function updateCallStatus(msg) {
  els.callStatus.textContent = msg;
}

/* ================= Auth ================= */
function getStoredUser() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch { return null; }
}

function showLogin(message) {
  els.panel.classList.add('dp-hidden');
  els.loginScreen.classList.remove('dp-hidden');
  if (message) {
    els.loginError.textContent = message;
    els.loginError.classList.remove('dp-hidden');
  }
}

function showPanel() {
  els.loginScreen.classList.add('dp-hidden');
  els.panel.classList.remove('dp-hidden');
  els.panel.style.display = 'flex';
  els.userName.textContent = currentUser.displayName;
  els.userRole.textContent = currentUser.role === 'doctor' ? 'Doktor' : 'Hemşire';
  els.userRole.className = 'dp-role-badge dp-role-' + currentUser.role;
  connectLobby();
}

els.loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  els.loginError.classList.add('dp-hidden');
  const fd = new FormData(els.loginForm);
  const username = String(fd.get('username') || '').trim();
  const password = String(fd.get('password') || '');
  const user = USERS.find((u) => u.username === username && u.password === password);
  if (!user) {
    showLogin('Geçersiz kullanıcı adı veya şifre. Bu panele sadece doktor ve hemşireler girebilir.');
    return;
  }
  if (user.role !== 'doctor' && user.role !== 'nurse') {
    showLogin('Bu panele yalnızca doktor ve hemşire rolleri erişebilir.');
    return;
  }
  currentUser = user;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  showPanel();
});

els.logoutBtn.addEventListener('click', () => {
  localStorage.removeItem(STORAGE_KEY);
  endCall();
  disconnectLobby();
  currentUser = null;
  showLogin();
});

/* ================= Sinyal dinleyicisi (Listener) ================= */
function connectLobby() {
  disconnectLobby();
  setListenerStatus(false, 'Bağlanıyor…');
  ws = new WebSocket(getSignalingUrl());

  ws.onopen = () => {
    ws.send(JSON.stringify({ type: 'join', roomId: LOBBY_ROOM }));
  };

  ws.onmessage = (event) => {
    let msg;
    try { msg = JSON.parse(event.data); } catch { return; }

    if (msg.type === 'welcome') {
      myPeerId = msg.peerId;
    } else if (msg.type === 'joined') {
      myPeerId = msg.peerId;
      if (msg.roomId === LOBBY_ROOM) {
        inLobby = true;
        setListenerStatus(true, 'Aramalar dinleniyor');
      } else if (currentCall && msg.roomId === currentCall.roomId) {
        updateCallStatus('Odaya bağlanıldı, hasta bekleniyor…');
        (msg.peers || []).forEach((peerId) => startPeer(peerId, true));
      }
    } else if (msg.type === 'broadcast') {
      handleBroadcast(msg.data, msg.from);
    } else if (msg.type === 'peer-joined') {
      if (currentCall) {
        startPeer(msg.peerId, myPeerId.localeCompare(msg.peerId) < 0);
      }
    } else if (msg.type === 'peer-left') {
      if (currentCall) {
        updateCallStatus('Hasta görüşmeden ayrıldı.');
      }
    } else if (msg.type === 'signal') {
      onRemoteSignal(msg.from, msg.data);
    }
  };

  ws.onclose = () => {
    inLobby = false;
    setListenerStatus(false, 'Bağlantı koptu, tekrar deneniyor…');
    if (currentUser && !reconnectTimer) {
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        if (currentUser && !currentCall) connectLobby();
      }, 3000);
    }
  };

  ws.onerror = () => {
    setListenerStatus(false, 'Sinyal hatası');
  };
}

function disconnectLobby() {
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
  if (ws) {
    ws.onclose = null;
    ws.close();
    ws = null;
  }
  inLobby = false;
  setListenerStatus(false, 'Dinleyici kapalı');
}

function handleBroadcast(data, from) {
  if (!data || typeof data !== 'object') return;
  // Mobil uygulamadan gelen arama isteği:
  // { kind: 'incoming-call', roomId: 'call-xyz', patient: { nationalId | pseudonym | name } }
  if (data.kind === 'incoming-call' && data.roomId) {
    if (currentCall || pendingCall) return; // zaten meşgul
    pendingCall = { roomId: String(data.roomId), patient: data.patient || null, from };
    showIncomingCall(pendingCall);
  } else if (data.kind === 'call-cancelled' && pendingCall && data.roomId === pendingCall.roomId) {
    hideIncomingCall();
    pendingCall = null;
  }
}

/* ================= Gelen arama pop-up ================= */
function showIncomingCall(call) {
  const p = findPatient(call.patient);
  const label = p ? `${p.name} (${p.maskedNationalId || ''})` : (call.patient?.name || 'Bilinmeyen hasta');
  els.incomingCaller.textContent = `${label} canlı triyaj araması başlatıyor`;
  els.incomingModal.classList.remove('dp-hidden');
  startRingtone();
}

function hideIncomingCall() {
  els.incomingModal.classList.add('dp-hidden');
  stopRingtone();
}

els.acceptCallBtn.addEventListener('click', async () => {
  if (!pendingCall) return;
  hideIncomingCall();
  const call = pendingCall;
  pendingCall = null;
  await acceptCall(call);
});

els.rejectCallBtn.addEventListener('click', () => {
  if (pendingCall && ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'broadcast', roomId: LOBBY_ROOM, data: { kind: 'call-rejected', roomId: pendingCall.roomId } }));
  }
  hideIncomingCall();
  pendingCall = null;
});

/* ================= WebRTC görüşme ================= */
async function getLocalStream() {
  if (localStream) return localStream;
  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  els.localVideo.srcObject = localStream;
  return localStream;
}

async function acceptCall(call) {
  try {
    await getLocalStream();
  } catch {
    alert('Kamera/mikrofon erişimi reddedildi. Görüşme başlatılamıyor.');
    return;
  }

  currentCall = call;
  els.callIdle.classList.add('dp-hidden');
  els.callActive.classList.remove('dp-hidden');
  updateCallStatus('Görüşme odasına katılınıyor…');
  renderPatientData(call.patient);

  if (ws && ws.readyState === WebSocket.OPEN) {
    // Kabul bilgisini lobiye duyur, sonra çağrı odasına geç
    ws.send(JSON.stringify({ type: 'broadcast', roomId: LOBBY_ROOM, data: { kind: 'call-accepted', roomId: call.roomId } }));
    ws.send(JSON.stringify({ type: 'join', roomId: call.roomId }));
  } else {
    connectLobby();
  }
}

function startPeer(remotePeerId, initiator) {
  if (peer) return;
  peer = new SimplePeer({
    initiator,
    trickle: true,
    stream: localStream,
    config: {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' },
      ],
    },
  });
  peer.remoteId = remotePeerId;

  peer.on('signal', (data) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'signal', to: remotePeerId, data }));
    }
  });

  peer.on('stream', (stream) => {
    els.remoteVideo.srcObject = stream;
    const p = findPatient(currentCall?.patient);
    els.remoteLabel.textContent = p ? p.name : 'Hasta';
    updateCallStatus('🟢 Görüşme aktif');
  });

  peer.on('connect', () => updateCallStatus('🟢 Bağlantı kuruldu'));
  peer.on('close', () => updateCallStatus('Görüşme sonlandı.'));
  peer.on('error', (err) => {
    console.error('Peer hatası:', err);
    updateCallStatus('Bağlantı hatası: ' + err.message);
  });
}

function onRemoteSignal(from, data) {
  if (!currentCall) return;
  if (!peer) startPeer(from, false);
  try { peer.signal(data); } catch (e) { console.error(e); }
}

function endCall() {
  stopRingtone();
  if (peer) {
    try { peer.destroy(); } catch {}
    peer = null;
  }
  if (localStream) {
    localStream.getTracks().forEach((t) => t.stop());
    localStream = null;
  }
  els.localVideo.srcObject = null;
  els.remoteVideo.srcObject = null;
  els.callActive.classList.add('dp-hidden');
  els.callIdle.classList.remove('dp-hidden');
  currentCall = null;
  clearPatientData();
  // Lobiye geri dön
  if (currentUser) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'join', roomId: LOBBY_ROOM }));
    } else {
      connectLobby();
    }
  }
}

els.endCallBtn.addEventListener('click', endCall);

/* ================= Hasta verileri ================= */
function findPatient(ref) {
  if (!ref) return null;
  const nid = String(ref.nationalId || ref.tc || '').trim();
  const pseudo = String(ref.pseudonym || '').trim();
  const name = String(ref.name || '').trim().toLowerCase();
  return (
    STATIC_PATIENTS.find((p) => nid && p.nationalId === nid) ||
    STATIC_PATIENTS.find((p) => pseudo && p.pseudonym === pseudo) ||
    STATIC_PATIENTS.find((p) => name && (p.name || '').toLowerCase() === name) ||
    null
  );
}

function vitalClass(p, key, value) {
  const checks = [p.criticalThreshold, p.warningThreshold];
  for (let i = 0; i < checks.length; i++) {
    const t = checks[i];
    if (!t || t.metric !== key || value == null) continue;
    const v = Number(value);
    const hit = t.operator === '>' ? v > t.value : t.operator === '<' ? v < t.value : false;
    if (hit) return i === 0 ? 'crit' : 'warn';
  }
  return '';
}

function renderPatientData(ref) {
  const p = findPatient(ref);
  if (!p) {
    els.patientEmpty.textContent = 'Bu hasta için kayıtlı kronik takip verisi bulunamadı.';
    els.patientEmpty.classList.remove('dp-hidden');
    els.patientPanel.classList.add('dp-hidden');
    return;
  }

  els.patientEmpty.classList.add('dp-hidden');
  els.patientPanel.classList.remove('dp-hidden');

  els.pName.textContent = p.name;
  els.pSub.textContent = `${p.maskedNationalId || ''} • ${p.diagnosis || p.conditionGroup || ''} • ${p.ageGroup || ''} yaş • ${p.clinicalStatus || ''}`;

  const L = p.latest || {};
  const vitals = [
    { key: 'heartRate', label: 'Nabız', value: L.heartRate, unit: 'bpm' },
    { key: 'oxygenSaturation', label: 'SpO₂', value: L.oxygenSaturation, unit: '%' },
    { key: 'temperature', label: 'Ateş', value: L.temperature, unit: '°C' },
    { key: 'bloodPressureSystolic', label: 'Tansiyon', value: L.bloodPressureSystolic != null ? `${L.bloodPressureSystolic}/${L.bloodPressureDiastolic ?? '—'}` : null, unit: 'mmHg', raw: L.bloodPressureSystolic },
  ];
  els.pVitals.innerHTML = vitals.map((v) => `
    <div class="dp-vital ${vitalClass(p, v.key, v.raw ?? v.value)}">
      <div class="v-label">${v.label}</div>
      <div class="v-value">${v.value ?? '—'} <small style="font-size:0.65rem; color:var(--dp-muted)">${v.unit}</small></div>
    </div>
  `).join('');

  const thresholds = [];
  if (p.diagnosis) thresholds.push(`<li><strong>Tanı:</strong> ${escapeHtml(p.diagnosis)}</li>`);
  if (p.conditionGroup) thresholds.push(`<li><strong>Kronik grup:</strong> ${escapeHtml(p.conditionGroup)}</li>`);
  if (p.criticalThreshold) thresholds.push(`<li><strong>Kritik eşik:</strong> ${escapeHtml(p.criticalThreshold.metric)} ${escapeHtml(p.criticalThreshold.operator)} ${escapeHtml(String(p.criticalThreshold.value))}</li>`);
  if (p.warningThreshold) thresholds.push(`<li><strong>Uyarı eşiği:</strong> ${escapeHtml(p.warningThreshold.metric)} ${escapeHtml(p.warningThreshold.operator)} ${escapeHtml(String(p.warningThreshold.value))}</li>`);
  els.pThresholds.innerHTML = thresholds.join('') || '<li>Eşik tanımlı değil.</li>';

  const log = (p.interactionLog || []).slice(-5).reverse();
  els.pLog.innerHTML = log.length
    ? log.map((l) => `
        <li>
          <div class="t">${new Date(l.time).toLocaleString('tr-TR')}</div>
          <div>${escapeHtml(l.question || '')}</div>
          <div><strong>${l.status === 'answered' ? '✅ ' + escapeHtml(l.response || 'Yanıtlandı') : '⏳ Bekliyor'}</strong></div>
        </li>
      `).join('')
    : '<li>Etkileşim kaydı yok.</li>';

  const cg = p.caregiver;
  els.pCaregiver.innerHTML = cg
    ? `<li><strong>${escapeHtml(cg.name)}</strong> (${escapeHtml(cg.relationship || '')})<br />${escapeHtml(cg.phone || '')}</li>`
    : '<li>Yakın bilgisi yok.</li>';
}

function clearPatientData() {
  els.patientPanel.classList.add('dp-hidden');
  els.patientEmpty.textContent = 'Aktif arama yok. Arama geldiğinde hastanın verileri burada görünecek.';
  els.patientEmpty.classList.remove('dp-hidden');
}

/* ================= Başlat ================= */
const stored = getStoredUser();
if (stored && (stored.role === 'doctor' || stored.role === 'nurse')) {
  currentUser = stored;
  showPanel();
} else {
  showLogin();
}
