// ===== ÉTAT PIGEONS (filtres + tri + pagination) =====
const pigeonState = {
  tous: [],
  lignees: [],
  filtres: { lignee_id: '', statut: '', sexe: '', annee: '' },
  tri: { colonne: 'date_creation', direction: 'asc' },
  page: 0,
  pageSize: 50,
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
      <div style="display:flex; justify-content:flex-end; margin-bottom:16px;">
        <button class="btn btn-secondary" onclick="ouvrirImportPigeons()"
          style="white-space:nowrap;">${t('pigeons.import_btn')}</button>
      </div>
      <div class="empty-state">
        <div class="empty-state-icon">🕊️</div>
        <div class="empty-state-text">${t('pigeons.empty.title')}</div>
        <div class="empty-state-sub">${t('pigeons.empty.sub')}</div>
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
        <option value="">${t('pigeons.filter.all_lignees')}</option>
        ${lignees.map(l =>
          `<option value="${l.id}">${l.nom}</option>`
        ).join('')}
      </select>
      <select class="form-control" style="width:auto;" id="f-statut-filtre"
        onchange="changerFiltre('statut', this.value)">
        <option value="">${t('pigeons.filter.all_status')}</option>
        <option value="actif">${t('status.actif')}</option>
        <option value="reproducteur">${t('status.reproducteur')}</option>
        <option value="concours">${t('status.concours')}</option>
        <option value="retraite">${t('status.retraite')}</option>
        <option value="perdu">${t('status.perdu')}</option>
        <option value="decede">${t('status.decede')}</option>
      </select>
      <select class="form-control" style="width:auto;" id="f-sexe-filtre"
        onchange="changerFiltre('sexe', this.value)">
        <option value="">${t('pigeons.filter.all_sexes')}</option>
        <option value="male">${t('gender.male')}</option>
        <option value="femelle">${t('gender.female')}</option>
      </select>
      <select class="form-control" style="width:auto;" id="f-annee-filtre"
        onchange="changerFiltre('annee', this.value)">
        <option value="">${t('pigeons.filter.all_years')}</option>
        ${annees.map(a => `<option value="${a}">${a}</option>`).join('')}
      </select>
      <button class="btn btn-secondary" onclick="reinitialiserFiltres()"
        style="white-space:nowrap;">${t('pigeons.filter.reset')}</button>
      <div style="margin-left:auto; display:flex; gap:8px;">
        <button class="btn btn-secondary" onclick="ouvrirImportPigeons()"
          style="white-space:nowrap;">${t('pigeons.import_btn')}</button>
        <button class="btn btn-secondary" onclick="exporterCSVPigeons()"
          style="white-space:nowrap;">${t('pigeons.export_btn')}</button>
      </div>
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
              <th>${t('pigeons.table.photo')}</th>
              <th class="triable" id="th-matricule"
                onclick="changerTri('matricule')">${t('pigeons.table.matricule')}</th>
              <th class="triable" id="th-annee_naissance"
                onclick="changerTri('annee_naissance')">${t('pigeons.table.annee')}</th>
              <th class="triable" id="th-sexe"
                onclick="changerTri('sexe')">${t('pigeons.table.sexe')}</th>
              <th class="triable" id="th-lignee"
                onclick="changerTri('lignee')">${t('pigeons.table.lignee')}</th>
              <th>${t('pigeons.table.case')}</th>
              <th class="triable" id="th-statut"
                onclick="changerTri('statut')">${t('pigeons.table.statut')}</th>
              <th>${t('pigeons.table.actions')}</th>
            </tr>
          </thead>
          <tbody id="pigeons-tbody"></tbody>
        </table>
      </div>
      <div id="pigeons-pagination" style="display:flex; justify-content:center; align-items:center;
        gap:12px; padding:16px 0; border-top:1px solid var(--border); margin-top:8px;"></div>
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

  // 3. Compteur + pagination
  const total    = pigeonState.tous.length;
  const affiches = result.length;
  const cpt = document.getElementById('pigeons-compteur');
  if (cpt) {
    cpt.textContent = affiches === total
      ? t('pigeons.count.all', { count: total, total })
      : t('pigeons.count.filtered', { count: affiches, affiches, total });
  }

  const { page, pageSize } = pigeonState;
  const totalPages = Math.max(1, Math.ceil(affiches / pageSize));
  if (pigeonState.page >= totalPages) pigeonState.page = totalPages - 1;
  const debut = pigeonState.page * pageSize;
  result = result.slice(debut, debut + pageSize);

  // 4. Indicateurs d'entête
  const LABELS = {
    matricule: t('pigeons.table.matricule'), annee_naissance: t('pigeons.table.annee'),
    sexe: t('pigeons.table.sexe'), lignee: t('pigeons.table.lignee'), statut: t('pigeons.table.statut'),
  };
  Object.keys(LABELS).forEach(col => {
    const th = document.getElementById(`th-${col}`);
    if (!th) return;
    const actif = tri.colonne === col;
    th.classList.toggle('tri-actif', actif);
    th.textContent = LABELS[col] + (actif ? (tri.direction === 'asc' ? ' ↑' : ' ↓') : '');
  });

  // 5. Rendu pagination
  const paginationEl = document.getElementById('pigeons-pagination');
  if (paginationEl) {
    const currentPage = pigeonState.page;
    const totalPagesNow = Math.max(1, Math.ceil(affiches / pigeonState.pageSize));
    if (totalPagesNow <= 1) {
      paginationEl.innerHTML = '';
    } else {
      paginationEl.innerHTML = `
        <button class="btn btn-secondary" onclick="pigeonChangerPage(${currentPage - 1})"
          ${currentPage === 0 ? 'disabled' : ''} style="padding:6px 14px;">${t('pigeons.pagination.prev')}</button>
        <span style="font-size:13px; color:var(--text-light);">
          ${t('pigeons.pagination.page_of', { current: currentPage + 1, total: totalPagesNow })}
        </span>
        <button class="btn btn-secondary" onclick="pigeonChangerPage(${currentPage + 1})"
          ${currentPage >= totalPagesNow - 1 ? 'disabled' : ''} style="padding:6px 14px;">${t('pigeons.pagination.next')}</button>`;
    }
  }

  // 6. Rendu tbody
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
        <td>${p.sexe === 'male' ? t('gender.male') : t('gender.female')}</td>
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

// ===== IMPORT CSV =====
function ouvrirImportPigeons() {
  openModal(t('pigeons.import.modal_title'), `
    <p style="font-size:14px; margin-bottom:12px; color:var(--text-light);">
      ${t('pigeons.import.intro')}<br>
      <code style="font-size:12px;">${t('pigeons.import.columns')}</code>
    </p>
    <p style="font-size:13px; margin-bottom:16px; color:var(--text-light);">
      ${t('pigeons.import.sexe_values')}<br>
      ${t('pigeons.import.statut_values')}
    </p>
    <div class="form-group">
      <label class="form-label">${t('pigeons.import.file_label')}</label>
      <input type="file" accept=".csv,.txt" class="form-control" id="csv-pigeons-file">
    </div>
    <div id="import-result" style="margin-top:12px;"></div>
    <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:16px;">
      <button class="btn btn-secondary" onclick="closeModal()">${t('common.cancel')}</button>
      <button class="btn btn-primary" onclick="executerImportPigeons()">${t('pigeons.import.submit')}</button>
    </div>
  `);
}

async function executerImportPigeons() {
  const input = document.getElementById('csv-pigeons-file');
  if (!input || !input.files[0]) {
    showNotification(t('pigeons.import.select_file'), 'danger'); return;
  }
  const formData = new FormData();
  formData.append('file', input.files[0]);
  try {
    const res = await fetch(`${API_URL}/pigeons/import/csv`, { method: 'POST', body: formData });
    const data = await res.json();
    const resultEl = document.getElementById('import-result');
    resultEl.innerHTML = `
      <div style="background:var(--bg); border-radius:8px; padding:12px;">
        <div style="color:var(--success); font-weight:600; margin-bottom:8px;">
          ${t('pigeons.import.success', { count: data.importes, n: data.importes })}
        </div>
        ${data.erreurs.length ? `
          <div style="color:var(--danger); font-size:13px;">
            <div style="font-weight:600; margin-bottom:4px;">⚠️ ${t('pigeons.import.errors_count', { count: data.erreurs.length, n: data.erreurs.length })}</div>
            ${data.erreurs.map(e => `<div style="margin-left:12px;">• ${e}</div>`).join('')}
          </div>` : ''}
      </div>`;
    if (data.importes > 0) { showNotification(t('pigeons.import.success', { count: data.importes, n: data.importes })); loadPigeons(); }
  } catch (err) {
    showNotification(t('pigeons.import.error_generic'), 'danger');
  }
}

function ouvrirImportPerformances() {
  openModal(t('performances.import.modal_title'), `
    <p style="font-size:14px; margin-bottom:12px; color:var(--text-light);">
      ${t('performances.import.intro')}<br>
      <code style="font-size:12px;">${t('performances.import.columns')}</code>
    </p>
    <p style="font-size:13px; margin-bottom:16px; color:var(--text-light);">
      ${t('performances.import.date_format')}
    </p>
    <div class="form-group">
      <label class="form-label">${t('performances.import.file_label')}</label>
      <input type="file" accept=".csv,.txt" class="form-control" id="csv-perfs-file">
    </div>
    <div id="import-perf-result" style="margin-top:12px;"></div>
    <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:16px;">
      <button class="btn btn-secondary" onclick="closeModal()">${t('common.cancel')}</button>
      <button class="btn btn-primary" onclick="executerImportPerformances()">${t('performances.import.submit')}</button>
    </div>
  `);
}

async function executerImportPerformances() {
  const input = document.getElementById('csv-perfs-file');
  if (!input || !input.files[0]) {
    showNotification(t('performances.import.select_file'), 'danger'); return;
  }
  const formData = new FormData();
  formData.append('file', input.files[0]);
  try {
    const res = await fetch(`${API_URL}/performances/import/csv`, { method: 'POST', body: formData });
    const data = await res.json();
    const resultEl = document.getElementById('import-perf-result');
    resultEl.innerHTML = `
      <div style="background:var(--bg); border-radius:8px; padding:12px;">
        <div style="color:var(--success); font-weight:600; margin-bottom:8px;">
          ${t('performances.import.success', { count: data.importes, n: data.importes })}
        </div>
        ${data.erreurs.length ? `
          <div style="color:var(--danger); font-size:13px;">
            <div style="font-weight:600; margin-bottom:4px;">⚠️ ${t('performances.import.errors_count', { count: data.erreurs.length, n: data.erreurs.length })}</div>
            ${data.erreurs.map(e => `<div style="margin-left:12px;">• ${e}</div>`).join('')}
          </div>` : ''}
      </div>`;
    if (data.importes > 0) { showNotification(t('performances.import.success', { count: data.importes, n: data.importes })); loadPerformances(); }
  } catch (err) {
    showNotification(t('performances.import.error_generic'), 'danger');
  }
}

function pigeonChangerPage(page) {
  pigeonState.page = page;
  appliquerFiltresEtTri();
  document.querySelector('.card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function exporterCSVPigeons() {
  window.location.href = `${API_URL}/pigeons/export/csv`;
}

function changerFiltre(cle, valeur) {
  pigeonState.page = 0;
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
  pigeonState.page = 0;
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
          ? `<img src="${API_ROOT}${p.photo}"
               style="width:100px; height:100px; border-radius:12px;
                      object-fit:cover; border:2px solid var(--border);">`
          : `<div style="width:100px; height:100px; border-radius:12px;
               background:var(--bg); display:flex; align-items:center;
               justify-content:center; font-size:48px;
               border:2px solid var(--border);">🕊️</div>`}
        <div style="margin-top:10px; text-align:center;">
          <label class="btn btn-secondary"
            style="padding:6px 12px; font-size:12px; cursor:pointer;">
            ${t('pigeons.detail.photo_btn')}
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
            text-transform:uppercase;">${t('pigeons.detail.field.annee')}</span><br>
            <strong>${p.annee_naissance}</strong></div>
          <div><span style="color:var(--text-light); font-size:11px;
            text-transform:uppercase;">${t('pigeons.detail.field.sexe')}</span><br>
            ${p.sexe === 'male' ? t('gender.male') : t('gender.female')}</div>
          <div><span style="color:var(--text-light); font-size:11px;
            text-transform:uppercase;">${t('pigeons.detail.field.statut')}</span><br>
            ${badgeStatut(p.statut)}</div>
          <div><span style="color:var(--text-light); font-size:11px;
            text-transform:uppercase;">${t('pigeons.detail.field.case')}</span><br>
            ${p.colombier_case || '—'}</div>
          <div><span style="color:var(--text-light); font-size:11px;
            text-transform:uppercase;">${t('pigeons.detail.field.couleur')}</span><br>
            ${p.couleur_plumage || '—'}</div>
          <div><span style="color:var(--text-light); font-size:11px;
            text-transform:uppercase;">${t('pigeons.detail.field.lignee')}</span><br>
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
    ${titreSection(t('pigeons.detail.section.notes'))}
    <div style="border-left:3px solid var(--accent); padding:10px 14px;
      background:white; border-radius:0 8px 8px 0; font-size:14px;
      color:${p.notes ? 'var(--text)' : 'var(--text-light)'};">
      ${p.notes ? p.notes.replace(/\n/g, '<br>') : t('pigeons.detail.no_note')}
    </div>`);

  // ── Section généalogie ────────────────────────────────────────────────────
  const sectionGenea = section(`
    ${titreSection(t('pigeons.detail.section.genealogy'))}
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
      <div style="background:white; border-radius:8px; padding:12px;
        border:1px solid var(--border);">
        <div style="font-size:11px; color:var(--text-light);
          margin-bottom:4px;">${t('pigeons.detail.pere')}</div>
        <div style="font-weight:600;">
          ${p.pere
            ? `<span style="cursor:pointer; color:var(--accent);"
                 onclick="closeModal(); setTimeout(()=>openDetailPigeon('${p.pere.id}'),150);">
                 ${p.pere.matricule}</span>`
            : t('pigeons.detail.unknown_male')}
        </div>
      </div>
      <div style="background:white; border-radius:8px; padding:12px;
        border:1px solid var(--border);">
        <div style="font-size:11px; color:var(--text-light);
          margin-bottom:4px;">${t('pigeons.detail.mere')}</div>
        <div style="font-weight:600;">
          ${p.mere
            ? `<span style="cursor:pointer; color:var(--accent);"
                 onclick="closeModal(); setTimeout(()=>openDetailPigeon('${p.mere.id}'),150);">
                 ${p.mere.matricule}</span>`
            : t('pigeons.detail.unknown_female')}
        </div>
      </div>
    </div>`);

  // ── Section performances ──────────────────────────────────────────────────
  const sectionPerfs = section(`
    ${titreSection(t('pigeons.detail.section.performances', { count: perfsTriees.length }))}
    ${perfsTriees.length === 0
      ? `<div style="color:var(--text-light); font-size:14px;">
           ${t('pigeons.detail.no_perf')}</div>`
      : tableCompact(
          [t('pigeons.detail.perf_table.date'), t('pigeons.detail.perf_table.concours'), t('pigeons.detail.perf_table.dist'), t('pigeons.detail.perf_table.class'), t('pigeons.detail.perf_table.vitesse')],
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
    ${titreSection(t('pigeons.detail.section.health', { count: santeTriee.length }))}
    ${santeTriee.length === 0
      ? `<div style="color:var(--text-light); font-size:14px;">
           ${t('pigeons.detail.no_health')}</div>`
      : tableCompact(
          [t('pigeons.detail.health_table.date'), t('pigeons.detail.health_table.type'), t('pigeons.detail.health_table.description'), t('pigeons.detail.health_table.produit')],
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
      <button class="btn btn-secondary" onclick="closeModal()">${t('pigeons.detail.btn.close')}</button>
      <button class="btn btn-secondary" onclick="exportFichePDF('${p.id}')">
        ${t('pigeons.detail.btn.print')}
      </button>
      <button class="btn btn-secondary"
        onclick="closeModal(); setTimeout(()=>{ document.getElementById('modal').style.width='560px'; openPedigree('${p.id}'); },150);">
        ${t('pigeons.detail.btn.pedigree')}
      </button>
      <button class="btn btn-secondary" onclick="openTimeline('${p.id}', '${p.matricule}')">
        ${t('pigeons.detail.btn.history')}
      </button>
      <button class="btn btn-primary" onclick="openEditPigeon('${p.id}')">
        ${t('pigeons.detail.btn.edit')}
      </button>
    </div>`;

  openModal(`🕊️ ${p.matricule}`, html);
  document.getElementById('modal').style.width = '750px';
}

// ===== TIMELINE PIGEON =====
async function openTimeline(id, matricule) {
  closeModal();
  const [perfs, sante] = await Promise.all([
    apiFetch(`/performances/pigeon/${id}`),
    apiFetch(`/sante/pigeon/${id}`),
  ]);

  const evenements = [
    ...perfs.map(p => ({
      date: p.date,
      type: 'concours',
      icone: '🏆',
      titre: p.nom_concours,
      detail: [
        p.distance_km ? `${p.distance_km} km` : null,
        p.classement ? `${p.classement}e` : null,
        p.vitesse_m_min ? `${p.vitesse_m_min.toFixed(1)} m/min` : null,
      ].filter(Boolean).join(' · '),
    })),
    ...sante.map(s => ({
      date: s.date,
      type: 'sante',
      icone: '🏥',
      titre: s.type.replace('_', ' '),
      detail: [s.description, s.produit].filter(Boolean).join(' — '),
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  const couleurs = { concours: '#C4963A', sante: '#27AE60' };

  const html = evenements.length === 0
    ? `<p style="color:var(--text-light); text-align:center; padding:32px 0;">${t('pigeons.timeline.no_events')}</p>`
    : `<div style="position:relative; padding-left:24px;">
        <div style="position:absolute; left:8px; top:0; bottom:0; width:2px;
          background:var(--border);"></div>
        ${evenements.map(ev => `
          <div style="position:relative; margin-bottom:16px;">
            <div style="position:absolute; left:-20px; top:4px; width:12px; height:12px;
              border-radius:50%; background:${couleurs[ev.type]};
              border:2px solid var(--bg-card);"></div>
            <div style="font-size:11px; color:var(--text-light); margin-bottom:4px;">
              ${fmtDate(ev.date)}
            </div>
            <div style="background:var(--bg); border-radius:8px; padding:10px 14px;
              border-left:3px solid ${couleurs[ev.type]};">
              <div style="font-weight:600; font-size:14px;">
                ${ev.icone} ${ev.titre}
              </div>
              ${ev.detail ? `<div style="font-size:13px; color:var(--text-light); margin-top:4px;">${ev.detail}</div>` : ''}
            </div>
          </div>`).join('')}
      </div>
      <div style="text-align:right; margin-top:16px;">
        <button class="btn btn-secondary" onclick="closeModal()">${t('pigeons.timeline.close')}</button>
      </div>`;

  setTimeout(() => {
    openModal(t('pigeons.timeline.title', { matricule }), html);
    document.getElementById('modal').style.width = '600px';
  }, 150);
}

// ===== UPLOAD PHOTO =====
async function uploadPhoto(id, input) {
  const file = input.files[0];
  if (!file) return;
  const formData = new FormData();
  formData.append('file', file);
  try {
    await fetch(`${API_ROOT}/api/pigeons/${id}/photo`, {
      method: 'POST',
      body: formData
    });
    showNotification(t('pigeons.photo.updated'));
    closeModal();
    loadPigeons();
  } catch (err) {
    showNotification(t('pigeons.photo.error'), 'danger');
  }
}

// ===== FORMULAIRE =====
async function openAddPigeon() {
  const lignees = await apiFetch('/lignees/');
  const pigeons = await apiFetch('/pigeons/');
  openModal(t('pigeons.form.add_title'), formPigeon({}, lignees, pigeons));
}

async function openEditPigeon(id) {
  const [pigeon, lignees, pigeons] = await Promise.all([
    apiFetch(`/pigeons/${id}`),
    apiFetch('/lignees/'),
    apiFetch('/pigeons/')
  ]);
  openModal(t('pigeons.form.edit_title'), formPigeon(pigeon, lignees, pigeons));
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
        <label class="form-label">${t('pigeons.form.matricule_label')}</label>
        <input type="text" class="form-control" id="f-matricule"
          value="${p.matricule || ''}" placeholder="${t('pigeons.form.matricule_placeholder')}">
      </div>
      <div class="form-group">
        <label class="form-label">${t('pigeons.form.annee_label')}</label>
        <input type="number" class="form-control" id="f-annee"
          value="${p.annee_naissance || new Date().getFullYear()}"
          min="2000" max="2099">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">${t('pigeons.form.sexe_label')}</label>
        <select class="form-control" id="f-sexe">
          <option value="male" ${p.sexe === 'male' ? 'selected' : ''}>
            ${t('gender.male')}</option>
          <option value="femelle" ${p.sexe === 'femelle' ? 'selected' : ''}>
            ${t('gender.female')}</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">${t('pigeons.form.statut_label')}</label>
        <select class="form-control" id="f-statut">
          <option value="actif" ${p.statut === 'actif' ? 'selected' : ''}>
            ${t('status.actif')}</option>
          <option value="reproducteur"
            ${p.statut === 'reproducteur' ? 'selected' : ''}>
            ${t('status.reproducteur')}</option>
          <option value="concours" ${p.statut === 'concours' ? 'selected' : ''}>
            ${t('status.concours')}</option>
          <option value="retraite" ${p.statut === 'retraite' ? 'selected' : ''}>
            ${t('status.retraite')}</option>
          <option value="perdu" ${p.statut === 'perdu' ? 'selected' : ''}>
            ${t('status.perdu')}</option>
          <option value="decede" ${p.statut === 'decede' ? 'selected' : ''}>
            ${t('status.decede')}</option>
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">${t('pigeons.form.couleur_label')}</label>
        <input type="text" class="form-control" id="f-couleur"
          value="${p.couleur_plumage || ''}"
          placeholder="${t('pigeons.form.couleur_placeholder')}">
      </div>
      <div class="form-group">
        <label class="form-label">${t('pigeons.form.case_label')}</label>
        <input type="text" class="form-control" id="f-case"
          value="${p.colombier_case || ''}" placeholder="${t('pigeons.form.case_placeholder')}">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">${t('pigeons.form.lignee_label')}</label>
      <select class="form-control" id="f-lignee">
        <option value="">${t('pigeons.form.no_lignee')}</option>
        ${lignees.map(l => `
          <option value="${l.id}" ${p.lignee_id === l.id ? 'selected' : ''}>
            ${l.nom}
          </option>`).join('')}
      </select>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">${t('pigeons.form.pere_label')}</label>
        <select class="form-control" id="f-pere">
          <option value="">${t('pigeons.form.unknown_pere')}</option>
          ${malesOptions}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">${t('pigeons.form.mere_label')}</label>
        <select class="form-control" id="f-mere">
          <option value="">${t('pigeons.form.unknown_mere')}</option>
          ${femellesOptions}
        </select>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">${t('pigeons.form.notes_label')}</label>
      <textarea class="form-control" id="f-notes" rows="3"
        placeholder="${t('pigeons.form.notes_placeholder')}"
      >${p.notes || ''}</textarea>
    </div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">${t('common.cancel')}</button>
      <button class="btn btn-primary" onclick="savePigeon('${p.id || ''}')">
        ${p.id ? t('common.save_edit') : t('common.create')}
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
    showNotification(t('pigeons.msg.matricule_required'), 'danger');
    return;
  }

  try {
    if (id) {
      await apiFetch(`/pigeons/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      showNotification(t('pigeons.msg.updated'));
    } else {
      await apiFetch('/pigeons/', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      showNotification(t('pigeons.msg.created'));
    }
    closeModal();
    loadPigeons();
  } catch (err) {
    console.error(err);
  }
}

// ===== SUPPRIMER =====
function deletePigeon(id, matricule) {
  confirmDelete(t('pigeons.msg.delete_confirm', { matricule }), async () => {
  try {
    await apiFetch(`/pigeons/${id}`, { method: 'DELETE' });
    showNotification(t('pigeons.msg.deleted', { matricule }));
    loadPigeons();
  } catch (err) {
    if (err.status === 409 || (err.message && err.message.includes('affectations nutritionnelles'))) {
      _showPigeonBlockedDialog(id, matricule, err.message);
    } else {
      showNotification(err.message || t('pigeons.msg.delete_error'), 'error');
      console.error(err);
    }
  }
  });
}

function _showPigeonBlockedDialog(id, matricule) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;';
  overlay.innerHTML = `
    <div style="background:#fff;border-radius:12px;padding:28px;max-width:420px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,0.2);">
      <div style="font-size:2rem;text-align:center;margin-bottom:12px;">⚠️</div>
      <h3 style="font-size:1.05rem;font-weight:700;text-align:center;margin-bottom:10px;">${t('pigeons.msg.blocked.title')}</h3>
      <p style="font-size:0.88rem;color:#555;line-height:1.5;margin-bottom:6px;">
        ${t('pigeons.msg.blocked.has_assignments', { matricule })}
      </p>
      <p style="font-size:0.88rem;color:#555;line-height:1.5;margin-bottom:20px;">
        ${t('pigeons.msg.blocked.suggestion')}
      </p>
      <div style="display:flex;gap:10px;justify-content:flex-end;">
        <button id="dlg-cancel"  style="padding:8px 18px;border:1px solid #ccc;border-radius:6px;background:#fff;cursor:pointer;font-size:0.88rem;">${t('common.cancel')}</button>
        <button id="dlg-perdu"   style="padding:8px 18px;border:none;border-radius:6px;background:#E67E22;color:#fff;cursor:pointer;font-size:0.88rem;font-weight:600;">${t('pigeons.msg.blocked.mark_lost_btn')}</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const close = () => document.body.removeChild(overlay);

  overlay.querySelector('#dlg-cancel').addEventListener('click', close);

  overlay.querySelector('#dlg-perdu').addEventListener('click', async () => {
    try {
      await apiFetch(`/pigeons/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ statut: 'perdu' }),
      });
      showNotification(t('pigeons.msg.blocked.marked_lost', { matricule }));
      loadPigeons();
    } catch (err2) {
      showNotification(err2.message || t('pigeons.msg.blocked.update_error'), 'error');
    } finally {
      close();
    }
  });
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
  const label = ordinalLabel(n);
  return `<span style="display:inline-block; padding:2px 10px; border-radius:12px;
    font-weight:700; font-size:12px; ${style}">${label}</span>`;
}

function ordinalLabel(n) {
  const lang = getCurrentLang();
  if (lang === 'en') {
    const j = n % 10, k = n % 100;
    if (j === 1 && k !== 11) return `${n}st`;
    if (j === 2 && k !== 12) return `${n}nd`;
    if (j === 3 && k !== 13) return `${n}rd`;
    return `${n}th`;
  }
  if (lang === 'nl') return `${n}e`;
  return n === 1 ? `${n}er` : `${n}ème`;
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
      <div style="display:flex; justify-content:flex-end; margin-bottom:16px;">
        <button class="btn btn-secondary" onclick="ouvrirImportPerformances()"
          style="white-space:nowrap;">${t('performances.import_btn')}</button>
      </div>
      <div class="empty-state">
        <div class="empty-state-icon">🏆</div>
        <div class="empty-state-text">${t('performances.empty.title')}</div>
        <div class="empty-state-sub">${t('performances.empty.sub')}</div>
      </div>`;
    return;
  }

  content.innerHTML = `
    <div style="display:flex; justify-content:flex-end; gap:8px; margin-bottom:12px;">
      <button class="btn btn-secondary" onclick="ouvrirImportPerformances()"
        style="white-space:nowrap;">${t('performances.import_btn')}</button>
      <button class="btn btn-secondary"
        onclick="window.location.href='${API_URL}/performances/export/csv'"
        style="white-space:nowrap;">${t('performances.export_btn')}</button>
    </div>
    <div class="card">
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>${t('performances.table.pigeon')}</th>
              <th>${t('performances.table.concours')}</th>
              <th>${t('performances.table.date')}</th>
              <th>${t('performances.table.distance')}</th>
              <th>${t('performances.table.classement')}</th>
              <th>${t('performances.table.vitesse')}</th>
              <th>${t('performances.table.engages')}</th>
              <th>${t('performances.table.actions')}</th>
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
  openModal(t('performances.add.modal_title'), `
    <div class="form-group">
      <label class="form-label">${t('performances.add.pigeon_label')}</label>
      <select class="form-control" id="fp-pigeon">
        <option value="">${t('performances.add.choose_pigeon')}</option>
        ${pigeons.map(p => `<option value="${p.id}">${p.matricule}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">${t('performances.add.concours_label')}</label>
      <input type="text" class="form-control" id="fp-nom"
        placeholder="${t('performances.add.concours_placeholder')}">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">${t('performances.add.date_label')}</label>
        <input type="date" class="form-control" id="fp-date" value="${today}">
      </div>
      <div class="form-group">
        <label class="form-label">${t('performances.add.distance_label')}</label>
        <input type="number" class="form-control" id="fp-distance" min="0" placeholder="${t('performances.add.distance_placeholder')}">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">${t('performances.add.classement_label')}</label>
        <input type="number" class="form-control" id="fp-classement" min="1" placeholder="${t('performances.add.classement_placeholder')}">
      </div>
      <div class="form-group">
        <label class="form-label">${t('performances.add.vitesse_label')}</label>
        <input type="number" class="form-control" id="fp-vitesse" step="0.1" min="0" placeholder="${t('performances.add.vitesse_placeholder')}">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">${t('performances.add.engages_label')}</label>
      <input type="number" class="form-control" id="fp-engages" min="1" placeholder="${t('performances.add.engages_placeholder')}">
    </div>
    <div class="form-group">
      <label class="form-label">${t('performances.add.notes_label')}</label>
      <textarea class="form-control" id="fp-notes" rows="2"
        placeholder="${t('performances.add.notes_placeholder')}"></textarea>
    </div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">${t('common.cancel')}</button>
      <button class="btn btn-primary" onclick="savePerformance()">${t('performances.add.submit')}</button>
    </div>`);
}

async function savePerformance() {
  const pigeon_id = document.getElementById('fp-pigeon').value;
  const nom_concours = document.getElementById('fp-nom').value.trim();
  const date = document.getElementById('fp-date').value;
  if (!pigeon_id) { showNotification(t('performances.msg.choose_pigeon'), 'danger'); return; }
  if (!nom_concours) { showNotification(t('performances.msg.concours_required'), 'danger'); return; }
  if (!date) { showNotification(t('performances.msg.date_required'), 'danger'); return; }

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
    showNotification(t('performances.msg.saved'));
    closeModal();
    loadPerformances();
  } catch (err) {
    console.error(err);
  }
}

function deletePerformance(id, nom) {
  confirmDelete(t('performances.msg.delete_confirm', { nom }), async () => {
    try {
      await apiFetch(`/performances/${id}`, { method: 'DELETE' });
      showNotification(t('performances.msg.deleted'));
      loadPerformances();
    } catch (err) {
      console.error(err);
    }
  });
}

// ===== SANTÉ =====

function badgeType(type) {
  const map = {
    'vaccination':       ['#27AE60', t('sante.type.vaccination')],
    'traitement':        ['#E67E22', t('sante.type.traitement')],
    'visite vétérinaire':['#2980B9', t('sante.type.visite_veterinaire')],
    'observation':       ['#7F8C8D', t('sante.type.observation')],
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
        <div class="empty-state-text">${t('sante.empty.title')}</div>
        <div class="empty-state-sub">${t('sante.empty.sub')}</div>
      </div>`;
    return;
  }

  content.innerHTML = `
    <div style="text-align:right; margin-bottom:12px;">
      <button class="btn btn-secondary"
        onclick="window.location.href='${API_URL}/sante/export/csv'"
        style="white-space:nowrap;">${t('sante.export_btn')}</button>
    </div>
    <div class="card">
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>${t('sante.table.pigeon')}</th>
              <th>${t('sante.table.date')}</th>
              <th>${t('sante.table.type')}</th>
              <th>${t('sante.table.description')}</th>
              <th>${t('sante.table.produit')}</th>
              <th>${t('sante.table.actions')}</th>
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
  openModal(t('sante.add.modal_title'), `
    <div class="form-group">
      <label class="form-label">${t('sante.add.pigeon_label')}</label>
      <select class="form-control" id="fs-pigeon">
        <option value="">${t('sante.add.choose_pigeon')}</option>
        ${pigeons.map(p => `<option value="${p.id}">${p.matricule}</option>`).join('')}
      </select>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">${t('sante.add.type_label')}</label>
        <select class="form-control" id="fs-type">
          <option value="vaccination">${t('sante.add.type_vaccination')}</option>
          <option value="traitement">${t('sante.add.type_traitement')}</option>
          <option value="visite vétérinaire">${t('sante.add.type_visite')}</option>
          <option value="observation">${t('sante.add.type_observation')}</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">${t('sante.add.date_label')}</label>
        <input type="date" class="form-control" id="fs-date" value="${today}">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">${t('sante.add.description_label')}</label>
      <textarea class="form-control" id="fs-description" rows="2"
        placeholder="${t('sante.add.description_placeholder')}"></textarea>
    </div>
    <div class="form-group">
      <label class="form-label">${t('sante.add.produit_label')}</label>
      <input type="text" class="form-control" id="fs-produit"
        placeholder="${t('sante.add.produit_placeholder')}">
    </div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">${t('common.cancel')}</button>
      <button class="btn btn-primary" onclick="saveSante()">${t('sante.add.submit')}</button>
    </div>`);
}

async function saveSante() {
  const pigeon_id = document.getElementById('fs-pigeon').value;
  const type = document.getElementById('fs-type').value;
  const date = document.getElementById('fs-date').value;
  if (!pigeon_id) { showNotification(t('sante.msg.choose_pigeon'), 'danger'); return; }
  if (!date) { showNotification(t('sante.msg.date_required'), 'danger'); return; }

  const data = {
    pigeon_id,
    type,
    date,
    description: document.getElementById('fs-description').value.trim() || null,
    produit:     document.getElementById('fs-produit').value.trim() || null,
  };

  try {
    await apiFetch('/sante/', { method: 'POST', body: JSON.stringify(data) });
    showNotification(t('sante.msg.saved'));
    closeModal();
    loadSante();
  } catch (err) {
    console.error(err);
  }
}

function deleteSante(id) {
  confirmDelete(t('sante.msg.delete_confirm'), async () => {
    try {
      await apiFetch(`/sante/${id}`, { method: 'DELETE' });
      showNotification(t('sante.msg.deleted'));
      loadSante();
    } catch (err) {
      console.error(err);
    }
  });
}