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
      <label>💪 Pigeon :</label>
      <select class="form-control" id="condition-pigeon-select">
        <option value="">Choisir un pigeon...</option>
      </select>
      <button class="btn btn-primary btn-sm" id="btn-load-condition" disabled>Analyser</button>
    </div>

    <div id="condition-content">
      <div class="empty-state">
        <div class="empty-icon">💪</div>
        <h3>Sélectionnez un pigeon</h3>
        <p>La condition sportive détaillée s'affichera ici.</p>
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

    // Indices principaux — depuis snapshot ou dashboard
    const indices = {
      recovery: lastSnap?.recovery_index ?? dashData?.recovery_index ?? null,
      condition: lastSnap?.condition_index ?? dashData?.condition_index ?? null,
      regularity: lastSnap?.regularity_index ?? dashData?.regularity_index ?? null,
      fatigue: lastSnap?.fatigue_risk ?? dashData?.fatigue_risk ?? null,
      training_load: lastSnap?.training_load ?? dashData?.training_load ?? null,
      performance: lastSnap?.performance_score ?? dashData?.performance_score ?? null
    };

    // Tendances : comparer snapshot actuel vs 7j avant
    const snapBefore7d = snapList.find(s => {
      const d = new Date(s.created_at);
      return (Date.now() - d) > 7 * 86400000;
    });

    // Alerte fatigue
    const fatiguAlert = indices.fatigue != null && indices.fatigue > 70;

    // Événements santé récents (30j) avec impact sport
    const recentHealth = healthList.filter(h => {
      const d = new Date(h.date || h.created_at);
      return (Date.now() - d) < 30 * 86400000;
    }).slice(0, 5);

    container.innerHTML = `
      <!-- Alerte surcharge -->
      ${fatiguAlert ? `
      <div class="alert-card critical" style="margin-bottom:16px;">
        <span class="alert-icon">🚨</span>
        <div class="alert-content">
          <div class="alert-title">Risque de surcharge détecté ! (${indices.fatigue}%)</div>
          <div class="alert-text">Ce pigeon présente des signes de fatigue élevée. Réduisez l'intensité des entraînements et assurez une récupération complète.</div>
        </div>
      </div>` : ''}

      <!-- Indices principaux en jauges -->
      <div class="card" style="margin-bottom:16px;">
        <div class="card-header">
          <div>
            <div class="card-title">📊 Indices de condition sportive</div>
            <div class="card-subtitle">${lastSnap ? `Snapshot du ${formatDatetime(lastSnap.created_at)}` : 'Données en temps réel'}</div>
          </div>
          <button class="btn btn-sm btn-ghost" id="btn-new-snapshot">🔄 Nouveau snapshot</button>
        </div>

        ${Object.values(indices).some(v => v != null) ? `
          <div class="gauge-grid">
            ${indices.recovery != null ? renderProgressRing(indices.recovery, 100, 'Récupération', '#2980B9') : ''}
            ${indices.condition != null ? renderProgressRing(indices.condition, 100, 'Condition', '#27AE60') : ''}
            ${indices.regularity != null ? renderProgressRing(indices.regularity, 100, 'Régularité', '#8E44AD') : ''}
            ${indices.fatigue != null ? renderProgressRing(indices.fatigue, 100, 'Risque fatigue', indices.fatigue > 70 ? '#E74C3C' : '#E67E22') : ''}
            ${indices.training_load != null ? renderProgressRing(indices.training_load, 100, 'Charge', '#E67E22') : ''}
            ${indices.performance != null ? renderProgressRing(indices.performance, 100, 'Performance', '#C4963A') : ''}
          </div>` : `
          <div class="empty-state" style="padding:24px;">
            <p>Aucun indice disponible. Créez un snapshot pour obtenir les données de condition.</p>
          </div>`}
      </div>

      <!-- Tendances 7j vs 30j -->
      <div class="dashboard-row">
        <div class="card flex-1">
          <div class="card-header">
            <div class="card-title">📈 Tendances</div>
            <div class="card-subtitle">Évolution 7 derniers jours</div>
          </div>
          ${renderTendances(sessions, pigeonId)}
        </div>

        <!-- Intégration santé -->
        <div class="card flex-1">
          <div class="card-header">
            <div class="card-title">🏥 Impact santé sur la condition</div>
            <div class="card-subtitle">Événements médicaux récents (30j)</div>
          </div>
          ${renderHealthImpact(recentHealth)}
        </div>
      </div>

      <!-- Dernières séances -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">🏃 Performances récentes</div>
        </div>
        ${renderRecentPerfs(sessions, pigeonId)}
      </div>
    `;

    // Bouton nouveau snapshot
    document.getElementById('btn-new-snapshot').addEventListener('click', async () => {
      const btn = document.getElementById('btn-new-snapshot');
      btn.disabled = true;
      btn.innerHTML = '<span class="loader-inline"></span> Analyse...';
      try {
        await AIAPI.buildSnapshot(pigeonId);
        showToast('Snapshot créé avec succès !', 'success');
        loadConditionForPigeon(pigeonId, pigeon);
      } catch (err) {
        showToast(err.message, 'error');
        btn.disabled = false;
        btn.textContent = '🔄 Nouveau snapshot';
      }
    });

  } catch (err) {
    container.innerHTML = `<div class="card"><p style="color:var(--danger);">Erreur : ${err.message}</p></div>`;
    showToast(err.message, 'error');
  }
}

/* ——— Tendances sur les séances ——— */
function renderTendances(sessions, pigeonId) {
  if (sessions.length < 2) {
    return '<p style="color:var(--text-light);font-size:0.85rem;">Pas assez de séances pour calculer les tendances.</p>';
  }

  // Trier par date
  const sorted = [...sessions].sort((a, b) => new Date(a.date) - new Date(b.date));

  const getScore = (session) => {
    if (session.avg_recovery != null) return session.avg_recovery;
    const r = (session.results || []).find(x => String(x.pigeon_id) === String(pigeonId));
    return r?.recovery_score ?? null;
  };

  // Moyenne 7 dernières vs 7 précédentes
  const recent7 = sorted.slice(-7).map(getScore).filter(x => x != null);
  const prev7 = sorted.slice(-14, -7).map(getScore).filter(x => x != null);

  const avg7 = recent7.length > 0 ? recent7.reduce((a, b) => a + b, 0) / recent7.length : null;
  const avgPrev = prev7.length > 0 ? prev7.reduce((a, b) => a + b, 0) / prev7.length : null;

  const metrics = [
    { label: 'Récupération moy. (7j)', val: avg7, prev: avgPrev, unit: '/10' },
    { label: 'Nb séances (7j)', val: sorted.filter(s => (Date.now() - new Date(s.date)) < 7 * 86400000).length, prev: sorted.filter(s => { const d = Date.now() - new Date(s.date); return d >= 7 * 86400000 && d < 14 * 86400000; }).length, unit: '' }
  ];

  return metrics.map(m => {
    if (m.val == null) return '';
    const delta = m.prev != null ? m.val - m.prev : null;
    let arrow = '→', arrowClass = 'stable', deltaStr = '';
    if (delta != null) {
      if (delta > 0.2) { arrow = '↑'; arrowClass = 'up'; }
      else if (delta < -0.2) { arrow = '↓'; arrowClass = 'down'; }
      deltaStr = `${delta > 0 ? '+' : ''}${delta.toFixed(1)}`;
    }
    return `
      <div class="tendance-item">
        <div>
          <div style="font-size:0.85rem;font-weight:600;">${m.label}</div>
          <div style="font-size:1.1rem;font-weight:700;color:var(--text);">${m.val.toFixed ? m.val.toFixed(1) : m.val}${m.unit}</div>
        </div>
        <div style="text-align:right;">
          <div class="tendance-arrow ${arrowClass}">${arrow}</div>
          ${deltaStr ? `<div class="tendance-delta" style="color:${arrowClass === 'up' ? 'var(--success)' : arrowClass === 'down' ? 'var(--danger)' : 'var(--text-light)'};">${deltaStr}</div>` : ''}
        </div>
      </div>`;
  }).join('') || '<p style="color:var(--text-light);font-size:0.85rem;">Données insuffisantes.</p>';
}

/* ——— Impact santé sur la condition ——— */
function renderHealthImpact(healthEvents) {
  if (healthEvents.length === 0) {
    return `
      <div class="alert-card success">
        <span class="alert-icon">✅</span>
        <div class="alert-content">
          <div class="alert-title">Aucun événement médical récent</div>
          <div class="alert-text">Condition non impactée par des soins.</div>
        </div>
      </div>`;
  }

  return healthEvents.map(h => {
    const daysAgo = Math.round((Date.now() - new Date(h.date || h.created_at)) / 86400000);
    const isBad = ['maladie', 'blessure', 'traitement'].includes((h.type || '').toLowerCase());

    // Estimer l'impact selon le type et l'ancienneté
    let impact = '';
    if (isBad && daysAgo <= 7) impact = 'Impact récent probable sur la condition';
    else if (isBad && daysAgo <= 14) impact = 'Récupération médicale en cours';
    else if (isBad) impact = 'Événement passé, surveiller les performances';

    return `
      <div style="display:flex;align-items:flex-start;gap:8px;padding:8px 0;border-bottom:1px solid var(--border);">
        <span style="font-size:1.1rem;">${isBad ? '🔴' : '🟢'}</span>
        <div>
          <div style="font-size:0.85rem;font-weight:600;">${h.type || h.evenement || 'Événement'}</div>
          <div style="font-size:0.75rem;color:var(--text-light);">Il y a ${daysAgo} jour(s) · ${formatDate(h.date || h.created_at)}</div>
          ${impact ? `<div style="font-size:0.75rem;color:${isBad ? 'var(--danger)' : 'var(--success)'};font-style:italic;margin-top:2px;">→ ${impact}</div>` : ''}
        </div>
      </div>`;
  }).join('');
}

/* ——— Performances récentes ——— */
function renderRecentPerfs(sessions, pigeonId) {
  if (sessions.length === 0) {
    return '<div class="empty-state"><p>Aucune séance enregistrée.</p></div>';
  }

  const sorted = [...sessions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8);

  return `
    <table class="table-modern">
      <thead>
        <tr>
          <th>Date</th>
          <th>Type</th>
          <th>Distance</th>
          <th>Récupération</th>
          <th>Condition</th>
          <th>Motivation</th>
        </tr>
      </thead>
      <tbody>
        ${sorted.map(s => {
          const r = (s.results || []).find(x => String(x.pigeon_id) === String(pigeonId));
          return `
            <tr>
              <td>${formatDate(s.date)}</td>
              <td>${sessionTypeBadge(s.session_type)}</td>
              <td>${s.distance_km != null ? s.distance_km + ' km' : '—'}</td>
              <td>${r?.recovery_score != null ? renderScoreBar(r.recovery_score) : '<span style="color:var(--text-light)">—</span>'}</td>
              <td>${r?.condition_score != null ? renderScoreBar(r.condition_score) : '<span style="color:var(--text-light)">—</span>'}</td>
              <td>${r?.motivation_score != null ? renderScoreBar(r.motivation_score) : '<span style="color:var(--text-light)">—</span>'}</td>
            </tr>`;
        }).join('')}
      </tbody>
    </table>`;
}
