/* ============================================================
   SPORT-APP.JS — Orchestrateur principal
   Chargé EN DERNIER — dépend de tous les autres scripts
   ============================================================ */

/* ——— Pages disponibles ——— */
const sportPages = {
  dashboard: {
    title: 'Dashboard Sport',
    icon: '🏆',
    load: loadSportDashboard,
    addLabel: null
  },
  sessions: {
    title: 'Séances d\'entraînement',
    icon: '🏃',
    load: loadSessions,
    addLabel: '+ Nouvelle séance'
  },
  history: {
    title: 'Historique pigeon',
    icon: '📊',
    load: loadHistory,
    addLabel: null
  },
  nutrition: {
    title: 'Nutrition',
    icon: '🌾',
    load: loadNutrition,
    addLabel: null
  },
  plans: {
    title: 'Plans alimentaires',
    icon: '📋',
    load: loadNutritionPlans,
    addLabel: '+ Nouveau plan'
  },
  analytics: {
    title: 'Analytics',
    icon: '📈',
    load: loadAnalytics,
    addLabel: null
  },
  ai: {
    title: 'Recommandations IA',
    icon: '🤖',
    load: loadAIRecommendations,
    addLabel: null
  },
  condition: {
    title: 'Condition sportive',
    icon: '💪',
    load: loadCondition,
    addLabel: null
  },
  colony: {
    title: 'Monitoring colonie',
    icon: '🕊️',
    load: loadColony,
    addLabel: null
  }
};

/* ——— Page courante ——— */
window.currentPage = 'dashboard';

/* ——— Afficher une page ——— */
function showPage(pageId) {
  if (!sportPages[pageId]) {
    console.warn(`Page inconnue : ${pageId}`);
    return;
  }

  // Mise à jour nav
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === pageId);
  });

  // Titre topbar
  const pageConf = sportPages[pageId];
  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = pageConf.title;

  // Bouton ajouter
  const btnAdd = document.getElementById('btn-add');
  if (btnAdd) {
    if (pageConf.addLabel) {
      btnAdd.style.display = '';
      btnAdd.textContent = pageConf.addLabel;
      btnAdd.onclick = null; // réinitialisé par la page
    } else {
      btnAdd.style.display = 'none';
      btnAdd.onclick = null;
    }
  }

  // Fermer sidebar mobile si ouverte
  closeSidebarMobile();

  // Enregistrer page courante
  window.currentPage = pageId;

  // Charger le contenu
  try {
    pageConf.load();
  } catch (err) {
    console.error(`Erreur chargement page ${pageId}:`, err);
    const content = document.getElementById('content');
    if (content) {
      content.innerHTML = `
        <div class="card">
          <div class="alert-card critical">
            <span class="alert-icon">❌</span>
            <div class="alert-content">
              <div class="alert-title">Erreur de chargement</div>
              <div class="alert-text">${err.message}</div>
            </div>
          </div>
        </div>`;
    }
  }
}

/* ——— Initialisation de la navigation ——— */
function initNavigation() {
  // Liens sidebar
  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      showPage(item.dataset.page);
    });
  });

  // Hamburger mobile
  const hamburger = document.getElementById('hamburger');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');

  if (hamburger) {
    hamburger.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('visible');
    });
  }

  if (overlay) {
    overlay.addEventListener('click', closeSidebarMobile);
  }

  // Recherche globale (filtrage côté client selon la page)
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      handleGlobalSearch(searchInput.value);
    });
  }
}

/* ——— Fermer sidebar mobile ——— */
function closeSidebarMobile() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebar-overlay')?.classList.remove('visible');
}

/* ——— Recherche globale (filtrage visuel des tableaux) ——— */
function handleGlobalSearch(query) {
  const q = query.toLowerCase().trim();

  // Filtrer les lignes de tableau visibles
  document.querySelectorAll('.table-modern tbody tr').forEach(row => {
    const text = row.textContent.toLowerCase();
    row.style.display = q === '' || text.includes(q) ? '' : 'none';
  });

  // Filtrer les mini-cards pigeon
  document.querySelectorAll('.pigeon-mini-card').forEach(card => {
    const text = card.textContent.toLowerCase();
    card.style.display = q === '' || text.includes(q) ? '' : 'none';
  });
}

/* ——— Mode sombre — synchronisé avec l'app principale via localStorage ——— */
function initThemeSport() {
  const saved = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);

  const btn = document.getElementById('btn-theme-sport');
  if (!btn) return;

  btn.textContent = saved === 'dark' ? '☀️' : '🌙';

  btn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    btn.textContent = next === 'dark' ? '☀️' : '🌙';
  });
}

/* ——— Init au chargement DOM ——— */
document.addEventListener('DOMContentLoaded', () => {
  initThemeSport();
  initNavigation();

  // Vérifier si une page est dans l'URL hash
  const hash = window.location.hash.replace('#', '');
  const startPage = sportPages[hash] ? hash : 'dashboard';

  showPage(startPage);

  // Mettre à jour le hash quand on change de page
  const origShowPage = showPage;
  window.showPage = function(pageId) {
    origShowPage(pageId);
    window.location.hash = pageId;
  };
});

/* ——— Gestion erreurs globales non capturées ——— */
window.addEventListener('unhandledrejection', (event) => {
  console.error('Promesse rejetée non gérée :', event.reason);
  showToast(event.reason?.message || 'Une erreur inattendue s\'est produite', 'error');
});
