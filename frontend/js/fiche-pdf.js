// ===== EXPORT FICHE PIGEON PDF (format A5 paysage = demi A4) =====

async function exportFichePDF(pigeonId) {
  showNotification('Génération de la fiche...', 'info');

  const [pigeon, lignees, eleveur, perfs, sante] = await Promise.all([
    apiFetch(`/pigeons/${pigeonId}`),
    apiFetch('/lignees/'),
    apiFetch('/eleveur/'),
    apiFetch(`/performances/pigeon/${pigeonId}`),
    apiFetch(`/sante/pigeon/${pigeonId}`),
  ]);

  const ligneesMap = {};
  lignees.forEach(l => { ligneesMap[l.id] = l; });
  const lignee = ligneesMap[pigeon.lignee_id] || null;

  // Filtrage santé : vaccinations + dernière visite vétérinaire seulement
  const vaccinations = sante
    .filter(e => e.type === 'vaccination')
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  const derniereVisite = sante
    .filter(e => e.type === 'visite vétérinaire')
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 1);
  const santeAffichee = [...vaccinations, ...derniereVisite]
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  // Performances triées par classement ASC (meilleur en premier)
  const perfsTriees = [...perfs].sort((a, b) => (a.classement || 999) - (b.classement || 999));

  // Préchargement photos
  const photos = {};
  await Promise.all([
    pigeon.photo
      ? imageToBase64(`http://localhost:8001${pigeon.photo}`)
          .then(b64 => { if (b64) photos.pigeon = b64; })
      : Promise.resolve(),
    eleveur.photo_colombier
      ? imageToBase64(`http://localhost:8001${eleveur.photo_colombier}`)
          .then(b64 => { if (b64) photos.colombier = b64; })
      : Promise.resolve(),
  ]);

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a5',
  });

  const PW = 210, PH = 148;
  const MARGIN = 8;
  const HEADER_H = 20;
  const today = new Date();
  const dateStr = today.toLocaleDateString('fr-FR');

  // ── Layout ────────────────────────────────────────────────────────────────────
  const BODY_TOP    = MARGIN + HEADER_H + 2;       // 30mm
  const FOOTER_LINE = PH - MARGIN - 8;             // 132mm
  const FOOTER_Y    = FOOTER_LINE + 5;             // 137mm

  const COL_LEFT_X  = MARGIN;
  const COL_LEFT_W  = 85;
  const COL_RIGHT_X = MARGIN + COL_LEFT_W + 5;    // 98mm
  const COL_RIGHT_W = PW - COL_RIGHT_X - MARGIN;  // 104mm

  // ── Helpers ───────────────────────────────────────────────────────────────────

  function truncate(text, maxChars) {
    if (!text) return '';
    return text.length > maxChars ? text.substring(0, maxChars - 1) + '…' : text;
  }

  function fmtDate(iso) {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  function hexToRgb(hex) {
    if (!hex || hex.length < 7) return [41, 128, 185];
    return [
      parseInt(hex.slice(1, 3), 16),
      parseInt(hex.slice(3, 5), 16),
      parseInt(hex.slice(5, 7), 16),
    ];
  }

  // ── En-tête (hauteur 20mm) ────────────────────────────────────────────────────

  let hx = MARGIN;
  if (photos.colombier) {
    try {
      doc.addImage(photos.colombier, 'JPEG', MARGIN, MARGIN, 16, 16);
      hx = MARGIN + 20;
    } catch (e) { /* ignorée */ }
  }

  let hy = MARGIN + 5;
  const nomEleveur = [eleveur.prenom, eleveur.nom].filter(Boolean).join(' ');
  if (nomEleveur) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(44, 62, 80);
    doc.text(nomEleveur, hx, hy);
    hy += 4.5;
  }
  if (eleveur.nom_colombier) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(44, 62, 80);
    doc.text(eleveur.nom_colombier, hx, hy);
    hy += 4;
  }
  if (eleveur.ville) {
    doc.setFontSize(7);
    doc.setTextColor(127, 140, 141);
    doc.text(eleveur.ville, hx, hy);
  }

  // Droite : licence + association + date
  const infoX = PW * 0.68;
  let iy = MARGIN + 5;
  const licenceAsso = [
    eleveur.numero_licence ? `Lic. ${eleveur.numero_licence}` : '',
    eleveur.association ? truncate(eleveur.association, 30) : '',
  ].filter(Boolean).join(' — ');
  if (licenceAsso) {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(127, 140, 141);
    doc.text(licenceAsso, infoX, iy);
    iy += 4;
  }
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(127, 140, 141);
  doc.text(dateStr, infoX, iy);

  // Ligne séparatrice en-tête
  doc.setDrawColor(189, 195, 199);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, MARGIN + HEADER_H, PW - MARGIN, MARGIN + HEADER_H);

  // ── COLONNE GAUCHE ────────────────────────────────────────────────────────────

  let ly = BODY_TOP;
  const pad = 1.5;

  // Photo pigeon (35×35mm centrée)
  const PHOTO_SIZE = 35;
  const photoX = COL_LEFT_X + (COL_LEFT_W - PHOTO_SIZE) / 2;
  if (photos.pigeon) {
    try {
      doc.addImage(photos.pigeon, 'JPEG', photoX, ly, PHOTO_SIZE, PHOTO_SIZE);
    } catch (e) { /* ignorée */ }
  } else {
    doc.setFontSize(30);
    doc.setTextColor(189, 195, 199);
    doc.text('?', COL_LEFT_X + COL_LEFT_W / 2, ly + PHOTO_SIZE / 2 + 6, { align: 'center' });
  }
  ly += PHOTO_SIZE + 3;

  // Matricule centré
  const ligColor = lignee ? hexToRgb(lignee.couleur_label) : [41, 128, 185];
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...ligColor);
  doc.text(pigeon.matricule, COL_LEFT_X + COL_LEFT_W / 2, ly, { align: 'center' });
  ly += 6;

  // Grille infos 2 colonnes × 3 lignes
  const gridCellW = (COL_LEFT_W - 2) / 2;
  const gridItems = [
    ['Annee',   String(pigeon.annee_naissance || '—')],
    ['Sexe',    pigeon.sexe === 'male' ? 'Male' : 'Femelle'],
    ['Statut',  pigeon.statut || '—'],
    ['Case',    pigeon.colombier_case || '—'],
    ['Couleur', truncate(pigeon.couleur_plumage || '—', 14)],
    ['Lignee',  lignee ? truncate(lignee.nom, 14) : '—'],
  ];

  gridItems.forEach(([label, val], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const gx  = COL_LEFT_X + col * (gridCellW + 2);
    const gy  = ly + row * 8;

    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(127, 140, 141);
    doc.text(label.toUpperCase(), gx, gy);

    if (label === 'Lignee' && lignee) {
      const rgb = hexToRgb(lignee.couleur_label);
      doc.setFillColor(...rgb);
      const bw = Math.min(gridCellW - 1, 32);
      doc.rect(gx, gy + 0.8, bw, 4, 'F');
      doc.setFontSize(5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(truncate(lignee.nom, 13), gx + 1.5, gy + 3.7);
    } else {
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(44, 62, 80);
      doc.text(val, gx, gy + 3.8);
    }
  });
  ly += 3 * 8 + 3;

  // Généalogie père / mère
  const genH = 7;

  doc.setFillColor(235, 245, 251);
  doc.setDrawColor(189, 195, 199);
  doc.setLineWidth(0.2);
  doc.rect(COL_LEFT_X, ly, COL_LEFT_W, genH, 'FD');
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(41, 128, 185);
  doc.text('Pere :', COL_LEFT_X + pad, ly + 4.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(44, 62, 80);
  doc.text(pigeon.pere ? truncate(pigeon.pere.matricule, 18) : 'Inconnu', COL_LEFT_X + 13, ly + 4.5);

  ly += genH + 1;

  doc.setFillColor(253, 237, 236);
  doc.rect(COL_LEFT_X, ly, COL_LEFT_W, genH, 'FD');
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(192, 57, 43);
  doc.text('Mere :', COL_LEFT_X + pad, ly + 4.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(44, 62, 80);
  doc.text(pigeon.mere ? truncate(pigeon.mere.matricule, 18) : 'Inconnue', COL_LEFT_X + 13, ly + 4.5);

  ly += genH + 4;

  // Notes (si espace restant)
  if (pigeon.notes && ly < FOOTER_LINE - 6) {
    const noteH = Math.min(FOOTER_LINE - ly - 2, 20);
    doc.setFillColor(248, 249, 250);
    doc.rect(COL_LEFT_X, ly, COL_LEFT_W, noteH, 'F');
    doc.setDrawColor(41, 128, 185);
    doc.setLineWidth(0.5);
    doc.line(COL_LEFT_X, ly, COL_LEFT_X, ly + noteH);
    doc.setLineWidth(0.2);
    doc.setDrawColor(189, 195, 199);

    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    const noteLines = doc.splitTextToSize(pigeon.notes, COL_LEFT_W - 4);
    let ny = ly + 3.5;
    for (const line of noteLines) {
      if (ny > ly + noteH - 2) break;
      doc.text(line, COL_LEFT_X + 3, ny);
      ny += 3.5;
    }
  }

  // ── COLONNE DROITE ────────────────────────────────────────────────────────────

  let ry = BODY_TOP;
  const hasPerfs = perfsTriees.length > 0;
  const hasSante = santeAffichee.length > 0;
  const ROW_H = 5.5;

  if (!hasPerfs && !hasSante) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(127, 140, 141);
    doc.text(
      'Aucune donnee enregistree',
      COL_RIGHT_X + COL_RIGHT_W / 2,
      BODY_TOP + (FOOTER_LINE - BODY_TOP) / 2,
      { align: 'center' }
    );
  } else {

    // ── Performances ────────────────────────────────────────────────────────────
    if (hasPerfs) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(230, 126, 34);
      doc.text('Performances', COL_RIGHT_X, ry + 5);
      ry += 7;

      // Positions colonnes : Date(20) | Concours(45) | Dist(14) | Cl.(12) | Vit.(13)
      const pColX = [
        COL_RIGHT_X,
        COL_RIGHT_X + 20,
        COL_RIGHT_X + 65,
        COL_RIGHT_X + 79,
        COL_RIGHT_X + 91,
      ];

      doc.setFillColor(230, 126, 34);
      doc.rect(COL_RIGHT_X, ry, COL_RIGHT_W, ROW_H, 'F');
      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      ['Date', 'Concours', 'Dist.', 'Cl.', 'Vit.'].forEach((h, i) => {
        doc.text(h, pColX[i] + pad, ry + 3.8);
      });
      ry += ROW_H;

      const MAX_PERFS = 6;
      const toShow = perfsTriees.slice(0, MAX_PERFS);
      const extra  = perfsTriees.length - MAX_PERFS;

      toShow.forEach((pf, idx) => {
        if (ry + ROW_H > FOOTER_LINE) return;
        doc.setFillColor(...(idx % 2 === 0 ? [255, 255, 255] : [254, 249, 231]));
        doc.rect(COL_RIGHT_X, ry, COL_RIGHT_W, ROW_H, 'F');

        doc.setFontSize(6);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(44, 62, 80);
        doc.text(fmtDate(pf.date), pColX[0] + pad, ry + 3.8);
        doc.text(truncate(pf.nom_concours || '', 22), pColX[1] + pad, ry + 3.8);
        doc.text(pf.distance_km ? `${pf.distance_km}km` : '—', pColX[2] + pad, ry + 3.8);

        const cl = pf.classement;
        if (cl) {
          const clText = cl === 1 ? '1er' : cl === 2 ? '2eme' : cl === 3 ? '3eme' : `${cl}e`;
          const clBg   = cl === 1 ? [241, 196, 15] : cl === 2 ? [189, 195, 199] : cl === 3 ? [205, 127, 50] : [149, 165, 166];
          doc.setFillColor(...clBg);
          doc.rect(pColX[3] + pad, ry + 0.8, 9, 3.8, 'F');
          doc.setFontSize(5.5);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(255, 255, 255);
          doc.text(clText, pColX[3] + pad + 1, ry + 3.6);
        } else {
          doc.setFontSize(6);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(127, 140, 141);
          doc.text('—', pColX[3] + pad, ry + 3.8);
        }

        doc.setFontSize(6);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(44, 62, 80);
        doc.text(pf.vitesse_m_min ? pf.vitesse_m_min.toFixed(1) : '—', pColX[4] + pad, ry + 3.8);
        ry += ROW_H;
      });

      if (extra > 0 && ry + ROW_H <= FOOTER_LINE) {
        doc.setFillColor(248, 249, 250);
        doc.rect(COL_RIGHT_X, ry, COL_RIGHT_W, ROW_H, 'F');
        doc.setFontSize(5.5);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(127, 140, 141);
        doc.text(`... et ${extra} autre${extra > 1 ? 's' : ''}`, COL_RIGHT_X + pad, ry + 3.8);
        ry += ROW_H;
      }
    }

    // ── Santé ────────────────────────────────────────────────────────────────────
    if (hasSante && ry < FOOTER_LINE - 12) {
      ry += hasPerfs ? 4 : 0;

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(39, 174, 96);
      doc.text('Sante', COL_RIGHT_X, ry + 5);
      ry += 7;

      // Colonnes : Date(20) | Type(30) | Produit/Desc(54)
      const sColX = [
        COL_RIGHT_X,
        COL_RIGHT_X + 20,
        COL_RIGHT_X + 52,
      ];

      doc.setFillColor(39, 174, 96);
      doc.rect(COL_RIGHT_X, ry, COL_RIGHT_W, ROW_H, 'F');
      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      ['Date', 'Type', 'Produit / Description'].forEach((h, i) => {
        doc.text(h, sColX[i] + pad, ry + 3.8);
      });
      ry += ROW_H;

      santeAffichee.forEach((evt, idx) => {
        if (ry + ROW_H > FOOTER_LINE) return;
        doc.setFillColor(...(idx % 2 === 0 ? [255, 255, 255] : [240, 255, 244]));
        doc.rect(COL_RIGHT_X, ry, COL_RIGHT_W, ROW_H, 'F');

        doc.setFontSize(6);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(44, 62, 80);
        doc.text(fmtDate(evt.date), sColX[0] + pad, ry + 3.8);

        if (evt.type === 'vaccination') {
          doc.setTextColor(39, 174, 96);
          doc.text('Vaccin', sColX[1] + pad, ry + 3.8);
        } else {
          doc.setTextColor(41, 128, 185);
          doc.text('Visite vet.', sColX[1] + pad, ry + 3.8);
        }

        doc.setTextColor(44, 62, 80);
        doc.text(truncate(evt.produit || evt.description || '—', 26), sColX[2] + pad, ry + 3.8);
        ry += ROW_H;
      });
    }
  }

  // ── Pied de page ──────────────────────────────────────────────────────────────

  doc.setDrawColor(189, 195, 199);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, FOOTER_LINE, PW - MARGIN, FOOTER_LINE);

  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(127, 140, 141);
  doc.text(`Fiche du ${dateStr}`, MARGIN, FOOTER_Y);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(44, 62, 80);
  doc.text(pigeon.matricule, PW / 2, FOOTER_Y, { align: 'center' });

  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(127, 140, 141);
  doc.text('1/2 A4', PW - MARGIN, FOOTER_Y, { align: 'right' });

  // Note impression discrète
  doc.setFontSize(5);
  doc.setTextColor(204, 204, 204);
  doc.text('Imprimer en A5 ou 2 par page A4', PW / 2, PH - 1.5, { align: 'center' });

  // ── Sauvegarde ────────────────────────────────────────────────────────────────
  const safe = pigeon.matricule.replace(/[^a-zA-Z0-9-]/g, '_');
  doc.save(`fiche-${safe}.pdf`);
  showNotification('Fiche PDF téléchargée ✅');
}
