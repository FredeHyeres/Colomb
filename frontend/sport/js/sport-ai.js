/* ============================================================
   SPORT-AI.JS — Centre recommandations IA
   Recommandations actives, snapshots sportifs, event store
   ============================================================ */

function renderEmptyState(icon, title, subtitle = '') {
  return `
    <div class="empty-state" style="padding:40px 20px;">
      <div class="empty-icon">${icon}</div>
      <h3>${title}</h3>
      ${subtitle ? `<p>${subtitle}</p>` : ''}
    </div>`;
}

async function loadAIRecommendations() {
  const content = document.getElementById('content');
  const btn = document.getElementById('btn-add');
  if (btn) btn.style.display = 'none';

  content.innerHTML = `
    <!-- Sélecteur de pigeon -->
    <div class="pigeon-select-bar">
      <label>🤖 Pigeon analysé :</label>
      <select class="form-control" id="ai-pigeon-select">
        <option value="">Choisir un pigeon...</option>
      </select>
      <button class="btn btn-primary btn-sm" id="btn-load-ai" disabled>Charger l'analyse</button>
      <button class="btn btn-ghost btn-sm" id="btn-generate-ai" disabled title="Lancer une analyse IA complète">⚡ Analyser maintenant</button>
    </div>

    <div id="ai-content">
      <div class="empty-state">
        <div class="empty-icon">🤖</div>
        <h3>Sélectionnez un pigeon</h3>
        <p>Les recommandations IA s'afficheront ici.</p>
      </div>
    </div>
  `;

  const pigeons = await getPigeonsCache();
  const select = document.getElementById('ai-pigeon-select');

  pigeons.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = `${p.matricule}${p.nom ? ' — ' + p.nom : ''}`;
    select.appendChild(opt);
  });

  select.addEventListener('change', () => {
    const hasVal = !!select.value;
    document.getElementById('btn-load-ai').disabled = !hasVal;
    document.getElementById('btn-generate-ai').disabled = !hasVal;
  });

  document.getElementById('btn-load-ai').addEventListener('click', () => {
    if (select.value) loadAIForPigeon(select.value);
  });

  document.getElementById('btn-generate-ai').addEventListener('click', async () => {
    if (!select.value) return;
    const pigeonId = select.value;
    const btn = document.getElementById('btn-generate-ai');
    btn.disabled = true;
    btn.innerHTML = '<span class="loader-inline"></span> Analyse en cours...';
    try {
      await AIAPI.generateRecommendations(pigeonId);
      showToast('Analyse IA générée !', 'success');
      loadAIForPigeon(pigeonId);
    } catch (err) {
      showToast(err.message || 'Erreur lors de l\'analyse', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = '⚡ Analyser maintenant';
    }
  });
}

/* ——— Charger toute la vue IA pour un pigeon ——— */
async function loadAIForPigeon(pigeonId) {
  const container = document.getElementById('ai-content');
  container.innerHTML = '<div class="loader-spinner"></div>';

  try {
    const [recs, snapshots, events] = await Promise.all([
      AIAPI.getRecommendations(pigeonId).catch(() => []),
      AIAPI.getSnapshots(pigeonId).catch(() => []),
      AIAPI.getEvents(pigeonId).catch(() => [])
    ]);

    const recList = Array.isArray(recs) ? recs : [];
    const snapList = Array.isArray(snapshots) ? snapshots : [];
    const eventList = Array.isArray(events) ? events : [];

    const actives = recList.filter(r => !r.resolved_at);
    const resolved = recList.filter(r => r.resolved_at);

    // Dernier snapshot
    const lastSnap = snapList.length > 0
      ? snapList.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
      : null;

    container.innerHTML = `
      <!-- Section 1 : Recommandations actives -->
      <div class="card" style="margin-bottom:16px;">
        <div class="card-header">
          <div>
            <div class="card-title">⚠️ Recommandations actives (${actives.length})</div>
            <div class="card-subtitle">Alertes et conseils en attente de résolution</div>
          </div>
          <div style="display:flex;gap:8px;">
            ${resolved.length > 0 ? `<button class="btn btn-sm btn-secondary" onclick="toggleResolvedRecs()">Voir résolues (${resolved.length})</button>` : ''}
          </div>
        </div>

        <div id="active-recs">
          ${renderRecommendations(actives, pigeonId, false, lastSnap ? lastSnap.id : null)}
        </div>

        <div id="resolved-recs" style="display:none;">
          <hr style="margin:16px 0;border-color:var(--border);">
          <h4 style="font-size:0.85rem;color:var(--text-light);margin-bottom:10px;">Recommandations résolues</h4>
          ${renderRecommendations(resolved, pigeonId, true)}
        </div>
      </div>

      <!-- Section 2 : Snapshot sportif -->
      <div class="card" style="margin-bottom:16px;">
        <div class="card-header">
          <div>
            <div class="card-title">📊 Snapshot sportif</div>
            <div class="card-subtitle">${lastSnap ? `Dernière analyse : ${formatDatetime(lastSnap.created_at)}` : 'Aucun snapshot disponible'}</div>
          </div>
          <button class="btn btn-sm btn-ghost" id="btn-build-snapshot">🔄 Créer snapshot</button>
        </div>

        ${lastSnap ? renderSnapshot(lastSnap) : `
          <div class="empty-state" style="padding:30px;">
            <div class="empty-icon">📊</div>
            <h3>Aucun snapshot</h3>
            <p>Créez un snapshot pour obtenir les indices de condition sportive.</p>
          </div>`}
      </div>

      <!-- Section 3 : Event store -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">📋 Événements sport (${eventList.length})</div>
          <div class="card-subtitle">Historique des événements enregistrés par l'IA</div>
        </div>
        ${renderEventStore(eventList)}
      </div>
    `;

    // Bouton snapshot
    document.getElementById('btn-build-snapshot').addEventListener('click', async () => {
      const btn = document.getElementById('btn-build-snapshot');
      btn.disabled = true;
      btn.innerHTML = '<span class="loader-inline"></span>';
      try {
        await AIAPI.buildSnapshot(pigeonId);
        showToast('Snapshot créé !', 'success');
        loadAIForPigeon(pigeonId);
      } catch (err) {
        showToast(err.message, 'error');
        btn.disabled = false;
        btn.textContent = '🔄 Créer snapshot';
      }
    });

    // Boutons résoudre
    container.querySelectorAll('.btn-resolve-rec').forEach(btn => {
      btn.addEventListener('click', async () => {
        const recId = parseInt(btn.dataset.recId);
        btn.disabled = true;
        btn.innerHTML = '<span class="loader-inline"></span>';
        try {
          await AIAPI.resolveRecommendation(recId);
          showToast('Recommandation marquée comme résolue.', 'success');
          loadAIForPigeon(pigeonId);
        } catch (err) {
          showToast(err.message, 'error');
          btn.disabled = false;
          btn.textContent = '✅ Résoudre';
        }
      });
    });

    // Boutons outcome
    container.querySelectorAll('.btn-outcome-rec').forEach(btn => {
      btn.addEventListener('click', () => {
        const recId  = parseInt(btn.dataset.recId);
        const pId    = parseInt(btn.dataset.pigeonId);
        const snapId = btn.dataset.snapId ? parseInt(btn.dataset.snapId) : null;
        openOutcomeModal(recId, pId, snapId);
      });
    });

  } catch (err) {
    container.innerHTML = `<div class="card">${renderEmptyState('⚠️', 'Erreur de chargement', err.message)}</div>`;
    showToast(err.message, 'error');
  }
}

/* ——— Rendu recommandations ——— */
function renderRecommendations(recs, pigeonId, resolved, snapId = null) {
  if (recs.length === 0) {
    return resolved
      ? '<p style="color:var(--text-light);font-size:0.85rem;">Aucune recommandation résolue.</p>'
      : `<div class="alert-card success">
          <span class="alert-icon">✅</span>
          <div class="alert-content">
            <div class="alert-title">Aucune alerte active</div>
            <div class="alert-text">Ce pigeon est en bonne condition selon l'IA.</div>
          </div>
        </div>`;
  }

  const recMap = {
    concours:           { cls: 'success',  icon: '🏆', label: 'Concours' },
    entrainement_leger: { cls: 'info',     icon: '🏃', label: 'Entraînement' },
    repos:              { cls: 'warning',  icon: '⚠️', label: 'Repos' },
    reforme:            { cls: 'critical', icon: '🚨', label: 'Réforme' },
  };

  return recs.map(r => {
    const s = recMap[r.recommendation] || { cls: 'info', icon: 'ℹ️', label: 'Info' };
    return `
      <div class="alert-card ${s.cls}" style="margin-bottom:10px;">
        <span class="alert-icon">${s.icon}</span>
        <div class="alert-content" style="flex:1;">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;">
            <div>
              <div class="alert-title">
                <span class="badge ${s.cls === 'critical' ? 'badge-danger' : s.cls === 'warning' ? 'badge-warning' : 'badge-info'}" style="margin-right:6px;">${s.label}</span>
                ${r.title || r.recommendation_type || 'Recommandation'}
              </div>
              <div class="alert-text" style="margin-top:4px;">${r.message || r.content || ''}</div>
              ${r.action ? `<div style="font-size:0.78rem;color:var(--text);font-weight:500;margin-top:4px;">→ ${r.action}</div>` : ''}
              <div style="font-size:0.72rem;color:var(--text-light);margin-top:6px;">
                ${formatDate(r.created_at)}
                ${resolved && r.resolved_at ? ` · Résolu le ${formatDate(r.resolved_at)}` : ''}
              </div>
            </div>
            ${!resolved ? `
              <div style="display:flex;gap:6px;flex-shrink:0;">
                <button class="btn btn-sm btn-success btn-resolve-rec" data-rec-id="${r.id}">✅ Résoudre</button>
                <button class="btn btn-sm btn-primary btn-outcome-rec"
                  data-rec-id="${r.id}"
                  data-pigeon-id="${pigeonId}"
                  data-snap-id="${snapId || ''}"
                >📝 Outcome</button>
              </div>` : ''}
          </div>
        </div>
      </div>`;
  }).join('');
}

/* ——— Rendu snapshot ——— */
function renderSnapshot(snap) {
  const f = (typeof snap.features === 'object' && snap.features) ? snap.features : {};

  const fatigueMap = { eleve: 80, moyen: 50, faible: 20 };
  const fatigueVal = typeof f.fatigue_risk === 'string'
    ? (fatigueMap[f.fatigue_risk] ?? null)
    : null;

  const indices = [
    { label: 'Récupération (7j)', color: '#2980B9', max: 10, val: f.recovery_avg_7d },
    { label: 'Condition (7j)',    color: '#27AE60', max: 10, val: f.condition_avg_7d },
    { label: 'Régularité',        color: '#8E44AD', max: 10, val: f.regularity_index },
    { label: 'Risque fatigue',    color: '#E74C3C', max: 100, val: fatigueVal },
    { label: 'Charge (30j)',      color: '#E67E22', max: 30,  val: f.training_load_30d },
  ];

  const available = indices.filter(i => i.val != null);

  if (available.length === 0) {
    return renderEmptyState('📊', 'Snapshot sans données exploitables', 'Relancez une analyse après avoir enregistré des séances.');
  }

  return `
    <div class="gauge-grid">
      ${available.map(i => renderProgressRing(i.val, i.max, i.label, i.color)).join('')}
    </div>
    ${f.data_quality ? `
      <div style="margin-top:12px;padding:12px;background:var(--bg);border-radius:8px;font-size:0.82rem;color:var(--text-light);">
        Qualité des données : <strong>${f.data_quality}</strong> · ${f.training_load_30d ?? 0} séances (30j) · Tendance récupération : ${f.recovery_trend ?? '—'} · Risque fatigue : ${f.fatigue_risk ?? '—'}
      </div>` : ''}
  `;
}

/* ——— Rendu event store ——— */
function renderEventStore(events) {
  if (events.length === 0) {
    return renderEmptyState('📋', 'Aucun événement enregistré', 'Les événements apparaîtront automatiquement lors des analyses.');
  }

  const sorted = [...events].sort((a, b) => new Date(b.timestamp || b.created_at) - new Date(a.timestamp || a.created_at));

  const typeMap = {
    training: { icon: '🏃', color: 'var(--sport-blue)' },
    race: { icon: '🏆', color: 'var(--sport-gold)' },
    health: { icon: '🏥', color: 'var(--sport-red)' },
    snapshot: { icon: '📊', color: 'var(--sport-purple)' },
    recommendation: { icon: '💡', color: 'var(--sport-orange)' }
  };

  return `
    <div class="timeline">
      ${sorted.slice(0, 20).map(e => {
        const t = typeMap[e.event_type || e.type] || { icon: '📌', color: 'var(--text-light)' };
        return `
          <div class="timeline-item">
            <div class="timeline-dot" style="background:${t.color};"></div>
            <div class="timeline-date">${formatDatetime(e.timestamp || e.created_at)}</div>
            <div class="timeline-title">${t.icon} ${e.event_type || e.type || 'Événement'}</div>
            ${e.description || e.message ? `<div class="timeline-desc">${e.description || e.message}</div>` : ''}
            ${e.data ? `<div class="timeline-desc" style="font-family:monospace;font-size:0.72rem;">${JSON.stringify(e.data).slice(0, 100)}...</div>` : ''}
          </div>`;
      }).join('')}
      ${events.length > 20 ? `<p style="text-align:center;color:var(--text-light);font-size:0.78rem;margin-top:8px;">+ ${events.length - 20} événements plus anciens</p>` : ''}
    </div>`;
}

/* ——— Modale Outcome après concours ——— */
async function openOutcomeModal(recId, pigeonId, snapId) {
  // Récupérer les infos de la reco pour le sous-titre
  let recTitle = 'Recommandation';
  let recLabel = '';
  try {
    const recs = await AIAPI.getRecommendations(pigeonId).catch(() => []);
    const rec = (Array.isArray(recs) ? recs : []).find(r => r.id === recId);
    if (rec) {
      const recMap = {
        concours:           { label: 'Concours' },
        entrainement_leger: { label: 'Entraînement' },
        repos:              { label: 'Repos' },
        reforme:            { label: 'Réforme' },
      };
      recLabel = (recMap[rec.recommendation] || {}).label || rec.recommendation || '';
      recTitle = rec.title || rec.recommendation || 'Recommandation';
    }
  } catch (_) {}

  const today = new Date().toISOString().slice(0, 10);

  const overlay = document.createElement('div');
  overlay.className = 'outcome-modal-overlay';
  overlay.innerHTML = `
    <div class="outcome-modal" role="dialog" aria-modal="true">
      <h3>📝 Résultat après concours</h3>
      <div class="modal-subtitle">
        Recommandation : ${recLabel ? `<span class="badge badge-info" style="margin-right:4px;">${recLabel}</span>` : ''}${recTitle}
      </div>

      <div class="form-section">
        <div class="form-section-title">Outcome de la recommandation</div>
        <div class="form-group">
          <label>Résultat <span style="color:var(--danger);">*</span></label>
          <select class="form-control" id="om-outcome">
            <option value="">— Choisir —</option>
            <option value="confirme">✅ Confirmée — le pigeon était prêt</option>
            <option value="infirme">❌ Infirmée — la reco était mauvaise</option>
            <option value="partiel">⚠️ Partielle — résultat mitigé</option>
          </select>
          <div id="om-outcome-error" style="color:var(--danger);font-size:0.8rem;margin-top:4px;display:none;">Veuillez choisir un résultat.</div>
        </div>
        <div class="form-group">
          <label>Date du résultat</label>
          <input type="date" class="form-control" id="om-outcome-date" value="${today}">
        </div>
        <div class="form-group">
          <label>Observations</label>
          <textarea class="form-control" id="om-outcome-notes" rows="2" placeholder="Vos observations..."></textarea>
        </div>
      </div>

      <div class="form-section">
        <div class="form-section-title">Lier un résultat concours <span style="font-weight:400;text-transform:none;letter-spacing:0;">(optionnel)</span></div>
        <div class="form-group">
          <label>Date du concours</label>
          <input type="date" class="form-control" id="om-concours-date" value="${today}">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div class="form-group">
            <label>Distance (km)</label>
            <input type="number" class="form-control" id="om-distance" step="0.1" min="0" placeholder="ex: 150.5">
          </div>
          <div class="form-group">
            <label>Position d'arrivée</label>
            <input type="number" class="form-control" id="om-classement" min="1" placeholder="ex: 3">
          </div>
        </div>
        <div class="form-group">
          <label>Nombre de pigeons engagés</label>
          <input type="number" class="form-control" id="om-nb-partants" min="1" placeholder="ex: 120">
        </div>
      </div>

      <label class="share-block" for="om-share">
        <input type="checkbox" id="om-share">
        <div>
          <div style="font-size:0.88rem;font-weight:500;">Partager ce feedback de façon anonyme pour améliorer l'IA collective</div>
          <div style="font-size:0.75rem;color:var(--text-light);margin-top:2px;">Aucune donnée personnelle transmise — uniquement les scores numériques</div>
        </div>
      </label>

      <div class="modal-footer">
        <button class="btn btn-ghost" id="om-cancel">Annuler</button>
        <button class="btn btn-primary" id="om-save">Enregistrer →</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => overlay.remove();

  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  overlay.querySelector('#om-cancel').addEventListener('click', close);

  overlay.querySelector('#om-save').addEventListener('click', async () => {
    const outcome      = overlay.querySelector('#om-outcome').value;
    const outcomeDate  = overlay.querySelector('#om-outcome-date').value;
    const outcomeNotes = overlay.querySelector('#om-outcome-notes').value.trim();
    const concoursDate = overlay.querySelector('#om-concours-date').value;
    const distance     = overlay.querySelector('#om-distance').value;
    const classement   = overlay.querySelector('#om-classement').value;
    const nbPartants   = overlay.querySelector('#om-nb-partants').value;
    const share        = overlay.querySelector('#om-share').checked;

    const errEl = overlay.querySelector('#om-outcome-error');
    if (!outcome) {
      errEl.style.display = 'block';
      return;
    }
    errEl.style.display = 'none';

    const saveBtn = overlay.querySelector('#om-save');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="loader-inline"></span> Enregistrement...';

    try {
      await AIAPI.resolveRecommendationWithOutcome(recId, {
        outcome,
        outcome_notes: outcomeNotes || null,
        outcome_date: outcomeDate || null,
      });
    } catch (err) {
      showToast(err.message || 'Erreur lors de la résolution', 'error');
      saveBtn.disabled = false;
      saveBtn.textContent = 'Enregistrer →';
      return;
    }

    if (distance || classement) {
      try {
        await AIAPI.submitConcoursFeedback({
          pigeon_id:         pigeonId,
          recommendation_id: recId,
          snapshot_id:       snapId || null,
          concours_date:     concoursDate || today,
          distance_km:       distance ? parseFloat(distance) : null,
          classement:        classement ? parseInt(classement) : null,
          nb_partants:       nbPartants ? parseInt(nbPartants) : null,
          outcome,
          notes:             outcomeNotes || null,
          share_anonymized:  share,
        });
      } catch (err) {
        showToast('Feedback résultat non enregistré : ' + (err.message || 'erreur'), 'warning');
      }
    }

    showToast('Feedback enregistré !', 'success');
    close();
    loadAIForPigeon(pigeonId);
  });
}

/* ——— Toggle recommandations résolues ——— */
function toggleResolvedRecs() {
  const el = document.getElementById('resolved-recs');
  if (!el) return;
  const isHidden = el.style.display === 'none';
  el.style.display = isHidden ? 'block' : 'none';
}
