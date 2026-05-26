/* ============================================================
   SPORT-NUTRITION.JS — Nutrition : mélanges, ingrédients, suppléments, plans
   ============================================================ */

/* ——— Page principale : 5 onglets ——— */
async function loadNutrition() {
  const content = document.getElementById('content');
  const btn = document.getElementById('btn-add');
  if (btn) { btn.style.display = 'none'; btn.onclick = null; }

  content.innerHTML = `
    <div class="card">
      <div class="tabs-header">
        <button class="tab-btn active" data-tab="mixes">🔀 Mélanges</button>
        <button class="tab-btn" data-tab="ingredients">🌾 Ingrédients</button>
        <button class="tab-btn" data-tab="supplements">💊 Suppléments</button>
        <button class="tab-btn" data-tab="plans">📋 Plan alimentaire</button>
        <button class="tab-btn" data-tab="calendar">📅 Calendrier</button>
      </div>
      <div id="tab-mixes"       class="tab-panel active"><div class="loader-spinner"></div></div>
      <div id="tab-ingredients" class="tab-panel"><div class="loader-spinner"></div></div>
      <div id="tab-supplements" class="tab-panel"><div class="loader-spinner"></div></div>
      <div id="tab-plans"       class="tab-panel"><div class="loader-spinner"></div></div>
      <div id="tab-calendar"    class="tab-panel"><div class="loader-spinner"></div></div>
    </div>`;

  document.querySelectorAll('.tab-btn[data-tab]').forEach(tabBtn => {
    tabBtn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn[data-tab]').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      tabBtn.classList.add('active');
      document.getElementById(`tab-${tabBtn.dataset.tab}`)?.classList.add('active');
    });
  });

  loadMixesTab();
  loadIngredientsTab();
  loadSupplementsTab();
  _loadPlansTab();
  _loadCalendarTab();
}

/* ============================================================
   ONGLET MÉLANGES
   ============================================================ */

async function loadMixesTab() {
  const el = document.getElementById('tab-mixes');
  if (!el) return;
  try {
    const mixes = await SportAPI.getMixes();
    const list = Array.isArray(mixes) ? mixes : (mixes.items || []);
    const usageLabels = { recuperation:'Récupération', entrainement:'Entraînement', pre_panier:'Pré-panier', enlogement:'Enlogement' };

    el.innerHTML = `
      <div style="display:flex;justify-content:flex-end;margin-bottom:14px;">
        <button class="btn btn-primary btn-sm" onclick="openMixModal()">+ Créer un mélange</button>
      </div>
      ${list.length === 0
        ? `<div class="empty-state"><div class="empty-icon">🔀</div><h3>Aucun mélange</h3><p>Créez vos formules de mélanges personnalisés.</p></div>`
        : `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px;">
            ${list.map(m => `
              <div class="card" style="padding:16px;">
                <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:8px;">
                  <div>
                    <div style="font-weight:600;font-size:0.95rem;">${m.name || '—'}</div>
                    ${m.usage ? `<span class="badge badge-info" style="margin-top:4px;">${usageLabels[m.usage] || m.usage}</span>` : ''}
                  </div>
                  <div style="display:flex;gap:6px;">
                    <button class="btn btn-sm btn-icon" onclick="openMixModal(${m.id})" title="Modifier">✏️</button>
                    <button class="btn btn-sm btn-icon" onclick="deleteMixItem(${m.id})" title="Supprimer">🗑️</button>
                  </div>
                </div>
                ${m.description ? `<p style="font-size:0.8rem;color:var(--text-light);margin-bottom:8px;">${m.description}</p>` : ''}
                ${_renderMixCompositionPreview(m.composition)}
              </div>`).join('')}
          </div>`}`;
  } catch (err) {
    el.innerHTML = `<p style="color:var(--danger);">Erreur : ${err.message}</p>`;
    showToast(err.message, 'error');
  }
}

function _renderMixCompositionPreview(compositionJson) {
  if (!compositionJson) return '<div style="font-size:0.75rem;color:var(--text-light);margin-top:4px;">Composition non définie</div>';
  try {
    const comp = JSON.parse(compositionJson);
    if (!Array.isArray(comp) || comp.length === 0) return '';
    const ings = comp.filter(c => c.type !== 'supplement');
    const sups = comp.filter(c => c.type === 'supplement');
    const ingHtml = ings.map(c =>
      `<span style="background:var(--bg-secondary);border-radius:4px;padding:2px 6px;margin-right:3px;margin-bottom:3px;display:inline-block;">🌾 ${c.name} ${parseFloat(c.pct).toFixed(1)}%</span>`
    ).join('');
    const supHtml = sups.length
      ? '<br>' + sups.map(c =>
          `<span style="background:#f0f8ff;border-radius:4px;padding:2px 6px;margin-right:3px;margin-bottom:3px;display:inline-block;">💊 ${c.name}${c.quantity ? ' ' + c.quantity + (c.unit ? ' ' + c.unit : '') : ''}</span>`
        ).join('')
      : '';
    return `<div style="font-size:0.75rem;color:var(--text-light);margin-top:6px;">${ingHtml}${supHtml}</div>`;
  } catch { return ''; }
}

async function deleteMixItem(mixId) {
  if (!confirm('Supprimer ce mélange ? Cette action est irréversible.')) return;
  try {
    await SportAPI.deleteMix(mixId);
    showToast('Mélange supprimé.', 'success');
    loadMixesTab();
  } catch (err) { showToast(err.message, 'error'); }
}

/* ============================================================
   ÉTAT COMPOSITION MÉLANGE — ingrédients séparés des suppléments
   ============================================================ */

let _ingState = { items: [] };
// item: { id:"ing_X", name:"...", pct:50.00 }

let _supState = { items: [] };
// item: { id:"sup_X", name:"...", quantity:"", unit:"g/kg" }

/* ——— Ingrédients ——— */
function _ingAddItem(id, name) {
  if (_ingState.items.find(i => i.id === id)) { showToast('Déjà dans la composition', 'warning'); return; }
  _ingState.items.push({ id, name, pct: 0 });
  _ingRebalanceEqual();
  _ingRenderList();
}

function _ingRemoveItem(idx) {
  _ingState.items.splice(idx, 1);
  if (_ingState.items.length > 0) _ingRebalanceEqual();
  _ingRenderList();
}

function _ingRebalanceEqual() {
  const n = _ingState.items.length;
  if (n === 0) return;
  const share = parseFloat((100 / n).toFixed(2));
  const last  = parseFloat((100 - share * (n - 1)).toFixed(2));
  _ingState.items.forEach((item, i) => { item.pct = i === n - 1 ? last : share; });
}

/* ——— Algorithme proportionnel ——— */
function _ingApplyChange(idx, rawVal) {
  const newPct = Math.min(100, Math.max(0, parseFloat(rawVal) || 0));
  const oldPct = _ingState.items[idx].pct;
  const activeOthers = _ingState.items.filter((item, i) => i !== idx && item.pct > 0);

  _ingState.items[idx].pct = newPct;

  if (activeOthers.length === 0) return; // aucun autre actif, pas de redistribution

  if (Math.abs(oldPct - 100) < 0.001) {
    // CAS 1 : était à 100% → redistribution égale
    const share = (100 - newPct) / activeOthers.length;
    activeOthers.forEach(o => { o.pct = Math.max(0, share); });
  } else {
    // Recalcul proportionnel
    const oldOthersSum = 100 - oldPct;
    const newOthersSum = 100 - newPct;
    activeOthers.forEach(o => {
      o.pct = Math.max(0, (o.pct * newOthersSum) / oldOthersSum);
    });
  }

  // CAS 3 : borner entre 0 et 100
  _ingState.items.forEach(item => { item.pct = Math.min(100, Math.max(0, item.pct)); });

  // CAS 4 : corriger les arrondis pour total = 100.00% exact
  _ingState.items.forEach(item => { item.pct = parseFloat(item.pct.toFixed(2)); });
  const sum = _ingState.items.reduce((s, i) => s + i.pct, 0);
  const residual = parseFloat((100 - sum).toFixed(2));
  if (Math.abs(residual) >= 0.01) {
    _ingState.items[idx].pct = parseFloat((_ingState.items[idx].pct + residual).toFixed(2));
  }
}

function _ingUpdateDOM() {
  _ingState.items.forEach((item, idx) => {
    const slider = document.querySelector(`.mix-ing-slider[data-idx="${idx}"]`);
    const input  = document.querySelector(`.mix-ing-input[data-idx="${idx}"]`);
    if (slider) slider.value = item.pct;
    if (input)  input.value  = item.pct;
  });
  const totalEl = document.getElementById('mix-ing-total');
  if (totalEl) {
    const total = _ingState.items.reduce((s, i) => s + i.pct, 0);
    const ok = Math.abs(total - 100) < 0.05;
    totalEl.textContent  = `Total ingrédients : ${total.toFixed(2)}%`;
    totalEl.style.color  = ok ? 'var(--success)' : (total > 100 ? 'var(--danger)' : 'var(--warning)');
    totalEl.style.fontWeight = '600';
  }
}

function _ingRenderList() {
  const el      = document.getElementById('mix-ing-list');
  const totalEl = document.getElementById('mix-ing-total');
  if (!el) return;

  if (_ingState.items.length === 0) {
    el.innerHTML = '<div style="font-size:0.8rem;color:var(--text-light);padding:8px 0;">Aucun ingrédient sélectionné</div>';
    if (totalEl) { totalEl.textContent = 'Total ingrédients : 0%'; totalEl.style.color = 'var(--text)'; }
    return;
  }

  el.innerHTML = _ingState.items.map((item, idx) => `
    <div class="mix-ing-row" style="display:flex;gap:8px;align-items:center;margin-bottom:8px;flex-wrap:wrap;">
      <span style="flex:1;font-size:0.88rem;min-width:100px;">🌾 ${item.name}</span>
      <input type="range" min="0" max="100" step="0.01" value="${item.pct}"
        class="mix-ing-slider" data-idx="${idx}" style="flex:2;min-width:100px;accent-color:var(--primary);">
      <input type="number" min="0" max="100" step="0.01" value="${item.pct}"
        class="form-control mix-ing-input" style="width:80px;" data-idx="${idx}">
      <span style="font-size:0.8rem;color:var(--text-light);width:14px;">%</span>
      <button type="button" class="btn btn-sm btn-icon mix-ing-remove" data-idx="${idx}">🗑️</button>
    </div>`).join('');

  _ingUpdateDOM();

  el.querySelectorAll('.mix-ing-slider').forEach(slider => {
    slider.addEventListener('input', (e) => {
      _ingApplyChange(parseInt(e.target.dataset.idx), e.target.value);
      _ingUpdateDOM();
    });
    slider.addEventListener('change', () => _ingRenderList());
  });
  el.querySelectorAll('.mix-ing-input').forEach(input => {
    input.addEventListener('change', (e) => {
      _ingApplyChange(parseInt(e.target.dataset.idx), e.target.value);
      _ingRenderList();
    });
  });
  el.querySelectorAll('.mix-ing-remove').forEach(btn => {
    btn.addEventListener('click', (e) => _ingRemoveItem(parseInt(e.target.dataset.idx)));
  });
}

/* ——— Suppléments (hors %) ——— */
function _supAddItem(id, name) {
  if (_supState.items.find(s => s.id === id)) { showToast('Déjà dans le mélange', 'warning'); return; }
  _supState.items.push({ id, name, quantity: '', unit: 'g/kg' });
  _supRenderList();
}

function _supRemoveItem(idx) {
  _supState.items.splice(idx, 1);
  _supRenderList();
}

function _supRenderList() {
  const el = document.getElementById('mix-sup-list');
  if (!el) return;

  if (_supState.items.length === 0) {
    el.innerHTML = '<div style="font-size:0.8rem;color:var(--text-light);padding:8px 0;">Aucun supplément ajouté</div>';
    return;
  }

  const unitOpts = ['g/kg','ml/kg','ml/L','gouttes/L','mg/kg','ml/pigeon','dosette']
    .map(u => `<option value="${u}">${u}</option>`).join('');

  el.innerHTML = _supState.items.map((item, idx) => `
    <div style="display:flex;gap:8px;align-items:center;margin-bottom:6px;flex-wrap:wrap;">
      <span style="flex:1;font-size:0.88rem;min-width:100px;">💊 ${item.name}</span>
      <input type="number" min="0" step="0.01" value="${item.quantity}"
        class="form-control mix-sup-qty" style="width:75px;" data-idx="${idx}" placeholder="Qté">
      <select class="form-control form-control-sm mix-sup-unit" data-idx="${idx}" style="width:110px;">
        ${unitOpts}
      </select>
      <button type="button" class="btn btn-sm btn-icon mix-sup-remove" data-idx="${idx}">🗑️</button>
    </div>`).join('');

  // Restaurer les unités sélectionnées
  _supState.items.forEach((item, idx) => {
    const sel = el.querySelector(`.mix-sup-unit[data-idx="${idx}"]`);
    if (sel) sel.value = item.unit || 'g/kg';
  });

  el.querySelectorAll('.mix-sup-qty').forEach(input => {
    input.addEventListener('change', (e) => {
      _supState.items[parseInt(e.target.dataset.idx)].quantity = e.target.value;
    });
  });
  el.querySelectorAll('.mix-sup-unit').forEach(sel => {
    sel.addEventListener('change', (e) => {
      _supState.items[parseInt(e.target.dataset.idx)].unit = e.target.value;
    });
  });
  el.querySelectorAll('.mix-sup-remove').forEach(btn => {
    btn.addEventListener('click', (e) => _supRemoveItem(parseInt(e.target.dataset.idx)));
  });
}

/* ——— Modal mélange (création + modification) ——— */
async function openMixModal(mixId = null) {
  const overlay = document.getElementById('modal-overlay');
  document.getElementById('modal-title').textContent = mixId ? '✏️ Modifier le mélange' : '+ Nouveau mélange';
  document.getElementById('modal').className = 'modal';
  document.getElementById('modal-body').innerHTML = '<div class="loader-spinner"></div>';
  overlay.style.display = 'flex';
  document.getElementById('modal-close').onclick = closeModal;
  overlay.onclick = (e) => { if (e.target === overlay) closeModal(); };

  let mix = null, ingredients = [], supplements = [];
  try {
    [mix, ingredients, supplements] = await Promise.all([
      mixId ? SportAPI.getMix(mixId) : Promise.resolve(null),
      SportAPI.getIngredients().catch(() => []),
      SportAPI.getSupplements().catch(() => []),
    ]);
    ingredients = Array.isArray(ingredients) ? ingredients : [];
    supplements = Array.isArray(supplements) ? supplements : [];
  } catch (err) { showToast(err.message, 'error'); closeModal(); return; }

  // Initialiser les états séparés
  _ingState = { items: [] };
  _supState = { items: [] };
  if (mix?.composition) {
    try {
      const parsed = JSON.parse(mix.composition);
      if (Array.isArray(parsed)) {
        parsed.forEach(c => {
          if (c.type === 'supplement') {
            _supState.items.push({ id: c.id, name: c.name, quantity: c.quantity || '', unit: c.unit || 'g/kg' });
          } else {
            _ingState.items.push({ id: c.id, name: c.name, pct: parseFloat(c.pct) || 0 });
          }
        });
      }
    } catch { /* composition corrompue */ }
  }

  const ingOpts = ingredients.map(i =>
    `<option value="ing_${i.id}" data-name="${i.name}">${i.name}</option>`).join('');
  const supOpts = supplements.map(s =>
    `<option value="sup_${s.id}" data-name="${s.name}">${s.name}</option>`).join('');

  document.getElementById('modal-body').innerHTML = `
    <form id="form-mix">
      <div class="form-group">
        <label class="form-label">Nom du mélange *</label>
        <input type="text" class="form-control" name="name" required
          placeholder="ex: Mélange course longue distance"
          value="${mix ? (mix.name || '') : ''}">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Usage</label>
          <select class="form-control" name="usage">
            <option value="">—</option>
            <option value="recuperation"${mix?.usage==='recuperation'?' selected':''}>Récupération</option>
            <option value="entrainement"${mix?.usage==='entrainement'?' selected':''}>Entraînement</option>
            <option value="pre_panier"${mix?.usage==='pre_panier'?' selected':''}>Pré-panier</option>
            <option value="enlogement"${mix?.usage==='enlogement'?' selected':''}>Enlogement</option>
          </select>
        </div>
        <div class="form-group" style="flex:2;">
          <label class="form-label">Description</label>
          <input type="text" class="form-control" name="description"
            placeholder="Usage recommandé..." value="${mix?.description || ''}">
        </div>
      </div>

      <div style="margin:18px 0 6px;font-weight:600;font-size:0.92rem;border-top:1px solid var(--border);padding-top:12px;">
        🌾 Ingrédients — total 100%
      </div>
      <p style="font-size:0.77rem;color:var(--text-light);margin-bottom:8px;">
        Les pourcentages se recalculent proportionnellement. Les ingrédients à 0% sont exclus du recalcul automatique.
      </p>
      <div style="display:flex;gap:8px;margin-bottom:10px;">
        <select id="mix-ing-sel" class="form-control form-control-sm" style="flex:1;">
          <option value="">— Choisir un ingrédient —</option>
          ${ingOpts || '<option disabled>Aucun ingrédient disponible</option>'}
        </select>
        <button type="button" class="btn btn-secondary btn-sm" id="mix-add-ing-btn">+ Ajouter</button>
      </div>
      <div id="mix-ing-list"></div>
      <div id="mix-ing-total" style="font-size:0.84rem;margin-top:4px;">Total ingrédients : 0%</div>

      <div style="margin:18px 0 6px;font-weight:600;font-size:0.92rem;border-top:1px solid var(--border);padding-top:12px;">
        💊 Suppléments — hors calcul %
      </div>
      <p style="font-size:0.77rem;color:var(--text-light);margin-bottom:8px;">
        Les suppléments n'entrent pas dans le calcul des pourcentages d'ingrédients.
      </p>
      <div style="display:flex;gap:8px;margin-bottom:10px;">
        <select id="mix-sup-sel" class="form-control form-control-sm" style="flex:1;">
          <option value="">— Choisir un supplément —</option>
          ${supOpts || '<option disabled>Aucun supplément disponible</option>'}
        </select>
        <button type="button" class="btn btn-secondary btn-sm" id="mix-add-sup-btn">+ Ajouter</button>
      </div>
      <div id="mix-sup-list"></div>

      <div class="modal-footer" style="padding:0;margin-top:18px;">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Annuler</button>
        <button type="submit" class="btn btn-primary">${mixId ? 'Enregistrer' : 'Créer le mélange'}</button>
      </div>
    </form>`;

  _ingRenderList();
  _supRenderList();

  document.getElementById('mix-add-ing-btn').addEventListener('click', () => {
    const sel = document.getElementById('mix-ing-sel');
    const opt = sel.options[sel.selectedIndex];
    if (!opt.value) return;
    _ingAddItem(opt.value, opt.dataset.name);
    sel.value = '';
  });

  document.getElementById('mix-add-sup-btn').addEventListener('click', () => {
    const sel = document.getElementById('mix-sup-sel');
    const opt = sel.options[sel.selectedIndex];
    if (!opt.value) return;
    _supAddItem(opt.value, opt.dataset.name);
    sel.value = '';
  });

  document.getElementById('form-mix').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = parseFormData(e.target, [], ['name']);

    if (_ingState.items.length > 0) {
      const total = _ingState.items.reduce((s, i) => s + i.pct, 0);
      if (Math.abs(total - 100) > 0.5) {
        showToast(`Total ingrédients doit être 100% (actuellement ${total.toFixed(2)}%)`, 'warning');
        return;
      }
    }

    const comp = [
      ..._ingState.items.map(i => ({ id: i.id, type: 'ingredient', name: i.name, pct: i.pct })),
      ..._supState.items.map(s => ({ id: s.id, type: 'supplement', name: s.name, quantity: s.quantity, unit: s.unit }))
    ];
    data.composition = comp.length > 0 ? JSON.stringify(comp) : null;

    const btn = e.target.querySelector('[type=submit]');
    btn.disabled = true;
    btn.innerHTML = '<span class="loader-inline"></span>';
    try {
      if (mixId) { await SportAPI.updateMix(mixId, data); showToast('Mélange modifié !', 'success'); }
      else        { await SportAPI.createMix(data);        showToast('Mélange créé !',    'success'); }
      closeModal();
      loadMixesTab();
    } catch (err) {
      showToast(err.message, 'error');
      btn.disabled = false;
      btn.textContent = mixId ? 'Enregistrer' : 'Créer le mélange';
    }
  });
}

/* ============================================================
   ONGLET INGRÉDIENTS
   ============================================================ */

async function loadIngredientsTab() {
  const el = document.getElementById('tab-ingredients');
  if (!el) return;
  try {
    const ingredients = await SportAPI.getIngredients();
    const list = Array.isArray(ingredients) ? ingredients : (ingredients.items || []);

    el.innerHTML = `
      <div style="display:flex;justify-content:flex-end;margin-bottom:14px;">
        <button class="btn btn-primary btn-sm" onclick="openIngredientModal()">+ Ajouter un ingrédient</button>
      </div>
      ${list.length === 0
        ? `<div class="empty-state"><div class="empty-icon">🌾</div><h3>Aucun ingrédient</h3><p>Ajoutez vos premiers ingrédients nutritionnels.</p></div>`
        : `<table class="table-modern">
            <thead><tr><th>Nom</th><th>Catégorie</th><th>Protéines</th><th>Lipides</th><th>Glucides</th><th>Énergie (kcal)</th><th>Notes</th></tr></thead>
            <tbody>
              ${list.map(ing => `
                <tr>
                  <td><strong>${ing.name || '—'}</strong></td>
                  <td>${ing.category ? `<span class="badge badge-info">${ing.category}</span>` : '—'}</td>
                  <td>${renderMiniBar(ing.protein_pct,'#2980B9')} ${ing.protein_pct!=null?ing.protein_pct+'%':'—'}</td>
                  <td>${renderMiniBar(ing.fat_pct,'#E67E22')} ${ing.fat_pct!=null?ing.fat_pct+'%':'—'}</td>
                  <td>${renderMiniBar(ing.carb_pct,'#27AE60')} ${ing.carb_pct!=null?ing.carb_pct+'%':'—'}</td>
                  <td>${ing.energy_kcal!=null?ing.energy_kcal+' kcal':'—'}</td>
                  <td style="font-size:0.78rem;color:var(--text-light);">${ing.notes||''}</td>
                </tr>`).join('')}
            </tbody>
          </table>`}`;
  } catch (err) {
    el.innerHTML = `<p style="color:var(--danger);">Erreur : ${err.message}</p>`;
    showToast(err.message, 'error');
  }
}

function renderMiniBar(value, color) {
  if (value == null) return '';
  const pct = Math.min(100, Math.max(0, value));
  return `<span style="display:inline-block;width:${Math.round(pct*0.5)}px;height:6px;background:${color};border-radius:3px;vertical-align:middle;margin-right:4px;"></span>`;
}

function openIngredientModal() {
  const overlay = document.getElementById('modal-overlay');
  document.getElementById('modal-title').textContent = '+ Nouvel ingrédient';
  document.getElementById('modal').className = 'modal';
  document.getElementById('modal-body').innerHTML = `
    <form id="form-ingredient">
      <div class="form-group">
        <label class="form-label">Nom *</label>
        <input type="text" class="form-control" name="name" required placeholder="ex: Blé, Maïs, Avoine...">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Catégorie</label>
          <select class="form-control" name="category">
            <option value="">—</option>
            <option value="energie">Énergie</option>
            <option value="depuratif">Dépuratif</option>
            <option value="sport">Sport</option>
            <option value="proteine">Protéine</option>
            <option value="graisse">Graisse</option>
            <option value="motivation">Motivation</option>
            <option value="pre_concours">Pré-concours</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Énergie (kcal/100g)</label>
          <input type="number" class="form-control" name="energy_kcal" step="1" min="0" placeholder="ex: 350">
        </div>
      </div>
      <div class="form-row-3">
        <div class="form-group"><label class="form-label">Protéines (%)</label><input type="number" class="form-control" name="protein_pct" step="0.1" min="0" max="100"></div>
        <div class="form-group"><label class="form-label">Lipides (%)</label><input type="number" class="form-control" name="fat_pct" step="0.1" min="0" max="100"></div>
        <div class="form-group"><label class="form-label">Glucides (%)</label><input type="number" class="form-control" name="carb_pct" step="0.1" min="0" max="100"></div>
      </div>
      <div class="form-group">
        <label class="form-label">Notes</label>
        <textarea class="form-control" name="notes" rows="2" placeholder="Observations, source..."></textarea>
      </div>
      <div class="modal-footer" style="padding:0;margin-top:16px;">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Annuler</button>
        <button type="submit" class="btn btn-primary">Enregistrer</button>
      </div>
    </form>`;
  overlay.style.display = 'flex';
  document.getElementById('modal-close').onclick = closeModal;
  overlay.onclick = (e) => { if (e.target === overlay) closeModal(); };

  document.getElementById('form-ingredient').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = parseFormData(e.target, ['energy_kcal','protein_pct','fat_pct','carb_pct'], ['name']);
    const btn = e.target.querySelector('[type=submit]');
    btn.disabled = true; btn.innerHTML = '<span class="loader-inline"></span>';
    try {
      await SportAPI.createIngredient(data);
      showToast('Ingrédient ajouté !', 'success');
      closeModal(); loadIngredientsTab();
    } catch (err) { showToast(err.message,'error'); btn.disabled=false; btn.textContent='Enregistrer'; }
  });
}

/* ============================================================
   ONGLET SUPPLÉMENTS
   ============================================================ */

async function loadSupplementsTab() {
  const el = document.getElementById('tab-supplements');
  if (!el) return;
  try {
    const supplements = await SportAPI.getSupplements();
    const list = Array.isArray(supplements) ? supplements : (supplements.items || []);

    el.innerHTML = `
      <div style="display:flex;justify-content:flex-end;margin-bottom:14px;">
        <button class="btn btn-primary btn-sm" onclick="openSupplementModal()">+ Ajouter un supplément</button>
      </div>
      ${list.length === 0
        ? `<div class="empty-state"><div class="empty-icon">💊</div><h3>Aucun supplément</h3><p>Gérez vos vitamines et suppléments.</p></div>`
        : `<table class="table-modern">
            <thead><tr><th>Nom</th><th>Type</th><th>Dosage</th><th>Description</th></tr></thead>
            <tbody>
              ${list.map(s => `
                <tr>
                  <td><strong>${s.name||'—'}</strong></td>
                  <td>${s.type?`<span class="badge badge-purple">${s.type}</span>`:'—'}</td>
                  <td>${s.dosage||'—'}</td>
                  <td style="font-size:0.78rem;color:var(--text-light);">${s.description||''}</td>
                </tr>`).join('')}
            </tbody>
          </table>`}`;
  } catch (err) {
    el.innerHTML = `<p style="color:var(--danger);">Erreur : ${err.message}</p>`;
    showToast(err.message, 'error');
  }
}

function openSupplementModal() {
  const overlay = document.getElementById('modal-overlay');
  document.getElementById('modal-title').textContent = '+ Nouveau supplément';
  document.getElementById('modal').className = 'modal';
  document.getElementById('modal-body').innerHTML = `
    <form id="form-supplement">
      <div class="form-group">
        <label class="form-label">Nom *</label>
        <input type="text" class="form-control" name="name" required placeholder="ex: Électrolytes, Vitamine B12...">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Type</label>
          <select class="form-control" name="type">
            <option value="">—</option>
            <option value="electrolyte">Électrolyte</option>
            <option value="vitamine">Vitamine</option>
            <option value="probiotique">Probiotique</option>
            <option value="autre">Autre</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Dosage recommandé</label>
          <input type="text" class="form-control" name="dosage" placeholder="ex: 2g/kg">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Description / précautions</label>
        <textarea class="form-control" name="description" rows="2" placeholder="Contre-indications, conditions..."></textarea>
      </div>
      <div class="modal-footer" style="padding:0;margin-top:16px;">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Annuler</button>
        <button type="submit" class="btn btn-primary">Enregistrer</button>
      </div>
    </form>`;
  overlay.style.display = 'flex';
  document.getElementById('modal-close').onclick = closeModal;
  overlay.onclick = (e) => { if (e.target === overlay) closeModal(); };

  document.getElementById('form-supplement').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = parseFormData(e.target, [], ['name']);
    const btn = e.target.querySelector('[type=submit]');
    btn.disabled = true; btn.innerHTML = '<span class="loader-inline"></span>';
    try {
      await SportAPI.createSupplement(data);
      showToast('Supplément ajouté !', 'success');
      closeModal(); loadSupplementsTab();
    } catch (err) { showToast(err.message,'error'); btn.disabled=false; btn.textContent='Enregistrer'; }
  });
}

/* ============================================================
   ONGLET PLAN ALIMENTAIRE — planning hebdomadaire
   ============================================================ */

const _DAY_NAMES  = ['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'];
const _DAY_LABELS = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];
let _planDays = [[], [], [], [], [], [], []];
// _planDays[i] = [{id:int, name:str}]

async function _loadPlansTab() {
  const el = document.getElementById('tab-plans');
  if (!el) return;
  try {
    const [plans, mixes] = await Promise.all([
      SportAPI.getPlans(),
      SportAPI.getMixes().catch(() => []),
    ]);
    const list    = Array.isArray(plans) ? plans : (plans.items || []);
    const mixMap  = Object.fromEntries((Array.isArray(mixes) ? mixes : []).map(m => [m.id, m]));

    const month = new Date().getMonth() + 1;
    const summerAlert = (month >= 6 && month <= 8)
      ? `<div class="alert-card warning" style="margin-bottom:14px;"><span class="alert-icon">☀️</span><div class="alert-content"><div class="alert-title">Période estivale</div><div class="alert-text">Augmentez l'apport en électrolytes et l'hydratation.</div></div></div>`
      : '';

    el.innerHTML = summerAlert + `
      <div style="display:flex;justify-content:flex-end;margin-bottom:14px;">
        <button class="btn btn-primary btn-sm" onclick="openPlanModal()">+ Nouveau plan</button>
      </div>` +
      (list.length === 0
        ? `<div class="empty-state"><div class="empty-icon">📋</div><h3>Aucun plan</h3><p>Créez votre premier plan alimentaire hebdomadaire.</p></div>`
        : `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:14px;">
            ${list.map(p => {
              const weekRows = _DAY_NAMES.map((day, i) => {
                let mixIds = [];
                try { if (p[day]) mixIds = JSON.parse(p[day]); } catch {}
                const names = mixIds.map(id => mixMap[id]?.name || `Mél.#${id}`);
                return names.length
                  ? `<tr><td style="font-size:0.78rem;font-weight:600;padding:2px 6px;white-space:nowrap;">${_DAY_LABELS[i]}</td><td style="font-size:0.77rem;padding:2px 6px;">${names.join(', ')}</td></tr>`
                  : '';
              }).filter(Boolean).join('');
              return `
              <div class="card" style="padding:16px;">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
                  <div>
                    <div style="font-weight:600;">${p.name||'—'}</div>
                    ${p.goal ? `<span class="badge badge-success" style="margin-top:4px;font-size:0.72rem;">${p.goal}</span>` : ''}
                  </div>
                  <button class="btn btn-sm btn-icon" onclick="deletePlan(${p.id})" title="Supprimer">🗑️</button>
                </div>
                ${p.description ? `<p style="font-size:0.8rem;color:var(--text-light);margin-bottom:6px;">${p.description}</p>` : ''}
                ${weekRows
                  ? `<table style="width:100%;border-collapse:collapse;margin-top:6px;">${weekRows}</table>`
                  : '<div style="font-size:0.75rem;color:var(--text-light);">Aucun mélange planifié</div>'}
              </div>`;
            }).join('')}
          </div>`);
  } catch (err) {
    el.innerHTML = `<p style="color:var(--danger);">Erreur : ${err.message}</p>`;
    showToast(err.message, 'error');
  }
}

async function deletePlan(planId) {
  if (!confirm('Supprimer ce plan alimentaire ? Cette action est irréversible.')) return;
  try {
    await SportAPI.deletePlan(planId);
    showToast('Plan supprimé.', 'success');
    _loadPlansTab();
  } catch (err) { showToast(err.message, 'error'); }
}

async function openPlanModal() {
  const overlay = document.getElementById('modal-overlay');
  document.getElementById('modal-title').textContent = '+ Nouveau plan alimentaire';
  document.getElementById('modal').className = 'modal';
  document.getElementById('modal-body').innerHTML = '<div class="loader-spinner"></div>';
  overlay.style.display = 'flex';
  document.getElementById('modal-close').onclick = closeModal;
  overlay.onclick = (e) => { if (e.target === overlay) closeModal(); };

  const mixes   = await SportAPI.getMixes().catch(() => []);
  const mixList = Array.isArray(mixes) ? mixes : [];

  _planDays = [[], [], [], [], [], [], []];

  const mixOpts = mixList.length
    ? mixList.map(m => `<option value="${m.id}" data-name="${m.name}">${m.name}</option>`).join('')
    : '<option value="" disabled>Aucun mélange disponible</option>';

  document.getElementById('modal-body').innerHTML = `
    <form id="form-plan">
      <div class="form-row">
        <div class="form-group" style="flex:2;">
          <label class="form-label">Nom du plan *</label>
          <input type="text" class="form-control" name="name" required placeholder="ex: Plan pré-saison 2026">
        </div>
        <div class="form-group">
          <label class="form-label">Objectif</label>
          <select class="form-control" name="goal">
            <option value="">—</option>
            <option value="récupération">Récupération</option>
            <option value="entraînement">Entraînement</option>
            <option value="pré-concours">Pré-concours</option>
            <option value="dépuratif">Dépuratif</option>
            <option value="énergie">Énergie</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <textarea class="form-control" name="description" rows="2" placeholder="Instructions générales..."></textarea>
      </div>

      <div style="margin:16px 0 8px;font-weight:600;font-size:0.92rem;border-top:1px solid var(--border);padding-top:12px;">
        📅 Mélanges par jour de la semaine
      </div>
      <p style="font-size:0.77rem;color:var(--text-light);margin-bottom:12px;">
        Pour chaque jour, ajoutez un ou plusieurs mélanges à distribuer. Aucun mélange = jeûne / eau seule.
      </p>

      <div id="plan-days-form">
        ${_DAY_LABELS.map((label, idx) => `
          <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:8px;padding:8px;background:var(--bg-secondary);border-radius:8px;">
            <div style="min-width:78px;font-weight:600;font-size:0.88rem;padding-top:6px;">${label}</div>
            <div style="flex:1;">
              <div id="plan-day-tags-${idx}" style="display:flex;flex-wrap:wrap;gap:4px;min-height:26px;margin-bottom:5px;"></div>
              <div style="display:flex;gap:6px;">
                <select class="form-control form-control-sm plan-day-sel" data-day="${idx}" style="flex:1;">
                  <option value="">— Ajouter un mélange —</option>
                  ${mixOpts}
                </select>
                <button type="button" class="btn btn-secondary btn-sm plan-day-add" data-day="${idx}">+</button>
              </div>
            </div>
          </div>`).join('')}
      </div>

      <div id="plan-week-summary" style="margin-top:10px;"></div>

      <div class="modal-footer" style="padding:0;margin-top:18px;">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Annuler</button>
        <button type="submit" class="btn btn-primary">Créer le plan</button>
      </div>
    </form>`;

  _DAY_LABELS.forEach((_, idx) => _planRenderDayTags(idx));

  document.querySelectorAll('.plan-day-add').forEach(btn => {
    btn.addEventListener('click', () => {
      const day = parseInt(btn.dataset.day);
      const sel = document.querySelector(`.plan-day-sel[data-day="${day}"]`);
      const opt = sel.options[sel.selectedIndex];
      if (!opt.value) return;
      const id = parseInt(opt.value), name = opt.dataset.name;
      if (!_planDays[day].find(m => m.id === id)) {
        _planDays[day].push({ id, name });
        _planRenderDayTags(day);
        _planRenderSummary();
      }
      sel.value = '';
    });
  });

  document.getElementById('form-plan').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = parseFormData(e.target, [], ['name']);
    _DAY_NAMES.forEach((day, i) => {
      const ids = _planDays[i].map(m => m.id);
      data[day] = ids.length > 0 ? JSON.stringify(ids) : null;
    });
    const submitBtn = e.target.querySelector('[type=submit]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="loader-inline"></span>';
    try {
      await SportAPI.createPlan(data);
      showToast('Plan alimentaire créé !', 'success');
      closeModal(); _loadPlansTab();
    } catch (err) {
      showToast(err.message, 'error');
      submitBtn.disabled = false; submitBtn.textContent = 'Créer le plan';
    }
  });
}

function _planRenderDayTags(dayIdx) {
  const container = document.getElementById(`plan-day-tags-${dayIdx}`);
  if (!container) return;
  if (_planDays[dayIdx].length === 0) {
    container.innerHTML = '<span style="font-size:0.77rem;color:var(--text-light);font-style:italic;">Aucun mélange — jeûne / eau</span>';
    return;
  }
  container.innerHTML = _planDays[dayIdx].map((m, i) =>
    `<span style="background:var(--primary);color:#fff;border-radius:12px;padding:2px 8px;font-size:0.78rem;display:inline-flex;align-items:center;gap:4px;">
      🔀 ${m.name}
      <button type="button" onclick="_planRemoveDayMix(${dayIdx},${i})"
        style="background:none;border:none;color:#fff;cursor:pointer;padding:0;font-size:0.75rem;line-height:1;">✕</button>
    </span>`
  ).join('');
}

function _planRemoveDayMix(dayIdx, mixIdx) {
  _planDays[dayIdx].splice(mixIdx, 1);
  _planRenderDayTags(dayIdx);
  _planRenderSummary();
}

function _planRenderSummary() {
  const el = document.getElementById('plan-week-summary');
  if (!el) return;
  if (!_planDays.some(d => d.length > 0)) { el.innerHTML = ''; return; }
  el.innerHTML = `
    <div style="font-size:0.85rem;font-weight:600;margin-bottom:6px;">📊 Résumé hebdomadaire :</div>
    <table style="width:100%;font-size:0.78rem;border-collapse:collapse;">
      <tbody>
        ${_DAY_LABELS.map((label, i) => `
          <tr>
            <td style="font-weight:600;padding:3px 8px;white-space:nowrap;">${label}</td>
            <td style="padding:3px 8px;">${_planDays[i].length
              ? _planDays[i].map(m => `<span class="badge badge-info" style="font-size:0.72rem;">${m.name}</span>`).join(' ')
              : '<span style="color:var(--text-light);font-style:italic;">—</span>'}</td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

/* ——— Stub : l'ancien nav "Plans alimentaires" redirige vers Nutrition ——— */
function loadNutritionPlans() {
  if (typeof showPage === 'function') showPage('nutrition');
}

/* ============================================================
   CALENDRIER HEBDOMADAIRE — NE PAS MODIFIER
   ============================================================ */

let _calWeekStart = _getWeekMonday(0);
let _calAssignments = [];

function _getWeekMonday(offsetWeeks) {
  const d = new Date();
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff + offsetWeeks * 7);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function _shiftWeek(dateStr, offsetWeeks) {
  const [y, mo, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, mo - 1, d);
  dt.setDate(dt.getDate() + offsetWeeks * 7);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

function _weekLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const end = new Date(d);
  end.setDate(d.getDate() + 6);
  return `Semaine du ${d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })} au ${end.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' })}`;
}

async function _loadCalendarTab() {
  const el = document.getElementById('tab-calendar');
  if (!el) return;

  try {
    const plans = await SportAPI.getPlans().catch(() => []);
    const planList = Array.isArray(plans) ? plans : [];
    const planOpts = planList.map(p => `<option value="${p.id}">${p.name}</option>`).join('');

    el.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;flex-wrap:wrap;">
        <button class="btn btn-secondary btn-sm" id="cal-prev-week">← Préc.</button>
        <span id="cal-week-label" style="font-weight:600;font-size:0.88rem;flex:1;"></span>
        <button class="btn btn-secondary btn-sm" id="cal-next-week">Suiv. →</button>
      </div>

      <div style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;margin-bottom:14px;">
        <div class="form-group" style="margin:0;">
          <label class="form-label" style="font-size:0.8rem;">Appliquer à</label>
          <select class="form-control form-control-sm" id="cal-target-type" style="width:auto;">
            <option value="group-tous">Tous les pigeons</option>
            <option value="group-actif">Groupe : Actifs</option>
            <option value="group-concours">Groupe : Concours</option>
            <option value="group-reproducteur">Groupe : Reproducteurs</option>
            <option value="pigeon">Pigeon spécifique…</option>
          </select>
        </div>
        <div class="form-group" id="cal-pigeon-wrap" style="margin:0;display:none;">
          <label class="form-label" style="font-size:0.8rem;">Pigeon</label>
          <select class="form-control form-control-sm" id="cal-pigeon-select" style="width:200px;">
            <option value="">Choisir…</option>
          </select>
        </div>
        <button class="btn btn-secondary btn-sm" id="cal-load-btn">Charger</button>
      </div>

      <div id="cal-grid">
        ${_renderCalGrid([], planOpts)}
      </div>

      <div style="margin:14px 0;display:flex;gap:10px;">
        <button class="btn btn-primary" id="cal-save-btn">💾 Enregistrer le planning</button>
      </div>

      <div style="border-top:1px solid var(--border);padding-top:16px;margin-top:8px;">
        <div style="font-weight:600;margin-bottom:10px;font-size:0.9rem;">🔍 Planning résolu pour un pigeon</div>
        <p style="font-size:0.78rem;color:var(--text-light);margin-bottom:10px;">Affiche le planning effectif du pigeon en appliquant la règle de priorité : plan individuel &gt; plan de groupe.</p>
        <div style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;margin-bottom:10px;">
          <div class="form-group" style="margin:0;">
            <label class="form-label" style="font-size:0.8rem;">Pigeon</label>
            <select class="form-control form-control-sm" id="cal-resolved-pigeon" style="width:200px;">
              <option value="">Choisir…</option>
            </select>
          </div>
          <button class="btn btn-secondary btn-sm" id="cal-resolved-load">Voir planning</button>
        </div>
        <div id="cal-resolved-result"></div>
      </div>
    `;

    document.getElementById('cal-week-label').textContent = _weekLabel(_calWeekStart);

    document.getElementById('cal-prev-week').addEventListener('click', async () => {
      _calWeekStart = _shiftWeek(_calWeekStart, -1);
      document.getElementById('cal-week-label').textContent = _weekLabel(_calWeekStart);
      await _calLoad(planOpts);
    });
    document.getElementById('cal-next-week').addEventListener('click', async () => {
      _calWeekStart = _shiftWeek(_calWeekStart, 1);
      document.getElementById('cal-week-label').textContent = _weekLabel(_calWeekStart);
      await _calLoad(planOpts);
    });

    document.getElementById('cal-target-type').addEventListener('change', async (e) => {
      const wrap = document.getElementById('cal-pigeon-wrap');
      if (e.target.value === 'pigeon') {
        wrap.style.display = '';
        const sel = document.getElementById('cal-pigeon-select');
        if (sel.options.length <= 1) {
          const pigeons = await getPigeonsCache();
          pigeons.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = `${p.matricule}${p.nom ? ' — ' + p.nom : ''}`;
            sel.appendChild(opt);
          });
        }
      } else {
        wrap.style.display = 'none';
      }
    });

    document.getElementById('cal-load-btn').addEventListener('click', () => _calLoad(planOpts));
    document.getElementById('cal-save-btn').addEventListener('click', _calSave);

    const pigeons = await getPigeonsCache();
    const resolvedSel = document.getElementById('cal-resolved-pigeon');
    pigeons.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `${p.matricule}${p.nom ? ' — ' + p.nom : ''}`;
      resolvedSel.appendChild(opt);
    });
    document.getElementById('cal-resolved-load').addEventListener('click', async () => {
      const pid = document.getElementById('cal-resolved-pigeon').value;
      if (!pid) { showToast('Sélectionnez un pigeon', 'warning'); return; }
      try {
        const resolved = await SportAPI.getResolvedCalendar(_calWeekStart, pid);
        document.getElementById('cal-resolved-result').innerHTML = _renderResolvedCalendar(resolved);
      } catch (err) { showToast(err.message, 'error'); }
    });

    await _calLoad(planOpts);

  } catch (err) {
    el.innerHTML = `<p style="color:var(--danger);">Erreur : ${err.message}</p>`;
    showToast(err.message, 'error');
  }
}

function _renderCalGrid(assignments, planOpts) {
  const days = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];
  return `
    <table class="table-modern" style="width:100%;">
      <thead><tr><th style="width:100px;">Jour</th><th>Plan alimentaire</th><th style="width:120px;">Source</th></tr></thead>
      <tbody>
        ${days.map((day, idx) => {
          const a = assignments.find(x => x.day_of_week === idx);
          const source = a ? (a.pigeon_id ? '👤 Individuel' : '👥 Groupe') : '';
          return `
            <tr>
              <td style="font-weight:600;">${day}</td>
              <td>
                <select class="form-control form-control-sm cal-day-plan" data-day="${idx}" data-existing-id="${a?.id || ''}">
                  <option value="">— Aucun plan —</option>
                  ${planOpts}
                </select>
              </td>
              <td style="font-size:0.8rem;color:var(--text-light);">${source}</td>
            </tr>`;
        }).join('')}
      </tbody>
    </table>`;
}

async function _calLoad(planOpts) {
  const targetType = document.getElementById('cal-target-type')?.value;
  let pigeonId = null, groupName = null;
  if (targetType === 'pigeon') {
    pigeonId = document.getElementById('cal-pigeon-select')?.value;
    if (!pigeonId) return;
  } else {
    groupName = targetType.replace('group-', '');
  }

  try {
    _calAssignments = await SportAPI.getCalendar(_calWeekStart, pigeonId, groupName);
    if (!Array.isArray(_calAssignments)) _calAssignments = [];

    const plans = await SportAPI.getPlans().catch(() => []);
    const planList = Array.isArray(plans) ? plans : [];
    const opts = planList.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
    document.getElementById('cal-grid').innerHTML = _renderCalGrid(_calAssignments, opts);

    _calAssignments.forEach(a => {
      const sel = document.querySelector(`.cal-day-plan[data-day="${a.day_of_week}"]`);
      if (sel) { sel.value = a.plan_id; sel.dataset.existingId = a.id; }
    });
  } catch (err) { showToast(err.message, 'error'); }
}

async function _calSave() {
  const targetType = document.getElementById('cal-target-type')?.value;
  let pigeonId = null, groupName = null;
  if (targetType === 'pigeon') {
    pigeonId = document.getElementById('cal-pigeon-select')?.value;
    if (!pigeonId) { showToast('Sélectionnez un pigeon', 'warning'); return; }
  } else {
    groupName = targetType.replace('group-', '');
  }

  const saveBtn = document.getElementById('cal-save-btn');
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<span class="loader-inline"></span> Enregistrement...';

  try {
    const selects = document.querySelectorAll('.cal-day-plan');
    const ops = [];
    for (const sel of selects) {
      const day        = parseInt(sel.dataset.day);
      const existingId = sel.dataset.existingId ? parseInt(sel.dataset.existingId) : null;
      const planId     = sel.value ? parseInt(sel.value) : null;

      if (planId) {
        if (existingId) {
          ops.push(
            SportAPI.deleteAssignment(existingId).catch(() => {}).then(() =>
              SportAPI.saveAssignment({ plan_id: planId, pigeon_id: pigeonId, group_name: groupName, day_of_week: day, week_start: _calWeekStart })
            )
          );
        } else {
          ops.push(SportAPI.saveAssignment({ plan_id: planId, pigeon_id: pigeonId, group_name: groupName, day_of_week: day, week_start: _calWeekStart }));
        }
      } else if (existingId) {
        ops.push(SportAPI.deleteAssignment(existingId).catch(() => {}));
      }
    }

    await Promise.all(ops);
    showToast('Planning enregistré !', 'success');
    const plans = await SportAPI.getPlans().catch(() => []);
    const opts  = (Array.isArray(plans) ? plans : []).map(p => `<option value="${p.id}">${p.name}</option>`).join('');
    await _calLoad(opts);
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = '💾 Enregistrer le planning';
  }
}

function _renderResolvedCalendar(resolved) {
  const days = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];
  return `
    <table class="table-modern" style="width:100%;">
      <thead><tr><th>Jour</th><th>Plan</th><th>Source</th></tr></thead>
      <tbody>
        ${resolved.days.map(d => `
          <tr>
            <td style="font-weight:600;">${days[d.day_of_week]}</td>
            <td>${d.plan
              ? `<strong>${d.plan.name}</strong>${d.plan.goal ? ` <span class="badge badge-success" style="font-size:0.7rem;">${d.plan.goal}</span>` : ''}`
              : '<span style="color:var(--text-light);">—</span>'}</td>
            <td>${d.source === 'individual'
              ? '<span class="badge badge-info" style="font-size:0.72rem;">👤 Individuel</span>'
              : d.source === 'group'
                ? '<span class="badge badge-secondary" style="font-size:0.72rem;">👥 Groupe</span>'
                : '—'}</td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

/* ——— Utilitaire : parser FormData avec conversion types ——— */
function parseFormData(form, numericFields = [], requiredFields = []) {
  const fd   = new FormData(form);
  const data = {};
  for (const [k, v] of fd.entries()) {
    if (v === '') continue;
    if (numericFields.includes(k)) data[k] = parseFloat(v);
    else data[k] = v;
  }
  return data;
}
