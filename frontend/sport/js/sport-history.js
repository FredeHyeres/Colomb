/* ============================================================
   SPORT-HISTORY.JS — Historique complet d'un pigeon
   Timeline chronologique avec chart évolution
   ============================================================ */

let _historyChart = null;

async function loadHistory() {
  const content = document.getElementById('content');
  const btn = document.getElementById('btn-add');
  if (btn) btn.style.display = 'none';

  content.innerHTML = `
    <!-- Sélecteur de pigeon -->
    <div class="pigeon-select-bar">
      <label>🕊️ Pigeon :</label>
      <select class="form-control" id="history-pigeon-select">
        <option value="">Choisir un pigeon...</option>
      </select>
      <button class="btn btn-primary btn-sm" id="btn-load-history" disabled>Charger l'historique</button>
    </div>

    <div id="history-content">
      <div class="empty-state">
        <div class="empty-icon">📊</div>
        <h3>Sélectionnez un pigeon</h3>
        <p>L'historique complet s'affichera ici.</p>
      </div>
    </div>
  `;

  // Remplir le select
  const pigeons = await getPigeonsCache();
  const select = document.getElementById('history-pigeon-select');
  pigeons.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = `${p.matricule}${p.nom ? ' — ' + p.nom : ''}`;
    select.appendChild(opt);
  });

  select.addEventListener('change', () => {
    document.getElementById('btn-load-history').disabled = !select.value;
  });

  document.getElementById('btn-load-history').addEventListener('click', () => {
    if (select.value) loadPigeonHistory(select.value, pigeons.find(p => String(p.id) === select.value));
  });
}

/* ——— Charger et afficher l'historique complet d'un pigeon ——— */
async function loadPigeonHistory(pigeonId, pigeon) {
  const container = document.getElementById('history-content');
  container.innerHTML = '<div class="loader-spinner"></div>';

  // Détruire chart précédent si existant
  if (_historyChart) { _historyChart.destroy(); _historyChart = null; }

  try {
    // Chargement parallèle de toutes les sources
    const [sportHistory, healthEvents, perfs, aiRecs] = await Promise.all([
      SportAPI.getPigeonHistory(pigeonId).catch(() => ({ sessions: [], stats: {} })),
      ElevageAPI.getPigeonHealth(pigeonId).catch(() => []),
      ElevageAPI.getPigeonPerfs(pigeonId).catch(() => []),
      AIAPI.getRecommendations(pigeonId).catch(() => [])
    ]);

    const sessions = sportHistory.sessions || sportHistory || [];
    const health = Array.isArray(healthEvents) ? healthEvents : [];
    const perfList = Array.isArray(perfs) ? perfs : [];
    const recs = Array.isArray(aiRecs) ? aiRecs : [];

    // Construire la timeline unifiée
    const events = [];

    sessions.forEach(s => {
      const rawDate = s.session_date || s.date;
      if (!rawDate) return;
      events.push({
        type: s.session_type === 'race' ? 'race' : 'training',
        date: new Date(rawDate),
        title: s.session_type === 'race' ? '🏆 Concours' : `🏃 Séance ${s.session_type === 'loft' ? 'Loft' : 'Lancer'}`,
        desc: [
          s.distance_km ? `${s.distance_km} km` : null,
          s.recovery_score != null ? `Récup: ${s.recovery_score}/10` : null,
          s.internal_rank ? `Rang #${s.internal_rank}` : null,
          s.weather || null
        ].filter(Boolean).join(' · '),
        raw: s
      });
    });

    perfList.forEach(p => {
      events.push({
        type: 'race',
        date: new Date(p.date || p.created_at),
        title: `🏆 ${p.competition || p.concours || 'Concours'}`,
        desc: [
          p.distance ? `${p.distance} km` : null,
          p.classement ? `Classement: ${p.classement}` : null,
          p.vitesse ? `${p.vitesse} m/min` : null
        ].filter(Boolean).join(' · '),
        raw: p
      });
    });

    health.forEach(h => {
      const isBad = ['maladie', 'blessure', 'traitement'].includes((h.type || '').toLowerCase());
      events.push({
        type: isBad ? 'health' : 'health-ok',
        date: new Date(h.date || h.created_at),
        title: `${isBad ? '🏥' : '💊'} ${h.type || h.evenement || 'Événement santé'}`,
        desc: h.description || h.notes || h.traitement || '',
        raw: h
      });
    });

    recs.forEach(r => {
      events.push({
        type: 'ai',
        date: new Date(r.created_at || Date.now()),
        title: `🤖 ${r.title || r.recommendation_type || 'Recommandation IA'}`,
        desc: r.message || r.content || '',
        raw: r
      });
    });

    // Tri chronologique décroissant
    events.sort((a, b) => b.date - a.date);

    // Données pour le chart (10 dernières séances avec recovery_score)
    const sessionResults = sessions
      .map(s => ({ date: s.session_date || s.date, score: s.recovery_score }))
      .filter(x => x.score != null && x.date)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(-10);

    // Stats
    const stats = sportHistory.stats || {};
    const avgRec = sessionResults.length > 0
      ? (sessionResults.reduce((s, x) => s + x.score, 0) / sessionResults.length).toFixed(1)
      : '—';

    container.innerHTML = `
      <!-- En-tête pigeon -->
      <div class="card" style="margin-bottom:16px;">
        <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
          <div style="font-size:3rem;">🕊️</div>
          <div>
            <div style="font-size:1.2rem;font-weight:700;">${pigeon?.matricule || '—'}</div>
            ${pigeon?.nom ? `<div style="color:var(--text-light);">${pigeon.nom}</div>` : ''}
            ${pigeon?.lignee ? `<div><span class="badge badge-info">${pigeon.lignee}</span></div>` : ''}
          </div>
          <div style="display:flex;gap:16px;margin-left:auto;flex-wrap:wrap;">
            <div class="stat-card stat-blue" style="min-width:100px;padding:12px 16px;">
              <div class="stat-value">${sessions.length}</div>
              <div class="stat-label">Séances</div>
            </div>
            <div class="stat-card stat-green" style="min-width:100px;padding:12px 16px;">
              <div class="stat-value">${avgRec}</div>
              <div class="stat-label">Récup moy.</div>
            </div>
            <div class="stat-card stat-gold" style="min-width:100px;padding:12px 16px;">
              <div class="stat-value">${perfList.length}</div>
              <div class="stat-label">Concours</div>
            </div>
            <div class="stat-card stat-purple" style="min-width:100px;padding:12px 16px;">
              <div class="stat-value">${recs.filter(r => !r.resolved_at).length}</div>
              <div class="stat-label">Alertes IA</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Chart évolution récupération -->
      ${sessionResults.length > 0 ? `
      <div class="card" style="margin-bottom:16px;">
        <div class="card-header">
          <div class="card-title">📈 Évolution récupération — 10 dernières séances</div>
        </div>
        <div class="chart-container" style="height:200px;">
          <canvas id="history-chart"></canvas>
        </div>
      </div>` : ''}

      <!-- Timeline -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">📅 Timeline complète (${events.length} événements)</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <span class="chip" style="color:var(--sport-blue);border-color:var(--sport-blue);">🏃 Séances</span>
            <span class="chip" style="color:var(--sport-gold);border-color:var(--sport-gold);">🏆 Concours</span>
            <span class="chip" style="color:var(--sport-red);border-color:var(--sport-red);">🏥 Santé</span>
            <span class="chip" style="color:var(--sport-purple);border-color:var(--sport-purple);">🤖 IA</span>
          </div>
        </div>
        ${events.length === 0
          ? '<div class="empty-state"><p>Aucun événement enregistré pour ce pigeon.</p></div>'
          : `<div class="timeline">
              ${events.map(e => `
                <div class="timeline-item">
                  <div class="timeline-dot ${e.type}"></div>
                  <div class="timeline-date">${formatDate(e.date.toISOString())}</div>
                  <div class="timeline-title">${e.title}</div>
                  ${e.desc ? `<div class="timeline-desc">${e.desc}</div>` : ''}
                </div>`).join('')}
            </div>`}
      </div>
    `;

    // Rendu chart Chart.js
    if (sessionResults.length > 0) {
      const ctx = document.getElementById('history-chart').getContext('2d');
      _historyChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: sessionResults.map(x => formatDateShort(x.date)),
          datasets: [{
            label: 'Score récupération',
            data: sessionResults.map(x => x.score),
            borderColor: '#2980B9',
            backgroundColor: 'rgba(41,128,185,0.1)',
            pointBackgroundColor: sessionResults.map(x => scoreColor(x.score)),
            pointRadius: 5,
            tension: 0.3,
            fill: true
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: {
              min: 0, max: 10,
              ticks: { stepSize: 2, font: { size: 11 } },
              grid: { color: '#e8ecf0' }
            },
            x: { ticks: { font: { size: 11 } }, grid: { display: false } }
          }
        }
      });
    }

  } catch (err) {
    container.innerHTML = `<div class="card"><p style="color:var(--danger);">Erreur : ${err.message}</p></div>`;
    showToast(err.message, 'error');
  }
}
