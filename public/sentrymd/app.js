import { patients as STATIC_PATIENTS } from '../data/patientsMockData.js';
import SimplePeer from 'https://esm.sh/simple-peer@9.11.1';

const STORAGE_KEY = 'sentrymd_user';
const TOKEN_KEY = 'sentrymd_token';

const USERS = [
  { username: 'dr.ahmet', password: 'dr123', displayName: 'Dr. Ahmet Yılmaz', role: 'doctor' },
  { username: 'hs.ayse', password: 'nurse123', displayName: 'Hemşire Ayşe Kaya', role: 'nurse' },
  { username: 'yönetici', password: 'yönetici123', displayName: 'Yönetici', role: 'admin' },
  { username: 'admin', password: 'admin123', displayName: 'Yönetici', role: 'admin' },
];

const els = {
  loginScreen: document.getElementById('login-screen'),
  appShell: document.getElementById('app-shell'),
  loginForm: document.getElementById('login-form'),
  loginError: document.getElementById('login-error'),
  logoutBtn: document.getElementById('logout-btn'),
  userName: document.getElementById('user-name'),
  userRole: document.getElementById('user-role'),
  patientsBody: document.getElementById('patients-body'),
  patientSearch: document.getElementById('patient-search'),
  roomId: document.getElementById('room-id'),
  joinRoomBtn: document.getElementById('join-room-btn'),
  createRoomBtn: document.getElementById('create-room-btn'),
  leaveRoomBtn: document.getElementById('leave-room-btn'),
  callStatus: document.getElementById('call-status'),
  videos: document.getElementById('videos'),
  localVideo: document.getElementById('local-video'),
  signalingUrl: document.getElementById('signaling-url'),
  connectionDot: document.getElementById('connection-dot'),
};

let currentUser = null;
let ws = null;
let myPeerId = null;
let currentRoomId = null;
let localStream = null;
const peers = new Map();

function getSignalingUrl() {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${location.host}/api/webrtc/signaling`;
}

function setSignalingUrl() {
  if (els.signalingUrl) els.signalingUrl.textContent = getSignalingUrl();
}

function getStoredUser() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch { return null; }
}

function setStoredUser(user) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  localStorage.setItem(TOKEN_KEY, `smd-${Date.now()}-${Math.random().toString(36).slice(2)}`);
}

function clearStoredUser() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(TOKEN_KEY);
}

function showLogin(message) {
  if (els.appShell) els.appShell.classList.add('smd-hidden');
  if (els.loginScreen) els.loginScreen.classList.remove('smd-hidden');
  if (message && els.loginError) {
    els.loginError.textContent = message;
    els.loginError.classList.remove('smd-hidden');
  }
}

function showApp() {
  if (els.loginScreen) els.loginScreen.classList.add('smd-hidden');
  if (els.appShell) {
    els.appShell.classList.remove('smd-hidden');
    els.appShell.style.display = 'flex';
  }
  if (els.userName) els.userName.textContent = currentUser?.displayName || '—';
  if (els.userRole) {
    els.userRole.textContent = currentUser?.role || '—';
    els.userRole.className = 'smd-role-badge smd-role-' + (currentUser?.role || 'admin');
  }
  renderPatients();
  setSignalingUrl();
}

function getRiskClass(risk) {
  const r = String(risk || '').toLowerCase();
  if (r === 'high') return 'smd-risk-high';
  if (r === 'medium') return 'smd-risk-medium';
  return 'smd-risk-low';
}

function getRiskLabel(risk) {
  const r = String(risk || '').toLowerCase();
  if (r === 'high') return 'Yüksek';
  if (r === 'medium') return 'Orta';
  return 'Düşük';
}

function renderPatients(filter = '') {
  if (!els.patientsBody) return;
  const term = filter.toLowerCase().trim();
  const list = STATIC_PATIENTS.filter((p) => {
    if (!term) return true;
    return (p.name || '').toLowerCase().includes(term) || (p.maskedNationalId || '').toLowerCase().includes(term);
  });

  els.patientsBody.innerHTML = list.length
    ? list.map((p) => `
      <tr data-id="${p.id || ''}">
        <td><strong>${escapeHtml(p.name || '—')}</strong></td>
        <td>${escapeHtml(p.maskedNationalId || '—')}</td>
        <td>${p.age ?? '—'}</td>
        <td>${escapeHtml(p.condition || '—')}</td>
        <td><span class="smd-risk ${getRiskClass(p.risk)}">${getRiskLabel(p.risk)}</span></td>
      </tr>
    `).join('')
    : `<tr><td colspan="5" class="smd-empty">Hasta bulunamadı.</td></tr>`;

  els.patientsBody.querySelectorAll('tr').forEach((tr) => {
    tr.addEventListener('click', () => {
      const id = tr.getAttribute('data-id');
      const patient = list.find((p) => p.id === id);
      if (patient && els.roomId) {
        els.roomId.value = `oda-${patient.maskedNationalId || patient.id}`;
      }
    });
  });
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function updateStatus(msg) {
  if (els.callStatus) els.callStatus.textContent = msg;
}

function updateConnectionDot(connected) {
  if (els.connectionDot) {
    els.connectionDot.style.color = connected ? 'var(--md-primary)' : 'var(--md-muted)';
  }
}

/* ---------- Auth ---------- */
function initAuth() {
  const stored = getStoredUser();
  if (stored && stored.role) {
    currentUser = stored;
    showApp();
    return;
  }
  showLogin();
}

els.loginForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  if (els.loginError) els.loginError.classList.add('smd-hidden');
  const fd = new FormData(els.loginForm);
  const username = String(fd.get('username') || '').trim();
  const password = String(fd.get('password') || '');
  const user = USERS.find((u) => u.username === username && u.password === password);
  if (!user) {
    showLogin('Geçersiz kullanıcı adı veya şifre.');
    return;
  }
  currentUser = user;
  setStoredUser(user);
  showApp();
});

els.logoutBtn?.addEventListener('click', () => {
  clearStoredUser();
  leaveRoom();
  currentUser = null;
  showLogin();
});

els.patientSearch?.addEventListener('input', () => {
  renderPatients(els.patientSearch.value);
});

/* ---------- WebRTC / Signaling ---------- */
async function getLocalStream() {
  if (localStream) return localStream;
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    if (els.localVideo) {
      els.localVideo.srcObject = localStream;
      els.localVideo.muted = true;
      els.localVideo.play().catch(() => {});
    }
    return localStream;
  } catch (err) {
    updateStatus('Kamera/mikrofon erişimi reddedildi.');
    throw err;
  }
}

function createPeer(peerId, initiator) {
  if (peers.has(peerId)) return peers.get(peerId);
  const peer = new SimplePeer({
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

  peer.on('signal', (data) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'signal', to: peerId, data }));
    }
  });

  peer.on('stream', (stream) => {
    ensureRemoteVideo(peerId, stream);
    updateStatus(`${peerId.slice(0, 6)} katıldı.`);
  });

  peer.on('close', () => {
    removeRemoteVideo(peerId);
    peers.delete(peerId);
  });

  peer.on('error', (err) => {
    console.error('Peer error', err);
    removeRemoteVideo(peerId);
    peers.delete(peerId);
  });

  peers.set(peerId, peer);
  return peer;
}

function ensureRemoteVideo(peerId, stream) {
  let el = document.getElementById(`video-${peerId}`);
  if (!el) {
    el = document.createElement('div');
    el.id = `video-${peerId}`;
    el.className = 'smd-video-box';
    el.innerHTML = `<video autoplay playsinline></video><span class="smd-video-label">${peerId.slice(0, 6)}…</span>`;
    if (els.videos) els.videos.appendChild(el);
  }
  const video = el.querySelector('video');
  if (video) video.srcObject = stream;
}

function removeRemoteVideo(peerId) {
  const el = document.getElementById(`video-${peerId}`);
  if (el) el.remove();
}

function closeAllPeers() {
  for (const [id, peer] of peers) {
    try { peer.destroy(); } catch {}
    removeRemoteVideo(id);
  }
  peers.clear();
}

function handleJoined(peerIds) {
  peerIds.forEach((peerId) => {
    const initiator = myPeerId.localeCompare(peerId) < 0;
    createPeer(peerId, initiator);
  });
}

function connectToRoom(roomId) {
  if (ws) ws.close();
  closeAllPeers();
  currentRoomId = roomId;

  updateStatus('Sinyalleşme sunucusuna bağlanılıyor…');
  ws = new WebSocket(getSignalingUrl());

  ws.onopen = () => {
    updateConnectionDot(true);
    ws.send(JSON.stringify({ type: 'join', roomId }));
  };

  ws.onmessage = (event) => {
    let msg;
    try {
      msg = JSON.parse(event.data);
    } catch {
      return;
    }

    if (msg.type === 'welcome') {
      myPeerId = msg.peerId;
    } else if (msg.type === 'joined') {
      myPeerId = msg.peerId;
      currentRoomId = msg.roomId;
      updateStatus(`Odaya katıldı: ${msg.roomId} (${msg.peers?.length || 0} eş)`);
      getLocalStream().then(() => handleJoined(msg.peers || []));
    } else if (msg.type === 'peer-joined') {
      updateStatus(`Yeni eş katıldı: ${msg.peerId.slice(0, 6)}`);
      const initiator = myPeerId.localeCompare(msg.peerId) < 0;
      getLocalStream().then(() => createPeer(msg.peerId, initiator));
    } else if (msg.type === 'peer-left') {
      const peer = peers.get(msg.peerId);
      if (peer) {
        try { peer.destroy(); } catch {}
        removeRemoteVideo(msg.peerId);
        peers.delete(msg.peerId);
      }
      updateStatus('Bir eş ayrıldı.');
    } else if (msg.type === 'signal') {
      if (!localStream) {
        getLocalStream().then(() => {
          const peer = peers.get(msg.from);
          if (peer) peer.signal(msg.data);
        });
      } else {
        const peer = peers.get(msg.from);
        if (peer) peer.signal(msg.data);
      }
    }
  };

  ws.onclose = () => {
    updateConnectionDot(false);
    updateStatus('Sinyalleşme bağlantısı kapandı.');
  };

  ws.onerror = () => {
    updateStatus('Sinyalleşme hatası.');
  };
}

function leaveRoom() {
  if (ws) {
    ws.close();
    ws = null;
  }
  closeAllPeers();
  if (localStream) {
    localStream.getTracks().forEach((t) => t.stop());
    localStream = null;
  }
  if (els.localVideo) els.localVideo.srcObject = null;
  if (els.videos) {
    const boxes = els.videos.querySelectorAll('.smd-video-box');
    boxes.forEach((b) => {
      if (b.id !== 'local-video-box') b.remove();
    });
  }
  currentRoomId = null;
  myPeerId = null;
  updateStatus('Bekleniyor…');
}

els.joinRoomBtn?.addEventListener('click', async () => {
  const roomId = (els.roomId?.value || '').trim();
  if (!roomId) {
    updateStatus('Oda adı girin.');
    return;
  }
  try {
    await getLocalStream();
    connectToRoom(roomId);
    if (els.leaveRoomBtn) els.leaveRoomBtn.classList.remove('smd-hidden');
  } catch {
    updateStatus('Medya cihazına erişilemiyor.');
  }
});

els.createRoomBtn?.addEventListener('click', () => {
  const roomId = `smd-${Date.now().toString(36)}`;
  if (els.roomId) els.roomId.value = roomId;
});

els.leaveRoomBtn?.addEventListener('click', () => {
  leaveRoom();
  if (els.leaveRoomBtn) els.leaveRoomBtn.classList.add('smd-hidden');
});

initAuth();
