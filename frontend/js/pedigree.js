// ===== AFFICHAGE PEDIGREE =====
async function openPedigree(pigeonId) {
  openModal('🌳 Arbre généalogique', '<div class="loading">Chargement...</div>');
  
  try {
    const data = await apiFetch(`/pigeons/${pigeonId}/pedigree`);
    const html = buildPedigreeHTML(data);
    document.getElementById('modal-body').innerHTML = html;
    
    // Agrandir la modal pour le pedigree
    document.getElementById('modal').style.maxWidth = '95vw';
    document.getElementById('modal').style.width = '1100px';
  } catch(err) {
    document.getElementById('modal-body').innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">❌</div>
        <div class="empty-state-text">Erreur de chargement</div>
      </div>`;
  }
}

function buildPedigreeHTML(pigeon) {
  return `
    <div style="overflow-x:auto; padding-bottom:16px;">
      <div style="display:flex; align-items:stretch; gap:0; min-width:900px;">
        
        <!-- COLONNE 1 : Pigeon principal -->
        <div style="display:flex; align-items:center; flex-shrink:0;">
          ${pedigreeCard(pigeon, 'principal')}
        </div>

        ${pigeon.pere || pigeon.mere ? `
        <!-- CONNECTEUR -->
        <div style="display:flex; align-items:center;">
          ${connecteur()}
        </div>

        <!-- COLONNE 2 : Parents -->
        <div style="display:flex; flex-direction:column; justify-content:center; gap:8px; flex-shrink:0;">
          <div style="display:flex; align-items:center;">
            ${pedigreeCard(pigeon.pere, 'pere')}
            ${(pigeon.pere?.pere || pigeon.pere?.mere) ? connecteur() : ''}
          </div>
          <div style="display:flex; align-items:center;">
            ${pedigreeCard(pigeon.mere, 'mere')}
            ${(pigeon.mere?.pere || pigeon.mere?.mere) ? connecteur() : ''}
          </div>
        </div>

        <!-- COLONNE 3 : Grands-parents -->
        ${hasGeneration(pigeon, 3) ? `
        <div style="display:flex; flex-direction:column; justify-content:center; gap:4px; flex-shrink:0;">
          ${pedigreeCard(pigeon.pere?.pere, 'gp')}
          ${pedigreeCard(pigeon.pere?.mere, 'gp')}
          ${pedigreeCard(pigeon.mere?.pere, 'gp')}
          ${pedigreeCard(pigeon.mere?.mere, 'gp')}
        </div>` : ''}

        <!-- COLONNE 4 : Arrière-grands-parents -->
        ${hasGeneration(pigeon, 4) ? `
        <div style="display:flex; flex-direction:column; justify-content:center; gap:2px; flex-shrink:0;">
          ${pedigreeCard(pigeon.pere?.pere?.pere, 'agp')}
          ${pedigreeCard(pigeon.pere?.pere?.mere, 'agp')}
          ${pedigreeCard(pigeon.pere?.mere?.pere, 'agp')}
          ${pedigreeCard(pigeon.pere?.mere?.mere, 'agp')}
          ${pedigreeCard(pigeon.mere?.pere?.pere, 'agp')}
          ${pedigreeCard(pigeon.mere?.pere?.mere, 'agp')}
          ${pedigreeCard(pigeon.mere?.mere?.pere, 'agp')}
          ${pedigreeCard(pigeon.mere?.mere?.mere, 'agp')}
        </div>` : ''}
        ` : ''}

      </div>
    </div>

    <div class="form-actions">
      <button class="btn btn-secondary" onclick="
        document.getElementById('modal').style.width='560px';
        closeModal();">
        Fermer
      </button>
    </div>`;
}

// ===== CARTE ANCETRE =====
function pedigreeCard(p, type) {
  // Tailles selon la génération
  const sizes = {
    principal: { w: '180px', fontSize: '13px', padding: '14px' },
    pere:      { w: '160px', fontSize: '12px', padding: '10px' },
    mere:      { w: '160px', fontSize: '12px', padding: '10px' },
    gp:        { w: '140px', fontSize: '11px', padding: '8px'  },
    agp:       { w: '120px', fontSize: '10px', padding: '6px'  },
  };

  const { w, fontSize, padding } = sizes[type] || sizes.gp;

  // Couleurs selon sexe
  const colors = {
    principal: { bg: '#EBF5FB', border: '#2980B9', title: '#1A5276' },
    mâle:      { bg: '#EBF5FB', border: '#2980B9', title: '#1A5276' },
    femelle:   { bg: '#FDEDEC', border: '#C0392B', title: '#922B21' },
  };

  if (!p) {
    // Case vide
    return `
      <div style="
        width:${w}; min-height:60px;
        border: 2px dashed var(--border);
        border-radius:8px;
        margin:2px;
        display:flex; align-items:center; justify-content:center;
        color:var(--text-light); font-size:11px;">
        Inconnu
      </div>`;
  }

  const sexe = p.sexe || 'mâle';
  const color = type === 'principal' ? colors.principal : (colors[sexe] || colors['mâle']);
  const sexeIcon = sexe === 'femelle' ? '♀️' : '♂️';

  return `
    <div style="
      width:${w};
      background:${color.bg};
      border:2px solid ${color.border};
      border-radius:8px;
      padding:${padding};
      margin:2px;
      font-size:${fontSize};
      cursor:pointer;
      transition: transform 0.15s, box-shadow 0.15s;
      box-shadow: 0 2px 6px rgba(0,0,0,0.08);"
      onmouseover="this.style.transform='scale(1.03)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.15)';"
      onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 2px 6px rgba(0,0,0,0.08)';"
      onclick="openDetailPigeon('${p.id}'); 
        document.getElementById('modal').style.width='560px';">
      
      ${type === 'principal' && p.photo ? `
        <img src="http://localhost:8001${p.photo}"
          style="width:50px; height:50px; border-radius:50%; 
          object-fit:cover; display:block; margin:0 auto 8px; 
          border:2px solid ${color.border};">` : ''}

      <div style="font-weight:700; color:${color.title}; 
        word-break:break-all; margin-bottom:4px;">
        ${sexeIcon} ${p.matricule}
      </div>

      ${p.annee_naissance ? `
        <div style="color:var(--text-light); margin-bottom:2px;">
          📅 ${p.annee_naissance}
        </div>` : ''}

      ${p.couleur_plumage ? `
        <div style="color:var(--text-light);">
          🎨 ${p.couleur_plumage}
        </div>` : ''}

    </div>`;
}

// ===== CONNECTEUR =====
function connecteur() {
  return `
    <div style="width:24px; height:2px; 
      background:var(--border); flex-shrink:0;">
    </div>`;
}

// ===== VÉRIFIER SI GÉNÉRATION EXISTE =====
function hasGeneration(pigeon, gen) {
  if (gen === 3) {
    return pigeon.pere?.pere || pigeon.pere?.mere || 
           pigeon.mere?.pere || pigeon.mere?.mere;
  }
  if (gen === 4) {
    return pigeon.pere?.pere?.pere || pigeon.pere?.pere?.mere ||
           pigeon.pere?.mere?.pere || pigeon.pere?.mere?.mere ||
           pigeon.mere?.pere?.pere || pigeon.mere?.pere?.mere ||
           pigeon.mere?.mere?.pere || pigeon.mere?.mere?.mere;
  }
  return false;
}