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
                    <div style="font-weight:600;font-size:0.95rem;">${m.name || m.nom || '—'}</div>
                    ${m.category ? `<span class="badge badge-info" style="margin-top:4px;">${m.category}</span>` : ''}
                  </div>
                  <span style="font-size:1.5rem;">🔀</span>
                </div>
                ${m.description ? `<p style="font-size:0.8rem;color:var(--text-light);margin-bottom:8px;">${m.description}</p>` : ''}
                ${m.energy_kcal ? `<div style="font-size:0.8rem;"><strong>${m.energy_kcal} kcal/100g</strong></div>` : ''}
                ${m.ingredients_count ? `<div style="font-size:0.78rem;color:var(--text-light);margin-top:4px;">${m.ingredients_count} ingrédient(s)</div>` : ''}
              </div>`).join('')}
          </div>`}
    `;
  } catch (err) {
    el.innerHTML = `<p style="color:var(--danger);">Erreur : ${err.message}</p>`;
    showToast(err.message, 'error');
  }
}

/* ——— Modal mélange ——— */
function openMixModal() {
  const overlay = document.getElementById('modal-overlay');
  document.getElementById('modal-title').textContent = '+ Nouveau mélange';
  document.getElementById('modal').className = 'modal';

  document.getElementById('modal-body').innerHTML = `
    <form id="form-mix">
      <div class="form-group">
        <label class="form-label">Nom du mélange *</label>
        <input type="text" class="form-control" name="name" required placeholder="ex: Mélange course longue distance">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Catégorie</label>
          <select class="form-control" name="category">
            <option value="">—</option>
            <option value="entraînement">Entraînement</option>
            <option value="course">Course</option>
            <option value="repos">Repos</option>
            <option value="récupération">Récupération</option>
            <option value="hiver">Hiver</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Énergie estimée (kcal/100g)</label>
          <input type="number" class="form-control" name="energy_kcal" step="1" placeholder="ex: 320">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <textarea class="form-control" name="description" rows="3" placeholder="Composition, usage recommandé..."></textarea>
      </div>
      <div class="modal-footer" style="padding:0;margin-top:16px;">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Annuler</button>
        <button type="submit" class="btn btn-primary">Créer le mélange</button>
      </div>
    </form>`;

  overlay.style.display = 'flex';
  document.getElementById('modal-close').onclick = closeModal;
  overlay.onclick = (e) => { if (e.target === overlay) closeModal(); };

  document.getElementById('form-mix').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = parseFormData(e.target, ['energy_kcal'], ['name']);
    const btn = e.target.querySelector('[type=submit]');
    btn.disabled = true;
    btn.innerHTML = '<span class="loader-inline"></span>';
    try {
      await SportAPI.createMix(data);
      showToast('Mélange créé !', 'success');
      closeModal();
      loadMixesTab();
    } catch (err) {
      showToast(err.message, 'error');
      btn.disabled = false;
      btn.textContent = 'Créer le mélange';
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
   PLANS ALIMENTAIRES — Page séparée
   ============================================================ */
async function loadNutritionPlans() {
  const content = document.getElementById('content');
  const btn = document.getElementById('btn-add');
  if (btn) {
    btn.style.display = '';
    btn.textContent = '+ Nouveau plan';
    btn.onclick = openPlanModal;
  }

  content.innerHTML = '<div class="loader-spinner"></div>';

  try {
    const [plans, mixes] = await Promise.all([
      SportAPI.getPlans(),
      SportAPI.getMixes().catch(() => [])
    ]);
    const list = Array.isArray(plans) ? plans : (plans.items || []);
    const mixList = Array.isArray(mixes) ? mixes : (mixes.items || []);

    // Alerte contextuelle si mois d'été (chaleur)
    const month = new Date().getMonth() + 1; // 1-12
    const summerAlert = (month >= 6 && month <= 8)
      ? `<div class="alert-card warning" style="margin-bottom:16px;">
          <span class="alert-icon">☀️</span>
          <div class="alert-content">
            <div class="alert-title">Période estivale détectée</div>
            <div class="alert-text">Augmentez l'apport en électrolytes et hydratation. Réduisez les séances en milieu de journée.</div>
          </div>
        </div>` : '';

    content.innerHTML = `
      ${summerAlert}

      <!-- Plans existants -->
      <div class="card" style="margin-bottom:20px;">
        <div class="card-header">
          <div class="card-title">📋 Plans alimentaires (${list.length})</div>
        </div>
        ${list.length === 0
          ? `<div class="empty-state"><div class="empty-icon">📋</div><h3>Aucun plan</h3><p>Créez votre premier plan alimentaire.</p></div>`
          : `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px;">
              ${list.map(p => `
                <div class="card" style="padding:16px;cursor:pointer;" onclick="openPlanDetail(${p.id || 'null'}, ${JSON.stringify(p).replace(/"/g, '&quot;')})">
                  <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                    <div>
                      <div style="font-weight:600;">${p.name || p.nom || '—'}</div>
                      ${p.goal ? `<span class="badge badge-success" style="margin-top:4px;">${p.goal}</span>` : ''}
                    </div>
                    <span style="font-size:1.4rem;">📋</span>
                  </div>
                  ${p.description ? `<p style="font-size:0.8rem;color:var(--text-light);margin-top:8px;">${p.description}</p>` : ''}
                  <div style="font-size:0.78rem;color:var(--text-light);margin-top:8px;">
                    ${p.start_date ? `Du ${formatDate(p.start_date)}` : ''}
                    ${p.end_date ? ` au ${formatDate(p.end_date)}` : ''}
                  </div>
                </div>`).join('')}
            </div>`}
      </div>

      <!-- Calendrier semaine -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">📅 Calendrier nutritionnel — Semaine en cours</div>
        </div>
        ${renderWeeklyCalendar(list, mixList)}
      </div>
    `;

  } catch (err) {
    content.innerHTML = `<div class="card"><p style="color:var(--danger);">Erreur : ${err.message}</p></div>`;
    showToast(err.message, 'error');
  }
}

/* ——— Calendrier semaine ——— */
function renderWeeklyCalendar(plans, mixes) {
  const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  const today = new Date().getDay(); // 0=dim
  const todayIdx = today === 0 ? 6 : today - 1;

  return `
    <div class="week-grid">
      ${days.map((day, idx) => {
        const isToday = idx === todayIdx;
        // Trouver plan actif si disponible
        const plan = plans[0]; // simplification : afficher plan courant
        return `
          <div class="day-card ${isToday ? 'today' : ''}">
            <div class="day-card-header">${day}${isToday ? ' ★' : ''}</div>
            ${plan ? `
              <div style="font-size:0.75rem;font-weight:600;color:var(--accent);margin-bottom:4px;">${plan.name || 'Plan actif'}</div>
              <div style="font-size:0.72rem;color:var(--text-light);">
                ${plan.goal || ''}
              </div>
            ` : `<div style="font-size:0.75rem;color:var(--text-light);">Aucun plan</div>`}
          </div>`;
      }).join('')}
    </div>`;
}

/* ——— Modal nouveau plan ——— */
async function openPlanModal() {
  const overlay = document.getElementById('modal-overlay');
  document.getElementById('modal-title').textContent = '+ Nouveau plan alimentaire';
  document.getElementById('modal').className = 'modal';

  const today = new Date().toISOString().split('T')[0];
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

  document.getElementById('modal-body').innerHTML = `
    <form id="form-plan">
      <div class="form-group">
        <label class="form-label">Nom du plan *</label>
        <input type="text" class="form-control" name="name" required placeholder="ex: Plan pré-saison 2025">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Objectif</label>
          <select class="form-control" name="goal">
            <option value="">—</option>
            <option value="performance">Performance</option>
            <option value="récupération">Récupération</option>
            <option value="maintien">Maintien</option>
            <option value="préparation course">Préparation course</option>
            <option value="hiver">Hiver</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Quantité quotidienne (g)</label>
          <input type="number" class="form-control" name="daily_quantity_g" step="5" placeholder="ex: 40">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Date de début</label>
          <input type="date" class="form-control" name="start_date" value="${today}">
        </div>
        <div class="form-group">
          <label class="form-label">Date de fin</label>
          <input type="date" class="form-control" name="end_date" value="${nextWeek}">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Description / instructions</label>
        <textarea class="form-control" name="description" rows="3" placeholder="Instructions, adaptations..."></textarea>
      </div>
      <div class="modal-footer" style="padding:0;margin-top:16px;">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Annuler</button>
        <button type="submit" class="btn btn-primary">Créer le plan</button>
      </div>
    </form>`;

  overlay.style.display = 'flex';
  document.getElementById('modal-close').onclick = closeModal;
  overlay.onclick = (e) => { if (e.target === overlay) closeModal(); };

  document.getElementById('form-plan').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = parseFormData(e.target, ['daily_quantity_g'], ['name']);
    const btn = e.target.querySelector('[type=submit]');
    btn.disabled = true;
    btn.innerHTML = '<span class="loader-inline"></span>';
    try {
      await SportAPI.createPlan(data);
      showToast('Plan alimentaire créé !', 'success');
      closeModal();
      loadNutritionPlans();
    } catch (err) {
      showToast(err.message, 'error');
      btn.disabled = false;
      btn.textContent = 'Créer le plan';
    }
  });
}

/* ——— Utilitaire : parser FormData avec conversion types ——— */
function parseFormData(form, numericFields = [], requiredFields = []) {
  const fd = new FormData(form);
  const data = {};
  for (const [k, v] of fd.entries()) {
    if (v === '') continue; // ignorer champs vides
    if (numericFields.includes(k)) data[k] = parseFloat(v);
    else data[k] = v;
  }
  return data;
}
