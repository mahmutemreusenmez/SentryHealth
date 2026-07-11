(() => {
  const { t } = window.SentryI18n;
  const i18n = window.SentryI18n;
  const POLL_MS = 2500;

  const els = {
    loginScreen: document.getElementById('login-screen'),
    loginForm: document.getElementById('login-form'),
    loginError: document.getElementById('login-error'),
    appShell: document.getElementById('app-shell'),
    userInfo: document.getElementById('user-info'),
    logoutBtn: document.getElementById('logout-btn'),
    pageTitle: document.getElementById('page-title'),
    navAdmin: document.getElementById('nav-admin'),
    patients: document.getElementById('patients'),
    alerts: document.getElementById('alerts'),
    emptyState: document.getElementById('empty-state'),
    connStatus: document.getElementById('connection-status'),
    connText: document.getElementById('connection-text'),
    navAlarmCount: document.getElementById('nav-alarm-count'),
    tableBody: document.getElementById('patients-table-body'),
    patientDetail: document.getElementById('patient-detail'),
    viewDashboard: document.getElementById('view-dashboard'),
    viewPatients: document.getElementById('view-patients'),
    viewAdmin: document.getElementById('view-admin'),
    viewSettings: document.getElementById('view-settings'),
    viewFuture: document.getElementById('view-future'),
    viewAnalytics: document.getElementById('view-analytics'),
    viewReports: document.getElementById('view-reports'),
    viewTelemedicine: document.getElementById('view-telemedicine'),
    viewVoice: document.getElementById('view-voice'),
    broadcastPanel: document.getElementById('broadcast-panel'),
    voicePanel: document.getElementById('voice-panel'),
    futureViewGrid: document.getElementById('future-view-grid'),
    futureModal: document.getElementById('future-modal'),
    futureModalTitle: document.getElementById('future-modal-title'),
    futureModalBody: document.getElementById('future-modal-body'),
    futureModalClose: document.getElementById('future-modal-close'),
    chartTrend: document.getElementById('chart-trend'),
    chartAlarms: document.getElementById('chart-alarms'),
    chartDistribution: document.getElementById('chart-distribution'),
    chartTrendView: document.getElementById('chart-trend-view'),
    chartAlarmsView: document.getElementById('chart-alarms-view'),
    chartDistributionView: document.getElementById('chart-distribution-view'),
    reportsGenerated: document.getElementById('report-generated'),
    reportSummary: document.getElementById('report-summary'),
    reportBreakdown: document.getElementById('report-breakdown'),
    modal: document.getElementById('patient-modal'),
    form: document.getElementById('patient-form'),
    formError: document.getElementById('form-error'),
    kvkkResult: document.getElementById('kvkk-result'),
    kvkkFlow: document.getElementById('kvkk-flow'),
    vitalsModal: document.getElementById('vitals-modal'),
    vitalsForm: document.getElementById('vitals-form'),
    vitalsError: document.getElementById('vitals-error'),
    vitalsTitle: document.getElementById('vitals-modal-title'),
    genomicBtn: document.getElementById('genomic-btn'),
    genomicOutput: document.getElementById('genomic-output'),
    scribeBtn: document.getElementById('scribe-btn'),
    scribeOutput: document.getElementById('scribe-output'),
    adminDoctorForm: document.getElementById('admin-doctor-form'),
    adminFormError: document.getElementById('admin-form-error'),
    adminDoctorsBody: document.getElementById('admin-doctors-body'),
    settingsClinicForm: document.getElementById('settings-clinic-form'),
    settingsNotifyForm: document.getElementById('settings-notify-form'),
    systemLogs: document.getElementById('system-logs'),
    clearLogs: document.getElementById('clear-logs'),
    kvkkKey: document.getElementById('kvkk-key'),
    kvkkLastUpdate: document.getElementById('kvkk-last-update'),
    settingsLogoInput: document.getElementById('settings-logo-input'),
    settingsLogoPreview: document.getElementById('settings-logo-preview'),
    settingsLogoStatus: document.getElementById('settings-logo-status'),
    settingsTestSms: document.getElementById('settings-test-sms'),
    settingsTestSmsStatus: document.getElementById('settings-test-sms-status'),
    settingsApiKey: document.getElementById('settings-api-key'),
    settingsGenerateApi: document.getElementById('settings-generate-api'),
    settingsCopyApi: document.getElementById('settings-copy-api'),
    settingsApiStatus: document.getElementById('settings-api-status'),
    langSwitcher: document.getElementById('lang-switcher'),
  };

  const conditionKeyMap = {
    'Diyabet': 'diabetes',
    'Hipertansiyon': 'hypertension',
    'KOAH': 'copd',
    'Kalp Yetmezliği': 'heartFailure',
    'Astım': 'asthma',
    'Kronik Böbrek Hastalığı': 'kidney',
    'Diğer': 'other',
    'Kronik hastalık': 'chronic',
  };

  const dateLocale = () => {
    const lang = i18n.getCurrentLang();
    return lang === 'ar' ? 'ar-EG' : lang === 'en' ? 'en-US' : 'tr-TR';
  };

  let currentUser = null;
  let currentView = 'dashboard';
  let selectedPseudonym = null;
  let lastData = null;
  let vitalsTarget = null;
  let pollInterval = null;

  let broadcastState = {
    branch: 'gastroenterology',
    template: 'nutrition',
    message: '',
    channel: 'sms',
    history: [],
  };

  let chatState = {
    sessions: JSON.parse(localStorage.getItem('sentry_chat_sessions') || '[]'),
    currentId: localStorage.getItem('sentry_chat_current') || null,
    loading: false,
    voiceKey: 'trF',
    rate: 1,
  };

  let voiceState = {
    voiceKey: 'trF',
    rate: 1,
    voices: [],
    loaded: false,
  };

  let ttsInitialized = false;

  function getToken() {
    return localStorage.getItem('token') || '';
  }

  function getStoredUser() {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  }

  function setStoredUser(user) {
    currentUser = user;
    localStorage.setItem('user', JSON.stringify(user));
    renderUserInfo();
  }

  function renderUserInfo() {
    if (!currentUser || !els.userInfo) return;
    const roleClass = currentUser.role === 'admin' ? 'admin' : '';
    const roleText = t('role.' + currentUser.role);
    els.userInfo.innerHTML = `
      <span>${escapeHtml(currentUser.displayName)}</span>
      <span class="role ${roleClass}">${escapeHtml(roleText)}</span>`;
    if (els.navAdmin) {
      els.navAdmin.classList.toggle('hidden', currentUser.role !== 'admin');
    }
  }

  async function safeJson(res) {
    try {
      const text = await res.text();
      return text ? JSON.parse(text) : {};
    } catch {
      return {};
    }
  }

  async function api(path, options = {}) {
    const headers = {
      'Authorization': `Bearer ${getToken()}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    };
    const res = await fetch(path, { ...options, headers });
    if (res.status === 401) {
      logout();
      throw new Error(t('login.expired'));
    }
    return res;
  }

  function addLog(message) {
    const time = new Date().toLocaleTimeString(dateLocale());
    const logs = JSON.parse(localStorage.getItem('sentry_logs') || '[]');
    logs.push(`[${time}] ${message}`);
    if (logs.length > 100) logs.shift();
    localStorage.setItem('sentry_logs', JSON.stringify(logs));
    if (els.systemLogs) {
      els.systemLogs.textContent = logs.slice(-20).join('\n');
    }
  }

  function showLogin(message) {
    if (els.loginScreen) els.loginScreen.classList.remove('hidden');
    if (els.appShell) els.appShell.classList.add('hidden');
    if (pollInterval) clearInterval(pollInterval);
    pollInterval = null;
    if (message && els.loginError) {
      els.loginError.textContent = message;
      els.loginError.classList.remove('hidden');
    }
  }

  function showApp() {
    if (els.loginScreen) els.loginScreen.classList.add('hidden');
    if (els.appShell) els.appShell.classList.remove('hidden');
    renderUserInfo();
    loadSettings();
    switchView('dashboard');
    poll();
    pollInterval = setInterval(poll, POLL_MS);
  }

  function logout() {
    if (currentUser) addLog(t('log.logout', { who: currentUser.displayName }));
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    currentUser = null;
    showLogin();
  }

  async function initAuth() {
    const token = getToken();
    if (!token) {
      showLogin();
      return;
    }
    try {
      const res = await api('/api/auth/me');
      if (!res.ok) throw new Error(t('login.expired'));
      const body = await res.json();
      setStoredUser(body.user);
      showApp();
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      showLogin(t('login.expired'));
    }
  }

  /* ---------- Login ---------- */
  els.loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    els.loginError.classList.add('hidden');
    const fd = new FormData(els.loginForm);
    const payload = { username: fd.get('username'), password: fd.get('password') };

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await safeJson(res);
      if (!res.ok || !body.token || !body.user) throw new Error(body.error || t('login.error'));
      localStorage.setItem('token', body.token);
      setStoredUser(body.user);
      addLog(t('log.login', { who: body.user.displayName, role: body.user.role }));
      showApp();
    } catch (err) {
      els.loginError.textContent = err.message;
      els.loginError.classList.remove('hidden');
    }
  });

  els.logoutBtn.addEventListener('click', () => {
    logout();
  });

  const loginDemo = document.getElementById('login-demo');
  if (loginDemo) {
    loginDemo.querySelectorAll('button[data-demo-user]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const userInput = els.loginForm.querySelector('input[name="username"]');
        const passInput = els.loginForm.querySelector('input[name="password"]');
        if (userInput) userInput.value = btn.dataset.demoUser;
        if (passInput) passInput.value = btn.dataset.demoPass;
        els.loginForm.requestSubmit();
      });
    });
  }

  /* ---------- Views ---------- */
  function switchView(view) {
    currentView = view;
    els.viewDashboard.classList.toggle('hidden', view !== 'dashboard');
    els.viewPatients.classList.toggle('hidden', view !== 'patients');
    els.viewAdmin.classList.toggle('hidden', view !== 'admin');
    els.viewSettings.classList.toggle('hidden', view !== 'settings');
    if (els.viewFuture) els.viewFuture.classList.toggle('hidden', view !== 'future');
    if (els.viewAnalytics) els.viewAnalytics.classList.toggle('hidden', view !== 'analytics');
    if (els.viewReports) els.viewReports.classList.toggle('hidden', view !== 'reports');
    if (els.viewTelemedicine) els.viewTelemedicine.classList.toggle('hidden', view !== 'telemedicine');
    if (els.viewVoice) els.viewVoice.classList.toggle('hidden', view !== 'voice');
    if (els.pageTitle) els.pageTitle.textContent = t('page.' + view) || 'SentryHealth';
    document.querySelectorAll('.nav-item').forEach((item) => {
      item.classList.toggle('active', item.dataset.view === view);
    });
    if (view === 'admin' && currentUser?.role === 'admin') loadDoctors();
    if (view === 'settings') loadSettings();
    if (view === 'telemedicine') { renderTelemedicine(true); startTeleSim(); } else { stopTeleSim(); }
    if (view === 'voice') renderVoice(true);
    if (lastData) render(lastData);
  }

  document.querySelectorAll('.nav-item').forEach((item) => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      if (item.dataset.view) switchView(item.dataset.view);
      if (item.dataset.future) openFutureModal(item.dataset.future);
    });
  });

  /* ---------- Tele-Tıp Canlı Simülasyon ---------- */
  let teleAnimFrame = null;
  let teleInterval = null;
  let teleStartTs = 0;
  let teleEcgX = 0;
  let telePhase = 0;

  function drawTeleEcg() {
    const canvas = document.getElementById('tele-ecg');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const mid = h / 2;
    ctx.fillStyle = 'rgba(6, 20, 40, 0.18)';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    const step = 2;
    const prevX = (teleEcgX - step + w) % w;
    const yFor = (x) => {
      const cycle = (x / w) * 4 * Math.PI + telePhase;
      const beat = Math.pow(Math.max(0, Math.sin(cycle)), 12);
      return mid - beat * (h * 0.42) + Math.sin(cycle * 3.7) * 2;
    };
    ctx.moveTo(prevX, yFor(prevX));
    ctx.lineTo(teleEcgX, yFor(teleEcgX));
    ctx.stroke();
    teleEcgX = (teleEcgX + step) % w;
    if (teleEcgX === 0) {
      ctx.clearRect(0, 0, w, h);
      telePhase = Math.random() * Math.PI;
    }
  }

  function drawTeleWaveform() {
    const canvas = document.getElementById('tele-waveform');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const mid = h / 2;
    ctx.clearRect(0, 0, w, h);
    const now = Date.now() / 320;
    const bars = 96;
    const barW = w / bars;
    for (let i = 0; i < bars; i++) {
      const amp = (Math.sin(now + i * 0.42) * 0.5 + 0.5) * (Math.sin(now * 0.5 + i * 0.11) * 0.5 + 0.5);
      const barH = 4 + amp * (h * 0.82);
      const grad = ctx.createLinearGradient(0, mid - barH / 2, 0, mid + barH / 2);
      grad.addColorStop(0, '#38bdf8');
      grad.addColorStop(1, '#2563eb');
      ctx.fillStyle = grad;
      ctx.fillRect(i * barW + 1, mid - barH / 2, barW - 2, barH);
    }
  }

  function teleAnimLoop() {
    drawTeleEcg();
    drawTeleWaveform();
    teleAnimFrame = requestAnimationFrame(teleAnimLoop);
  }

  function updateTeleReadings() {
    const rand = (min, max) => Math.round(min + Math.random() * (max - min));
    const bpmEl = document.getElementById('tele-bpm');
    const bpEl = document.getElementById('tele-bp');
    const spo2El = document.getElementById('tele-spo2');
    const rrEl = document.getElementById('tele-rr');
    if (bpmEl) bpmEl.textContent = rand(72, 88);
    if (bpEl) bpEl.textContent = `${rand(116, 132)}/${rand(74, 86)}`;
    if (spo2El) spo2El.textContent = `%${rand(95, 99)}`;
    if (rrEl) rrEl.textContent = rand(14, 19);

    const score = rand(8, 34);
    const fill = document.getElementById('tele-score-fill');
    const value = document.getElementById('tele-score-value');
    const label = document.getElementById('tele-risk-label');
    if (fill) {
      fill.style.width = `${score}%`;
      fill.classList.toggle('warn', score >= 25);
    }
    if (value) value.textContent = `${score}%`;
    if (label) label.textContent = score >= 25 ? t('teletip.riskModerate') : t('teletip.riskLow');

    const timerEl = document.getElementById('tele-timer');
    if (timerEl && teleStartTs) {
      const total = Math.floor((Date.now() - teleStartTs) / 1000);
      const mm = String(Math.floor(total / 60)).padStart(2, '0');
      const ss = String(total % 60).padStart(2, '0');
      timerEl.textContent = `${mm}:${ss}`;
    }
  }

  function startTeleSim() {
    stopTeleSim();
    teleStartTs = Date.now();
    teleEcgX = 0;
    const ecg = document.getElementById('tele-ecg');
    if (ecg) {
      const ctx = ecg.getContext('2d');
      ctx.clearRect(0, 0, ecg.width, ecg.height);
    }
    updateTeleReadings();
    teleInterval = setInterval(updateTeleReadings, 2000);
    teleAnimFrame = requestAnimationFrame(teleAnimLoop);
  }

  function stopTeleSim() {
    if (teleAnimFrame) cancelAnimationFrame(teleAnimFrame);
    teleAnimFrame = null;
    if (teleInterval) clearInterval(teleInterval);
    teleInterval = null;
  }

  const teleRxApply = document.getElementById('tele-rx-apply');
  if (teleRxApply) {
    teleRxApply.addEventListener('click', () => {
      const status = document.getElementById('tele-rx-status');
      if (status) status.classList.remove('hidden');
      addLog(t('teletip.rxApplied'));
    });
  }

  /* ---------- Admin ---------- */
  async function loadDoctors() {
    if (!els.adminDoctorsBody) return;
    try {
      const res = await api('/api/admin/doctors');
      if (!res.ok) throw new Error(t('admin.errorList'));
      const body = await res.json();
      const doctors = body.doctors || [];
      if (doctors.length === 0) {
        els.adminDoctorsBody.innerHTML = `<tr><td colspan="3" class="table-empty">${escapeHtml(t('admin.empty'))}</td></tr>`;
        return;
      }
      els.adminDoctorsBody.innerHTML = doctors.map((d) => `
        <tr>
          <td>${escapeHtml(d.username)}</td>
          <td>${escapeHtml(d.displayName)}</td>
          <td class="text-right">
            <button class="btn btn-danger" data-username="${escapeHtml(d.username)}">${escapeHtml(t('common.delete'))}</button>
          </td>
        </tr>`).join('');

      els.adminDoctorsBody.querySelectorAll('button[data-username]').forEach((btn) => {
        btn.addEventListener('click', () => deleteDoctor(btn.dataset.username));
      });
    } catch (err) {
      els.adminDoctorsBody.innerHTML = `<tr><td colspan="3" class="table-empty">${escapeHtml(err.message)}</td></tr>`;
    }
  }

  async function deleteDoctor(username) {
    if (!confirm(t('admin.confirmDelete', { username }))) return;
    try {
      const res = await api(`/api/admin/doctors/${encodeURIComponent(username)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(t('admin.errorDelete'));
      addLog(t('log.doctorDeleted', { username }));
      await loadDoctors();
    } catch (err) {
      alert(err.message);
    }
  }

  els.adminDoctorForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    els.adminFormError.classList.add('hidden');
    const fd = new FormData(els.adminDoctorForm);
    const payload = {
      username: fd.get('username'),
      displayName: fd.get('displayName'),
      password: fd.get('password'),
    };
    try {
      const res = await api('/api/admin/doctors', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || t('admin.errorAdd'));
      els.adminDoctorForm.reset();
      addLog(t('log.doctorAdded', { username: body.doctor.username }));
      await loadDoctors();
    } catch (err) {
      els.adminFormError.textContent = err.message;
      els.adminFormError.classList.remove('hidden');
    }
  });

  /* ---------- Settings ---------- */
  function loadSettings() {
    if (!els.settingsClinicForm || !els.settingsNotifyForm) return;
    const clinic = JSON.parse(localStorage.getItem('settings_clinic') || '{}');
    const notify = JSON.parse(localStorage.getItem('settings_notify') || '{}');
    const api = JSON.parse(localStorage.getItem('settings_api') || '{}');
    if (clinic.clinicName) els.settingsClinicForm.clinicName.value = clinic.clinicName;
    if (clinic.clinicAddress) els.settingsClinicForm.clinicAddress.value = clinic.clinicAddress;
    if (clinic.logo) {
      els.settingsLogoPreview.innerHTML = `<img src="${clinic.logo}" alt="logo" />`;
      if (els.settingsLogoStatus) els.settingsLogoStatus.textContent = t('settings.logoSimulated');
    }
    if (notify.smsThreshold) els.settingsNotifyForm.smsThreshold.value = notify.smsThreshold;
    if (notify.notifyChannel) els.settingsNotifyForm.notifyChannel.value = notify.notifyChannel;
    ['toggleSms', 'toggleEmail', 'togglePush', 'toggleAi'].forEach((key) => {
      const el = els.settingsNotifyForm.elements[key];
      if (el) el.checked = notify[key] === 'on' || el.hasAttribute('checked');
    });
    if (els.kvkkLastUpdate) {
      const lastUpdate = localStorage.getItem('kvkk_last_update') || new Date().toLocaleString(dateLocale());
      els.kvkkLastUpdate.textContent = lastUpdate;
    }
    if (els.settingsApiKey && api.apiKey) els.settingsApiKey.value = api.apiKey;
    if (els.systemLogs) {
      const logs = JSON.parse(localStorage.getItem('sentry_logs') || '[]');
      els.systemLogs.textContent = logs.slice(-20).join('\n') || t('settings.logsReady');
    }
  }

  function saveSettings(key, form) {
    const data = Object.fromEntries(new FormData(form).entries());
    if (form === els.settingsNotifyForm) {
      ['toggleSms', 'toggleEmail', 'togglePush', 'toggleAi'].forEach((toggle) => {
        const el = form.elements[toggle];
        data[toggle] = el && el.checked ? 'on' : 'off';
      });
    }
    localStorage.setItem(`settings_${key}`, JSON.stringify(data));
    addLog(t(key === 'clinic' ? 'settings.logClinic' : 'settings.logNotify'));
  }

  els.settingsClinicForm.addEventListener('submit', (e) => {
    e.preventDefault();
    saveSettings('clinic', els.settingsClinicForm);
  });

  els.settingsNotifyForm.addEventListener('submit', (e) => {
    e.preventDefault();
    saveSettings('notify', els.settingsNotifyForm);
  });

  if (els.settingsLogoInput) {
    els.settingsLogoInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target.result;
        const clinic = JSON.parse(localStorage.getItem('settings_clinic') || '{}');
        clinic.logo = dataUrl;
        localStorage.setItem('settings_clinic', JSON.stringify(clinic));
        els.settingsLogoPreview.innerHTML = `<img src="${dataUrl}" alt="logo" />`;
        if (els.settingsLogoStatus) els.settingsLogoStatus.textContent = t('settings.logoSimulated');
        addLog(t('settings.logClinic'));
      };
      reader.readAsDataURL(file);
    });
  }

  if (els.settingsTestSms) {
    els.settingsTestSms.addEventListener('click', () => {
      if (els.settingsTestSmsStatus) {
        els.settingsTestSmsStatus.textContent = t('settings.testSmsSent');
        els.settingsTestSmsStatus.className = 'settings-status status-ok';
      }
      addLog(t('settings.logTestSms'));
    });
  }

  if (els.settingsGenerateApi) {
    els.settingsGenerateApi.addEventListener('click', () => {
      const key = 'sh_live_' + Array.from({ length: 32 }, () => Math.floor(Math.random() * 36).toString(36)).join('');
      if (els.settingsApiKey) els.settingsApiKey.value = key;
      localStorage.setItem('settings_api', JSON.stringify({ apiKey: key }));
      if (els.settingsApiStatus) {
        els.settingsApiStatus.textContent = t('settings.apiGenerateSuccess');
        els.settingsApiStatus.className = 'settings-status status-ok';
      }
      addLog(t('settings.logApi'));
    });
  }

  if (els.settingsCopyApi) {
    els.settingsCopyApi.addEventListener('click', () => {
      if (!els.settingsApiKey) return;
      navigator.clipboard.writeText(els.settingsApiKey.value).then(() => {
        if (els.settingsApiStatus) {
          els.settingsApiStatus.textContent = t('settings.apiCopied');
          els.settingsApiStatus.className = 'settings-status status-ok';
        }
      });
    });
  }

  els.clearLogs.addEventListener('click', () => {
    localStorage.removeItem('sentry_logs');
    if (els.systemLogs) els.systemLogs.textContent = t('settings.logsReady');
  });

  /* ---------- Helpers ---------- */
  function setConnection(online) {
    els.connStatus.classList.toggle('online', online);
    els.connStatus.classList.toggle('offline', !online);
    els.connText.textContent = online ? t('status.online') : t('status.offline');
  }

  function fmtTime(ts) {
    return new Date(ts).toLocaleTimeString(dateLocale());
  }

  let sparkId = 0;
  function smoothPathD(coords) {
    let d = `M ${coords[0][0].toFixed(1)} ${coords[0][1].toFixed(1)}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = coords[Math.max(0, i - 1)];
      const p1 = coords[i];
      const p2 = coords[i + 1];
      const p3 = coords[Math.min(coords.length - 1, i + 2)];
      const c1x = p1[0] + (p2[0] - p0[0]) / 6;
      const c1y = p1[1] + (p2[1] - p0[1]) / 6;
      const c2x = p2[0] - (p3[0] - p1[0]) / 6;
      const c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
    }
    return d;
  }

  function sparkline(history, isBad, selector) {
    if (!history || history.length < 2) return '';
    const getValue = selector || ((h) => h.heartRate);
    const values = history.map(getValue);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const width = 300;
    const height = 46;
    const step = width / (values.length - 1);
    const coords = values.map((v, i) => [
      i * step,
      height - 5 - ((v - min) / range) * (height - 12),
    ]);
    const lineD = smoothPathD(coords);
    const areaD = `${lineD} L ${width} ${height} L 0 ${height} Z`;
    const id = `spark-${++sparkId}`;
    const c1 = isBad ? '#f87171' : '#60a5fa';
    const c2 = isBad ? '#dc2626' : '#6366f1';
    return `<svg class="sparkline" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
      <defs>
        <linearGradient id="${id}-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="${c1}" /><stop offset="100%" stop-color="${c2}" />
        </linearGradient>
        <linearGradient id="${id}-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${c2}" stop-opacity="0.18" />
          <stop offset="100%" stop-color="${c2}" stop-opacity="0" />
        </linearGradient>
      </defs>
      <path class="spark-area" d="${areaD}" fill="url(#${id}-area)" />
      <path class="spark-line" d="${lineD}" stroke="url(#${id}-line)" />
    </svg>`;
  }

  function displayName(p) {
    return t('patient.display', { code: p.displayCode || p.pseudonym.slice(0, 8).toUpperCase() });
  }

  function translateCondition(cg) {
    const key = conditionKeyMap[cg || 'Kronik hastalık'] || 'chronic';
    return t('condition.' + key);
  }

  function vitalHtml(label, value, unit, isBad) {
    return `<div class="vital${isBad ? ' bad' : ''}">
      <div class="vital-label">${escapeHtml(label)}</div>
      <div class="vital-value">${value}<span class="unit">${unit}</span></div>
    </div>`;
  }

  function contactBadge(p) {
    if (!p.contactChannel) return '';
    const cls = p.contactChannel === 'sms' ? 'sms' : 'ai';
    return `<span class="contact-badge ${cls}">${escapeHtml(t('badge.' + p.contactChannel))}</span>`;
  }

  function scheduledTasks(p) {
    const q = (p.customQuestion || '').trim();
    const times = p.questionTimes || [];
    if (!q && times.length === 0) return '';
    const rows = times.map((time) => `
      <div class="scheduled-task">
        <span class="task-time">${escapeHtml(time)}</span>
        <span>${escapeHtml(q)}</span>
      </div>`).join('');
    if (times.length === 0 && q) {
      return `<div class="scheduled-tasks"><h5>${escapeHtml(t('scheduledTasks.title'))}</h5><div class="scheduled-task"><span>${escapeHtml(q)}</span></div></div>`;
    }
    return `<div class="scheduled-tasks"><h5>${escapeHtml(t('scheduledTasks.title'))}</h5>${rows}</div>`;
  }

  function patientCard(p) {
    const risk = p.risk || { level: 'low', reasons: [], report: '', breachedThreshold: null };
    const level = risk.level;
    const m = p.latest;
    if (!m) return '';

    const hrBad = m.heartRate > 120 || m.heartRate < 50;
    const spoBad = m.oxygenSaturation < 92;
    const tempBad = m.temperature > 38.5 || m.temperature < 35.5;
    const bpBad = m.bloodPressureSystolic > 160 || m.bloodPressureDiastolic > 100;
    const isAlarm = level === 'critical' || level === 'high';
    const msgClass = risk.breachedThreshold === 'critical' ? 'critical' : risk.breachedThreshold === 'warning' ? 'warning' : '';

    return `<article class="patient-card risk-${level}">
      <div class="patient-top">
        <div class="patient-id">${escapeHtml(displayName(p))}${p.conditionGroup ? ` · ${escapeHtml(translateCondition(p.conditionGroup))}` : ''}${contactBadge(p)}
          <small>${escapeHtml(t('patient.anonId'))} ${escapeHtml(p.pseudonym.slice(0, 12))}… · ${escapeHtml(t('patient.lastMeasurement'))} ${fmtTime(m.timestamp)}</small>
        </div>
        <span class="risk-chip ${level}">${escapeHtml(t('risk.' + level))}</span>
      </div>
      ${sparkline(p.history, isAlarm)}
      <div class="vitals">
        ${vitalHtml(t('vital.pulse'), m.heartRate, 'bpm', hrBad)}
        ${vitalHtml(t('vital.spo2'), m.oxygenSaturation, '%', spoBad)}
        ${vitalHtml(t('vital.temp'), m.temperature, '°C', tempBad)}
        ${vitalHtml(t('vital.bp'), `${m.bloodPressureSystolic}/${m.bloodPressureDiastolic}`, 'mmHg', bpBad)}
      </div>
      <div class="xai-report">
        <span class="xai-title">${escapeHtml(t('xai.title'))}</span>
        ${escapeHtml(risk.report)}
      </div>
      ${p.patientMessage ? `<div class="patient-message ${msgClass}"><strong>${escapeHtml(t('clinical.message'))}</strong>: ${escapeHtml(p.patientMessage)}</div>` : ''}
      ${scheduledTasks(p)}
    </article>`;
  }

  function alertHtml(p) {
    const risk = p.risk;
    const msgClass = risk.breachedThreshold === 'critical' ? 'critical' : risk.breachedThreshold === 'warning' ? 'warning' : '';
    return `<div class="alert">
      <div class="alert-head">
        <span class="alert-badge">${escapeHtml(t('alert.title', { level: t('risk.' + risk.level) }))}</span>
        <span class="alert-patient">${escapeHtml(displayName(p))}</span>
        <span class="alert-time">${p.latest ? fmtTime(p.latest.timestamp) : ''}</span>
      </div>
      <div class="alert-xai">
        <span class="xai-title">${escapeHtml(t('xai.envTitle'))}</span>
        ${escapeHtml(risk.report)}
      </div>
      ${p.patientMessage ? `<div class="patient-message ${msgClass}">${escapeHtml(p.patientMessage)}</div>` : ''}
    </div>`;
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[c]);
  }

  /* ---------- Patients table ---------- */
  function riskChip(level) {
    return `<span class="risk-chip ${level}">${escapeHtml(t('risk.' + level))}</span>`;
  }

  function renderPatientsTable(patients) {
    if (!els.tableBody) return;
    if (patients.length === 0) {
      els.tableBody.innerHTML = `<tr><td colspan="6" class="table-empty">${escapeHtml(t('patients.empty'))}</td></tr>`;
      els.patientDetail.classList.add('hidden');
      return;
    }

    els.tableBody.innerHTML = patients.map((p) => `
      <tr data-pseudonym="${escapeHtml(p.pseudonym)}" class="${p.pseudonym === selectedPseudonym ? 'selected' : ''}">
        <td><span class="code-chip">${escapeHtml(p.displayCode || p.pseudonym.slice(0, 8).toUpperCase())}</span></td>
        <td class="mono">${escapeHtml(p.pseudonym)}</td>
        <td>${escapeHtml(p.ageGroup || '—')}</td>
        <td>${escapeHtml(translateCondition(p.conditionGroup))}</td>
        <td>${p.latest ? `${p.latest.heartRate} bpm / %${p.latest.oxygenSaturation}` : escapeHtml(t('patients.waiting'))}</td>
        <td>${riskChip(p.risk.level)}</td>
      </tr>`).join('');

    els.tableBody.querySelectorAll('tr[data-pseudonym]').forEach((row) => {
      row.addEventListener('click', () => {
        selectedPseudonym = row.dataset.pseudonym;
        if (lastData) render(lastData);
      });
    });

    renderPatientDetail(patients);
  }

  function renderPatientDetail(patients) {
    const p = patients.find((x) => x.pseudonym === selectedPseudonym);
    if (!p) {
      els.patientDetail.classList.add('hidden');
      return;
    }
    els.patientDetail.classList.remove('hidden');

    const history = p.history || [];
    const isAlarm = p.risk.level === 'critical' || p.risk.level === 'high';
    const rows = history.slice(-8).reverse().map((h) => `
      <tr>
        <td>${fmtTime(h.timestamp)}</td>
        <td>${h.heartRate} bpm</td>
        <td>%${h.oxygenSaturation}</td>
        <td>${h.temperature}°C</td>
        <td>${h.bloodPressureSystolic}/${h.bloodPressureDiastolic}</td>
      </tr>`).join('');

    const breach = p.risk?.breachedThreshold;
    const alertBanner = breach === 'critical' ? `
      <div class="critical-banner">
        ${escapeHtml(t('alertPanel.criticalTitle'))}: ${escapeHtml(t('alertPanel.criticalMessage'))}
      </div>` : breach === 'warning' ? `
      <div class="warning-banner">
        ${escapeHtml(t('alertPanel.warningTitle'))}: ${escapeHtml(t('alertPanel.warningMessage'))}
      </div>` : '';

    const msgClass = breach === 'critical' ? 'critical' : breach === 'warning' ? 'warning' : '';
    const patientMessage = p.patientMessage ? `
      <div class="patient-message ${msgClass}">
        <strong>${escapeHtml(t('clinical.message'))}</strong>: ${escapeHtml(p.patientMessage)}
      </div>` : '';

    const channel = p.contactChannel || 'sms';
    const customQuestion = p.customQuestion || '';
    const questionTimes = (p.questionTimes || []).join(', ');
    const critical = p.criticalThreshold || { metric: 'heartRate', operator: '>', value: 140, message: t('clinical.criticalDefault') };
    const warning = p.warningThreshold || { metric: 'heartRate', operator: '>', value: 100, message: t('clinical.warningDefault') };

    const metricOptions = (selected) => ['heartRate', 'oxygenSaturation', 'temperature', 'systolic', 'diastolic'].map((key) => `
      <option value="${key}" ${selected === key ? 'selected' : ''}>${escapeHtml(t('clinical.options.' + key))}</option>`).join('');
    const operatorOptions = (selected) => ['>', '<', '>=', '<=', '='].map((op) => `
      <option value="${op}" ${selected === op ? 'selected' : ''}>${escapeHtml(op)}</option>`).join('');

    const thresholdFields = (prefix, threshold, label) => `
      <fieldset class="threshold-fieldset">
        <legend>${escapeHtml(label)}</legend>
        <div class="threshold-row">
          <label class="field small">
            <span>${escapeHtml(t('clinical.metric'))}</span>
            <select name="${prefix}-metric" required>${metricOptions(threshold.metric)}</select>
          </label>
          <label class="field small">
            <span>${escapeHtml(t('clinical.operator'))}</span>
            <select name="${prefix}-operator" required>${operatorOptions(threshold.operator)}</select>
          </label>
          <label class="field small">
            <span>${escapeHtml(t('clinical.value'))}</span>
            <input type="number" name="${prefix}-value" value="${Number(threshold.value) || 0}" required />
          </label>
        </div>
        <label class="field">
          <span>${escapeHtml(t('clinical.message'))}</span>
          <input type="text" name="${prefix}-message" value="${escapeHtml(threshold.message)}" required />
        </label>
      </fieldset>`;

    els.patientDetail.innerHTML = `
      <div class="detail-head">
        <h3>${escapeHtml(displayName(p))}${contactBadge(p)} — ${escapeHtml(t('patient.history'))}</h3>
        <div style="display:flex;align-items:center;gap:10px">
          ${riskChip(p.risk.level)}
          <button class="btn btn-primary" id="add-vitals-btn">${escapeHtml(t('patient.addVitals'))}</button>
        </div>
      </div>
      ${alertBanner}
      ${patientMessage}
      ${scheduledTasks(p)}
      <div class="detail-charts">
        <div class="chart-box"><span class="chart-title">${escapeHtml(t('chart.pulse'))}</span>${sparkline(history, isAlarm, (h) => h.heartRate)}</div>
        <div class="chart-box"><span class="chart-title">${escapeHtml(t('chart.spo2'))}</span>${sparkline(history, isAlarm, (h) => h.oxygenSaturation)}</div>
        <div class="chart-box"><span class="chart-title">${escapeHtml(t('chart.temp'))}</span>${sparkline(history, isAlarm, (h) => h.temperature)}</div>
      </div>
      <table class="history-table">
        <thead><tr><th>${escapeHtml(t('table.time'))}</th><th>${escapeHtml(t('vital.pulse'))}</th><th>${escapeHtml(t('vital.spo2'))}</th><th>${escapeHtml(t('vital.temp'))}</th><th>${escapeHtml(t('vital.bp'))}</th></tr></thead>
        <tbody>${rows || `<tr><td colspan="5">${escapeHtml(t('patient.noMeasurements'))}</td></tr>`}</tbody>
      </table>
      <div class="xai-report" style="margin-top:14px">
        <span class="xai-title">${escapeHtml(t('xai.envTitle'))}</span>
        ${escapeHtml(p.risk.report)}
      </div>

      <form id="clinical-plan-form" class="clinical-plan">
        <h4 class="clinical-title">${escapeHtml(t('clinical.title'))}</h4>
        <label class="field">
          <span>${escapeHtml(t('clinical.contactChannel'))}</span>
          <select name="contactChannel" required>
            <option value="sms" ${channel === 'sms' ? 'selected' : ''}>${escapeHtml(t('clinical.contactSms'))}</option>
            <option value="ai" ${channel === 'ai' ? 'selected' : ''}>${escapeHtml(t('clinical.contactAi'))}</option>
          </select>
        </label>
        <label class="field">
          <span>${escapeHtml(t('clinical.customQuestion'))}</span>
          <input type="text" name="customQuestion" value="${escapeHtml(customQuestion)}" placeholder="${escapeHtml(t('clinical.questionPlaceholder'))}" />
        </label>
        <label class="field">
          <span>${escapeHtml(t('clinical.sendingTimes'))}</span>
          <input type="text" name="questionTimes" value="${escapeHtml(questionTimes)}" placeholder="${escapeHtml(t('clinical.timesPlaceholder'))}" />
        </label>
        ${thresholdFields('critical', critical, t('clinical.criticalThreshold'))}
        ${thresholdFields('warning', warning, t('clinical.warningThreshold'))}
        <div class="clinical-actions">
          <button type="submit" class="btn btn-primary">${escapeHtml(t('clinical.save'))}</button>
          <span id="clinical-status" class="clinical-status hidden"></span>
        </div>
      </form>`;

    const addVitalsBtn = document.getElementById('add-vitals-btn');
    if (addVitalsBtn) {
      addVitalsBtn.addEventListener('click', () => openVitalsModal(p));
    }

    const clinicalForm = document.getElementById('clinical-plan-form');
    if (clinicalForm) {
      clinicalForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const status = document.getElementById('clinical-status');
        if (status) status.classList.add('hidden');
        const fd = new FormData(clinicalForm);
        const times = String(fd.get('questionTimes') || '').split(',').map((s) => s.trim()).filter(Boolean);
        const buildThreshold = (prefix) => {
          const message = String(fd.get(`${prefix}-message`) || '').trim();
          return {
            metric: String(fd.get(`${prefix}-metric`)),
            operator: String(fd.get(`${prefix}-operator`)),
            value: Number(fd.get(`${prefix}-value`)),
            message: message || t(prefix === 'critical' ? 'clinical.criticalDefault' : 'clinical.warningDefault'),
          };
        };
        const payload = {
          contactChannel: String(fd.get('contactChannel')),
          customQuestion: String(fd.get('customQuestion') || '').trim(),
          questionTimes: times,
          criticalThreshold: buildThreshold('critical'),
          warningThreshold: buildThreshold('warning'),
        };
        try {
          const res = await api(`/api/patients/${encodeURIComponent(p.pseudonym)}/clinical-plan`, {
            method: 'PUT',
            body: JSON.stringify(payload),
          });
          const body = await res.json();
          if (!res.ok) throw new Error(body.error || t('clinical.error'));
          if (status) {
            status.textContent = t('clinical.saved');
            status.classList.remove('hidden');
          }
          await poll();
        } catch (err) {
          if (status) {
            status.textContent = err.message;
            status.classList.remove('hidden');
          }
        }
      });
    }
  }

  /* ---------- Vitals entry ---------- */
  function openVitalsModal(p) {
    vitalsTarget = p.pseudonym;
    els.vitalsTitle.textContent = t('vitals.title', { name: displayName(p) });
    els.vitalsForm.reset();
    els.vitalsError.classList.add('hidden');
    els.vitalsModal.classList.remove('hidden');
  }

  function closeVitalsModal() {
    els.vitalsModal.classList.add('hidden');
    vitalsTarget = null;
  }

  document.getElementById('vitals-close').addEventListener('click', closeVitalsModal);
  document.getElementById('vitals-cancel').addEventListener('click', closeVitalsModal);
  els.vitalsModal.addEventListener('click', (e) => {
    if (e.target === els.vitalsModal) closeVitalsModal();
  });

  els.vitalsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!vitalsTarget) return;
    els.vitalsError.classList.add('hidden');
    const fd = new FormData(els.vitalsForm);
    const payload = {
      heart_rate: Number(fd.get('heartRate')),
      blood_pressure: `${fd.get('systolic')}/${fd.get('diastolic')}`,
      oxygen_saturation: Number(fd.get('oxygenSaturation')),
      body_temperature: Number(fd.get('bodyTemperature')),
    };

    try {
      const res = await api(`/api/patients/${encodeURIComponent(vitalsTarget)}/metrics`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || t('vitals.error'));
      addLog(t('log.vitalsAdded', { name: displayName({ pseudonym: vitalsTarget }) }));
      closeVitalsModal();
      await poll();
    } catch (err) {
      els.vitalsError.textContent = err.message;
      els.vitalsError.classList.remove('hidden');
    }
  });

  /* ---------- Futuristic modules ---------- */
  function selectedOrFirstPatient() {
    const patients = (lastData && lastData.patients) || [];
    return patients.find((p) => p.pseudonym === selectedPseudonym) || patients[0] || null;
  }

  function closeFutureModal() {
    if (!els.futureModal) return;
    els.futureModal.classList.add('hidden');
    document.body.style.overflow = '';
  }

  function futureLoading() {
    return `<div class="future-loading" style="flex-direction:column;align-items:center;gap:12px;padding:40px 0;">
      <div class="spinner" style="border:4px solid rgba(37,99,235,0.15);border-top-color:var(--blue);"></div>
      <span style="font-size:0.8rem;color:var(--text-muted);">${escapeHtml(t('common.loading'))}</span>
    </div>`;
  }

  function futureGenomicContent() {
    const p = selectedOrFirstPatient();
    const who = p ? displayName(p) : t('genomic.noData');
    const conditionTurkish = p && p.conditionGroup ? p.conditionGroup : 'Kronik hastalık';
    const conditionKey = conditionKeyMap[conditionTurkish] || 'chronic';
    const condition = t('condition.' + conditionKey);
    return `
      <h4>${escapeHtml(t('genomic.reportTitle', { who: escapeHtml(who) }))}</h4>
      <ul>
        <li>${escapeHtml(t('genomic.item1'))}</li>
        <li>${escapeHtml(t('genomic.item2'))}</li>
        <li>${escapeHtml(t('genomic.item3', { condition: escapeHtml(condition) }))}</li>
        <li>${escapeHtml(t('genomic.item4'))}</li>
      </ul>
      <div style="margin-top:10px">
        <span class="icd-chip">ICD-10: E11</span>
        <span class="icd-chip">ICD-10: I10</span>
        <span class="icd-chip">ICD-10: J44</span>
      </div>`;
  }

  function futureScribeContent() {
    const p = selectedOrFirstPatient();
    const who = p ? displayName(p) : t('scribe.noData');
    return `
      <h4>${escapeHtml(t('scribe.reportTitle', { who: escapeHtml(who) }))}</h4>
      <p>${escapeHtml(t('scribe.p1'))}</p>
      <p style="margin-top:6px"><em>${escapeHtml(t('scribe.p2'))}</em></p>
      <div style="margin-top:8px">
        <span class="icd-chip">${escapeHtml(t('scribe.icd1'))}</span>
        <span class="icd-chip">${escapeHtml(t('scribe.icd2'))}</span>
        <span class="icd-chip">${escapeHtml(t('scribe.icd3'))}</span>
      </div>`;
  }

  function futureStaticContent(type) {
    return `
      <h4>${escapeHtml(t('technology.' + type + 'Title'))}</h4>
      <p>${escapeHtml(t('technology.' + type + 'Desc'))}</p>
      <div class="patient-message" style="margin-top:14px">
        <strong>${escapeHtml(t('technology.comingSoon'))}</strong>
      </div>`;
  }

  function openFutureModal(type) {
    if (!els.futureModal || !els.futureModalTitle || !els.futureModalBody) return;
    const title = t('future.' + type + 'Title') || t('technology.' + type + 'Title') || type;
    els.futureModalTitle.textContent = title;
    els.futureModalBody.innerHTML = futureLoading();
    els.futureModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    const delay = ['genomic', 'scribe'].includes(type) ? 2600 : 0;
    setTimeout(() => {
      if (type === 'genomic') {
        els.futureModalBody.innerHTML = futureGenomicContent();
        addLog(t('log.genomic'));
      } else if (type === 'scribe') {
        els.futureModalBody.innerHTML = futureScribeContent();
        addLog(t('log.scribe'));
      } else {
        els.futureModalBody.innerHTML = futureStaticContent(type);
      }
    }, delay);
  }

  if (els.genomicBtn) els.genomicBtn.addEventListener('click', () => openFutureModal('genomic'));
  if (els.scribeBtn) els.scribeBtn.addEventListener('click', () => openFutureModal('scribe'));
  if (els.futureModalClose) els.futureModalClose.addEventListener('click', closeFutureModal);
  if (els.futureModal) els.futureModal.addEventListener('click', (e) => { if (e.target === els.futureModal) closeFutureModal(); });
  if (els.futureViewGrid) {
    els.futureViewGrid.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-start]');
      if (btn) openFutureModal(btn.dataset.start);
    });
  }

  /* ---------- Analytics charts ---------- */
  function drawLineChart(container, labels, values, color) {
    if (!container) return;
    if (values.length < 2) {
      container.innerHTML = `<span class="empty-chart" style="color:var(--text-muted);font-size:0.8rem;">${escapeHtml(t('analytics.noData'))}</span>`;
      return;
    }
    const width = 300;
    const height = 120;
    const padding = 24;
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const range = max - min || 1;
    const stepX = (width - padding * 2) / (values.length - 1);
    const coords = values.map((v, i) => [padding + i * stepX, height - padding - ((v - min) / range) * (height - padding * 2)]);
    const lineD = smoothPathD(coords);
    const areaD = `${lineD} L ${width - padding} ${height - padding} L ${padding} ${height - padding} Z`;
    const id = `line-${++sparkId}`;
    const labelHtml = labels.filter((_, i) => i % 2 === 0).map((l, i) => {
      const x = padding + i * 2 * stepX;
      return `<text x="${x}" y="${height - 4}" class="chart-label" text-anchor="middle">${escapeHtml(l.slice(5))}</text>`;
    }).join('');
    container.innerHTML = `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
      <defs>
        <linearGradient id="${id}-line" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${color}" /><stop offset="100%" stop-color="${color}" /></linearGradient>
        <linearGradient id="${id}-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${color}" stop-opacity="0.25" /><stop offset="100%" stop-color="${color}" stop-opacity="0" /></linearGradient>
      </defs>
      <path class="chart-area" d="${areaD}" fill="url(#${id}-area)" />
      <path class="chart-line" d="${lineD}" stroke="url(#${id}-line)" />
      ${labelHtml}
    </svg>`;
  }

  function drawBarChart(container, labels, values, color) {
    if (!container) return;
    if (values.length === 0) {
      container.innerHTML = `<span class="empty-chart" style="color:var(--text-muted);font-size:0.8rem;">${escapeHtml(t('analytics.noData'))}</span>`;
      return;
    }
    const width = 300;
    const height = 120;
    const padding = 24;
    const max = Math.max(...values, 1);
    const slot = (width - padding * 2) / values.length;
    const barWidth = slot * 0.6;
    const gap = slot * 0.4;
    const bars = values.map((v, i) => {
      const barH = (v / max) * (height - padding * 2);
      const x = padding + i * slot + gap / 2;
      const y = height - padding - barH;
      return `<rect x="${x}" y="${y}" width="${barWidth}" height="${barH}" fill="${color}" class="chart-bar" rx="4" />`;
    }).join('');
    const labelHtml = labels.filter((_, i) => i % 2 === 0).map((l, i) => {
      const x = padding + i * 2 * slot + gap / 2 + barWidth / 2;
      return `<text x="${x}" y="${height - 4}" class="chart-label" text-anchor="middle">${escapeHtml(l.slice(5))}</text>`;
    }).join('');
    container.innerHTML = `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">${bars}${labelHtml}</svg>`;
  }

  function drawDonutChart(container, distribution) {
    if (!container) return;
    if (!distribution || distribution.length === 0) {
      container.innerHTML = `<span class="empty-chart" style="color:var(--text-muted);font-size:0.8rem;">${escapeHtml(t('analytics.noData'))}</span>`;
      return;
    }
    const total = distribution.reduce((sum, d) => sum + d.value, 0) || 1;
    const colors = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#6366f1', '#0ea5e9', '#7c3aed'];
    let offset = 0;
    const circles = distribution.map((d, i) => {
      const pct = (d.value / total) * 100;
      const color = colors[i % colors.length];
      const circle = `<circle cx="50" cy="50" r="15.9155" fill="none" stroke="${color}" stroke-width="11" stroke-dasharray="${pct} ${100 - pct}" stroke-dashoffset="${-offset}" />`;
      offset += pct;
      return circle;
    }).join('');
    const legend = `<div class="chart-legend">${distribution.map((d, i) => `<span><i style="background:${colors[i % colors.length]}"></i> ${escapeHtml(d.label)}: ${d.value}</span>`).join('')}</div>`;
    container.innerHTML = `<svg viewBox="0 0 100 100" style="max-width:170px;max-height:170px;margin:0 auto;">${circles}</svg>${legend}`;
  }

  function renderAnalytics(data) {
    const analytics = data.analytics || { months: [], responses: [], alarms: [], distribution: [] };
    const ids = [
      ['chart-trend', 'chart-alarms', 'chart-distribution'],
      ['chart-trend-view', 'chart-alarms-view', 'chart-distribution-view'],
    ];
    for (const [trendId, alarmId, distId] of ids) {
      const tEl = document.getElementById(trendId);
      const aEl = document.getElementById(alarmId);
      const dEl = document.getElementById(distId);
      drawLineChart(tEl, analytics.months, analytics.responses, 'var(--blue)');
      drawBarChart(aEl, analytics.months, analytics.alarms, 'var(--red)');
      drawDonutChart(dEl, analytics.distribution);
    }
  }

  function renderReports(data) {
    if (!els.reportsView || els.reportsView.classList.contains('hidden')) return;
    const patients = data.patients || [];
    const critical = patients.filter((p) => p.risk?.level === 'critical').length;
    const warning = patients.filter((p) => p.risk?.level === 'high' || p.risk?.level === 'medium').length;
    const total = patients.length;
    const smsCount = patients.filter((p) => p.contactChannel === 'sms').length;
    const aiCount = patients.filter((p) => p.contactChannel === 'ai').length;
    const measurements = patients.reduce((sum, p) => sum + (p.history?.length || 0), 0);
    const generated = new Date().toLocaleString(dateLocale());
    if (els.reportsGenerated) els.reportsGenerated.textContent = generated;
    if (els.reportSummary) els.reportSummary.textContent = t('reports.reportSummary', { critical, warning });
    if (els.reportBreakdown) {
      els.reportBreakdown.innerHTML = `
        <div class="report-item"><span class="report-label">${escapeHtml(t('reports.totalPatients'))}</span><span class="report-value">${total}</span></div>
        <div class="report-item"><span class="report-label">${escapeHtml(t('reports.criticalPatients'))}</span><span class="report-value" style="color:var(--red)">${critical}</span></div>
        <div class="report-item"><span class="report-label">${escapeHtml(t('reports.warningPatients'))}</span><span class="report-value" style="color:var(--amber)">${warning}</span></div>
        <div class="report-item"><span class="report-label">${escapeHtml(t('reports.activeChannels'))}</span><span class="report-value">${smsCount} ${escapeHtml(t('badge.sms'))} / ${aiCount} ${escapeHtml(t('badge.ai'))}</span></div>
        <div class="report-item"><span class="report-label">${escapeHtml(t('reports.conditionBreakdown'))}</span><span class="report-value">${(data.analytics?.distribution || []).map((d) => `${escapeHtml(d.label)}: ${d.value}`).join(' · ') || '—'}</span></div>
        <div class="report-item"><span class="report-label">${escapeHtml(t('summary.totalMeasurements'))}</span><span class="report-value">${measurements}</span></div>`;
    }
  }

  function renderFutureView() {
    if (els.futureViewGrid) els.futureViewGrid.classList.remove('hidden');
  }

  /* ---------- Broadcast ---------- */
  const branchToConditionMap = {
    gastroenterology: ['Diğer'],
    cardiology: ['Kalp Yetmezliği', 'Hipertansiyon'],
    nephrology: ['Kronik Böbrek Hastalığı'],
    endocrinology: ['Diyabet'],
  };

  const broadcastTemplateMessages = {
    tr: {
      nutrition: 'Değerli hasta, gazlı ve asitli içecekler mide sağlığınızı olumsuz etkileyebilir. Lütfen su, ayran ve bitki çaylarına ağırlık verin.',
      medication: 'Hatırlatma: Reçete edilen ilaçlarınızı düzenli saatlerde almayı unutmayın. Tedavi sürekliliği çok önemlidir.',
      hydration: 'Günlük en az 2 litre su tüketmeye özen gösterin. Yeterli sıvı alımı tansiyon ve böbrek sağlığınızı destekler.',
      activity: 'Günlük 30 dakika hafif tempolu yürüyüş yapmanız kalp ve şeker metabolizmanız için faydalıdır.',
      checkup: 'Yaklaşan kontrol randevunuzu ihmal etmeyin. Düzenli takip, komplikasyon riskini azaltır.',
    },
    en: {
      nutrition: 'Dear patient, carbonated and acidic beverages can harm your digestive health. Please prefer water, ayran, and herbal teas.',
      medication: 'Reminder: Please take your prescribed medications at regular times. Treatment continuity is essential.',
      hydration: 'Please drink at least 2 liters of water daily. Adequate hydration supports blood pressure and kidney health.',
      activity: 'A 30-minute light walk every day is beneficial for your heart and glucose metabolism.',
      checkup: 'Do not miss your upcoming follow-up appointment. Regular monitoring reduces complication risk.',
    },
    ar: {
      nutrition: 'عزيزي المريض، المشروبات الغازية والحمضية قد تضر بصحة الجهاز الهضمي. يرجى تفضيل الماء واللبن والأعشاب.',
      medication: 'تذكير: يرجى تناول أدويتك الموصوفة في أوقات منتظمة. استمرارية العلاج ضرورية.',
      hydration: 'حرص على شرب لترين من الماء يومياً. الترطيب الكافي يدعم ضغط الدم وصحة الكلى.',
      activity: 'المشي الخفيف لمدة 30 دقيقة يومياً مفيد لقلبك وتمثيل الغذاء.',
      checkup: 'لا تفوت موعد المتابعة القادم. المراقبة المنتظمة تقلل مخاطر المضاعفات.',
    },
  };

  function getBroadcastTemplateMessage(key, lang) {
    return (broadcastTemplateMessages[lang] || broadcastTemplateMessages.tr)[key] || '';
  }

  function computeBroadcastTarget() {
    const patients = (lastData?.patients || []);
    const conditions = branchToConditionMap[broadcastState.branch] || [];
    return patients.filter((p) => conditions.includes(p.conditionGroup || '')).length;
  }

  function updateBroadcastTarget() {
    const target = computeBroadcastTarget();
    const countEl = document.getElementById('broadcast-target-count');
    const sendEl = document.getElementById('broadcast-send');
    if (countEl) countEl.textContent = target;
    if (sendEl) sendEl.textContent = t('telemedicine.sendButton', { count: target });
  }

  async function loadBroadcastHistory() {
    if (broadcastState.loaded) return;
    try {
      const res = await api('/api/broadcasts');
      if (!res.ok) throw new Error('load');
      broadcastState.history = (await res.json()) || [];
      broadcastState.loaded = true;
      renderTelemedicine(true);
    } catch {
      broadcastState.loaded = true;
    }
  }

  async function sendBroadcast() {
    const sendEl = document.getElementById('broadcast-send');
    const statusEl = document.getElementById('broadcast-status');
    if (!sendEl) return;
    sendEl.disabled = true;
    if (statusEl) statusEl.textContent = '';
    try {
      const res = await api('/api/broadcasts', {
        method: 'POST',
        body: JSON.stringify({
          branch: broadcastState.branch,
          template: broadcastState.template,
          message: broadcastState.message,
          channel: broadcastState.channel,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || t('telemedicine.sentError'));
      if (body.record) broadcastState.history.unshift(body.record);
      if (statusEl) {
        statusEl.textContent = t('telemedicine.sentSuccess');
        statusEl.className = 'status-ok';
      }
      addLog(t('telemedicine.historyTitle') + ': ' + broadcastState.template);
      renderTelemedicine(true);
    } catch (err) {
      if (statusEl) {
        statusEl.textContent = err.message || t('telemedicine.sentError');
        statusEl.className = 'status-error';
      }
      sendEl.disabled = false;
    }
  }

  function renderBroadcastHistory() {
    const history = broadcastState.history || [];
    if (history.length === 0) {
      return `<div class="history-item"><span class="history-body">${escapeHtml(t('telemedicine.historyEmpty'))}</span></div>`;
    }
    return history.slice(0, 10).map((item) => `
      <div class="history-item">
        <div class="history-icon">✓</div>
        <div class="history-body">
          <div>${escapeHtml(t('telemedicine.branches.' + item.branch) || item.branch)} · ${escapeHtml(item.channel.toUpperCase())}</div>
          <div class="history-time">${escapeHtml(new Date(item.createdAt).toLocaleString(dateLocale()))}</div>
        </div>
      </div>`).join('');
  }

  function attachBroadcastListeners() {
    if (!els.broadcastPanel) return;
    els.broadcastPanel.querySelectorAll('.branch-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        broadcastState.branch = btn.dataset.branch;
        renderTelemedicine(true);
      });
    });
    const templateSel = document.getElementById('broadcast-template');
    if (templateSel) {
      templateSel.addEventListener('change', () => {
        broadcastState.template = templateSel.value;
        broadcastState.message = getBroadcastTemplateMessage(broadcastState.template, i18n.getCurrentLang());
        renderTelemedicine(true);
      });
    }
    const messageEl = document.getElementById('broadcast-message');
    if (messageEl) {
      messageEl.addEventListener('input', () => {
        broadcastState.message = messageEl.value;
      });
    }
    els.broadcastPanel.querySelectorAll('.channel-card').forEach((card) => {
      card.addEventListener('click', () => {
        broadcastState.channel = card.dataset.channel;
        renderTelemedicine(true);
      });
    });
    const sendBtn = document.getElementById('broadcast-send');
    if (sendBtn) sendBtn.addEventListener('click', sendBroadcast);
  }

  async function renderTelemedicine(force = false) {
    if (!els.broadcastPanel) return;
    const lang = i18n.getCurrentLang();
    if (!force && els.broadcastPanel.innerHTML && els.broadcastPanel.dataset.lang === lang) {
      updateBroadcastTarget();
      return;
    }
    if (!broadcastState.loaded) await loadBroadcastHistory();
    const target = computeBroadcastTarget();
    if (!broadcastState.message) broadcastState.message = getBroadcastTemplateMessage(broadcastState.template, lang);

    const branchButtons = ['gastroenterology', 'cardiology', 'nephrology', 'endocrinology'].map((key) => `
      <button type="button" class="branch-btn ${broadcastState.branch === key ? 'active' : ''}" data-branch="${key}">${escapeHtml(t('telemedicine.branches.' + key))}</button>`).join('');
    const templateOptions = ['nutrition', 'medication', 'hydration', 'activity', 'checkup'].map((key) => `
      <option value="${key}" ${broadcastState.template === key ? 'selected' : ''}>${escapeHtml(t('telemedicine.templates.' + key))}</option>`).join('');
    const channel = broadcastState.channel;

    els.broadcastPanel.innerHTML = `
      <div class="broadcast-card">
        <h3 data-i18n="telemedicine.branchLabel">${escapeHtml(t('telemedicine.branchLabel'))}</h3>
        <div class="branch-buttons">${branchButtons}</div>
        <label class="field">
          <span data-i18n="telemedicine.templateLabel">${escapeHtml(t('telemedicine.templateLabel'))}</span>
          <select class="template-select" id="broadcast-template">${templateOptions}</select>
        </label>
        <label class="field">
          <span data-i18n="telemedicine.messageLabel">${escapeHtml(t('telemedicine.messageLabel'))}</span>
          <textarea class="broadcast-textarea" id="broadcast-message" placeholder="${escapeHtml(t('telemedicine.messageLabel'))}">${escapeHtml(broadcastState.message)}</textarea>
        </label>
        <h3 data-i18n="telemedicine.channelLabel">${escapeHtml(t('telemedicine.channelLabel'))}</h3>
        <div class="channel-cards">
          <label class="channel-card ${channel === 'sms' ? 'active' : ''}" data-channel="sms">
            <input type="radio" name="broadcast-channel" value="sms" ${channel === 'sms' ? 'checked' : ''} />
            <span data-i18n="telemedicine.channelSms">${escapeHtml(t('telemedicine.channelSms'))}</span>
          </label>
          <label class="channel-card ${channel === 'push' ? 'active' : ''}" data-channel="push">
            <input type="radio" name="broadcast-channel" value="push" ${channel === 'push' ? 'checked' : ''} />
            <span data-i18n="telemedicine.channelPush">${escapeHtml(t('telemedicine.channelPush'))}</span>
          </label>
        </div>
        <button type="button" class="btn btn-primary" id="broadcast-send">${escapeHtml(t('telemedicine.sendButton', { count: target }))}</button>
        <span id="broadcast-status"></span>
      </div>
      <div>
        <div class="target-card">
          <h3 data-i18n="telemedicine.targetLabel">${escapeHtml(t('telemedicine.targetLabel'))}</h3>
          <div class="target-row">
            <span data-i18n="telemedicine.targetPatients">${escapeHtml(t('telemedicine.targetPatients'))}</span>
            <span class="target-value" id="broadcast-target-count">${target}</span>
          </div>
          <div class="target-row">
            <span data-i18n="telemedicine.targetStatus">${escapeHtml(t('telemedicine.targetStatus'))}</span>
            <span class="status-ok" data-i18n="telemedicine.targetStatusValue">${escapeHtml(t('telemedicine.targetStatusValue'))}</span>
          </div>
        </div>
        <div class="broadcast-card" style="margin-top:20px">
          <h3 data-i18n="telemedicine.historyTitle">${escapeHtml(t('telemedicine.historyTitle'))}</h3>
          <div class="history-list" id="broadcast-history">${renderBroadcastHistory()}</div>
        </div>
      </div>`;
    els.broadcastPanel.dataset.lang = lang;
    attachBroadcastListeners();
    i18n.applyTranslations();
  }

  /* ---------- Voice Assistant ---------- */
  const defaultVoicePrompts = {
    tr: 'Merhaba [Hasta Adı], son ölçümünüz [Son Ölçüm] ve [Hastalık Tipi] takibiniz için sizi arıyorum. Lütfen ilaçlarınızı düzenli alın ve su tüketimine dikkat edin.',
    en: 'Hello [Patient Name], I am calling regarding your last measurement [Last Measurement] and your [Condition Type] follow-up. Please take your medications regularly and stay hydrated.',
    ar: 'مرحباً [اسم المريض]، أتصل بك بخصوص آخر قياس [آخر قياس] ومتابعة [نوع المرض]. يرجى تناول أدويتك بانتظام وشرب كمية كافية من الماء.',
  };

  const voiceOptionKeys = ['trF', 'trM', 'enF', 'enM', 'arF', 'arM'];

  function getVoiceLang(key) { return key.slice(0, 2); }
  function getVoiceGender(key) { return key.slice(2); }

  function initVoice() {
    if (ttsInitialized || typeof window === 'undefined' || !window.speechSynthesis) return;
    const synth = window.speechSynthesis;
    voiceState.voices = synth.getVoices() || [];
    if (voiceState.voices.length === 0) {
      const onVoices = () => {
        voiceState.voices = synth.getVoices() || [];
        if (currentView === 'voice') renderVoice(true);
      };
      if (synth.onvoiceschanged !== undefined) {
        synth.onvoiceschanged = onVoices;
      } else {
        setTimeout(onVoices, 500);
      }
    }
    ttsInitialized = true;
  }

  function selectVoice(voices, lang, gender) {
    const femaleHints = ['female','woman','kadın','kadin','kız','kiz','bayan','hoda','sara','ayşe','ayshe','ayse','emma','zira','aria','lina','anna','mary','susan','sophia','lucy','sarah','fatima','maryam','nour','asya'];
    const maleHints = ['male','man','erkek','bey','adam','tolga','kemal','ahmet','mehmet','john','david','mark','paul','james','michael','naayf','khaled','khalid','omar','ahmed','mustafa','yusuf'];
    const matches = voices.filter((v) => v.lang.toLowerCase().startsWith(lang));
    if (matches.length === 0) return voices[0] || null;
    const hints = gender === 'F' ? femaleHints : maleHints;
    const scored = matches.map((v) => {
      const n = v.name.toLowerCase();
      let score = 0;
      if (hints.some((h) => n.includes(h))) score = 3;
      if (n.includes(lang)) score += 1;
      return { v, score };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored[0]?.v || matches[0];
  }

  function replaceVoiceVariables(text) {
    const demo = {
      tr: { name: 'Mehmet Bey', measurement: 'nabız 72, SpO2 %97', condition: 'Diyabet' },
      en: { name: 'Mr. John', measurement: 'pulse 72, SpO2 97%', condition: 'Diabetes' },
      ar: { name: 'السيد أحمد', measurement: 'نبض 72، SpO2 97%', condition: 'السكري' },
    };
    const d = demo[i18n.getCurrentLang()] || demo.tr;
    return text
      .replace(/\[Hasta Adı\]/g, d.name)
      .replace(/\[Patient Name\]/g, d.name)
      .replace(/\[اسم المريض\]/g, d.name)
      .replace(/\[Son Ölçüm\]/g, d.measurement)
      .replace(/\[Last Measurement\]/g, d.measurement)
      .replace(/\[آخر قياس\]/g, d.measurement)
      .replace(/\[Hastalık Tipi\]/g, d.condition)
      .replace(/\[Condition Type\]/g, d.condition)
      .replace(/\[نوع المرض\]/g, d.condition);
  }

  function speak(text, voiceKey, rate) {
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    const lang = getVoiceLang(voiceKey);
    const gender = getVoiceGender(voiceKey);
    const voices = (synth.getVoices() || voiceState.voices || []);
    const voice = selectVoice(voices, lang, gender);
    const utter = new SpeechSynthesisUtterance(replaceVoiceVariables(text));
    utter.lang = voice?.lang || lang;
    utter.voice = voice || null;
    utter.rate = rate;
    utter.pitch = 1;
    synth.speak(utter);
  }

  async function loadVoiceScenario() {
    if (voiceState.loaded) return;
    try {
      const res = await api('/api/voice-assistant');
      if (!res.ok) throw new Error('load');
      const data = await res.json();
      voiceState.prompt = data.prompt || defaultVoicePrompts[i18n.getCurrentLang()] || defaultVoicePrompts.tr;
      voiceState.voiceKey = data.voiceKey || 'trF';
      voiceState.rate = Math.min(2, Math.max(0.5, Number(data.rate || 1)));
      voiceState.loaded = true;
    } catch {
      voiceState.loaded = true;
    }
  }

  async function saveVoiceScenario() {
    const statusEl = document.getElementById('voice-status');
    try {
      const res = await api('/api/voice-assistant', {
        method: 'POST',
        body: JSON.stringify({
          prompt: voiceState.prompt,
          voiceKey: voiceState.voiceKey,
          rate: voiceState.rate,
        }),
      });
      if (!res.ok) throw new Error('save');
      if (statusEl) {
        statusEl.textContent = t('voiceAssistant.saveSuccess');
        statusEl.className = 'status-ok';
      }
    } catch (err) {
      if (statusEl) {
        statusEl.textContent = err.message || t('voiceAssistant.saveError');
        statusEl.className = 'status-error';
      }
    }
  }

  function insertVoiceVariable(text, placeholder) {
    const el = document.getElementById('voice-prompt');
    if (!el) return;
    const start = el.selectionStart || 0;
    const end = el.selectionEnd || 0;
    const before = el.value.slice(0, start);
    const after = el.value.slice(end);
    el.value = before + placeholder + after;
    el.selectionStart = el.selectionEnd = start + placeholder.length;
    el.focus();
    voiceState.prompt = el.value;
  }

  function attachVoiceListeners() {
    if (!els.voicePanel) return;
    const promptEl = document.getElementById('voice-prompt');
    if (promptEl) {
      promptEl.addEventListener('input', () => { voiceState.prompt = promptEl.value; });
    }
    els.voicePanel.querySelectorAll('.var-btn').forEach((btn) => {
      btn.addEventListener('click', () => insertVoiceVariable(voiceState.prompt, btn.dataset.var));
    });
    const modelEl = document.getElementById('voice-model');
    if (modelEl) {
      modelEl.addEventListener('change', () => { voiceState.voiceKey = modelEl.value; });
    }
    const rateEl = document.getElementById('voice-rate');
    if (rateEl) {
      rateEl.addEventListener('input', () => {
        voiceState.rate = Number(rateEl.value);
        const valueEl = document.getElementById('voice-rate-value');
        if (valueEl) valueEl.textContent = voiceState.rate.toFixed(1) + 'x';
      });
    }
    const previewBtn = document.getElementById('voice-preview');
    if (previewBtn) {
      previewBtn.addEventListener('click', () => {
        if (typeof window.speechSynthesis === 'undefined') {
          alert('Tarayıcınız ses sentezlemeyi desteklemiyor.');
          return;
        }
        speak(voiceState.prompt, voiceState.voiceKey, voiceState.rate);
      });
    }
    const saveBtn = document.getElementById('voice-save');
    if (saveBtn) saveBtn.addEventListener('click', saveVoiceScenario);
  }

  function getCurrentChatSession() {
    return chatState.sessions.find((s) => s.id === chatState.currentId) || null;
  }

  function createChatSession() {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const session = {
      id,
      title: t('chatbot.newChat'),
      messages: [{ role: 'bot', text: t('chatbot.greeting'), time: new Date().toISOString() }],
      updatedAt: new Date().toISOString(),
    };
    chatState.sessions.unshift(session);
    chatState.currentId = id;
    if (chatState.sessions.length > 20) chatState.sessions.pop();
    saveChatSessions();
    return session;
  }

  function saveChatSessions() {
    localStorage.setItem('sentry_chat_sessions', JSON.stringify(chatState.sessions));
    localStorage.setItem('sentry_chat_current', chatState.currentId || '');
  }

  function chatVoiceKeyForLang() {
    const lang = i18n.getCurrentLang();
    if (lang === 'tr') return 'trF';
    if (lang === 'ar') return 'arF';
    return 'enF';
  }

  function generateBotResponse(input) {
    const lang = i18n.getCurrentLang();
    const text = String(input || '').toLowerCase();
    const responses = {
      tr: [
        { keys: ['diabet', 'şeker', 'metformin', 'diyabet'], key: 'diabetes' },
        { keys: ['hipertansiyon', 'tansiyon', 'kan basıncı', 'bp'], key: 'hypertension' },
        { keys: ['koah', 'copd', 'nefes darlığı', 'akciğer'], key: 'copd' },
        { keys: ['ilaç', 'doz', 'dozaj', 'mg', 'ilaçlarım'], key: 'medication' },
        { keys: ['protokol', 'rehber', 'tedavi'], key: 'protocol' },
        { keys: ['etkileşim', 'etkileşim', 'cyp', 'karışım'], key: 'interaction' },
        { keys: ['nabız', 'spo2', 'ateş', 'ölçüm', 'tansiyonum'], key: 'vitals' },
      ],
      en: [
        { keys: ['diabetes', 'sugar', 'metformin', 'glucose'], key: 'diabetes' },
        { keys: ['hypertension', 'blood pressure', 'bp', 'tension'], key: 'hypertension' },
        { keys: ['copd', 'emphysema', 'chronic bronchitis', 'lung'], key: 'copd' },
        { keys: ['medication', 'dose', 'dosage', 'mg', 'drug'], key: 'medication' },
        { keys: ['protocol', 'guideline', 'treatment'], key: 'protocol' },
        { keys: ['interaction', 'interact', 'cyp', 'combine'], key: 'interaction' },
        { keys: ['vitals', 'pulse', 'spo2', 'temperature', 'fever'], key: 'vitals' },
      ],
      ar: [
        { keys: ['سكري', 'سكر', 'ميتفورمين', 'ديابت'], key: 'diabetes' },
        { keys: ['ضغط', 'ارتفاع', 'tension', 'bp'], key: 'hypertension' },
        { keys: ['انسداد', 'copd', 'رئوي', 'نف'], key: 'copd' },
        { keys: ['دواء', 'جرعة', 'ملغ', 'mg', 'علاج'], key: 'medication' },
        { keys: ['بروتوكول', 'إرشاد', 'guideline'], key: 'protocol' },
        { keys: ['تفاعل', 'تداخل', 'interaction'], key: 'interaction' },
        { keys: ['نبض', 'أكسجين', 'حرارة', 'spo2', 'قياس'], key: 'vitals' },
      ],
    };
    const list = responses[lang] || responses.tr;
    for (const item of list) {
      if (item.keys.some((k) => text.includes(k))) return t('chatbot.responses.' + item.key);
    }
    return t('chatbot.responses.fallback');
  }

  function renderChatMessages() {
    const session = getCurrentChatSession();
    if (!session) return '';
    const html = session.messages.map((m) => {
      const isBot = m.role === 'bot';
      if (isBot) {
        return `<div class="chat-msg bot">
          <div class="chat-bubble bot">
            <div class="chat-meta bot"><span>YZ</span><span>${fmtTime(m.time)}</span></div>
            <p>${escapeHtml(m.text)}</p>
            <button type="button" class="chat-speak" aria-label="${escapeHtml(t('chatbot.speak'))}" data-msg="${escapeHtml(m.text)}">🔊</button>
          </div>
        </div>`;
      }
      return `<div class="chat-msg user">
        <div class="chat-bubble user">
          <div class="chat-meta user"><span>${escapeHtml(t('chatbot.send'))}</span><span>${fmtTime(m.time)}</span></div>
          <p>${escapeHtml(m.text)}</p>
        </div>
      </div>`;
    }).join('');
    if (chatState.loading) {
      return html + `<div class="chat-msg bot">
        <div class="chat-bubble bot thinking">
          <div class="chat-meta bot"><span>YZ</span><span>${escapeHtml(t('chatbot.thinking'))}</span></div>
          <div class="thinking-dots"><span></span><span></span><span></span></div>
        </div>
      </div>`;
    }
    return html;
  }

  function renderChatHistoryList() {
    if (chatState.sessions.length === 0) {
      return `<div class="chat-history-empty">${escapeHtml(t('chatbot.historyEmpty') || t('chatbot.historyTitle'))}</div>`;
    }
    return chatState.sessions.map((s) => `
      <button type="button" class="chat-history-item ${s.id === chatState.currentId ? 'active' : ''}" data-id="${s.id}">
        <span>${escapeHtml(s.title)}</span>
        <small>${fmtTime(s.updatedAt)}</small>
      </button>`).join('');
  }

  function renderSuggested() {
    const list = t('chatbot.suggested').split('|').map((q) => `<button type="button" class="chat-suggested-chip">${escapeHtml(q.trim())}</button>`).join('');
    return `<div class="chat-suggested-bar"><span class="chat-suggested-title">${escapeHtml(t('chatbot.inputHint'))}</span><div class="chat-suggested-chips">${list}</div></div>`;
  }

  function sendChatMessage(text) {
    const session = getCurrentChatSession() || createChatSession();
    const now = new Date().toISOString();
    session.messages.push({ role: 'user', text, time: now });
    session.updatedAt = now;
    if (session.title === t('chatbot.newChat')) session.title = text.slice(0, 34) || t('chatbot.newChat');
    chatState.loading = true;
    saveChatSessions();
    renderVoice(true);
    setTimeout(() => {
      const response = generateBotResponse(text);
      session.messages.push({ role: 'bot', text: response, time: new Date().toISOString() });
      session.updatedAt = new Date().toISOString();
      chatState.loading = false;
      saveChatSessions();
      renderVoice(true);
    }, 900);
  }

  function attachChatListeners() {
    if (!els.voicePanel) return;

    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('chat-send');
    if (input && sendBtn) {
      sendBtn.addEventListener('click', () => {
        const text = String(input.value || '').trim();
        if (!text || chatState.loading) return;
        input.value = '';
        sendChatMessage(text);
      });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') sendBtn.click();
      });
    }

    document.querySelectorAll('.chat-suggested-chip').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (chatState.loading) return;
        sendChatMessage(btn.textContent.trim());
      });
    });

    document.querySelectorAll('.chat-history-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        chatState.currentId = btn.dataset.id;
        saveChatSessions();
        renderVoice(true);
      });
    });

    const newBtn = document.getElementById('chat-new-btn');
    if (newBtn) {
      newBtn.addEventListener('click', () => {
        if (chatState.loading) return;
        createChatSession();
        renderVoice(true);
      });
    }

    const modelEl = document.getElementById('chat-voice-model');
    if (modelEl) {
      modelEl.addEventListener('change', () => { chatState.voiceKey = modelEl.value; });
    }

    const rateEl = document.getElementById('chat-voice-rate');
    if (rateEl) {
      rateEl.addEventListener('input', () => {
        chatState.rate = Number(rateEl.value);
        const valueEl = document.getElementById('chat-rate-value');
        if (valueEl) valueEl.textContent = chatState.rate.toFixed(1) + 'x';
      });
    }

    document.querySelectorAll('.chat-speak').forEach((btn) => {
      btn.addEventListener('click', () => {
        const msg = btn.dataset.msg;
        if (!msg) return;
        if (typeof window.speechSynthesis === 'undefined') {
          alert('Tarayıcınız ses sentezlemeyi desteklemiyor.');
          return;
        }
        speak(msg, chatState.voiceKey, chatState.rate);
      });
    });

    const clearBtn = document.getElementById('chat-clear-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        const session = getCurrentChatSession();
        if (session) {
          session.messages = [{ role: 'bot', text: t('chatbot.greeting'), time: new Date().toISOString() }];
          session.updatedAt = new Date().toISOString();
          saveChatSessions();
          renderVoice(true);
        }
      });
    }
  }

  async function renderVoice(force = false) {
    if (!els.voicePanel) return;
    const lang = i18n.getCurrentLang();
    if (!force && els.voicePanel.innerHTML && els.voicePanel.dataset.lang === lang) return;
    initVoice();

    if (!chatState.currentId || !getCurrentChatSession()) {
      createChatSession();
    }
    if (!voiceOptionKeys.includes(chatState.voiceKey) || !chatState.voiceKey.startsWith(lang)) {
      chatState.voiceKey = chatVoiceKeyForLang();
    }

    const voiceOptions = voiceOptionKeys.map((key) => `
      <option value="${key}" ${chatState.voiceKey === key ? 'selected' : ''}>${escapeHtml(t('chatbot.voices.' + key))}</option>`).join('');

    els.voicePanel.innerHTML = `
      <aside class="chatbot-sidebar">
        <div class="chatbot-brand">
          <div class="chatbot-icon">🤖</div>
          <div>
            <strong data-i18n="chatbot.title">${escapeHtml(t('chatbot.title'))}</strong>
            <span data-i18n="chatbot.subtitle">${escapeHtml(t('chatbot.subtitle'))}</span>
          </div>
        </div>
        <button type="button" class="btn btn-primary btn-block" id="chat-new-btn">${escapeHtml(t('chatbot.newChat'))}</button>
        <div class="chat-history-title">${escapeHtml(t('chatbot.historyTitle'))}</div>
        <div class="chat-history-list" id="chat-history-list">${renderChatHistoryList()}</div>
      </aside>
      <div class="chatbot-main">
        <div class="chatbot-header">
          <div class="chatbot-title"><span class="chatbot-dot"></span><span data-i18n="chatbot.title">${escapeHtml(t('chatbot.title'))}</span></div>
          <div class="chatbot-controls">
            <label class="chatbot-control">
              <span data-i18n="chatbot.voiceLabel">${escapeHtml(t('chatbot.voiceLabel'))}</span>
              <select id="chat-voice-model">${voiceOptions}</select>
            </label>
            <label class="chatbot-control">
              <span data-i18n="chatbot.rateLabel">${escapeHtml(t('chatbot.rateLabel'))}</span>
              <input type="range" id="chat-voice-rate" min="0.5" max="2" step="0.1" value="${chatState.rate}" />
              <span class="chat-rate-value" id="chat-rate-value">${chatState.rate.toFixed(1)}x</span>
            </label>
            <button type="button" class="btn btn-ghost btn-sm" id="chat-clear-btn">${escapeHtml(t('chatbot.clear'))}</button>
          </div>
        </div>
        <div class="chatbot-messages" id="chat-messages">${renderChatMessages()}</div>
        ${renderSuggested()}
        <div class="chatbot-input-row">
          <input type="text" id="chat-input" data-i18n-placeholder="chatbot.placeholder" placeholder="${escapeHtml(t('chatbot.placeholder'))}" autocomplete="off" />
          <button type="button" class="btn btn-primary" id="chat-send">${escapeHtml(t('chatbot.send'))}</button>
        </div>
        <p class="chatbot-disclaimer" data-i18n="chatbot.disclaimer">${escapeHtml(t('chatbot.disclaimer'))}</p>
      </div>`;

    els.voicePanel.dataset.lang = lang;
    attachChatListeners();
    setTimeout(() => {
      const msgBox = document.getElementById('chat-messages');
      if (msgBox) msgBox.scrollTop = msgBox.scrollHeight;
    }, 0);
    i18n.applyTranslations();
  }

  /* ---------- Modal ---------- */
  function openModal() {
    els.form.reset();
    els.form.classList.remove('hidden');
    els.formError.classList.add('hidden');
    els.kvkkResult.classList.add('hidden');
    els.modal.classList.remove('hidden');
  }

  function closeModal() {
    els.modal.classList.add('hidden');
  }

  document.getElementById('add-patient-btn-2').addEventListener('click', openModal);
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-cancel').addEventListener('click', closeModal);
  document.getElementById('kvkk-done').addEventListener('click', () => {
    closeModal();
    switchView('patients');
    poll();
  });
  els.modal.addEventListener('click', (e) => {
    if (e.target === els.modal) closeModal();
  });

  els.form.addEventListener('submit', async (e) => {
    e.preventDefault();
    els.formError.classList.add('hidden');
    const fd = new FormData(els.form);
    const payload = {
      fullName: fd.get('fullName'),
      nationalId: fd.get('nationalId'),
      dateOfBirth: fd.get('dateOfBirth'),
      condition: fd.get('condition'),
      contactChannel: fd.get('contactChannel'),
    };

    try {
      const res = await api('/api/patients', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || t('modal.error'));

      const conditionKey = conditionKeyMap[body.conditionGroup || 'Kronik hastalık'] || 'chronic';
      const conditionText = t('condition.' + conditionKey);
      els.kvkkFlow.innerHTML = `
        <div class="kvkk-step">
          <span class="step-icon">👤</span>
          <div><strong>${escapeHtml(t('modal.maskedIdentity'))}</strong>
          ${escapeHtml(body.kvkk.maskedName)} · T.C. ${escapeHtml(body.kvkk.maskedNationalId)}</div>
        </div>
        <div class="kvkk-arrow">${escapeHtml(t('modal.anonymization'))}</div>
        <div class="kvkk-step result">
          <span class="step-icon">🔐</span>
          <div><strong>${escapeHtml(t('modal.anonymousRecord'))}</strong>
          <code>${escapeHtml(body.pseudonym)}</code><br>
          ${escapeHtml(t('modal.patientCode'))} <strong style="color:var(--blue)">${escapeHtml(body.displayCode)}</strong> · ${escapeHtml(t('modal.ageGroup'))} ${escapeHtml(body.ageGroup)} · ${escapeHtml(t('modal.patientCondition'))} ${escapeHtml(conditionText)}</div>
        </div>
        <div class="kvkk-step">
          <span class="step-icon">ℹ️</span>
          <div>${escapeHtml(t('modal.kvkkNote'))}</div>
        </div>`;

      els.form.classList.add('hidden');
      els.kvkkResult.classList.remove('hidden');
      selectedPseudonym = body.pseudonym;
      addLog(t('log.patientAdded', { code: body.displayCode }));
    } catch (err) {
      els.formError.textContent = err.message;
      els.formError.classList.remove('hidden');
    }
  });

  /* ---------- Render ---------- */
  function updateSummary(patients) {
    const withData = patients.filter((p) => p.latest);
    const totalMeasurements = patients.reduce((sum, p) => sum + (p.history?.length || 0), 0);
    const alarms = withData.filter((p) => p.risk.level === 'high' || p.risk.level === 'critical');
    const critical = withData.filter((p) => p.risk.level === 'critical');

    const safeText = (el, v) => { if (el) el.textContent = v; };
    safeText(document.getElementById('stat-total'), patients.length);
    safeText(document.getElementById('stat-open-alarm'), alarms.length);
    safeText(document.getElementById('stat-response'), withData.length);
    safeText(document.getElementById('stat-sms'), withData.length);
    safeText(document.getElementById('stat-measurements'), totalMeasurements);
    safeText(document.getElementById('stat-critical'), critical.length);
  }

  function updateCriticalAlert(patients) {
    const hasCritical = patients.some((p) => p.risk?.breachedThreshold === 'critical');
    if (els.appShell) els.appShell.classList.toggle('alert-pulse', hasCritical);
  }

  function render(data) {
    lastData = data;
    const patients = data.patients || [];
    updateSummary(patients);

    const withData = patients.filter((p) => p.latest);
    const alarms = withData.filter((p) => p.risk.level === 'high' || p.risk.level === 'critical');
    els.alerts.innerHTML = alarms.map(alertHtml).join('');

    if (els.navAlarmCount) {
      els.navAlarmCount.textContent = alarms.length;
      els.navAlarmCount.classList.toggle('zero', alarms.length === 0);
    }

    updateCriticalAlert(patients);

    if (currentView === 'patients') {
      renderPatientsTable(patients);
    }

    if (currentView === 'analytics') {
      renderAnalytics(data);
      return;
    }

    if (currentView === 'reports') {
      renderReports(data);
      return;
    }

    if (currentView === 'future') {
      renderFutureView();
      return;
    }

    if (currentView === 'telemedicine') {
      renderTelemedicine();
      return;
    }

    if (currentView === 'voice') {
      renderVoice();
      return;
    }

    if (currentView !== 'dashboard') return;

    renderAnalytics(data);

    if (withData.length === 0) {
      els.patients.innerHTML = `<div class="empty-state">
        <p>${escapeHtml(t('emptyState.p1'))}</p>
        <p>${escapeHtml(t('emptyState.p2'))}</p>
      </div>`;
      return;
    }

    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    withData.sort((a, b) => order[a.risk.level] - order[b.risk.level]);
    els.patients.innerHTML = withData.map(patientCard).join('');
  }

  async function poll() {
    try {
      const res = await api('/api/dashboard/patients');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setConnection(true);
      render(data);
    } catch {
      setConnection(false);
    }
  }

  /* ---------- Language ---------- */
  function setLanguage(lang) {
    i18n.setLanguage(lang);
    document.querySelectorAll('#lang-switcher button').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.lang === lang);
    });
    if (els.pageTitle) els.pageTitle.textContent = t('page.' + currentView) || 'SentryHealth';
    if (lastData) render(lastData);
    if (currentView === 'admin' && currentUser?.role === 'admin') loadDoctors();
    if (els.systemLogs) {
      const logs = JSON.parse(localStorage.getItem('sentry_logs') || '[]');
      els.systemLogs.textContent = logs.slice(-20).join('\n') || t('settings.logsReady');
    }
  }

  function initLang() {
    if (!els.langSwitcher) return;
    const saved = localStorage.getItem('sentry-lang') || 'tr';
    setLanguage(saved);
    els.langSwitcher.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', () => setLanguage(btn.dataset.lang));
    });
  }

  initLang();
  initAuth();
})();
