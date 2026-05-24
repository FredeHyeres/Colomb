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
                  <td>${p.sexe === 'mâle' ? '♂️' : '♀️'} ${p.sexe}</td>
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
            SEXE</span><br>${p.sexe === 'mâle' ? '♂️' : '♀️'} ${p.sexe}</div>
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
    .filter(x => x.sexe === 'mâle' && x.id !== p.id)
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
          <option value="mâle" ${p.sexe === 'mâle' ? 'selected' : ''}>
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
          <option value="retraité" ${p.statut === 'retraité' ? 'selected' : ''}>
            Retraité</option>
          <option value="perdu" ${p.statut === 'perdu' ? 'selected' : ''}>
            Perdu</option>
          <option value="décédé" ${p.statut === 'décédé' ? 'selected' : ''}>
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

// ===== PLACEHOLDER PERFORMANCES ET SANTE =====
async function loadPerformances() {
  document.getElementById('content').innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">🏆</div>
      <div class="empty-state-text">Module performances</div>
      <div class="empty-state-sub">Sélectionnez un pigeon pour voir ses performances</div>
    </div>`;
}

async function loadSante() {
  document.getElementById('content').innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">🏥</div>
      <div class="empty-state-text">Module santé</div>
      <div class="empty-state-sub">Sélectionnez un pigeon pour voir son suivi santé</div>
    </div>`;
}

function openAddPerformance() {}
function openAddSante() {}