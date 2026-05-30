// ===== CALENDRIER ENTRAÎNEMENTS & CONCOURS =====

let calState = {
  annee: new Date().getFullYear(),
  mois: new Date().getMonth(), // 0-based
  sessions: [],
  concours: [],
};

async function loadCalendrier() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Chargement...</div>';

  try {
    const [sessions, performances] = await Promise.all([
      apiFetch('/sessions').catch(() => []),
      apiFetch('/performances/').catch(() => []),
    ]);
    calState.sessions = sessions;
    calState.concours = performances;
  } catch (e) {
    calState.sessions = [];
    calState.concours = [];
  }

  renderCalendrier();
}

function renderCalendrier() {
  const content = document.getElementById('content');
  const { annee, mois } = calState;

  const nomsMois = ['Janvier','Février','Mars','Avril','Mai','Juin',
                    'Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  const nomJours = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];

  // Index des événements par date YYYY-MM-DD
  const evParDate = {};

  calState.sessions.forEach(s => {
    const d = (s.date_seance || s.date || '').slice(0, 10);
    if (!d) return;
    if (!evParDate[d]) evParDate[d] = [];
    evParDate[d].push({ type: 'seance', label: s.type_seance || 'Séance', detail: s });
  });

  calState.concours.forEach(p => {
    const d = (p.date || '').slice(0, 10);
    if (!d) return;
    if (!evParDate[d]) evParDate[d] = [];
    evParDate[d].push({ type: 'concours', label: p.nom_concours, detail: p });
  });

  // Calcul grille
  const premierJour = new Date(annee, mois, 1);
  const dernierJour = new Date(annee, mois + 1, 0);
  // Lundi = 0, Dimanche = 6
  let debutGrille = (premierJour.getDay() + 6) % 7;
  const nbJours = dernierJour.getDate();
  const today = new Date().toISOString().slice(0, 10);

  // Générer les cellules
  let cellules = '';
  let jour = 1;
  for (let i = 0; i < 6 * 7; i++) {
    if (i < debutGrille || jour > nbJours) {
      cellules += `<div style="background:transparent;"></div>`;
      continue;
    }
    const dateStr = `${annee}-${String(mois + 1).padStart(2,'0')}-${String(jour).padStart(2,'0')}`;
    const evs = evParDate[dateStr] || [];
    const isToday = dateStr === today;

    const dots = evs.slice(0, 3).map(ev =>
      `<span title="${ev.label}" style="
        display:inline-block; width:8px; height:8px; border-radius:50%;
        background:${ev.type === 'seance' ? '#2980B9' : '#C4963A'};
        margin:1px;"></span>`
    ).join('');

    const surplus = evs.length > 3 ? `<span style="font-size:10px;color:var(--text-light);">+${evs.length - 3}</span>` : '';

    cellules += `
      <div onclick="calAfficherJour('${dateStr}')" style="
        background:var(--bg-card);
        border:${isToday ? '2px solid var(--accent)' : '1px solid var(--border)'};
        border-radius:8px;
        padding:8px;
        min-height:70px;
        cursor:${evs.length ? 'pointer' : 'default'};
        transition: box-shadow 0.15s;
        ${evs.length ? 'box-shadow:0 1px 4px rgba(0,0,0,0.08);' : ''}
      "
      onmouseover="if(${evs.length}) this.style.boxShadow='0 4px 12px rgba(0,0,0,0.12)'"
      onmouseout="this.style.boxShadow='${evs.length ? '0 1px 4px rgba(0,0,0,0.08)' : 'none'}'">
        <div style="font-size:13px; font-weight:${isToday ? '700' : '500'};
          color:${isToday ? 'var(--accent)' : 'var(--text)'}; margin-bottom:4px;">${jour}</div>
        <div style="display:flex; flex-wrap:wrap; gap:2px; align-items:center;">
          ${dots}${surplus}
        </div>
      </div>`;
    jour++;
  }

  // Légende événements du mois sélectionné
  const evMois = Object.entries(evParDate)
    .filter(([d]) => d.startsWith(`${annee}-${String(mois + 1).padStart(2,'0')}`))
    .sort(([a], [b]) => a.localeCompare(b));

  const listeMois = evMois.length === 0
    ? `<p style="color:var(--text-light); font-size:14px;">Aucun événement ce mois.</p>`
    : evMois.map(([date, evs]) => `
        <div style="margin-bottom:12px;">
          <div style="font-size:13px; font-weight:600; color:var(--text-light);
            text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px;">
            ${new Date(date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' })}
          </div>
          ${evs.map(ev => `
            <div style="display:flex; align-items:center; gap:8px; padding:6px 10px;
              background:var(--bg-card); border-radius:8px; margin-bottom:4px;
              border-left:3px solid ${ev.type === 'seance' ? '#2980B9' : '#C4963A'};">
              <span style="font-size:12px;">${ev.type === 'seance' ? '🏃' : '🏆'}</span>
              <span style="font-size:13px;">${ev.label}</span>
            </div>`).join('')}
        </div>`).join('');

  content.innerHTML = `
    <!-- Navigation mois -->
    <div style="display:flex; align-items:center; justify-content:space-between;
      background:var(--bg-card); border-radius:10px; padding:16px 24px;
      box-shadow:var(--shadow); margin-bottom:20px; border:1px solid var(--border);">
      <button class="btn btn-secondary" onclick="calChangerMois(-1)" style="padding:8px 16px;">← Précédent</button>
      <h2 style="font-family:'Playfair Display',serif; font-size:22px;">
        ${nomsMois[mois]} ${annee}
      </h2>
      <button class="btn btn-secondary" onclick="calChangerMois(1)" style="padding:8px 16px;">Suivant →</button>
    </div>

    <!-- Légende -->
    <div style="display:flex; gap:16px; margin-bottom:16px; font-size:13px;">
      <span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#2980B9;margin-right:4px;"></span>Séance d'entraînement</span>
      <span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#C4963A;margin-right:4px;"></span>Concours</span>
    </div>

    <div style="display:grid; grid-template-columns:1fr 2.5fr; gap:20px; align-items:start;">

      <!-- Liste événements du mois -->
      <div class="card">
        <div class="card-title">Événements — ${nomsMois[mois]}</div>
        ${listeMois}
      </div>

      <!-- Grille calendrier -->
      <div>
        <div style="display:grid; grid-template-columns:repeat(7,1fr); gap:4px; margin-bottom:4px;">
          ${nomJours.map(j =>
            `<div style="text-align:center; font-size:11px; font-weight:700;
              color:var(--text-light); text-transform:uppercase;
              padding:4px 0;">${j}</div>`
          ).join('')}
        </div>
        <div style="display:grid; grid-template-columns:repeat(7,1fr); gap:4px;">
          ${cellules}
        </div>
      </div>

    </div>`;
}

function calChangerMois(delta) {
  calState.mois += delta;
  if (calState.mois < 0)  { calState.mois = 11; calState.annee--; }
  if (calState.mois > 11) { calState.mois = 0;  calState.annee++; }
  renderCalendrier();
}

function calAfficherJour(dateStr) {
  const evs = [];
  calState.sessions.forEach(s => {
    const d = (s.date_seance || s.date || '').slice(0, 10);
    if (d === dateStr) evs.push({ type: 'seance', label: s.type_seance || 'Séance', detail: s });
  });
  calState.concours.forEach(p => {
    const d = (p.date || '').slice(0, 10);
    if (d === dateStr) evs.push({ type: 'concours', label: p.nom_concours, detail: p });
  });
  if (!evs.length) return;

  const dateAff = new Date(dateStr + 'T12:00:00').toLocaleDateString('fr-FR',
    { weekday:'long', day:'numeric', month:'long', year:'numeric' });

  const html = `
    <p style="color:var(--text-light); font-size:13px; margin-bottom:16px;">${dateAff}</p>
    ${evs.map(ev => `
      <div style="padding:12px 16px; border-radius:8px; margin-bottom:8px;
        background:var(--bg); border-left:4px solid ${ev.type === 'seance' ? '#2980B9' : '#C4963A'};">
        <div style="font-weight:600; margin-bottom:4px;">
          ${ev.type === 'seance' ? '🏃 ' : '🏆 '}${ev.label}
        </div>
        ${ev.type === 'concours' && ev.detail.distance_km
          ? `<div style="font-size:13px; color:var(--text-light);">${ev.detail.distance_km} km</div>` : ''}
        ${ev.type === 'seance' && ev.detail.notes
          ? `<div style="font-size:13px; color:var(--text-light);">${ev.detail.notes}</div>` : ''}
      </div>`).join('')}
    <div style="text-align:right; margin-top:16px;">
      <button class="btn btn-secondary" onclick="closeModal()">Fermer</button>
    </div>`;

  openModal(`📅 ${dateAff}`, html);
}
