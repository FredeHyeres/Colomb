/* ============================================================
   SPORT-API.JS — Couche API centralisée
   Chargé en premier — toutes les fonctions globales ici
   ============================================================ */

const API_URL = 'http://localhost:8001/api';

/* ——— Fetch générique ——— */
async function apiFetch(endpoint, options = {}) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `Erreur API (${response.status})`);
  }
  if (response.status === 204) return null;
  return await response.json();
}

/* ——— Toast notifications ——— */
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type === 'error' ? 'error' : type}`;
  toast.innerHTML = `<span>${icons[type] || ''}</span><span>${message}</span>`;
  container.appendChild(toast);

  // Suppression automatique après 3.5s
  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 350);
  }, 3500);
}

/* ——— Loader dans un container ——— */
function showLoader(containerId) {
  const el = document.getElementById(containerId);
  if (el) el.innerHTML = '<div class="loader-spinner"></div>';
}

/* ——— Formatage date FR ——— */
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateShort(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

function formatDatetime(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/* ——— Score → couleur CSS ——— */
function scoreColor(score) {
  if (score == null) return '#aaa';
  const s = parseFloat(score);
  if (s <= 3) return '#E74C3C';
  if (s <= 6) return '#E67E22';
  if (s <= 8) return '#52BE80';
  return '#27AE60';
}

function scoreClass(score) {
  if (score == null) return 'score-0';
  const s = Math.round(parseFloat(score));
  return `score-${Math.min(10, Math.max(0, s))}`;
}

/* ——— Rendu barre de score ——— */
function renderScoreBar(score) {
  if (score == null) return '<span style="color:#aaa;font-size:0.78rem;">—</span>';
  const pct = (parseFloat(score) / 10) * 100;
  const color = scoreColor(score);
  return `
    <div class="score-bar-wrap">
      <div class="score-bar-track">
        <div class="score-bar-fill ${scoreClass(score)}" style="width:${pct}%;background:${color};"></div>
      </div>
      <span class="score-bar-val">${parseFloat(score).toFixed(1)}</span>
    </div>`;
}

/* ——— Badge type séance ——— */
function sessionTypeBadge(type) {
  const map = {
    loft: { label: 'Loft', cls: 'badge-loft' },
    toss: { label: 'Lancer', cls: 'badge-toss' },
    race: { label: 'Concours', cls: 'badge-race' }
  };
  const m = map[type] || { label: type || '—', cls: 'badge-secondary' };
  return `<span class="badge ${m.cls}">${m.label}</span>`;
}

/* ——— Jauge circulaire SVG ——— */
function renderProgressRing(value, max, label, color) {
  const r = 34;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(1, Math.max(0, (value || 0) / (max || 100)));
  const offset = circ * (1 - pct);
  const displayVal = value != null ? parseFloat(value).toFixed(0) : '—';
  return `
    <div class="progress-ring-wrap">
      <div class="progress-ring">
        <svg width="80" height="80" viewBox="0 0 80 80">
          <circle class="ring-bg" cx="40" cy="40" r="${r}"/>
          <circle class="ring-fill" cx="40" cy="40" r="${r}"
            stroke="${color || '#2980B9'}"
            stroke-dasharray="${circ}"
            stroke-dashoffset="${offset}"/>
        </svg>
        <div class="ring-label">
          <span>${displayVal}</span>
          <span class="ring-sub">${max > 10 ? '%' : '/10'}</span>
        </div>
      </div>
      <span class="ring-label-text">${label}</span>
    </div>`;
}

/* ============================================================
   SPORT API
   ============================================================ */
const SportAPI = {
  getSessions: (skip = 0, limit = 50) =>
    apiFetch(`/sport/sessions?skip=${skip}&limit=${limit}`),

  getSession: (id) =>
    apiFetch(`/sport/sessions/${id}`),

  createSession: (data) =>
    apiFetch('/sport/sessions', { method: 'POST', body: JSON.stringify(data) }),

  updateSession: (id, data) =>
    apiFetch(`/sport/sessions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteSession: (id) =>
    apiFetch(`/sport/sessions/${id}`, { method: 'DELETE' }),

  addResult: (sessionId, data) =>
    apiFetch(`/sport/sessions/${sessionId}/results`, { method: 'POST', body: JSON.stringify(data) }),

  getPigeonHistory: (pigeonId) =>
    apiFetch(`/sport/pigeons/${pigeonId}/history`),

  getDashboard: () =>
    apiFetch('/sport/dashboard'),

  getIngredients: () =>
    apiFetch('/sport/nutrition/ingredients'),

  createIngredient: (data) =>
    apiFetch('/sport/nutrition/ingredients', { method: 'POST', body: JSON.stringify(data) }),

  getMixes: () =>
    apiFetch('/sport/nutrition/mixes'),

  createMix: (data) =>
    apiFetch('/sport/nutrition/mixes', { method: 'POST', body: JSON.stringify(data) }),

  getPlans: () =>
    apiFetch('/sport/nutrition/plans'),

  createPlan: (data) =>
    apiFetch('/sport/nutrition/plans', { method: 'POST', body: JSON.stringify(data) }),

  getSupplements: () =>
    apiFetch('/sport/supplements'),

  createSupplement: (data) =>
    apiFetch('/sport/supplements', { method: 'POST', body: JSON.stringify(data) }),
};

/* ============================================================
   AI API
   ============================================================ */
const AIAPI = {
  getRecommendations: (pigeonId) =>
    apiFetch(`/ai/recommendations/${pigeonId}`),

  generateRecommendations: (pigeonId) =>
    apiFetch(`/ai/recommendations/${pigeonId}/generate`, { method: 'POST' }),

  resolveRecommendation: (recId) =>
    apiFetch(`/ai/recommendations/${recId}/resolve`, { method: 'PUT' }),

  getSnapshots: (pigeonId) =>
    apiFetch(`/ai/snapshots/${pigeonId}`),

  buildSnapshot: (pigeonId) =>
    apiFetch(`/ai/snapshots/${pigeonId}/build`, { method: 'POST' }),

  getEvents: (pigeonId) =>
    apiFetch(`/ai/events/${pigeonId}`),

  getDashboard: (pigeonId) =>
    apiFetch(`/ai/dashboard/${pigeonId}`),
};

/* ============================================================
   ÉLEVAGE API (lecture seule)
   ============================================================ */
const ElevageAPI = {
  getPigeons: () =>
    apiFetch('/pigeons/'),

  getPigeonHealth: (pigeonId) =>
    apiFetch(`/sante/?pigeon_id=${pigeonId}`),

  getPigeonPerfs: (pigeonId) =>
    apiFetch(`/performances/?pigeon_id=${pigeonId}`),
};

/* ——— Cache pigeons global ——— */
let _pigeonsCache = null;

async function getPigeonsCache() {
  if (!_pigeonsCache) {
    _pigeonsCache = await ElevageAPI.getPigeons().catch(() => []);
  }
  return _pigeonsCache || [];
}

function invalidatePigeonsCache() {
  _pigeonsCache = null;
}

/* ——— Utilitaire : construire un <select> de pigeons ——— */
async function buildPigeonSelect(selectEl, emptyLabel = 'Choisir un pigeon...') {
  const pigeons = await getPigeonsCache();
  selectEl.innerHTML = `<option value="">${emptyLabel}</option>` +
    pigeons.map(p =>
      `<option value="${p.id}">${p.bague}${p.nom ? ' — ' + p.nom : ''}</option>`
    ).join('');
  return pigeons;
}
