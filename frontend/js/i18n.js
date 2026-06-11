// ===== INTERNATIONALISATION (i18n) =====
const I18N_SUPPORTED_LANGS = ['fr', 'nl', 'en'];
const I18N_DEFAULT_LANG = 'fr';
const I18N_STORAGE_KEY = 'lang';

let i18nTranslations = {};
let i18nCurrentLang = I18N_DEFAULT_LANG;

function getCurrentLang() {
  return i18nCurrentLang;
}

function getLocaleCode() {
  const map = { fr: 'fr-FR', nl: 'nl-NL', en: 'en-GB' };
  return map[i18nCurrentLang] || 'fr-FR';
}

function getStoredLang() {
  const saved = localStorage.getItem(I18N_STORAGE_KEY);
  if (saved && I18N_SUPPORTED_LANGS.includes(saved)) return saved;
  const browserLang = (navigator.language || I18N_DEFAULT_LANG).slice(0, 2);
  return I18N_SUPPORTED_LANGS.includes(browserLang) ? browserLang : I18N_DEFAULT_LANG;
}

// Récupère une valeur dans translations via une clé pointée ("nav.dashboard")
function i18nLookup(key) {
  return key.split('.').reduce((obj, part) => (obj && obj[part] !== undefined) ? obj[part] : undefined, i18nTranslations);
}

// t('cle.imbriquee', { count: 2, nom: 'Gerry' })
// - si la valeur trouvée est un objet { one, other }, choisit selon vars.count
// - remplace les {placeholders} par les valeurs de vars
function t(key, vars = {}) {
  let value = i18nLookup(key);
  if (value === undefined) return key;

  if (typeof value === 'object') {
    const count = vars.count;
    value = (count === 1) ? (value.one ?? value.other) : (value.other ?? value.one);
    if (value === undefined) return key;
  }

  return String(value).replace(/\{(\w+)\}/g, (match, name) => {
    return vars[name] !== undefined ? vars[name] : match;
  });
}

// Applique les traductions aux éléments du DOM (data-i18n*)
function applyTranslations(root = document) {
  root.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.getAttribute('data-i18n'));
  });
  root.querySelectorAll('[data-i18n-html]').forEach(el => {
    el.innerHTML = t(el.getAttribute('data-i18n-html'));
  });
  root.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
  });
  root.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.setAttribute('title', t(el.getAttribute('data-i18n-title')));
  });
  root.querySelectorAll('[data-i18n-aria-label]').forEach(el => {
    el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria-label')));
  });
  document.documentElement.setAttribute('lang', i18nCurrentLang);
  updateLangSwitcher();
}

function updateLangSwitcher() {
  document.querySelectorAll('[data-lang-switch]').forEach(btn => {
    const isActive = btn.dataset.langSwitch === i18nCurrentLang;
    btn.style.opacity = isActive ? '1' : '0.5';
  });
}

async function setLanguage(lang) {
  if (!I18N_SUPPORTED_LANGS.includes(lang)) lang = I18N_DEFAULT_LANG;
  const res = await fetch(`/locales/${lang}.json`, { cache: 'no-store' });
  i18nTranslations = await res.json();
  i18nCurrentLang = lang;
  localStorage.setItem(I18N_STORAGE_KEY, lang);
  applyTranslations();
  document.dispatchEvent(new CustomEvent('i18n:changed', { detail: { lang } }));
}

function initLangSwitcher() {
  document.querySelectorAll('[data-lang-switch]').forEach(btn => {
    btn.addEventListener('click', () => setLanguage(btn.dataset.langSwitch));
  });
}

async function initI18n() {
  initLangSwitcher();
  await setLanguage(getStoredLang());
}

// Promesse résolue une fois les traductions chargées et appliquées au DOM initial.
// Les autres scripts peuvent faire `i18nReady.then(() => ...)` avant d'écrire
// du texte traduit dynamiquement (titres de page, etc.).
const i18nReady = new Promise(resolve => {
  document.addEventListener('DOMContentLoaded', () => {
    initI18n().then(resolve);
  });
});
