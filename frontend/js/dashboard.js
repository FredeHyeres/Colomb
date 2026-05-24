async function loadDashboard() {
  const content = document.getElementById('content');

  // Retry jusqu'à 5 fois avec 1 seconde d'intervalle si l'API n'est pas prête
  const MAX_RETRIES = 5;
  let pigeons, lignees;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    content.innerHTML = `<div class="loading">Connexion à l'API... (tentative ${attempt}/${MAX_RETRIES})</div>`;
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
            <div class="empty-state-text">Impossible de contacter l'API</div>
            <div class="empty-state-sub">${err.message || 'Erreur réseau — vérifiez que le backend est démarré'}</div>
            <button class="btn btn-primary" style="margin-top:16px;" onclick="retryLoad()">
              🔄 Réessayer
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
      ? (lignees.find(l => l.id === p.lignee_id)?.nom || 'Inconnue')
      : 'Sans lignée';
    parLignee[nom] = (parLignee[nom] || 0) + 1;
  });

  content.innerHTML = `
    <!-- STATS -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">🕊️</div>
        <div>
          <div class="stat-value">${pigeons.length}</div>
          <div class="stat-label">Total pigeons</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">✅</div>
        <div>
          <div class="stat-value">${actifs}</div>
          <div class="stat-label">Actifs</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">💑</div>
        <div>
          <div class="stat-value">${reproducteurs}</div>
          <div class="stat-label">Reproducteurs</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🏆</div>
        <div>
          <div class="stat-value">${concours}</div>
          <div class="stat-label">En concours</div>
        </div>
      </div>
    </div>

    <!-- GRILLE INFOS -->
    <div class="content-grid">

      <!-- RÉPARTITION PAR LIGNÉE -->
      <div class="card">
        <div class="card-title">Répartition par lignée</div>
        ${Object.keys(parLignee).length === 0
          ? `<div class="empty-state">
               <div class="empty-state-icon">🌳</div>
               <div class="empty-state-text">Aucune donnée</div>
             </div>`
          : `<div class="table-container">
               <table>
                 <thead>
                   <tr>
                     <th>Lignée</th>
                     <th>Pigeons</th>
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
        <div class="card-title">Répartition par statut</div>
        <div style="display:flex; flex-direction:column; gap:12px; margin-top:8px;">
          ${[
            { label: 'Actifs', count: actifs, color: '#27AE60', emoji: '✅' },
            { label: 'Reproducteurs', count: reproducteurs, color: '#2980B9', emoji: '💑' },
            { label: 'En concours', count: concours, color: '#F39C12', emoji: '🏆' },
            { label: 'Perdus', count: perdus, color: '#E74C3C', emoji: '❌' },
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
        <div class="card-title">Derniers pigeons enregistrés</div>
        ${pigeons.length === 0
          ? `<div class="empty-state">
               <div class="empty-state-icon">🕊️</div>
               <div class="empty-state-text">Aucun pigeon enregistré</div>
               <div class="empty-state-sub">Commencez par ajouter vos premiers pigeons</div>
             </div>`
          : `<div class="table-container">
               <table>
                 <thead>
                   <tr>
                     <th>Photo</th>
                     <th>Matricule</th>
                     <th>Sexe</th>
                     <th>Statut</th>
                     <th>Case</th>
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
                       <td>${p.sexe === 'male' ? '♂️ Mâle' : '♀️ Femelle'}</td>
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