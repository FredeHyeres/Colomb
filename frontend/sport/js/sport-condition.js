/* ============================================================
   SPORT-CONDITION.JS — Monitoring condition sportive d'un pigeon
   Indices circulaires, tendances, alertes, intégration santé
   ============================================================ */

async function loadCondition() {
  const content = document.getElementById('content');
  const btn = document.getElementById('btn-add');
  if (btn) btn.style.display = 'none';

  content.innerHTML = `
    <!-- Sélecteur pigeon -->
    <div class="pigeon-select-bar">
      <label>${t('sport.condition.pigeon_label')}</label>
      <select class="form-control" id="condition-pigeon-select">
        <option value="">${t('sport.choose_pigeon_placeholder')}</option>
      </select>
      <button class="btn btn-primary btn-sm" id="btn-load-condition" disabled>${t('sport.condition.btn_analyze')}</button>
    </div>

    <div id="condition-content">
      <div class="empty-state">
        <div class="empty-icon">💪</div>
        <h3>${t('sport.condition.empty.title')}</h3>
        <p>${t('sport.condition.empty.sub')}</p>
      </div>
    </div>
  `;

  const pigeons = await getPigeonsCache();
  const select = document.getElementById('condition-pigeon-select');

  pigeons.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = `${p.matricule}${p.nom ? ' — ' + p.nom : ''}`;
    select.appendChild(opt);
  });

  select.addEventListener('change', () => {
    document.getElementById('btn-load-condition').disabled = !select.value;
  });

  document.getElementById('btn-load-condition').addEventListener('click', () => {
    if (select.value) {
      const pigeon = pigeons.find(p => String(p.id) === String(select.value));
      loadConditionForPigeon(select.value, pigeon);
    }
  });

  // Pré-sélection depuis le Monitoring colonie (sessionStorage)
  const preselect = sessionStorage.getItem('sport_selected_pigeon');
  if (preselect) {
    sessionStorage.removeItem('sport_selected_pigeon');
    select.value = preselect;
    if (select.value) {
      document.getElementById('btn-load-condition').disabled = false;
      const pigeon = pigeons.find(p => String(p.id) === String(preselect));
      loadConditionForPigeon(preselect, pigeon);
    }
  }
}

/* ——— Chargement condition complète ——— */
async function loadConditionForPigeon(pigeonId, pigeon) {
  const container = document.getElementById('condition-content');
  container.innerHTML = '<div class="loader-spinner"></div>';

  try {
    const [dashData, snapshots, history, health] = await Promise.all([
      AIAPI.getDashboard(pigeonId).catch(() => ({})),
      AIAPI.getSnapshots(pigeonId).catch(() => []),
      SportAPI.getPigeonHistory(pigeonId).catch(() => ({ sessions: [] })),
      ElevageAPI.getPigeonHealth(pigeonId).catch(() => [])
    ]);

    const snapList = Array.isArray(snapshots) ? snapshots : [];
    const lastSnap = snapList.length > 0
      ? snapList.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
      : null;

    const healthList = Array.isArray(health) ? health : [];
    const sessions = history?.sessions || (Array.isArray(history) ? history : []);

    // Indices principaux — depuis snap.features (JSON stocké en DB)
    const f = (lastSnap?.features && typeof lastSnap.features === 'object') ? lastSnap.features : {};
    const fatigueMap = { eleve: 80, moyen: 50, faible: 20 };
    const indices = {
      recovery: f.recovery_avg_7d ?? null,
      condition: f.condition_avg_7d ?? null,
      regularity: f.regularity_index ?? null,
      fatigue: typeof f.fatigue_risk === 'string' ? (fatigueMap[f.fatigue_risk] ?? null) : null,
      training_load: f.training_load_30d ?? null,
      performance: null
    };

    // Tendances : comparer snapshot actuel vs 7j avant
    const snapBefore7d = snapList.find(s => {
      const d = new Date(s.created_at);
      return (Date.now() - d) > 7 * 86400000;
    });

    // Alerte fatigue
    const fatiguAlert = indices.fatigue != null && indices.fatigue > 70;

    // Événements santé récents (90j) avec impact sport
    const recentHealth = healthList.filter(h => {
      const d = new Date(h.date || h.created_at);
      return (Date.now() - d) < 90 * 86400000;
    }).slice(0, 8);

    container.innerHTML = `
      <!-- Alerte surcharge -->
      ${fatiguAlert ? `
      <div class="alert-card critical" style="margin-bottom:16px;">
        <span class="alert-icon">🚨</span>
        <div class="alert-content">
          <div class="alert-title">${t('sport.condition.alert.title', { pct: indices.fatigue })}</div>
          <div class="alert-text">${t('sport.condition.alert.text')}</div>
        </div>
      </div>` : ''}

      <!-- Indices principaux en jauges -->
      <div class="card" style="margin-bottom:16px;">
        <div class="card-header">
          <div>
            <div class="card-title">${t('sport.condition.indices_title')}</div>
            <div class="card-subtitle">${lastSnap ? t('sport.condition.snapshot_date', { date: formatDatetime(lastSnap.created_at) }) : t('sport.condition.realtime_data')}</div>
          </div>
          <button class="btn btn-sm btn-ghost" id="btn-new-snapshot">${t('sport.condition.btn_new_snapshot')}</button>
        </div>

        ${Object.values(indices).some(v => v != null) ? `
          <div class="gauge-grid">
            ${indices.recovery != null ? renderProgressRing(indices.recovery, 10, t('sport.condition.gauges.recovery'), '#2980B9') : ''}
            ${indices.condition != null ? renderProgressRing(indices.condition, 10, t('sport.condition.gauges.condition'), '#27AE60') : ''}
            ${indices.regularity != null ? renderProgressRing(indices.regularity, 10, t('sport.condition.gauges.regularity'), '#8E44AD') : ''}
            ${indices.fatigue != null ? renderProgressRing(indices.fatigue, 100, t('sport.condition.gauges.fatigue'), indices.fatigue > 70 ? '#E74C3C' : '#E67E22') : ''}
            ${indices.training_load != null ? renderProgressRing(indices.training_load, 30, t('sport.condition.gauges.training_load'), '#E67E22') : ''}
          </div>` : `
          <div class="empty-state" style="padding:24px;">
            <p>${t('sport.condition.no_indices')}</p>
          </div>`}
      </div>

      <!-- Tendances 7j vs 30j -->
      <div class="dashboard-row">
        <div class="card flex-1">
          <div class="card-header">
            <div class="card-title">${t('sport.condition.trends.title')}</div>
            <div class="card-subtitle">${t('sport.condition.trends.subtitle')}</div>
          </div>
          ${renderTendances(sessions, pigeonId)}
        </div>

        <!-- Intégration santé -->
        <div class="card flex-1">
          <div class="card-header">
            <div class="card-title">${t('sport.condition.health_impact.title')}</div>
            <div class="card-subtitle">${t('sport.condition.health_impact.subtitle')}</div>
          </div>
          ${renderHealthImpact(recentHealth)}
        </div>
      </div>

      <!-- Dernières séances -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">${t('sport.condition.recent_perfs.title')}</div>
        </div>
        ${renderRecentPerfs(sessions, pigeonId)}
      </div>
    `;

    // Bouton nouveau snapshot
    document.getElementById('btn-new-snapshot').addEventListener('click', async () => {
      const btn = document.getElementById('btn-new-snapshot');
      btn.disabled = true;
      btn.innerHTML = `<span class="loader-inline"></span> ${t('sport.condition.analyzing')}`;
      try {
        await AIAPI.buildSnapshot(pigeonId);
        showToast(t('sport.condition.snapshot_created'), 'success');
        loadConditionForPigeon(pigeonId, pigeon);
      } catch (err) {
        showToast(err.message, 'error');
        btn.disabled = false;
        btn.textContent = t('sport.condition.btn_new_snapshot');
      }
    });

  } catch (err) {
    container.innerHTML = `<div class="card"><p style="color:var(--danger);">${t('sport.error.prefix', { message: err.message })}</p></div>`;
    showToast(err.message, 'error');
  }
}

/* ——— Tendances sur les séances ——— */
function renderTendances(sessions, pigeonId) {
  if (sessions.length < 2) {
    return `<p style="color:var(--text-light);font-size:0.85rem;">${t('sport.condition.trends.not_enough')}</p>`;
  }

  // Trier par date (session_date vient du nouveau endpoint history)
  const sorted = [...sessions].sort((a, b) => new Date(a.session_date || a.date) - new Date(b.session_date || b.date));

  const getScore = (session) => session.recovery_score ?? null;

  const inWindow = (s, fromDays, toDays) => {
    const ms = Date.now() - new Date(s.session_date || s.date);
    return ms >= fromDays * 86400000 && ms < toDays * 86400000;
  };

  // Moyenne 90 derniers jours vs 90 précédents
  const recent30 = sorted.filter(s => inWindow(s, 0, 90)).map(getScore).filter(x => x != null);
  const prev30 = sorted.filter(s => inWindow(s, 90, 180)).map(getScore).filter(x => x != null);

  const avg30 = recent30.length > 0 ? recent30.reduce((a, b) => a + b, 0) / recent30.length : null;
  const avgPrev = prev30.length > 0 ? prev30.reduce((a, b) => a + b, 0) / prev30.length : null;

  const metrics = [
    { label: t('sport.condition.trends.metrics.recovery_avg'), val: avg30, prev: avgPrev, unit: '/10', dec: 1 },
    { label: t('sport.condition.trends.metrics.sessions_30'), val: sorted.filter(s => inWindow(s, 0, 30)).length, prev: sorted.filter(s => inWindow(s, 30, 60)).length, unit: '', dec: 0 },
    { label: t('sport.condition.trends.metrics.sessions_90'), val: sorted.filter(s => inWindow(s, 0, 90)).length, prev: null, unit: '', dec: 0 }
  ];

  return metrics.map(m => {
    if (m.val == null) return '';
    const delta = m.prev != null ? m.val - m.prev : null;
    let arrow = '→', arrowClass = 'stable', deltaStr = '';
    if (delta != null) {
      if (delta > 0.2) { arrow = '↑'; arrowClass = 'up'; }
      else if (delta < -0.2) { arrow = '↓'; arrowClass = 'down'; }
      deltaStr = `${delta > 0 ? '+' : ''}${delta.toFixed(m.dec)}`;
    }
    return `
      <div class="tendance-item">
        <div>
          <div style="font-size:0.85rem;font-weight:600;">${m.label}</div>
          <div style="font-size:1.1rem;font-weight:700;color:var(--text);">${m.val.toFixed(m.dec)}${m.unit}</div>
        </div>
        <div style="text-align:right;">
          <div class="tendance-arrow ${arrowClass}">${arrow}</div>
          ${deltaStr ? `<div class="tendance-delta" style="color:${arrowClass === 'up' ? 'var(--success)' : arrowClass === 'down' ? 'var(--danger)' : 'var(--text-light)'};">${deltaStr}</div>` : ''}
        </div>
      </div>`;
  }).join('') || `<p style="color:var(--text-light);font-size:0.85rem;">${t('sport.condition.trends.insufficient')}</p>`;
}

/* ——— Impact santé sur la condition ——— */
function renderHealthImpact(healthEvents) {
  if (healthEvents.length === 0) {
    return `
      <div class="alert-card success">
        <span class="alert-icon">✅</span>
        <div class="alert-content">
          <div class="alert-title">${t('sport.condition.health_impact.none_title')}</div>
          <div class="alert-text">${t('sport.condition.health_impact.none_text')}</div>
        </div>
      </div>`;
  }

  return healthEvents.map(h => {
    const daysAgo = Math.round((Date.now() - new Date(h.date || h.created_at)) / 86400000);
    const isBad = ['maladie', 'blessure', 'traitement'].includes((h.type || '').toLowerCase());

    // Estimer l'impact selon le type et l'ancienneté
    let impact = '';
    if (isBad && daysAgo <= 7) impact = t('sport.condition.health_impact.impact.recent');
    else if (isBad && daysAgo <= 30) impact = t('sport.condition.health_impact.impact.recovering');
    else if (isBad && daysAgo <= 60) impact = t('sport.condition.health_impact.impact.monitor');
    else if (isBad) impact = t('sport.condition.health_impact.impact.resolved');

    return `
      <div style="display:flex;align-items:flex-start;gap:8px;padding:8px 0;border-bottom:1px solid var(--border);">
        <span style="font-size:1.1rem;">${isBad ? '🔴' : '🟢'}</span>
        <div>
          <div style="font-size:0.85rem;font-weight:600;">${h.type || h.evenement || t('sport.condition.health_impact.event_default')}</div>
          <div style="font-size:0.75rem;color:var(--text-light);">${t('sport.condition.health_impact.days_ago', { count: daysAgo })} · ${formatDate(h.date || h.created_at)}</div>
          ${impact ? `<div style="font-size:0.75rem;color:${isBad ? 'var(--danger)' : 'var(--success)'};font-style:italic;margin-top:2px;">→ ${impact}</div>` : ''}
        </div>
      </div>`;
  }).join('');
}

/* ——— Performances récentes ——— */
function renderRecentPerfs(sessions, pigeonId) {
  if (sessions.length === 0) {
    return `<div class="empty-state"><p>${t('sport.condition.recent_perfs.empty')}</p></div>`;
  }

  const sorted = [...sessions]
    .sort((a, b) => new Date(b.session_date || b.date) - new Date(a.session_date || a.date))
    .slice(0, 10);

  return `
    <table class="table-modern">
      <thead>
        <tr>
          <th>${t('sport.condition.recent_perfs.table.date')}</th>
          <th>${t('sport.condition.recent_perfs.table.type')}</th>
          <th>${t('sport.condition.recent_perfs.table.distance')}</th>
          <th>${t('sport.condition.recent_perfs.table.recovery')}</th>
          <th>${t('sport.condition.recent_perfs.table.condition')}</th>
          <th>${t('sport.condition.recent_perfs.table.motivation')}</th>
        </tr>
      </thead>
      <tbody>
        ${sorted.map(s => `
          <tr>
            <td>${formatDate(s.session_date || s.date)}</td>
            <td>${sessionTypeBadge(s.session_type)}</td>
            <td>${s.distance_km != null ? s.distance_km + ' km' : '—'}</td>
            <td>${s.recovery_score != null ? renderScoreBar(s.recovery_score) : '<span style="color:var(--text-light)">—</span>'}</td>
            <td>${s.condition_score != null ? renderScoreBar(s.condition_score) : '<span style="color:var(--text-light)">—</span>'}</td>
            <td>${s.motivation_score != null ? renderScoreBar(s.motivation_score) : '<span style="color:var(--text-light)">—</span>'}</td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}
