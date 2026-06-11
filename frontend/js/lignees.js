async function loadLignees() {
  const content = document.getElementById('content');
  const lignees = await apiFetch('/lignees/');

  if (lignees.length === 0) {
    content.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">👨‍👩‍👧‍👦</div>
        <div class="empty-state-text">${t('lignees.empty.title')}</div>
        <div class="empty-state-sub">${t('lignees.empty.sub')}</div>
      </div>`;
    return;
  }

  content.innerHTML = `
    <div class="card">
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>${t('lignees.table.couleur')}</th>
              <th>${t('lignees.table.nom')}</th>
              <th>${t('lignees.table.origine')}</th>
              <th>${t('lignees.table.description')}</th>
              <th>${t('lignees.table.actions')}</th>
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
                      ${t('common.edit')}
                    </button>
                    <button class="btn btn-danger"
                      onclick="deleteLignee('${l.id}', '${l.nom}')"
                      style="padding:6px 12px; font-size:12px;">
                      ${t('common.delete')}
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
  openModal(t('lignees.modal.add_title'), formLignee());
}

// ===== FORMULAIRE MODIFICATION =====
async function openEditLignee(id) {
  const lignee = await apiFetch(`/lignees/${id}`);
  openModal(t('lignees.modal.edit_title'), formLignee(lignee));
}

// ===== TEMPLATE FORMULAIRE =====
function formLignee(lignee = {}) {
  return `
    <div class="form-group">
      <label class="form-label">${t('lignees.form.nom_label')}</label>
      <input type="text" class="form-control" id="f-nom"
        value="${lignee.nom || ''}" placeholder="${t('lignees.form.nom_placeholder')}">
    </div>
    <div class="form-group">
      <label class="form-label">${t('lignees.form.origine_label')}</label>
      <input type="text" class="form-control" id="f-origine"
        value="${lignee.origine || ''}" placeholder="${t('lignees.form.origine_placeholder')}">
    </div>
    <div class="form-group">
      <label class="form-label">${t('lignees.form.description_label')}</label>
      <textarea class="form-control" id="f-description"
        rows="3" placeholder="${t('lignees.form.description_placeholder')}"
      >${lignee.description || ''}</textarea>
    </div>
    <div class="form-group">
      <label class="form-label">${t('lignees.form.couleur_label')}</label>
      <div style="display:flex; align-items:center; gap:12px;">
        <input type="color" id="f-couleur"
          value="${lignee.couleur_label || '#2980B9'}"
          style="width:48px; height:38px; border:1px solid var(--border);
          border-radius:8px; cursor:pointer; padding:2px;">
        <span style="font-size:13px; color:var(--text-light);">
          ${t('lignees.form.couleur_help')}
        </span>
      </div>
    </div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">${t('common.cancel')}</button>
      <button class="btn btn-primary"
        onclick="saveLignee('${lignee.id || ''}')">
        ${lignee.id ? t('common.save_edit') : t('common.create')}
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
    showNotification(t('lignees.msg.name_required'), 'danger');
    return;
  }

  try {
    if (id) {
      await apiFetch(`/lignees/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      showNotification(t('lignees.msg.updated'));
    } else {
      await apiFetch('/lignees/', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      showNotification(t('lignees.msg.created'));
    }
    closeModal();
    loadLignees();
  } catch (err) {
    console.error(err);
  }
}

// ===== SUPPRIMER =====
function deleteLignee(id, nom) {
  confirmDelete(t('lignees.confirm_delete', { nom }), async () => {
    try {
      await apiFetch(`/lignees/${id}`, { method: 'DELETE' });
      showNotification(t('lignees.msg.deleted', { nom }));
      loadLignees();
    } catch (err) {
      console.error(err);
    }
  });
}