// ===== ASSISTANT DE CONFIGURATION (premier lancement) =====
const SETUP_API_ROOT = 'http://localhost:8001';

const FEDERATIONS_BY_COUNTRY = {
  france: ['FFC'],
  belgique: ['RFCB', 'KBDB'],
  pays_bas: ['NPO'],
  royaume_uni: ['Royal Pigeon Racing Association'],
  autre: [],
};

const setupState = {
  step: 1,
  lang: null,
};

function setupGoToStep(step) {
  setupState.step = step;
  document.querySelectorAll('.setup-step').forEach(el => {
    el.hidden = (el.id !== `setup-step-${step}`);
  });
  document.querySelectorAll('[data-step-dot]').forEach(dot => {
    dot.classList.toggle('active', Number(dot.dataset.stepDot) <= step);
  });
}

function setupPopulateFederations() {
  const country = document.getElementById('f-pays').value;
  const select = document.getElementById('f-federation');
  const otherInput = document.getElementById('f-federation-other');
  const options = FEDERATIONS_BY_COUNTRY[country] || [];

  select.innerHTML = '';
  if (options.length === 0) {
    select.hidden = true;
    otherInput.hidden = false;
  } else {
    select.hidden = false;
    otherInput.hidden = true;
    otherInput.value = '';
    options.forEach(name => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      select.appendChild(opt);
    });
    const autreOpt = document.createElement('option');
    autreOpt.value = '__autre__';
    autreOpt.textContent = t('setup.country_autre');
    select.appendChild(autreOpt);
  }
}

function setupGetFederation() {
  const select = document.getElementById('f-federation');
  const otherInput = document.getElementById('f-federation-other');
  if (!select.hidden && select.value !== '__autre__') {
    return select.value;
  }
  return otherInput.value.trim();
}

function setupValidateEmail(value) {
  if (!value) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function setupBuildRecap() {
  const recap = document.getElementById('setup-recap');
  const naLabel = t('setup.not_specified');

  const langNames = { fr: 'Français', nl: 'Nederlands', en: 'English' };
  const countryLabel = t(`setup.country_${document.getElementById('f-pays').value}`);
  const federation = setupGetFederation();

  const rows = [
    [t('setup.recap_lang'), langNames[setupState.lang] || setupState.lang],
    [t('setup.recap_nom'), [document.getElementById('f-prenom').value, document.getElementById('f-nom').value].filter(Boolean).join(' ') || naLabel],
    [t('setup.recap_colombier'), document.getElementById('f-colombier').value || naLabel],
    [t('setup.recap_ville'), document.getElementById('f-ville').value || naLabel],
    [t('setup.recap_pays'), countryLabel],
    [t('setup.recap_federation'), federation || naLabel],
    [t('setup.recap_email'), document.getElementById('f-email').value || naLabel],
  ];

  recap.innerHTML = rows.map(([label, value]) => `
    <div class="setup-recap-row">
      <dt>${label}</dt>
      <dd>${value}</dd>
    </div>
  `).join('');
}

async function setupSubmitConfig() {
  const errorEl = document.getElementById('setup-error-3');
  const successEl = document.getElementById('setup-success');
  const progressBar = document.getElementById('setup-progress-bar');
  const progressFill = document.getElementById('setup-progress-bar-fill');
  const launchBtn = document.getElementById('btn-launch');
  const backBtn = document.getElementById('btn-back-2');

  errorEl.hidden = true;
  successEl.hidden = true;
  launchBtn.disabled = true;
  backBtn.disabled = true;
  progressBar.hidden = false;
  progressFill.style.width = '15%';

  const payload = {
    lang: setupState.lang,
    nom: document.getElementById('f-nom').value.trim(),
    prenom: document.getElementById('f-prenom').value.trim() || null,
    nom_colombier: document.getElementById('f-colombier').value.trim() || null,
    ville: document.getElementById('f-ville').value.trim() || null,
    pays: document.getElementById('f-pays').value,
    federation: setupGetFederation() || null,
    email: document.getElementById('f-email').value.trim() || null,
  };

  const progressTimer = setInterval(() => {
    const current = parseFloat(progressFill.style.width) || 0;
    if (current < 85) progressFill.style.width = `${current + 10}%`;
  }, 300);

  try {
    const res = await fetch(`${SETUP_API_ROOT}/api/config/setup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || t('setup.error_setup_failed'));
    }

    progressFill.style.width = '100%';
    successEl.hidden = false;
    setTimeout(() => { window.location.href = 'index.html'; }, 1200);
  } catch (err) {
    errorEl.textContent = err.message || t('setup.error_setup_failed');
    errorEl.hidden = false;
    launchBtn.disabled = false;
    backBtn.disabled = false;
    progressBar.hidden = true;
    progressFill.style.width = '0%';
  } finally {
    clearInterval(progressTimer);
  }
}

async function setupCheckExistingConfig() {
  try {
    const res = await fetch(`${SETUP_API_ROOT}/api/config/status`);
    const data = await res.json();
    if (!data.first_launch) {
      window.location.href = 'index.html';
    }
  } catch (err) {
    // Backend injoignable : on laisse l'assistant s'afficher.
  }
}

document.addEventListener('DOMContentLoaded', () => {
  setupCheckExistingConfig();

  // Étape 1 — choix de la langue
  document.querySelectorAll('.setup-lang-card').forEach(card => {
    card.addEventListener('click', async () => {
      document.querySelectorAll('.setup-lang-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      setupState.lang = card.dataset.lang;
      await setLanguage(setupState.lang);
      setupPopulateFederations();
      setupGoToStep(2);
    });
  });

  // Étape 2 — profil éleveur
  document.getElementById('f-pays').addEventListener('change', setupPopulateFederations);
  document.getElementById('f-federation').addEventListener('change', () => {
    const select = document.getElementById('f-federation');
    const otherInput = document.getElementById('f-federation-other');
    otherInput.hidden = select.value !== '__autre__';
  });

  document.querySelector('[data-action="back-1"]').addEventListener('click', () => setupGoToStep(1));

  document.getElementById('setup-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('setup-error-2');
    const nom = document.getElementById('f-nom').value.trim();
    const email = document.getElementById('f-email').value.trim();

    if (!nom) {
      errorEl.textContent = t('setup.error_nom_required');
      errorEl.hidden = false;
      return;
    }
    if (!setupValidateEmail(email)) {
      errorEl.textContent = t('setup.error_email_invalid');
      errorEl.hidden = false;
      return;
    }
    errorEl.hidden = true;

    setupBuildRecap();
    setupGoToStep(3);
  });

  // Étape 3 — confirmation
  document.querySelector('[data-action="back-2"]').addEventListener('click', () => setupGoToStep(2));
  document.getElementById('btn-launch').addEventListener('click', setupSubmitConfig);

  // Initialisation des fédérations par défaut (France), une fois les traductions chargées
  i18nReady.then(setupPopulateFederations);
});
