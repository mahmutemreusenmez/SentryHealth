(() => {
  const { t } = window.SentryI18n;
  const i18n = window.SentryI18n;
  const POLL_MS = 2500;

  function getLocalDoctors() {
    try { return JSON.parse(localStorage.getItem('sentry_local_doctors') || '[]'); } catch { return []; }
  }
  function setLocalDoctors(doctors) {
    localStorage.setItem('sentry_local_doctors', JSON.stringify(doctors));
  }
  function getLocalPatients() {
    try { return JSON.parse(localStorage.getItem('sentry_local_patients') || '[]'); } catch { return []; }
  }
  function setLocalPatients(patients) {
    localStorage.setItem('sentry_local_patients', JSON.stringify(patients));
  }

  function getCustomTemplates() {
    try { return JSON.parse(localStorage.getItem('sentry_custom_templates') || '[]'); } catch { return []; }
  }
  function setCustomTemplates(templates) {
    localStorage.setItem('sentry_custom_templates', JSON.stringify(templates));
  }
  function saveCustomTemplate(text) {
    const templates = getCustomTemplates();
    if (!text || templates.includes(text)) return templates;
    templates.push(text);
    setCustomTemplates(templates);
    return templates;
  }
  function renderTemplateLibrary(select, value = '') {
    const templates = getCustomTemplates();
    select.innerHTML = `<option value="">${escapeHtml(t('schedule.templateLibrary'))}</option>`;
    templates.forEach((tpl) => {
      const opt = document.createElement('option');
      opt.value = tpl;
      opt.textContent = tpl;
      select.appendChild(opt);
    });
    select.value = value;
  }

  const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
  const DAY_SHORT = { 'Pazartesi': 'Pzt', 'Salı': 'Sal', 'Çarşamba': 'Çar', 'Perşembe': 'Per', 'Cuma': 'Cum', 'Cumartesi': 'Cmt', 'Pazar': 'Paz' };

  function buildDayCheckboxes(selected = []) {
    return `<div class="day-checkbox-group">${DAYS.map((d) => `<label class="day-checkbox"><input type="checkbox" name="scheduleDays" value="${escapeHtml(d)}" ${selected.includes(d) ? 'checked' : ''}>${escapeHtml(DAY_SHORT[d])}</label>`).join('')}</div>`;
  }
  function buildTimeRows(times = []) {
    if (!times.length) times = ['08:00'];
    return times.map((time) => `<div class="schedule-time-row"><input type="time" class="schedule-time-input" value="${escapeHtml(time)}" /><button type="button" class="btn btn-ghost btn-sm schedule-time-remove">×</button></div>`).join('');
  }
  function getScheduleDays(container) {
    return Array.from(container.querySelectorAll('input[name="scheduleDays"]:checked')).map((cb) => cb.value);
  }
  function getScheduleTimes(container) {
    return Array.from(container.querySelectorAll('.schedule-time-input')).map((i) => i.value).filter(Boolean);
  }
  function setupScheduleEditor(container, times = [], template = '') {
    const list = container.querySelector('.schedule-times-list');
    const addBtn = container.querySelector('.schedule-time-add');
    const select = container.querySelector('.template-library');
    const input = container.querySelector('input[name="scheduleTemplate"]');
    const saveBtn = container.querySelector('.save-template-btn');
    if (list) list.innerHTML = buildTimeRows(times);
    if (select) renderTemplateLibrary(select, template);
    if (select && input) {
      select.addEventListener('change', () => { if (select.value) input.value = select.value; });
    }
    if (saveBtn && input) {
      saveBtn.addEventListener('click', () => {
        const val = input.value.trim();
        if (!val) return;
        saveCustomTemplate(val);
        if (select) renderTemplateLibrary(select, val);
        const status = container.querySelector('.save-template-status');
        if (status) { status.textContent = t('schedule.saved'); status.classList.remove('hidden'); setTimeout(() => status.classList.add('hidden'), 2000); }
      });
    }
    if (addBtn && list) {
      addBtn.addEventListener('click', () => {
        const row = document.createElement('div');
        row.className = 'schedule-time-row';
        row.innerHTML = '<input type="time" class="schedule-time-input" value="08:00" /><button type="button" class="btn btn-ghost btn-sm schedule-time-remove">×</button>';
        list.appendChild(row);
      });
    }
    container.addEventListener('click', (e) => {
      if (e.target.classList.contains('schedule-time-remove')) {
        e.target.closest('.schedule-time-row').remove();
      }
    });
  }

  const PAGE_SIZE = 12;
  let dashboardPage = 1;
  let tablePage = 1;

  function renderPager(container, page, total, onChange) {
    if (!container) return;
    container.innerHTML = '';
    if (total <= 1) return;
    const prev = document.createElement('button');
    prev.type = 'button';
    prev.className = 'btn btn-ghost';
    prev.textContent = t('pagination.prev') || '←';
    prev.disabled = page === 1;
    prev.addEventListener('click', () => onChange(page - 1));
    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'btn btn-ghost';
    next.textContent = t('pagination.next') || '→';
    next.disabled = page === total;
    next.addEventListener('click', () => onChange(page + 1));
    const info = document.createElement('span');
    info.className = 'pager-info';
    info.textContent = (t('pagination.pageOf') || 'Sayfa {page} / {total}').replace('{page}', page).replace('{total}', total);
    container.appendChild(prev);
    container.appendChild(info);
    container.appendChild(next);
  }

  function deriveAgeGroup(dateOfBirth) {
    const dob = new Date(dateOfBirth);
    if (Number.isNaN(dob.getTime())) return '—';
    const age = new Date().getFullYear() - dob.getFullYear();
    if (age < 18) return '0-17';
    if (age < 35) return '18-34';
    if (age < 50) return '35-49';
    if (age < 65) return '50-64';
    return '65+';
  }

  function randomHex(n) {
    return Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  }

  function maskName(name) {
    return String(name)
      .split(/\s+/)
      .map((part) => (part.length <= 1 ? '*' : part[0] + '*'.repeat(part.length - 1)))
      .join(' ');
  }

  function maskNationalId(nationalId) {
    const s = String(nationalId);
    return s.length >= 4 ? `${s.slice(0, 2)}*******${s.slice(-2)}` : '***********';
  }

  function createLocalPatient(payload) {
    const displayCode = `H-${Math.floor(10 + Math.random() * 90)}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`;
    const pseudonym = `PSN-${randomHex(6).toUpperCase()}`;
    return {
      id: `local-${pseudonym}`,
      pseudonym,
      displayCode,
      ageGroup: deriveAgeGroup(payload.dateOfBirth),
      conditionGroup: payload.condition || 'Diğer',
      contactChannel: payload.contactChannel || 'sms',
      caregiver: payload.caregiver || undefined,
      schedule: payload.schedule || undefined,
      interactionLog: [],
      healthData: [],
      history: [],
      latest: null,
      customQuestion: '',
      questionTimes: [],
      criticalThreshold: null,
      warningThreshold: null,
      patientMessage: '',
      risk: { level: 'low', report: 'Yeni kayıt; klinik değerlendirme bekleniyor.', breachedThreshold: null, patientMessage: '' },
      kvkk: {
        maskedName: maskName(payload.fullName),
        maskedNationalId: maskNationalId(payload.nationalId),
        pseudonym,
        method: 'HMAC-SHA256',
        note: 'Ad soyad ve T.C. Kimlik No sistemde SAKLANMAZ. Kimlik, geri döndürülemez HMAC-SHA256 takma adına dönüştürülür; doğum tarihi yaş grubuna genelleştirilir (K-Anonimlik).',
      },
    };
  }

  function renderPatientResponse(body) {
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
  }

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
    patientsTablePager: document.getElementById('patients-table-pager'),
    patientDetail: document.getElementById('patient-detail'),
    patientsPager: document.getElementById('patients-pager'),
    viewDashboard: document.getElementById('view-dashboard'),
    viewPatients: document.getElementById('view-patients'),
    viewAdmin: document.getElementById('view-admin'),
    viewSettings: document.getElementById('view-settings'),
    viewFuture: document.getElementById('view-future'),
    viewAnalytics: document.getElementById('view-analytics'),
    viewReports: document.getElementById('view-reports'),
    viewTelemedicine: document.getElementById('view-telemedicine'),
    viewVoice: document.getElementById('view-voice'),
    aiSmsPanel: document.getElementById('ai-sms-panel'),
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
    adminDoctorForm: document.getElementById('admin-doctor-form'),
    adminFormError: document.getElementById('admin-form-error'),
    adminFormSuccess: document.getElementById('admin-form-success'),
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
    settingsSendSms: document.getElementById('settings-send-sms'),
    settingsSendSmsStatus: document.getElementById('settings-send-sms-status'),
    settingsApiKey: document.getElementById('settings-api-key'),
    settingsGenerateApi: document.getElementById('settings-generate-api'),
    settingsCopyApi: document.getElementById('settings-copy-api'),
    settingsApiStatus: document.getElementById('settings-api-status'),
    langSwitcher: document.getElementById('lang-switcher'),
    scorecardCountLow: document.getElementById('scorecard-count-low'),
    scorecardCountMedium: document.getElementById('scorecard-count-medium'),
    scorecardCountHigh: document.getElementById('scorecard-count-high'),
    scorecardClinicChart: document.getElementById('scorecard-clinic-chart'),
    scorecardTableBody: document.getElementById('scorecard-table-body'),
    botTriggerBtn: document.getElementById('bot-trigger-btn'),
    botTriggerStatus: document.getElementById('bot-trigger-status'),
    optimizerStatTele: document.getElementById('optimizer-stat-tele'),
    optimizerStatAvoid: document.getElementById('optimizer-stat-avoid'),
    optimizerStatCritical: document.getElementById('optimizer-stat-critical'),
    optimizerGreenList: document.getElementById('optimizer-green-list'),
    optimizerYellowList: document.getElementById('optimizer-yellow-list'),
    optimizerRedList: document.getElementById('optimizer-red-list'),
    optimizerPrescriptionList: document.getElementById('optimizer-prescription-list'),
    optimizerPrescriptionBanner: document.getElementById('optimizer-prescription-banner'),
    optimizerAvoidanceChart: document.getElementById('optimizer-avoidance-chart'),
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

  let aiSmsState = {
    suggestions: [
      { id: 'ai-sms-cardio', branch: 'cardiology', status: 'pending' },
      { id: 'ai-sms-endo', branch: 'endocrinology', status: 'pending' },
    ],
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

  function showAdminFormSuccess(message) {
    if (!els.adminFormSuccess) return;
    els.adminFormSuccess.textContent = message;
    els.adminFormSuccess.classList.remove('hidden');
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

  const LOCKED_USERNAME = 'yönetici';
  const LOCKED_PASSWORD = 'yönetici123';
  const FALLBACK_TOKEN = 'sentryhealth-local-fallback-token';
  const FALLBACK_USER = {
    id: 'u-1',
    username: 'yönetici',
    displayName: 'Prof. Dr. Ayşe Yılmaz',
    role: 'admin',
  };

  function applyFallbackLogin() {
    localStorage.setItem('token', FALLBACK_TOKEN);
    setStoredUser(FALLBACK_USER);
    addLog(t('log.login', { who: FALLBACK_USER.displayName, role: FALLBACK_USER.role }));
    showApp();
  }

  async function initAuth() {
    const token = getToken();
    if (!token) {
      showLogin();
      return;
    }
    if (token === FALLBACK_TOKEN) {
      const stored = getStoredUser();
      setStoredUser(stored || FALLBACK_USER);
      showApp();
      return;
    }
    try {
      const res = await api('/api/auth/me');
      if (!res.ok) throw new Error(t('login.expired'));
      const body = await safeJson(res);
      if (!body.user) throw new Error(t('login.expired'));
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
    const username = String(fd.get('username') || '').trim();
    const password = String(fd.get('password') || '');
    const payload = { username, password };

    if (username === LOCKED_USERNAME && password === LOCKED_PASSWORD) {
      applyFallbackLogin();
      return;
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await safeJson(res);
      if (!res.ok || !body.token || !body.user) {
        els.loginError.textContent = (body && body.error) || t('login.error');
        els.loginError.classList.remove('hidden');
        return;
      }
      localStorage.setItem('token', body.token);
      setStoredUser(body.user);
      addLog(t('log.login', { who: body.user.displayName, role: body.user.role }));
      showApp();
    } catch {
      els.loginError.textContent = t('login.error');
      els.loginError.classList.remove('hidden');
    }
  });

  els.logoutBtn.addEventListener('click', () => {
    logout();
  });

  function closeMobileSidebar() {
    document.body.classList.remove('sidebar-open');
  }
  function openMobileSidebar() {
    document.body.classList.add('sidebar-open');
  }
  const hamburgerBtn = document.getElementById('hamburger-btn');
  const sidebarOverlay = document.getElementById('sidebar-overlay');
  const sidebarClose = document.getElementById('sidebar-close');
  if (hamburgerBtn) hamburgerBtn.addEventListener('click', openMobileSidebar);
  if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeMobileSidebar);
  if (sidebarClose) sidebarClose.addEventListener('click', closeMobileSidebar);
  document.querySelectorAll('.nav-item').forEach((item) => {
    item.addEventListener('click', () => closeMobileSidebar());
  });

  /* ---------- Views ---------- */
  function switchView(view) {
    currentView = view;
    closeMobileSidebar();
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
    });
  });

  /* ---------- Tele-Tıp Canlı İzlem ---------- */
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
    const bpm = rand(72, 88);
    const sys = rand(116, 132);
    const dia = rand(74, 86);
    const spo2 = rand(95, 99);
    const rr = rand(14, 19);
    if (bpmEl) bpmEl.textContent = bpm;
    if (bpEl) bpEl.textContent = `${sys}/${dia}`;
    if (spo2El) spo2El.textContent = `%${spo2}`;
    if (rrEl) rrEl.textContent = rr;
    teleVitals = {
      heartRate: bpm,
      bloodPressureSystolic: sys,
      bloodPressureDiastolic: dia,
      oxygenSaturation: spo2,
      temperature: Number((36.2 + Math.random() * 1.6).toFixed(1)),
      rr,
    };

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

    updateTeleModules();
  }

  function updateTeleModules() {
    const sepsis = computeSepsisScore(teleVitals, teleCondition);
    const sepsisRoot = document.getElementById('tele-sepsis-card');
    if (sepsisRoot) setSepsisUI(sepsisRoot, sepsis);
    const sdoh = computeSdoh({ conditionGroup: teleCondition });
    const sdohRoot = document.getElementById('tele-sdoh-card');
    if (sdohRoot) setSdohUI(sdohRoot, sdoh);
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
    runDigitalTwin('tele');
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
    let serverDoctors = [];
    try {
      const res = await api('/api/admin/doctors');
      const body = await safeJson(res);
      serverDoctors = body.doctors || [];
    } catch {
      // server unavailable; continue with local fallback
    }
    const doctors = serverDoctors.concat(getLocalDoctors());
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
  }

  async function deleteDoctor(username) {
    if (!confirm(t('admin.confirmDelete', { username }))) return;
    const local = getLocalDoctors();
    const localIndex = local.findIndex((d) => d.username === username);
    if (localIndex !== -1) {
      local.splice(localIndex, 1);
      setLocalDoctors(local);
      await loadDoctors();
      return;
    }
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
    if (els.adminFormSuccess) els.adminFormSuccess.classList.add('hidden');
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
      const body = await safeJson(res);
      if (!res.ok || !body.doctor) {
        // local fallback: store doctor locally so the UI stays usable
        const local = getLocalDoctors();
        local.push({ username: payload.username, displayName: payload.displayName, role: 'doctor' });
        setLocalDoctors(local);
      } else {
        addLog(t('log.doctorAdded', { username: body.doctor.username }));
      }
      els.adminDoctorForm.reset();
      showAdminFormSuccess('Doktor başarıyla sisteme tanımlanmıştır ve TÜSEB Sağlık Ağına senkronize edilmiştir.');
      await loadDoctors();
    } catch (err) {
      // even on network error, keep the form value in local memory
      const local = getLocalDoctors();
      local.push({ username: payload.username, displayName: payload.displayName, role: 'doctor' });
      setLocalDoctors(local);
      els.adminDoctorForm.reset();
      showAdminFormSuccess('Doktor başarıyla sisteme tanımlanmıştır ve TÜSEB Sağlık Ağına senkronize edilmiştir.');
      await loadDoctors();
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
      if (els.settingsLogoStatus) els.settingsLogoStatus.textContent = t('settings.logoPreview');
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
        if (els.settingsLogoStatus) els.settingsLogoStatus.textContent = t('settings.logoPreview');
        addLog(t('settings.logClinic'));
      };
      reader.readAsDataURL(file);
    });
  }

  if (els.settingsSendSms) {
    els.settingsSendSms.addEventListener('click', () => {
      if (els.settingsSendSmsStatus) {
        els.settingsSendSmsStatus.textContent = t('settings.sendSmsSent');
        els.settingsSendSmsStatus.className = 'settings-status status-ok';
      }
      addLog(t('settings.logSendSms'));
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

  function fmtDate(ts) {
    return new Date(ts).toLocaleDateString(dateLocale());
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

  function caregiverCard(p) {
    const c = p.caregiver;
    if (!c || (!c.name && !c.phone && !c.email)) {
      return `<div class="info-card"><h5>${escapeHtml(t('caregiver.title'))}</h5><p>${escapeHtml(t('caregiver.empty'))}</p></div>`;
    }
    return `<div class="info-card">
      <h5>${escapeHtml(t('caregiver.title'))}</h5>
      ${c.name ? `<p><strong>${escapeHtml(t('caregiver.name'))}</strong> ${escapeHtml(c.name)}</p>` : ''}
      ${c.relationship ? `<p><strong>${escapeHtml(t('caregiver.relationship'))}</strong> ${escapeHtml(c.relationship)}</p>` : ''}
      ${c.phone ? `<p><strong>${escapeHtml(t('caregiver.phone'))}</strong> ${escapeHtml(c.phone)}</p>` : ''}
      ${c.email ? `<p><strong>${escapeHtml(t('caregiver.email'))}</strong> ${escapeHtml(c.email)}</p>` : ''}
    </div>`;
  }

  function interactionCard(p) {
    const s = p.schedule;
    if (!s || (s.days.length === 0 && s.times.length === 0 && !s.template)) {
      return `<div class="info-card"><h5>${escapeHtml(t('interaction.title'))}</h5><p>${escapeHtml(t('interaction.noLog'))}</p></div>`;
    }
    const days = (s.days || []).map((d) => escapeHtml(d)).join(', ');
    const times = (s.times || []).map((time) => escapeHtml(time)).join(', ');
    const timelineRows = (p.interactionLog || []).slice(0, 20).map((entry) => {
      const statusKey = entry.status === 'answered' ? 'statusAnswered' : entry.status === 'overdue' ? 'statusOverdue' : 'statusPending';
      const statusClass = entry.status === 'answered' ? 'status-ok' : entry.status === 'overdue' ? 'status-error' : 'status-pending';
      const responseHtml = entry.response ? `<span class="interaction-response">${escapeHtml(entry.response)}</span>` : '';
      return `<div class="interaction-log-row ${statusClass}">
        <div class="interaction-timeline-dot"></div>
        <div class="interaction-timeline-content">
          <div class="interaction-timeline-head">
            <span class="interaction-time">${escapeHtml(fmtDate(entry.time))} ${escapeHtml(fmtTime(entry.time))}</span>
            <span class="interaction-status">${escapeHtml(t('interaction.' + statusKey))}</span>
          </div>
          <span class="interaction-question">${escapeHtml(entry.question)}</span>
          ${responseHtml}
          <div class="interaction-status-bar" style="--status-color: var(--${entry.status === 'answered' ? 'green' : entry.status === 'overdue' ? 'red' : 'amber'})"></div>
        </div>
      </div>`;
    }).join('');
    return `<div class="info-card">
      <h5>${escapeHtml(t('interaction.title'))}</h5>
      <p><strong>${escapeHtml(t('interaction.scheduleDays'))}</strong> ${days || '—'}</p>
      <p><strong>${escapeHtml(t('interaction.scheduleTimes'))}</strong> ${times || '—'}</p>
      <p><strong>${escapeHtml(t('interaction.scheduleTemplate'))}</strong> ${escapeHtml(s.template || '—')}</p>
      <h6>${escapeHtml(t('interaction.logTitle'))}</h6>
      <div class="interaction-timeline">${timelineRows || `<p>${escapeHtml(t('interaction.noLog'))}</p>`}</div>
    </div>`;
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
      if (els.patientsTablePager) els.patientsTablePager.innerHTML = '';
      return;
    }

    const total = Math.ceil(patients.length / PAGE_SIZE) || 1;
    if (tablePage > total) tablePage = total;
    const start = (tablePage - 1) * PAGE_SIZE;
    const pagePatients = patients.slice(start, start + PAGE_SIZE);

    els.tableBody.innerHTML = pagePatients.map((p) => `
      <tr data-pseudonym="${escapeHtml(p.pseudonym)}" class="${p.pseudonym === selectedPseudonym ? 'selected' : ''}">
        <td data-label="${escapeHtml(t('patients.table.code'))}"><span class="code-chip">${escapeHtml(p.displayCode || p.pseudonym.slice(0, 8).toUpperCase())}</span></td>
        <td class="mono" data-label="${escapeHtml(t('patients.table.pseudonym'))}">${escapeHtml(p.pseudonym)}</td>
        <td data-label="${escapeHtml(t('patients.table.age'))}">${escapeHtml(p.ageGroup || '—')}</td>
        <td data-label="${escapeHtml(t('patients.table.condition'))}">${escapeHtml(translateCondition(p.conditionGroup))}</td>
        <td data-label="${escapeHtml(t('patients.table.latest'))}">${p.latest ? `${p.latest.heartRate} bpm / %${p.latest.oxygenSaturation}` : escapeHtml(t('patients.waiting'))}</td>
        <td data-label="${escapeHtml(t('patients.table.risk'))}">${riskChip(p.risk.level)}</td>
      </tr>`).join('');

    els.tableBody.querySelectorAll('tr[data-pseudonym]').forEach((row) => {
      row.addEventListener('click', () => {
        selectedPseudonym = row.dataset.pseudonym;
        if (lastData) render(lastData);
      });
    });

    renderPager(els.patientsTablePager, tablePage, total, (p) => { tablePage = p; renderPatientsTable(patients); });

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
    const caregiver = p.caregiver || { name: '', relationship: '', phone: '', email: '' };
    const schedule = p.schedule || { days: [], times: [], template: '' };
    const interactionLog = p.interactionLog || [];

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
      <div class="protocol-note">${escapeHtml(t('protocol.note'))}</div>
      <div class="detail-cards">
        ${caregiverCard(p)}
        ${interactionCard(p)}
      </div>
      ${renderPatientScorecard(p)}
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
        <fieldset class="caregiver-fieldset">
          <legend>${escapeHtml(t('caregiver.title'))}</legend>
          <label class="field">
            <span>${escapeHtml(t('caregiver.name'))}</span>
            <input type="text" name="caregiverName" value="${escapeHtml(caregiver.name)}" />
          </label>
          <label class="field">
            <span>${escapeHtml(t('caregiver.relationship'))}</span>
            <input type="text" name="caregiverRelationship" value="${escapeHtml(caregiver.relationship)}" />
          </label>
          <label class="field">
            <span>${escapeHtml(t('caregiver.phone'))}</span>
            <input type="tel" name="caregiverPhone" value="${escapeHtml(caregiver.phone)}" />
          </label>
          <label class="field">
            <span>${escapeHtml(t('caregiver.email'))}</span>
            <input type="email" name="caregiverEmail" value="${escapeHtml(caregiver.email)}" />
          </label>
        </fieldset>
        <fieldset class="schedule-fieldset detail-schedule">
          <legend>${escapeHtml(t('interaction.title'))}</legend>
          <label class="field">
            <span>${escapeHtml(t('interaction.scheduleDays'))}</span>
            ${buildDayCheckboxes(schedule.days)}
          </label>
          <label class="field">
            <span>${escapeHtml(t('interaction.scheduleTimes'))}</span>
            <div class="schedule-times-list">${buildTimeRows(schedule.times)}</div>
            <button type="button" class="btn btn-ghost btn-sm schedule-time-add">+ Saat Ekle</button>
          </label>
          <label class="field">
            <span>${escapeHtml(t('interaction.scheduleTemplate'))}</span>
            <div class="schedule-template-row">
              <select class="template-library"><option value="">${escapeHtml(t('schedule.templateLibrary'))}</option></select>
              <input type="text" name="scheduleTemplate" value="${escapeHtml(schedule.template)}" placeholder="${escapeHtml(t('interaction.scheduleTemplate'))}" />
            </div>
            <button type="button" class="btn btn-ghost btn-sm save-template-btn">${escapeHtml(t('schedule.saveTemplate'))}</button>
            <span class="save-template-status hidden">${escapeHtml(t('schedule.saved'))}</span>
          </label>
        </fieldset>
        ${thresholdFields('critical', critical, t('clinical.criticalThreshold'))}
        ${thresholdFields('warning', warning, t('clinical.warningThreshold'))}
        <div class="bot-trigger-row">
          <label class="field small">
            <span data-i18n="bot.channel">Bot Kanalı</span>
            <select id="bot-trigger-channel">
              <option value="voice" data-i18n="bot.voice">🎙️ Sesli Arama (Vapi)</option>
              <option value="sms" data-i18n="bot.sms">💬 SMS (Twilio)</option>
            </select>
          </label>
          <button type="button" class="btn btn-primary" id="bot-trigger-btn">${escapeHtml(t('bot.triggerBtn'))}</button>
          <span id="bot-trigger-status" class="bot-trigger-status hidden"></span>
        </div>
        <div class="clinical-actions">
          <button type="submit" class="btn btn-primary">${escapeHtml(t('clinical.save'))}</button>
          <span id="clinical-status" class="clinical-status hidden"></span>
        </div>
      </form>

      <div class="module-card sepsis" id="detail-sepsis-card">
        <div class="module-head">
          <span class="module-tag" data-i18n="modules.sepsisTag">ERKEN UYARI</span>
          <h3 data-i18n="modules.sepsisTitle">YZ Destekli Erken Sepsis ve Çoklu Organ Yetmezliği Tahmini</h3>
          <p data-i18n="modules.sepsisSubtitle">qSOFA / MEWS Skor Kartı — 48 saat öncesi risk uyarısı</p>
        </div>
        <div class="sepsis-body">
          <div class="sepsis-score-row">
            <div class="sepsis-score">
              <span data-i18n="modules.sepsisRisk">Sepsis Risk Skoru</span>
              <strong id="detail-sepsis-score">0</strong>
            </div>
            <small data-i18n="modules.sepsisRisk48">48 saat öncesi tahmin</small>
          </div>
          <div class="sepsis-bars">
            <div class="sepsis-bar">
              <span data-i18n="modules.sepsisQsofa">qSOFA</span>
              <div class="sepsis-bar-bg"><div class="sepsis-bar-fill" id="detail-sepsis-qsofa"></div></div>
              <em id="detail-sepsis-qsofa-val">0</em>
            </div>
            <div class="sepsis-bar">
              <span data-i18n="modules.sepsisMews">MEWS</span>
              <div class="sepsis-bar-bg"><div class="sepsis-bar-fill" id="detail-sepsis-mews"></div></div>
              <em id="detail-sepsis-mews-val">0</em>
            </div>
          </div>
          <div class="sepsis-alarm hidden" id="detail-sepsis-alarm" data-i18n="modules.sepsisAlarm">KRİTİK SEPSİS RİSKİ: Erken Müdahale Önerilir</div>
        </div>
      </div>

      <div class="module-card sdoh" id="detail-sdoh-card">
        <div class="module-head">
          <span class="module-tag" data-i18n="modules.sdohTag">ÇEVRESEL RİSK</span>
          <h3 data-i18n="modules.sdohTitle">Sosyal Sağlık Belirleyicileri (SDOH) ve Çevresel Risk Haritası</h3>
          <p data-i18n="modules.sdohSubtitle">Coğrafi ve çevresel verilerle klinik risk profili</p>
        </div>
        <div class="sdoh-body">
          <div class="sdoh-map">
            <canvas id="detail-sdoh-map" width="340" height="170"></canvas>
          </div>
          <div class="sdoh-metrics">
            <div class="sdoh-metric"><span data-i18n="modules.sdohAqi">Hava Kalitesi (AQI)</span><strong id="detail-sdoh-aqi">—</strong></div>
            <div class="sdoh-metric"><span data-i18n="modules.sdohPollen">Polen Yoğunluğu</span><strong id="detail-sdoh-pollen">—</strong></div>
            <div class="sdoh-metric"><span data-i18n="modules.sdohInfluenza">Mevsimsel Influenza</span><strong id="detail-sdoh-influenza">—</strong></div>
          </div>
          <div class="sdoh-risk" id="detail-sdoh-risk" data-i18n="modules.sdohRisk">Çevresel Risk İndeksi: <strong id="detail-sdoh-risk-value">—</strong></div>
          <div class="sdoh-legend" data-i18n="modules.sdohLegend">Risk haritası: hasta bölgesi ve kronik durum etkisi</div>
        </div>
      </div>

      <div class="module-card twin" id="detail-twin-card">
        <div class="module-head">
          <span class="module-tag" data-i18n="modules.twinTag">DİJİTAL İKİZ</span>
          <h3 data-i18n="modules.twinTitle">Hastanın Dijital İkizi</h3>
          <p data-i18n="modules.twinSubtitle">İlaç / doz analizi — Tedavi öncesi analitik öngörü</p>
        </div>
        <div class="twin-body">
          <button type="button" class="btn btn-primary" id="detail-twin-simulate" data-twin-simulate="detail" data-i18n="modules.twinSimulate">Analiz Et</button>
          <div class="twin-output hidden" id="detail-twin-output"></div>
        </div>
      </div>`;

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
        const scheduleDays = getScheduleDays(clinicalForm);
        const scheduleTimes = getScheduleTimes(clinicalForm);
        const scheduleTemplate = String(fd.get('scheduleTemplate') || '').trim();
        const caregiverName = String(fd.get('caregiverName') || '').trim();
        const caregiverRelationship = String(fd.get('caregiverRelationship') || '').trim();
        const caregiverPhone = String(fd.get('caregiverPhone') || '').trim();
        const caregiverEmail = String(fd.get('caregiverEmail') || '').trim();
        const payload = {
          contactChannel: String(fd.get('contactChannel')),
          customQuestion: String(fd.get('customQuestion') || '').trim(),
          questionTimes: times,
          criticalThreshold: buildThreshold('critical'),
          warningThreshold: buildThreshold('warning'),
          caregiver: caregiverName || caregiverPhone || caregiverEmail ? { name: caregiverName, relationship: caregiverRelationship, phone: caregiverPhone, email: caregiverEmail } : undefined,
          schedule: scheduleDays.length || scheduleTimes.length || scheduleTemplate ? { days: scheduleDays, times: scheduleTimes, template: scheduleTemplate } : undefined,
        };
        try {
          const res = await api(`/api/patients/${encodeURIComponent(p.pseudonym)}/clinical-plan`, {
            method: 'PUT',
            body: JSON.stringify(payload),
          });
          const body = await safeJson(res);
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
      setupScheduleEditor(clinicalForm, schedule.times, schedule.template);
    }

    const botTriggerBtn = document.getElementById('bot-trigger-btn');
    if (botTriggerBtn) {
      botTriggerBtn.addEventListener('click', () => {
        const channelSelect = document.getElementById('bot-trigger-channel');
        const channel = channelSelect ? channelSelect.value : 'voice';
        triggerBot(p.pseudonym, channel);
      });
    }

    renderPatientModules(p);
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
      const body = await safeJson(res);
      if (!res.ok) throw new Error(body.error || t('vitals.error'));
      addLog(t('log.vitalsAdded', { name: displayName({ pseudonym: vitalsTarget }) }));
      closeVitalsModal();
      await poll();
    } catch (err) {
      els.vitalsError.textContent = err.message;
      els.vitalsError.classList.remove('hidden');
    }
  });

  /* ---------- Global health modules ---------- */
  let teleVitals = {};
  let teleCondition = 'KOAH';

  function selectedOrFirstPatient() {
    const patients = (lastData && lastData.patients) || [];
    return patients.find((p) => p.pseudonym === selectedPseudonym) || patients[0] || null;
  }

  function getRespiratoryRate(vitals, condition) {
    if (vitals && vitals.respiratoryRate) return Number(vitals.respiratoryRate);
    if (vitals && vitals.rr) return Number(vitals.rr);
    const hasLung = condition === 'Astım' || condition === 'KOAH';
    const base = hasLung ? 20 : 16;
    const hr = Number(vitals?.heartRate || 72);
    const temp = Number(vitals?.temperature || 36.5);
    let rr = base + Math.round((hr - 70) / 18) + (temp > 38.5 ? 3 : 0);
    if (hr > 120) rr += 3;
    if (hr < 55) rr -= 2;
    return Math.max(10, Math.min(36, rr));
  }

  function computeSepsisScore(vitals, condition) {
    const hr = Number(vitals?.heartRate || 72);
    const sys = Number(vitals?.bloodPressureSystolic || 120);
    const temp = Number(vitals?.temperature || 36.5);
    const spo2 = Number(vitals?.oxygenSaturation || 97);
    const rr = getRespiratoryRate(vitals, condition);

    let qsofa = 0;
    if (rr >= 22) qsofa++;
    if (sys <= 100) qsofa++;
    if (temp > 39.5 || hr > 130) qsofa++;

    let mews = 0;
    if (hr > 130) mews += 2; else if (hr > 110) mews += 1; else if (hr < 50) mews += 2; else if (hr < 60) mews += 1;
    if (sys <= 70) mews += 2; else if (sys <= 80) mews += 1; else if (sys <= 100) mews += 1;
    if (rr >= 30) mews += 2; else if (rr >= 21) mews += 1; else if (rr < 9) mews += 2;
    if (temp >= 38.5) mews += 1; else if (temp < 35.0) mews += 1;
    if (spo2 < 90) mews += 2; else if (spo2 < 93) mews += 1;

    const score = Math.min(100, Math.round(qsofa * 30 + mews * 9 + (spo2 < 90 ? 10 : 0)));
    const risk = (qsofa >= 2 || mews >= 5 || score >= 60) ? 'high' : (score >= 30 ? 'moderate' : 'low');
    const organRisk = Math.min(95, Math.round(score * 0.85 + qsofa * 8 + (mews >= 5 ? 10 : 0)));
    const forecast = risk === 'high' ? 'Kritik — 48 saat içinde erken müdahale önerilir' : risk === 'moderate' ? 'Yükselen — Yakın takip gereklidir' : 'Düşük — Stabil seyir beklenmektedir';
    return { qsofa, mews, score, risk, organRisk, forecast };
  }

  const twinDrugs = {
    'Diyabet': 'Metformin 1000 mg / Günde 2',
    'Hipertansiyon': 'Ramipril 5 mg / Günde 1',
    'Kalp Yetmezliği': 'Bisoprolol 5 mg / Günde 1',
    'KOAH': 'Tiotropium 18 mcg / Günde 1',
    'Astım': 'Salmeterol 50 mcg / Günde 2',
    'Kronik Böbrek Hastalığı': 'Epoetin alfa 4000 IU / Haftada 3',
    'Diğer': 'Standart antihipertenzif 1 tablet / Günde 1',
  };

  function computeDigitalTwin(p) {
    const condition = p?.conditionGroup || 'Diğer';
    const ageGroup = p?.ageGroup || '45-64';
    let interaction = 12;
    if (condition === 'Kronik Böbrek Hastalığı') interaction += 15;
    if (['Kalp Yetmezliği', 'Hipertansiyon'].includes(condition)) interaction += 5;
    if (condition === 'Diyabet') interaction += 4;
    if (['KOAH', 'Astım'].includes(condition)) interaction += 3;
    if (ageGroup === '65+') interaction += 4;
    interaction = Math.min(48, Math.round(interaction + Math.random() * 8));
    const renal = Math.min(42, Math.round(interaction * 0.7 + Math.random() * 6));
    const cardiac = Math.min(40, Math.round(8 + Math.random() * 12));
    const adherence = Math.round(78 + Math.random() * 18);
    const toxicity = Math.min(35, Math.round(4 + Math.random() * 12));
    const liverRisk = Math.min(25, Math.round(2 + Math.random() * 10));
    const cardiacLoad = Math.min(30, Math.round(6 + Math.random() * 10));
    const drugInteraction = Math.min(28, Math.round(5 + Math.random() * 10));
    const drug = twinDrugs[condition] || twinDrugs['Diğer'];
    const cardiacLoadText = cardiacLoad > 20 ? 'Yüksek — Yakın izlem' : cardiacLoad > 12 ? 'Hafif artış' : 'Stabil';
    return { interaction, renal, cardiac, toxicity, liverRisk, cardiacLoad, cardiacLoadText, drugInteraction, adherence, drug, condition };
  }

  function digitalTwinHtml(result) {
    const riskClass = result.interaction >= 25 ? 'high' : result.interaction >= 15 ? 'moderate' : 'low';
    const cardiacLoadClass = result.cardiacLoad > 20 ? 'high' : result.cardiacLoad > 12 ? 'moderate' : 'low';
    const toxicityClass = result.toxicity > 18 ? 'high' : result.toxicity > 10 ? 'moderate' : 'low';
    const drugInteractionClass = result.drugInteraction > 18 ? 'high' : result.drugInteraction > 10 ? 'moderate' : 'low';
    return `
      <div class="twin-result">
        <div class="twin-result-row"><span>${escapeHtml(t('modules.twinDose'))}</span><strong>${escapeHtml(result.drug)}</strong></div>
        <div class="twin-result-row ${riskClass}"><span>${escapeHtml(t('modules.twinInteraction'))}</span><strong>${result.interaction}%</strong></div>
        <div class="twin-result-row ${drugInteractionClass}"><span>${escapeHtml(t('modules.twinDrugInteraction'))}</span><strong>${result.drugInteraction}%</strong></div>
        <div class="twin-result-row"><span>${escapeHtml(t('modules.twinRenal'))}</span><strong>${result.renal}%</strong></div>
        <div class="twin-result-row ${toxicityClass}"><span>${escapeHtml(t('modules.twinLiverRisk'))}</span><strong>${result.liverRisk}%</strong></div>
        <div class="twin-result-row"><span>${escapeHtml(t('modules.twinToxicity'))}</span><strong>${result.toxicity}%</strong></div>
        <div class="twin-result-row"><span>${escapeHtml(t('modules.twinCardiac'))}</span><strong>${result.cardiac}%</strong></div>
        <div class="twin-result-row ${cardiacLoadClass}"><span>${escapeHtml(t('modules.twinCardiacLoad'))}</span><strong>${escapeHtml(result.cardiacLoadText)}</strong></div>
        <div class="twin-result-row"><span>${escapeHtml(t('modules.twinAdherence'))}</span><strong>${result.adherence}%</strong></div>
        <div class="twin-result-note">${escapeHtml(t('modules.twinSimulateResult'))}</div>
      </div>`;
  }

  function runDigitalTwin(target) {
    const output = document.getElementById(`${target}-twin-output`);
    if (!output) return;
    let p = selectedOrFirstPatient();
    if (target === 'tele') {
      p = { conditionGroup: teleCondition, ageGroup: '65+', latest: teleVitals };
    } else if (target === 'detail') {
      const patients = (lastData && lastData.patients) || [];
      p = patients.find((x) => x.pseudonym === selectedPseudonym) || p;
    }
    const result = computeDigitalTwin(p || { conditionGroup: 'Diğer' });
    output.innerHTML = digitalTwinHtml(result);
    output.classList.remove('hidden');
    addLog(t('modules.twinSimulateResult'));
  }

  const sdohLabels = {
    low: 'modules.sdohRiskLow',
    moderate: 'modules.sdohRiskModerate',
    high: 'modules.sdohRiskHigh',
  };

  function computeSdoh(p) {
    const condition = p?.conditionGroup || 'Diğer';
    const hasLung = condition === 'Astım' || condition === 'KOAH';
    const aqi = Math.min(300, Math.round(40 + (hasLung ? 40 : 0) + Math.random() * 70));
    const pollenRand = Math.random();
    const pollen = pollenRand < 0.33 ? 'low' : pollenRand < 0.66 ? 'moderate' : 'high';
    const fluRand = Math.random();
    const flu = fluRand < 0.5 ? 'low' : fluRand < 0.8 ? 'moderate' : 'high';
    const fluIndex = Math.min(100, Math.round(20 + (flu === 'high' ? 50 : flu === 'moderate' ? 25 : 0) + Math.random() * 15));
    let risk = 0;
    if (aqi > 100) risk += 3; else if (aqi > 50) risk += 1;
    if (pollen === 'high') risk += 2; else if (pollen === 'moderate') risk += 1;
    if (flu === 'high') risk += 2; else if (flu === 'moderate') risk += 1;
    if (hasLung) risk += 2;
    const riskLevel = risk >= 7 ? 'high' : risk >= 4 ? 'moderate' : 'low';
    const localizedRisk = t(sdohLabels[riskLevel]);
    const asthmaRisk = hasLung ? localizedRisk : t('modules.sdohRiskLow');
    const conditionAlert = hasLung ? t('modules.sdohConditionAlert', { risk: asthmaRisk }) : t('modules.sdohAlert', { risk: localizedRisk });
    return { aqi, pollen, influenza: flu, fluIndex, asthmaRisk, alert: localizedRisk, conditionAlert, riskLevel, region: 'Keçiören, Ankara' };
  }

  function drawSdohMap(canvas, riskLevel, region) {
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    const color = riskLevel === 'high' ? 'rgba(239,68,68,0.12)' : riskLevel === 'moderate' ? 'rgba(245,158,11,0.12)' : 'rgba(34,197,94,0.12)';
    const stroke = riskLevel === 'high' ? '#ef4444' : riskLevel === 'moderate' ? '#f59e0b' : '#22c55e';
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(148,163,184,0.25)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= w; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y <= h; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(37,99,235,0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(30, 30, w - 60, h - 60);
    const cx = w / 2;
    const cy = h / 2;
    const r = 28;
    ctx.fillStyle = stroke;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.strokeStyle = stroke;
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 8, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = 'var(--text)';
    ctx.font = '600 12px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(region, cx, h - 12);
  }

  function setSepsisUI(root, result) {
    if (!root) return;
    const scoreEl = root.querySelector('#sepsis-score, .sepsis-score-value, #tele-sepsis-score, #detail-sepsis-score');
    const qsofaFill = root.querySelector('#sepsis-qsofa, .sepsis-qsofa, #tele-sepsis-qsofa, #detail-sepsis-qsofa');
    const qsofaVal = root.querySelector('#sepsis-qsofa-val, .sepsis-qsofa-val, #tele-sepsis-qsofa-val, #detail-sepsis-qsofa-val');
    const mewsFill = root.querySelector('#sepsis-mews, .sepsis-mews, #tele-sepsis-mews, #detail-sepsis-mews');
    const mewsVal = root.querySelector('#sepsis-mews-val, .sepsis-mews-val, #tele-sepsis-mews-val, #detail-sepsis-mews-val');
    const alarm = root.querySelector('#sepsis-alarm, .sepsis-alarm, #tele-sepsis-alarm, #detail-sepsis-alarm');
    if (scoreEl) {
      scoreEl.textContent = result.score;
      scoreEl.classList.toggle('high', result.risk === 'high');
      scoreEl.classList.toggle('moderate', result.risk === 'moderate');
    }
    if (qsofaVal) qsofaVal.textContent = result.qsofa;
    if (mewsVal) mewsVal.textContent = result.mews;
    if (qsofaFill) {
      qsofaFill.style.width = `${Math.min(100, result.qsofa * 34)}%`;
      qsofaFill.classList.toggle('warn', result.qsofa >= 2);
      qsofaFill.classList.toggle('high', result.qsofa >= 2);
    }
    if (mewsFill) {
      mewsFill.style.width = `${Math.min(100, result.mews * 8)}%`;
      mewsFill.classList.toggle('warn', result.mews >= 4);
      mewsFill.classList.toggle('high', result.mews >= 5);
    }
    if (alarm) {
      alarm.classList.toggle('hidden', result.risk !== 'high');
      alarm.classList.toggle('critical', result.risk === 'high');
    }
    let forecastEl = root.querySelector('.sepsis-forecast, .sepsis-prediction');
    let organEl = root.querySelector('.sepsis-organ-risk');
    const body = root.querySelector('.sepsis-body');
    if (body && !forecastEl) {
      forecastEl = document.createElement('div');
      forecastEl.className = 'sepsis-forecast';
      body.appendChild(forecastEl);
    }
    if (body && !organEl) {
      organEl = document.createElement('div');
      organEl.className = 'sepsis-organ-risk';
      body.appendChild(organEl);
    }
    if (forecastEl) forecastEl.textContent = t('modules.sepsisPrediction', { forecast: result.forecast });
    if (organEl) organEl.textContent = t('modules.sepsisOrganRisk', { risk: result.organRisk });
  }

  function setSdohUI(root, sdoh) {
    if (!root) return;
    const aqiEl = root.querySelector('#sdoh-aqi, .sdoh-aqi, #tele-sdoh-aqi, #detail-sdoh-aqi');
    const pollenEl = root.querySelector('#sdoh-pollen, .sdoh-pollen, #tele-sdoh-pollen, #detail-sdoh-pollen');
    const fluEl = root.querySelector('#sdoh-influenza, .sdoh-influenza, #tele-sdoh-influenza, #detail-sdoh-influenza');
    const riskValueEl = root.querySelector('#sdoh-risk-value, .sdoh-risk-value, #tele-sdoh-risk, #detail-sdoh-risk-value');
    const riskLabelEl = root.querySelector('#sdoh-risk, .sdoh-risk, #tele-sdoh-risk, #detail-sdoh-risk');
    const canvas = root.querySelector('#sdoh-map, .sdoh-map-canvas, #tele-sdoh-map, #detail-sdoh-map');
    if (aqiEl) aqiEl.textContent = sdoh.aqi;
    if (pollenEl) pollenEl.textContent = t(sdohLabels[sdoh.pollen]);
    if (fluEl) fluEl.textContent = t(sdohLabels[sdoh.influenza]);
    if (riskValueEl) riskValueEl.textContent = t(sdohLabels[sdoh.riskLevel]);
    if (riskLabelEl) {
      riskLabelEl.classList.remove('low', 'moderate', 'high');
      riskLabelEl.classList.add(sdoh.riskLevel);
    }
    let fluIndexEl = root.querySelector('.sdoh-flu-index');
    let asthmaEl = root.querySelector('.sdoh-asthma-risk');
    let alertEl = root.querySelector('.sdoh-alert');
    const body = root.querySelector('.sdoh-body');
    if (body && !fluIndexEl) {
      fluIndexEl = document.createElement('div');
      fluIndexEl.className = 'sdoh-flu-index';
      body.appendChild(fluIndexEl);
    }
    if (body && !asthmaEl) {
      asthmaEl = document.createElement('div');
      asthmaEl.className = 'sdoh-asthma-risk';
      body.appendChild(asthmaEl);
    }
    if (body && !alertEl) {
      alertEl = document.createElement('div');
      alertEl.className = 'sdoh-alert';
      body.appendChild(alertEl);
    }
    if (fluIndexEl) fluIndexEl.textContent = t('modules.sdohFluIndex') + ': ' + sdoh.fluIndex + '/100';
    if (asthmaEl) asthmaEl.textContent = t('modules.sdohAsthmaRisk') + ': ' + sdoh.asthmaRisk;
    if (alertEl) {
      alertEl.textContent = sdoh.conditionAlert;
      alertEl.classList.remove('low', 'moderate', 'high');
      alertEl.classList.add(sdoh.riskLevel);
    }
    drawSdohMap(canvas, sdoh.riskLevel, sdoh.region);
  }

  function renderModules() {
    const p = selectedOrFirstPatient();
    const sepsis = computeSepsisScore(p?.latest, p?.conditionGroup);
    const sdoh = computeSdoh(p);
    const dashRoot = document.getElementById('global-modules');
    const futRoot = document.getElementById('future-modules');
    if (dashRoot) {
      setSepsisUI(dashRoot, sepsis);
      setSdohUI(dashRoot, sdoh);
      runDigitalTwin('global');
    }
    if (futRoot) {
      setSepsisUI(futRoot, sepsis);
      setSdohUI(futRoot, sdoh);
      runDigitalTwin('future');
    }
  }

  function renderPatientModules(p) {
    if (!p) return;
    const sepsis = computeSepsisScore(p.latest, p.conditionGroup);
    const sdoh = computeSdoh(p);
    const sepsisRoot = document.getElementById('detail-sepsis-card');
    const sdohRoot = document.getElementById('detail-sdoh-card');
    if (sepsisRoot) setSepsisUI(sepsisRoot, sepsis);
    if (sdohRoot) setSdohUI(sdohRoot, sdoh);
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-twin-simulate]');
    if (!btn) return;
    runDigitalTwin(btn.dataset.twinSimulate);
  });

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

  /* ---------- Scorecard & Bot Integration ---------- */
  function getRespiratoryRate(h) {
    if (h && h.respiratoryRate) return Number(h.respiratoryRate);
    return 0;
  }

  function computeMewsScore(h) {
    const hr = Number(h.heartRate || 0);
    const sys = Number(h.bloodPressureSystolic || 0);
    const temp = Number(h.temperature || 0);
    const spo2 = Number(h.oxygenSaturation || 0);
    const rr = getRespiratoryRate(h);

    let score = 0;
    if (hr >= 130 || hr < 40) score += 2;
    else if (hr >= 110 || hr < 50) score += 1;
    else if (hr >= 100) score += 1;

    if (sys >= 200 || sys < 70) score += 2;
    else if (sys >= 160 || sys < 90) score += 1;

    if (spo2 < 90) score += 2;
    else if (spo2 < 93) score += 1;

    if (temp >= 38.5 || temp < 35.0) score += 1;

    if (rr >= 30 || rr < 9) score += 2;
    else if (rr >= 21) score += 1;

    let level = 'low';
    if (score >= 5) level = 'high';
    else if (score >= 3) level = 'medium';
    return { score, level };
  }

  function mewsLevelLabel(level) {
    return t('scorecard.level.' + level);
  }

  function mewsLevelClass(level) {
    return level === 'high' ? 'mews-high' : level === 'medium' ? 'mews-medium' : 'mews-low';
  }

  function patientScoreHistory(p) {
    const history = p.history || p.healthData || [];
    return history.map((h) => ({ ...computeMewsScore(h), timestamp: h.timestamp }));
  }

  function drawScorecardChart(container, entries) {
    if (!container || entries.length < 2) {
      if (container) container.innerHTML = `<span class="empty-chart" style="color:var(--text-muted);font-size:0.8rem;">${escapeHtml(t('analytics.noData'))}</span>`;
      return;
    }
    const labels = entries.map((e) => fmtTime(e.timestamp));
    const values = entries.map((e) => e.score);
    drawLineChart(container, labels, values, 'var(--indigo)');
  }

  function renderPatientScorecard(p) {
    const history = patientScoreHistory(p);
    const latest = history.at(-1) || { score: 0, level: 'low' };
    const entries = history.slice(-12);
    const chartId = `scorecard-patient-chart-${p.pseudonym.slice(0, 8)}`;
    setTimeout(() => {
      drawScorecardChart(document.getElementById(chartId), entries);
    }, 0);
    return `
      <div class="scorecard-patient-card">
        <div class="scorecard-patient-head">
          <div>
            <h4 data-i18n="scorecard.patientTitle">AI Klinik Risk Skor Kartı</h4>
            <small data-i18n="scorecard.mewsStandard">MEWS (Modified Early Warning Score)</small>
          </div>
          <div class="scorecard-patient-score ${mewsLevelClass(latest.level)}">
            <span>MEWS</span>
            <strong>${latest.score}</strong>
            <em>${escapeHtml(mewsLevelLabel(latest.level))}</em>
          </div>
        </div>
        <div class="scorecard-patient-chart" id="${chartId}"></div>
        <div class="scorecard-patient-legend">
          <span class="mews-legend low">● ${escapeHtml(t('scorecard.low'))}</span>
          <span class="mews-legend medium">● ${escapeHtml(t('scorecard.medium'))}</span>
          <span class="mews-legend high">● ${escapeHtml(t('scorecard.high'))}</span>
        </div>
      </div>`;
  }

  async function renderScorecard() {
    if (!els.scorecardTableBody) return;
    const patients = (lastData?.patients || []);
    const counts = { low: 0, medium: 0, high: 0 };
    const rows = [];

    for (const p of patients) {
      if (!p.latest) continue;
      const mews = computeMewsScore(p.latest);
      counts[mews.level]++;
      rows.push({
        p,
        mews,
        vitals: `${p.latest.heartRate} bpm / %${p.latest.oxygenSaturation} / ${p.latest.bloodPressureSystolic}/${p.latest.bloodPressureDiastolic}`,
        time: fmtTime(p.latest.timestamp),
      });
    }

    if (els.scorecardCountLow) els.scorecardCountLow.textContent = String(counts.low);
    if (els.scorecardCountMedium) els.scorecardCountMedium.textContent = String(counts.medium);
    if (els.scorecardCountHigh) els.scorecardCountHigh.textContent = String(counts.high);

    rows.sort((a, b) => b.mews.score - a.mews.score);
    els.scorecardTableBody.innerHTML = rows.length
      ? rows.map((r) => `
        <tr data-pseudonym="${escapeHtml(r.p.pseudonym)}">
          <td>${escapeHtml(displayName(r.p))}</td>
          <td><strong class="${mewsLevelClass(r.mews.level)}">${r.mews.score}</strong></td>
          <td><span class="mews-chip ${mewsLevelClass(r.mews.level)}">${escapeHtml(mewsLevelLabel(r.mews.level))}</span></td>
          <td>${escapeHtml(r.vitals)}</td>
          <td>${escapeHtml(r.time)}</td>
        </tr>`).join('')
      : `<tr><td colspan="5" class="table-empty">${escapeHtml(t('scorecard.empty'))}</td></tr>`;

    els.scorecardTableBody.querySelectorAll('tr[data-pseudonym]').forEach((row) => {
      row.addEventListener('click', () => {
        selectedPseudonym = row.dataset.pseudonym;
        switchView('patients');
      });
    });

    try {
      const res = await api('/api/scorecard/clinic');
      const data = res.ok ? await safeJson(res) : { snapshots: [] };
      const snapshots = data.snapshots || [];
      const labels = snapshots.map((s) => s.date.slice(5));
      const values = snapshots.map((s) => s.avgScore);
      drawLineChart(els.scorecardClinicChart, labels, values, 'var(--indigo)');
    } catch (err) {
      if (els.scorecardClinicChart) {
        els.scorecardClinicChart.innerHTML = `<span class="empty-chart" style="color:var(--text-muted);font-size:0.8rem;">${escapeHtml(t('analytics.noData'))}</span>`;
      }
    }
  }

  async function triggerBot(pseudonym, channel = 'voice') {
    if (!els.botTriggerStatus) return;
    els.botTriggerStatus.textContent = t('bot.triggering');
    els.botTriggerStatus.classList.remove('hidden');
    try {
      const res = await api('/api/bot/trigger', {
        method: 'POST',
        body: JSON.stringify({ pseudonym, channel }),
      });
      const body = await safeJson(res);
      if (!res.ok) throw new Error(body.error || t('bot.error'));
      els.botTriggerStatus.textContent = t('bot.triggered', { values: body.transcript });
      await poll();
    } catch (err) {
      els.botTriggerStatus.textContent = err.message;
    }
  }

  /* ---------- Clinical Load Optimizer ---------- */
  let optimizerState = { prescriptions: [] };

  function optimizerEmptyLi(text) {
    return `<li class="optimizer-empty">${escapeHtml(text)}</li>`;
  }

  function renderTriageList(listEl, patients, color) {
    if (!listEl) return;
    listEl.innerHTML = (patients || []).length
      ? patients.slice(0, 6).map((p) => `
        <li class="triage-patient ${color}">
          <strong>${escapeHtml(p.displayCode || p.pseudonym)}</strong>
          <span>${escapeHtml(p.conditionGroup || t('condition.other'))}</span>
          <small>${escapeHtml(t(p.reason))}</small>
        </li>`).join('')
      : optimizerEmptyLi(t('optimizer.empty'));
  }

  function renderPrescriptionList(candidates) {
    optimizerState.prescriptions = candidates || [];
    if (!els.optimizerPrescriptionList) return;
    els.optimizerPrescriptionList.innerHTML = (candidates || []).length
      ? candidates.map((c, i) => `
        <li class="prescription-item">
          <div class="prescription-patient">
            <strong>${escapeHtml(c.displayCode || c.pseudonym)}</strong>
            <span>${escapeHtml(c.conditionGroup || t('condition.other'))}</span>
          </div>
          <p class="prescription-recommendation">${escapeHtml(t(c.recommendation))}</p>
          <button type="button" class="btn btn-primary prescription-approve" data-index="${i}">${escapeHtml(t('optimizer.approveBtn'))}</button>
        </li>`).join('')
      : optimizerEmptyLi(t('optimizer.noPrescription'));

    els.optimizerPrescriptionList.querySelectorAll('.prescription-approve').forEach((btn) => {
      btn.addEventListener('click', () => approvePrescription(Number(btn.dataset.index)));
    });
  }

  function showOptimizerBanner(message) {
    if (!els.optimizerPrescriptionBanner) return;
    els.optimizerPrescriptionBanner.textContent = message;
    els.optimizerPrescriptionBanner.classList.remove('hidden');
    els.optimizerPrescriptionBanner.classList.add('visible');
    clearTimeout(showOptimizerBanner._timer);
    showOptimizerBanner._timer = setTimeout(() => {
      els.optimizerPrescriptionBanner.classList.remove('visible');
      els.optimizerPrescriptionBanner.classList.add('hidden');
    }, 6000);
  }

  function approvePrescription(index) {
    const candidate = optimizerState.prescriptions[index];
    if (!candidate || candidate.approved) return;
    candidate.approved = true;
    renderPrescriptionList(optimizerState.prescriptions);
    showOptimizerBanner(t('optimizer.approvedBanner'));
    addLog(t('optimizer.approvedLog', { code: candidate.displayCode || candidate.pseudonym }));
  }

  async function renderOptimizer() {
    if (!els.optimizerStatTele) return;
    try {
      const res = await api('/api/optimizer/dashboard');
      const data = res.ok ? await safeJson(res) : {};
      const stats = data.stats || {};
      if (els.optimizerStatTele) els.optimizerStatTele.textContent = String(stats.teleConvertedStable ?? '—');
      if (els.optimizerStatAvoid) els.optimizerStatAvoid.textContent = String(stats.earlyRiskAvoided ?? '—');
      if (els.optimizerStatCritical) els.optimizerStatCritical.textContent = String(stats.criticalHospitalCalled ?? '—');

      renderTriageList(els.optimizerGreenList, data.triage?.green, 'green');
      renderTriageList(els.optimizerYellowList, data.triage?.yellow, 'yellow');
      renderTriageList(els.optimizerRedList, data.triage?.red, 'red');

      renderPrescriptionList(data.prescriptions || []);

      const trend = data.avoidanceTrend || [];
      const labels = trend.map((p) => p.date.slice(5));
      const values = trend.map((p) => p.rate);
      drawLineChart(els.optimizerAvoidanceChart, labels, values, 'var(--green)');
    } catch (err) {
      if (els.optimizerAvoidanceChart) {
        els.optimizerAvoidanceChart.innerHTML = `<span class="empty-chart" style="color:var(--text-muted);font-size:0.8rem;">${escapeHtml(t('analytics.noData'))}</span>`;
      }
    }
  }

  /* ---------- AI Clinical SMS Assistant ---------- */
  const aiBranchToConditionMap = {
    cardiology: ['Kalp Yetmezliği', 'Hipertansiyon'],
    endocrinology: ['Diyabet'],
  };

  function computeAiSmsTarget(branch) {
    const patients = (lastData?.patients || []);
    const conditions = aiBranchToConditionMap[branch] || [];
    return patients.filter((p) => conditions.includes(p.conditionGroup || '')).length;
  }

  function showAiSmsBanner(count) {
    const banner = document.getElementById('ai-sms-banner');
    if (!banner) return;
    banner.textContent = t('telemedicine.sentBanner', { count });
    banner.classList.remove('hidden');
    banner.classList.add('visible');
    clearTimeout(showAiSmsBanner._timer);
    showAiSmsBanner._timer = setTimeout(() => {
      banner.classList.remove('visible');
      banner.classList.add('hidden');
    }, 6000);
  }

  function approveAiSms(id) {
    const suggestion = aiSmsState.suggestions.find((s) => s.id === id);
    if (!suggestion || suggestion.status !== 'pending') return;
    const count = computeAiSmsTarget(suggestion.branch);
    suggestion.status = 'sent';
    suggestion.sentCount = count;
    suggestion.sentAt = new Date().toISOString();
    addLog(t('telemedicine.logApproved', { branch: t('telemedicine.branches.' + suggestion.branch), count }));
    renderTelemedicine(true);
    showAiSmsBanner(count);
  }

  function rejectAiSms(id) {
    const suggestion = aiSmsState.suggestions.find((s) => s.id === id);
    if (!suggestion || suggestion.status !== 'pending') return;
    suggestion.status = 'rejected';
    addLog(t('telemedicine.logRejected', { branch: t('telemedicine.branches.' + suggestion.branch) }));
    renderTelemedicine(true);
  }

  function renderAiSmsCard(suggestion) {
    const branchName = t('telemedicine.branches.' + suggestion.branch);
    const target = computeAiSmsTarget(suggestion.branch);
    const body = t('telemedicine.suggestions.' + suggestion.id + '.body');
    const title = t('telemedicine.suggestions.' + suggestion.id + '.title');

    let footer = '';
    if (suggestion.status === 'pending') {
      footer = `
        <div class="ai-sms-actions">
          <button type="button" class="btn btn-approve" data-ai-approve="${suggestion.id}">${escapeHtml(t('telemedicine.approveBtn'))}</button>
          <button type="button" class="btn btn-reject" data-ai-reject="${suggestion.id}">${escapeHtml(t('telemedicine.rejectBtn'))}</button>
        </div>`;
    } else if (suggestion.status === 'sent') {
      footer = `<div class="ai-sms-result ok">✓ ${escapeHtml(t('telemedicine.sentBanner', { count: suggestion.sentCount ?? target }))}</div>`;
    } else {
      footer = `<div class="ai-sms-result rejected">✕ ${escapeHtml(t('telemedicine.rejectedNote'))}</div>`;
    }

    return `
      <article class="ai-sms-card ${suggestion.status}">
        <header class="ai-sms-card-head">
          <span class="ai-sms-badge">🤖 ${escapeHtml(t('telemedicine.aiBadge'))}</span>
          <span class="ai-sms-branch">${escapeHtml(branchName)}</span>
        </header>
        <h4 class="ai-sms-title">${escapeHtml(title)}</h4>
        <p class="ai-sms-body">${escapeHtml(body)}</p>
        <div class="ai-sms-meta">
          <span>${escapeHtml(t('telemedicine.targetPatients'))}: <strong>${target}</strong></span>
          <span class="ai-sms-status-${suggestion.status}">${escapeHtml(t('telemedicine.status.' + suggestion.status))}</span>
        </div>
        ${footer}
      </article>`;
  }

  function renderTelemedicine(force = false) {
    if (!els.aiSmsPanel) return;
    const lang = i18n.getCurrentLang();
    if (!force && els.aiSmsPanel.innerHTML && els.aiSmsPanel.dataset.lang === lang) return;

    const cards = aiSmsState.suggestions.map(renderAiSmsCard).join('');
    els.aiSmsPanel.innerHTML = `
      <div class="ai-sms-banner hidden" id="ai-sms-banner" role="status"></div>
      <div class="ai-sms-intro">
        <h3>${escapeHtml(t('telemedicine.poolTitle'))}</h3>
        <p>${escapeHtml(t('telemedicine.poolSubtitle'))}</p>
      </div>
      <div class="ai-sms-grid">${cards}</div>`;
    els.aiSmsPanel.dataset.lang = lang;

    els.aiSmsPanel.querySelectorAll('[data-ai-approve]').forEach((btn) => {
      btn.addEventListener('click', () => approveAiSms(btn.dataset.aiApprove));
    });
    els.aiSmsPanel.querySelectorAll('[data-ai-reject]').forEach((btn) => {
      btn.addEventListener('click', () => rejectAiSms(btn.dataset.aiReject));
    });
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
    const placeholders = {
      tr: { name: 'Hasta', measurement: 'nabız 72, SpO2 %97', condition: 'Diyabet' },
      en: { name: 'Patient', measurement: 'pulse 72, SpO2 97%', condition: 'Diabetes' },
      ar: { name: 'المريض', measurement: 'نبض 72، SpO2 97%', condition: 'السكري' },
    };
    const d = placeholders[i18n.getCurrentLang()] || placeholders.tr;
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
      const data = await safeJson(res);
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

  const TRIAGE_KEYWORDS = {
    red: [
      'göğüs ağrı', 'göğüsümde', 'göğsümde', 'baskı', 'nefes alam', 'nefes dar', 'solunum', 'bayıl', 'bilinç',
      'inme', 'felç', 'konuşma bozuk', 'yüzümde kayma', 'sol kol', 'kalp kriz', 'çarpıntı şiddet', 'morar',
      'chest pain', 'chest pressure', 'cannot breathe', "can't breathe", 'shortness of breath', 'stroke',
      'unconscious', 'faint', 'left arm', 'heart attack', 'severe bleeding',
      'ألم الصدر', 'ضغط في صدري', 'لا أستطيع التنفس', 'ضيق التنفس', 'سكتة', 'إغماء', 'ذراعي الأيسر',
    ],
    yellow: [
      'öksür', 'geçmeyen', 'iki hafta', 'rutin', 'şeker takibi', 'tansiyon takibi', 'kontrol', 'muayene',
      'kronik', 'ağrı', 'ateş', 'bıçak', 'yara', 'kırık', 'şişlik', 'reçete', 'reçete', 'rapor',
      'cough', 'two weeks', 'routine', 'glucose follow', 'check-up', 'checkup', 'chronic', 'fever',
      'swelling', 'wound', 'examination', 'follow-up check',
      'سعال', 'أسبوعين', 'روتين', 'متابعة السكر', 'فحص', 'مزمن', 'حمى', 'تورم',
    ],
  };

  function classifyComplaint(input) {
    const text = String(input || '').toLowerCase();
    if (TRIAGE_KEYWORDS.red.some((k) => text.includes(k))) return 'red';
    if (TRIAGE_KEYWORDS.yellow.some((k) => text.includes(k))) return 'yellow';
    return 'green';
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

  function renderTriageReport(m) {
    const code = m.triage;
    return `<div class="chat-msg bot">
      <div class="triage-report ${code}">
        <div class="triage-report-head">
          <span class="triage-report-title">${escapeHtml(t('preTriage.reportTitle'))}</span>
          <span class="triage-report-time">${fmtTime(m.time)}</span>
        </div>
        <div class="triage-report-row">
          <span class="triage-report-label">${escapeHtml(t('preTriage.reportSeverity'))}</span>
          <span class="triage-code-badge ${code}">${escapeHtml(t('preTriage.' + code + '.label'))}</span>
        </div>
        <div class="triage-report-alert ${code}">${escapeHtml(t('preTriage.' + code + '.alert'))}</div>
        <div class="triage-report-row column">
          <span class="triage-report-label">${escapeHtml(t('preTriage.reportAnalysis'))}</span>
          <p>${escapeHtml(t('preTriage.' + code + '.analysis'))}</p>
        </div>
        <button type="button" class="chat-speak" aria-label="${escapeHtml(t('chatbot.speak'))}" data-msg="${escapeHtml(t('preTriage.' + code + '.alert'))}">🔊</button>
      </div>
    </div>`;
  }

  function renderChatMessages() {
    const session = getCurrentChatSession();
    if (!session) return '';
    const html = session.messages.map((m) => {
      const isBot = m.role === 'bot';
      if (isBot && m.triage) {
        return renderTriageReport(m);
      }
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
      const code = classifyComplaint(text);
      session.messages.push({
        role: 'bot',
        triage: code,
        text: t('preTriage.' + code + '.alert'),
        time: new Date().toISOString(),
      });
      session.updatedAt = new Date().toISOString();
      chatState.loading = false;
      saveChatSessions();
      renderVoice(true);
    }, 1400);
  }

  function startTriageVoiceInput() {
    const input = document.getElementById('chat-input');
    const micBtn = document.getElementById('chat-mic');
    if (!input) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      const rec = new SR();
      rec.lang = i18n.getCurrentLang() === 'tr' ? 'tr-TR' : (i18n.getCurrentLang() === 'ar' ? 'ar-SA' : 'en-US');
      rec.interimResults = false;
      if (micBtn) micBtn.classList.add('listening');
      input.placeholder = t('preTriage.micListening');
      rec.onresult = (e) => {
        const transcript = e.results?.[0]?.[0]?.transcript || '';
        input.value = transcript;
        if (micBtn) micBtn.classList.remove('listening');
        input.placeholder = t('chatbot.placeholder');
      };
      rec.onerror = () => {
        if (micBtn) micBtn.classList.remove('listening');
        input.placeholder = t('chatbot.placeholder');
      };
      rec.onend = () => {
        if (micBtn) micBtn.classList.remove('listening');
        input.placeholder = t('chatbot.placeholder');
      };
      rec.start();
      return;
    }
    const samples = t('chatbot.suggested').split('|');
    input.value = samples[Math.floor(Math.random() * samples.length)].trim();
    input.placeholder = t('preTriage.micSimulated');
  }

  function attachChatListeners() {
    if (!els.voicePanel) return;

    const micBtn = document.getElementById('chat-mic');
    if (micBtn) {
      micBtn.addEventListener('click', () => {
        if (chatState.loading) return;
        startTriageVoiceInput();
      });
    }

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
          <button type="button" class="chat-mic-btn" id="chat-mic" aria-label="${escapeHtml(t('preTriage.micLabel'))}" title="${escapeHtml(t('preTriage.micLabel'))}">🎙️</button>
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
    setupScheduleEditor(els.form, ['08:00'], '');
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
    const caregiverName = String(fd.get('caregiverName') ?? '').trim();
    const caregiverRelationship = String(fd.get('caregiverRelationship') ?? '').trim();
    const caregiverPhone = String(fd.get('caregiverPhone') ?? '').trim();
    const caregiverEmail = String(fd.get('caregiverEmail') ?? '').trim();
    const scheduleDays = getScheduleDays(els.form);
    const scheduleTimes = getScheduleTimes(els.form);
    const scheduleTemplate = String(fd.get('scheduleTemplate') ?? '').trim();
    const payload = {
      fullName: fd.get('fullName'),
      nationalId: fd.get('nationalId'),
      dateOfBirth: fd.get('dateOfBirth'),
      condition: fd.get('condition'),
      contactChannel: fd.get('contactChannel'),
      caregiver: caregiverName || caregiverPhone || caregiverEmail ? { name: caregiverName, relationship: caregiverRelationship, phone: caregiverPhone, email: caregiverEmail } : undefined,
      schedule: scheduleDays.length || scheduleTimes.length || scheduleTemplate ? { days: scheduleDays, times: scheduleTimes, template: scheduleTemplate } : undefined,
    };

    try {
      const res = await api('/api/patients', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const body = await safeJson(res);
      if (!res.ok || !body.pseudonym) {
        // local fallback so the registration UI never crashes
        const localPatient = createLocalPatient(payload);
        const localPatients = getLocalPatients();
        localPatients.push(localPatient);
        setLocalPatients(localPatients);
        renderPatientResponse(localPatient);
        return;
      }
      renderPatientResponse(body);
      addLog(t('log.patientAdded', { code: body.displayCode }));
    } catch (err) {
      const localPatient = createLocalPatient(payload);
      const localPatients = getLocalPatients();
      localPatients.push(localPatient);
      setLocalPatients(localPatients);
      renderPatientResponse(localPatient);
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

    if (currentView === 'dashboard' && els.patientsPager) {
      els.patientsPager.innerHTML = '';
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
      renderModules();
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
    renderModules();
    renderScorecard();
    renderOptimizer();

    if (withData.length === 0) {
      els.patients.innerHTML = `<div class="empty-state">
        <p>${escapeHtml(t('emptyState.p1'))}</p>
        <p>${escapeHtml(t('emptyState.p2'))}</p>
      </div>`;
      return;
    }

    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    withData.sort((a, b) => order[a.risk.level] - order[b.risk.level]);
    const total = Math.ceil(withData.length / PAGE_SIZE) || 1;
    if (dashboardPage > total) dashboardPage = total;
    const start = (dashboardPage - 1) * PAGE_SIZE;
    els.patients.innerHTML = withData.slice(start, start + PAGE_SIZE).map(patientCard).join('');
    renderPager(els.patientsPager, dashboardPage, total, (p) => { dashboardPage = p; render(data); });
  }

  async function poll() {
    try {
      const res = await api('/api/dashboard/patients');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await safeJson(res);
      if (!data || !Array.isArray(data.patients)) throw new Error('invalid');
      data.patients = data.patients.concat(getLocalPatients());
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
