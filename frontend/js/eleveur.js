// ===== MON ÉLEVAGE =====

async function loadEleveur() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Chargement...</div>';

  let eleveur = {};
  try {
    eleveur = await apiFetch('/eleveur/');
  } catch (e) {
    content.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">⚠️</div>
      <div class="empty-state-text">Impossible de charger le profil éleveur</div>
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
              ? `<img src="http://localhost:8001${eleveur.photo_colombier}"
                   id="photo-colombier-img"
                   style="width:160px; height:160px; object-fit:cover;
                          border-radius:12px; border:2px solid var(--border);">`
              : `<div style="width:160px; height:160px; background:var(--bg);
                   border-radius:12px; border:2px dashed var(--border);
                   display:flex; align-items:center; justify-content:center;
                   font-size:56px; margin:0 auto;">🏠</div>`}
          </div>
          <label class="btn btn-secondary" style="cursor:pointer;">
            📷 Changer la photo
            <input type="file" accept="image/*" style="display:none;"
              onchange="uploadPhotoColombier(this)">
          </label>
        </div>

        <!-- Aperçu carte de visite -->
        <div class="card" style="margin-top:16px;">
          <div class="card-title" style="margin-bottom:12px;">Aperçu en-tête PDF</div>
          ${carteDeVisite(eleveur)}
        </div>
      </div>

      <!-- ── COLONNE DROITE : formulaire ── -->
      <div class="card">

        <!-- Identité -->
        <div style="font-weight:600; font-size:14px; margin-bottom:12px;
          padding-bottom:8px; border-bottom:1px solid var(--border);">
          👤 Identité
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Prénom</label>
            <input type="text" class="form-control" id="e-prenom"
              value="${escHtml(eleveur.prenom || '')}" placeholder="Jean">
          </div>
          <div class="form-group">
            <label class="form-label">Nom</label>
            <input type="text" class="form-control" id="e-nom"
              value="${escHtml(eleveur.nom || '')}" placeholder="Dupont">
          </div>
        </div>

        <!-- Colombier -->
        <div style="font-weight:600; font-size:14px; margin:20px 0 12px;
          padding-bottom:8px; border-bottom:1px solid var(--border);">
          🏠 Colombier
        </div>
        <div class="form-group">
          <label class="form-label">Nom du colombier</label>
          <input type="text" class="form-control" id="e-colombier"
            value="${escHtml(eleveur.nom_colombier || '')}" placeholder="Colombier des Bruyères">
        </div>
        <div class="form-group">
          <label class="form-label">Adresse</label>
          <input type="text" class="form-control" id="e-adresse"
            value="${escHtml(eleveur.adresse || '')}" placeholder="12 rue des Pigeons">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Code postal</label>
            <input type="text" class="form-control" id="e-cp"
              value="${escHtml(eleveur.code_postal || '')}" placeholder="86000">
          </div>
          <div class="form-group">
            <label class="form-label">Ville</label>
            <input type="text" class="form-control" id="e-ville"
              value="${escHtml(eleveur.ville || '')}" placeholder="Poitiers">
          </div>
        </div>

        <!-- Contact -->
        <div style="font-weight:600; font-size:14px; margin:20px 0 12px;
          padding-bottom:8px; border-bottom:1px solid var(--border);">
          📞 Contact
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Téléphone</label>
            <input type="text" class="form-control" id="e-tel"
              value="${escHtml(eleveur.telephone || '')}" placeholder="06 12 34 56 78">
          </div>
          <div class="form-group">
            <label class="form-label">Email</label>
            <input type="email" class="form-control" id="e-email"
              value="${escHtml(eleveur.email || '')}" placeholder="jean@example.com">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Site web</label>
          <input type="text" class="form-control" id="e-web"
            value="${escHtml(eleveur.site_web || '')}" placeholder="https://...">
        </div>

        <!-- Colombophilie -->
        <div style="font-weight:600; font-size:14px; margin:20px 0 12px;
          padding-bottom:8px; border-bottom:1px solid var(--border);">
          🏆 Colombophilie
        </div>
        <div class="form-group">
          <label class="form-label">Association</label>
          <input type="text" class="form-control" id="e-asso"
            value="${escHtml(eleveur.association || '')}" placeholder="Société Colombophile de Poitiers">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">N° Licence</label>
            <input type="text" class="form-control" id="e-licence"
              value="${escHtml(eleveur.numero_licence || '')}" placeholder="86-0001">
          </div>
          <div class="form-group">
            <label class="form-label">Année de début</label>
            <input type="number" class="form-control" id="e-annee"
              value="${eleveur.annee_debut || ''}" placeholder="1995"
              min="1900" max="${new Date().getFullYear()}">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Spécialité</label>
          <input type="text" class="form-control" id="e-specialite"
            value="${escHtml(eleveur.specialite || '')}" placeholder="Grand fond, Vitesse...">
        </div>

        <!-- Notes -->
        <div style="font-weight:600; font-size:14px; margin:20px 0 12px;
          padding-bottom:8px; border-bottom:1px solid var(--border);">
          📝 Notes
        </div>
        <div class="form-group">
          <textarea class="form-control" id="e-notes" rows="3"
            placeholder="Observations libres...">${escHtml(eleveur.notes || '')}</textarea>
        </div>

        <div class="form-actions" style="justify-content:flex-end;">
          <button class="btn btn-primary" onclick="saveEleveur()">
            💾 Sauvegarder
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
          ? `<img src="http://localhost:8001${e.photo_colombier}"
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
                 Licence : <strong>${e.numero_licence}</strong></div>`
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
    showNotification('Profil sauvegardé ✅');
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
    const eleveur = await fetch('http://localhost:8001/api/eleveur/photo', {
      method: 'POST',
      body: formData,
    }).then(r => r.json());

    showNotification('Photo mise à jour ✅');

    // Met à jour la photo affichée sans recharger toute la page
    const wrap = document.getElementById('photo-colombier-wrap');
    if (wrap && eleveur.photo_colombier) {
      wrap.innerHTML = `<img src="http://localhost:8001${eleveur.photo_colombier}"
        id="photo-colombier-img"
        style="width:160px; height:160px; object-fit:cover;
               border-radius:12px; border:2px solid var(--border);">`;
    }
    const preview = document.getElementById('carte-preview');
    if (preview) preview.outerHTML = carteDeVisite(eleveur);
  } catch (err) {
    showNotification('Erreur upload photo', 'danger');
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
