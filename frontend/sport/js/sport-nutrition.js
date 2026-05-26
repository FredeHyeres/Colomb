/* ============================================================
   SPORT-NUTRITION.JS — Nutrition : ingrédients, mélanges, suppléments, plans
   ============================================================ */

/* ——— Page principale : 3 onglets ——— */
async function loadNutrition() {
  const content = document.getElementById('content');
  const btn = document.getElementById('btn-add');
  if (btn) btn.style.display = 'none';

  content.innerHTML = `
    <div class="card">
      <!-- Tabs -->
      <div class="tabs-header">
        <button class="tab-btn active" data-tab="ingredients">🌾 Ingrédients</button>
        <button class="tab-btn" data-tab="mixes">🔀 Mélanges</button>
        <button class="tab-btn" data-tab="supplements">💊 Suppléments</button>
      </div>

      <div id="tab-ingredients" class="tab-panel active">
        <div class="loader-spinner"></div>
      </div>
      <div id="tab-mixes" class="tab-panel">
        <div class="loader-spinner"></div>
      </div>
      <div id="tab-supplements" class="tab-panel">
        <div class="loader-spinner"></div>
      </div>
    </div>
  `;

  // Gestion des onglets
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
    });
  });

  // Charger tous les onglets en parallèle
  loadIngredientsTab();
  loadMixesTab();
  loadSupplementsTab();
}

/* ——— Onglet Ingrédients ——— */
async function loadIngredientsTab() {
  const el = document.getElementById('tab-ingredients');

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
            <thead>
              <tr>
                <th>Nom</th>
                <th>Catégorie</th>
                <th>Protéines</th>
                <th>Lipides</th>
                <th>Glucides</th>
                <th>Énergie (kcal)</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              ${list.map(ing => `
                <tr>
                  <td><strong>${ing.name || ing.nom || '—'}</strong></td>
                  <td>${ing.category ? `<span class="badge badge-info">${ing.category}</span>` : '—'}</td>
                  <td>${renderMiniBar(ing.protein_pct, '#2980B9')} ${ing.protein_pct != null ? ing.protein_pct + '%' : '—'}</td>
                  <td>${renderMiniBar(ing.fat_pct, '#E67E22')} ${ing.fat_pct != null ? ing.fat_pct + '%' : '—'}</td>
                  <td>${renderMiniBar(ing.carb_pct, '#27AE60')} ${ing.carb_pct != null ? ing.carb_pct + '%' : '—'}</td>
                  <td>${ing.energy_kcal != null ? ing.energy_kcal + ' kcal' : '—'}</td>
                  <td style="font-size:0.78rem;color:var(--text-light);">${ing.notes || ''}</td>
                </tr>`).join('')}
            </tbody>
          </table>`}
    `;
  } catch (err) {
    el.innerHTML = `<p style="color:var(--danger);">Erreur : ${err.message}</p>`;
    showToast(err.message, 'error');
  }
}

/* ——— Mini barre inline ——— */
function renderMiniBar(value, color) {
  if (value == null) return '';
  const pct = Math.min(100, Math.max(0, value));
  return `<span style="display:inline-block;width:${Math.round(pct * 0.5)}px;height:6px;background:${color};border-radius:3px;vertical-align:middle;margin-right:4px;"></span>`;
}

/* ——— Modal ajout ingrédient ——— */
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
            <option value="céréale">Céréale</option>
            <option value="légumineuse">Légumineuse</option>
            <option value="graine">Graine</option>
            <option value="minéral">Minéral</option>
            <option value="vitamine">Vitamine</option>
            <option value="autre">Autre</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Énergie (kcal/100g)</label>
          <input type="number" class="form-control" name="energy_kcal" step="1" min="0" placeholder="ex: 350">
        </div>
      </div>
      <div class="form-row-3">
        <div class="form-group">
          <label class="form-label">Protéines (%)</label>
          <input type="number" class="form-control" name="protein_pct" step="0.1" min="0" max="100" placeholder="ex: 12">
        </div>
        <div class="form-group">
          <label class="form-label">Lipides (%)</label>
          <input type="number" class="form-control" name="fat_pct" step="0.1" min="0" max="100" placeholder="ex: 3">
        </div>
        <div class="form-group">
          <label class="form-label">Glucides (%)</label>
          <input type="number" class="form-control" name="carb_pct" step="0.1" min="0" max="100" placeholder="ex: 70">
        </div>
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
    const data = parseFormData(e.target, ['energy_kcal', 'protein_pct', 'fat_pct', 'carb_pct'], ['name']);
    const btn = e.target.querySelector('[type=submit]');
    btn.disabled = true;
    btn.innerHTML = '<span class="loader-inline"></span>';
    try {
      await SportAPI.createIngredient(data);
      showToast('Ingrédient ajouté !', 'success');
      closeModal();
      loadIngredientsTab();
    } catch (err) {
      showToast(err.message, 'error');
      btn.disabled = false;
      btn.textContent = 'Enregistrer';
    }
  });
}

/* ——— Onglet Mélanges ——— */
async function loadMixesTab() {
  const el = document.getElementById('tab-mixes');

  try {
    const mixes = await SportAPI.getMixes();
    const list = Array.isArray(mixes) ? mixes : (mixes.items || []);

    const usageLabels = {
      recuperation: 'Récupération',
      entrainement: 'Entraînement',
      pre_panier: 'Pré-panier',
      enlogement: 'Enlogement',
    };

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
          </div>`}
    `;
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
    return `<div style="font-size:0.75rem;color:var(--text-light);margin-top:6px;">
      ${comp.map(c => `<span style="background:var(--bg-secondary);border-radius:4px;padding:2px 6px;margin-right:4px;">${c.type === 'supplement' ? '💊' : '🌾'} ${c.name} ${c.pct}%</span>`).join('')}
    </div>`;
  } catch { return ''; }
}

async function deleteMixItem(mixId) {
  if (!confirm('Supprimer ce mélange ? Cette action est irréversible.')) return;
  try {
    await SportAPI.deleteMix(mixId);
    showToast('Mélange supprimé.', 'success');
    loadMixesTab();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

/* ——— État composition mélange ——— */
let _mixState = { items: [] };
// item : { id: "ing_1"|"sup_1", type: "ingredient"|"supplement", name: "...", pct: 0 }

function _mixAddItem(itemId, type, name) {
  if (_mixState.items.find(i => i.id === itemId)) {
    showToast('Cet élément est déjà dans la composition', 'warning');
    return;
  }
  _mixState.items.push({ id: itemId, type, name, pct: 0 });
  _mixRebalanceEqual();
  _mixRenderComposition();
}

function _mixRemoveItem(idx) {
  _mixState.items.splice(idx, 1);
  _mixRebalanceEqual();
  _mixRenderComposition();
}

function _mixRebalanceEqual() {
  const n = _mixState.items.length;
  if (n === 0) return;
  const share = parseFloat((100 / n).toFixed(1));
  const lastShare = parseFloat((100 - share * (n - 1)).toFixed(1));
  _mixState.items.forEach((item, i) => {
    item.pct = i === n - 1 ? lastShare : share;
  });
}

function _mixOnPctChange(idx, val) {
  const newPct = Math.min(100, Math.max(0, parseFloat(val) || 0));
  _mixState.items[idx].pct = newPct;
  const others = _mixState.items.filter((_, i) => i !== idx);
  if (others.length > 0) {
    const remaining = 100 - newPct;
    const share = parseFloat((remaining / others.length).toFixed(1));
    const lastShare = parseFloat((remaining - share * (others.length - 1)).toFixed(1));
    others.forEach((o, i) => {
      o.pct = i === others.length - 1 ? lastShare : share;
    });
  }
  _mixRenderComposition();
}

function _mixRenderComposition() {
  const el = document.getElementById('mix-comp-list');
  const totalEl = document.getElementById('mix-comp-total');
  if (!el) return;

  if (_mixState.items.length === 0) {
    el.innerHTML = '<div style="font-size:0.8rem;color:var(--text-light);padding:8px 0;">Aucun ingrédient sélectionné</div>';
    if (totalEl) { totalEl.textContent = 'Total : 0%'; totalEl.style.color = 'var(--text)'; }
    return;
  }

  el.innerHTML = _mixState.items.map((item, idx) => `
    <div style="display:flex;gap:8px;align-items:center;margin-bottom:6px;">
      <span style="flex:1;font-size:0.88rem;">${item.type === 'supplement' ? '💊' : '🌾'} ${item.name}</span>
      <input type="number" min="0" max="100" step="0.1" value="${item.pct}"
        class="form-control mix-pct-input" style="width:75px;"
        data-idx="${idx}">
      <span style="font-size:0.8rem;color:var(--text-light);">%</span>
      <button type="button" class="btn btn-sm btn-icon mix-remove-btn" data-idx="${idx}">🗑️</button>
    </div>`).join('');

  const total = _mixState.items.reduce((s, i) => s + i.pct, 0);
  if (totalEl) {
    totalEl.textContent = `Total : ${total.toFixed(1)}%`;
    totalEl.style.color = Math.abs(total - 100) < 0.1 ? 'var(--success)' : (total > 100 ? 'var(--danger)' : 'var(--text)');
  }

  el.querySelectorAll('.mix-pct-input').forEach(input => {
    input.addEventListener('change', (e) => _mixOnPctChange(parseInt(e.target.dataset.idx), e.target.value));
  });
  el.querySelectorAll('.mix-remove-btn').forEach(btn => {
    btn.addEventListener('click', (e) => _mixRemoveItem(parseInt(e.target.dataset.idx)));
  });
}

/* ——— Modal mélange (création et modification) ——— */
async function openMixModal(mixId = null) {
  const overlay = document.getElementById('modal-overlay');
  document.getElementById('modal-title').textContent = mixId ? '✏️ Modifier le mélange' : '+ Nouveau mélange';
  document.getElementById('modal').className = 'modal';
  document.getElementById('modal-body').innerHTML = '<div class="loader-spinner"></div>';
  overlay.style.display = 'flex';
  document.getElementById('modal-close').onclick = closeModal;
  overlay.onclick = (e) => { if (e.target === overlay) closeModal(); };

  // Charger mix existant + listes ingrédients/suppléments en parallèle
  let mix = null, ingredients = [], supplements = [];
  try {
    [mix, ingredients, supplements] = await Promise.all([
      mixId ? SportAPI.getMix(mixId) : Promise.resolve(null),
      SportAPI.getIngredients().catch(() => []),
      SportAPI.getSupplements().catch(() => []),
    ]);
    ingredients = Array.isArray(ingredients) ? ingredients : [];
    supplements = Array.isArray(supplements) ? supplements : [];
  } catch (err) {
    showToast(err.message, 'error');
    closeModal();
    return;
  }

  // Initialiser l'état composition
  _mixState = { items: [] };
  if (mix?.composition) {
    try {
      const parsed = JSON.parse(mix.composition);
      if (Array.isArray(parsed)) _mixState.items = parsed.map(c => ({ ...c }));
    } catch { /* composition corrompue, on repart de zéro */ }
  }

  const ingOptgroup = ingredients.length
    ? `<optgroup label="🌾 Ingrédients">${ingredients.map(i => `<option value="ing_${i.id}" data-type="ingredient" data-name="${i.name}">${i.name}</option>`).join('')}</optgroup>`
    : '';
  const supOptgroup = supplements.length
    ? `<optgroup label="💊 Suppléments">${supplements.map(s => `<option value="sup_${s.id}" data-type="supplement" data-name="${s.name}">${s.name}</option>`).join('')}</optgroup>`
    : '';

  document.getElementById('modal-body').innerHTML = `
    <form id="form-mix">
      <div class="form-group">
        <label class="form-label">Nom du mélange *</label>
        <input type="text" class="form-control" name="name" required
          placeholder="ex: Mélange course longue distance"
          value="${mix ? (mix.name || '') : ''}">
      </div>
      <div class="form-group">
        <label class="form-label">Usage</label>
        <select class="form-control" name="usage">
          <option value="">—</option>
          <option value="recuperation"${mix?.usage === 'recuperation' ? ' selected' : ''}>Récupération</option>
          <option value="entrainement"${mix?.usage === 'entrainement' ? ' selected' : ''}>Entraînement</option>
          <option value="pre_panier"${mix?.usage === 'pre_panier' ? ' selected' : ''}>Pré-panier</option>
          <option value="enlogement"${mix?.usage === 'enlogement' ? ' selected' : ''}>Enlogement</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <textarea class="form-control" name="description" rows="2"
          placeholder="Composition, usage recommandé...">${mix?.description || ''}</textarea>
      </div>

      <div style="margin:16px 0 6px;font-weight:600;font-size:0.9rem;">🌾 Composition (%)</div>
      <p style="font-size:0.78rem;color:var(--text-light);margin-bottom:8px;">Sélectionnez les ingrédients et leur pourcentage. Le total doit être 100%.</p>
      <div style="display:flex;gap:8px;margin-bottom:10px;">
        <select id="mix-item-sel" class="form-control form-control-sm" style="flex:1;">
          <option value="">-- Choisir un ingrédient ou supplément --</option>
          ${ingOptgroup}${supOptgroup}
        </select>
        <button type="button" class="btn btn-secondary btn-sm" id="mix-add-item-btn">+ Ajouter</button>
      </div>
      <div id="mix-comp-list"></div>
      <div id="mix-comp-total" style="font-size:0.85rem;font-weight:600;margin-top:6px;color:var(--text);">Total : 0%</div>

      <div class="modal-footer" style="padding:0;margin-top:16px;">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Annuler</button>
        <button type="submit" class="btn btn-primary">${mixId ? 'Enregistrer' : 'Créer le mélange'}</button>
      </div>
    </form>`;

  // Render composition initiale
  _mixRenderComposition();

  // Bouton ajouter
  document.getElementById('mix-add-item-btn').addEventListener('click', () => {
    const sel = document.getElementById('mix-item-sel');
    const opt = sel.options[sel.selectedIndex];
    if (!opt.value) return;
    _mixAddItem(opt.value, opt.dataset.type, opt.dataset.name);
    sel.value = '';
  });

  document.getElementById('form-mix').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = parseFormData(e.target, [], ['name']);

    // Valider et sérialiser la composition
    if (_mixState.items.length > 0) {
      const total = _mixState.items.reduce((s, i) => s + i.pct, 0);
      if (Math.abs(total - 100) > 0.1) {
        showToast(`Total des % doit être 100% (actuellement ${total.toFixed(1)}%)`, 'warning');
        return;
      }
      data.composition = JSON.stringify(_mixState.items);
    } else {
      data.composition = null;
    }

    const btn = e.target.querySelector('[type=submit]');
    btn.disabled = true;
    btn.innerHTML = '<span class="loader-inline"></span>';
    try {
      if (mixId) {
        await SportAPI.updateMix(mixId, data);
        showToast('Mélange modifié !', 'success');
      } else {
        await SportAPI.createMix(data);
        showToast('Mélange créé !', 'success');
      }
      closeModal();
      loadMixesTab();
    } catch (err) {
      showToast(err.message, 'error');
      btn.disabled = false;
      btn.textContent = mixId ? 'Enregistrer' : 'Créer le mélange';
    }
  });
}

/* ——— Onglet Suppléments ——— */
async function loadSupplementsTab() {
  const el = document.getElementById('tab-supplements');

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
            <thead>
              <tr>
                <th>Nom</th>
                <th>Catégorie</th>
                <th>Dosage</th>
                <th>Fréquence</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              ${list.map(s => `
                <tr>
                  <td><strong>${s.name || s.nom || '—'}</strong></td>
                  <td>${s.category ? `<span class="badge badge-purple">${s.category}</span>` : '—'}</td>
                  <td>${s.dosage || '—'}</td>
                  <td>${s.frequency || '—'}</td>
                  <td style="font-size:0.78rem;color:var(--text-light);">${s.notes || ''}</td>
                </tr>`).join('')}
            </tbody>
          </table>`}
    `;
  } catch (err) {
    el.innerHTML = `<p style="color:var(--danger);">Erreur : ${err.message}</p>`;
    showToast(err.message, 'error');
  }
}

/* ——— Modal supplément ——— */
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
          <label class="form-label">Catégorie</label>
          <select class="form-control" name="category">
            <option value="">—</option>
            <option value="vitamine">Vitamine</option>
            <option value="minéral">Minéral</option>
            <option value="électrolyte">Électrolyte</option>
            <option value="prébiotique">Prébiotique</option>
            <option value="acide aminé">Acide aminé</option>
            <option value="autre">Autre</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Dosage</label>
          <input type="text" class="form-control" name="dosage" placeholder="ex: 2ml/L eau">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Fréquence d'administration</label>
        <select class="form-control" name="frequency">
          <option value="">—</option>
          <option value="quotidien">Quotidien</option>
          <option value="3x/semaine">3x par semaine</option>
          <option value="hebdomadaire">Hebdomadaire</option>
          <option value="avant course">Avant course</option>
          <option value="après course">Après course</option>
          <option value="cure 1 semaine/mois">Cure 1 semaine/mois</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Notes / précautions</label>
        <textarea class="form-control" name="notes" rows="2" placeholder="Contre-indications, conditions..."></textarea>
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
    btn.disabled = true;
    btn.innerHTML = '<span class="loader-inline"></span>';
    try {
      await SportAPI.createSupplement(data);
      showToast('Supplément ajouté !', 'success');
      closeModal();
      loadSupplementsTab();
    } catch (err) {
      showToast(err.message, 'error');
      btn.disabled = false;
      btn.textContent = 'Enregistrer';
    }
  });
}

/* ============================================================
   PLANS ALIMENTAIRES — Page séparée (tabs Plans + Calendrier)
   ============================================================ */

async function loadNutritionPlans() {
  const content = document.getElementById('content');
  const btn = document.getElementById('btn-add');
  if (btn) {
    btn.style.display = '';
    btn.textContent = '+ Nouveau plan';
    btn.onclick = openPlanModal;
  }

  content.innerHTML = `
    <div class="card">
      <div class="tabs-header">
        <button class="tab-btn active" data-tab="plans">📋 Plans alimentaires</button>
        <button class="tab-btn" data-tab="calendar">📅 Calendrier</button>
      </div>
      <div id="tab-plans" class="tab-panel active">
        <div class="loader-spinner"></div>
      </div>
      <div id="tab-calendar" class="tab-panel">
        <div class="loader-spinner"></div>
      </div>
    </div>`;

  document.querySelectorAll('.tab-btn[data-tab]').forEach(tabBtn => {
    tabBtn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn[data-tab]').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      tabBtn.classList.add('active');
      document.getElementById(`tab-${tabBtn.dataset.tab}`)?.classList.add('active');
    });
  });

  _loadPlansTab();
  _loadCalendarTab();
}

/* ——— Onglet Plans ——— */
async function _loadPlansTab() {
  const el = document.getElementById('tab-plans');
  if (!el) return;

  try {
    const plans = await SportAPI.getPlans();
    const list = Array.isArray(plans) ? plans : (plans.items || []);

    const month = new Date().getMonth() + 1;
    const summerAlert = (month >= 6 && month <= 8)
      ? `<div class="alert-card warning" style="margin-bottom:14px;">
          <span class="alert-icon">☀️</span>
          <div class="alert-content">
            <div class="alert-title">Période estivale</div>
            <div class="alert-text">Augmentez l'apport en électrolytes et l'hydratation.</div>
          </div>
        </div>` : '';

    el.innerHTML = summerAlert + (list.length === 0
      ? `<div class="empty-state"><div class="empty-icon">📋</div><h3>Aucun plan</h3><p>Créez votre premier plan alimentaire via le bouton "+ Nouveau plan".</p></div>`
      : `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px;">
          ${list.map(p => `
            <div class="card" style="padding:16px;">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
                <div>
                  <div style="font-weight:600;">${p.name || '—'}</div>
                  ${p.goal ? `<span class="badge badge-success" style="margin-top:4px;font-size:0.72rem;">${p.goal}</span>` : ''}
                </div>
                <button class="btn btn-sm btn-icon" onclick="deletePlan(${p.id})" title="Supprimer">🗑️</button>
              </div>
              ${p.description ? `<p style="font-size:0.8rem;color:var(--text-light);margin-bottom:6px;">${p.description}</p>` : ''}
              ${_renderCompositionPreview(p.composition)}
            </div>`).join('')}
        </div>`);
  } catch (err) {
    el.innerHTML = `<p style="color:var(--danger);">Erreur : ${err.message}</p>`;
    showToast(err.message, 'error');
  }
}

function _renderCompositionPreview(compositionJson) {
  if (!compositionJson) return '<div style="font-size:0.75rem;color:var(--text-light);margin-top:4px;">Composition non définie</div>';
  try {
    const comp = JSON.parse(compositionJson);
    if (!Array.isArray(comp) || comp.length === 0) return '';
    return `<div style="font-size:0.75rem;color:var(--text-light);margin-top:6px;">
      ${comp.map(c => `<span style="background:var(--bg-secondary);border-radius:4px;padding:2px 6px;margin-right:4px;">${c.ingredient_name || c.ingredient_id} ${c.percentage}%</span>`).join('')}
    </div>`;
  } catch { return ''; }
}

async function deletePlan(planId) {
  if (!confirm('Supprimer ce plan alimentaire ? Cette action est irréversible.')) return;
  try {
    await SportAPI.deletePlan(planId);
    showToast('Plan supprimé.', 'success');
    _loadPlansTab();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

/* ============================================================
   COMPOSITION — Helpers pour le formulaire plan
   ============================================================ */

let _compIngOpts = '';
let _compRowCount = 0;

function addCompRow() {
  _compRowCount++;
  const id = _compRowCount;
  const row = document.createElement('div');
  row.className = 'comp-row';
  row.dataset.rowId = id;
  row.style.cssText = 'display:flex;gap:8px;align-items:center;margin-bottom:6px;';
  row.innerHTML = `
    <select class="form-control comp-ing" style="flex:1;">
      <option value="">-- Ingrédient --</option>
      ${_compIngOpts}
    </select>
    <input type="number" class="form-control comp-pct" style="width:80px;" min="0" max="100" step="0.1" placeholder="%">
    <button type="button" class="btn btn-sm btn-icon comp-remove" data-row-id="${id}">🗑️</button>`;
  document.getElementById('comp-rows')?.appendChild(row);
}

function removeCompRow(rowId) {
  const row = document.querySelector(`.comp-row[data-row-id="${rowId}"]`);
  if (row) { row.remove(); _updateCompTotal(); }
}

function _updateCompTotal() {
  const total = [...document.querySelectorAll('.comp-pct')]
    .reduce((sum, el) => sum + (parseFloat(el.value) || 0), 0);
  const el = document.getElementById('comp-total');
  if (!el) return;
  el.textContent = `Total : ${total.toFixed(1)}%`;
  el.style.color = Math.abs(total - 100) < 0.01 ? 'var(--success)' : (total > 100 ? 'var(--danger)' : 'var(--text)');
}

function _getCompositionData() {
  const comp = [];
  document.querySelectorAll('.comp-row').forEach(row => {
    const ingEl = row.querySelector('.comp-ing');
    const pctEl = row.querySelector('.comp-pct');
    if (ingEl?.value && pctEl?.value) {
      const name = ingEl.options[ingEl.selectedIndex]?.text || '';
      comp.push({ ingredient_id: parseInt(ingEl.value), ingredient_name: name, percentage: parseFloat(pctEl.value) });
    }
  });
  return comp;
}

/* ——— Modal nouveau plan ——— */
async function openPlanModal() {
  const overlay = document.getElementById('modal-overlay');
  document.getElementById('modal-title').textContent = '+ Nouveau plan alimentaire';
  document.getElementById('modal').className = 'modal';
  document.getElementById('modal-body').innerHTML = '<div class="loader-spinner"></div>';
  overlay.style.display = 'flex';

  const ingredients = await SportAPI.getIngredients().catch(() => []);
  const ingList = Array.isArray(ingredients) ? ingredients : [];

  _compIngOpts = ingList.map(it => `<option value="${it.id}">${it.name || '—'}</option>`).join('');
  _compRowCount = 0;

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

      <div style="margin:16px 0 6px;font-weight:600;font-size:0.9rem;">🌾 Composition</div>
      <p style="font-size:0.78rem;color:var(--text-light);margin-bottom:8px;">Définissez les ingrédients et leur pourcentage. Le total doit être égal à 100%.</p>
      <div id="comp-rows"></div>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
        <button type="button" class="btn btn-secondary btn-sm" id="btn-add-comp-row">+ Ingrédient</button>
        <span id="comp-total" style="font-size:0.85rem;font-weight:600;color:var(--text-light);">Total : 0%</span>
      </div>

      <div class="modal-footer" style="padding:0;margin-top:4px;">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Annuler</button>
        <button type="submit" class="btn btn-primary">Créer le plan</button>
      </div>
    </form>`;

  document.getElementById('modal-close').onclick = closeModal;
  overlay.onclick = (e) => { if (e.target === overlay) closeModal(); };

  addCompRow();

  document.getElementById('btn-add-comp-row').addEventListener('click', addCompRow);
  document.getElementById('comp-rows').addEventListener('click', (e) => {
    const btn = e.target.closest('.comp-remove');
    if (btn) removeCompRow(parseInt(btn.dataset.rowId));
  });
  document.getElementById('comp-rows').addEventListener('input', (e) => {
    if (e.target.classList.contains('comp-pct')) _updateCompTotal();
  });

  document.getElementById('form-plan').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = {};
    for (const [k, v] of fd.entries()) {
      if (v !== '') data[k] = v;
    }

    const comp = _getCompositionData();
    if (comp.length > 0) {
      const total = comp.reduce((s, r) => s + r.percentage, 0);
      if (Math.abs(total - 100) > 0.1) {
        showToast(`Total des % doit être 100% (actuellement ${total.toFixed(1)}%)`, 'warning');
        return;
      }
      data.composition = JSON.stringify(comp);
    }

    const submitBtn = e.target.querySelector('[type=submit]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="loader-inline"></span>';
    try {
      await SportAPI.createPlan(data);
      showToast('Plan alimentaire créé !', 'success');
      closeModal();
      _loadPlansTab();
    } catch (err) {
      showToast(err.message, 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Créer le plan';
    }
  });
}

/* ============================================================
   CALENDRIER HEBDOMADAIRE
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
      <!-- Navigation semaine -->
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;flex-wrap:wrap;">
        <button class="btn btn-secondary btn-sm" id="cal-prev-week">← Préc.</button>
        <span id="cal-week-label" style="font-weight:600;font-size:0.88rem;flex:1;"></span>
        <button class="btn btn-secondary btn-sm" id="cal-next-week">Suiv. →</button>
      </div>

      <!-- Sélection cible -->
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

      <!-- Grille 7 jours -->
      <div id="cal-grid">
        ${_renderCalGrid([], planOpts)}
      </div>

      <div style="margin:14px 0;display:flex;gap:10px;">
        <button class="btn btn-primary" id="cal-save-btn">💾 Enregistrer le planning</button>
      </div>

      <!-- Vue résolue par pigeon -->
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

    // Prev / next semaine
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

    // Target type → afficher/masquer pigeon select
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

    // Pré-remplir le sélecteur pigeon vue résolue
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
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    // Charger la semaine courante
    await _calLoad(planOpts);

  } catch (err) {
    el.innerHTML = `<p style="color:var(--danger);">Erreur : ${err.message}</p>`;
    showToast(err.message, 'error');
  }
}

function _renderCalGrid(assignments, planOpts) {
  const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
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

    // Reconstruire les options plans (fraîches)
    const plans = await SportAPI.getPlans().catch(() => []);
    const planList = Array.isArray(plans) ? plans : [];
    const opts = planList.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
    document.getElementById('cal-grid').innerHTML = _renderCalGrid(_calAssignments, opts);

    // Sélectionner les plans existants dans les dropdowns
    _calAssignments.forEach(a => {
      const sel = document.querySelector(`.cal-day-plan[data-day="${a.day_of_week}"]`);
      if (sel) {
        sel.value = a.plan_id;
        sel.dataset.existingId = a.id;
      }
    });
  } catch (err) {
    showToast(err.message, 'error');
  }
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
      const day = parseInt(sel.dataset.day);
      const existingId = sel.dataset.existingId ? parseInt(sel.dataset.existingId) : null;
      const planId = sel.value ? parseInt(sel.value) : null;

      if (planId) {
        if (existingId) {
          // Supprimer puis recréer (upsert via delete+create)
          ops.push(
            SportAPI.deleteAssignment(existingId).catch(() => {}).then(() =>
              SportAPI.saveAssignment({ plan_id: planId, pigeon_id: pigeonId, group_name: groupName, day_of_week: day, week_start: _calWeekStart })
            )
          );
        } else {
          ops.push(
            SportAPI.saveAssignment({ plan_id: planId, pigeon_id: pigeonId, group_name: groupName, day_of_week: day, week_start: _calWeekStart })
          );
        }
      } else if (existingId) {
        ops.push(SportAPI.deleteAssignment(existingId).catch(() => {}));
      }
    }

    await Promise.all(ops);
    showToast('Planning enregistré !', 'success');

    const plans = await SportAPI.getPlans().catch(() => []);
    const opts = (Array.isArray(plans) ? plans : []).map(p => `<option value="${p.id}">${p.name}</option>`).join('');
    await _calLoad(opts);
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = '💾 Enregistrer le planning';
  }
}

function _renderResolvedCalendar(resolved) {
  const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
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
  const fd = new FormData(form);
  const data = {};
  for (const [k, v] of fd.entries()) {
    if (v === '') continue;
    if (numericFields.includes(k)) data[k] = parseFloat(v);
    else data[k] = v;
  }
  return data;
}
