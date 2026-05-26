/* ============================================================
   SPORT-ANALYTICS.JS — Analytics avec Chart.js
   4 graphiques : récupération, charge, température vs récup, régularité
   ============================================================ */

// Registre des charts pour destruction propre
let _analyticsCharts = {};

async function loadAnalytics() {
  const content = document.getElementById('content');
  const btn = document.getElementById('btn-add');
  if (btn) btn.style.display = 'none';

  content.innerHTML = '<div class="loader-spinner"></div>';

  // Détruire charts précédents
  Object.values(_analyticsCharts).forEach(c => { try { c.destroy(); } catch(e) {} });
  _analyticsCharts = {};

  try {
    const [sessions, pigeons] = await Promise.all([
      SportAPI.getSessions(0, 200),
      getPigeonsCache()
    ]);

    const sessionList = Array.isArray(sessions) ? sessions : (sessions.items || sessions.results || []);

    // Charger historiques des 3 premiers pigeons pour régularité
    const top3 = pigeons.slice(0, 5);
    const histories = await Promise.all(
      top3.map(p => SportAPI.getPigeonHistory(p.id).catch(() => ({ sessions: [] })))
    );

    // Données agrégées
    const recoveryData = computeRecoveryTrend(sessionList);
    const chargeData = computeWeeklyCharge(sessionList);
    const tempScatterData = computeTempVsRecovery(sessionList);
    const regularityData = computeRegularity(top3, histories);

    content.innerHTML = `
      <!-- KPI row -->
      <div class="metric-grid" style="margin-bottom:20px;">
        <div class="stat-card stat-blue">
          <div class="stat-icon">📊</div>
          <div class="stat-value">${sessionList.length}</div>
          <div class="stat-label">Total séances</div>
        </div>
        <div class="stat-card stat-green">
          <div class="stat-icon">⚡</div>
          <div class="stat-value">${computeGlobalAvgRecovery(sessionList)}</div>
          <div class="stat-label">Récup. globale moy.</div>
        </div>
        <div class="stat-card stat-orange">
          <div class="stat-icon">🏆</div>
          <div class="stat-value">${sessionList.filter(s => s.session_type === 'race').length}</div>
          <div class="stat-label">Concours disputés</div>
        </div>
        <div class="stat-card stat-gold">
          <div class="stat-icon">📅</div>
          <div class="stat-value">${chargeData.avgPerWeek}</div>
          <div class="stat-label">Séances / semaine moy.</div>
        </div>
      </div>

      <!-- Grille de charts -->
      <div class="chart-grid">

        <!-- Chart 1 : évolution récupération -->
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">📈 Évolution récupération moyenne</div>
              <div class="card-subtitle">90 derniers jours</div>
            </div>
          </div>
          <div class="chart-container">
            <canvas id="chart-recovery"></canvas>
          </div>
        </div>

        <!-- Chart 2 : charge entraînement -->
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">💪 Charge d'entraînement</div>
              <div class="card-subtitle">4 dernières semaines</div>
            </div>
          </div>
          <div class="chart-container">
            <canvas id="chart-charge"></canvas>
          </div>
        </div>

        <!-- Chart 3 : température vs récupération -->
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">🌡️ Température vs Récupération</div>
              <div class="card-subtitle">Corrélation météo / performance</div>
            </div>
          </div>
          <div class="chart-container">
            <canvas id="chart-temp"></canvas>
          </div>
        </div>

        <!-- Chart 4 : régularité par pigeon -->
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">🕊️ Régularité par pigeon</div>
              <div class="card-subtitle">Évolution récupération — top ${top3.length} pigeons</div>
            </div>
          </div>
          <div class="chart-container">
            <canvas id="chart-regularity"></canvas>
          </div>
        </div>

      </div>
    `;

    // Rendre les charts
    renderRecoveryChart(recoveryData);
    renderChargeChart(chargeData);
    renderTempChart(tempScatterData);
    renderRegularityChart(regularityData, top3);

  } catch (err) {
    content.innerHTML = `<div class="card"><p style="color:var(--danger);">Erreur analytics : ${err.message}</p></div>`;
    showToast(err.message, 'error');
  }
}

/* ——— Données : récupération moyenne par jour (90j) ——— */
function computeRecoveryTrend(sessions) {
  const today = new Date();
  const days = {};

  for (let i = 89; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    days[key] = { sum: 0, count: 0 };
  }

  sessions.forEach(s => {
    const key = (s.date || '').split('T')[0];
    if (!days[key]) return;
    const r = s.results || [];
    const scores = r.filter(x => x.recovery_score != null).map(x => x.recovery_score);
    if (s.avg_recovery != null) {
      days[key].sum += s.avg_recovery;
      days[key].count++;
    } else if (scores.length > 0) {
      days[key].sum += scores.reduce((a, b) => a + b, 0) / scores.length;
      days[key].count++;
    }
  });

  return {
    labels: Object.keys(days).map(d => formatDateShort(d)),
    values: Object.values(days).map(d => d.count > 0 ? +(d.sum / d.count).toFixed(2) : null)
  };
}

/* ——— Données : charge par semaine (4 semaines) ——— */
function computeWeeklyCharge(sessions) {
  const weeks = [];
  const today = new Date();

  for (let w = 3; w >= 0; w--) {
    const from = new Date(today);
    from.setDate(from.getDate() - (w + 1) * 7);
    const to = new Date(today);
    to.setDate(to.getDate() - w * 7);

    const inWeek = sessions.filter(s => {
      const d = new Date(s.date);
      return d >= from && d < to;
    });

    const loft = inWeek.filter(s => s.session_type === 'loft').length;
    const toss = inWeek.filter(s => s.session_type === 'toss').length;
    const race = inWeek.filter(s => s.session_type === 'race').length;

    weeks.push({
      label: `S-${w === 0 ? 'actuelle' : w}`,
      loft, toss, race, total: inWeek.length
    });
  }

  const avgPerWeek = weeks.length > 0
    ? +(weeks.reduce((s, w) => s + w.total, 0) / weeks.length).toFixed(1)
    : 0;

  return { weeks, avgPerWeek };
}

/* ——— Données : scatter température vs récupération ——— */
function computeTempVsRecovery(sessions) {
  const points = [];
  sessions.forEach(s => {
    const temp = s.temperature ?? s.temperature_c;
    if (temp == null) return;
    const scores = (s.results || []).filter(x => x.recovery_score != null).map(x => x.recovery_score);
    if (s.avg_recovery != null) {
      points.push({ x: temp, y: s.avg_recovery });
    } else if (scores.length > 0) {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      points.push({ x: temp, y: +avg.toFixed(2) });
    }
  });
  return points;
}

/* ——— Données : régularité par pigeon ——— */
function computeRegularity(pigeons, histories) {
  return pigeons.map((p, idx) => {
    const hist = histories[idx];
    // getPigeonHistory retourne un tableau plat de PigeonTrainingResultResponse
    const sessionList = Array.isArray(hist) ? hist : (hist?.sessions || []);
    const sorted = [...sessionList].sort((a, b) =>
      new Date(a.session_date || a.date) - new Date(b.session_date || b.date)
    );
    const last8 = sorted.slice(-8);
    const scores = last8.map(s => s.recovery_score ?? null).filter(x => x != null);
    return {
      pigeon: p,
      scores,
      labels: last8.map(s => formatDateShort(s.session_date || s.date))
    };
  });
}

/* ——— Récup globale moyenne ——— */
function computeGlobalAvgRecovery(sessions) {
  const all = [];
  sessions.forEach(s => {
    if (s.avg_recovery != null) { all.push(s.avg_recovery); return; }
    (s.results || []).forEach(r => {
      if (r.recovery_score != null) all.push(r.recovery_score);
    });
  });
  if (all.length === 0) return '—';
  return (all.reduce((a, b) => a + b, 0) / all.length).toFixed(1);
}

/* ——— Chart 1 : Récupération ——— */
function renderRecoveryChart(data) {
  const ctx = document.getElementById('chart-recovery');
  if (!ctx) return;

  _analyticsCharts.recovery = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.labels,
      datasets: [{
        label: 'Récupération moyenne',
        data: data.values,
        borderColor: '#2980B9',
        backgroundColor: 'rgba(41,128,185,0.08)',
        pointBackgroundColor: '#2980B9',
        pointRadius: 3,
        tension: 0.4,
        fill: true,
        spanGaps: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { mode: 'index', intersect: false }
      },
      scales: {
        y: {
          min: 0, max: 10,
          ticks: { stepSize: 2, font: { size: 11 } },
          grid: { color: '#e8ecf0' }
        },
        x: {
          ticks: {
            maxTicksLimit: 8,
            font: { size: 10 },
            maxRotation: 0
          },
          grid: { display: false }
        }
      }
    }
  });
}

/* ——— Chart 2 : Charge ——— */
function renderChargeChart(data) {
  const ctx = document.getElementById('chart-charge');
  if (!ctx) return;

  _analyticsCharts.charge = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.weeks.map(w => w.label),
      datasets: [
        {
          label: 'Loft',
          data: data.weeks.map(w => w.loft),
          backgroundColor: 'rgba(41,128,185,0.75)',
          borderRadius: 4
        },
        {
          label: 'Lancer',
          data: data.weeks.map(w => w.toss),
          backgroundColor: 'rgba(39,174,96,0.75)',
          borderRadius: 4
        },
        {
          label: 'Concours',
          data: data.weeks.map(w => w.race),
          backgroundColor: 'rgba(196,150,58,0.85)',
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { font: { size: 11 }, boxWidth: 12 } }
      },
      scales: {
        x: { stacked: true, grid: { display: false } },
        y: { stacked: true, ticks: { stepSize: 1, font: { size: 11 } }, grid: { color: '#e8ecf0' } }
      }
    }
  });
}

/* ——— Chart 3 : Scatter température ——— */
function renderTempChart(points) {
  const ctx = document.getElementById('chart-temp');
  if (!ctx) return;

  _analyticsCharts.temp = new Chart(ctx, {
    type: 'scatter',
    data: {
      datasets: [{
        label: 'Température vs Récupération',
        data: points,
        backgroundColor: points.map(p => {
          if (p.y >= 7) return 'rgba(39,174,96,0.7)';
          if (p.y >= 4) return 'rgba(230,126,34,0.7)';
          return 'rgba(231,76,60,0.7)';
        }),
        pointRadius: 6,
        pointHoverRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.parsed.x}°C → Récup: ${ctx.parsed.y}/10`
          }
        }
      },
      scales: {
        x: {
          title: { display: true, text: 'Température (°C)', font: { size: 11 } },
          grid: { color: '#e8ecf0' }
        },
        y: {
          min: 0, max: 10,
          title: { display: true, text: 'Récupération', font: { size: 11 } },
          grid: { color: '#e8ecf0' }
        }
      }
    }
  });

  if (points.length === 0) {
    const wrap = ctx.parentElement;
    wrap.innerHTML = '<div class="empty-state" style="padding:30px;"><p>Pas assez de données avec température renseignée.</p></div>';
  }
}

/* ——— Chart 4 : Régularité ——— */
function renderRegularityChart(regularityData, pigeons) {
  const ctx = document.getElementById('chart-regularity');
  if (!ctx) return;

  const colors = ['#2980B9', '#27AE60', '#E67E22', '#8E44AD', '#C4963A'];

  // Utiliser les labels de la première série ou générer
  const maxLen = Math.max(...regularityData.map(d => d.scores.length), 0);
  const labels = maxLen > 0
    ? (regularityData.find(d => d.labels.length === maxLen)?.labels || Array.from({length: maxLen}, (_, i) => `S${i+1}`))
    : [];

  const datasets = regularityData
    .filter(d => d.scores.length > 0)
    .map((d, idx) => ({
      label: d.pigeon.matricule || `Pigeon ${idx + 1}`,
      data: d.scores,
      borderColor: colors[idx % colors.length],
      backgroundColor: 'transparent',
      pointRadius: 3,
      tension: 0.3
    }));

  if (datasets.length === 0) {
    ctx.parentElement.innerHTML = '<div class="empty-state" style="padding:30px;"><p>Aucune donnée de récupération disponible.</p></div>';
    return;
  }

  _analyticsCharts.regularity = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { font: { size: 11 }, boxWidth: 12, usePointStyle: true }
        }
      },
      scales: {
        y: {
          min: 0, max: 10,
          ticks: { stepSize: 2, font: { size: 11 } },
          grid: { color: '#e8ecf0' }
        },
        x: {
          ticks: { maxTicksLimit: 6, font: { size: 10 } },
          grid: { display: false }
        }
      }
    }
  });
}
