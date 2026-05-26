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
    btn.textContent = '+ Nouvelle séance';
    btn.onclick = () => openCreateSessionModal();
  }

  try {
    const sessions = await SportAPI.getSessions(0, 100);
    const list = Array.isArray(sessions) ? sessions : (sessions.items || sessions.results || []);

    content.innerHTML = `
      <!-- Filtres -->
      <div class="card" style="margin-bottom:16px;padding:14px 18px;">
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
          <label style="font-weight:600;font-size:0.85rem;">Filtrer :</label>
          <select class="form-control" style="width:auto;" id="filter-type">
            <option value="">Tous les types</option>
            <option value="loft">Loft</option>
            <option value="toss">Lancer</option>
            <option value="race">Concours</option>
          </select>
          <input type="date" class="form-control" style="width:auto;" id="filter-date-from" placeholder="Du">
          <input type="date" class="form-control" style="width:auto;" id="filter-date-to" placeholder="Au">
          <button class="btn btn-secondary btn-sm" id="btn-filter-reset">Réinitialiser</button>
        </div>
      </div>

      <!-- Tableau -->
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">🏃 Séances d'entraînement</div>
            <div class="card-subtitle" id="sessions-count">${list.length} séance(s)</div>
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
      document.getElementById('sessions-count').textContent = `${filtered.length} séance(s)`;
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
    content.innerHTML = `<div class="card"><p style="color:var(--danger);">Erreur : ${err.message}</p></div>`;
    showToast(err.message, 'error');
  }
}

/* ——— Rendu tableau séances ——— */
function renderSessionsTable(list) {
  if (list.length === 0) {
    return `<div class="empty-state">
      <div class="empty-icon">🏃</div>
      <h3>Aucune séance trouvée</h3>
      <p>Créez votre première séance ou modifiez les filtres.</p>
    </div>`;
  }

  return `
    <table class="table-modern">
      <thead>
        <tr>
          <th>Date</th>
          <th>Type</th>
          <th>Distance</th>
          <th>Météo</th>
          <th>Temp.</th>
          <th>Vent</th>
          <th>Pigeons</th>
          <th>Récup. moy.</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${list.map(s => {
          const nbResults = (s.results || []).length || s.result_count || 0;
          const avgRec = computeAvgRecovery(s);
          return `
            <tr data-session-id="${s.id}" class="session-row">
              <td>${formatDate(s.date)}</td>
              <td>${sessionTypeBadge(s.session_type)}</td>
              <td>${s.distance_km != null ? s.distance_km + ' km' : '—'}</td>
              <td>${s.weather || '—'}</td>
              <td>${s.temperature_c != null ? s.temperature_c + '°C' : '—'}</td>
              <td>${s.wind || '—'}</td>
              <td><span class="badge badge-secondary">${nbResults}</span></td>
              <td>${avgRec != null ? renderScoreBar(avgRec) : '<span style="color:var(--text-light)">—</span>'}</td>
              <td>
                <button class="btn btn-sm btn-ghost" onclick="event.stopPropagation();openSessionDetail(${s.id})">Détail</button>
                <button class="btn btn-sm btn-icon" title="Supprimer" onclick="event.stopPropagation();deleteSession(${s.id})">🗑️</button>
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
  if (!confirm('Supprimer cette séance ? Cette action est irréversible.')) return;
  try {
    await SportAPI.deleteSession(id);
    showToast('Séance supprimée.', 'success');
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

  title.textContent = '+ Nouvelle séance';
  modal.className = 'modal';

  const today = new Date().toISOString().split('T')[0];
  body.innerHTML = `
    <form id="form-session">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Date *</label>
          <input type="date" class="form-control" name="date" value="${today}" required>
        </div>
        <div class="form-group">
          <label class="form-label">Type de séance *</label>
          <select class="form-control" name="session_type" required>
            <option value="loft">Loft</option>
            <option value="toss">Lancer</option>
            <option value="race">Concours</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Distance (km)</label>
          <input type="number" class="form-control" name="distance_km" step="0.1" min="0" placeholder="ex: 50">
        </div>
        <div class="form-group">
          <label class="form-label">Météo</label>
          <select class="form-control" name="weather">
            <option value="">—</option>
            <option value="ensoleillé">Ensoleillé</option>
            <option value="nuageux">Nuageux</option>
            <option value="couvert">Couvert</option>
            <option value="pluie">Pluie</option>
            <option value="vent">Vent fort</option>
            <option value="brouillard">Brouillard</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Température (°C)</label>
          <input type="number" class="form-control" name="temperature" step="0.5" placeholder="ex: 18">
        </div>
        <div class="form-group">
          <label class="form-label">Vent</label>
          <select class="form-control" name="wind">
            <option value="">—</option>
            <option value="calme">Calme</option>
            <option value="léger">Léger</option>
            <option value="modéré">Modéré</option>
            <option value="fort">Fort</option>
            <option value="très fort">Très fort</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Notes</label>
        <textarea class="form-control" name="notes" rows="3" placeholder="Observations, conditions particulières..."></textarea>
      </div>
      <div class="modal-footer" style="padding:0;margin-top:16px;">
        <button type="button" class="btn btn-secondary" id="btn-modal-cancel">Annuler</button>
        <button type="submit" class="btn btn-primary">Créer la séance</button>
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

    // Nettoyage types
    if (data.distance_km) data.distance_km = parseFloat(data.distance_km);
    else delete data.distance_km;
    if (data.temperature) data.temperature = parseFloat(data.temperature);
    else delete data.temperature;
    if (!data.weather) delete data.weather;
    if (!data.wind) delete data.wind;
    if (!data.notes) delete data.notes;
    console.log('[createSession] payload:', data);

    const submitBtn = e.target.querySelector('[type=submit]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="loader-inline"></span> Création...';

    try {
      await SportAPI.createSession(data);
      showToast('Séance créée avec succès !', 'success');
      closeModal();
      loadSessions();
    } catch (err) {
      showToast(err.message, 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Créer la séance';
    }
  });
}

/* ——— Détail séance ——— */
async function openSessionDetail(sessionId) {
  const overlay = document.getElementById('modal-overlay');
  const title = document.getElementById('modal-title');
  const body = document.getElementById('modal-body');
  const modal = document.getElementById('modal');

  title.textContent = 'Détail de la séance';
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

    title.textContent = `Séance du ${formatDate(session.date)} — ${sessionTypeBadge(session.session_type)}`;

    body.innerHTML = `
      <!-- Infos générales -->
      <div style="display:flex;gap:20px;flex-wrap:wrap;margin-bottom:20px;">
        ${session.distance_km != null ? `<div class="stat-card stat-blue" style="flex:1;min-width:120px;">
          <div class="stat-icon">📏</div>
          <div class="stat-value">${session.distance_km}</div>
          <div class="stat-label">km</div>
        </div>` : ''}
        ${session.temperature_c != null ? `<div class="stat-card stat-orange" style="flex:1;min-width:120px;">
          <div class="stat-icon">🌡️</div>
          <div class="stat-value">${session.temperature_c}</div>
          <div class="stat-label">°C</div>
        </div>` : ''}
        ${session.weather ? `<div class="stat-card" style="flex:1;min-width:120px;">
          <div class="stat-icon">🌤️</div>
          <div class="stat-value" style="font-size:1rem;">${session.weather}</div>
          <div class="stat-label">Météo</div>
        </div>` : ''}
        ${session.wind ? `<div class="stat-card" style="flex:1;min-width:120px;">
          <div class="stat-icon">💨</div>
          <div class="stat-value" style="font-size:1rem;">${session.wind}</div>
          <div class="stat-label">Vent</div>
        </div>` : ''}
      </div>

      ${session.notes ? `<div class="alert-card info" style="margin-bottom:16px;">
        <span class="alert-icon">📝</span>
        <div class="alert-content">
          <div class="alert-title">Notes</div>
          <div class="alert-text">${session.notes}</div>
        </div>
      </div>` : ''}

      <!-- Résultats -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
        <h3 style="font-size:1rem;font-weight:600;">Résultats pigeons (${results.length})</h3>
        <button class="btn btn-primary btn-sm" id="btn-add-result">+ Ajouter résultat</button>
      </div>

      ${results.length === 0
        ? '<div class="empty-state"><div class="empty-icon">🕊️</div><h3>Aucun résultat</h3><p>Ajoutez les performances des pigeons.</p></div>'
        : `<div style="overflow-x:auto;">
          <table class="table-modern">
            <thead>
              <tr>
                <th>Pigeon</th>
                <th>Retour (min)</th>
                <th>Rang</th>
                <th>Récupération</th>
                <th>Hydratation</th>
                <th>Condition</th>
                <th>Motivation</th>
                <th>Santé</th>
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
                  ? `<span class="badge badge-warning" title="${recentHealth[0].type || 'Traitement récent'}">⚠️ Suivi</span>`
                  : `<span class="badge badge-success">✅ OK</span>`;

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
    body.innerHTML = `<p style="color:var(--danger);">Erreur : ${err.message}</p>`;
    showToast(err.message, 'error');
  }
}

/* ——— Modal ajout résultat ——— */
function openAddResultModal(sessionId, pigeons) {
  const title = document.getElementById('modal-title');
  const body = document.getElementById('modal-body');
  const modal = document.getElementById('modal');
  modal.className = 'modal';

  title.textContent = '+ Ajouter un résultat pigeon';

  const pigeonOptions = pigeons.map(p =>
    `<option value="${p.id}">${p.matricule}${p.nom ? ' — ' + p.nom : ''}</option>`
  ).join('');

  body.innerHTML = `
    <form id="form-result">
      <div class="form-group">
        <label class="form-label">Pigeon *</label>
        <select class="form-control" name="pigeon_id" required>
          <option value="">Choisir un pigeon...</option>
          ${pigeonOptions}
        </select>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Temps de retour (min)</label>
          <input type="number" class="form-control" name="return_time" step="1" min="0" placeholder="ex: 45">
        </div>
        <div class="form-group">
          <label class="form-label">Rang interne</label>
          <input type="number" class="form-control" name="internal_rank" step="1" min="1" placeholder="ex: 1">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Score récupération (0-10)</label>
          <input type="number" class="form-control" name="recovery_score" step="0.5" min="0" max="10" placeholder="0–10">
        </div>
        <div class="form-group">
          <label class="form-label">Score hydratation (0-10)</label>
          <input type="number" class="form-control" name="hydration_score" step="0.5" min="0" max="10" placeholder="0–10">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Score condition (0-10)</label>
          <input type="number" class="form-control" name="condition_score" step="0.5" min="0" max="10" placeholder="0–10">
        </div>
        <div class="form-group">
          <label class="form-label">Score motivation (0-10)</label>
          <input type="number" class="form-control" name="motivation_score" step="0.5" min="0" max="10" placeholder="0–10">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Notes</label>
        <textarea class="form-control" name="notes" rows="2" placeholder="Observations..."></textarea>
      </div>
      <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:16px;">
        <button type="button" class="btn btn-secondary" onclick="openSessionDetail(${sessionId})">← Retour</button>
        <button type="submit" class="btn btn-primary">Enregistrer</button>
      </div>
    </form>`;

  document.getElementById('form-result').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd.entries());

    // pigeon_id est un UUID (string) — ne pas parser en int
    if (!data.pigeon_id) { showToast('Veuillez sélectionner un pigeon.', 'error'); return; }
    ['return_time', 'internal_rank', 'recovery_score', 'hydration_score', 'condition_score', 'motivation_score'].forEach(k => {
      if (data[k] !== '') data[k] = parseFloat(data[k]);
      else delete data[k];
    });
    if (!data.notes) delete data.notes;
    console.log('[addResult] payload:', data);

    const submitBtn = e.target.querySelector('[type=submit]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="loader-inline"></span> Enregistrement...';

    try {
      await SportAPI.addResult(sessionId, data);
      showToast('Résultat enregistré !', 'success');
      openSessionDetail(sessionId);
    } catch (err) {
      showToast(err.message, 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Enregistrer';
    }
  });
}

/* ——— Fermer modal ——— */
function closeModal() {
  document.getElementById('modal-overlay').style.display = 'none';
}
