async function loadDashboard() {
  const content = document.getElementById('content');

  // Retry jusqu'à 5 fois avec 1 seconde d'intervalle si l'API n'est pas prête
  const MAX_RETRIES = 5;
  let pigeons, lignees;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    content.innerHTML = `<div class="loading">${t('dashboard.connecting', { attempt, max: MAX_RETRIES })}</div>`;
    try {
      [pigeons, lignees] = await Promise.all([
        apiFetch('/pigeons/'),
        apiFetch('/lignees/')
      ]);
      break;
    } catch (err) {
      if (attempt === MAX_RETRIES) {
        content.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">⚠️</div>
            <div class="empty-state-text">${t('dashboard.api_unreachable')}</div>
            <div class="empty-state-sub">${err.message || t('dashboard.network_error')}</div>
            <button class="btn btn-primary" style="margin-top:16px;" onclick="retryLoad()">
              ${t('common.retry')}
            </button>
          </div>`;
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Calcul des stats
  const actifs = pigeons.filter(p => p.statut === 'actif').length;
  const reproducteurs = pigeons.filter(p => p.statut === 'reproducteur').length;
  const concours = pigeons.filter(p => p.statut === 'concours').length;
  const perdus = pigeons.filter(p => p.statut === 'perdu').length;

  // Répartition par lignée
  const parLignee = {};
  pigeons.forEach(p => {
    const nom = p.lignee_id
      ? (lignees.find(l => l.id === p.lignee_id)?.nom || t('lignee.unknown'))
      : t('lignee.none');
    parLignee[nom] = (parLignee[nom] || 0) + 1;
  });

  content.innerHTML = `
    <!-- STATS -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">🕊️</div>
        <div>
          <div class="stat-value">${pigeons.length}</div>
          <div class="stat-label">${t('dashboard.stat.total_pigeons')}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">✅</div>
        <div>
          <div class="stat-value">${actifs}</div>
          <div class="stat-label">${t('dashboard.stat.active')}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">💑</div>
        <div>
          <div class="stat-value">${reproducteurs}</div>
          <div class="stat-label">${t('dashboard.stat.breeders')}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🏆</div>
        <div>
          <div class="stat-value">${concours}</div>
          <div class="stat-label">${t('dashboard.stat.racing')}</div>
        </div>
      </div>
    </div>

    <!-- GRILLE INFOS -->
    <div class="content-grid">

      <!-- RÉPARTITION PAR LIGNÉE -->
      <div class="card">
        <div class="card-title">${t('dashboard.lignee_distribution.title')}</div>
        ${Object.keys(parLignee).length === 0
          ? `<div class="empty-state">
               <div class="empty-state-icon">🌳</div>
               <div class="empty-state-text">${t('dashboard.lignee_distribution.empty')}</div>
             </div>`
          : `<div class="table-container">
               <table>
                 <thead>
                   <tr>
                     <th>${t('dashboard.table.lignee')}</th>
                     <th>${t('dashboard.table.pigeons')}</th>
                     <th>%</th>
                   </tr>
                 </thead>
                 <tbody>
                   ${Object.entries(parLignee).map(([nom, count]) => {
                     const lig = lignees.find(l => l.nom === nom);
                     const style = ligneeStyle(lig);
                     return `
                     <tr>
                       <td>
                         ${lig
                           ? `<span style="${style.badge}">${nom}</span>`
                           : `<span style="color:var(--text-light)">${nom}</span>`}
                       </td>
                       <td><strong>${count}</strong></td>
                       <td>${Math.round(count / pigeons.length * 100)}%</td>
                     </tr>`;
                   }).join('')}
                 </tbody>
               </table>
             </div>`
        }
      </div>

      <!-- RÉPARTITION PAR STATUT -->
      <div class="card">
        <div class="card-title">${t('dashboard.status_distribution.title')}</div>
        <div style="display:flex; flex-direction:column; gap:12px; margin-top:8px;">
          ${[
            { label: t('dashboard.stat.active'), count: actifs, color: '#27AE60', emoji: '✅' },
            { label: t('dashboard.stat.breeders'), count: reproducteurs, color: '#2980B9', emoji: '💑' },
            { label: t('dashboard.stat.racing'), count: concours, color: '#F39C12', emoji: '🏆' },
            { label: t('dashboard.stat.lost'), count: perdus, color: '#E74C3C', emoji: '❌' },
          ].map(({ label, count, color, emoji }) => `
            <div style="display:flex; align-items:center; gap:12px;">
              <span>${emoji}</span>
              <div style="flex:1">
                <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                  <span style="font-size:13px; font-weight:500;">${label}</span>
                  <span style="font-size:13px; color:var(--text-light);">${count}</span>
                </div>
                <div style="background:var(--border); border-radius:4px; height:6px;">
                  <div style="background:${color}; width:${
                    pigeons.length ? Math.round(count / pigeons.length * 100) : 0
                  }%; height:6px; border-radius:4px; transition:width 0.5s;"></div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- DERNIERS PIGEONS -->
      <div class="card" style="grid-column: span 2;">
        <div class="card-title">${t('dashboard.recent.title')}</div>
        ${pigeons.length === 0
          ? `<div class="empty-state">
               <div class="empty-state-icon">🕊️</div>
               <div class="empty-state-text">${t('dashboard.recent.empty')}</div>
               <div class="empty-state-sub">${t('dashboard.recent.empty_sub')}</div>
             </div>`
          : `<div class="table-container">
               <table>
                 <thead>
                   <tr>
                     <th>${t('dashboard.table.photo')}</th>
                     <th>${t('dashboard.table.matricule')}</th>
                     <th>${t('dashboard.table.sexe')}</th>
                     <th>${t('dashboard.table.statut')}</th>
                     <th>${t('dashboard.table.case')}</th>
                   </tr>
                 </thead>
                 <tbody>
                   ${pigeons.slice(-5).reverse().map(p => {
                     const lignee = lignees.find(l => l.id === p.lignee_id);
                     const style = ligneeStyle(lignee);
                     return `
                     <tr style="cursor:pointer; ${style.rowBg} ${style.borderLeft}"
                       onclick="navigateTo('pigeons')">
                       <td>${pigeonPhoto(p.photo, p.matricule)}</td>
                       <td><strong>${p.matricule}</strong></td>
                       <td>${p.sexe === 'male' ? t('gender.male') : t('gender.female')}</td>
                       <td>${badgeStatut(p.statut)}</td>
                       <td>${p.colombier_case || '—'}</td>
                     </tr>`;
                   }).join('')}
                 </tbody>
               </table>
             </div>`
        }
      </div>

    </div>
  `;
}