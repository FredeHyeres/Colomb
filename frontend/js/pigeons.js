async function loadPigeons() {
  const content = document.getElementById('content');
  const [pigeons, lignees] = await Promise.all([
    apiFetch('/pigeons/'),
    apiFetch('/lignees/')
  ]);

  if (pigeons.length === 0) {
    content.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🕊️</div>
        <div class="empty-state-text">Aucun pigeon enregistré</div>
        <div class="empty-state-sub">Commencez par ajouter vos premiers pigeons</div>
      </div>`;
    return;
  }

  content.innerHTML = `
    <div class="card">
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Photo</th>
              <th>Matricule</th>
              <th>Année</th>
              <th>Sexe</th>
              <th>Lignée</th>
              <th>Case</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${pigeons.map(p => {
              const lignee = lignees.find(l => l.id === p.lignee_id);
              return `
                <tr>
                  <td>${pigeonPhoto(p.photo, p.matricule)}</td>
                  <td><strong>${p.matricule}</strong></td>
                  <td>${p.annee_naissance}</td>
                  <td>${p.sexe === 'male' ? '♂️ Mâle' : '♀️ Femelle'}</td>
                  <td>
                    ${lignee
                      ? `<span class="lignee-dot" 
                           style="background:${lignee.couleur_label || '#95A5A6'}">
                         </span>${lignee.nom}`
                      : '—'}
                  </td>
                  <td>${p.colombier_case || '—'}</td>
                  <td>${badgeStatut(p.statut)}</td>
                  <td>
                    <div style="display:flex; gap:6px;">
                      <button class="btn btn-secondary"
                        onclick="openDetailPigeon('${p.id}')"
                        style="padding:6px 10px; font-size:12px;">
                        👁️
                      </button>
                      <button class="btn btn-secondary"
                        onclick="openEditPigeon('${p.id}')"
                        style="padding:6px 10px; font-size:12px;">
                        ✏️
                      </button>
                      <button class="btn btn-danger"
                        onclick="deletePigeon('${p.id}', '${p.matricule}')"
                        style="padding:6px 10px; font-size:12px;">
                        🗑️
                      </button>
                      <button class="btn btn-primary" onclick="
                         document.getElementById('modal').style.width='560px';
                          openPedigree('${p.id}');">
                          🌳 Voir le pedigree
                      </button>
                    </div>
                  </td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
}

// ===== DETAIL PIGEON =====
async function openDetailPigeon(id) {
  const p = await apiFetch(`/pigeons/${id}`);
  const html = `
    <div style="display:flex; gap:24px; margin-bottom:24px;">
      <div style="flex-shrink:0;">
        ${p.photo
          ? `<img src="http://localhost:8001${p.photo}" 
               style="width:100px; height:100px; border-radius:12px; 
               object-fit:cover; border:2px solid var(--border);">`
          : `<div style="width:100px; height:100px; border-radius:12px;
               background:var(--bg); display:flex; align-items:center;
               justify-content:center; font-size:48px; 
               border:2px solid var(--border);">🕊️</div>`}
        <div style="margin-top:10px; text-align:center;">
          <label class="btn btn-secondary" 
            style="padding:6px 12px; font-size:12px; cursor:pointer;">
            📷 Photo
            <input type="file" accept="image/*" style="display:none;"
              onchange="uploadPhoto('${p.id}', this)">
          </label>
        </div>
      </div>
      <div style="flex:1;">
        <h3 style="font-family:'Playfair Display',serif; 
          font-size:22px; margin-bottom:12px;">
          ${p.matricule}
        </h3>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
          <div><span style="color:var(--text-light); font-size:12px;">
            ANNÉE</span><br>${p.annee_naissance}</div>
          <div><span style="color:var(--text-light); font-size:12px;">
            SEXE</span><br>${p.sexe === 'male' ? '♂️ Mâle' : '♀️ Femelle'}</div>
          <div><span style="color:var(--text-light); font-size:12px;">
            STATUT</span><br>${badgeStatut(p.statut)}</div>
          <div><span style="color:var(--text-light); font-size:12px;">
            CASE</span><br>${p.colombier_case || '—'}</div>
          <div><span style="color:var(--text-light); font-size:12px;">
            COULEUR</span><br>${p.couleur_plumage || '—'}</div>
        </div>
      </div>
    </div>

    <!-- GÉNÉALOGIE -->
    <div style="background:var(--bg); border-radius:10px; padding:16px; 
      margin-bottom:20px;">
      <div style="font-weight:600; margin-bottom:12px;">
        🌳 Généalogie
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
        <div style="background:white; border-radius:8px; padding:12px;
          border:1px solid var(--border);">
          <div style="font-size:11px; color:var(--text-light); 
            margin-bottom:4px;">PÈRE ♂️</div>
          <div style="font-weight:600;">
            ${p.pere ? p.pere.matricule : 'Inconnu'}
          </div>
        </div>
        <div style="background:white; border-radius:8px; padding:12px;
          border:1px solid var(--border);">
          <div style="font-size:11px; color:var(--text-light); 
            margin-bottom:4px;">MÈRE ♀️</div>
          <div style="font-weight:600;">
            ${p.mere ? p.mere.matricule : 'Inconnue'}
          </div>
        </div>
      </div>
    </div>

    ${p.notes ? `
      <div style="background:var(--bg); border-radius:10px; padding:16px;">
        <div style="font-weight:600; margin-bottom:8px;">📝 Notes</div>
        <div style="font-size:14px; color:var(--text-light);">${p.notes}</div>
      </div>` : ''}

    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Fermer</button>
      <button class="btn btn-primary" onclick="openEditPigeon('${p.id}')">
        ✏️ Modifier
      </button>
    </div>`;

  openModal(`🕊️ ${p.matricule}`, html);
}

// ===== UPLOAD PHOTO =====
async function uploadPhoto(id, input) {
  const file = input.files[0];
  if (!file) return;
  const formData = new FormData();
  formData.append('file', file);
  try {
    await fetch(`http://localhost:8001/api/pigeons/${id}/photo`, {
      method: 'POST',
      body: formData
    });
    showNotification('Photo mise à jour ✅');
    closeModal();
    loadPigeons();
  } catch (err) {
    showNotification('Erreur upload photo', 'danger');
  }
}

// ===== FORMULAIRE =====
async function openAddPigeon() {
  const lignees = await apiFetch('/lignees/');
  const pigeons = await apiFetch('/pigeons/');
  openModal('Ajouter un pigeon', formPigeon({}, lignees, pigeons));
}

async function openEditPigeon(id) {
  const [pigeon, lignees, pigeons] = await Promise.all([
    apiFetch(`/pigeons/${id}`),
    apiFetch('/lignees/'),
    apiFetch('/pigeons/')
  ]);
  openModal('Modifier le pigeon', formPigeon(pigeon, lignees, pigeons));
}

function formPigeon(p = {}, lignees = [], pigeons = []) {
  const malesOptions = pigeons
    .filter(x => x.sexe === 'male' && x.id !== p.id)
    .map(x => `<option value="${x.id}" 
      ${p.pere_id === x.id ? 'selected' : ''}>
      ${x.matricule}</option>`)
    .join('');

  const femellesOptions = pigeons
    .filter(x => x.sexe === 'femelle' && x.id !== p.id)
    .map(x => `<option value="${x.id}" 
      ${p.mere_id === x.id ? 'selected' : ''}>
      ${x.matricule}</option>`)
    .join('');

  return `
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Matricule *</label>
        <input type="text" class="form-control" id="f-matricule"
          value="${p.matricule || ''}" placeholder="ex: 166548-24-F">
      </div>
      <div class="form-group">
        <label class="form-label">Année de naissance *</label>
        <input type="number" class="form-control" id="f-annee"
          value="${p.annee_naissance || new Date().getFullYear()}" 
          min="2000" max="2099">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Sexe *</label>
        <select class="form-control" id="f-sexe">
          <option value="male" ${p.sexe === 'male' ? 'selected' : ''}>
            ♂️ Mâle</option>
          <option value="femelle" ${p.sexe === 'femelle' ? 'selected' : ''}>
            ♀️ Femelle</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Statut</label>
        <select class="form-control" id="f-statut">
          <option value="actif" ${p.statut === 'actif' ? 'selected' : ''}>
            Actif</option>
          <option value="reproducteur" 
            ${p.statut === 'reproducteur' ? 'selected' : ''}>
            Reproducteur</option>
          <option value="concours" ${p.statut === 'concours' ? 'selected' : ''}>
            Concours</option>
          <option value="retraite" ${p.statut === 'retraite' ? 'selected' : ''}>
            Retraité</option>
          <option value="perdu" ${p.statut === 'perdu' ? 'selected' : ''}>
            Perdu</option>
          <option value="decede" ${p.statut === 'decede' ? 'selected' : ''}>
            Décédé</option>
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Couleur du plumage</label>
        <input type="text" class="form-control" id="f-couleur"
          value="${p.couleur_plumage || ''}" 
          placeholder="ex: Bleu barré">
      </div>
      <div class="form-group">
        <label class="form-label">Case colombier</label>
        <input type="text" class="form-control" id="f-case"
          value="${p.colombier_case || ''}" placeholder="ex: Case 12">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Lignée</label>
      <select class="form-control" id="f-lignee">
        <option value="">— Sans lignée —</option>
        ${lignees.map(l => `
          <option value="${l.id}" ${p.lignee_id === l.id ? 'selected' : ''}>
            ${l.nom}
          </option>`).join('')}
      </select>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Père ♂️</label>
        <select class="form-control" id="f-pere">
          <option value="">— Inconnu —</option>
          ${malesOptions}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Mère ♀️</label>
        <select class="form-control" id="f-mere">
          <option value="">— Inconnue —</option>
          ${femellesOptions}
        </select>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Notes</label>
      <textarea class="form-control" id="f-notes" rows="3"
        placeholder="Observations, caractéristiques..."
      >${p.notes || ''}</textarea>
    </div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
      <button class="btn btn-primary" onclick="savePigeon('${p.id || ''}')">
        ${p.id ? '💾 Modifier' : '➕ Créer'}
      </button>
    </div>`;
}

// ===== SAUVEGARDER =====
async function savePigeon(id = '') {
  const data = {
    matricule: document.getElementById('f-matricule').value.trim(),
    annee_naissance: parseInt(document.getElementById('f-annee').value),
    sexe: document.getElementById('f-sexe').value,
    statut: document.getElementById('f-statut').value,
    couleur_plumage: document.getElementById('f-couleur').value.trim() || null,
    colombier_case: document.getElementById('f-case').value.trim() || null,
    lignee_id: document.getElementById('f-lignee').value || null,
    pere_id: document.getElementById('f-pere').value || null,
    mere_id: document.getElementById('f-mere').value || null,
    notes: document.getElementById('f-notes').value.trim() || null,
  };

  if (!data.matricule) {
    showNotification('Le matricule est obligatoire', 'danger');
    return;
  }

  try {
    if (id) {
      await apiFetch(`/pigeons/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      showNotification('Pigeon modifié avec succès ✅');
    } else {
      await apiFetch('/pigeons/', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      showNotification('Pigeon créé avec succès ✅');
    }
    closeModal();
    loadPigeons();
  } catch (err) {
    console.error(err);
  }
}

// ===== SUPPRIMER =====
async function deletePigeon(id, matricule) {
  if (!confirm(`Supprimer le pigeon "${matricule}" ?`)) return;
  try {
    await apiFetch(`/pigeons/${id}`, { method: 'DELETE' });
    showNotification(`Pigeon "${matricule}" supprimé`);
    loadPigeons();
  } catch (err) {
    console.error(err);
  }
}

// ===== PERFORMANCES =====

function badgeClassement(n) {
  if (!n) return '—';
  const styles = {
    1: `background:#F1C40F; color:#7D6608;`,
    2: `background:#BDC3C7; color:#2C3E50;`,
    3: `background:#CD7F32; color:#fff;`,
  };
  const style = styles[n] || 'background:#95A5A6; color:#fff;';
  const label = n === 1 ? `${n}er` : `${n}ème`;
  return `<span style="display:inline-block; padding:2px 10px; border-radius:12px;
    font-weight:700; font-size:12px; ${style}">${label}</span>`;
}

function fmtDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

async function loadPerformances() {
  const content = document.getElementById('content');
  const [perfs, pigeons] = await Promise.all([
    apiFetch('/performances/'),
    apiFetch('/pigeons/')
  ]);
  const byId = Object.fromEntries(pigeons.map(p => [p.id, p]));
  const sorted = [...perfs].sort((a, b) => b.date.localeCompare(a.date));

  if (sorted.length === 0) {
    content.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🏆</div>
        <div class="empty-state-text">Aucune performance enregistrée</div>
        <div class="empty-state-sub">Ajoutez les résultats de concours de vos pigeons</div>
      </div>`;
    return;
  }

  content.innerHTML = `
    <div class="card">
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Pigeon</th>
              <th>Concours</th>
              <th>Date</th>
              <th>Distance</th>
              <th>Classement</th>
              <th>Vitesse (m/min)</th>
              <th>Engagés</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${sorted.map(p => {
              const pigeon = byId[p.pigeon_id];
              return `
                <tr>
                  <td><strong>${pigeon ? pigeon.matricule : '—'}</strong></td>
                  <td>${p.nom_concours}</td>
                  <td>${fmtDate(p.date)}</td>
                  <td>${p.distance_km ? p.distance_km + ' km' : '—'}</td>
                  <td>${badgeClassement(p.classement)}</td>
                  <td>${p.vitesse_m_min ? p.vitesse_m_min.toFixed(1) : '—'}</td>
                  <td>${p.nb_pigeons_engages ?? '—'}</td>
                  <td>
                    <button class="btn btn-danger"
                      onclick="deletePerformance('${p.id}', '${p.nom_concours.replace(/'/g, "\\'")}')"
                      style="padding:6px 10px; font-size:12px;">
                      🗑️
                    </button>
                  </td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
}

async function openAddPerformance() {
  const pigeons = await apiFetch('/pigeons/');
  const today = new Date().toISOString().split('T')[0];
  openModal('🏆 Ajouter une performance', `
    <div class="form-group">
      <label class="form-label">Pigeon *</label>
      <select class="form-control" id="fp-pigeon">
        <option value="">— Choisir un pigeon —</option>
        ${pigeons.map(p => `<option value="${p.id}">${p.matricule}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Nom du concours *</label>
      <input type="text" class="form-control" id="fp-nom"
        placeholder="ex: Grand Prix Marseille">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Date *</label>
        <input type="date" class="form-control" id="fp-date" value="${today}">
      </div>
      <div class="form-group">
        <label class="form-label">Distance (km)</label>
        <input type="number" class="form-control" id="fp-distance" min="0" placeholder="ex: 320">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Classement</label>
        <input type="number" class="form-control" id="fp-classement" min="1" placeholder="ex: 3">
      </div>
      <div class="form-group">
        <label class="form-label">Vitesse (m/min)</label>
        <input type="number" class="form-control" id="fp-vitesse" step="0.1" min="0" placeholder="ex: 1456.2">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Pigeons engagés</label>
      <input type="number" class="form-control" id="fp-engages" min="1" placeholder="ex: 245">
    </div>
    <div class="form-group">
      <label class="form-label">Notes</label>
      <textarea class="form-control" id="fp-notes" rows="2"
        placeholder="Observations..."></textarea>
    </div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
      <button class="btn btn-primary" onclick="savePerformance()">➕ Créer</button>
    </div>`);
}

async function savePerformance() {
  const pigeon_id = document.getElementById('fp-pigeon').value;
  const nom_concours = document.getElementById('fp-nom').value.trim();
  const date = document.getElementById('fp-date').value;
  if (!pigeon_id) { showNotification('Choisissez un pigeon', 'danger'); return; }
  if (!nom_concours) { showNotification('Le nom du concours est obligatoire', 'danger'); return; }
  if (!date) { showNotification('La date est obligatoire', 'danger'); return; }

  const data = {
    pigeon_id,
    nom_concours,
    date,
    distance_km:        parseInt(document.getElementById('fp-distance').value) || null,
    classement:         parseInt(document.getElementById('fp-classement').value) || null,
    vitesse_m_min:      parseFloat(document.getElementById('fp-vitesse').value) || null,
    nb_pigeons_engages: parseInt(document.getElementById('fp-engages').value) || null,
    notes:              document.getElementById('fp-notes').value.trim() || null,
  };

  try {
    await apiFetch('/performances/', { method: 'POST', body: JSON.stringify(data) });
    showNotification('Performance enregistrée ✅');
    closeModal();
    loadPerformances();
  } catch (err) {
    console.error(err);
  }
}

async function deletePerformance(id, nom) {
  if (!confirm(`Supprimer la performance "${nom}" ?`)) return;
  try {
    await apiFetch(`/performances/${id}`, { method: 'DELETE' });
    showNotification('Performance supprimée');
    loadPerformances();
  } catch (err) {
    console.error(err);
  }
}

// ===== SANTÉ =====

function badgeType(type) {
  const map = {
    'vaccination':       ['#27AE60', 'Vaccination'],
    'traitement':        ['#E67E22', 'Traitement'],
    'visite vétérinaire':['#2980B9', 'Visite vétérinaire'],
    'observation':       ['#7F8C8D', 'Observation'],
  };
  const [color, label] = map[type] || ['#95A5A6', type];
  return `<span style="display:inline-block; padding:2px 10px; border-radius:12px;
    font-weight:600; font-size:12px; background:${color}; color:#fff;">${label}</span>`;
}

async function loadSante() {
  const content = document.getElementById('content');
  const [events, pigeons] = await Promise.all([
    apiFetch('/sante/'),
    apiFetch('/pigeons/')
  ]);
  const byId = Object.fromEntries(pigeons.map(p => [p.id, p]));
  const sorted = [...events].sort((a, b) => b.date.localeCompare(a.date));

  if (sorted.length === 0) {
    content.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🏥</div>
        <div class="empty-state-text">Aucun événement santé enregistré</div>
        <div class="empty-state-sub">Suivez la santé de vos pigeons ici</div>
      </div>`;
    return;
  }

  content.innerHTML = `
    <div class="card">
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Pigeon</th>
              <th>Date</th>
              <th>Type</th>
              <th>Description</th>
              <th>Produit</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${sorted.map(e => {
              const pigeon = byId[e.pigeon_id];
              return `
                <tr>
                  <td><strong>${pigeon ? pigeon.matricule : '—'}</strong></td>
                  <td>${fmtDate(e.date)}</td>
                  <td>${badgeType(e.type)}</td>
                  <td style="max-width:260px; white-space:normal; font-size:13px;">
                    ${e.description || '—'}
                  </td>
                  <td>${e.produit || '—'}</td>
                  <td>
                    <button class="btn btn-danger"
                      onclick="deleteSante('${e.id}')"
                      style="padding:6px 10px; font-size:12px;">
                      🗑️
                    </button>
                  </td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
}

async function openAddSante() {
  const pigeons = await apiFetch('/pigeons/');
  const today = new Date().toISOString().split('T')[0];
  openModal('🏥 Ajouter un événement santé', `
    <div class="form-group">
      <label class="form-label">Pigeon *</label>
      <select class="form-control" id="fs-pigeon">
        <option value="">— Choisir un pigeon —</option>
        ${pigeons.map(p => `<option value="${p.id}">${p.matricule}</option>`).join('')}
      </select>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Type *</label>
        <select class="form-control" id="fs-type">
          <option value="vaccination">💉 Vaccination</option>
          <option value="traitement">💊 Traitement</option>
          <option value="visite vétérinaire">🩺 Visite vétérinaire</option>
          <option value="observation">👁️ Observation</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Date *</label>
        <input type="date" class="form-control" id="fs-date" value="${today}">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Description</label>
      <textarea class="form-control" id="fs-description" rows="2"
        placeholder="Détails de l'événement..."></textarea>
    </div>
    <div class="form-group">
      <label class="form-label">Produit utilisé</label>
      <input type="text" class="form-control" id="fs-produit"
        placeholder="ex: Colombovac PMV">
    </div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
      <button class="btn btn-primary" onclick="saveSante()">➕ Créer</button>
    </div>`);
}

async function saveSante() {
  const pigeon_id = document.getElementById('fs-pigeon').value;
  const type = document.getElementById('fs-type').value;
  const date = document.getElementById('fs-date').value;
  if (!pigeon_id) { showNotification('Choisissez un pigeon', 'danger'); return; }
  if (!date) { showNotification('La date est obligatoire', 'danger'); return; }

  const data = {
    pigeon_id,
    type,
    date,
    description: document.getElementById('fs-description').value.trim() || null,
    produit:     document.getElementById('fs-produit').value.trim() || null,
  };

  try {
    await apiFetch('/sante/', { method: 'POST', body: JSON.stringify(data) });
    showNotification('Événement santé enregistré ✅');
    closeModal();
    loadSante();
  } catch (err) {
    console.error(err);
  }
}

async function deleteSante(id) {
  if (!confirm('Supprimer cet événement santé ?')) return;
  try {
    await apiFetch(`/sante/${id}`, { method: 'DELETE' });
    showNotification('Événement supprimé');
    loadSante();
  } catch (err) {
    console.error(err);
  }
}