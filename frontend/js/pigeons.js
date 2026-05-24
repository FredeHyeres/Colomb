// ===== ÉTAT PIGEONS (filtres + tri persistants) =====
const pigeonState = {
  tous: [],
  lignees: [],
  filtres: { lignee_id: '', statut: '', sexe: '', annee: '' },
  tri: { colonne: 'date_creation', direction: 'asc' },
};

async function loadPigeons() {
  const content = document.getElementById('content');
  const [pigeons, lignees] = await Promise.all([
    apiFetch('/pigeons/'),
    apiFetch('/lignees/')
  ]);

  pigeonState.tous    = pigeons;
  pigeonState.lignees = lignees;

  if (pigeons.length === 0) {
    content.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🕊️</div>
        <div class="empty-state-text">Aucun pigeon enregistré</div>
        <div class="empty-state-sub">Commencez par ajouter vos premiers pigeons</div>
      </div>`;
    return;
  }

  // Injecte les styles tri une seule fois
  if (!document.getElementById('tri-styles')) {
    const s = document.createElement('style');
    s.id = 'tri-styles';
    s.textContent = `
      th.triable { cursor:pointer; user-select:none; }
      th.triable:hover { background:var(--border); color:var(--text); }
      th.tri-actif { color:var(--accent) !important; background:#EBF5FB !important; }
    `;
    document.head.appendChild(s);
  }

  const annees = [...new Set(pigeons.map(p => p.annee_naissance))].sort();

  content.innerHTML = `
    <!-- BARRE DE FILTRES -->
    <div style="background:white; padding:16px; border-radius:10px;
      box-shadow:0 2px 8px rgba(0,0,0,0.06); margin-bottom:20px;
      display:flex; gap:12px; align-items:center; flex-wrap:wrap;">
      <select class="form-control" style="width:auto;" id="f-lignee-filtre"
        onchange="changerFiltre('lignee_id', this.value)">
        <option value="">Toutes les lignées</option>
        ${lignees.map(l =>
          `<option value="${l.id}">${l.nom}</option>`
        ).join('')}
      </select>
      <select class="form-control" style="width:auto;" id="f-statut-filtre"
        onchange="changerFiltre('statut', this.value)">
        <option value="">Tous les statuts</option>
        <option value="actif">Actif</option>
        <option value="reproducteur">Reproducteur</option>
        <option value="concours">Concours</option>
        <option value="retraite">Retraité</option>
        <option value="perdu">Perdu</option>
        <option value="decede">Décédé</option>
      </select>
      <select class="form-control" style="width:auto;" id="f-sexe-filtre"
        onchange="changerFiltre('sexe', this.value)">
        <option value="">Tous les sexes</option>
        <option value="male">♂️ Mâle</option>
        <option value="femelle">♀️ Femelle</option>
      </select>
      <select class="form-control" style="width:auto;" id="f-annee-filtre"
        onchange="changerFiltre('annee', this.value)">
        <option value="">Toutes les années</option>
        ${annees.map(a => `<option value="${a}">${a}</option>`).join('')}
      </select>
      <button class="btn btn-secondary" onclick="reinitialiserFiltres()"
        style="white-space:nowrap;">✕ Réinitialiser</button>
    </div>

    <!-- COMPTEUR -->
    <div id="pigeons-compteur"
      style="font-size:13px; color:var(--text-light); margin-bottom:10px;"></div>

    <!-- TABLEAU -->
    <div class="card">
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Photo</th>
              <th class="triable" id="th-matricule"
                onclick="changerTri('matricule')">Matricule</th>
              <th class="triable" id="th-annee_naissance"
                onclick="changerTri('annee_naissance')">Année</th>
              <th class="triable" id="th-sexe"
                onclick="changerTri('sexe')">Sexe</th>
              <th class="triable" id="th-lignee"
                onclick="changerTri('lignee')">Lignée</th>
              <th>Case</th>
              <th class="triable" id="th-statut"
                onclick="changerTri('statut')">Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="pigeons-tbody"></tbody>
        </table>
      </div>
    </div>`;

  // Restaure l'état des selects si on revient sur la page
  document.getElementById('f-lignee-filtre').value = pigeonState.filtres.lignee_id;
  document.getElementById('f-statut-filtre').value  = pigeonState.filtres.statut;
  document.getElementById('f-sexe-filtre').value    = pigeonState.filtres.sexe;
  document.getElementById('f-annee-filtre').value   = pigeonState.filtres.annee;

  appliquerFiltresEtTri();
}

// Met à jour le tbody et le compteur sans rappeler l'API
function appliquerFiltresEtTri() {
  const { filtres, tri } = pigeonState;

  // 1. Filtrage
  let result = pigeonState.tous.filter(p => {
    if (filtres.lignee_id && p.lignee_id !== filtres.lignee_id) return false;
    if (filtres.statut    && p.statut    !== filtres.statut)    return false;
    if (filtres.sexe      && p.sexe      !== filtres.sexe)      return false;
    if (filtres.annee     && p.annee_naissance !== parseInt(filtres.annee)) return false;
    return true;
  });

  // 2. Tri (ordre API = date_creation asc = pas de re-tri nécessaire)
  if (tri.colonne !== 'date_creation') {
    result = [...result].sort((a, b) => {
      let va, vb;
      if (tri.colonne === 'lignee') {
        const la = pigeonState.lignees.find(l => l.id === a.lignee_id);
        const lb = pigeonState.lignees.find(l => l.id === b.lignee_id);
        va = la?.nom ?? '';
        vb = lb?.nom ?? '';
      } else {
        va = a[tri.colonne] ?? '';
        vb = b[tri.colonne] ?? '';
      }
      const cmp = typeof va === 'number'
        ? va - vb
        : String(va).localeCompare(String(vb), 'fr');
      return tri.direction === 'asc' ? cmp : -cmp;
    });
  }

  // 3. Compteur
  const total    = pigeonState.tous.length;
  const affiches = result.length;
  const cpt = document.getElementById('pigeons-compteur');
  if (cpt) {
    cpt.textContent = affiches === total
      ? `${total} pigeon${total > 1 ? 's' : ''}`
      : `Affichage de ${affiches} pigeon${affiches > 1 ? 's' : ''} sur ${total}`;
  }

  // 4. Indicateurs d'entête
  const LABELS = {
    matricule: 'Matricule', annee_naissance: 'Année',
    sexe: 'Sexe', lignee: 'Lignée', statut: 'Statut',
  };
  Object.keys(LABELS).forEach(col => {
    const th = document.getElementById(`th-${col}`);
    if (!th) return;
    const actif = tri.colonne === col;
    th.classList.toggle('tri-actif', actif);
    th.textContent = LABELS[col] + (actif ? (tri.direction === 'asc' ? ' ↑' : ' ↓') : '');
  });

  // 5. Rendu tbody
  const tbody = document.getElementById('pigeons-tbody');
  if (!tbody) return;
  tbody.innerHTML = result.map(p => {
    const lignee = pigeonState.lignees.find(l => l.id === p.lignee_id);
    const style = ligneeStyle(lignee);
    return `
      <tr style="${style.rowBg} ${style.borderLeft}">
        <td>${pigeonPhoto(p.photo, p.matricule)}</td>
        <td><strong>${p.matricule}</strong></td>
        <td>${p.annee_naissance}</td>
        <td>${p.sexe === 'male' ? '♂️ Mâle' : '♀️ Femelle'}</td>
        <td>${lignee
          ? `<span style="${style.badge}">${lignee.nom}</span>`
          : '<span style="color:var(--text-light)">—</span>'}</td>
        <td>${p.colombier_case || '—'}</td>
        <td>${badgeStatut(p.statut)}</td>
        <td>
          <div style="display:flex; gap:6px;">
            <button class="btn btn-secondary"
              onclick="openDetailPigeon('${p.id}')"
              style="padding:6px 10px; font-size:12px;">👁️</button>
            <button class="btn btn-secondary"
              onclick="openEditPigeon('${p.id}')"
              style="padding:6px 10px; font-size:12px;">✏️</button>
            <button class="btn btn-danger"
              onclick="deletePigeon('${p.id}', '${p.matricule}')"
              style="padding:6px 10px; font-size:12px;">🗑️</button>
            <button class="btn btn-primary"
              onclick="document.getElementById('modal').style.width='560px';
                       openPedigree('${p.id}');"
              style="font-size:12px; padding:6px 10px;">🌳 Pedigree</button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

function changerFiltre(cle, valeur) {
  pigeonState.filtres[cle] = valeur;
  appliquerFiltresEtTri();
}

function changerTri(colonne) {
  const tri = pigeonState.tri;
  if (tri.colonne !== colonne) {
    // Nouvelle colonne → ASC
    tri.colonne    = colonne;
    tri.direction  = 'asc';
  } else if (tri.direction === 'asc') {
    tri.direction  = 'desc';
  } else {
    // 3ème clic → retour ordre original (date_creation asc)
    tri.colonne    = 'date_creation';
    tri.direction  = 'asc';
  }
  appliquerFiltresEtTri();
}

function reinitialiserFiltres() {
  pigeonState.filtres = { lignee_id: '', statut: '', sexe: '', annee: '' };
  ['f-lignee-filtre', 'f-statut-filtre', 'f-sexe-filtre', 'f-annee-filtre'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  appliquerFiltresEtTri();
}

// ===== DETAIL PIGEON =====
async function openDetailPigeon(id) {
  const [p, perfs, sante, lignees] = await Promise.all([
    apiFetch(`/pigeons/${id}`),
    apiFetch(`/performances/pigeon/${id}`),
    apiFetch(`/sante/pigeon/${id}`),
    apiFetch('/lignees/'),
  ]);
  const lignee = lignees.find(l => l.id === p.lignee_id);

  const perfsTriees = [...perfs].sort((a, b) => b.date.localeCompare(a.date));
  const santeTriee  = [...sante].sort((a, b) => b.date.localeCompare(a.date));

  // ── Helpers locaux ────────────────────────────────────────────────────────
  const section = (contenu) =>
    `<div style="background:var(--bg); border-radius:10px; padding:16px;
       margin-bottom:16px;">${contenu}</div>`;

  const titreSection = (texte) =>
    `<div style="font-family:'Playfair Display',serif; font-weight:600;
       font-size:15px; margin-bottom:12px;">${texte}</div>`;

  const tableCompact = (thead, tbody) => `
    <div style="overflow-x:auto;">
      <table style="width:100%; font-size:13px; border-collapse:collapse;">
        <thead>
          <tr style="border-bottom:2px solid var(--border);">
            ${thead.map(h =>
              `<th style="padding:6px 8px; text-align:left;
                color:var(--text-light); font-weight:600;
                font-size:11px; text-transform:uppercase;">${h}</th>`
            ).join('')}
          </tr>
        </thead>
        <tbody>${tbody}</tbody>
      </table>
    </div>`;

  // ── Section infos principales ─────────────────────────────────────────────
  const sectionInfos = `
    <div style="display:flex; gap:24px; margin-bottom:16px;">
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
          font-size:22px; margin-bottom:14px;">${p.matricule}</h3>
        <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px;">
          <div><span style="color:var(--text-light); font-size:11px;
            text-transform:uppercase;">Année</span><br>
            <strong>${p.annee_naissance}</strong></div>
          <div><span style="color:var(--text-light); font-size:11px;
            text-transform:uppercase;">Sexe</span><br>
            ${p.sexe === 'male' ? '♂️ Mâle' : '♀️ Femelle'}</div>
          <div><span style="color:var(--text-light); font-size:11px;
            text-transform:uppercase;">Statut</span><br>
            ${badgeStatut(p.statut)}</div>
          <div><span style="color:var(--text-light); font-size:11px;
            text-transform:uppercase;">Case</span><br>
            ${p.colombier_case || '—'}</div>
          <div><span style="color:var(--text-light); font-size:11px;
            text-transform:uppercase;">Couleur</span><br>
            ${p.couleur_plumage || '—'}</div>
          <div><span style="color:var(--text-light); font-size:11px;
            text-transform:uppercase;">Lignée</span><br>
            ${lignee
              ? `<span style="background:${lignee.couleur_label}; color:white;
                   padding:4px 12px; border-radius:12px; font-weight:600;
                   font-size:12px; display:inline-block;">${lignee.nom}</span>`
              : '—'}</div>
        </div>
      </div>
    </div>`;

  // ── Section notes ──────────────────────────────────────────────────────────
  const sectionNotes = section(`
    ${titreSection('📝 Notes')}
    <div style="border-left:3px solid var(--accent); padding:10px 14px;
      background:white; border-radius:0 8px 8px 0; font-size:14px;
      color:${p.notes ? 'var(--text)' : 'var(--text-light)'};">
      ${p.notes ? p.notes.replace(/\n/g, '<br>') : 'Aucune note'}
    </div>`);

  // ── Section généalogie ────────────────────────────────────────────────────
  const sectionGenea = section(`
    ${titreSection('🌳 Généalogie')}
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
      <div style="background:white; border-radius:8px; padding:12px;
        border:1px solid var(--border);">
        <div style="font-size:11px; color:var(--text-light);
          margin-bottom:4px;">PÈRE ♂️</div>
        <div style="font-weight:600;">
          ${p.pere
            ? `<span style="cursor:pointer; color:var(--accent);"
                 onclick="closeModal(); setTimeout(()=>openDetailPigeon('${p.pere.id}'),150);">
                 ${p.pere.matricule}</span>`
            : 'Inconnu'}
        </div>
      </div>
      <div style="background:white; border-radius:8px; padding:12px;
        border:1px solid var(--border);">
        <div style="font-size:11px; color:var(--text-light);
          margin-bottom:4px;">MÈRE ♀️</div>
        <div style="font-weight:600;">
          ${p.mere
            ? `<span style="cursor:pointer; color:var(--accent);"
                 onclick="closeModal(); setTimeout(()=>openDetailPigeon('${p.mere.id}'),150);">
                 ${p.mere.matricule}</span>`
            : 'Inconnue'}
        </div>
      </div>
    </div>`);

  // ── Section performances ──────────────────────────────────────────────────
  const sectionPerfs = section(`
    ${titreSection(`🏆 Performances (${perfsTriees.length} concours)`)}
    ${perfsTriees.length === 0
      ? `<div style="color:var(--text-light); font-size:14px;">
           Aucune performance enregistrée</div>`
      : tableCompact(
          ['Date', 'Concours', 'Dist.', 'Class.', 'Vitesse'],
          perfsTriees.map(pf => `
            <tr style="border-bottom:1px solid var(--border);">
              <td style="padding:8px;">${fmtDate(pf.date)}</td>
              <td style="padding:8px;">${pf.nom_concours}</td>
              <td style="padding:8px;">${pf.distance_km ? pf.distance_km + ' km' : '—'}</td>
              <td style="padding:8px;">${badgeClassement(pf.classement)}</td>
              <td style="padding:8px;">${pf.vitesse_m_min ? pf.vitesse_m_min.toFixed(1) + ' m/min' : '—'}</td>
            </tr>`).join('')
        )
    }`);

  // ── Section santé ─────────────────────────────────────────────────────────
  const sectionSante = section(`
    ${titreSection(`🏥 Suivi santé (${santeTriee.length} événements)`)}
    ${santeTriee.length === 0
      ? `<div style="color:var(--text-light); font-size:14px;">
           Aucun événement santé enregistré</div>`
      : tableCompact(
          ['Date', 'Type', 'Description', 'Produit'],
          santeTriee.map(ev => `
            <tr style="border-bottom:1px solid var(--border);">
              <td style="padding:8px;">${fmtDate(ev.date)}</td>
              <td style="padding:8px;">${badgeType(ev.type)}</td>
              <td style="padding:8px; max-width:220px; white-space:normal;">
                ${ev.description || '—'}</td>
              <td style="padding:8px;">${ev.produit || '—'}</td>
            </tr>`).join('')
        )
    }`);

  // ── Assemblage ────────────────────────────────────────────────────────────
  const html = `
    ${sectionInfos}
    ${sectionNotes}
    ${sectionGenea}
    ${sectionPerfs}
    ${sectionSante}
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Fermer</button>
      <button class="btn btn-secondary" onclick="exportFichePDF('${p.id}')">
        🖨️ Imprimer
      </button>
      <button class="btn btn-secondary"
        onclick="closeModal(); setTimeout(()=>{ document.getElementById('modal').style.width='560px'; openPedigree('${p.id}'); },150);">
        🌳 Pedigree
      </button>
      <button class="btn btn-primary" onclick="openEditPigeon('${p.id}')">
        ✏️ Modifier
      </button>
    </div>`;

  openModal(`🕊️ ${p.matricule}`, html);
  document.getElementById('modal').style.width = '750px';
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
  const [perfs, pigeons, lignees] = await Promise.all([
    apiFetch('/performances/'),
    apiFetch('/pigeons/'),
    apiFetch('/lignees/')
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
              const lignee = lignees.find(l => l.id === pigeon?.lignee_id);
              const style = ligneeStyle(lignee);
              return `
                <tr style="${style.rowBg} ${style.borderLeft}">
                  <td>
                    <div style="font-weight:600">${pigeon ? pigeon.matricule : '—'}</div>
                    ${lignee ? `<span style="${style.badge}">${lignee.nom}</span>` : ''}
                  </td>
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
  const [events, pigeons, lignees] = await Promise.all([
    apiFetch('/sante/'),
    apiFetch('/pigeons/'),
    apiFetch('/lignees/')
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
              const lignee = lignees.find(l => l.id === pigeon?.lignee_id);
              const style = ligneeStyle(lignee);
              return `
                <tr style="${style.rowBg} ${style.borderLeft}">
                  <td>
                    <div style="font-weight:600">${pigeon ? pigeon.matricule : '—'}</div>
                    ${lignee ? `<span style="${style.badge}">${lignee.nom}</span>` : ''}
                  </td>
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