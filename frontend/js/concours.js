// ============================================================
// MODULE CONCOURS — Colombophilie V3
// Trois modes arrivée : manuelle, import CSV/Excel, Benzing Live!
// ============================================================

// ── État du module ───────────────────────────────────────────
let concoursState = {
  tous: [],
  concoursActif: null,          // concours ouvert dans la vue détail
  ongletActif: 'engagements',
  benzingActif: false,
  benzingInterval: null,
  modeArrivee: 'manuel',        // 'manuel' | 'import' | 'benzing'
};

// ── Labels ───────────────────────────────────────────────────
function categoriesLabels() {
  return {
    vieux_coqs: t('concours_module.categories.vieux_coqs'),
    yearlings:  t('concours_module.categories.yearlings'),
    jeunes:     t('concours_module.categories.jeunes'),
    femelles:   t('concours_module.categories.femelles'),
  };
}

function statutEngagementLabels() {
  return {
    engage:             { label: t('concours_module.engagement_status.engage'),            css: '#2980B9', bg: '#D6EAF8' },
    rentre_classe:      { label: t('concours_module.engagement_status.rentre_classe'),      css: '#1E8449', bg: '#D5F5E3' },
    rentre_non_classe:  { label: t('concours_module.engagement_status.rentre_non_classe'),  css: '#7D6608', bg: '#FDEBD0' },
    non_rentre_jour:    { label: t('concours_module.engagement_status.non_rentre_jour'),    css: '#922B21', bg: '#FADBD8' },
    perdu:              { label: t('concours_module.engagement_status.perdu'),              css: '#717D7E', bg: '#EAECEE' },
  };
}

function statutConcoursLabels() {
  return {
    a_venir:  { label: t('concours_module.status.a_venir'),  css: '#2980B9', bg: '#D6EAF8' },
    en_cours: { label: t('concours_module.status.en_cours'), css: '#1E8449', bg: '#D5F5E3' },
    termine:  { label: t('concours_module.status.termine'),  css: '#717D7E', bg: '#EAECEE' },
    annule:   { label: t('concours_module.status.annule'),   css: '#922B21', bg: '#FADBD8' },
  };
}

// ═══════════════════════════════════════════════════════════════
// LISTE DES CONCOURS
// ═══════════════════════════════════════════════════════════════

async function loadConcours() {
  const content = document.getElementById('content');
  content.innerHTML = `<div class="loading">${t('common.loading')}</div>`;
  try {
    concoursState.tous = await apiFetch('/concours/');
    _renderListeConcours();
  } catch (e) {
    content.innerHTML = `<div class="empty-state"><div class="empty-state-icon">❌</div><div class="empty-state-text">${t('concours_module.error_loading')}</div></div>`;
  }
}

function _renderListeConcours() {
  const content = document.getElementById('content');
  const liste = concoursState.tous;

  if (!liste.length) {
    content.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🏆</div>
        <div class="empty-state-text">${t('concours_module.empty.title')}</div>
        <div class="empty-state-sub">${t('concours_module.empty.sub')}</div>
      </div>`;
    return;
  }

  // Filtres
  const annees = [...new Set(liste.map(c => new Date(c.date).getFullYear()))].sort((a, b) => b - a);
  const statuts = [...new Set(liste.map(c => c.statut))];

  content.innerHTML = `
    <div style="display:flex; gap:12px; margin-bottom:16px; flex-wrap:wrap; align-items:center;">
      <select class="form-control" style="width:auto;" onchange="filtrerConcours()">
        <option value="">${t('concours_module.filter.all_seasons')}</option>
        ${annees.map(a => `<option value="${a}">${a}</option>`).join('')}
      </select>
      <select class="form-control" id="filtre-statut-concours" style="width:auto;" onchange="filtrerConcours()">
        <option value="">${t('concours_module.filter.all_status')}</option>
        <option value="a_venir">${t('concours_module.status.a_venir')}</option>
        <option value="en_cours">${t('concours_module.status.en_cours')}</option>
        <option value="termine">${t('concours_module.status.termine')}</option>
        <option value="annule">${t('concours_module.status.annule')}</option>
      </select>
      <span id="concours-compteur" style="color:var(--text-light);font-size:13px;"></span>
    </div>
    <div class="card">
      <div class="table-container">
        <table id="concours-table">
          <thead>
            <tr>
              <th>${t('concours_module.table.nom')}</th>
              <th>${t('concours_module.table.date')}</th>
              <th>${t('concours_module.table.lieu')}</th>
              <th>${t('concours_module.table.distance')}</th>
              <th>${t('concours_module.table.statut')}</th>
              <th>${t('concours_module.table.engages')}</th>
              <th>${t('concours_module.table.actions')}</th>
            </tr>
          </thead>
          <tbody id="concours-tbody"></tbody>
        </table>
      </div>
    </div>`;

  _renderConcoursTbody(liste);
}

function _renderConcoursTbody(liste) {
  const tbody = document.getElementById('concours-tbody');
  const cpt = document.getElementById('concours-compteur');
  if (!tbody) return;
  cpt && (cpt.textContent = t('concours_module.compteur', { count: liste.length }));

  tbody.innerHTML = liste.map(c => {
    const s = statutConcoursLabels()[c.statut] || { label: c.statut, css: '#000', bg: '#eee' };
    const dist = c.distance_m ? `${(c.distance_m / 1000).toFixed(0)} km` : '—';
    const date = fmtDate(c.date);
    const nbEng = (c.engagements || []).length;
    return `
      <tr style="cursor:pointer;" onclick="ouvrirDetailConcours('${c.id}')">
        <td><strong>${c.nom}</strong></td>
        <td>${date}</td>
        <td>${c.lieu_lacher || '—'}</td>
        <td>${dist}</td>
        <td><span class="badge" style="color:${s.css};background:${s.bg};">${s.label}</span></td>
        <td>${nbEng}</td>
        <td onclick="event.stopPropagation()">
          <button class="btn btn-secondary" style="padding:4px 10px;font-size:12px;" onclick="ouvrirDetailConcours('${c.id}')">${t('concours_module.btn.detail')}</button>
          <button class="btn btn-secondary" style="padding:4px 10px;font-size:12px;" onclick="ouvrirEditConcours('${c.id}')">✏️</button>
          <button class="btn btn-danger" style="padding:4px 10px;font-size:12px;" onclick="supprimerConcours('${c.id}','${c.nom.replace(/'/g,"\\'")}')">🗑️</button>
        </td>
      </tr>`;
  }).join('');
}

function filtrerConcours() {
  const annee = document.querySelector('#content select')?.value;
  const statut = document.getElementById('filtre-statut-concours')?.value;
  let liste = concoursState.tous;
  if (annee) liste = liste.filter(c => new Date(c.date).getFullYear() === parseInt(annee));
  if (statut) liste = liste.filter(c => c.statut === statut);
  _renderConcoursTbody(liste);
}

// ── Formulaire Nouveau / Édition ─────────────────────────────

function _formConcours(c = {}) {
  return `
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">${t('concours_module.form.nom_label')}</label>
        <input type="text" class="form-control" id="f-c-nom" value="${c.nom || ''}" placeholder="${t('concours_module.form.nom_placeholder')}">
      </div>
      <div class="form-group">
        <label class="form-label">${t('concours_module.form.date_label')}</label>
        <input type="date" class="form-control" id="f-c-date" value="${c.date || ''}">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">${t('concours_module.form.lieu_label')}</label>
        <input type="text" class="form-control" id="f-c-lieu" value="${c.lieu_lacher || ''}" placeholder="${t('concours_module.form.lieu_placeholder')}">
      </div>
      <div class="form-group">
        <label class="form-label">${t('concours_module.form.distance_label')}</label>
        <input type="number" class="form-control" id="f-c-distance" value="${c.distance_m || ''}" placeholder="${t('concours_module.form.distance_placeholder')}">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">${t('concours_module.form.heure_label')}</label>
        <input type="time" class="form-control" id="f-c-heure" step="1" value="${c.heure_lacher ? c.heure_lacher.substring(0,5) : ''}">
      </div>
      <div class="form-group">
        <label class="form-label">${t('concours_module.form.ref_label')}</label>
        <input type="text" class="form-control" id="f-c-ref" value="${c.ref_fede || ''}" placeholder="${t('concours_module.form.ref_placeholder')}">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">${t('concours_module.form.notes_label')}</label>
      <textarea class="form-control" id="f-c-notes" rows="2" placeholder="${t('concours_module.form.notes_placeholder')}">${c.notes || ''}</textarea>
    </div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">${t('common.cancel')}</button>
      <button class="btn btn-primary" onclick="sauvegarderConcours('${c.id || ''}')">
        ${c.id ? t('concours_module.form.submit_edit') : t('concours_module.form.submit_create')}
      </button>
    </div>`;
}

function ouvrirNouveauConcours() {
  openModal(t('concours_module.modal.add_title'), _formConcours());
}

async function ouvrirEditConcours(id) {
  const c = concoursState.tous.find(x => x.id === id) || await apiFetch(`/concours/${id}`);
  openModal(t('concours_module.modal.edit_title'), _formConcours(c));
}

async function sauvegarderConcours(id = '') {
  const nom = document.getElementById('f-c-nom').value.trim();
  const date = document.getElementById('f-c-date').value;
  if (!nom || !date) { showNotification(t('concours_module.msg.nom_date_required'), 'danger'); return; }

  const heure = document.getElementById('f-c-heure').value;
  const data = {
    nom,
    date,
    lieu_lacher: document.getElementById('f-c-lieu').value.trim() || null,
    distance_m: parseInt(document.getElementById('f-c-distance').value) || null,
    heure_lacher: heure ? heure.substring(0, 8).padEnd(8, ':00') : null,
    ref_fede: document.getElementById('f-c-ref').value.trim() || null,
    notes: document.getElementById('f-c-notes').value.trim() || null,
  };

  try {
    if (id) {
      await apiFetch(`/concours/${id}`, { method: 'PUT', body: JSON.stringify(data) });
      showNotification(t('concours_module.msg.updated'));
    } else {
      await apiFetch('/concours/', { method: 'POST', body: JSON.stringify(data) });
      showNotification(t('concours_module.msg.created'));
    }
    closeModal();
    loadConcours();
  } catch (e) { /* notification gérée par apiFetch */ }
}

function supprimerConcours(id, nom) {
  confirmDelete(t('concours_module.msg.delete_confirm', { nom }), async () => {
    try {
      await apiFetch(`/concours/${id}`, { method: 'DELETE' });
      showNotification(t('concours_module.msg.deleted'));
      loadConcours();
    } catch (e) {}
  });
}

// ═══════════════════════════════════════════════════════════════
// VUE DÉTAIL — 3 ONGLETS
// ═══════════════════════════════════════════════════════════════

async function ouvrirDetailConcours(id) {
  const content = document.getElementById('content');
  content.innerHTML = `<div class="loading">${t('common.loading')}</div>`;

  try {
    const concours = await apiFetch(`/concours/${id}`);
    concoursState.concoursActif = concours;
    _renderDetailConcours(concours);
  } catch (e) {
    content.innerHTML = `<div class="empty-state"><div class="empty-state-text">${t('concours_module.error_loading')}</div></div>`;
  }
}

function _renderDetailConcours(c) {
  const content = document.getElementById('content');
  const s = statutConcoursLabels()[c.statut] || { label: c.statut, css: '#000', bg: '#eee' };
  const dist = c.distance_m ? `${(c.distance_m / 1000).toFixed(1)} km` : '—';

  content.innerHTML = `
    <!-- En-tête -->
    <div style="display:flex; align-items:center; gap:12px; margin-bottom:20px; flex-wrap:wrap;">
      <button class="btn btn-secondary" style="padding:6px 14px;" onclick="loadConcours()">${t('concours_module.detail.back')}</button>
      <div>
        <h2 style="margin:0;font-family:'Playfair Display',serif;">${c.nom}</h2>
        <div style="color:var(--text-light);font-size:13px;margin-top:2px;">
          📅 ${fmtDate(c.date)} &nbsp;|&nbsp; 📍 ${c.lieu_lacher || '—'} &nbsp;|&nbsp; 📏 ${dist}
          ${c.heure_lacher ? `&nbsp;|&nbsp; 🕐 ${t('concours_module.detail.lacher')} ${c.heure_lacher}` : ''}
        </div>
      </div>
      <span class="badge" style="color:${s.css};background:${s.bg};margin-left:auto;">${s.label}</span>
      <div style="display:flex;gap:8px;">
        <select class="form-control" style="width:auto;padding:6px 10px;font-size:13px;" onchange="changerStatutConcours('${c.id}', this.value)">
          <option value="">${t('concours_module.status.change_prompt')}</option>
          <option value="a_venir">${t('concours_module.status.a_venir')}</option>
          <option value="en_cours">${t('concours_module.status.en_cours')}</option>
          <option value="termine">${t('concours_module.status.termine')}</option>
          <option value="annule">${t('concours_module.status.annule')}</option>
        </select>
        <button class="btn btn-secondary" style="padding:6px 12px;" onclick="ouvrirEditConcours('${c.id}')">${t('concours_module.detail.btn_edit')}</button>
        <button class="btn btn-secondary" style="padding:6px 12px;" onclick="imprimerFeuilleEngagement('${c.id}')">${t('concours_module.detail.btn_feuille')}</button>
      </div>
    </div>

    <!-- Onglets -->
    <div style="display:flex; gap:0; border-bottom:2px solid var(--border); margin-bottom:20px;">
      <button class="onglet-btn" id="onglet-engagements" onclick="afficherOnglet('engagements','${c.id}')"
        style="padding:10px 20px;background:none;border:none;cursor:pointer;font-weight:600;font-size:14px;
          border-bottom:3px solid var(--accent);color:var(--accent);">
        ${t('concours_module.detail.tab_engagements', { count: (c.engagements||[]).length })}
      </button>
      <button class="onglet-btn" id="onglet-constatation" onclick="afficherOnglet('constatation','${c.id}')"
        style="padding:10px 20px;background:none;border:none;cursor:pointer;font-weight:600;font-size:14px;
          border-bottom:3px solid transparent;color:var(--text-light);">
        ${t('concours_module.detail.tab_constatation')}
      </button>
      <button class="onglet-btn" id="onglet-resultats" onclick="afficherOnglet('resultats','${c.id}')"
        style="padding:10px 20px;background:none;border:none;cursor:pointer;font-weight:600;font-size:14px;
          border-bottom:3px solid transparent;color:var(--text-light);">
        ${t('concours_module.detail.tab_resultats')}
      </button>
    </div>

    <!-- Contenu onglet -->
    <div id="onglet-content"></div>`;

  _renderOngletEngagements(c);
}

function afficherOnglet(onglet, concoursId) {
  concoursState.ongletActif = onglet;
  document.querySelectorAll('.onglet-btn').forEach(b => {
    const actif = b.id === `onglet-${onglet}`;
    b.style.borderBottomColor = actif ? 'var(--accent)' : 'transparent';
    b.style.color = actif ? 'var(--accent)' : 'var(--text-light)';
  });
  const c = concoursState.concoursActif;
  if (onglet === 'engagements') _renderOngletEngagements(c);
  if (onglet === 'constatation') _renderOngletConstatation(c);
  if (onglet === 'resultats') _renderOngletResultats(c);
}

async function changerStatutConcours(id, statut) {
  if (!statut) return;
  try {
    const updated = await apiFetch(`/concours/${id}/statut`, {
      method: 'PATCH',
      body: JSON.stringify({ statut }),
    });
    concoursState.concoursActif = updated;
    showNotification(t('concours_module.msg.status_updated'));
    _renderDetailConcours(updated);
  } catch (e) {}
}

// ═══════════════════════════════════════════════════════════════
// ONGLET 1 — ENGAGEMENTS
// ═══════════════════════════════════════════════════════════════

async function _renderOngletEngagements(c) {
  const div = document.getElementById('onglet-content');
  // Charger les pigeons pour le sélecteur
  let pigeons = [];
  try { pigeons = await apiFetch('/pigeons/'); } catch (e) {}

  const engages_ids = new Set((c.engagements || []).map(e => e.pigeon_id));
  const disponibles = pigeons.filter(p => !engages_ids.has(p.id) && p.statut !== 'perdu' && p.statut !== 'decede');

  const cats = Object.entries(categoriesLabels());

  div.innerHTML = `
    <!-- Ajouter un pigeon -->
    <div class="card" style="margin-bottom:16px;">
      <div class="card-title">${t('concours_module.engagement.add_title')}</div>
      <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;">
        <div class="form-group" style="margin:0;min-width:200px;flex:1;">
          <label class="form-label">${t('concours_module.engagement.pigeon_label')}</label>
          <select class="form-control" id="sel-pigeon-engagement" onchange="verifierEligibiliteUI('${c.id}')">
            <option value="">${t('concours_module.engagement.choose_pigeon')}</option>
            ${disponibles.map(p => `<option value="${p.id}" data-matricule="${p.matricule}">${p.matricule} (${p.annee_naissance})</option>`).join('')}
          </select>
        </div>
        <div class="form-group" style="margin:0;min-width:150px;">
          <label class="form-label">${t('concours_module.engagement.categorie_label')}</label>
          <select class="form-control" id="sel-categorie-engagement">
            ${cats.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}
          </select>
        </div>
        <div class="form-group" style="margin:0;width:100px;">
          <label class="form-label">${t('concours_module.engagement.mise_label')}</label>
          <input type="number" class="form-control" id="inp-mise-engagement" placeholder="0.00" step="0.01">
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;">
          <div id="eligibilite-badge" style="min-height:22px;"></div>
          <button class="btn btn-primary" onclick="ajouterEngagement('${c.id}')">${t('concours_module.engagement.submit')}</button>
        </div>
      </div>
    </div>

    <!-- Liste des engagements -->
    <div class="card">
      <div class="card-title">${t('concours_module.engagement.list_title', { count: (c.engagements||[]).length })}</div>
      ${(c.engagements||[]).length === 0
        ? `<div style="color:var(--text-light);text-align:center;padding:20px;">${t('concours_module.engagement.none_engaged')}</div>`
        : `<div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>${t('concours_module.engagement.table.matricule')}</th>
                  <th>${t('concours_module.engagement.table.annee')}</th>
                  <th>${t('concours_module.engagement.table.categorie')}</th>
                  <th>${t('concours_module.engagement.table.mise')}</th>
                  <th>${t('concours_module.engagement.table.eligibilite')}</th>
                  <th>${t('concours_module.engagement.table.statut')}</th>
                  <th>${t('concours_module.engagement.table.actions')}</th>
                </tr>
              </thead>
              <tbody>
                ${(c.engagements||[]).map(e => _rowEngagement(e, c.id)).join('')}
              </tbody>
            </table>
          </div>`}
    </div>`;
}

function _rowEngagement(e, concoursId) {
  const p = e.pigeon || {};
  const cat = categoriesLabels()[e.categorie] || e.categorie;
  const s = statutEngagementLabels()[e.statut] || { label: e.statut, css: '#000', bg: '#eee' };
  const elig = e.eligible
    ? t('concours_module.engagement.eligible_short')
    : `⚠️ <span title="${e.raison_ineligibilite || ''}">${t('concours_module.engagement.alerts_short')}</span>`;
  const eligColor = e.eligible ? '#1E8449' : '#E67E22';

  return `
    <tr>
      <td><strong>${p.matricule || '—'}</strong></td>
      <td>${p.annee_naissance || '—'}</td>
      <td>${cat}</td>
      <td>${e.mise != null ? e.mise + ' €' : '—'}</td>
      <td style="color:${eligColor};font-size:13px;">${elig}</td>
      <td><span class="badge" style="color:${s.css};background:${s.bg};">${s.label}</span></td>
      <td>
        <button class="btn btn-danger" style="padding:3px 8px;font-size:12px;"
          onclick="retirerEngagement('${concoursId}','${e.id}','${p.matricule}')">${t('concours_module.engagement.table.retirer')}</button>
      </td>
    </tr>`;
}

async function verifierEligibiliteUI(concoursId) {
  const sel = document.getElementById('sel-pigeon-engagement');
  const badge = document.getElementById('eligibilite-badge');
  const pigeonId = sel.value;
  if (!pigeonId) { badge.innerHTML = ''; return; }

  badge.innerHTML = `<span style="color:var(--text-light);font-size:12px;">${t('concours_module.engagement.checking')}</span>`;
  try {
    const elig = await apiFetch(`/concours/${concoursId}/eligibilite/${pigeonId}`);
    if (elig.eligible) {
      badge.innerHTML = `<span style="color:#1E8449;font-weight:600;">${t('concours_module.engagement.eligible_fcf')}</span>`;
    } else {
      badge.innerHTML = `<span style="color:#E67E22;font-weight:600;">${t('concours_module.engagement.alerts')}</span><br>
        <ul style="margin:2px 0 0 16px;font-size:12px;color:#E67E22;">
          ${elig.alertes.map(a => `<li>${a}</li>`).join('')}
        </ul>`;
    }
  } catch (e) { badge.innerHTML = ''; }
}

async function ajouterEngagement(concoursId) {
  const pigeonId = document.getElementById('sel-pigeon-engagement').value;
  const categorie = document.getElementById('sel-categorie-engagement').value;
  const mise = parseFloat(document.getElementById('inp-mise-engagement').value) || null;

  if (!pigeonId) { showNotification(t('concours_module.engagement.select_required'), 'danger'); return; }

  try {
    await apiFetch(`/concours/${concoursId}/engagements`, {
      method: 'POST',
      body: JSON.stringify({ pigeon_id: pigeonId, categorie, mise }),
    });
    showNotification(t('concours_module.engagement.added'));
    const updated = await apiFetch(`/concours/${concoursId}`);
    concoursState.concoursActif = updated;
    _renderOngletEngagements(updated);
  } catch (e) {}
}

async function retirerEngagement(concoursId, engId, matricule) {
  confirmDelete(t('concours_module.engagement.remove_confirm', { matricule }), async () => {
    try {
      await apiFetch(`/concours/${concoursId}/engagements/${engId}`, { method: 'DELETE' });
      showNotification(t('concours_module.engagement.removed'));
      const updated = await apiFetch(`/concours/${concoursId}`);
      concoursState.concoursActif = updated;
      _renderOngletEngagements(updated);
    } catch (e) {}
  });
}

// ═══════════════════════════════════════════════════════════════
// ONGLET 2 — CONSTATATION
// ═══════════════════════════════════════════════════════════════

function _renderOngletConstatation(c) {
  const div = document.getElementById('onglet-content');
  const engs = c.engagements || [];

  if (!engs.length) {
    div.innerHTML = `<div class="card"><p style="color:var(--text-light);">${t('concours_module.constatation.none_engaged')}</p></div>`;
    return;
  }

  div.innerHTML = `
    <!-- Sélection du mode -->
    <div class="card" style="margin-bottom:16px;">
      <div class="card-title">${t('concours_module.constatation.mode_title')}</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <button id="mode-btn-manuel" class="btn btn-primary" onclick="setModeArrivee('manuel','${c.id}')">${t('concours_module.constatation.mode_manuel')}</button>
        <button id="mode-btn-import" class="btn btn-secondary" onclick="setModeArrivee('import','${c.id}')">${t('concours_module.constatation.mode_import')}</button>
        <button id="mode-btn-benzing" class="btn btn-secondary" style="display:none;" onclick="setModeArrivee('benzing','${c.id}')">${t('concours_module.constatation.mode_benzing')}</button>
      </div>
      <div id="benzing-status-bar" style="margin-top:10px;display:none;"></div>
    </div>

    <!-- Zone mode import -->
    <div id="zone-import" style="display:none;" class="card" style="margin-bottom:16px;">
      <div class="card-title">${t('concours_module.constatation.import_title')}</div>
      <p style="font-size:13px;color:var(--text-light);">
        ${t('concours_module.constatation.import_intro')}
      </p>
      <div style="display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap;">
        <div class="form-group" style="margin:0;flex:1;">
          <label class="form-label">${t('concours_module.constatation.file_label')}</label>
          <input type="file" accept=".csv,.txt,.xlsx" class="form-control" id="csv-arrivees-file">
        </div>
        <button class="btn btn-primary" onclick="executerImportArrivees('${c.id}')">${t('concours_module.constatation.submit_import')}</button>
      </div>
      <div id="import-arrivees-result" style="margin-top:12px;"></div>
    </div>

    <!-- Tableau constatation -->
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <div class="card-title" style="margin:0;">${t('concours_module.constatation.table_title')}</div>
        <small style="color:var(--text-light);">
          ${t('concours_module.constatation.lacher')} : ${c.heure_lacher || '—'} | ${t('concours_module.constatation.distance')} : ${c.distance_m ? (c.distance_m/1000).toFixed(1)+' km' : '—'}
        </small>
      </div>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>${t('concours_module.constatation.table.matricule')}</th>
              <th>${t('concours_module.constatation.table.categorie')}</th>
              <th>${t('concours_module.constatation.table.heure_arrivee')}</th>
              <th>${t('concours_module.constatation.table.correction')}</th>
              <th>${t('concours_module.constatation.table.vitesse')}</th>
              <th>${t('concours_module.constatation.table.source')}</th>
              <th style="display:var(--col-manuel,table-cell);">${t('concours_module.constatation.table.save')}</th>
            </tr>
          </thead>
          <tbody id="tbody-constatation">
            ${engs.map(e => _rowConstatation(e, c)).join('')}
          </tbody>
        </table>
      </div>
    </div>`;

  // Vérifier disponibilité Benzing
  _checkBenzingDisponible(c.id);
}

function _rowConstatation(e, c) {
  const p = e.pigeon || {};
  const cat = categoriesLabels()[e.categorie] || e.categorie;
  const vitesse = e.vitesse_m_min ? `<strong>${e.vitesse_m_min.toFixed(1)}</strong> m/min` : '—';
  const source = e.source_arrivee
    ? `<span style="font-size:11px;color:var(--text-light);">${e.source_arrivee}</span>`
    : '';

  return `
    <tr id="row-const-${e.id}">
      <td><strong>${p.matricule || '—'}</strong></td>
      <td>${cat}</td>
      <td>
        <input type="time" step="1" class="form-control" id="h-arr-${e.id}"
          value="${e.heure_arrivee ? e.heure_arrivee.substring(0,5) : ''}"
          style="width:120px;padding:4px 8px;"
          oninput="previewVitesse('${e.id}','${c.distance_m||0}','${c.heure_lacher||''}')">
      </td>
      <td>
        <input type="number" class="form-control" id="corr-${e.id}"
          value="${e.correction_horloge_sec || 0}"
          style="width:80px;padding:4px 8px;"
          oninput="previewVitesse('${e.id}','${c.distance_m||0}','${c.heure_lacher||''}')">
      </td>
      <td id="vitesse-preview-${e.id}">${vitesse}</td>
      <td>${source}</td>
      <td class="col-btn-manuel">
        <button class="btn btn-primary" style="padding:4px 10px;font-size:12px;"
          onclick="enregistrerArrivee('${c.id}','${e.id}')">💾</button>
      </td>
    </tr>`;
}

function previewVitesse(engId, distM, heureLacher) {
  const hArr = (document.getElementById(`h-arr-${engId}`)?.value || '') + ':00';
  const corr = parseInt(document.getElementById(`corr-${engId}`)?.value || '0');
  const dist = parseInt(distM);
  const preview = document.getElementById(`vitesse-preview-${engId}`);
  if (!preview) return;

  if (!heureLacher || !dist || !hArr || hArr === ':00') {
    preview.innerHTML = '—';
    return;
  }
  try {
    const today = new Date().toISOString().split('T')[0];
    const base = new Date(`${today}T${heureLacher}`);
    let arrivee = new Date(`${today}T${hArr}`);
    if (arrivee < base) arrivee = new Date(arrivee.getTime() + 86400000);
    arrivee = new Date(arrivee.getTime() + corr * 1000);
    const tempMin = (arrivee - base) / 60000;
    if (tempMin <= 0) { preview.innerHTML = `<span style="color:red;">${t('concours_module.constatation.invalid_time')}</span>`; return; }
    const v = (dist / tempMin).toFixed(1);
    preview.innerHTML = `<strong>${v}</strong> m/min`;
  } catch {
    preview.innerHTML = '—';
  }
}

async function enregistrerArrivee(concoursId, engId) {
  const heure = document.getElementById(`h-arr-${engId}`)?.value;
  const corr = parseInt(document.getElementById(`corr-${engId}`)?.value || '0');
  if (!heure) { showNotification(t('concours_module.constatation.arrival_required'), 'danger'); return; }

  try {
    await apiFetch(`/concours/${concoursId}/engagements/${engId}/arrivee`, {
      method: 'PATCH',
      body: JSON.stringify({ heure_arrivee: heure.substring(0, 8).padEnd(8, ':00'), correction_horloge_sec: corr }),
    });
    showNotification(t('concours_module.constatation.arrival_saved'));
    const updated = await apiFetch(`/concours/${concoursId}`);
    concoursState.concoursActif = updated;
    _renderOngletConstatation(updated);
  } catch (e) {}
}

function setModeArrivee(mode, concoursId) {
  concoursState.modeArrivee = mode;
  ['manuel', 'import', 'benzing'].forEach(m => {
    const btn = document.getElementById(`mode-btn-${m}`);
    if (btn) btn.className = `btn ${m === mode ? 'btn-primary' : 'btn-secondary'}`;
  });

  const zoneImport = document.getElementById('zone-import');
  const colBtns = document.querySelectorAll('.col-btn-manuel');

  if (mode === 'import') {
    zoneImport && (zoneImport.style.display = 'block');
    colBtns.forEach(b => b.style.display = 'none');
  } else {
    zoneImport && (zoneImport.style.display = 'none');
    colBtns.forEach(b => b.style.display = '');
  }

  if (mode === 'benzing') {
    _renderBenzingControls(concoursId);
  } else {
    const bar = document.getElementById('benzing-status-bar');
    if (bar) bar.style.display = 'none';
    if (concoursState.benzingActif) arreterBenzing(concoursId);
  }
}

async function _checkBenzingDisponible(concoursId) {
  try {
    const status = await apiFetch(`/concours/${concoursId}/benzing/status`);
    const btn = document.getElementById('mode-btn-benzing');
    if (btn && status.available) btn.style.display = 'inline-flex';
  } catch (e) {}
}

function _renderBenzingControls(concoursId) {
  const bar = document.getElementById('benzing-status-bar');
  if (!bar) return;
  bar.style.display = 'block';
  bar.innerHTML = `
    <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
      <button class="btn btn-primary" id="btn-start-benzing" onclick="demarrerBenzing('${concoursId}')">${t('concours_module.benzing.start')}</button>
      <button class="btn btn-secondary" onclick="arreterBenzing('${concoursId}')">${t('concours_module.benzing.stop')}</button>
      <button class="btn btn-secondary" onclick="flushBenzing('${concoursId}')">${t('concours_module.benzing.apply')}</button>
      <span id="benzing-badge" style="font-size:13px;color:var(--text-light);">${t('concours_module.benzing.waiting')}</span>
    </div>`;
}

async function demarrerBenzing(concoursId) {
  try {
    const res = await apiFetch(`/concours/${concoursId}/benzing/start-watch`, { method: 'POST' });
    concoursState.benzingActif = true;
    const badge = document.getElementById('benzing-badge');
    if (badge) badge.innerHTML = `<span style="color:#1E8449;">${t('concours_module.benzing.listening')}</span>`;
    concoursState.benzingInterval = setInterval(() => _updateBenzingStatus(concoursId), 5000);
  } catch (e) {}
}

async function arreterBenzing(concoursId) {
  clearInterval(concoursState.benzingInterval);
  concoursState.benzingActif = false;
  try {
    await apiFetch(`/concours/${concoursId}/benzing/stop-watch`, { method: 'POST' });
    const badge = document.getElementById('benzing-badge');
    if (badge) badge.textContent = t('concours_module.benzing.stopped');
  } catch (e) {}
}

async function _updateBenzingStatus(concoursId) {
  try {
    const status = await apiFetch(`/concours/${concoursId}/benzing/status`);
    const badge = document.getElementById('benzing-badge');
    if (badge) badge.innerHTML = `<span style="color:#1E8449;">${t('concours_module.benzing.status_pending', { n: status.pending_lines || 0 })}</span>`;
  } catch (e) {}
}

async function flushBenzing(concoursId) {
  try {
    const res = await apiFetch(`/concours/${concoursId}/benzing/flush`, { method: 'POST' });
    showNotification(t('concours_module.benzing.flushed', { count: res.traites, n: res.traites }));
    const updated = await apiFetch(`/concours/${concoursId}`);
    concoursState.concoursActif = updated;
    _renderOngletConstatation(updated);
  } catch (e) {}
}

async function executerImportArrivees(concoursId) {
  const input = document.getElementById('csv-arrivees-file');
  const resultDiv = document.getElementById('import-arrivees-result');
  if (!input?.files?.length) { showNotification(t('concours_module.constatation.select_file'), 'danger'); return; }

  const formData = new FormData();
  formData.append('file', input.files[0]);

  try {
    const res = await fetch(`${API_URL}/concours/${concoursId}/import-arrivees`, {
      method: 'POST', body: formData,
    });
    const data = await res.json();
    resultDiv.innerHTML = `
      <div style="margin-top:8px;font-size:13px;">
        <div style="color:#1E8449;">${t('concours_module.import_arrivees.imported', { count: data.traites, n: data.traites })}</div>
        ${data.non_trouves.length ? `<div style="color:#E67E22;">${t('concours_module.import_arrivees.not_found', { liste: data.non_trouves.join(', ') })}</div>` : ''}
        ${data.erreurs.length ? `<div style="color:#E74C3C;">${t('concours_module.import_arrivees.errors')}<ul style="margin:4px 0 0 16px;">${data.erreurs.map(e => `<li>${e}</li>`).join('')}</ul></div>` : ''}
      </div>`;
    if (data.traites > 0) {
      const updated = await apiFetch(`/concours/${concoursId}`);
      concoursState.concoursActif = updated;
      _renderOngletConstatation(updated);
    }
  } catch (e) {
    resultDiv.innerHTML = `<div style="color:#E74C3C;">${t('concours_module.import_arrivees.generic_error')}</div>`;
  }
}

// ═══════════════════════════════════════════════════════════════
// ONGLET 3 — RÉSULTATS
// ═══════════════════════════════════════════════════════════════

function _renderOngletResultats(c) {
  const div = document.getElementById('onglet-content');
  const engs = (c.engagements || []).filter(e => e.heure_arrivee);

  // Grouper par catégorie
  const byCat = {};
  for (const e of c.engagements || []) {
    const cat = e.categorie || 'engage';
    if (!byCat[cat]) byCat[cat] = [];
    byCat[cat].push(e);
  }

  const calcAS = (e) => {
    if (!e.classement_officiel || !e.nb_engages_categorie) return '—';
    return (e.classement_officiel * 1000 / e.nb_engages_categorie).toFixed(1);
  };

  div.innerHTML = `
    <!-- Total engagés officiel -->
    <div class="card" style="margin-bottom:16px;">
      <div class="card-title" style="margin-bottom:12px;">${t('concours_module.resultats.official_data_title')}</div>
      <div style="display:flex;gap:20px;flex-wrap:wrap;align-items:flex-end;">
        <div class="form-group" style="margin:0;">
          <label class="form-label">${t('concours_module.resultats.total_engages_label')}</label>
          <input type="number" class="form-control" id="inp-total-engages" style="width:140px;"
            value="${c.nb_total_engages_officiel || ''}" placeholder="${t('concours_module.resultats.total_placeholder')}">
        </div>
        <button class="btn btn-primary" onclick="sauvegarderTotalEngages('${c.id}')">${t('concours_module.resultats.save')}</button>
      </div>
    </div>

    <!-- Résultats par catégorie -->
    ${Object.entries(byCat).map(([cat, list]) => `
      <div class="card" style="margin-bottom:16px;">
        <div class="card-title">${categoriesLabels()[cat] || cat}</div>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>${t('concours_module.resultats.table.matricule')}</th>
                <th>${t('concours_module.resultats.table.heure_arrivee')}</th>
                <th>${t('concours_module.resultats.table.vitesse')}</th>
                <th>${t('concours_module.resultats.table.classement_off')}</th>
                <th>${t('concours_module.resultats.table.nb_engages_cat')}</th>
                <th>${t('concours_module.resultats.table.score_as')}</th>
                <th>${t('concours_module.resultats.table.statut')}</th>
                <th>${t('concours_module.resultats.table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              ${list.map(e => _rowResultat(e, c.id)).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `).join('')}`;
}

function _rowResultat(e, concoursId) {
  const p = e.pigeon || {};
  const s = statutEngagementLabels()[e.statut] || { label: e.statut, css: '#000', bg: '#eee' };

  return `
    <tr>
      <td><strong>${p.matricule || '—'}</strong></td>
      <td>${e.heure_arrivee || '—'}</td>
      <td>${e.vitesse_m_min ? e.vitesse_m_min.toFixed(1) : '—'}</td>
      <td>
        <input type="number" class="form-control" id="cls-${e.id}"
          value="${e.classement_officiel || ''}" style="width:80px;padding:4px 8px;" placeholder="${t('concours_module.resultats.classement_placeholder')}">
      </td>
      <td>
        <input type="number" class="form-control" id="nbeng-${e.id}"
          value="${e.nb_engages_categorie || ''}" style="width:80px;padding:4px 8px;" placeholder="${t('concours_module.resultats.nb_engages_placeholder')}">
      </td>
      <td id="as-${e.id}">
        ${e.classement_officiel && e.nb_engages_categorie
          ? (e.classement_officiel * 1000 / e.nb_engages_categorie).toFixed(1)
          : '—'}
      </td>
      <td>
        <select class="form-control" id="stat-${e.id}" style="padding:4px 8px;font-size:13px;">
          ${Object.entries(statutEngagementLabels()).map(([v, d]) =>
            `<option value="${v}" ${e.statut === v ? 'selected' : ''}>${d.label}</option>`
          ).join('')}
        </select>
      </td>
      <td>
        <button class="btn btn-primary" style="padding:4px 10px;font-size:12px;"
          onclick="enregistrerResultat('${concoursId}','${e.id}')">💾</button>
      </td>
    </tr>`;
}

async function enregistrerResultat(concoursId, engId) {
  const classement = parseInt(document.getElementById(`cls-${engId}`)?.value) || null;
  const nbEngs = parseInt(document.getElementById(`nbeng-${engId}`)?.value) || null;
  const statut = document.getElementById(`stat-${engId}`)?.value;

  try {
    await apiFetch(`/concours/${concoursId}/engagements/${engId}/resultat`, {
      method: 'PATCH',
      body: JSON.stringify({ classement_officiel: classement, nb_engages_categorie: nbEngs, statut }),
    });
    showNotification(t('concours_module.resultats.result_saved'));
    // Mise à jour preview AS
    if (classement && nbEngs) {
      const asEl = document.getElementById(`as-${engId}`);
      if (asEl) asEl.textContent = (classement * 1000 / nbEngs).toFixed(1);
    }
    const updated = await apiFetch(`/concours/${concoursId}`);
    concoursState.concoursActif = updated;
  } catch (e) {}
}

async function sauvegarderTotalEngages(concoursId) {
  const nb = parseInt(document.getElementById('inp-total-engages')?.value) || null;
  try {
    await apiFetch(`/concours/${concoursId}`, {
      method: 'PUT',
      body: JSON.stringify({ nb_total_engages_officiel: nb }),
    });
    showNotification(t('concours_module.resultats.total_saved'));
  } catch (e) {}
}

// ═══════════════════════════════════════════════════════════════
// FEUILLE D'ENGAGEMENT IMPRIMABLE
// ═══════════════════════════════════════════════════════════════

async function imprimerFeuilleEngagement(concoursId) {
  try {
    const data = await apiFetch(`/concours/${concoursId}/feuille-engagement`);
    const c = data.concours;

    const lignesCats = Object.entries(data.par_categorie).map(([cat, pigeons]) => {
      const rows = pigeons.map(p => `
        <tr>
          <td>${p.matricule}</td>
          <td>${p.annee}</td>
          <td>${p.couleur || '—'}</td>
          <td>${p.case || '—'}</td>
          <td>${categoriesLabels()[p.categorie] || p.categorie}</td>
          <td>${p.mise != null ? p.mise + ' €' : '—'}</td>
          <td style="color:${p.eligible ? '#1E8449' : '#E67E22'}">${p.eligible ? '✅' : '⚠️'}</td>
        </tr>`).join('');
      return `
        <tr style="background:#f0f0f0;"><td colspan="7"><strong>${categoriesLabels()[cat] || cat}</strong></td></tr>
        ${rows}`;
    }).join('');

    const html = `
      <!DOCTYPE html><html lang="fr"><head>
        <meta charset="UTF-8">
        <title>${t('concours_module.feuille.title', { nom: c.nom })}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; font-size: 13px; }
          h1 { font-size: 18px; margin-bottom: 4px; }
          .infos { color: #555; margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th, td { border: 1px solid #ccc; padding: 5px 8px; text-align: left; }
          th { background: #2C3E50; color: white; }
          .footer { margin-top: 20px; font-size: 11px; color: #999; }
          @media print { body { margin: 10px; } }
        </style>
      </head><body>
        <h1>🏆 ${t('concours_module.feuille.title', { nom: c.nom })}</h1>
        <div class="infos">
          📅 ${c.date} &nbsp;|&nbsp; 📍 ${c.lieu_lacher || '—'}
          ${c.distance_km ? `&nbsp;|&nbsp; 📏 ${c.distance_km} km` : ''}
          ${c.heure_lacher ? `&nbsp;|&nbsp; 🕐 ${t('concours_module.feuille.lacher')} ${c.heure_lacher}` : ''}
          &nbsp;|&nbsp; ${t('concours_module.feuille.total', { count: data.nb_total, n: data.nb_total })}
        </div>
        <table>
          <thead>
            <tr>
              <th>${t('concours_module.feuille.table.matricule')}</th><th>${t('concours_module.feuille.table.annee')}</th><th>${t('concours_module.feuille.table.couleur')}</th><th>${t('concours_module.feuille.table.case')}</th>
              <th>${t('concours_module.feuille.table.categorie')}</th><th>${t('concours_module.feuille.table.mise')}</th><th>${t('concours_module.feuille.table.eligible')}</th>
            </tr>
          </thead>
          <tbody>${lignesCats}</tbody>
        </table>
        <div class="footer">${t('concours_module.feuille.footer', { date: new Date().toLocaleDateString(getLocaleCode()) })}</div>
        <script>window.print();<\/script>
      </body></html>`;

    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
  } catch (e) {
    showNotification(t('concours_module.feuille.error'), 'danger');
  }
}

// ═══════════════════════════════════════════════════════════════
// STATISTIQUES AS PIGEON
// ═══════════════════════════════════════════════════════════════

async function loadStatsAS() {
  const annee = new Date().getFullYear();
  const content = document.getElementById('onglet-content') || document.getElementById('content');
  content.innerHTML = `<div class="loading">${t('concours_module.loading_stats')}</div>`;
  try {
    const stats = await apiFetch(`/concours/stats/as-pigeon?annee=${annee}`);
    content.innerHTML = `
      <div class="card">
        <div class="card-title">${t('concours_module.stats_as.title', { annee })}</div>
        ${!stats.length ? `<p style="color:var(--text-light);">${t('concours_module.stats_as.no_data')}</p>` : `
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>${t('concours_module.stats_as.table.rank')}</th><th>${t('concours_module.stats_as.table.matricule')}</th><th>${t('concours_module.stats_as.table.concours')}</th><th>${t('concours_module.stats_as.table.classes')}</th>
                <th>${t('concours_module.stats_as.table.taux_retour')}</th><th>${t('concours_module.stats_as.table.vitesse_moy')}</th><th>${t('concours_module.stats_as.table.meilleure_v')}</th>
                <th>${t('concours_module.stats_as.table.points_as')}</th><th>${t('concours_module.stats_as.table.score_as')}</th>
              </tr>
            </thead>
            <tbody>
              ${stats.map((s, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td><strong>${s.matricule}</strong></td>
                  <td>${s.nb_concours}</td>
                  <td>${s.nb_classes}</td>
                  <td>${s.taux_retour} %</td>
                  <td>${s.vitesse_moyenne ? s.vitesse_moyenne.toFixed(1) + ' m/min' : '—'}</td>
                  <td>${s.meilleure_vitesse ? s.meilleure_vitesse.toFixed(1) + ' m/min' : '—'}</td>
                  <td><strong>${s.points_as}</strong></td>
                  <td>${s.score_as ? s.score_as.toFixed(1) : '—'}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>`}
      </div>`;
  } catch (e) {
    content.innerHTML = `<div class="empty-state"><div class="empty-state-text">${t('concours_module.error_loading')}</div></div>`;
  }
}
