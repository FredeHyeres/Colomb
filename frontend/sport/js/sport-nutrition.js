/* ============================================================
   SPORT-NUTRITION.JS — Nutrition : mélanges, ingrédients, suppléments, plans
   ============================================================ */

/* ——— Page principale : 6 onglets ——— */
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
        <button class="tab-btn" data-tab="affectation">🎯 Affectation</button>
        <button class="tab-btn" data-tab="calendar">📅 Calendrier</button>
      </div>
      <div id="tab-mixes"       class="tab-panel active"><div class="loader-spinner"></div></div>
      <div id="tab-ingredients" class="tab-panel"><div class="loader-spinner"></div></div>
      <div id="tab-supplements" class="tab-panel"><div class="loader-spinner"></div></div>
      <div id="tab-plans"       class="tab-panel"><div class="loader-spinner"></div></div>
      <div id="tab-affectation" class="tab-panel"><div class="loader-spinner"></div></div>
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
  _loadAffectationTab();
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
                let names = [];
                const raw = p[day];
                if (raw) {
                  try {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed)) names = parsed.map(id => mixMap[id]?.name || `Mél.#${id}`);
                    else names = [String(raw).slice(0, 60)];
                  } catch { names = [String(raw).slice(0, 60)]; }
                }
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
                  <div style="display:flex;gap:6px;">
                    <button class="btn btn-sm btn-icon" onclick="openPlanModal(${p.id})" title="Modifier">✏️</button>
                    <button class="btn btn-sm btn-icon" onclick="deletePlan(${p.id})" title="Supprimer">🗑️</button>
                  </div>
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

async function openPlanModal(planId = null) {
  const overlay = document.getElementById('modal-overlay');
  const isEdit = planId != null;
  document.getElementById('modal-title').textContent = isEdit ? '✏️ Modifier le plan alimentaire' : '+ Nouveau plan alimentaire';
  document.getElementById('modal').className = 'modal';
  document.getElementById('modal-body').innerHTML = '<div class="loader-spinner"></div>';
  overlay.style.display = 'flex';
  document.getElementById('modal-close').onclick = closeModal;
  overlay.onclick = (e) => { if (e.target === overlay) closeModal(); };

  const [mixes, existingPlan] = await Promise.all([
    SportAPI.getMixes().catch(() => []),
    isEdit ? SportAPI.getPlan(planId).catch(() => null) : Promise.resolve(null),
  ]);
  const mixList = Array.isArray(mixes) ? mixes : [];
  const mixById = Object.fromEntries(mixList.map(m => [m.id, m]));

  _planDays = [[], [], [], [], [], [], []];

  if (existingPlan) {
    _DAY_NAMES.forEach((day, i) => {
      const raw = existingPlan[day];
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          _planDays[i] = parsed
            .map(id => mixById[id] ? { id, name: mixById[id].name } : null)
            .filter(Boolean);
        }
      } catch { /* texte libre, pas de mélanges */ }
    });
  }

  const mixOpts = mixList.length
    ? mixList.map(m => `<option value="${m.id}" data-name="${m.name}">${m.name}</option>`).join('')
    : '<option value="" disabled>Aucun mélange disponible</option>';

  const goalOpts = ['', 'récupération', 'entraînement', 'pré-concours', 'dépuratif', 'énergie'];
  const goalLabels = { '':'—', 'récupération':'Récupération', 'entraînement':'Entraînement', 'pré-concours':'Pré-concours', 'dépuratif':'Dépuratif', 'énergie':'Énergie' };
  const currentGoal = existingPlan?.goal || '';

  document.getElementById('modal-body').innerHTML = `
    <form id="form-plan">
      <div class="form-row">
        <div class="form-group" style="flex:2;">
          <label class="form-label">Nom du plan *</label>
          <input type="text" class="form-control" name="name" required placeholder="ex: Plan pré-saison 2026"
            value="${existingPlan ? (existingPlan.name || '').replace(/"/g,'&quot;') : ''}">
        </div>
        <div class="form-group">
          <label class="form-label">Objectif</label>
          <select class="form-control" name="goal">
            ${goalOpts.map(v => `<option value="${v}"${v === currentGoal ? ' selected' : ''}>${goalLabels[v]}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <textarea class="form-control" name="description" rows="2" placeholder="Instructions générales...">${existingPlan?.description || ''}</textarea>
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
        <button type="submit" class="btn btn-primary">${isEdit ? 'Enregistrer' : 'Créer le plan'}</button>
      </div>
    </form>`;

  _DAY_LABELS.forEach((_, idx) => _planRenderDayTags(idx));
  _planRenderSummary();

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
      if (isEdit) {
        await SportAPI.updatePlan(planId, data);
        showToast('Plan alimentaire mis à jour !', 'success');
      } else {
        await SportAPI.createPlan(data);
        showToast('Plan alimentaire créé !', 'success');
      }
      closeModal(); _loadPlansTab();
    } catch (err) {
      showToast(err.message, 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = isEdit ? 'Enregistrer' : 'Créer le plan';
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
   ONGLET AFFECTATION
   ============================================================ */

let _affAllPigeons = [];
let _affSelectedIds = new Set();
let _affPlan = null;
let _affPlanMap = {};
let _affMixMap = {};

async function _loadAffectationTab() {
  const el = document.getElementById('tab-affectation');
  if (!el) return;
  try {
    const [allPigeons, plans, mixes, existingAff] = await Promise.all([
      ElevageAPI.getPigeons().catch(() => []),
      SportAPI.getPlans().catch(() => []),
      SportAPI.getMixes().catch(() => []),
      SportAPI.getAffectations({}).catch(() => []),
    ]);
    _affAllPigeons = Array.isArray(allPigeons) ? allPigeons : [];
    const planList = Array.isArray(plans) ? plans : [];
    _affPlanMap = Object.fromEntries(planList.map(p => [p.id, p]));
    _affMixMap  = Object.fromEntries((Array.isArray(mixes) ? mixes : []).map(m => [m.id, m.name]));
    _affSelectedIds = new Set();

    const planOpts = planList.map(p =>
      `<option value="${p.id}">${p.name}${p.goal ? ' — ' + p.goal : ''}</option>`
    ).join('');

    const statuts = [
      { value: 'actif',        label: 'Actif' },
      { value: 'reproducteur', label: 'Reproducteur' },
      { value: 'concours',     label: 'Concours' },
      { value: 'retraite',     label: 'Retraite' },
      { value: 'perdu',        label: 'Perdu' },
      { value: 'decede',       label: 'Décédé' },
    ];

    el.innerHTML = `
      <!-- Section A : Choix des pigeons -->
      <div style="background:var(--bg-secondary);border-radius:10px;padding:16px;margin-bottom:12px;">
        <div style="font-weight:600;font-size:0.92rem;margin-bottom:10px;">Section A — Choix des pigeons</div>
        <div style="display:flex;gap:20px;margin-bottom:12px;">
          <label style="cursor:pointer;display:flex;align-items:center;gap:6px;"><input type="radio" name="aff-mode" value="groupe" checked> Mode Groupe</label>
          <label style="cursor:pointer;display:flex;align-items:center;gap:6px;"><input type="radio" name="aff-mode" value="individuel"> Mode Individuel</label>
        </div>
        <!-- Groupe -->
        <div id="aff-group-section">
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px;">
            ${statuts.map(s => `
              <label style="display:inline-flex;align-items:center;gap:5px;cursor:pointer;padding:4px 12px;background:#fff;border:1px solid var(--border);border-radius:20px;font-size:0.84rem;">
                <input type="checkbox" class="aff-group-cb" value="${s.value}" style="margin:0;">
                ${s.label}
              </label>`).join('')}
          </div>
          <div id="aff-group-count" style="font-size:0.82rem;color:var(--text-light);">0 pigeon sélectionné</div>
        </div>
        <!-- Individuel -->
        <div id="aff-individual-section" style="display:none;">
          <input type="search" id="aff-indiv-search" class="form-control form-control-sm"
            placeholder="Filtrer par bague ou nom..." style="margin-bottom:8px;">
          <div id="aff-indiv-list" style="max-height:220px;overflow-y:auto;border:1px solid var(--border);border-radius:6px;padding:4px;background:#fff;"></div>
          <div id="aff-indiv-count" style="font-size:0.82rem;color:var(--text-light);margin-top:6px;">0 pigeon sélectionné</div>
        </div>
      </div>

      <!-- Section B : Plan -->
      <div style="background:var(--bg-secondary);border-radius:10px;padding:16px;margin-bottom:12px;">
        <div style="font-weight:600;font-size:0.92rem;margin-bottom:10px;">Section B — Plan alimentaire</div>
        <select id="aff-plan-select" class="form-control" style="margin-bottom:10px;">
          <option value="">— Choisir un plan —</option>
          ${planOpts}
        </select>
        <div id="aff-plan-preview"></div>
      </div>

      <!-- Section C : Période -->
      <div style="background:var(--bg-secondary);border-radius:10px;padding:16px;margin-bottom:12px;">
        <div style="font-weight:600;font-size:0.92rem;margin-bottom:10px;">Section C — Période</div>
        <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;">
          <div class="form-group" style="margin:0;">
            <label class="form-label" style="font-size:0.8rem;">Date de début *</label>
            <input type="date" id="aff-date-debut" class="form-control" style="width:160px;">
          </div>
          <div class="form-group" id="aff-date-fin-wrap" style="margin:0;">
            <label class="form-label" style="font-size:0.8rem;">Date de fin</label>
            <input type="date" id="aff-date-fin" class="form-control" style="width:160px;">
          </div>
          <div class="form-group" id="aff-duree-wrap" style="margin:0;">
            <label class="form-label" style="font-size:0.8rem;">Durée (semaines)</label>
            <input type="number" id="aff-duree" class="form-control" min="1" step="1" style="width:110px;" placeholder="ex: 4">
          </div>
          <div class="form-group" style="margin:0;">
            <label class="form-label" style="font-size:0.8rem;">Reconductible</label>
            <div style="display:flex;align-items:center;gap:6px;height:38px;">
              <input type="checkbox" id="aff-reconductible" style="width:16px;height:16px;cursor:pointer;">
              <span style="font-size:0.82rem;color:var(--text-light);">Pas de date de fin</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Section D : Bouton Affecter -->
      <div style="margin-bottom:24px;">
        <button class="btn btn-primary" id="aff-btn-submit">🎯 Affecter →</button>
      </div>

      <!-- Liste des affectations existantes -->
      <div style="border-top:1px solid var(--border);padding-top:16px;">
        <div style="font-weight:600;margin-bottom:10px;font-size:0.92rem;">📋 Affectations enregistrées</div>
        <div id="aff-list">
          ${_renderAffectationsList(Array.isArray(existingAff) ? existingAff : [], _affPlanMap, _affAllPigeons)}
        </div>
      </div>
    `;

    // Mode switch
    document.querySelectorAll('[name="aff-mode"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        const isGroup = e.target.value === 'groupe';
        document.getElementById('aff-group-section').style.display     = isGroup ? '' : 'none';
        document.getElementById('aff-individual-section').style.display = isGroup ? 'none' : '';
        _affSelectedIds.clear();
        if (!isGroup) _affRenderIndivList('');
      });
    });

    // Group checkboxes
    document.querySelectorAll('.aff-group-cb').forEach(cb => {
      cb.addEventListener('change', () => {
        _affSelectedIds.clear();
        document.querySelectorAll('.aff-group-cb:checked').forEach(c => {
          _affAllPigeons.filter(p => (p.statut || '').toLowerCase() === c.value)
            .forEach(p => _affSelectedIds.add(p.id));
        });
        const n = _affSelectedIds.size;
        document.getElementById('aff-group-count').textContent =
          `${n} pigeon${n > 1 ? 's' : ''} sélectionné${n > 1 ? 's' : ''}`;
      });
    });

    // Individual list
    document.getElementById('aff-indiv-search').addEventListener('input', e => _affRenderIndivList(e.target.value));

    // Plan preview
    document.getElementById('aff-plan-select').addEventListener('change', e => {
      const pid = parseInt(e.target.value);
      _affPlan = _affPlanMap[pid] || null;
      _affRenderPlanPreview();
    });

    // Period sync
    document.getElementById('aff-date-debut').addEventListener('change', () => _affSyncPeriod('debut'));
    document.getElementById('aff-date-fin').addEventListener('change',   () => _affSyncPeriod('fin'));
    document.getElementById('aff-duree').addEventListener('change',      () => _affSyncPeriod('duree'));

    // Reconductible toggle
    document.getElementById('aff-reconductible').addEventListener('change', e => {
      const rec = e.target.checked;
      document.getElementById('aff-date-fin-wrap').style.opacity = rec ? '0.4' : '1';
      document.getElementById('aff-duree-wrap').style.opacity    = rec ? '0.4' : '1';
      if (rec) {
        document.getElementById('aff-date-fin').value = '';
        document.getElementById('aff-duree').value    = '';
      }
    });

    // Submit
    document.getElementById('aff-btn-submit').addEventListener('click', _affShowConfirmation);

  } catch (err) {
    el.innerHTML = `<p style="color:var(--danger);">Erreur : ${err.message}</p>`;
    showToast(err.message, 'error');
  }
}

function _affRenderIndivList(filter) {
  const el = document.getElementById('aff-indiv-list');
  if (!el) return;
  const f = (filter || '').toLowerCase().trim();
  const filtered = f
    ? _affAllPigeons.filter(p =>
        (p.matricule || '').toLowerCase().includes(f) ||
        (p.nom || '').toLowerCase().includes(f))
    : _affAllPigeons;

  if (filtered.length === 0) {
    el.innerHTML = '<div style="padding:8px;font-size:0.82rem;color:var(--text-light);">Aucun pigeon trouvé.</div>';
    return;
  }

  el.innerHTML = filtered.map(p => `
    <label style="display:flex;align-items:center;gap:8px;padding:5px 8px;cursor:pointer;border-radius:4px;font-size:0.85rem;">
      <input type="checkbox" class="aff-indiv-cb" value="${p.id}" ${_affSelectedIds.has(p.id) ? 'checked' : ''} style="margin:0;">
      <span>${p.matricule}${p.nom ? ' — ' + p.nom : ''}</span>
      ${p.statut ? `<span class="badge badge-secondary" style="font-size:0.68rem;margin-left:auto;">${p.statut}</span>` : ''}
    </label>`).join('');

  el.querySelectorAll('.aff-indiv-cb').forEach(cb => {
    cb.addEventListener('change', e => {
      if (e.target.checked) _affSelectedIds.add(e.target.value);
      else _affSelectedIds.delete(e.target.value);
      const n = _affSelectedIds.size;
      const cnt = document.getElementById('aff-indiv-count');
      if (cnt) cnt.textContent = `${n} pigeon${n > 1 ? 's' : ''} sélectionné${n > 1 ? 's' : ''}`;
    });
  });
}

function _affRenderPlanPreview() {
  const el = document.getElementById('aff-plan-preview');
  if (!el) return;
  if (!_affPlan) { el.innerHTML = ''; return; }
  const p = _affPlan;
  el.innerHTML = `
    <table style="width:100%;font-size:0.75rem;border-collapse:collapse;margin-top:4px;background:#fff;border-radius:6px;overflow:hidden;border:1px solid var(--border);">
      <thead><tr style="background:var(--bg-secondary);">
        ${_DAY_LABELS.map(d => `<th style="padding:4px 5px;text-align:center;font-size:0.72rem;font-weight:600;">${d.substring(0, 3)}.</th>`).join('')}
      </tr></thead>
      <tbody><tr>
        ${_DAY_NAMES.map(day => {
          let names = [];
          try { if (p[day]) names = JSON.parse(p[day]).map(id => _affMixMap[id] || `Mél.#${id}`); } catch {}
          return `<td style="padding:4px 5px;text-align:center;vertical-align:top;">
            ${names.length
              ? names.map(n => `<div style="background:var(--bg-secondary);border-radius:3px;padding:1px 4px;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:80px;">${n}</div>`).join('')
              : '<span style="color:var(--text-light);">—</span>'}
          </td>`;
        }).join('')}
      </tr></tbody>
    </table>`;
}

function _affSyncPeriod(changed) {
  const debut = document.getElementById('aff-date-debut');
  const fin   = document.getElementById('aff-date-fin');
  const duree = document.getElementById('aff-duree');
  const rec   = document.getElementById('aff-reconductible');
  if (rec?.checked) return;

  if ((changed === 'debut' || changed === 'fin') && debut.value && fin.value) {
    const diff = Math.round((new Date(fin.value) - new Date(debut.value)) / (7 * 86400000));
    if (diff > 0) duree.value = diff;
  } else if (changed === 'duree' && debut.value && duree.value) {
    const d = new Date(debut.value);
    d.setDate(d.getDate() + parseInt(duree.value) * 7 - 1);
    fin.value = d.toISOString().split('T')[0];
  }
}

async function _affShowConfirmation() {
  const pigeonIds  = Array.from(_affSelectedIds);
  if (pigeonIds.length === 0) { showToast('Sélectionnez au moins un pigeon', 'warning'); return; }

  const planId = document.getElementById('aff-plan-select').value;
  if (!planId) { showToast('Sélectionnez un plan alimentaire', 'warning'); return; }

  const dateDebut = document.getElementById('aff-date-debut').value;
  if (!dateDebut) { showToast('Sélectionnez une date de début', 'warning'); return; }

  const reconductible = document.getElementById('aff-reconductible').checked;
  const dateFin = reconductible ? null : (document.getElementById('aff-date-fin').value || null);
  const mode = document.querySelector('[name="aff-mode"]:checked')?.value || 'groupe';
  const isIndividual = (mode === 'individuel');
  const groupeVal = !isIndividual
    ? Array.from(document.querySelectorAll('.aff-group-cb:checked')).map(c => c.value).join(',') || null
    : null;

  const plan = _affPlanMap[parseInt(planId)];
  const periodStr = dateFin
    ? `du ${formatDate(dateDebut)} au ${formatDate(dateFin)}`
    : `à partir du ${formatDate(dateDebut)} (reconductible)`;

  // Vérifier conflits si mode groupe
  let conflictingIds = new Set();
  if (!isIndividual) {
    try {
      const allIndiv = await SportAPI.getAffectations({ is_individual: true });
      const end = dateFin ? new Date(dateFin) : new Date('9999-12-31');
      const start = new Date(dateDebut);
      (Array.isArray(allIndiv) ? allIndiv : []).forEach(a => {
        if (!pigeonIds.includes(a.pigeon_id)) return;
        const aStart = new Date(a.date_debut);
        const aEnd   = a.date_fin ? new Date(a.date_fin) : new Date('9999-12-31');
        if (aStart <= end && aEnd >= start) conflictingIds.add(a.pigeon_id);
      });
    } catch {}
  }

  const eligibleCount = pigeonIds.length - conflictingIds.size;
  const pigeonsHtml = pigeonIds.map(pid => {
    const p = _affAllPigeons.find(x => x.id === pid);
    const label = p ? `${p.matricule}${p.nom ? ' — ' + p.nom : ''}` : pid;
    const conflict = conflictingIds.has(pid);
    return `<div style="font-size:0.82rem;padding:2px 0;${conflict ? 'color:var(--warning);' : ''}">
      ${conflict ? '⚠️ ' : ''}<span>${label}</span>${conflict ? ' <em style="font-size:0.76rem;">(ignoré)</em>' : ''}
    </div>`;
  }).join('');

  const overlay = document.getElementById('modal-overlay');
  document.getElementById('modal-title').textContent = '✅ Confirmer l\'affectation';
  document.getElementById('modal').className = 'modal';
  document.getElementById('modal-body').innerHTML = `
    <div style="background:var(--bg-secondary);border-radius:8px;padding:16px;margin-bottom:16px;">
      <div style="margin-bottom:8px;">📋 <strong>Plan :</strong> ${plan ? plan.name : '#' + planId}</div>
      <div style="margin-bottom:8px;">🕊️ <strong>Pigeons :</strong>
        ${eligibleCount} pigeon${eligibleCount > 1 ? 's' : ''} affecté${eligibleCount > 1 ? 's' : ''}
        ${conflictingIds.size > 0
          ? `<span style="color:var(--warning);font-size:0.82rem;"> — ⚠️ ${conflictingIds.size} ignoré${conflictingIds.size > 1 ? 's' : ''} (affectation individuelle prioritaire)</span>`
          : ''}
      </div>
      <div style="margin-bottom:12px;">📅 <strong>Période :</strong> ${periodStr}</div>
      <details style="font-size:0.82rem;">
        <summary style="cursor:pointer;color:var(--text-light);user-select:none;">Détail des pigeons (${pigeonIds.length})</summary>
        <div style="margin-top:6px;max-height:160px;overflow-y:auto;">${pigeonsHtml}</div>
      </details>
    </div>
    <div class="modal-footer" style="padding:0;">
      <button type="button" class="btn btn-secondary" onclick="closeModal()">Annuler</button>
      <button type="button" class="btn btn-primary" id="aff-confirm-btn">Confirmer l'affectation</button>
    </div>
  `;
  overlay.style.display = 'flex';
  document.getElementById('modal-close').onclick = closeModal;
  overlay.onclick = e => { if (e.target === overlay) closeModal(); };

  document.getElementById('aff-confirm-btn').addEventListener('click', async () => {
    const btn = document.getElementById('aff-confirm-btn');
    btn.disabled = true; btn.innerHTML = '<span class="loader-inline"></span>';
    try {
      await SportAPI.createAffectations({
        pigeon_ids:   pigeonIds,
        plan_id:      parseInt(planId),
        date_debut:   dateDebut,
        date_fin:     dateFin,
        is_individual: isIndividual,
        groupe:       groupeVal,
      });
      const n = eligibleCount;
      showToast(`${n} affectation${n > 1 ? 's' : ''} créée${n > 1 ? 's' : ''} !`, 'success');
      closeModal();
      _loadAffectationTab();
    } catch (err) {
      showToast(err.message, 'error');
      btn.disabled = false; btn.textContent = 'Confirmer l\'affectation';
    }
  });
}

function _renderAffectationsList(affList, planMap, pigeonList) {
  if (!affList.length) {
    return '<div style="font-size:0.85rem;color:var(--text-light);">Aucune affectation enregistrée.</div>';
  }
  const pigeonMap = Object.fromEntries(pigeonList.map(p => [p.id, p]));
  return `
    <div style="overflow-x:auto;">
      <table class="table-modern" style="font-size:0.82rem;">
        <thead><tr><th>Pigeon</th><th>Plan</th><th>Début</th><th>Fin</th><th>Type</th><th></th></tr></thead>
        <tbody>
          ${affList.map(a => {
            const pigeon = pigeonMap[a.pigeon_id];
            const plan   = a.plan || planMap[a.plan_id];
            return `
              <tr>
                <td>${pigeon ? pigeon.matricule : a.pigeon_id}</td>
                <td>${plan ? plan.name : 'Plan #' + a.plan_id}</td>
                <td>${formatDate(a.date_debut)}</td>
                <td>${a.date_fin ? formatDate(a.date_fin) : '♾️'}</td>
                <td><span class="badge ${a.is_individual ? 'badge-info' : 'badge-secondary'}" style="font-size:0.72rem;">${a.is_individual ? '👤 Individuel' : '👥 Groupe'}</span></td>
                <td><button class="btn btn-sm btn-icon" onclick="deleteAffectation(${a.id})" title="Supprimer">🗑️</button></td>
              </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
}

async function deleteAffectation(id) {
  if (!confirm('Supprimer cette affectation ?')) return;
  try {
    await SportAPI.deleteAffectation(id);
    showToast('Affectation supprimée.', 'success');
    _loadAffectationTab();
  } catch (err) { showToast(err.message, 'error'); }
}

/* ============================================================
   CALENDRIER HEBDOMADAIRE — nouveau format par pigeon/semaine
   ============================================================ */

let _calNewWeek = _isoWeekOf(new Date());

function _isoWeekOf(d) {
  const dt = new Date(d.getTime());
  const dow = dt.getDay() || 7;
  dt.setDate(dt.getDate() + 4 - dow);
  const yearStart = new Date(dt.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((dt - yearStart) / 86400000 + 1) / 7);
  return `${dt.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function _isoWeekMonday(semaine) {
  const [yearStr, wStr] = semaine.split('-W');
  const year = parseInt(yearStr), week = parseInt(wStr);
  const jan4 = new Date(year, 0, 4);
  const dow4 = jan4.getDay() || 7;
  const startW1 = new Date(jan4.getTime() - (dow4 - 1) * 86400000);
  return new Date(startW1.getTime() + (week - 1) * 7 * 86400000);
}

function _isoWeekShift(semaine, n) {
  const monday = _isoWeekMonday(semaine);
  monday.setDate(monday.getDate() + n * 7);
  return _isoWeekOf(monday);
}

function _isoWeekLabel(semaine) {
  const week = parseInt(semaine.split('-W')[1]);
  const monday = _isoWeekMonday(semaine);
  const sunday = new Date(monday.getTime() + 6 * 86400000);
  const mStr = monday.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  const sStr = sunday.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' });
  return `Semaine ${week} — ${mStr} au ${sStr}`;
}

async function _loadCalendarTab() {
  const el = document.getElementById('tab-calendar');
  if (!el) return;

  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;flex-wrap:wrap;">
      <button class="btn btn-secondary btn-sm" id="cal2-prev">← Préc.</button>
      <span id="cal2-label" style="font-weight:600;font-size:0.88rem;flex:1;text-align:center;"></span>
      <button class="btn btn-secondary btn-sm" id="cal2-today">Aujourd'hui</button>
      <button class="btn btn-secondary btn-sm" id="cal2-next">Suiv. →</button>
    </div>
    <div id="cal2-table"><div class="loader-spinner"></div></div>
  `;

  document.getElementById('cal2-label').textContent = _isoWeekLabel(_calNewWeek);

  document.getElementById('cal2-prev').addEventListener('click', async () => {
    _calNewWeek = _isoWeekShift(_calNewWeek, -1);
    document.getElementById('cal2-label').textContent = _isoWeekLabel(_calNewWeek);
    await _cal2Load();
  });
  document.getElementById('cal2-next').addEventListener('click', async () => {
    _calNewWeek = _isoWeekShift(_calNewWeek, 1);
    document.getElementById('cal2-label').textContent = _isoWeekLabel(_calNewWeek);
    await _cal2Load();
  });
  document.getElementById('cal2-today').addEventListener('click', async () => {
    _calNewWeek = _isoWeekOf(new Date());
    document.getElementById('cal2-label').textContent = _isoWeekLabel(_calNewWeek);
    await _cal2Load();
  });

  await _cal2Load();
}

async function _cal2Load() {
  const el = document.getElementById('cal2-table');
  if (!el) return;
  el.innerHTML = '<div class="loader-spinner"></div>';
  try {
    const rows = await SportAPI.getAffectationsCalendrier(_calNewWeek);
    el.innerHTML = _cal2RenderTable(Array.isArray(rows) ? rows : []);
  } catch (err) {
    el.innerHTML = `<p style="color:var(--danger);">Erreur : ${err.message}</p>`;
    showToast(err.message, 'error');
  }
}

function _cal2RenderTable(rows) {
  const dayKeys   = ['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'];
  const dayLabels = ['Lun.','Mar.','Mer.','Jeu.','Ven.','Sam.','Dim.'];

  if (rows.length === 0) {
    return `<div class="empty-state">
      <div class="empty-icon">📅</div>
      <h3>Aucune affectation cette semaine</h3>
      <p>Créez des affectations dans l'onglet <strong>🎯 Affectation</strong> pour les voir ici.</p>
    </div>`;
  }

  return `
    <div style="overflow-x:auto;">
      <table class="table-modern" style="min-width:680px;width:100%;">
        <thead>
          <tr>
            <th style="min-width:130px;position:sticky;left:0;background:var(--bg-secondary);">Pigeon</th>
            ${dayLabels.map(d => `<th style="text-align:center;min-width:80px;">${d}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${rows.map(row => `
            <tr>
              <td style="font-weight:600;font-size:0.88rem;position:sticky;left:0;background:#fff;">
                ${row.bague}
                ${row.nom ? `<br><span style="font-weight:400;font-size:0.76rem;color:var(--text-light);">${row.nom}</span>` : ''}
              </td>
              ${dayKeys.map(day => {
                const mixes = row[day] || [];
                return `<td style="font-size:0.78rem;text-align:center;vertical-align:top;padding:6px 4px;">
                  ${mixes.length
                    ? mixes.map(m => `<div style="background:var(--primary);color:#fff;border-radius:4px;padding:2px 5px;margin-bottom:2px;white-space:nowrap;font-size:0.72rem;">${m}</div>`).join('')
                    : '<span style="color:var(--text-light);">—</span>'}
                </td>`;
              }).join('')}
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
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
