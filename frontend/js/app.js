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
    const msg = error.detail || t('error.api_generic');
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
    titleKey: 'page.dashboard.title',
    load: () => loadDashboard(),
    addLabelKey: null
  },
  pigeons: {
    titleKey: 'page.pigeons.title',
    load: () => loadPigeons(),
    addLabelKey: 'page.pigeons.add'
  },
  lignees: {
    titleKey: 'page.lignees.title',
    load: () => loadLignees(),
    addLabelKey: 'page.lignees.add'
  },
  performances: {
    titleKey: 'page.performances.title',
    load: () => loadPerformances(),
    addLabelKey: 'page.performances.add'
  },
  sante: {
    titleKey: 'page.sante.title',
    load: () => loadSante(),
    addLabelKey: 'page.sante.add'
  },
  couples: {
    titleKey: 'page.couples.title',
    load: () => loadCouples(),
    addLabelKey: 'page.couples.add'
  },
  eleveur: {
    titleKey: 'page.eleveur.title',
    load: () => loadEleveur(),
    addLabelKey: null
  },
  calendrier: {
    titleKey: 'page.calendrier.title',
    load: () => loadCalendrier(),
    addLabelKey: null
  },
  concours: {
    titleKey: 'page.concours.title',
    load: () => loadConcours(),
    addLabelKey: 'page.concours.add'
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
  document.getElementById('page-title').textContent = t(pages[page].titleKey);

  // Bouton ajouter
  const btnAdd = document.getElementById('btn-add');
  if (pages[page].addLabelKey) {
    btnAdd.textContent = t(pages[page].addLabelKey);
    btnAdd.style.display = 'block';
  } else {
    btnAdd.style.display = 'none';
  }

  // Charger le contenu
  document.getElementById('content').innerHTML = `<div class="loading">${t('common.loading')}</div>`;
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
  if (currentPage === 'concours') ouvrirNouveauConcours();
});

// ===== BADGES STATUT =====
function badgeStatut(statut) {
  const map = {
    'actif':        ['badge-actif',        'status.actif'],
    'reproducteur': ['badge-reproducteur', 'status.reproducteur'],
    'concours':     ['badge-concours',     'status.concours'],
    'perdu':        ['badge-perdu',        'status.perdu'],
    'retraite':     ['badge-retraite',     'status.retraite'],
    'decede':       ['badge-decede',       'status.decede'],
  };
  const [cls, key] = map[statut] || ['', null];
  const label = key ? t(key) : statut;
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
  document.getElementById('page-title').textContent = t('error.not_found_title');
  document.getElementById('btn-add').style.display = 'none';
  document.getElementById('content').innerHTML = `
    <div style="text-align:center; padding:80px 20px;">
      <div style="font-size:64px; margin-bottom:16px;">🔍</div>
      <h2 style="font-family:'Playfair Display',serif; font-size:28px; margin-bottom:12px;">${t('error.not_found_title')}</h2>
      <p style="color:var(--text-light); margin-bottom:32px;">${t('error.not_found_message', { hash })}</p>
      <button class="btn btn-primary" onclick="navigateTo('dashboard')">${t('common.back_dashboard')}</button>
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
      <button class="btn btn-secondary" onclick="closeModal()">${t('common.cancel')}</button>
      <button class="btn ${btnClass}" id="btn-confirm-action">${btnLabel}</button>
    </div>
  `);
  document.getElementById('btn-confirm-action').addEventListener('click', () => {
    closeModal();
    onConfirm();
  });
}

function confirmDelete(message, onConfirm) {
  confirmAction(t('common.confirm_delete_title'), message, t('common.delete_permanently'), 'btn-danger', onConfirm);
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

// ===== RECHARGEMENT AU CHANGEMENT DE LANGUE =====
// Le contenu dynamique (tableaux, cartes...) est généré via t() au moment du
// rendu : il faut donc recharger la page courante quand la langue change.
let appStarted = false;
document.addEventListener('i18n:changed', () => {
  if (appStarted) pages[currentPage].load();
});

// ===== DÉMARRAGE =====
// Premier lancement : si aucune configuration n'existe encore, on redirige
// vers l'assistant de configuration avant d'afficher l'application.
async function checkFirstLaunch() {
  try {
    const res = await fetch('http://localhost:8001/api/config/status');
    const data = await res.json();
    if (data.first_launch) {
      window.location.href = 'setup.html';
      return true;
    }
  } catch (err) {
    // Backend injoignable : on continue normalement.
  }
  return false;
}

// Délai 500ms pour laisser l'API finir son démarrage avant le premier appel,
// et on attend que les traductions soient chargées pour afficher les bons libellés.
checkFirstLaunch().then(redirected => {
  if (redirected) return;
  i18nReady.then(() => setTimeout(() => {
    appStarted = true;
    handleHash();
  }, 500));
});