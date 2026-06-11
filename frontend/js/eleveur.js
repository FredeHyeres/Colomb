// ===== MON ÉLEVAGE =====

async function loadEleveur() {
  const content = document.getElementById('content');
  content.innerHTML = `<div class="loading">${t('common.loading')}</div>`;

  let eleveur = {};
  try {
    eleveur = await apiFetch('/eleveur/');
  } catch (e) {
    content.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">⚠️</div>
      <div class="empty-state-text">${t('eleveur.error.load')}</div>
    </div>`;
    return;
  }

  content.innerHTML = `
    <div style="display:grid; grid-template-columns:2fr 3fr; gap:24px; align-items:start;">

      <!-- ── COLONNE GAUCHE : photo + aperçu carte de visite ── -->
      <div>
        <!-- Photo colombier -->
        <div class="card" style="text-align:center; padding:24px;">
          <div id="photo-colombier-wrap" style="margin-bottom:16px;">
            ${eleveur.photo_colombier
              ? `<img src="${API_ROOT}${eleveur.photo_colombier}"
                   id="photo-colombier-img"
                   style="width:160px; height:160px; object-fit:cover;
                          border-radius:12px; border:2px solid var(--border);">`
              : `<div style="width:160px; height:160px; background:var(--bg);
                   border-radius:12px; border:2px dashed var(--border);
                   display:flex; align-items:center; justify-content:center;
                   font-size:56px; margin:0 auto;">🏠</div>`}
          </div>
          <label class="btn btn-secondary" style="cursor:pointer;">
            ${t('eleveur.photo.change')}
            <input type="file" accept="image/*" style="display:none;"
              onchange="uploadPhotoColombier(this)">
          </label>
        </div>

        <!-- Aperçu carte de visite -->
        <div class="card" style="margin-top:16px;">
          <div class="card-title" style="margin-bottom:12px;">${t('eleveur.preview.title')}</div>
          ${carteDeVisite(eleveur)}
        </div>
      </div>

      <!-- ── COLONNE DROITE : formulaire ── -->
      <div class="card">

        <!-- Identité -->
        <div style="font-weight:600; font-size:14px; margin-bottom:12px;
          padding-bottom:8px; border-bottom:1px solid var(--border);">
          ${t('eleveur.section.identity')}
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">${t('eleveur.field.prenom')}</label>
            <input type="text" class="form-control" id="e-prenom"
              value="${escHtml(eleveur.prenom || '')}" placeholder="${t('eleveur.placeholder.prenom')}">
          </div>
          <div class="form-group">
            <label class="form-label">${t('eleveur.field.nom')}</label>
            <input type="text" class="form-control" id="e-nom"
              value="${escHtml(eleveur.nom || '')}" placeholder="${t('eleveur.placeholder.nom')}">
          </div>
        </div>

        <!-- Colombier -->
        <div style="font-weight:600; font-size:14px; margin:20px 0 12px;
          padding-bottom:8px; border-bottom:1px solid var(--border);">
          ${t('eleveur.section.loft')}
        </div>
        <div class="form-group">
          <label class="form-label">${t('eleveur.field.colombier')}</label>
          <input type="text" class="form-control" id="e-colombier"
            value="${escHtml(eleveur.nom_colombier || '')}" placeholder="${t('eleveur.placeholder.colombier')}">
        </div>
        <div class="form-group">
          <label class="form-label">${t('eleveur.field.adresse')}</label>
          <input type="text" class="form-control" id="e-adresse"
            value="${escHtml(eleveur.adresse || '')}" placeholder="${t('eleveur.placeholder.adresse')}">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">${t('eleveur.field.cp')}</label>
            <input type="text" class="form-control" id="e-cp"
              value="${escHtml(eleveur.code_postal || '')}" placeholder="${t('eleveur.placeholder.cp')}">
          </div>
          <div class="form-group">
            <label class="form-label">${t('eleveur.field.ville')}</label>
            <input type="text" class="form-control" id="e-ville"
              value="${escHtml(eleveur.ville || '')}" placeholder="${t('eleveur.placeholder.ville')}">
          </div>
        </div>

        <!-- Contact -->
        <div style="font-weight:600; font-size:14px; margin:20px 0 12px;
          padding-bottom:8px; border-bottom:1px solid var(--border);">
          ${t('eleveur.section.contact')}
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">${t('eleveur.field.tel')}</label>
            <input type="text" class="form-control" id="e-tel"
              value="${escHtml(eleveur.telephone || '')}" placeholder="${t('eleveur.placeholder.tel')}">
          </div>
          <div class="form-group">
            <label class="form-label">${t('eleveur.field.email')}</label>
            <input type="email" class="form-control" id="e-email"
              value="${escHtml(eleveur.email || '')}" placeholder="${t('eleveur.placeholder.email')}">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">${t('eleveur.field.web')}</label>
          <input type="text" class="form-control" id="e-web"
            value="${escHtml(eleveur.site_web || '')}" placeholder="${t('eleveur.placeholder.web')}">
        </div>

        <!-- Colombophilie -->
        <div style="font-weight:600; font-size:14px; margin:20px 0 12px;
          padding-bottom:8px; border-bottom:1px solid var(--border);">
          ${t('eleveur.section.sport')}
        </div>
        <div class="form-group">
          <label class="form-label">${t('eleveur.field.asso')}</label>
          <input type="text" class="form-control" id="e-asso"
            value="${escHtml(eleveur.association || '')}" placeholder="${t('eleveur.placeholder.asso')}">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">${t('eleveur.field.licence')}</label>
            <input type="text" class="form-control" id="e-licence"
              value="${escHtml(eleveur.numero_licence || '')}" placeholder="${t('eleveur.placeholder.licence')}">
          </div>
          <div class="form-group">
            <label class="form-label">${t('eleveur.field.annee')}</label>
            <input type="number" class="form-control" id="e-annee"
              value="${eleveur.annee_debut || ''}" placeholder="${t('eleveur.placeholder.annee')}"
              min="1900" max="${new Date().getFullYear()}">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">${t('eleveur.field.specialite')}</label>
          <input type="text" class="form-control" id="e-specialite"
            value="${escHtml(eleveur.specialite || '')}" placeholder="${t('eleveur.placeholder.specialite')}">
        </div>

        <!-- Notes -->
        <div style="font-weight:600; font-size:14px; margin:20px 0 12px;
          padding-bottom:8px; border-bottom:1px solid var(--border);">
          ${t('eleveur.section.notes')}
        </div>
        <div class="form-group">
          <textarea class="form-control" id="e-notes" rows="3"
            placeholder="${t('eleveur.placeholder.notes')}">${escHtml(eleveur.notes || '')}</textarea>
        </div>

        <div class="form-actions" style="justify-content:flex-end;">
          <button class="btn btn-primary" onclick="saveEleveur()">
            ${t('common.save')}
          </button>
        </div>
      </div>

    </div>`;
}

// ── Carte de visite (aperçu en-tête PDF) ──────────────────────────────────────
function carteDeVisite(e) {
  const nom = [e.prenom, e.nom].filter(Boolean).join(' ') || '—';
  const localite = [e.code_postal, e.ville].filter(Boolean).join(' ') || '—';
  const contact  = [e.telephone, e.email].filter(Boolean).join(' | ') || '—';
  return `
    <div id="carte-preview" style="
      border:1px solid var(--border); border-radius:8px;
      padding:16px; font-size:13px; background:white;">
      <div style="display:flex; gap:12px; align-items:flex-start;">
        ${e.photo_colombier
          ? `<img src="${API_ROOT}${e.photo_colombier}"
               style="width:48px; height:48px; object-fit:cover;
                      border-radius:6px; flex-shrink:0;">`
          : `<div style="width:48px; height:48px; background:var(--bg);
               border-radius:6px; display:flex; align-items:center;
               justify-content:center; font-size:24px; flex-shrink:0;">🏠</div>`}
        <div>
          <div style="font-family:'Playfair Display',serif; font-weight:700;
            font-size:16px; color:var(--text);">${nom}</div>
          <div style="font-weight:600; margin-top:2px;">
            ${e.nom_colombier || '—'}
          </div>
          <div style="color:var(--text-light); margin-top:2px;">${localite}</div>
          <div style="color:var(--text-light); margin-top:2px;">${contact}</div>
          ${e.numero_licence
            ? `<div style="margin-top:4px; font-size:12px; color:var(--text-light);">
                 ${t('eleveur.preview.licence')} : <strong>${e.numero_licence}</strong></div>`
            : ''}
        </div>
      </div>
    </div>`;
}

// ── Sauvegarder ───────────────────────────────────────────────────────────────
async function saveEleveur() {
  const data = {
    prenom:         document.getElementById('e-prenom').value.trim()   || null,
    nom:            document.getElementById('e-nom').value.trim()      || null,
    nom_colombier:  document.getElementById('e-colombier').value.trim()|| null,
    adresse:        document.getElementById('e-adresse').value.trim()  || null,
    code_postal:    document.getElementById('e-cp').value.trim()       || null,
    ville:          document.getElementById('e-ville').value.trim()    || null,
    telephone:      document.getElementById('e-tel').value.trim()      || null,
    email:          document.getElementById('e-email').value.trim()    || null,
    site_web:       document.getElementById('e-web').value.trim()      || null,
    association:    document.getElementById('e-asso').value.trim()     || null,
    numero_licence: document.getElementById('e-licence').value.trim()  || null,
    annee_debut:    parseInt(document.getElementById('e-annee').value) || null,
    specialite:     document.getElementById('e-specialite').value.trim()|| null,
    notes:          document.getElementById('e-notes').value.trim()    || null,
  };

  try {
    const eleveur = await apiFetch('/eleveur/', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    showNotification(t('eleveur.msg.saved'));
    // Rafraîchit l'aperçu carte de visite
    const preview = document.getElementById('carte-preview');
    if (preview) preview.outerHTML = carteDeVisite(eleveur);
  } catch (err) {
    console.error(err);
  }
}

// ── Upload photo colombier ─────────────────────────────────────────────────────
async function uploadPhotoColombier(input) {
  const file = input.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('file', file);

  try {
    const eleveur = await fetch(`${API_ROOT}/api/eleveur/photo`, {
      method: 'POST',
      body: formData,
    }).then(r => r.json());

    showNotification(t('eleveur.msg.photo_updated'));

    // Met à jour la photo affichée sans recharger toute la page
    const wrap = document.getElementById('photo-colombier-wrap');
    if (wrap && eleveur.photo_colombier) {
      wrap.innerHTML = `<img src="${API_ROOT}${eleveur.photo_colombier}"
        id="photo-colombier-img"
        style="width:160px; height:160px; object-fit:cover;
               border-radius:12px; border:2px solid var(--border);">`;
    }
    const preview = document.getElementById('carte-preview');
    if (preview) preview.outerHTML = carteDeVisite(eleveur);
  } catch (err) {
    showNotification(t('eleveur.msg.photo_error'), 'danger');
  }
}

// ── Utilitaire échappement HTML ────────────────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
