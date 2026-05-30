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
      if (tabBtn.dataset.tab === 'calendar') _cal2Load();
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
                    <button class="btn btn-sm btn-icon" onclick="duplicateMix(${m.id})" title="Dupliquer">📋</button>
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

async function duplicateMix(mixId) {
  try {
    const src = await SportAPI.getMix(mixId);
    const copy = {
      name:        `${src.name} (copie)`,
      usage:       src.usage       || null,
      description: src.description || null,
      composition: src.composition || null,
    };
    await SportAPI.createMix(copy);
    showToast('Mélange dupliqué !', 'success');
    loadMixesTab();
  } catch (err) { showToast(err.message, 'error'); }
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
// item: { id:"ing_X", name:"...", pct:50.00, locked:false }

let _supState = { items: [] };
// item: { id:"sup_X", name:"...", quantity:"", unit:"g/kg" }

/* ——— Ingrédients ——— */
function _ingAddItem(id, name) {
  if (_ingState.items.find(i => i.id === id)) { showToast('Déjà dans la composition', 'warning'); return; }
  _ingState.items.push({ id, name, pct: 0, locked: false });
  _ingRebalanceEqual();
  _ingRenderList();
}

function _ingToggleLock(idx) {
  const items = _ingState.items;
  if (items[idx].locked) {
    items[idx].locked = false;
  } else {
    const unlocked = items.filter(i => !i.locked).length;
    if (unlocked <= 2) { showToast('Il faut au moins 2 ingrédients déverrouillés pour redistribuer', 'warning'); return; }
    items[idx].locked = true;
  }
  _ingRenderList();
}

function _ingRemoveItem(idx) {
  _ingState.items.splice(idx, 1);
  if (_ingState.items.length > 0) _ingRebalanceEqual();
  _ingRenderList();
}

function _ingRebalanceEqual() {
  const unlocked = _ingState.items.filter(i => !i.locked);
  if (unlocked.length === 0) return;
  const lockedSum = _ingState.items.filter(i => i.locked).reduce((s, i) => s + i.pct, 0);
  const available = parseFloat((100 - lockedSum).toFixed(2));
  const n = unlocked.length;
  const share = parseFloat((available / n).toFixed(2));
  const last  = parseFloat((available - share * (n - 1)).toFixed(2));
  unlocked.forEach((item, i) => { item.pct = i === n - 1 ? last : share; });
}

/* ——— Max dynamique pour un ingrédient (laisse 1% à chaque autre déverrouillé) ——— */
function _ingMaxForItem(idx) {
  const lockedSum = _ingState.items.filter(i => i.locked).reduce((s, i) => s + i.pct, 0);
  const otherUnlocked = _ingState.items.filter((item, i) => i !== idx && !item.locked).length;
  return Math.max(0, parseFloat((100 - lockedSum - otherUnlocked).toFixed(2)));
}

/* ——— Algorithme proportionnel (respecte les verrous + plafond dynamique) ——— */
function _ingApplyChange(idx, rawVal) {
  const maxAllowed = _ingMaxForItem(idx);
  const newPct = Math.min(maxAllowed, Math.max(0, parseFloat(rawVal) || 0));
  const oldPct = _ingState.items[idx].pct;
  const activeOthers = _ingState.items.filter((item, i) => i !== idx && item.pct > 0 && !item.locked);

  _ingState.items[idx].pct = newPct;

  if (activeOthers.length === 0) return;

  if (Math.abs(oldPct - 100) < 0.001) {
    const share = (100 - newPct) / activeOthers.length;
    activeOthers.forEach(o => { o.pct = Math.max(0, share); });
  } else {
    const oldOthersSum = 100 - oldPct;
    const newOthersSum = 100 - newPct;
    if (Math.abs(oldOthersSum) > 0.001) {
      activeOthers.forEach(o => { o.pct = Math.max(0, (o.pct * newOthersSum) / oldOthersSum); });
    }
  }

  _ingState.items.forEach(item => { item.pct = Math.min(100, Math.max(0, item.pct)); });
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
    if (!item.locked) {
      const maxVal = _ingMaxForItem(idx);
      if (slider) { slider.max = maxVal; slider.value = item.pct; }
      if (input)  { input.max  = maxVal; input.value  = item.pct; }
    } else {
      if (slider) slider.value = item.pct;
      if (input)  input.value  = item.pct;
    }
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

  const unlockedCount = _ingState.items.filter(i => !i.locked).length;
  el.innerHTML = _ingState.items.map((item, idx) => {
    const canLock    = !item.locked && unlockedCount > 2;
    const lockDisabled = !item.locked && !canLock ? 'disabled title="2 ingrédients déverrouillés minimum"' : '';
    const maxVal     = item.locked ? 100 : _ingMaxForItem(idx);
    return `
    <div class="mix-ing-row" style="display:flex;gap:8px;align-items:center;margin-bottom:8px;flex-wrap:wrap;${item.locked ? 'opacity:0.75;' : ''}">
      <button type="button" class="btn btn-sm btn-icon mix-ing-lock" data-idx="${idx}" ${lockDisabled}
        style="font-size:1rem;padding:2px 5px;${item.locked ? 'color:var(--accent);' : 'color:var(--text-light);'}"
        title="${item.locked ? 'Déverrouiller' : 'Verrouiller'}">${item.locked ? '🔒' : '🔓'}</button>
      <span style="flex:1;font-size:0.88rem;min-width:90px;">🌾 ${item.name}</span>
      <input type="range" min="0" max="${maxVal}" step="0.01" value="${item.pct}"
        class="mix-ing-slider" data-idx="${idx}"
        style="flex:2;min-width:100px;accent-color:var(--accent);" ${item.locked ? 'disabled' : ''}>
      <input type="number" min="0" max="${maxVal}" step="0.01" value="${item.pct}"
        class="form-control mix-ing-input" style="width:80px;" data-idx="${idx}" ${item.locked ? 'disabled' : ''}>
      <span style="font-size:0.8rem;color:var(--text-light);width:14px;">%</span>
      <button type="button" class="btn btn-sm btn-icon mix-ing-remove" data-idx="${idx}">🗑️</button>
    </div>`;
  }).join('');

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
  el.querySelectorAll('.mix-ing-lock').forEach(btn => {
    btn.addEventListener('click', (e) => _ingToggleLock(parseInt(e.target.dataset.idx)));
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
                  <td>${renderMiniBar(ing.proteines_pct,'#2980B9')} ${ing.proteines_pct!=null?ing.proteines_pct+'%':'—'}</td>
                  <td>${renderMiniBar(ing.lipides_pct,'#E67E22')} ${ing.lipides_pct!=null?ing.lipides_pct+'%':'—'}</td>
                  <td>${renderMiniBar(ing.glucides_pct,'#27AE60')} ${ing.glucides_pct!=null?ing.glucides_pct+'%':'—'}</td>
                  <td>${ing.energie_kcal!=null?ing.energie_kcal+' kcal':'—'}</td>
                  <td style="font-size:0.78rem;color:var(--text-light);">${ing.notes_eleveurs||''}</td>
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
          <input type="number" class="form-control" name="energie_kcal" step="1" min="0" placeholder="ex: 350">
        </div>
      </div>
      <div class="form-row-3">
        <div class="form-group"><label class="form-label">Protéines (%)</label><input type="number" class="form-control" name="proteines_pct" step="0.1" min="0" max="100"></div>
        <div class="form-group"><label class="form-label">Lipides (%)</label><input type="number" class="form-control" name="lipides_pct" step="0.1" min="0" max="100"></div>
        <div class="form-group"><label class="form-label">Glucides (%)</label><input type="number" class="form-control" name="glucides_pct" step="0.1" min="0" max="100"></div>
      </div>
      <div class="form-group">
        <label class="form-label">Notes</label>
        <textarea class="form-control" name="notes_eleveurs" rows="2" placeholder="Observations, source..."></textarea>
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
    const data = parseFormData(e.target, ['energie_kcal','proteines_pct','lipides_pct','glucides_pct'], ['name']);
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
// _planDays[i] = [{id:int, name:str, pct:float, locked:bool}]

function _planDayToggleLock(dayIdx, mixIdx) {
  const items = _planDays[dayIdx];
  if (items[mixIdx].locked) {
    items[mixIdx].locked = false;
  } else {
    const unlocked = items.filter(m => !m.locked).length;
    if (unlocked <= 2) { showToast('Il faut au moins 2 mélanges déverrouillés pour redistribuer', 'warning'); return; }
    items[mixIdx].locked = true;
  }
  _planRenderDayList(dayIdx);
}

/* ——— Rééquilibrage égal sur un jour (respecte les verrous) ——— */
function _planDayRebalanceEqual(dayIdx) {
  const unlocked = _planDays[dayIdx].filter(m => !m.locked);
  if (unlocked.length === 0) return;
  const lockedSum = _planDays[dayIdx].filter(m => m.locked).reduce((s, m) => s + m.pct, 0);
  const available = parseFloat((100 - lockedSum).toFixed(2));
  const n = unlocked.length;
  const share = parseFloat((available / n).toFixed(2));
  const last  = parseFloat((available - share * (n - 1)).toFixed(2));
  unlocked.forEach((m, i) => { m.pct = i === n - 1 ? last : share; });
}

/* ——— Max dynamique pour un mélange dans un jour ——— */
function _planDayMaxForMix(dayIdx, mixIdx) {
  const items = _planDays[dayIdx];
  const lockedSum = items.filter(m => m.locked).reduce((s, m) => s + m.pct, 0);
  const otherUnlocked = items.filter((m, i) => i !== mixIdx && !m.locked).length;
  return Math.max(0, parseFloat((100 - lockedSum - otherUnlocked).toFixed(2)));
}

/* ——— Redistribution proportionnelle (respecte les verrous + plafond dynamique) ——— */
function _planDayApplyChange(dayIdx, mixIdx, rawVal) {
  const maxAllowed = _planDayMaxForMix(dayIdx, mixIdx);
  const newPct = Math.min(maxAllowed, Math.max(0, parseFloat(rawVal) || 0));
  const oldPct = _planDays[dayIdx][mixIdx].pct;
  const activeOthers = _planDays[dayIdx].filter((m, i) => i !== mixIdx && m.pct > 0 && !m.locked);

  _planDays[dayIdx][mixIdx].pct = newPct;

  if (activeOthers.length === 0) return;

  if (Math.abs(oldPct - 100) < 0.001) {
    const share = (100 - newPct) / activeOthers.length;
    activeOthers.forEach(o => { o.pct = Math.max(0, share); });
  } else {
    const oldOthersSum = 100 - oldPct;
    const newOthersSum = 100 - newPct;
    if (Math.abs(oldOthersSum) > 0.001) {
      activeOthers.forEach(o => { o.pct = Math.max(0, (o.pct * newOthersSum) / oldOthersSum); });
    }
  }

  _planDays[dayIdx].forEach(m => { m.pct = Math.min(100, Math.max(0, m.pct)); });
  _planDays[dayIdx].forEach(m => { m.pct = parseFloat(m.pct.toFixed(2)); });
  const sum = _planDays[dayIdx].reduce((s, m) => s + m.pct, 0);
  const residual = parseFloat((100 - sum).toFixed(2));
  if (Math.abs(residual) >= 0.01) {
    _planDays[dayIdx][mixIdx].pct = parseFloat((_planDays[dayIdx][mixIdx].pct + residual).toFixed(2));
  }
}

/* ——— Mise à jour DOM sliders/inputs sans re-render complet ——— */
function _planUpdateDayDOM(dayIdx) {
  _planDays[dayIdx].forEach((m, i) => {
    const slider = document.querySelector(`.plan-mix-slider[data-day="${dayIdx}"][data-idx="${i}"]`);
    const input  = document.querySelector(`.plan-mix-input[data-day="${dayIdx}"][data-idx="${i}"]`);
    if (!m.locked) {
      const maxVal = _planDayMaxForMix(dayIdx, i);
      if (slider) { slider.max = maxVal; slider.value = m.pct; }
      if (input)  { input.max  = maxVal; input.value  = m.pct; }
    } else {
      if (slider) slider.value = m.pct;
      if (input)  input.value  = m.pct;
    }
  });
  const totalEl = document.getElementById(`plan-day-total-${dayIdx}`);
  if (totalEl) {
    const total = _planDays[dayIdx].reduce((s, m) => s + m.pct, 0);
    const ok = Math.abs(total - 100) < 0.05;
    totalEl.textContent = `Total : ${total.toFixed(2)}%`;
    totalEl.style.color = ok ? 'var(--success)' : (total > 100 ? 'var(--danger)' : 'var(--warning)');
    totalEl.style.fontWeight = '600';
  }
}

/* ——— Groupe un plan selon son nom ——— */
function _planGroupe(name, goal) {
  // Priorité au champ goal s'il correspond exactement à une catégorie
  const cats = ['🏋️ Concours', '🍂 Inter-Saison', '🐣 Élevage', '🕊️ Retraités'];
  if (goal && cats.includes(goal)) return goal;
  // Sinon déduction depuis le nom
  if (/inter.sa[io]/i.test(name)) return '🍂 Inter-Saison';
  if (/[eé]levage/i.test(name))   return '🐣 Élevage';
  if (/retrait/i.test(name))      return '🕊️ Retraités';
  return '🏋️ Concours';
}

let _plansList   = [];
let _plansMixMap = {};

async function _loadPlansTab() {
  const el = document.getElementById('tab-plans');
  if (!el) return;
  try {
    const [plans, mixes] = await Promise.all([
      SportAPI.getPlans(),
      SportAPI.getMixes().catch(() => []),
    ]);
    _plansList   = Array.isArray(plans) ? plans : (plans.items || []);
    _plansMixMap = Object.fromEntries((Array.isArray(mixes) ? mixes : []).map(m => [m.id, m]));

    if (_plansList.length === 0) {
      el.innerHTML = `
        <div style="display:flex;justify-content:flex-end;margin-bottom:14px;">
          <button class="btn btn-primary btn-sm" onclick="openPlanModal()">+ Nouveau plan</button>
        </div>
        <div class="empty-state"><div class="empty-icon">📋</div><h3>Aucun plan</h3>
          <p>Créez votre premier plan alimentaire hebdomadaire.</p></div>`;
      return;
    }

    // Grouper par catégorie
    const groupes = {};
    _plansList.forEach(p => {
      const g = _planGroupe(p.name || '', p.goal || '');
      if (!groupes[g]) groupes[g] = [];
      groupes[g].push(p);
    });
    const optGroups = Object.entries(groupes).map(([label, items]) =>
      `<optgroup label="${label}">
        ${items.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
      </optgroup>`
    ).join('');

    el.innerHTML = `
      <div style="display:flex;gap:10px;align-items:center;margin-bottom:16px;flex-wrap:wrap;">
        <select id="plan-selector" class="form-control"
          style="flex:1;min-width:220px;font-size:0.92rem;max-width:540px;">
          <option value="">— Choisir un programme —</option>
          ${optGroups}
        </select>
        <button class="btn btn-primary btn-sm" onclick="openPlanModal()">+ Nouveau plan</button>
      </div>

      <div id="plan-detail-panel" style="display:none;">
        <!-- En-tête -->
        <div style="display:flex;justify-content:space-between;align-items:flex-start;
          background:var(--bg-card);border:1px solid var(--border);border-radius:10px;
          padding:16px 20px;margin-bottom:12px;">
          <div style="flex:1;">
            <div style="font-family:'Playfair Display',serif;font-size:1.1rem;font-weight:700;
              margin-bottom:6px;" id="plan-detail-name">—</div>
            <span id="plan-detail-goal" class="badge badge-success"
              style="font-size:0.75rem;display:none;"></span>
          </div>
          <div style="display:flex;gap:6px;flex-shrink:0;margin-left:12px;">
            <button class="btn btn-sm btn-secondary" id="plan-btn-detail" title="Voir le détail complet" style="font-size:0.8rem;padding:4px 10px;">🔍 Détail</button>
            <button class="btn btn-sm btn-icon" id="plan-btn-edit"   title="Modifier">✏️</button>
            <button class="btn btn-sm btn-icon" id="plan-btn-dup"    title="Dupliquer">📋</button>
            <button class="btn btn-sm btn-icon" id="plan-btn-delete" title="Supprimer">🗑️</button>
          </div>
        </div>

        <!-- Description -->
        <div id="plan-detail-desc"
          style="background:var(--bg);border-left:3px solid var(--accent);
            border-radius:0 8px 8px 0;padding:12px 16px;font-size:0.83rem;
            color:var(--text);line-height:1.65;margin-bottom:12px;
            white-space:pre-line;display:none;"></div>

        <!-- Planning semaine -->
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:10px;overflow:hidden;">
          <div style="padding:11px 16px;border-bottom:1px solid var(--border);
            font-weight:600;font-size:0.88rem;">📅 Planning hebdomadaire type</div>
          <table style="width:100%;border-collapse:collapse;" id="plan-detail-week">
            <tbody></tbody>
          </table>
        </div>
      </div>

      <div id="plan-empty-hint"
        style="text-align:center;padding:48px 20px;color:var(--text-light);font-size:0.9rem;">
        Sélectionnez un programme dans la liste ci-dessus pour afficher ses détails.
      </div>`;

    document.getElementById('plan-selector').addEventListener('change', e => {
      _planAfficherDetail(parseInt(e.target.value) || null);
    });

    // Afficher le premier plan par défaut
    if (_plansList[0]) {
      document.getElementById('plan-selector').value = _plansList[0].id;
      _planAfficherDetail(_plansList[0].id);
    }

  } catch (err) {
    el.innerHTML = `<p style="color:var(--danger);">Erreur : ${err.message}</p>`;
    showToast(err.message, 'error');
  }
}

function _planAfficherDetail(planId) {
  const panel = document.getElementById('plan-detail-panel');
  const hint  = document.getElementById('plan-empty-hint');
  if (!planId) { panel.style.display = 'none'; hint.style.display = ''; return; }

  const p = _plansList.find(x => x.id === planId);
  if (!p) return;
  panel.style.display = '';
  hint.style.display  = 'none';

  document.getElementById('plan-detail-name').textContent = p.name || '—';
  const goalEl = document.getElementById('plan-detail-goal');
  if (p.goal) { goalEl.textContent = p.goal; goalEl.style.display = ''; }
  else { goalEl.style.display = 'none'; }

  const descEl = document.getElementById('plan-detail-desc');
  if (p.description) { descEl.textContent = p.description; descEl.style.display = ''; }
  else { descEl.style.display = 'none'; }

  document.getElementById('plan-btn-detail').onclick = () => _planOuvrirDetailComplet(p.id);
  document.getElementById('plan-btn-edit').onclick   = () => openPlanModal(p.id);
  document.getElementById('plan-btn-dup').onclick    = () => duplicatePlan(p.id);
  document.getElementById('plan-btn-delete').onclick = () => deletePlan(p.id);

  const tbody = document.querySelector('#plan-detail-week tbody');
  tbody.innerHTML = _DAY_NAMES.map((day, i) => {
    const raw = p[day];
    if (!raw) return `
      <tr style="border-top:1px solid var(--border);">
        <td style="padding:9px 16px;font-weight:600;font-size:0.82rem;
          color:var(--text-light);white-space:nowrap;width:90px;">${_DAY_LABELS[i]}</td>
        <td style="padding:9px 16px;font-size:0.82rem;color:var(--text-light);font-style:italic;">—</td>
      </tr>`;

    let mixItems = [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        mixItems = parsed.map(item => {
          const id  = typeof item === 'object' ? item.id  : item;
          const pct = typeof item === 'object' ? item.pct : null;
          const mix = _plansMixMap[id];
          return mix ? { name: mix.name, pct } : null;
        }).filter(Boolean);
      }
    } catch { mixItems = [{ name: String(raw).slice(0, 80), pct: null }]; }

    const mixHtml = mixItems.map(m => {
      const color = m.pct >= 60 ? 'var(--accent)' : m.pct >= 30 ? '#E67E22' : 'var(--text-light)';
      return `<span style="display:inline-flex;align-items:center;gap:5px;
        background:var(--bg);border-radius:20px;padding:3px 10px;margin:2px;
        font-size:0.8rem;border:1px solid var(--border);">
        <span style="font-weight:600;">${m.name}</span>
        ${m.pct != null ? `<span style="font-weight:700;color:${color};">${m.pct}%</span>` : ''}
      </span>`;
    }).join('');

    return `
      <tr style="border-top:1px solid var(--border);">
        <td style="padding:9px 16px;font-weight:700;font-size:0.82rem;
          white-space:nowrap;width:90px;">${_DAY_LABELS[i]}</td>
        <td style="padding:6px 12px;">${mixHtml}</td>
      </tr>`;
  }).join('');
}

/* ——— Modal détail complet d'un plan ——— */
function _planOuvrirDetailComplet(planId) {
  const p = _plansList.find(x => x.id === planId);
  if (!p) return;

  const usageLabels = {
    recuperation: 'Récupération', entrainement: 'Entraînement',
    pre_panier: 'Pré-panier',    enlogement:   'Enlogement',
  };

  const joursHtml = _DAY_NAMES.map((day, i) => {
    const raw = p[day];
    if (!raw) return '';

    let mixItems = [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        mixItems = parsed.map(item => {
          const id  = typeof item === 'object' ? item.id  : item;
          const pct = typeof item === 'object' ? item.pct : null;
          const mix = _plansMixMap[id];
          return mix ? { ...mix, pct } : null;
        }).filter(Boolean);
      }
    } catch { /* ignore */ }
    if (!mixItems.length) return '';

    const mixDetails = mixItems.map(m => {
      const color = m.pct >= 60 ? 'var(--accent)' : m.pct >= 30 ? '#E67E22' : 'var(--text-light)';

      // Composition ingrédients
      let compHtml = '';
      if (m.composition) {
        try {
          const comp = JSON.parse(m.composition);
          const ings = comp.filter(c => c.type !== 'supplement');
          const sups = comp.filter(c => c.type === 'supplement');
          if (ings.length) {
            compHtml += `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px;">
              ${ings.map(c => `
                <span style="background:var(--bg);border:1px solid var(--border);border-radius:4px;
                  padding:2px 7px;font-size:0.75rem;">
                  🌾 ${c.name} <strong>${parseFloat(c.pct).toFixed(1)}%</strong>
                </span>`).join('')}
            </div>`;
          }
          if (sups.length) {
            compHtml += `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;">
              ${sups.map(c => `
                <span style="background:#f0f8ff;border:1px solid #b8d8f0;border-radius:4px;
                  padding:2px 7px;font-size:0.75rem;">
                  💊 ${c.name}${c.quantity ? ' — ' + c.quantity + (c.unit ? ' ' + c.unit : '') : ''}
                </span>`).join('')}
            </div>`;
          }
        } catch { /* ignore */ }
      }

      return `
        <div style="border:1px solid var(--border);border-radius:8px;padding:10px 14px;margin-bottom:8px;
          border-left:4px solid ${color};">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
            <span style="font-weight:700;font-size:0.88rem;">🔀 ${m.name}</span>
            ${m.pct != null ? `<span style="font-weight:800;font-size:0.9rem;color:${color};">${m.pct}%</span>` : ''}
            ${m.usage ? `<span class="badge badge-info" style="font-size:0.7rem;">${usageLabels[m.usage] || m.usage}</span>` : ''}
          </div>
          ${m.description ? `<div style="font-size:0.79rem;color:var(--text-light);margin-bottom:4px;font-style:italic;">${m.description}</div>` : ''}
          ${compHtml}
        </div>`;
    }).join('');

    return `
      <div style="margin-bottom:16px;">
        <div style="font-weight:700;font-size:0.82rem;text-transform:uppercase;letter-spacing:0.5px;
          color:var(--accent);margin-bottom:6px;padding-bottom:4px;border-bottom:1px solid var(--border);">
          ${_DAY_LABELS[i]}
        </div>
        ${mixDetails}
      </div>`;
  }).filter(Boolean).join('');

  const html = `
    ${p.goal ? `<div style="margin-bottom:12px;"><span class="badge badge-success">${p.goal}</span></div>` : ''}

    ${p.description ? `
      <div style="background:var(--bg);border-left:3px solid var(--accent);border-radius:0 8px 8px 0;
        padding:12px 16px;font-size:0.83rem;color:var(--text);line-height:1.65;margin-bottom:20px;
        white-space:pre-line;">${p.description}</div>` : ''}

    <div style="font-weight:600;font-size:0.9rem;margin-bottom:14px;
      border-bottom:2px solid var(--border);padding-bottom:8px;">📅 Détail par jour</div>

    ${joursHtml || '<div style="color:var(--text-light);font-style:italic;">Aucun mélange planifié.</div>'}

    <div style="text-align:right;margin-top:16px;">
      <button class="btn btn-secondary" onclick="closeModal()">Fermer</button>
      <button class="btn btn-primary" onclick="closeModal(); openPlanModal(${p.id})">✏️ Modifier</button>
    </div>`;

  const overlay = document.getElementById('modal-overlay');
  document.getElementById('modal-title').textContent = `📋 ${p.name}`;
  document.getElementById('modal').style.width = '700px';
  document.getElementById('modal-body').innerHTML = html;
  overlay.style.display = 'flex';
  document.getElementById('modal-close').onclick = closeModal;
  overlay.onclick = (e) => { if (e.target === overlay) closeModal(); };
}

async function duplicatePlan(planId) {
  try {
    const src = await SportAPI.getPlan(planId);
    const DAY_KEYS = ['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'];
    const copy = { name: `${src.name} (copie)`, goal: src.goal || null, description: src.description || null };
    DAY_KEYS.forEach(d => { copy[d] = src[d] || null; });
    const created = await SportAPI.createPlan(copy);
    showToast('Plan alimentaire dupliqué !', 'success');
    await _loadPlansTab();
    if (created?.id) {
      const sel = document.getElementById('plan-selector');
      if (sel) { sel.value = created.id; _planAfficherDetail(created.id); }
    }
  } catch (err) { showToast(err.message, 'error'); }
}

function deletePlan(planId) {
  const plan = _plansList.find(p => p.id === planId);
  const nom  = plan?.name || 'ce plan';
  confirmDelete(`Supprimer définitivement <strong>${nom}</strong> ?`, async () => {
    try {
      await SportAPI.deletePlan(planId);
      showToast('Plan supprimé.', 'success');
      _loadPlansTab();
    } catch (err) { showToast(err.message, 'error'); }
  });
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
          _planDays[i] = parsed.map(item => {
            const id  = typeof item === 'object' ? item.id  : item;
            const pct = typeof item === 'object' ? (item.pct ?? 50) : 50;
            return mixById[id] ? { id, name: mixById[id].name, pct, locked: false } : null;
          }).filter(Boolean);
        }
      } catch { /* texte libre, pas de mélanges */ }
    });
  }

  const mixOpts = mixList.length
    ? mixList.map(m => `<option value="${m.id}" data-name="${m.name}">${m.name}</option>`).join('')
    : '<option value="" disabled>Aucun mélange disponible</option>';

  const goalOpts = ['', '🏋️ Concours', '🍂 Inter-Saison', '🐣 Élevage', '🕊️ Retraités'];
  const goalLabels = { '':'—', '🏋️ Concours':'🏋️ Concours', '🍂 Inter-Saison':'🍂 Inter-Saison', '🐣 Élevage':'🐣 Élevage', '🕊️ Retraités':'🕊️ Retraités' };
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
              <div id="plan-day-tags-${idx}" style="margin-bottom:6px;"></div>
              <div id="plan-day-total-${idx}" style="font-size:0.82rem;margin-bottom:5px;"></div>
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
      if (_planDays[day].find(m => m.id === id)) {
        showToast('Ce mélange est déjà dans ce jour', 'warning'); return;
      }
      _planDays[day].push({ id, name, pct: 0, locked: false });
      _planDayRebalanceEqual(day);
      _planRenderDayList(day);
      _planRenderSummary();
      sel.value = '';
    });
  });

  document.getElementById('form-plan').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = parseFormData(e.target, [], ['name']);
    for (let i = 0; i < _planDays.length; i++) {
      if (_planDays[i].length === 0) continue;
      const total = _planDays[i].reduce((s, m) => s + m.pct, 0);
      if (Math.abs(total - 100) > 0.5) {
        showToast(`${_DAY_LABELS[i]} : total des mélanges doit être 100% (actuellement ${total.toFixed(2)}%)`, 'warning');
        return;
      }
    }
    _DAY_NAMES.forEach((day, i) => {
      const items = _planDays[i].map(m => ({ id: m.id, pct: m.pct }));
      data[day] = items.length > 0 ? JSON.stringify(items) : null;
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

function _planRenderDayList(dayIdx) {
  const el = document.getElementById(`plan-day-tags-${dayIdx}`);
  if (!el) return;

  if (_planDays[dayIdx].length === 0) {
    el.innerHTML = '<div style="font-size:0.77rem;color:var(--text-light);font-style:italic;padding:2px 0;">Aucun mélange — jeûne / eau</div>';
    const totalEl = document.getElementById(`plan-day-total-${dayIdx}`);
    if (totalEl) totalEl.textContent = '';
    return;
  }

  const unlockedCount = _planDays[dayIdx].filter(m => !m.locked).length;
  el.innerHTML = _planDays[dayIdx].map((m, i) => {
    const canLock    = !m.locked && unlockedCount > 2;
    const lockDisabled = !m.locked && !canLock ? 'disabled title="2 mélanges déverrouillés minimum"' : '';
    const maxVal     = m.locked ? 100 : _planDayMaxForMix(dayIdx, i);
    return `
    <div style="display:flex;gap:6px;align-items:center;margin-bottom:5px;flex-wrap:wrap;${m.locked ? 'opacity:0.75;' : ''}">
      <button type="button" class="btn btn-sm btn-icon plan-mix-lock"
        data-day="${dayIdx}" data-idx="${i}" ${lockDisabled}
        style="font-size:1rem;padding:2px 5px;${m.locked ? 'color:var(--accent);' : 'color:var(--text-light);'}"
        title="${m.locked ? 'Déverrouiller' : 'Verrouiller'}">${m.locked ? '🔒' : '🔓'}</button>
      <span style="min-width:90px;font-size:0.83rem;">🔀 ${m.name}</span>
      <input type="range" min="0" max="${maxVal}" step="0.01" value="${m.pct}"
        class="plan-mix-slider" data-day="${dayIdx}" data-idx="${i}"
        style="flex:2;min-width:80px;accent-color:var(--accent);" ${m.locked ? 'disabled' : ''}>
      <input type="number" min="0" max="${maxVal}" step="0.01" value="${m.pct}"
        class="form-control plan-mix-input" style="width:74px;" data-day="${dayIdx}" data-idx="${i}" ${m.locked ? 'disabled' : ''}>
      <span style="font-size:0.78rem;color:var(--text-light);width:12px;">%</span>
      <button type="button" class="btn btn-sm btn-icon plan-mix-remove"
        data-day="${dayIdx}" data-idx="${i}">🗑️</button>
    </div>`;
  }).join('');

  _planUpdateDayDOM(dayIdx);

  el.querySelectorAll('.plan-mix-slider').forEach(slider => {
    slider.addEventListener('input', (e) => {
      _planDayApplyChange(parseInt(e.target.dataset.day), parseInt(e.target.dataset.idx), e.target.value);
      _planUpdateDayDOM(parseInt(e.target.dataset.day));
    });
    slider.addEventListener('change', () => _planRenderDayList(parseInt(slider.dataset.day)));
  });

  el.querySelectorAll('.plan-mix-input').forEach(input => {
    input.addEventListener('change', (e) => {
      _planDayApplyChange(parseInt(e.target.dataset.day), parseInt(e.target.dataset.idx), e.target.value);
      _planRenderDayList(parseInt(e.target.dataset.day));
    });
  });

  el.querySelectorAll('.plan-mix-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const b   = e.target.closest('button');
      const day = parseInt(b.dataset.day);
      const idx = parseInt(b.dataset.idx);
      _planDays[day].splice(idx, 1);
      if (_planDays[day].length > 0) _planDayRebalanceEqual(day);
      _planRenderDayList(day);
      _planRenderSummary();
    });
  });
  el.querySelectorAll('.plan-mix-lock').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const b   = e.target.closest('button');
      _planDayToggleLock(parseInt(b.dataset.day), parseInt(b.dataset.idx));
    });
  });
}

// alias pour l'appel initial dans openPlanModal
function _planRenderDayTags(dayIdx) { _planRenderDayList(dayIdx); }

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
              ? _planDays[i].map(m => {
                  const total = _planDays[i].reduce((s,x) => s + x.pct, 0);
                  const ok = Math.abs(total - 100) < 0.05;
                  return `<span class="badge badge-info" style="font-size:0.72rem;">${m.name} <strong>${m.pct}%</strong></span>`;
                }).join(' ') + (() => {
                  const total = _planDays[i].reduce((s,m) => s + m.pct, 0);
                  const color = Math.abs(total-100)<0.05 ? 'var(--success)' : total>100 ? 'var(--danger)' : 'var(--warning)';
                  return `<span style="font-size:0.72rem;font-weight:700;color:${color};margin-left:4px;">= ${total.toFixed(0)}%</span>`;
                })()
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

let _affAllPigeons = [];      // pigeons actifs uniquement (sélection)
let _affAllPigeonsLookup = []; // tous pigeons (résolution des noms dans la liste)
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
    const rawPigeons = Array.isArray(allPigeons) ? allPigeons : [];
    _affAllPigeonsLookup = rawPigeons;
    _affAllPigeons = rawPigeons
      .filter(p => !['perdu', 'decede'].includes((p.statut || '').toLowerCase()));
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
              <label style="display:inline-flex;align-items:center;gap:5px;cursor:pointer;padding:4px 12px;background:var(--bg-card);color:var(--text);border:1px solid var(--border);border-radius:20px;font-size:0.84rem;">
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
          <div id="aff-indiv-list" style="max-height:220px;overflow-y:auto;border:1px solid var(--border);border-radius:6px;padding:4px;background:var(--bg-card);color:var(--text);"></div>
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
          ${_renderAffectationsList(Array.isArray(existingAff) ? existingAff : [], _affPlanMap, _affAllPigeonsLookup)}
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
    <table style="width:100%;font-size:0.75rem;border-collapse:collapse;margin-top:4px;background:var(--bg-card);color:var(--text);border-radius:6px;overflow:hidden;border:1px solid var(--border);">
      <thead><tr style="background:var(--bg-secondary);">
        ${_DAY_LABELS.map(d => `<th style="padding:4px 5px;text-align:center;font-size:0.72rem;font-weight:600;">${d.substring(0, 3)}.</th>`).join('')}
      </tr></thead>
      <tbody><tr>
        ${_DAY_NAMES.map(day => {
          let names = [];
          try {
            if (p[day]) names = JSON.parse(p[day]).map(item => {
              const id = typeof item === 'object' ? item.id : item;
              return _affMixMap[id] || `Mél.#${id}`;
            });
          } catch {}
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

  const eligibleCount = pigeonIds.length;
  const pigeonsHtml = pigeonIds.map(pid => {
    const p = _affAllPigeons.find(x => x.id === pid);
    const label = p ? `${p.matricule}${p.nom ? ' — ' + p.nom : ''}` : pid;
    return `<div style="font-size:0.82rem;padding:2px 0;"><span>${label}</span></div>`;
  }).join('');

  const overlay = document.getElementById('modal-overlay');
  document.getElementById('modal-title').textContent = '✅ Confirmer l\'affectation';
  document.getElementById('modal').className = 'modal';
  document.getElementById('modal-body').innerHTML = `
    <div style="background:var(--bg-secondary);border-radius:8px;padding:16px;margin-bottom:16px;">
      <div style="margin-bottom:8px;">📋 <strong>Plan :</strong> ${plan ? plan.name : '#' + planId}</div>
      <div style="margin-bottom:8px;">🕊️ <strong>Pigeons :</strong>
        ${eligibleCount} pigeon${eligibleCount > 1 ? 's' : ''} affecté${eligibleCount > 1 ? 's' : ''}
        <span style="font-size:0.8rem;color:var(--text-light);"> — les affectations précédentes seront remplacées</span>
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

  // Séparer individuelles et groupes
  const individuelles = affList.filter(a => a.is_individual);
  const parGroupe = affList.filter(a => !a.is_individual);

  // Regrouper les affectations groupe par clé groupe+plan_id
  const groupesMap = {};
  parGroupe.forEach(a => {
    const key = `${a.groupe || '—'}||${a.plan_id}`;
    if (!groupesMap[key]) {
      groupesMap[key] = {
        groupe: a.groupe || '—',
        plan: a.plan || planMap[a.plan_id],
        plan_id: a.plan_id,
        date_debut: a.date_debut,
        date_fin: a.date_fin,
        pigeons: [],
        ids: [],           // ids des affectations (pour suppression)
      };
    }
    const p = pigeonMap[a.pigeon_id];
    groupesMap[key].pigeons.push(p ? p.matricule : a.pigeon_id);
    groupesMap[key].ids.push(a.id);
  });

  // ── Bloc GROUPES ───────────────────────────────────────────────────────────
  const blocGroupe = Object.values(groupesMap).length === 0 ? '' : `
    <div style="font-weight:600;font-size:0.85rem;color:var(--text-light);
      text-transform:uppercase;letter-spacing:0.04em;margin-bottom:8px;">
      👥 Affectations par groupe
    </div>
    <div style="overflow-x:auto;margin-bottom:20px;">
      <table class="table-modern" style="font-size:0.82rem;">
        <thead>
          <tr><th>Groupe</th><th>Plan</th><th>Pigeons</th><th>Début</th><th>Fin</th><th></th></tr>
        </thead>
        <tbody>
          ${Object.values(groupesMap).map(g => `
            <tr>
              <td><strong>${g.groupe}</strong></td>
              <td>${g.plan ? g.plan.name : 'Plan #' + g.plan_id}</td>
              <td>
                <span class="badge badge-secondary" style="cursor:pointer;"
                  title="${g.pigeons.join(', ')}">${g.pigeons.length} pigeon${g.pigeons.length > 1 ? 's' : ''}
                </span>
                <span style="font-size:0.75rem;color:var(--text-light);margin-left:4px;">
                  ${g.pigeons.slice(0, 3).join(', ')}${g.pigeons.length > 3 ? '…' : ''}
                </span>
              </td>
              <td>${formatDate(g.date_debut)}</td>
              <td>${g.date_fin ? formatDate(g.date_fin) : '♾️'}</td>
              <td>
                <button class="btn btn-sm btn-icon"
                  onclick="deleteAffectationsGroupe([${g.ids.join(',')}])"
                  title="Supprimer le groupe">🗑️</button>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;

  // ── Bloc INDIVIDUELLES ─────────────────────────────────────────────────────
  const blocIndiv = individuelles.length === 0 ? '' : `
    <div style="font-weight:600;font-size:0.85rem;color:var(--text-light);
      text-transform:uppercase;letter-spacing:0.04em;margin-bottom:8px;">
      👤 Affectations individuelles
    </div>
    <div style="overflow-x:auto;">
      <table class="table-modern" style="font-size:0.82rem;">
        <thead>
          <tr><th>Pigeon</th><th>Plan</th><th>Début</th><th>Fin</th><th></th></tr>
        </thead>
        <tbody>
          ${individuelles.map(a => {
            const pigeon = pigeonMap[a.pigeon_id];
            const plan   = a.plan || planMap[a.plan_id];
            const statutBadge = (() => {
              const s = (pigeon?.statut || '').toLowerCase();
              if (s === 'perdu')  return ' <span class="badge" style="background:#E67E22;color:#fff;font-size:0.68rem;">Perdu</span>';
              if (s === 'decede') return ' <span class="badge" style="background:#7F8C8D;color:#fff;font-size:0.68rem;">Décédé</span>';
              return '';
            })();
            return `
              <tr>
                <td>${pigeon ? pigeon.matricule + statutBadge
                  : `<span style="color:var(--danger);font-size:0.78rem;">${a.pigeon_id}</span>`}</td>
                <td>${plan ? plan.name : 'Plan #' + a.plan_id}</td>
                <td>${formatDate(a.date_debut)}</td>
                <td>${a.date_fin ? formatDate(a.date_fin) : '♾️'}</td>
                <td><button class="btn btn-sm btn-icon" onclick="deleteAffectation(${a.id})" title="Supprimer">🗑️</button></td>
              </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;

  return (blocGroupe || blocIndiv)
    ? blocGroupe + blocIndiv
    : '<div style="font-size:0.85rem;color:var(--text-light);">Aucune affectation enregistrée.</div>';
}

async function deleteAffectationsGroupe(ids) {
  if (!confirm(`Supprimer le groupe (${ids.length} affectation${ids.length > 1 ? 's' : ''}) ?`)) return;
  try {
    await Promise.all(ids.map(id => SportAPI.deleteAffectation(id)));
    showToast('Groupe supprimé.', 'success');
    _loadAffectationTab();
  } catch (err) { showToast(err.message, 'error'); }
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
      <table class="table-modern" style="width:100%;">
        <thead>
          <tr>
            <th style="min-width:160px;position:sticky;left:0;background:var(--bg-secondary);color:var(--text);">Pigeon / Groupe</th>
            <th>Plan alimentaire</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(row => `
            <tr style="${row.is_group ? 'background:var(--bg-secondary);' : ''}">
              <td style="font-weight:600;font-size:0.88rem;position:sticky;left:0;${row.is_group ? 'background:var(--bg-secondary);' : 'background:var(--bg-card);'}">
                ${row.is_group
                  ? `<span style="display:inline-flex;align-items:center;gap:5px;">
                       <span style="font-size:0.9rem;">👥</span>
                       <span style="color:var(--accent);">${row.label}</span>
                     </span>`
                  : `<span style="font-size:0.8rem;">🕊️ ${row.label}</span>
                     ${row.sous_label ? `<br><span style="font-weight:400;font-size:0.74rem;color:var(--text-light);">${row.sous_label}</span>` : ''}`
                }
              </td>
              ${dayKeys.map((day, di) => {
                const mixes = row[day] || [];
                // Afficher uniquement la première cellule du lundi avec nom plan + bouton détail
                // Les autres jours : point coloré si plan actif, tiret sinon
                if (di === 0) {
                  // Colonne Lundi = nom du plan + bouton Voir détail (s'étend visuellement)
                  return `<td colspan="7" style="font-size:0.82rem;vertical-align:middle;padding:6px 8px;">
                    ${row.plan_name
                      ? `<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                           <span style="font-weight:600;">📋 ${row.plan_name}</span>
                           ${row.plan_id
                             ? `<button class="btn btn-sm btn-secondary"
                                  style="padding:2px 10px;font-size:0.75rem;"
                                  onclick="_planOuvrirDetailComplet(${row.plan_id})">
                                  🔍 Voir détail
                                </button>`
                             : ''}
                         </div>`
                      : '<span style="color:var(--text-light);">—</span>'}
                  </td>`;
                }
                return ''; // Les autres colonnes sont absorbées par le colspan
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
