// ===== CONFIGURATION =====
const API_URL = 'http://localhost:8001/api';

// ===== UTILITAIRES API =====
async function apiFetch(endpoint, options = {}) {
  // Les erreurs réseau (API non joignable) sont propagées silencieusement
  // pour permettre au appelant de gérer le retry.
  // Seules les erreurs HTTP (4xx/5xx) déclenchent une notification.
  let response;
  try {
    response = await fetch(`${API_URL}${endpoint}`, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options
    });
  } catch (err) {
    throw err;
  }
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const msg = error.detail || 'Erreur API';
    const err = new Error(msg);
    err.status = response.status;
    if (response.status !== 409) showNotification(msg, 'danger');
    throw err;
  }
  if (response.status === 204) return null;
  return await response.json();
}

// ===== NOTIFICATIONS =====
function showNotification(message, type = 'success') {
  const notif = document.createElement('div');
  notif.style.cssText = `
    position: fixed; top: 20px; right: 20px; z-index: 9999;
    padding: 14px 20px; border-radius: 10px; font-size: 14px;
    font-weight: 600; color: white; box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    animation: slideIn 0.3s ease;
    background: ${type === 'success' ? '#27AE60' : type === 'danger' ? '#E74C3C' : '#2980B9'};
  `;
  notif.textContent = message;
  document.body.appendChild(notif);
  setTimeout(() => notif.remove(), 3000);
}

// ===== MODAL =====
function openModal(title, bodyHTML) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHTML;
  document.getElementById('modal-overlay').style.display = 'flex';
}

function closeModal() {
  document.getElementById('modal-overlay').style.display = 'none';
}

document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-overlay').addEventListener('click', (e) => {
  if (e.target.id === 'modal-overlay') closeModal();
});

// ===== NAVIGATION =====
const pages = {
  dashboard: {
    title: 'Tableau de bord',
    load: () => loadDashboard(),
    addLabel: null
  },
  pigeons: {
    title: 'Pigeons',
    load: () => loadPigeons(),
    addLabel: '+ Ajouter un pigeon'
  },
  lignees: {
    title: 'Lignées',
    load: () => loadLignees(),
    addLabel: '+ Ajouter une lignée'
  },
  performances: {
    title: 'Performances',
    load: () => loadPerformances(),
    addLabel: '+ Ajouter une performance'
  },
  sante: {
    title: 'Santé',
    load: () => loadSante(),
    addLabel: '+ Ajouter un événement'
  },
  couples: {
    title: 'Couples & Reproduction',
    load: () => loadCouples(),
    addLabel: '+ Nouveau couple'
  },
  eleveur: {
    title: 'Mon Élevage',
    load: () => loadEleveur(),
    addLabel: null
  },
  calendrier: {
    title: 'Calendrier',
    load: () => loadCalendrier(),
    addLabel: null
  }
};

let currentPage = 'dashboard';

function navigateTo(page) {
  currentPage = page;

  // Mise à jour nav active
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === page);
  });

  // Titre
  document.getElementById('page-title').textContent = pages[page].title;

  // Bouton ajouter
  const btnAdd = document.getElementById('btn-add');
  if (pages[page].addLabel) {
    btnAdd.textContent = pages[page].addLabel;
    btnAdd.style.display = 'block';
  } else {
    btnAdd.style.display = 'none';
  }

  // Charger le contenu
  document.getElementById('content').innerHTML = '<div class="loading">Chargement...</div>';
  pages[page].load();
}

// Clics sur la nav
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', (e) => {
    // Laisser passer les vrais liens externes (href != "#")
    if (item.getAttribute('href') !== '#') return;
    e.preventDefault();
    navigateTo(item.dataset.page);
  });
});

// Bouton ajouter
document.getElementById('btn-add').addEventListener('click', () => {
  if (currentPage === 'lignees') openAddLignee();
  if (currentPage === 'pigeons') openAddPigeon();
  if (currentPage === 'performances') openAddPerformance();
  if (currentPage === 'sante') openAddSante();
  if (currentPage === 'couples') openAddCouple();
});

// ===== BADGES STATUT =====
function badgeStatut(statut) {
  const map = {
    'actif':        ['badge-actif',        'Actif'],
    'reproducteur': ['badge-reproducteur', 'Reproducteur'],
    'concours':     ['badge-concours',     'Concours'],
    'perdu':        ['badge-perdu',        'Perdu'],
    'retraite':     ['badge-retraite',     'Retraité'],
    'decede':       ['badge-decede',       'Décédé'],
  };
  const [cls, label] = map[statut] || ['', statut];
  return `<span class="badge ${cls}">${label}</span>`;
}

// ===== PHOTO PIGEON =====
function pigeonPhoto(photo, nom) {
  if (photo) {
    return `<img src="http://localhost:8001${photo}"
            class="pigeon-photo" alt="${nom}">`;
  }
  return `<div class="pigeon-photo-placeholder">🕊️</div>`;
}

// ===== STYLE LIGNÉE =====
function ligneeStyle(lignee) {
  if (!lignee || !lignee.couleur_label) return { rowBg: '', borderLeft: '', badge: '' };
  const c = lignee.couleur_label;
  return {
    rowBg: `background: ${c}1A;`,
    borderLeft: `border-left: 3px solid ${c};`,
    badge: `background:${c}; color:white; padding:3px 8px; border-radius:12px; font-size:11px; font-weight:600;`,
  };
}

// ===== RETRY =====
function retryLoad() {
  navigateTo(currentPage);
}

// ===== ROUTING PAR HASH =====
function getPageFromHash() {
  const hash = window.location.hash.replace('#', '').split('?')[0].trim();
  return pages[hash] ? hash : null;
}

function show404() {
  const hash = window.location.hash || '#';
  document.getElementById('page-title').textContent = 'Page introuvable';
  document.getElementById('btn-add').style.display = 'none';
  document.getElementById('content').innerHTML = `
    <div style="text-align:center; padding:80px 20px;">
      <div style="font-size:64px; margin-bottom:16px;">🔍</div>
      <h2 style="font-family:'Playfair Display',serif; font-size:28px; margin-bottom:12px;">Page introuvable</h2>
      <p style="color:var(--text-light); margin-bottom:32px;">La section <code>${hash}</code> n'existe pas.</p>
      <button class="btn btn-primary" onclick="navigateTo('dashboard')">← Retour au tableau de bord</button>
    </div>`;
}

function handleHash() {
  const page = getPageFromHash();
  if (!page && window.location.hash && window.location.hash !== '#') {
    show404();
  } else {
    navigateTo(page || 'dashboard');
  }
}

window.addEventListener('hashchange', handleHash);

// ===== CONFIRMATION MODALE =====
function confirmAction(titre, message, btnLabel, btnClass, onConfirm) {
  openModal(titre, `
    <div style="text-align:center; padding:8px 0 20px;">
      <div style="font-size:48px; margin-bottom:16px;">⚠️</div>
      <div style="font-size:15px; color:var(--text); line-height:1.5;">${message}</div>
    </div>
    <div style="display:flex; justify-content:flex-end; gap:12px;">
      <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
      <button class="btn ${btnClass}" id="btn-confirm-action">${btnLabel}</button>
    </div>
  `);
  document.getElementById('btn-confirm-action').addEventListener('click', () => {
    closeModal();
    onConfirm();
  });
}

function confirmDelete(message, onConfirm) {
  confirmAction('Confirmer la suppression', message, 'Supprimer définitivement', 'btn-danger', onConfirm);
}

// ===== MODE SOMBRE =====
(function initTheme() {
  const saved = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  const btn = document.getElementById('btn-theme');
  if (btn) btn.textContent = saved === 'dark' ? '☀️' : '🌙';

  if (btn) {
    btn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
      btn.textContent = next === 'dark' ? '☀️' : '🌙';
    });
  }
})();

// ===== HAMBURGER MOBILE =====
function closeSidebarMobile() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebar-overlay')?.classList.remove('visible');
}

(function initMobile() {
  const hamburger = document.getElementById('hamburger');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (hamburger) {
    hamburger.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('visible');
    });
  }
  if (overlay) overlay.addEventListener('click', closeSidebarMobile);

  // Fermer sidebar au clic sur un item nav (mobile)
  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', closeSidebarMobile);
  });
})();

// ===== RECHERCHE =====
(function initSearch() {
  const searchInput = document.getElementById('search-input');
  if (!searchInput) return;
  searchInput.addEventListener('input', () => {
    const q = searchInput.value.toLowerCase().trim();
    // Filtrer lignes de tableau
    document.querySelectorAll('table tbody tr').forEach(row => {
      row.style.display = q === '' || row.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
    // Filtrer les cards pigeon
    document.querySelectorAll('.pigeon-card, .pigeon-mini-card').forEach(card => {
      card.style.display = q === '' || card.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  });
  // Réinitialiser le filtre à chaque changement de page
  const origNavigateTo = navigateTo;
  window.navigateTo = function(page) {
    searchInput.value = '';
    origNavigateTo(page);
  };
})();

// ===== DÉMARRAGE =====
// Délai 500ms pour laisser l'API finir son démarrage avant le premier appel
setTimeout(handleHash, 500);