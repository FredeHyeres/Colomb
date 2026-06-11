/* ============================================================
   SPORT-COLONY.JS — Monitoring global de la colonie
   Vue d'ensemble de tous les pigeons, mini-cards, doughnut
   ============================================================ */

let _colonyChart = null;

async function loadColony() {
  const content = document.getElementById('content');
  const btn = document.getElementById('btn-add');
  if (btn) btn.style.display = 'none';

  content.innerHTML = '<div class="loader-spinner"></div>';

  // Détruire chart précédent
  if (_colonyChart) { try { _colonyChart.destroy(); } catch(e) {} _colonyChart = null; }

  try {
    const pigeons = await getPigeonsCache();

    // Exclure les pigeons décédés
    const activePigeons = pigeons.filter(p => p.statut?.toLowerCase() !== 'decede');

    // Charger snapshots pour tous les pigeons en parallèle
    const snapshotsAll = await Promise.all(
      activePigeons.map(p => AIAPI.getSnapshots(p.id).catch(() => []))
    );

    // Associer dernier snapshot à chaque pigeon
    const pigeonData = activePigeons.map((p, idx) => {
      const snapList = Array.isArray(snapshotsAll[idx]) ? snapshotsAll[idx] : [];
      const lastSnap = snapList.length > 0
        ? snapList.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
        : null;
      return { pigeon: p, snap: lastSnap };
    });

    // Catégoriser les pigeons
    const categories = categorizePigeons(pigeonData);

    // Stat totaux
    const total = activePigeons.length;
    const active = pigeonData.filter(d => d.pigeon.statut !== 'repos').length;
    const repos = pigeonData.filter(d => d.pigeon.statut === 'repos').length;
    const surveillance = categories.probleme.length + categories.surveillance.length;

    content.innerHTML = `
      <!-- Stats colonie -->
      <div class="metric-grid" style="margin-bottom:20px;">
        <div class="stat-card stat-blue">
          <div class="stat-icon">🕊️</div>
          <div class="stat-value">${total}</div>
          <div class="stat-label">${t('sport.colony.stats.total')}</div>
        </div>
        <div class="stat-card stat-green">
          <div class="stat-icon">💚</div>
          <div class="stat-value">${categories.forme.length}</div>
          <div class="stat-label">${t('sport.colony.stats.forme')}</div>
        </div>
        <div class="stat-card stat-orange">
          <div class="stat-icon">😴</div>
          <div class="stat-value">${categories.repos.length}</div>
          <div class="stat-label">${t('sport.colony.stats.repos')}</div>
        </div>
        <div class="stat-card stat-red">
          <div class="stat-icon">⚠️</div>
          <div class="stat-value">${surveillance}</div>
          <div class="stat-label">${t('sport.colony.stats.surveillance_medicale')}</div>
        </div>
      </div>

      <!-- Vue principale -->
      <div class="dashboard-row">

        <!-- Grille pigeons -->
        <div class="card flex-2">
          <div class="card-header">
            <div class="card-title">${t('sport.colony.title')}</div>
            <div class="card-subtitle">${t('sport.colony.subtitle', { count: pigeonData.length })}</div>
          </div>

          <!-- Légende -->
          <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px;">
            <span class="badge badge-success">${t('sport.colony.legend.forme')}</span>
            <span class="badge badge-warning">${t('sport.colony.legend.moyen')}</span>
            <span class="badge badge-secondary">${t('sport.colony.legend.repos')}</span>
            <span class="badge badge-danger">${t('sport.colony.legend.alerte')}</span>
          </div>

          <div class="pigeon-grid">
            ${pigeonData.map(d => renderPigeonMiniCard(d)).join('')}
          </div>
        </div>

        <!-- Doughnut + résumé -->
        <div style="display:flex;flex-direction:column;gap:16px;flex:1;">
          <div class="card">
            <div class="card-header">
              <div class="card-title">${t('sport.colony.doughnut_title')}</div>
            </div>
            <div style="height:220px;position:relative;">
              <canvas id="colony-chart"></canvas>
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;">
              <span style="font-size:0.78rem;color:var(--sport-green);">${t('sport.colony.legend_summary.forme', { count: categories.forme.length })}</span>
              <span style="font-size:0.78rem;color:var(--sport-orange);">${t('sport.colony.legend_summary.surveillance', { count: categories.surveillance.length })}</span>
              <span style="font-size:0.78rem;color:var(--text-light);">${t('sport.colony.legend_summary.repos', { count: categories.repos.length })}</span>
              <span style="font-size:0.78rem;color:var(--sport-red);">${t('sport.colony.legend_summary.probleme', { count: categories.probleme.length })}</span>
            </div>
          </div>

          <!-- Alertes colonie -->
          <div class="card">
            <div class="card-header">
              <div class="card-title">${t('sport.colony.alerts_title')}</div>
            </div>
            ${renderColonyAlerts(categories)}
          </div>
        </div>
      </div>
    `;

    // Rendu doughnut
    renderColonyDoughnut(categories);

    // Clics sur les mini-cards → page condition avec pré-sélection
    document.querySelectorAll('.pigeon-mini-card[data-pigeon-id]').forEach(card => {
      card.addEventListener('click', () => {
        const pigeonId = card.dataset.pigeonId; // UUID string, pas parseInt
        sessionStorage.setItem('sport_selected_pigeon', pigeonId);
        showPage('condition');
      });
    });

  } catch (err) {
    content.innerHTML = `<div class="card"><p style="color:var(--danger);">${t('sport.error.prefix', { message: err.message })}</p></div>`;
    showToast(err.message, 'error');
  }
}

/* ——— Catégoriser les pigeons selon leur condition ——— */
function categorizePigeons(pigeonData) {
  const categories = { forme: [], surveillance: [], repos: [], probleme: [] };

  pigeonData.forEach(d => {
    const { pigeon, snap } = d;
    const statut = pigeon.statut?.toLowerCase() || '';

    if (statut === 'repos' || statut === 'retraite') {
      categories.repos.push(d);
      return;
    }

    if (!snap) {
      // Pas de snapshot → statut inconnu, on met en surveillance légère
      categories.surveillance.push(d);
      return;
    }

    const f = (snap.features && typeof snap.features === 'object') ? snap.features : {};
    const fatigueMap = { eleve: 80, moyen: 50, faible: 20 };
    const fatigue = typeof f.fatigue_risk === 'string' ? (fatigueMap[f.fatigue_risk] ?? 0) : 0;
    const condition = f.condition_avg_7d != null ? f.condition_avg_7d * 10 : 50;
    const recovery = f.recovery_avg_7d != null ? f.recovery_avg_7d * 10 : 50;

    if (fatigue > 70 || condition < 30 || recovery < 30) {
      categories.probleme.push(d);
    } else if (fatigue > 50 || condition < 50) {
      categories.surveillance.push(d);
    } else {
      categories.forme.push(d);
    }
  });

  return categories;
}

/* ——— Rendu mini-card pigeon ——— */
function renderPigeonMiniCard(d) {
  const { pigeon, snap } = d;
  const statut = pigeon.statut?.toLowerCase() || '';

  // Déterminer badge statut sport
  let statusBadge, statusColor;
  if (statut === 'repos' || statut === 'retraite') {
    statusBadge = t('sport.colony.status.repos');
    statusColor = 'badge-secondary';
  } else if (!snap) {
    statusBadge = t('sport.colony.status.non_evalue');
    statusColor = 'badge-secondary';
  } else {
    const sf = (snap.features && typeof snap.features === 'object') ? snap.features : {};
    const fatigueMap = { eleve: 80, moyen: 50, faible: 20 };
    const fatigue = typeof sf.fatigue_risk === 'string' ? (fatigueMap[sf.fatigue_risk] ?? 0) : 0;
    const cond100 = sf.condition_avg_7d != null ? sf.condition_avg_7d * 10 : 50;
    if (fatigue > 70 || cond100 < 30) {
      statusBadge = t('sport.colony.status.alerte');
      statusColor = 'badge-danger';
    } else if (fatigue > 50 || cond100 < 50) {
      statusBadge = t('sport.colony.status.moyen');
      statusColor = 'badge-warning';
    } else {
      statusBadge = t('sport.colony.status.forme');
      statusColor = 'badge-success';
    }
  }

  const sf2 = snap?.features && typeof snap.features === 'object' ? snap.features : {};
  const recovery = sf2.recovery_avg_7d != null ? sf2.recovery_avg_7d / 10 : null;
  const condition = sf2.condition_avg_7d != null ? sf2.condition_avg_7d / 10 : null;

  return `
    <div class="pigeon-mini-card" data-pigeon-id="${pigeon.id}" title="${t('sport.colony.click_to_analyze')}">
      <div class="pigeon-mini-icon">🕊️</div>
      <div class="pigeon-mini-bague">${pigeon.matricule || '—'}</div>
      ${pigeon.nom ? `<div class="pigeon-mini-name">${pigeon.nom}</div>` : '<div class="pigeon-mini-name" style="height:16px;"></div>'}
      <div style="margin-bottom:6px;"><span class="badge ${statusColor}" style="font-size:0.7rem;">${statusBadge}</span></div>
      ${recovery != null || condition != null ? `
        <div class="pigeon-mini-scores">
          ${recovery != null ? `
            <div style="font-size:0.7rem;color:var(--text-light);margin-bottom:2px;">${t('sport.colony.recovery')}</div>
            ${renderScoreBar(recovery / 10)}
          ` : ''}
          ${condition != null ? `
            <div style="font-size:0.7rem;color:var(--text-light);margin-top:4px;margin-bottom:2px;">${t('sport.colony.condition')}</div>
            ${renderScoreBar(condition / 10)}
          ` : ''}
        </div>` : `<div style="font-size:0.72rem;color:var(--text-light);margin-top:4px;">${t('sport.colony.no_data')}</div>`}
    </div>`;
}

/* ——— Alertes de la colonie ——— */
function renderColonyAlerts(categories) {
  const alerts = [...categories.probleme, ...categories.surveillance.slice(0, 3)];

  if (alerts.length === 0) {
    return `
      <div class="alert-card success">
        <span class="alert-icon">✅</span>
        <div class="alert-content">
          <div class="alert-title">${t('sport.colony.alerts.healthy_title')}</div>
          <div class="alert-text">${t('sport.colony.alerts.healthy_text')}</div>
        </div>
      </div>`;
  }

  return alerts.map(d => {
    const { pigeon, snap } = d;
    const isProbleme = categories.probleme.includes(d);
    const af = (snap?.features && typeof snap.features === 'object') ? snap.features : {};
    const fatigueLabel = af.fatigue_risk || null;
    const fatigueMap2 = { eleve: 80, moyen: 50, faible: 20 };
    const fatigue = typeof fatigueLabel === 'string' ? (fatigueMap2[fatigueLabel] ?? 0) : 0;
    const condition = af.condition_avg_7d != null ? af.condition_avg_7d * 10 : null;

    let reason = '';
    if (!snap) reason = t('sport.colony.alerts.no_snapshot');
    else if (fatigue > 70) reason = t('sport.colony.alerts.high_fatigue', { label: t(`sport.colony.fatigue.${fatigueLabel}`) });
    else if (condition != null && condition < 30) reason = t('sport.colony.alerts.low_condition', { value: condition.toFixed(0) });
    else reason = t('sport.colony.alerts.monitor');

    return `
      <div class="alert-card ${isProbleme ? 'critical' : 'warning'}" style="margin-bottom:8px;">
        <span class="alert-icon">${isProbleme ? '⚠️' : '💡'}</span>
        <div class="alert-content">
          <div class="alert-title">${pigeon.matricule || '—'}${pigeon.nom ? ' — ' + pigeon.nom : ''}</div>
          <div class="alert-text">${reason}</div>
        </div>
      </div>`;
  }).join('');
}

/* ——— Doughnut Chart.js ——— */
function renderColonyDoughnut(categories) {
  const ctx = document.getElementById('colony-chart');
  if (!ctx) return;

  const data = [
    categories.forme.length,
    categories.surveillance.length,
    categories.repos.length,
    categories.probleme.length
  ];

  // Si tout est à 0, afficher 1 factice
  const total = data.reduce((a, b) => a + b, 0);
  if (total === 0) {
    ctx.parentElement.innerHTML = `<div class="empty-state" style="padding:30px;"><p>${t('sport.colony.doughnut.no_data')}</p></div>`;
    return;
  }

  _colonyChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: [
        t('sport.colony.doughnut.labels.forme'),
        t('sport.colony.doughnut.labels.surveillance'),
        t('sport.colony.doughnut.labels.repos'),
        t('sport.colony.doughnut.labels.probleme')
      ],
      datasets: [{
        data,
        backgroundColor: ['#27AE60', '#E67E22', '#95A5A6', '#E74C3C'],
        borderColor: '#ffffff',
        borderWidth: 3,
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => t('sport.colony.doughnut.tooltip', { label: ctx.label, count: ctx.parsed })
          }
        }
      },
      cutout: '60%'
    }
  });
}
