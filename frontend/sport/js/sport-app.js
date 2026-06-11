/* ============================================================
   SPORT-APP.JS — Orchestrateur principal
   Chargé EN DERNIER — dépend de tous les autres scripts
   ============================================================ */

/* ——— Pages disponibles ——— */
const sportPages = {
  dashboard: {
    titleKey: 'sport.page.dashboard.title',
    icon: '🏆',
    load: loadSportDashboard,
    addLabelKey: null
  },
  sessions: {
    titleKey: 'sport.page.sessions.title',
    icon: '🏃',
    load: loadSessions,
    addLabelKey: 'sport.page.sessions.add'
  },
  history: {
    titleKey: 'sport.page.history.title',
    icon: '📊',
    load: loadHistory,
    addLabelKey: null
  },
  nutrition: {
    titleKey: 'sport.page.nutrition.title',
    icon: '🌾',
    load: loadNutrition,
    addLabelKey: null
  },
  plans: {
    titleKey: 'sport.page.plans.title',
    icon: '📋',
    load: loadNutritionPlans,
    addLabelKey: 'sport.page.plans.add'
  },
  analytics: {
    titleKey: 'sport.page.analytics.title',
    icon: '📈',
    load: loadAnalytics,
    addLabelKey: null
  },
  ai: {
    titleKey: 'sport.page.ai.title',
    icon: '🤖',
    load: loadAIRecommendations,
    addLabelKey: null
  },
  condition: {
    titleKey: 'sport.page.condition.title',
    icon: '💪',
    load: loadCondition,
    addLabelKey: null
  },
  colony: {
    titleKey: 'sport.page.colony.title',
    icon: '🕊️',
    load: loadColony,
    addLabelKey: null
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
  if (titleEl) titleEl.textContent = t(pageConf.titleKey);

  // Bouton ajouter
  const btnAdd = document.getElementById('btn-add');
  if (btnAdd) {
    if (pageConf.addLabelKey) {
      btnAdd.style.display = '';
      btnAdd.textContent = t(pageConf.addLabelKey);
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
              <div class="alert-title">${t('sport.error.load_title')}</div>
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

/* ——— Rechargement au changement de langue ——— */
// Le contenu dynamique (tableaux, cartes...) est généré via t() au moment du
// rendu : il faut donc recharger la page courante quand la langue change.
let sportAppStarted = false;
document.addEventListener('i18n:changed', () => {
  if (sportAppStarted) showPage(window.currentPage);
});

/* ——— Init au chargement DOM ——— */
document.addEventListener('DOMContentLoaded', () => {
  initThemeSport();
  initNavigation();

  // Attendre que les traductions soient chargées avant d'afficher la page
  i18nReady.then(() => {
    // Vérifier si une page est dans l'URL hash
    const hash = window.location.hash.replace('#', '');
    const startPage = sportPages[hash] ? hash : 'dashboard';

    showPage(startPage);
    sportAppStarted = true;

    // Mettre à jour le hash quand on change de page
    const origShowPage = showPage;
    window.showPage = function(pageId) {
      origShowPage(pageId);
      window.location.hash = pageId;
    };
  });
});

/* ——— Gestion erreurs globales non capturées ——— */
window.addEventListener('unhandledrejection', (event) => {
  console.error('Promesse rejetée non gérée :', event.reason);
  showToast(event.reason?.message || t('sport.error.unexpected'), 'error');
});
