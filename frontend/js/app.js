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
    showNotification(msg, 'danger');
    throw new Error(msg);
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

// ===== DÉMARRAGE =====
// Délai 500ms pour laisser l'API finir son démarrage avant le premier appel
setTimeout(() => navigateTo('dashboard'), 500);