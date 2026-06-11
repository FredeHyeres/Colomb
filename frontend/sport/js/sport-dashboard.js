/* ============================================================
   SPORT-DASHBOARD.JS — Dashboard principal Sport
   ============================================================ */

function renderEmptyState(icon, title, subtitle = '') {
  return `
    <div class="empty-state" style="padding:40px 20px;">
      <div class="empty-icon">${icon}</div>
      <h3>${title}</h3>
      ${subtitle ? `<p>${subtitle}</p>` : ''}
    </div>`;
}

async function loadSportDashboard() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loader-spinner"></div>';

  let pigeons = [];
  try {
    const [, p] = await Promise.all([
      SportAPI.getDashboard().catch(() => ({})),
      getPigeonsCache()
    ]);
    pigeons = p;
  } catch (err) {
    content.innerHTML = renderEmptyState('⚠️', t('sport.error.load_title'), err.message);
    return;
  }

  const totalPigeons = pigeons.length || 0;

  content.innerHTML = `
    <!-- Stat cards -->
    <div class="metric-grid">
      <div class="stat-card stat-blue">
        <div class="stat-icon">🕊️</div>
        <div class="stat-value">${totalPigeons}</div>
        <div class="stat-label">${t('sport.dashboard.stats.pigeons_actifs')}</div>
      </div>
      <div class="stat-card stat-green">
        <div class="stat-icon">🏃</div>
        <div class="stat-value" id="stat-sessions">—</div>
        <div class="stat-label">${t('sport.dashboard.stats.sessions_mois')}</div>
      </div>
      <div class="stat-card stat-gold">
        <div class="stat-icon">⚡</div>
        <div class="stat-value" id="stat-recovery">—</div>
        <div class="stat-label">${t('sport.dashboard.stats.recup_moyenne')}</div>
      </div>
      <div class="stat-card stat-purple">
        <div class="stat-icon">🤖</div>
        <div class="stat-value" id="stat-alerts">—</div>
        <div class="stat-label">${t('sport.dashboard.stats.alertes_ia')}</div>
      </div>
    </div>

    <!-- Alertes IA + Santé -->
    <div class="dashboard-row">
      <div class="card flex-2">
        <div class="card-header">
          <div>
            <div class="card-title">${t('sport.dashboard.ai_alerts.title')}</div>
            <div class="card-subtitle">${t('sport.dashboard.ai_alerts.subtitle')}</div>
          </div>
          <a href="#" class="btn btn-sm btn-ghost" data-page-link="ai">${t('sport.dashboard.view_all')}</a>
        </div>
        <div id="widget-ai-alerts"><div class="loader-spinner"></div></div>
      </div>
      <div class="card flex-1">
        <div class="card-header">
          <div>
            <div class="card-title">${t('sport.dashboard.health.title')}</div>
            <div class="card-subtitle">${t('sport.dashboard.health.subtitle')}</div>
          </div>
        </div>
        <div id="widget-health"><div class="loader-spinner"></div></div>
      </div>
    </div>

    <!-- Feedbacks en attente -->
    <div class="card" style="margin-bottom:16px;">
      <div class="card-header">
        <div>
          <div class="card-title">${t('sport.dashboard.pending_feedback.title')}</div>
          <div class="card-subtitle">${t('sport.dashboard.pending_feedback.subtitle')}</div>
        </div>
      </div>
      <div id="widget-pending-feedback"><div class="loader-spinner"></div></div>
    </div>

    <!-- Dernières séances + Nutrition -->
    <div class="dashboard-row">
      <div class="card flex-2">
        <div class="card-header">
          <div>
            <div class="card-title">${t('sport.dashboard.recent_sessions.title')}</div>
            <div class="card-subtitle">${t('sport.dashboard.recent_sessions.subtitle')}</div>
          </div>
          <a href="#" class="btn btn-sm btn-ghost" data-page-link="sessions">${t('sport.dashboard.recent_sessions.view_all')}</a>
        </div>
        <div id="widget-sessions"><div class="loader-spinner"></div></div>
      </div>
      <div class="card flex-1">
        <div class="card-header">
          <div>
            <div class="card-title">${t('sport.dashboard.nutrition.title')}</div>
            <div class="card-subtitle">${t('sport.dashboard.nutrition.subtitle')}</div>
          </div>
        </div>
        <div id="widget-nutrition"><div class="loader-spinner"></div></div>
      </div>
    </div>
  `;

  // Liens de navigation internes
  content.querySelectorAll('[data-page-link]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      showPage(el.dataset.pageLink);
    });
  });

  // Charger les widgets en parallèle
  loadAIAlertWidget(pigeons);
  loadPendingFeedbackWidget(pigeons);
  loadHealthWidget(pigeons);
  loadRecentSessionsWidget();
  loadNutritionWidget();
}

/* ——— Widget feedbacks en attente ——— */
async function loadPendingFeedbackWidget(pigeons) {
  const el = document.getElementById('widget-pending-feedback');
  if (!el) return;

  try {
    if (!pigeons || pigeons.length === 0) {
      el.innerHTML = renderEmptyState('🕊️', t('sport.dashboard.pending_feedback.no_pigeons_title'), t('sport.dashboard.pending_feedback.no_pigeons_text'));
      return;
    }

    const allRecs = await Promise.all(
      pigeons.map(p => AIAPI.getRecommendations(p.id).catch(() => []))
    );

    const pending = [];
    allRecs.forEach((recs, idx) => {
      (recs || []).filter(r => !r.resolved_at).forEach(r => {
        pending.push({ ...r, _pigeon: pigeons[idx] });
      });
    });

    if (pending.length === 0) {
      el.innerHTML = renderEmptyState('✅', t('sport.dashboard.pending_feedback.none_title'), t('sport.dashboard.pending_feedback.none_text'));
      return;
    }

    const recMap = {
      concours:           { label: t('sport.dashboard.pending_feedback.rec_map.concours'),           cls: 'badge-success' },
      entrainement_leger: { label: t('sport.dashboard.pending_feedback.rec_map.entrainement_leger'), cls: 'badge-info' },
      repos:              { label: t('sport.dashboard.pending_feedback.rec_map.repos'),              cls: 'badge-warning' },
      reforme:            { label: t('sport.dashboard.pending_feedback.rec_map.reforme'),            cls: 'badge-danger' },
    };

    el.innerHTML = pending.slice(0, 10).map(r => {
      const s = recMap[r.recommendation] || { label: r.recommendation || t('sport.dashboard.pending_feedback.rec_map.default'), cls: 'badge-info' };
      const p = r._pigeon;
      return `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);">
          <div style="display:flex;align-items:center;gap:8px;min-width:0;">
            <span class="chip" style="flex-shrink:0;">${p.matricule}${p.nom ? ' — ' + p.nom : ''}</span>
            <span class="badge ${s.cls}" style="flex-shrink:0;">${s.label}</span>
            <span style="font-size:0.82rem;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${r.title || r.recommendation || ''}</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
            <span style="font-size:0.75rem;color:var(--text-light);">${formatDate(r.created_at)}</span>
            <button class="btn btn-sm btn-primary btn-dash-outcome"
              data-rec-id="${r.id}"
              data-pigeon-id="${p.id}"
            >${t('sport.dashboard.pending_feedback.btn_feedback')}</button>
          </div>
        </div>`;
    }).join('') + (pending.length > 10 ? `<p style="text-align:center;color:var(--text-light);font-size:0.78rem;margin-top:8px;">${t('sport.dashboard.pending_feedback.more', { count: pending.length - 10 })}</p>` : '');

    el.querySelectorAll('.btn-dash-outcome').forEach(btn => {
      btn.addEventListener('click', () => {
        openOutcomeModal(parseInt(btn.dataset.recId), parseInt(btn.dataset.pigeonId), null);
      });
    });

  } catch (err) {
    el.innerHTML = renderEmptyState('⚠️', t('sport.dashboard.pending_feedback.load_error'), err.message);
  }
}

/* ——— Widget alertes IA ——— */
async function loadAIAlertWidget(pigeons) {
  const el = document.getElementById('widget-ai-alerts');
  if (!el) return;

  try {
    const top3 = (pigeons || []).slice(0, 3);
    if (top3.length === 0) {
      el.innerHTML = renderEmptyState('🕊️', t('sport.dashboard.ai_alerts.no_pigeons_title'), t('sport.dashboard.ai_alerts.no_pigeons_text'));
      return;
    }

    // Récupérer recommandations des 3 premiers pigeons en parallèle
    const allRecs = await Promise.all(
      top3.map(p => AIAPI.getRecommendations(p.id).catch(() => []))
    );

    // Aplatir et associer aux pigeons
    const recs = [];
    allRecs.forEach((pigeonRecs, idx) => {
      (pigeonRecs || []).forEach(r => {
        recs.push({ ...r, _pigeon: top3[idx] });
      });
    });

    // Filtrer non résolues
    const actives = recs.filter(r => !r.resolved_at);

    // Mettre à jour le compteur
    const statEl = document.getElementById('stat-alerts');
    if (statEl) statEl.textContent = actives.length;

    if (actives.length === 0) {
      el.innerHTML = `
        <div class="alert-card success">
          <span class="alert-icon">✅</span>
          <div class="alert-content">
            <div class="alert-title">${t('sport.dashboard.ai_alerts.none_title')}</div>
            <div class="alert-text">${t('sport.dashboard.ai_alerts.none_text')}</div>
          </div>
        </div>`;
      return;
    }

    // Trier par sévérité : critical > warning > info
    const order = { critical: 0, warning: 1, info: 2 };
    actives.sort((a, b) => (order[a.severity] || 99) - (order[b.severity] || 99));

    const severityMap = {
      critical: { cls: 'critical', icon: '⚠️' },
      warning: { cls: 'warning', icon: '💡' },
      info: { cls: 'info', icon: 'ℹ️' }
    };

    el.innerHTML = actives.slice(0, 5).map(r => {
      const s = severityMap[r.severity] || { cls: 'info', icon: 'ℹ️' };
      const bague = r._pigeon ? r._pigeon.matricule : '';
      return `
        <div class="alert-card ${s.cls}">
          <span class="alert-icon">${s.icon}</span>
          <div class="alert-content">
            <div class="alert-title">${r._pigeon ? `<span class="chip" style="margin-right:6px;">${bague}</span>` : ''}${r.title || r.recommendation_type || t('sport.dashboard.ai_alerts.default_title')}</div>
            <div class="alert-text">${r.message || r.content || ''}</div>
          </div>
        </div>`;
    }).join('') + (actives.length > 5 ? `<p style="text-align:center;color:var(--text-light);font-size:0.8rem;margin-top:8px;">${t('sport.dashboard.ai_alerts.more', { count: actives.length - 5 })}</p>` : '');

  } catch (err) {
    el.innerHTML = renderEmptyState('⚠️', t('sport.dashboard.ai_alerts.load_error'), err.message);
  }
}

/* ——— Widget santé ——— */
async function loadHealthWidget(pigeons) {
  const el = document.getElementById('widget-health');
  if (!el) return;

  try {
    const top3 = (pigeons || []).slice(0, 3);
    if (top3.length === 0) {
      el.innerHTML = renderEmptyState('🏥', t('sport.dashboard.health.no_pigeons_title'), t('sport.dashboard.health.no_pigeons_text'));
      return;
    }

    const healthData = await Promise.all(
      top3.map(p => ElevageAPI.getPigeonHealth(p.id).catch(() => []))
    );

    const allEvents = [];
    healthData.forEach((evts, idx) => {
      (evts || []).forEach(e => allEvents.push({ ...e, _pigeon: top3[idx] }));
    });

    // Trier par date desc, prendre les 5 derniers
    allEvents.sort((a, b) => new Date(b.date || b.created_at) - new Date(a.date || a.created_at));
    const recent = allEvents.slice(0, 5);

    if (recent.length === 0) {
      el.innerHTML = renderEmptyState('🟢', t('sport.dashboard.health.none_title'), t('sport.dashboard.health.none_text'));
    } else {
      el.innerHTML = recent.map(e => {
        const isBad = ['maladie', 'traitement', 'blessure'].includes((e.type || '').toLowerCase());
        return `
          <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);">
            <span>${isBad ? '🔴' : '🟢'}</span>
            <div style="flex:1;min-width:0;">
              <div style="font-size:0.82rem;font-weight:600;color:var(--text);">${e._pigeon.matricule || '—'} — ${e.type || e.evenement || t('sport.dashboard.health.event_default')}</div>
              <div style="font-size:0.75rem;color:var(--text-light);">${formatDate(e.date || e.created_at)}</div>
            </div>
          </div>`;
      }).join('');
    }

    el.innerHTML += `<div style="margin-top:12px;"><a href="http://localhost:8080/#sante" target="_blank" style="font-size:0.8rem;color:var(--accent);">${t('sport.dashboard.health.open_link')}</a></div>`;

  } catch (err) {
    el.innerHTML = renderEmptyState('⚠️', t('sport.dashboard.health.load_error'), err.message);
  }
}

/* ——— Widget dernières séances ——— */
async function loadRecentSessionsWidget() {
  const el = document.getElementById('widget-sessions');
  if (!el) return;

  try {
    const sessions = await SportAPI.getSessions(0, 10);
    const list = Array.isArray(sessions) ? sessions : (sessions.items || sessions.results || []);

    // Stat compteur séances du mois
    const thisMonth = new Date();
    const monthCount = list.filter(s => {
      const d = new Date(s.date || s.created_at);
      return d.getMonth() === thisMonth.getMonth() && d.getFullYear() === thisMonth.getFullYear();
    }).length;
    const statEl = document.getElementById('stat-sessions');
    if (statEl) statEl.textContent = monthCount;

    // Calculer récupération moyenne
    const withScores = list.filter(s => s.avg_recovery != null || s.results?.length > 0);
    let avgRec = '—';
    if (withScores.length > 0) {
      const scores = withScores.map(s => {
        if (s.avg_recovery != null) return s.avg_recovery;
        const r = s.results || [];
        return r.reduce((sum, x) => sum + (x.recovery_score || 0), 0) / (r.length || 1);
      });
      avgRec = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
    }
    const statRec = document.getElementById('stat-recovery');
    if (statRec) statRec.textContent = avgRec;

    if (list.length === 0) {
      el.innerHTML = `<div class="empty-state"><div class="empty-icon">🏃</div><h3>${t('sport.dashboard.recent_sessions.empty_title')}</h3><p>${t('sport.dashboard.recent_sessions.empty_text')}</p></div>`;
      return;
    }

    const recent = list.slice(0, 5);
    el.innerHTML = `
      <table class="table-modern">
        <thead>
          <tr>
            <th>${t('sport.dashboard.recent_sessions.table.date')}</th>
            <th>${t('sport.dashboard.recent_sessions.table.type')}</th>
            <th>${t('sport.dashboard.recent_sessions.table.distance')}</th>
            <th>${t('sport.dashboard.recent_sessions.table.meteo')}</th>
            <th>${t('sport.dashboard.recent_sessions.table.pigeons')}</th>
          </tr>
        </thead>
        <tbody>
          ${recent.map(s => `
            <tr style="cursor:pointer;" onclick="showPage('sessions')">
              <td>${formatDate(s.date)}</td>
              <td>${sessionTypeBadge(s.session_type)}</td>
              <td>${s.distance_km != null ? s.distance_km + ' km' : '—'}</td>
              <td>${s.weather || '—'}</td>
              <td>${(s.results || []).length || s.pigeon_count || '—'}</td>
            </tr>`).join('')}
        </tbody>
      </table>`;
  } catch (err) {
    el.innerHTML = renderEmptyState('⚠️', t('sport.dashboard.recent_sessions.load_error'), err.message);
  }
}

/* ——— Widget nutrition ——— */
async function loadNutritionWidget() {
  const el = document.getElementById('widget-nutrition');
  if (!el) return;

  try {
    const plans = await SportAPI.getPlans().catch(() => []);
    const list = Array.isArray(plans) ? plans : (plans.items || []);

    if (list.length === 0) {
      el.innerHTML = renderEmptyState('🌾', t('sport.dashboard.nutrition.empty_title'), t('sport.dashboard.nutrition.empty_text'));
      return;
    }

    // Afficher le plan le plus récent ou actif
    const plan = list[0];
    el.innerHTML = `
      <div style="margin-bottom:10px;">
        <div style="font-weight:600;font-size:0.95rem;">${plan.name || t('sport.dashboard.nutrition.default_name')}</div>
        <div style="font-size:0.8rem;color:var(--text-light);margin-top:2px;">${plan.description || ''}</div>
      </div>
      ${plan.goal ? `<div style="margin-bottom:8px;"><span class="badge badge-info">${plan.goal}</span></div>` : ''}
      <div style="font-size:0.8rem;color:var(--text-light);">
        ${plan.start_date ? t('sport.dashboard.nutrition.from', { date: formatDate(plan.start_date) }) : ''}
        ${plan.end_date ? ' ' + t('sport.dashboard.nutrition.to', { date: formatDate(plan.end_date) }) : ''}
      </div>
      <div style="margin-top:12px;">
        <strong style="font-size:0.82rem;">${t('sport.dashboard.nutrition.plans_available', { count: list.length })}</strong>
      </div>
      <div style="margin-top:10px;">
        <a href="#" style="font-size:0.8rem;color:var(--accent);" onclick="event.preventDefault();showPage('plans')">${t('sport.dashboard.nutrition.manage_link')}</a>
      </div>`;
  } catch (err) {
    el.innerHTML = renderEmptyState('⚠️', t('sport.dashboard.nutrition.load_error'), err.message);
  }
}
