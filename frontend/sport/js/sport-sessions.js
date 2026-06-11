/* ============================================================
   SPORT-SESSIONS.JS — Gestion des séances d'entraînement
   ============================================================ */

/* ——— Page principale : liste des séances ——— */
async function loadSessions() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loader-spinner"></div>';

  const btn = document.getElementById('btn-add');
  if (btn) {
    btn.style.display = '';
    btn.textContent = t('sport.sessions.btn_new');
    btn.onclick = () => openCreateSessionModal();
  }

  try {
    const sessions = await SportAPI.getSessions(0, 100);
    const list = Array.isArray(sessions) ? sessions : (sessions.items || sessions.results || []);

    content.innerHTML = `
      <!-- Filtres -->
      <div class="card" style="margin-bottom:16px;padding:14px 18px;">
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
          <label style="font-weight:600;font-size:0.85rem;">${t('sport.sessions.filter.label')}</label>
          <select class="form-control" style="width:auto;" id="filter-type">
            <option value="">${t('sport.sessions.filter.all_types')}</option>
            <option value="loft">${t('sport.session_type.loft')}</option>
            <option value="toss">${t('sport.session_type.toss')}</option>
            <option value="race">${t('sport.session_type.race')}</option>
          </select>
          <input type="date" class="form-control" style="width:auto;" id="filter-date-from" placeholder="${t('sport.sessions.filter.from')}">
          <input type="date" class="form-control" style="width:auto;" id="filter-date-to" placeholder="${t('sport.sessions.filter.to')}">
          <button class="btn btn-secondary btn-sm" id="btn-filter-reset">${t('sport.sessions.filter.reset')}</button>
        </div>
      </div>

      <!-- Tableau -->
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">${t('sport.sessions.title')}</div>
            <div class="card-subtitle" id="sessions-count">${t('sport.sessions.count', { count: list.length })}</div>
          </div>
        </div>
        <div id="sessions-table-wrap">
          ${renderSessionsTable(list)}
        </div>
      </div>
    `;

    // Filtres live
    const applyFilters = () => {
      const type = document.getElementById('filter-type').value;
      const from = document.getElementById('filter-date-from').value;
      const to = document.getElementById('filter-date-to').value;

      const filtered = list.filter(s => {
        if (type && s.session_type !== type) return false;
        if (from && s.date < from) return false;
        if (to && s.date > to) return false;
        return true;
      });
      document.getElementById('sessions-table-wrap').innerHTML = renderSessionsTable(filtered);
      document.getElementById('sessions-count').textContent = t('sport.sessions.count', { count: filtered.length });
      attachSessionRowClicks();
    };

    document.getElementById('filter-type').addEventListener('change', applyFilters);
    document.getElementById('filter-date-from').addEventListener('change', applyFilters);
    document.getElementById('filter-date-to').addEventListener('change', applyFilters);
    document.getElementById('btn-filter-reset').addEventListener('click', () => {
      document.getElementById('filter-type').value = '';
      document.getElementById('filter-date-from').value = '';
      document.getElementById('filter-date-to').value = '';
      applyFilters();
    });

    attachSessionRowClicks();

  } catch (err) {
    content.innerHTML = `<div class="card"><p style="color:var(--danger);">${t('sport.error.prefix', { message: err.message })}</p></div>`;
    showToast(err.message, 'error');
  }
}

/* ——— Formatage distance : stockée en km dans la DB, affichée en mètres ——— */
function fmtDistance(distKm) {
  if (distKm == null) return '—';
  const m = Math.round(distKm * 1000);
  return m.toLocaleString(getLocaleCode()) + ' m';
}

/* ——— Rendu tableau séances ——— */
function renderSessionsTable(list) {
  if (list.length === 0) {
    return `<div class="empty-state">
      <div class="empty-icon">🏃</div>
      <h3>${t('sport.sessions.empty.title')}</h3>
      <p>${t('sport.sessions.empty.sub')}</p>
    </div>`;
  }

  return `
    <table class="table-modern">
      <thead>
        <tr>
          <th>${t('sport.sessions.table.date')}</th>
          <th>${t('sport.sessions.table.type')}</th>
          <th>${t('sport.sessions.table.distance')}</th>
          <th>${t('sport.sessions.table.meteo')}</th>
          <th>${t('sport.sessions.table.temp')}</th>
          <th>${t('sport.sessions.table.vent')}</th>
          <th>${t('sport.sessions.table.pigeons')}</th>
          <th>${t('sport.sessions.table.recup')}</th>
          <th>${t('sport.sessions.table.actions')}</th>
        </tr>
      </thead>
      <tbody>
        ${list.map(s => {
          const nbResults = (s.results || []).length || s.result_count || 0;
          const avgRec = computeAvgRecovery(s);
          const isConcours = s.session_type === 'race';
          return `
            <tr data-session-id="${s.id}" class="session-row" style="${isConcours ? 'opacity:0.85;' : ''}">
              <td>${formatDate(s.date)}</td>
              <td>
                ${sessionTypeBadge(s.session_type)}
                ${isConcours ? `<br><span style="font-size:11px;color:var(--text-light);">${t('sport.sessions.via_concours')}</span>` : ''}
              </td>
              <td>${fmtDistance(s.distance_km)}</td>
              <td>${s.weather || '—'}</td>
              <td>${s.temperature_c != null ? s.temperature_c + '°C' : '—'}</td>
              <td>${s.wind || '—'}</td>
              <td><span class="badge badge-secondary">${nbResults}</span></td>
              <td>${avgRec != null ? renderScoreBar(avgRec) : '<span style="color:var(--text-light)">—</span>'}</td>
              <td>
                ${isConcours
                  ? `<a href="../index.html#concours" class="btn btn-sm btn-secondary" title="${t('sport.sessions.managed_in_colomb')}">🏠 ${t('sport.sessions.btn_colomb')}</a>`
                  : `<button class="btn btn-sm btn-ghost" onclick="event.stopPropagation();openSessionDetail(${s.id})">${t('sport.sessions.btn_detail')}</button>
                     <button class="btn btn-sm btn-icon" title="${t('sport.sessions.btn_delete')}" onclick="event.stopPropagation();deleteSession(${s.id})">🗑️</button>`
                }
              </td>
            </tr>`;
        }).join('')}
      </tbody>
    </table>`;
}

function computeAvgRecovery(session) {
  if (session.avg_recovery != null) return session.avg_recovery;
  const r = session.results || [];
  if (r.length === 0) return null;
  const scores = r.filter(x => x.recovery_score != null).map(x => x.recovery_score);
  if (scores.length === 0) return null;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

function attachSessionRowClicks() {
  document.querySelectorAll('.session-row').forEach(row => {
    row.addEventListener('click', () => openSessionDetail(parseInt(row.dataset.sessionId)));
  });
}

/* ——— Supprimer une séance ——— */
async function deleteSession(id) {
  if (!confirm(t('sport.sessions.delete_confirm'))) return;
  try {
    await SportAPI.deleteSession(id);
    showToast(t('sport.sessions.deleted'), 'success');
    loadSessions();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

/* ——— Modal création séance ——— */
function openCreateSessionModal() {
  const overlay = document.getElementById('modal-overlay');
  const title = document.getElementById('modal-title');
  const body = document.getElementById('modal-body');
  const modal = document.getElementById('modal');

  title.textContent = t('sport.sessions.btn_new');
  modal.className = 'modal';

  const today = new Date().toISOString().split('T')[0];
  body.innerHTML = `
    <div style="background:#EBF5FB;border:1px solid #AED6F1;border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:13px;color:#1A5276;">
      ${t('sport.sessions.form.concours_banner')}
    </div>
    <form id="form-session">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">${t('sport.sessions.form.date_label')}</label>
          <input type="date" class="form-control" name="date" value="${today}" required>
        </div>
        <div class="form-group">
          <label class="form-label">${t('sport.sessions.form.type_label')}</label>
          <select class="form-control" name="session_type" required>
            <option value="loft">${t('sport.session_type.loft')}</option>
            <option value="toss">${t('sport.session_type.toss')}</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">${t('sport.sessions.form.distance_label')}</label>
          <input type="number" class="form-control" name="distance_m" step="100" min="0" placeholder="${t('sport.sessions.form.distance_placeholder')}">
        </div>
        <div class="form-group">
          <label class="form-label">${t('sport.sessions.form.weather_label')}</label>
          <select class="form-control" name="weather">
            <option value="">—</option>
            <option value="ensoleillé">${t('sport.sessions.weather.ensoleille')}</option>
            <option value="nuageux">${t('sport.sessions.weather.nuageux')}</option>
            <option value="couvert">${t('sport.sessions.weather.couvert')}</option>
            <option value="pluie">${t('sport.sessions.weather.pluie')}</option>
            <option value="vent">${t('sport.sessions.weather.vent_fort')}</option>
            <option value="brouillard">${t('sport.sessions.weather.brouillard')}</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">${t('sport.sessions.form.temperature_label')}</label>
          <input type="number" class="form-control" name="temperature" step="0.5" placeholder="${t('sport.sessions.form.temperature_placeholder')}">
        </div>
        <div class="form-group">
          <label class="form-label">${t('sport.sessions.form.wind_label')}</label>
          <select class="form-control" name="wind">
            <option value="">—</option>
            <option value="calme">${t('sport.sessions.wind.calme')}</option>
            <option value="léger">${t('sport.sessions.wind.leger')}</option>
            <option value="modéré">${t('sport.sessions.wind.modere')}</option>
            <option value="fort">${t('sport.sessions.wind.fort')}</option>
            <option value="très fort">${t('sport.sessions.wind.tres_fort')}</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">${t('sport.sessions.form.notes_label')}</label>
        <textarea class="form-control" name="notes" rows="3" placeholder="${t('sport.sessions.form.notes_placeholder')}"></textarea>
      </div>
      <div class="modal-footer" style="padding:0;margin-top:16px;">
        <button type="button" class="btn btn-secondary" id="btn-modal-cancel">${t('common.cancel')}</button>
        <button type="submit" class="btn btn-primary">${t('sport.sessions.form.submit_create')}</button>
      </div>
    </form>`;

  overlay.style.display = 'flex';

  document.getElementById('btn-modal-cancel').onclick = closeModal;
  document.getElementById('modal-close').onclick = closeModal;
  overlay.onclick = (e) => { if (e.target === overlay) closeModal(); };

  document.getElementById('form-session').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd.entries());

    // Convertir distance m → km (DB stocke en km)
    if (data.distance_m) {
      data.distance_km = parseFloat(data.distance_m) / 1000;
    }
    delete data.distance_m;
    if (data.temperature) data.temperature = parseFloat(data.temperature);
    else delete data.temperature;
    if (!data.weather) delete data.weather;
    if (!data.wind) delete data.wind;
    if (!data.notes) delete data.notes;
    console.log('[createSession] payload:', data);

    const submitBtn = e.target.querySelector('[type=submit]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span class="loader-inline"></span> ${t('sport.sessions.form.creating')}`;

    try {
      await SportAPI.createSession(data);
      showToast(t('sport.sessions.form.created'), 'success');
      closeModal();
      loadSessions();
    } catch (err) {
      showToast(err.message, 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = t('sport.sessions.form.submit_create');
    }
  });
}

/* ——— Détail séance ——— */
async function openSessionDetail(sessionId) {
  const overlay = document.getElementById('modal-overlay');
  const title = document.getElementById('modal-title');
  const body = document.getElementById('modal-body');
  const modal = document.getElementById('modal');

  title.textContent = t('sport.sessions.detail.loading_title');
  modal.className = 'modal modal-lg';
  body.innerHTML = '<div class="loader-spinner"></div>';
  overlay.style.display = 'flex';

  document.getElementById('modal-close').onclick = closeModal;
  overlay.onclick = (e) => { if (e.target === overlay) closeModal(); };

  try {
    const [session, pigeons] = await Promise.all([
      SportAPI.getSession(sessionId),
      getPigeonsCache()
    ]);

    const results = session.results || [];

    // Récupérer santé des pigeons impliqués pour alertes
    const pigeonIds = [...new Set(results.map(r => r.pigeon_id).filter(Boolean))];
    const healthMap = {};
    await Promise.all(pigeonIds.map(async pid => {
      healthMap[pid] = await ElevageAPI.getPigeonHealth(pid).catch(() => []);
    }));

    const pigeonMap = {};
    pigeons.forEach(p => pigeonMap[p.id] = p);

    title.innerHTML = `${t('sport.session_detail.title', { date: formatDate(session.date) })} — ${sessionTypeBadge(session.session_type)}`;

    const bannerConcours = session.session_type === 'race' ? `
      <div style="background:#EBF5FB;border:1px solid #AED6F1;border-radius:8px;padding:10px 14px;
                  margin-bottom:16px;font-size:13px;color:#1A5276;display:flex;align-items:center;gap:8px;">
        ${t('sport.sessions.detail.concours_banner')}
        <a href="../index.html#concours" style="margin-left:auto;font-weight:600;color:#2980B9;">
          ${t('sport.sessions.detail.concours_link')}
        </a>
      </div>` : '';

    body.innerHTML = `
      ${bannerConcours}
      <!-- Infos générales -->
      <div style="display:flex;gap:20px;flex-wrap:wrap;margin-bottom:20px;">
        ${session.distance_km != null ? `<div class="stat-card stat-blue" style="flex:1;min-width:120px;">
          <div class="stat-icon">📏</div>
          <div class="stat-value">${Math.round(session.distance_km * 1000).toLocaleString(getLocaleCode())}</div>
          <div class="stat-label">m</div>
        </div>` : ''}
        ${session.temperature != null ? `<div class="stat-card stat-orange" style="flex:1;min-width:120px;">
          <div class="stat-icon">🌡️</div>
          <div class="stat-value">${session.temperature}</div>
          <div class="stat-label">°C</div>
        </div>` : ''}
        ${session.weather ? `<div class="stat-card" style="flex:1;min-width:120px;">
          <div class="stat-icon">🌤️</div>
          <div class="stat-value" style="font-size:1rem;">${session.weather}</div>
          <div class="stat-label">${t('sport.sessions.table.meteo')}</div>
        </div>` : ''}
        ${session.wind ? `<div class="stat-card" style="flex:1;min-width:120px;">
          <div class="stat-icon">💨</div>
          <div class="stat-value" style="font-size:1rem;">${session.wind}</div>
          <div class="stat-label">${t('sport.sessions.table.vent')}</div>
        </div>` : ''}
      </div>

      ${session.notes ? `<div class="alert-card info" style="margin-bottom:16px;">
        <span class="alert-icon">📝</span>
        <div class="alert-content">
          <div class="alert-title">${t('sport.sessions.form.notes_label')}</div>
          <div class="alert-text">${session.notes}</div>
        </div>
      </div>` : ''}

      <!-- Résultats -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
        <h3 style="font-size:1rem;font-weight:600;">${t('sport.sessions.detail.results_title', { count: results.length })}</h3>
        <button class="btn btn-primary btn-sm" id="btn-add-result">${t('sport.sessions.detail.btn_add_result')}</button>
      </div>

      ${results.length === 0
        ? `<div class="empty-state"><div class="empty-icon">🕊️</div><h3>${t('sport.sessions.detail.empty_results.title')}</h3><p>${t('sport.sessions.detail.empty_results.sub')}</p></div>`
        : `<div style="overflow-x:auto;">
          <table class="table-modern">
            <thead>
              <tr>
                <th>${t('sport.sessions.detail.table.pigeon')}</th>
                <th>${t('sport.sessions.detail.table.return_time')}</th>
                <th>${t('sport.sessions.detail.table.rank')}</th>
                <th>${t('sport.sessions.detail.table.recovery')}</th>
                <th>${t('sport.sessions.detail.table.hydration')}</th>
                <th>${t('sport.sessions.detail.table.condition')}</th>
                <th>${t('sport.sessions.detail.table.motivation')}</th>
                <th>${t('sport.sessions.detail.table.health')}</th>
              </tr>
            </thead>
            <tbody>
              ${results.map(r => {
                const pigeon = pigeonMap[r.pigeon_id] || {};
                const health = healthMap[r.pigeon_id] || [];
                // Vérifier traitement récent (30 jours)
                const recentHealth = health.filter(h => {
                  const d = new Date(h.date || h.created_at);
                  return (Date.now() - d) < 30 * 24 * 3600 * 1000;
                });
                const healthBadge = recentHealth.length > 0
                  ? `<span class="badge badge-warning" title="${recentHealth[0].type || t('sport.sessions.detail.health.recent_treatment')}">${t('sport.sessions.detail.health.suivi')}</span>`
                  : `<span class="badge badge-success">${t('sport.sessions.detail.health.ok')}</span>`;

                return `
                  <tr>
                    <td>
                      <div style="font-weight:600;">${pigeon.matricule || r.pigeon_id}</div>
                      ${pigeon.nom ? `<div style="font-size:0.75rem;color:var(--text-light);">${pigeon.nom}</div>` : ''}
                    </td>
                    <td>${r.return_time != null ? r.return_time + ' min' : '—'}</td>
                    <td>${r.internal_rank != null ? '#' + r.internal_rank : '—'}</td>
                    <td>${renderScoreBar(r.recovery_score)}</td>
                    <td>${renderScoreBar(r.hydration_score)}</td>
                    <td>${renderScoreBar(r.condition_score)}</td>
                    <td>${renderScoreBar(r.motivation_score)}</td>
                    <td>${healthBadge}</td>
                  </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>`}
    `;

    document.getElementById('btn-add-result').onclick = () => openAddResultModal(sessionId, pigeons);

  } catch (err) {
    body.innerHTML = `<p style="color:var(--danger);">${t('sport.error.prefix', { message: err.message })}</p>`;
    showToast(err.message, 'error');
  }
}

/* ——— Modal ajout résultat ——— */
function openAddResultModal(sessionId, pigeons) {
  const title = document.getElementById('modal-title');
  const body = document.getElementById('modal-body');
  const modal = document.getElementById('modal');
  modal.className = 'modal';

  title.textContent = t('sport.sessions.result_modal.title');

  const pigeonOptions = pigeons.map(p =>
    `<option value="${p.id}">${p.matricule}${p.nom ? ' — ' + p.nom : ''}</option>`
  ).join('');

  body.innerHTML = `
    <form id="form-result">
      <div class="form-group">
        <label class="form-label">${t('sport.sessions.result_modal.pigeon_label')}</label>
        <select class="form-control" name="pigeon_id" required>
          <option value="">${t('sport.choose_pigeon_placeholder')}</option>
          ${pigeonOptions}
        </select>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">${t('sport.sessions.result_modal.return_time_label')}</label>
          <input type="number" class="form-control" name="return_time" step="1" min="0" placeholder="${t('sport.sessions.result_modal.return_time_placeholder')}">
        </div>
        <div class="form-group">
          <label class="form-label">${t('sport.sessions.result_modal.rank_label')}</label>
          <input type="number" class="form-control" name="internal_rank" step="1" min="1" placeholder="${t('sport.sessions.result_modal.rank_placeholder')}">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">${t('sport.sessions.result_modal.recovery_label')}</label>
          <input type="number" class="form-control" name="recovery_score" step="0.5" min="0" max="10" placeholder="0–10">
        </div>
        <div class="form-group">
          <label class="form-label">${t('sport.sessions.result_modal.hydration_label')}</label>
          <input type="number" class="form-control" name="hydration_score" step="0.5" min="0" max="10" placeholder="0–10">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">${t('sport.sessions.result_modal.condition_label')}</label>
          <input type="number" class="form-control" name="condition_score" step="0.5" min="0" max="10" placeholder="0–10">
        </div>
        <div class="form-group">
          <label class="form-label">${t('sport.sessions.result_modal.motivation_label')}</label>
          <input type="number" class="form-control" name="motivation_score" step="0.5" min="0" max="10" placeholder="0–10">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">${t('sport.sessions.form.notes_label')}</label>
        <textarea class="form-control" name="notes" rows="2" placeholder="${t('sport.sessions.result_modal.notes_placeholder')}"></textarea>
      </div>
      <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:16px;">
        <button type="button" class="btn btn-secondary" onclick="openSessionDetail(${sessionId})">${t('sport.sessions.result_modal.back')}</button>
        <button type="submit" class="btn btn-primary">${t('sport.sessions.result_modal.submit')}</button>
      </div>
    </form>`;

  document.getElementById('form-result').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd.entries());

    // pigeon_id est un UUID (string) — ne pas parser en int
    if (!data.pigeon_id) { showToast(t('sport.sessions.result_modal.select_pigeon_required'), 'error'); return; }
    ['return_time', 'internal_rank'].forEach(k => {
      if (data[k] !== '') data[k] = parseFloat(data[k]);
      else delete data[k];
    });
    ['recovery_score', 'hydration_score', 'condition_score', 'motivation_score'].forEach(k => {
      if (data[k] !== '') data[k] = Math.round(Number(data[k]));
      else delete data[k];
    });
    if (!data.notes) delete data.notes;
    console.log('[addResult] payload:', data);

    const submitBtn = e.target.querySelector('[type=submit]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span class="loader-inline"></span> ${t('sport.sessions.result_modal.saving')}`;

    try {
      await SportAPI.addResult(sessionId, data);
      showToast(t('sport.sessions.result_modal.saved'), 'success');
      openSessionDetail(sessionId);
    } catch (err) {
      showToast(err.message, 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = t('sport.sessions.result_modal.submit');
    }
  });
}

/* ——— Fermer modal ——— */
function closeModal() {
  document.getElementById('modal-overlay').style.display = 'none';
}
