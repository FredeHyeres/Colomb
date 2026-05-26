/* ============================================================
   SPORT-AI.JS — Centre recommandations IA
   Recommandations actives, snapshots sportifs, event store
   ============================================================ */

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
          ${renderRecommendations(actives, pigeonId, false)}
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

  } catch (err) {
    container.innerHTML = `<div class="card"><p style="color:var(--danger);">Erreur : ${err.message}</p></div>`;
    showToast(err.message, 'error');
  }
}

/* ——— Rendu recommandations ——— */
function renderRecommendations(recs, pigeonId, resolved) {
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

  const severityMap = {
    critical: { cls: 'critical', icon: '⚠️', label: 'Critique' },
    warning: { cls: 'warning', icon: '💡', label: 'Attention' },
    info: { cls: 'info', icon: 'ℹ️', label: 'Info' }
  };

  return recs.map(r => {
    const s = severityMap[r.severity] || { cls: 'info', icon: 'ℹ️', label: 'Info' };
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
            ${!resolved ? `<button class="btn btn-sm btn-success btn-resolve-rec" data-rec-id="${r.id}">✅ Résoudre</button>` : ''}
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
    return '<p style="color:var(--text-light);font-size:0.85rem;">Données de snapshot non disponibles.</p>';
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
    return '<div class="empty-state" style="padding:30px;"><p>Aucun événement enregistré.</p></div>';
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

/* ——— Toggle recommandations résolues ——— */
function toggleResolvedRecs() {
  const el = document.getElementById('resolved-recs');
  if (!el) return;
  const isHidden = el.style.display === 'none';
  el.style.display = isHidden ? 'block' : 'none';
}
