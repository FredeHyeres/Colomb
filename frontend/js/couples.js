// ===== COUPLES & REPRODUCTION =====

async function loadCouples() {
  const content = document.getElementById('content');
  const [couples, lignees] = await Promise.all([
    apiFetch('/couples/'),
    apiFetch('/lignees/'),
  ]);

  const actifs   = couples.filter(c => c.actif);
  const inactifs = couples.filter(c => !c.actif);

  if (couples.length === 0) {
    content.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">💑</div>
        <div class="empty-state-text">Aucun couple enregistré</div>
        <div class="empty-state-sub">Créez votre premier couple reproducteur</div>
      </div>`;
    return;
  }

  content.innerHTML = `
    ${actifs.length > 0 ? `
      <div class="card" style="margin-bottom:20px;">
        <div class="card-title">💑 Couples actifs (${actifs.length})</div>
        ${renderCouplesTable(actifs, false, lignees)}
      </div>` : ''}

    ${inactifs.length > 0 ? `
      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:center;
          margin-bottom:12px;">
          <div class="card-title" style="margin-bottom:0;">
            📁 Historique (${inactifs.length} couple${inactifs.length > 1 ? 's' : ''})
          </div>
          <button class="btn btn-secondary" style="font-size:12px; padding:6px 12px;"
            onclick="toggleHistorique()">
            <span id="histo-label">▼ Afficher</span>
          </button>
        </div>
        <div id="historique-content" style="display:none;">
          ${renderCouplesTable(inactifs, true, lignees)}
        </div>
      </div>` : ''}`;
}

function toggleHistorique() {
  const el  = document.getElementById('historique-content');
  const lbl = document.getElementById('histo-label');
  const hidden = el.style.display === 'none';
  el.style.display  = hidden ? '' : 'none';
  lbl.textContent   = hidden ? '▲ Masquer' : '▼ Afficher';
}

function renderCouplesTable(couples, grise = false, lignees = []) {
  const opacite = grise ? 'opacity:0.7;' : '';
  return `
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Case</th>
            <th>♂️ Mâle</th>
            <th>♀️ Femelle</th>
            <th>Année</th>
            <th>Nichées</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${couples.map(c => {
            const ligneeMale    = lignees.find(l => l.id === c.male?.lignee_id);
            const ligneeFemelle = lignees.find(l => l.id === c.femelle?.lignee_id);
            const styleMale    = ligneeStyle(ligneeMale);
            const styleFemelle = ligneeStyle(ligneeFemelle);
            return `
            <tr style="${opacite} ${styleMale.rowBg} ${styleMale.borderLeft}">
              <td>
                ${c.case_numero
                  ? `<span style="display:inline-block; padding:2px 10px;
                       border-radius:12px; background:#2980B9; color:#fff;
                       font-size:12px; font-weight:600;">${c.case_numero}</span>`
                  : '—'}
              </td>
              <td>
                <div><strong>${c.male ? c.male.matricule : '—'}</strong></div>
                ${ligneeMale
                  ? `<span style="${styleMale.badge}">${ligneeMale.nom}</span>`
                  : (c.male?.couleur_plumage
                      ? `<span style="font-size:12px; color:var(--text-light);">${c.male.couleur_plumage}</span>`
                      : '')}
              </td>
              <td>
                <div><strong>${c.femelle ? c.femelle.matricule : '—'}</strong></div>
                ${ligneeFemelle
                  ? `<span style="${styleFemelle.badge}">${ligneeFemelle.nom}</span>`
                  : (c.femelle?.couleur_plumage
                      ? `<span style="font-size:12px; color:var(--text-light);">${c.femelle.couleur_plumage}</span>`
                      : '')}
              </td>
              <td>${c.annee}</td>
              <td>
                <span style="display:inline-block; padding:2px 10px; border-radius:12px;
                  background:${c.nb_nichees > 0 ? '#27AE60' : '#95A5A6'};
                  color:#fff; font-size:12px; font-weight:600;">
                  🥚 ${c.nb_nichees}
                </span>
              </td>
              <td>
                <div style="display:flex; gap:6px; flex-wrap:wrap;">
                  <button class="btn btn-secondary"
                    onclick="openDetailCouple('${c.id}')"
                    style="padding:6px 10px; font-size:12px;">👁️</button>
                  ${c.actif ? `
                    <button class="btn btn-secondary"
                      onclick="dissolveCouple('${c.id}', '${(c.male?.matricule || '')}×${(c.femelle?.matricule || '')}')"
                      style="padding:6px 10px; font-size:12px;" title="Dissoudre">🔓</button>
                  ` : ''}
                  <button class="btn btn-danger"
                    onclick="deleteCouple('${c.id}', '${(c.male?.matricule || '')}×${(c.femelle?.matricule || '')}')"
                    style="padding:6px 10px; font-size:12px;">🗑️</button>
                </div>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
}

// ── Détail couple ─────────────────────────────────────────────────────────────

async function openDetailCouple(id) {
  const [c, lignees] = await Promise.all([
    apiFetch(`/couples/${id}`),
    apiFetch('/lignees/'),
  ]);
  const ligneeMale    = lignees.find(l => l.id === c.male?.lignee_id);
  const ligneeFemelle = lignees.find(l => l.id === c.femelle?.lignee_id);
  const styleMale    = ligneeStyle(ligneeMale);
  const styleFemelle = ligneeStyle(ligneeFemelle);

  const nicheeRows = c.nichees.length === 0
    ? `<tr><td colspan="6" style="text-align:center; color:var(--text-light);
         padding:16px;">Aucune nichée enregistrée</td></tr>`
    : c.nichees.map(n => {
        const anneeEclosion = n.date_eclosion
          ? new Date(n.date_eclosion).getFullYear()
          : new Date().getFullYear();
        return `
        <tr>
          <td style="padding:8px;">${fmtDate(n.date_ponte)}</td>
          <td style="padding:8px;">${fmtDate(n.date_eclosion)}</td>
          <td style="padding:8px; text-align:center;">${n.nombre_oeufs ?? '—'}</td>
          <td style="padding:8px; font-size:13px; max-width:160px; white-space:normal;">
            ${n.notes || '—'}
          </td>
          <td style="padding:8px; white-space:nowrap;">
            <button class="btn btn-secondary"
              onclick="openEditNichee('${n.id}', '${id}')"
              style="padding:4px 8px; font-size:11px;" title="Modifier">✏️</button>
            <button class="btn btn-secondary"
              onclick="openCreateJeuneFromNichee('${id}', ${anneeEclosion})"
              style="padding:4px 8px; font-size:11px; margin-left:4px;" title="Créer un jeune">🐣</button>
            <button class="btn btn-danger"
              onclick="deleteNichee('${n.id}', '${id}')"
              style="padding:4px 8px; font-size:11px; margin-left:4px;" title="Supprimer">🗑️</button>
          </td>
        </tr>`;
      }).join('');

  const html = `
    <!-- Infos couple -->
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;
      margin-bottom:16px;">
      <div style="background:${ligneeMale ? ligneeMale.couleur_label + '1A' : 'var(--bg)'};
        border-radius:10px; padding:16px;
        border-left:4px solid ${ligneeMale?.couleur_label || '#2980B9'};">
        <div style="font-size:11px; color:var(--text-light); margin-bottom:6px;
          text-transform:uppercase; font-weight:600;">♂️ Mâle</div>
        <div style="font-size:18px; font-weight:700; font-family:'Playfair Display',serif;">
          ${c.male ? c.male.matricule : 'Inconnu'}
        </div>
        ${c.male?.couleur_plumage
          ? `<div style="font-size:13px; color:var(--text-light); margin-top:4px;">
               ${c.male.couleur_plumage}</div>` : ''}
        <div style="margin-top:8px; display:flex; gap:6px; flex-wrap:wrap; align-items:center;">
          ${c.male ? badgeStatut(c.male.statut) : ''}
          ${ligneeMale ? `<span style="${styleMale.badge}">${ligneeMale.nom}</span>` : ''}
        </div>
      </div>
      <div style="background:${ligneeFemelle ? ligneeFemelle.couleur_label + '1A' : 'var(--bg)'};
        border-radius:10px; padding:16px;
        border-left:4px solid ${ligneeFemelle?.couleur_label || '#E91E8C'};">
        <div style="font-size:11px; color:var(--text-light); margin-bottom:6px;
          text-transform:uppercase; font-weight:600;">♀️ Femelle</div>
        <div style="font-size:18px; font-weight:700; font-family:'Playfair Display',serif;">
          ${c.femelle ? c.femelle.matricule : 'Inconnue'}
        </div>
        ${c.femelle?.couleur_plumage
          ? `<div style="font-size:13px; color:var(--text-light); margin-top:4px;">
               ${c.femelle.couleur_plumage}</div>` : ''}
        <div style="margin-top:8px; display:flex; gap:6px; flex-wrap:wrap; align-items:center;">
          ${c.femelle ? badgeStatut(c.femelle.statut) : ''}
          ${ligneeFemelle ? `<span style="${styleFemelle.badge}">${ligneeFemelle.nom}</span>` : ''}
        </div>
      </div>
    </div>

    <!-- Métadonnées -->
    <div style="display:flex; gap:24px; align-items:center;
      background:var(--bg); border-radius:10px; padding:12px 16px;
      margin-bottom:16px; font-size:14px;">
      <span>📍 Case : <strong>${c.case_numero || '—'}</strong></span>
      <span>📅 Année : <strong>${c.annee}</strong></span>
      <span>Statut : ${c.actif
        ? '<span style="background:#27AE60; color:#fff; padding:2px 10px; border-radius:12px; font-size:12px; font-weight:600;">Actif</span>'
        : '<span style="background:#95A5A6; color:#fff; padding:2px 10px; border-radius:12px; font-size:12px; font-weight:600;">Inactif</span>'}</span>
    </div>

    ${c.notes ? `
      <div style="background:var(--bg); border-radius:10px; padding:12px 16px;
        margin-bottom:16px; border-left:3px solid var(--accent); font-size:14px;">
        ${c.notes}
      </div>` : ''}

    <!-- Nichées -->
    <div style="display:flex; justify-content:space-between; align-items:center;
      margin-bottom:10px;">
      <div style="font-family:'Playfair Display',serif; font-weight:600; font-size:15px;">
        🥚 Nichées (${c.nichees.length})
      </div>
      ${c.actif ? `
        <button class="btn btn-primary" style="font-size:12px; padding:6px 14px;"
          onclick="openAddNichee('${id}')">+ Ajouter une nichée</button>
      ` : ''}
    </div>

    <div style="overflow-x:auto; margin-bottom:20px;">
      <table style="width:100%; font-size:13px; border-collapse:collapse;">
        <thead>
          <tr style="border-bottom:2px solid var(--border);">
            <th style="padding:6px 8px; text-align:left; font-size:11px;
              color:var(--text-light); text-transform:uppercase;">Date ponte</th>
            <th style="padding:6px 8px; text-align:left; font-size:11px;
              color:var(--text-light); text-transform:uppercase;">Date éclosion</th>
            <th style="padding:6px 8px; text-align:center; font-size:11px;
              color:var(--text-light); text-transform:uppercase;">Œufs</th>
            <th style="padding:6px 8px; text-align:left; font-size:11px;
              color:var(--text-light); text-transform:uppercase;">Notes</th>
            <th style="padding:6px 8px;"></th>
          </tr>
        </thead>
        <tbody>${nicheeRows}</tbody>
      </table>
    </div>

    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Fermer</button>
      ${c.actif ? `
        <button class="btn btn-secondary"
          onclick="dissolveCouple('${id}', '${(c.male?.matricule || '')}×${(c.femelle?.matricule || '')}')">
          🔓 Dissoudre
        </button>` : ''}
      <button class="btn btn-danger"
        onclick="deleteCouple('${id}', '${(c.male?.matricule || '')}×${(c.femelle?.matricule || '')}')">
        🗑️ Supprimer
      </button>
    </div>`;

  openModal(`💑 ${c.male?.matricule || '?'} × ${c.femelle?.matricule || '?'}`, html);
  document.getElementById('modal').style.width = '800px';
}

// ── Modifier une nichée ───────────────────────────────────────────────────────

async function openEditNichee(nicheeId, coupleId) {
  const n = await apiFetch(`/nichees/${nicheeId}`);

  openModal('✏️ Modifier la nichée', `
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Date de ponte</label>
        <input type="date" class="form-control" id="en-ponte"
          value="${n.date_ponte || ''}">
      </div>
      <div class="form-group">
        <label class="form-label">Date d'éclosion</label>
        <input type="date" class="form-control" id="en-eclosion"
          value="${n.date_eclosion || ''}">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Nombre d'œufs</label>
      <input type="number" class="form-control" id="en-oeufs"
        value="${n.nombre_oeufs ?? 2}" min="1" max="3">
    </div>
    <div class="form-group">
      <label class="form-label">Notes</label>
      <textarea class="form-control" id="en-notes" rows="2"
        placeholder="Observations...">${n.notes || ''}</textarea>
    </div>
    <div class="form-actions">
      <button class="btn btn-secondary"
        onclick="openDetailCouple('${coupleId}')">Annuler</button>
      <button class="btn btn-primary"
        onclick="saveEditNichee('${nicheeId}', '${coupleId}')">💾 Modifier</button>
    </div>`);
  document.getElementById('modal').style.width = '500px';
}

async function saveEditNichee(nicheeId, coupleId) {
  const data = {
    date_ponte:    document.getElementById('en-ponte').value    || null,
    date_eclosion: document.getElementById('en-eclosion').value || null,
    nombre_oeufs:  parseInt(document.getElementById('en-oeufs').value) || 2,
    notes:         document.getElementById('en-notes').value.trim() || null,
  };

  try {
    await apiFetch(`/nichees/${nicheeId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    showNotification('Nichée modifiée ✅');
    openDetailCouple(coupleId);
  } catch (err) {
    console.error(err);
  }
}

// ── Créer un jeune depuis une nichée ─────────────────────────────────────────

async function openCreateJeuneFromNichee(coupleId, annee) {
  const [couple, lignees] = await Promise.all([
    apiFetch(`/couples/${coupleId}`),
    apiFetch('/lignees/'),
  ]);

  const maleMatricule    = couple.male?.matricule    || '—';
  const femelleMatricule = couple.femelle?.matricule || '—';
  const maleId           = couple.male_id;
  const femelleId        = couple.femelle_id;

  openModal('🐣 Créer un jeune pigeon', `
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Matricule *</label>
        <input type="text" class="form-control" id="cj-matricule"
          placeholder="ex: FR-${annee}-XXX" autofocus>
      </div>
      <div class="form-group">
        <label class="form-label">Année de naissance *</label>
        <input type="number" class="form-control" id="cj-annee"
          value="${annee}" min="2000" max="2099">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Sexe *</label>
        <select class="form-control" id="cj-sexe">
          <option value="">— Choisir —</option>
          <option value="male">Mâle</option>
          <option value="femelle">Femelle</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Statut</label>
        <select class="form-control" id="cj-statut">
          <option value="actif" selected>Actif</option>
          <option value="concours">Concours</option>
          <option value="reproducteur">Reproducteur</option>
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">♂️ Père</label>
        <input type="text" class="form-control" value="${maleMatricule}" readonly
          style="background:var(--bg); color:var(--text-light); cursor:not-allowed;">
        <input type="hidden" id="cj-pere-id" value="${maleId}">
      </div>
      <div class="form-group">
        <label class="form-label">♀️ Mère</label>
        <input type="text" class="form-control" value="${femelleMatricule}" readonly
          style="background:var(--bg); color:var(--text-light); cursor:not-allowed;">
        <input type="hidden" id="cj-mere-id" value="${femelleId}">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Lignée</label>
        <select class="form-control" id="cj-lignee">
          <option value="">— Aucune —</option>
          ${lignees.map(l => `<option value="${l.id}">${l.nom}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Case colombier</label>
        <input type="text" class="form-control" id="cj-case" placeholder="ex: D5">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Couleur du plumage</label>
      <input type="text" class="form-control" id="cj-couleur"
        placeholder="ex: Bleu barré">
    </div>
    <div class="form-group">
      <label class="form-label">Notes</label>
      <textarea class="form-control" id="cj-notes" rows="2"
        placeholder="Observations..."></textarea>
    </div>
    <div class="form-actions">
      <button class="btn btn-secondary"
        onclick="openDetailCouple('${coupleId}')">Annuler</button>
      <button class="btn btn-primary"
        onclick="saveJeuneFromNichee('${coupleId}')">🐣 Créer le jeune</button>
    </div>`);
  document.getElementById('modal').style.width = '660px';

  // Focus auto sur le matricule
  setTimeout(() => document.getElementById('cj-matricule')?.focus(), 100);
}

async function saveJeuneFromNichee(coupleId) {
  const matricule = document.getElementById('cj-matricule').value.trim();
  const sexe      = document.getElementById('cj-sexe').value;
  const annee     = parseInt(document.getElementById('cj-annee').value);

  if (!matricule) { showNotification('Le matricule est obligatoire', 'danger'); return; }
  if (!sexe)      { showNotification('Le sexe est obligatoire', 'danger'); return; }
  if (!annee)     { showNotification("L'année est obligatoire", 'danger'); return; }

  const data = {
    matricule,
    annee_naissance: annee,
    sexe,
    statut:        document.getElementById('cj-statut').value || 'actif',
    pere_id:       document.getElementById('cj-pere-id').value   || null,
    mere_id:       document.getElementById('cj-mere-id').value   || null,
    lignee_id:     document.getElementById('cj-lignee').value    || null,
    colombier_case: document.getElementById('cj-case').value.trim()    || null,
    couleur_plumage: document.getElementById('cj-couleur').value.trim() || null,
    notes:         document.getElementById('cj-notes').value.trim()    || null,
  };

  try {
    await apiFetch('/pigeons/', { method: 'POST', body: JSON.stringify(data) });
    showNotification('Jeune créé et bagué ✅');
    openDetailCouple(coupleId);
  } catch (err) {
    console.error(err);
  }
}

// ── Formulaire ajout couple ───────────────────────────────────────────────────

async function openAddCouple() {
  const pigeons = await apiFetch('/pigeons/');
  const males    = pigeons.filter(p => p.sexe === 'male');
  const femelles = pigeons.filter(p => p.sexe === 'femelle');
  const annee    = new Date().getFullYear();

  openModal('💑 Nouveau couple', `
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Mâle *</label>
        <select class="form-control" id="fc-male">
          <option value="">— Choisir un mâle —</option>
          ${males.map(p => `<option value="${p.id}">${p.matricule}${p.couleur_plumage ? ' — ' + p.couleur_plumage : ''}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Femelle *</label>
        <select class="form-control" id="fc-femelle">
          <option value="">— Choisir une femelle —</option>
          ${femelles.map(p => `<option value="${p.id}">${p.matricule}${p.couleur_plumage ? ' — ' + p.couleur_plumage : ''}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Case colombier</label>
        <input type="text" class="form-control" id="fc-case" placeholder="ex: A3">
      </div>
      <div class="form-group">
        <label class="form-label">Année *</label>
        <input type="number" class="form-control" id="fc-annee"
          value="${annee}" min="2000" max="2099">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Notes</label>
      <textarea class="form-control" id="fc-notes" rows="2"
        placeholder="Observations..."></textarea>
    </div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
      <button class="btn btn-primary" onclick="saveCouple()">➕ Créer</button>
    </div>`);
  document.getElementById('modal').style.width = '600px';
}

async function saveCouple() {
  const male_id    = document.getElementById('fc-male').value;
  const femelle_id = document.getElementById('fc-femelle').value;
  const annee      = parseInt(document.getElementById('fc-annee').value);

  if (!male_id)    { showNotification('Choisissez un mâle', 'danger'); return; }
  if (!femelle_id) { showNotification('Choisissez une femelle', 'danger'); return; }
  if (!annee)      { showNotification("L'année est obligatoire", 'danger'); return; }

  const data = {
    male_id, femelle_id, annee,
    case_numero: document.getElementById('fc-case').value.trim() || null,
    notes:       document.getElementById('fc-notes').value.trim() || null,
  };

  try {
    await apiFetch('/couples/', { method: 'POST', body: JSON.stringify(data) });

    // Mettre les deux pigeons en statut reproducteur
    await Promise.all([
      apiFetch(`/pigeons/${male_id}`,    { method: 'PUT', body: JSON.stringify({ statut: 'reproducteur' }) }),
      apiFetch(`/pigeons/${femelle_id}`, { method: 'PUT', body: JSON.stringify({ statut: 'reproducteur' }) }),
    ]);

    showNotification('Couple créé ✅');
    closeModal();
    loadCouples();
  } catch (err) {
    console.error(err);
  }
}

// ── Formulaire ajout nichée ───────────────────────────────────────────────────

async function openAddNichee(coupleId) {
  const today = new Date().toISOString().split('T')[0];
  openModal('🥚 Ajouter une nichée', `
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Date de ponte</label>
        <input type="date" class="form-control" id="fn-ponte" value="${today}">
      </div>
      <div class="form-group">
        <label class="form-label">Date d'éclosion</label>
        <input type="date" class="form-control" id="fn-eclosion">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Nombre d'œufs</label>
      <input type="number" class="form-control" id="fn-oeufs"
        value="2" min="1" max="3">
    </div>
    <div class="form-group">
      <label class="form-label">Notes</label>
      <textarea class="form-control" id="fn-notes" rows="2"
        placeholder="Observations..."></textarea>
    </div>
    <div class="form-actions">
      <button class="btn btn-secondary"
        onclick="openDetailCouple('${coupleId}')">Annuler</button>
      <button class="btn btn-primary"
        onclick="saveNichee('${coupleId}')">➕ Créer</button>
    </div>`);
  document.getElementById('modal').style.width = '500px';
}

async function saveNichee(coupleId) {
  const data = {
    date_ponte:    document.getElementById('fn-ponte').value    || null,
    date_eclosion: document.getElementById('fn-eclosion').value || null,
    nombre_oeufs:  parseInt(document.getElementById('fn-oeufs').value) || 2,
    notes:         document.getElementById('fn-notes').value.trim() || null,
  };

  try {
    await apiFetch(`/couples/${coupleId}/nichees`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    showNotification('Nichée enregistrée ✅');
    openDetailCouple(coupleId);
  } catch (err) {
    console.error(err);
  }
}

// ── Actions CRUD ──────────────────────────────────────────────────────────────

async function dissolveCouple(id, label) {
  if (!confirm(`Dissoudre le couple ${label} ?\nLes deux pigeons repasseront en statut "actif".`)) return;
  try {
    await apiFetch(`/couples/${id}/dissoudre`, { method: 'PATCH' });
    showNotification('Couple dissous');
    closeModal();
    loadCouples();
  } catch (err) {
    console.error(err);
  }
}

async function deleteCouple(id, label) {
  if (!confirm(`Supprimer définitivement le couple ${label} et toutes ses nichées ?`)) return;
  try {
    await apiFetch(`/couples/${id}`, { method: 'DELETE' });
    showNotification('Couple supprimé');
    closeModal();
    loadCouples();
  } catch (err) {
    console.error(err);
  }
}

async function deleteNichee(nicheeId, coupleId) {
  if (!confirm('Supprimer cette nichée ?')) return;
  try {
    await apiFetch(`/nichees/${nicheeId}`, { method: 'DELETE' });
    showNotification('Nichée supprimée');
    openDetailCouple(coupleId);
  } catch (err) {
    console.error(err);
  }
}

