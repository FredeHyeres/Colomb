async function loadLignees() {
  const content = document.getElementById('content');
  const lignees = await apiFetch('/lignees/');

  if (lignees.length === 0) {
    content.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">👨‍👩‍👧‍👦</div>
        <div class="empty-state-text">Aucune lignée enregistrée</div>
        <div class="empty-state-sub">Commencez par créer vos premières lignées</div>
      </div>`;
    return;
  }

  content.innerHTML = `
    <div class="card">
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Couleur</th>
              <th>Nom</th>
              <th>Origine</th>
              <th>Description</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${lignees.map(l => `
              <tr>
                <td>
                  <span class="lignee-dot" 
                    style="background:${l.couleur_label || '#95A5A6'}; 
                    width:20px; height:20px;">
                  </span>
                </td>
                <td><strong>${l.nom}</strong></td>
                <td>${l.origine || '—'}</td>
                <td style="color:var(--text-light); font-size:13px;">
                  ${l.description || '—'}
                </td>
                <td>
                  <div style="display:flex; gap:8px;">
                    <button class="btn btn-secondary" 
                      onclick="openEditLignee('${l.id}')"
                      style="padding:6px 12px; font-size:12px;">
                      ✏️ Modifier
                    </button>
                    <button class="btn btn-danger" 
                      onclick="deleteLignee('${l.id}', '${l.nom}')"
                      style="padding:6px 12px; font-size:12px;">
                      🗑️ Supprimer
                    </button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
}

// ===== FORMULAIRE AJOUT =====
function openAddLignee() {
  openModal('Ajouter une lignée', formLignee());
}

// ===== FORMULAIRE MODIFICATION =====
async function openEditLignee(id) {
  const lignee = await apiFetch(`/lignees/${id}`);
  openModal('Modifier la lignée', formLignee(lignee));
}

// ===== TEMPLATE FORMULAIRE =====
function formLignee(lignee = {}) {
  return `
    <div class="form-group">
      <label class="form-label">Nom de la lignée *</label>
      <input type="text" class="form-control" id="f-nom" 
        value="${lignee.nom || ''}" placeholder="ex: Janssen">
    </div>
    <div class="form-group">
      <label class="form-label">Origine</label>
      <input type="text" class="form-control" id="f-origine" 
        value="${lignee.origine || ''}" placeholder="ex: Belgique">
    </div>
    <div class="form-group">
      <label class="form-label">Description</label>
      <textarea class="form-control" id="f-description" 
        rows="3" placeholder="Description de la lignée..."
      >${lignee.description || ''}</textarea>
    </div>
    <div class="form-group">
      <label class="form-label">Couleur d'identification</label>
      <div style="display:flex; align-items:center; gap:12px;">
        <input type="color" id="f-couleur" 
          value="${lignee.couleur_label || '#2980B9'}"
          style="width:48px; height:38px; border:1px solid var(--border); 
          border-radius:8px; cursor:pointer; padding:2px;">
        <span style="font-size:13px; color:var(--text-light);">
          Choisissez une couleur pour identifier cette lignée
        </span>
      </div>
    </div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
      <button class="btn btn-primary" 
        onclick="saveLignee('${lignee.id || ''}')">
        ${lignee.id ? '💾 Modifier' : '➕ Créer'}
      </button>
    </div>`;
}

// ===== SAUVEGARDER =====
async function saveLignee(id = '') {
  const data = {
    nom: document.getElementById('f-nom').value.trim(),
    origine: document.getElementById('f-origine').value.trim(),
    description: document.getElementById('f-description').value.trim(),
    couleur_label: document.getElementById('f-couleur').value
  };

  if (!data.nom) {
    showNotification('Le nom est obligatoire', 'danger');
    return;
  }

  try {
    if (id) {
      await apiFetch(`/lignees/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      showNotification('Lignée modifiée avec succès ✅');
    } else {
      await apiFetch('/lignees/', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      showNotification('Lignée créée avec succès ✅');
    }
    closeModal();
    loadLignees();
  } catch (err) {
    console.error(err);
  }
}

// ===== SUPPRIMER =====
function deleteLignee(id, nom) {
  confirmDelete(`Supprimer la lignée <strong>${nom}</strong> ?`, async () => {
    try {
      await apiFetch(`/lignees/${id}`, { method: 'DELETE' });
      showNotification(`Lignée "${nom}" supprimée`);
      loadLignees();
    } catch (err) {
      console.error(err);
    }
  });
}