// ===== EXPORT PDF PEDIGREE =====

async function exportPedigreePDF(pigeonId) {
  showNotification('Génération du PDF...', 'info');

  const [pedigree, lignees] = await Promise.all([
    apiFetch(`/pigeons/${pigeonId}/pedigree`),
    apiFetch('/lignees/'),
  ]);

  const ligneesMap = {};
  lignees.forEach(l => { ligneesMap[l.id] = l; });

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const PW = 297, PH = 210;
  const MARGIN = 8;
  const HEADER_H = 22;
  const BODY_TOP = MARGIN + HEADER_H + 4;
  const BODY_H = PH - BODY_TOP - 12; // ~160mm

  // ── En-tête ──────────────────────────────────────────────────────────────────
  const today = new Date();
  const dateStr = today.toLocaleDateString('fr-FR');

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(44, 62, 80);
  doc.text('PEDIGREE', MARGIN, MARGIN + 10);

  doc.setFontSize(20);
  doc.setTextColor(41, 128, 185);
  doc.text(pedigree.matricule, PW / 2, MARGIN + 10, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(127, 140, 141);
  doc.text('Élevage Colombophile', PW - MARGIN, MARGIN + 6, { align: 'right' });
  doc.text(dateStr, PW - MARGIN, MARGIN + 13, { align: 'right' });

  doc.setDrawColor(189, 195, 199);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, MARGIN + HEADER_H, PW - MARGIN, MARGIN + HEADER_H);

  // ── Colonnes (5 colonnes, de gauche à droite) ─────────────────────────────
  // Pigeon | Parents | GP | AGP | AAGP
  const COL_W = [52, 48, 48, 48, 42];
  const GAP = 4;
  const colX = [];
  let cx = MARGIN;
  for (let i = 0; i < 5; i++) {
    colX.push(cx);
    cx += COL_W[i] + GAP;
  }

  const CELL_H = 17;

  // ── Positions Y centrées (depuis BODY_TOP) ────────────────────────────────
  // AAGP : 8 cases, slot = BODY_H/8
  const slot = BODY_H / 8;
  const yAAGP = Array.from({ length: 8 }, (_, i) => BODY_TOP + slot * i + slot / 2);

  // AGP : 4 cases, chacune centrée entre 2 AAGP
  const yAGP = [
    (yAAGP[0] + yAAGP[1]) / 2,
    (yAAGP[2] + yAAGP[3]) / 2,
    (yAAGP[4] + yAAGP[5]) / 2,
    (yAAGP[6] + yAAGP[7]) / 2,
  ];

  // GP : 4 cases, chacune centrée entre 2 AGP
  const yGP = [
    (yAGP[0] + yAGP[1]) / 2,
    (yAGP[2] + yAGP[3]) / 2,
    (yAGP[4] + yAGP[5]) / 2, // unused if only 2 GP groups
    (yAGP[6] + yAGP[7]) / 2, // unused
  ];
  // Les 4 GP sont : père.père, père.mère, mère.père, mère.mère
  // Regroupés : GP[0,1] pour le père, GP[2,3] pour la mère
  const yGP4 = [
    (yAGP[0] + yAGP[1]) / 2,
    (yAGP[2] + yAGP[3]) / 2,
    (yAGP[4] + yAGP[5]) / 2,
    (yAGP[6] + yAGP[7]) / 2,
  ];

  // Parents : 2 cases, centrées entre leurs 2 GP
  const yParents = [
    (yGP4[0] + yGP4[1]) / 2,
    (yGP4[2] + yGP4[3]) / 2,
  ];

  // Pigeon : centré entre les 2 parents
  const yPigeon = (yParents[0] + yParents[1]) / 2;

  // ── Dessin des cases ──────────────────────────────────────────────────────

  function hexToRgb(hex) {
    if (!hex || hex.length < 7) return { r: 127, g: 140, b: 141 };
    return {
      r: parseInt(hex.slice(1, 3), 16),
      g: parseInt(hex.slice(3, 5), 16),
      b: parseInt(hex.slice(5, 7), 16),
    };
  }

  function drawCell(p, colIdx, yCentre) {
    const x = colX[colIdx];
    const w = COL_W[colIdx];
    const h = CELL_H;
    const y = yCentre - h / 2;

    if (!p) {
      doc.setFillColor(248, 249, 250);
      doc.setDrawColor(189, 195, 199);
      doc.setLineWidth(0.3);
      doc.setLineDashPattern([1.5, 1], 0);
      doc.rect(x, y, w, h, 'FD');
      doc.setLineDashPattern([], 0);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(127, 140, 141);
      doc.text('Inconnu', x + w / 2, yCentre + 1.5, { align: 'center' });
      return;
    }

    const isFemelle = p.sexe === 'femelle';
    const bg  = isFemelle ? [253, 237, 236] : [235, 245, 251];
    const bdr = isFemelle ? [192, 57, 43]   : [41, 128, 185];

    doc.setFillColor(...bg);
    doc.setDrawColor(...bdr);
    doc.setLineWidth(0.3);
    doc.setLineDashPattern([], 0);
    doc.rect(x, y, w, h, 'FD');

    const pad = 1.8;
    let ty = y + 4.5;

    // Matricule
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...bdr);
    const mat = p.matricule.length > 19 ? p.matricule.substring(0, 18) + '…' : p.matricule;
    doc.text(mat, x + pad, ty);
    ty += 3.5;

    // Année
    if (p.annee_naissance) {
      doc.setFontSize(5.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(127, 140, 141);
      doc.text(String(p.annee_naissance), x + pad, ty);
      ty += 3;
    }

    // Couleur plumage
    if (p.couleur_plumage) {
      doc.setFontSize(5);
      doc.setTextColor(127, 140, 141);
      const c = p.couleur_plumage.length > 20 ? p.couleur_plumage.substring(0, 19) + '…' : p.couleur_plumage;
      doc.text(c, x + pad, ty);
      ty += 2.8;
    }

    // Lignée
    if (p.lignee_id && ligneesMap[p.lignee_id]) {
      const lig = ligneesMap[p.lignee_id];
      const rgb = hexToRgb(lig.couleur_label);
      doc.setFontSize(5);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(rgb.r, rgb.g, rgb.b);
      const ln = lig.nom.length > 20 ? lig.nom.substring(0, 19) + '…' : lig.nom;
      doc.text(ln, x + pad, ty);
    }
  }

  // ── Connecteur : bracket depuis un ancêtre vers ses 2 descendants ─────────
  // indivRx  : bord droit de la case ancêtre (gauche dans le pedigree)
  // indivY   : Y centre de l'ancêtre
  // childLx  : bord gauche de la colonne descendants (à droite)
  // topY     : Y centre du descendant du haut
  // botY     : Y centre du descendant du bas
  function drawBracket(indivRx, indivY, childLx, topY, botY) {
    const midX = (indivRx + childLx) / 2;
    doc.setDrawColor(189, 195, 199);
    doc.setLineWidth(0.2);
    doc.setLineDashPattern([], 0);
    doc.line(indivRx, indivY, midX, indivY); // ancêtre → jonction
    doc.line(midX, topY, midX, botY);         // vertical reliant les 2 descendants
    doc.line(midX, topY, childLx, topY);      // → descendant haut
    doc.line(midX, botY, childLx, botY);      // → descendant bas
  }

  // ── Génération 0 : pigeon ─────────────────────────────────────────────────
  drawCell(pedigree, 0, yPigeon);

  // ── Génération 1 : parents ────────────────────────────────────────────────
  drawCell(pedigree.pere,  1, yParents[0]);
  drawCell(pedigree.mere, 1, yParents[1]);

  // Connecteur pigeon → parents
  drawBracket(
    colX[0] + COL_W[0], yPigeon,
    colX[1],
    yParents[0], yParents[1]
  );

  // ── Génération 2 : grands-parents ────────────────────────────────────────
  const gps = [
    pedigree.pere?.pere,
    pedigree.pere?.mere,
    pedigree.mere?.pere,
    pedigree.mere?.mere,
  ];
  gps.forEach((gp, i) => drawCell(gp, 2, yGP4[i]));

  // Connecteurs parents → GP
  [0, 1].forEach(pi => {
    drawBracket(
      colX[1] + COL_W[1], yParents[pi],
      colX[2],
      yGP4[pi * 2], yGP4[pi * 2 + 1]
    );
  });

  // ── Génération 3 : arrière-grands-parents ─────────────────────────────────
  const agps = [
    pedigree.pere?.pere?.pere,
    pedigree.pere?.pere?.mere,
    pedigree.pere?.mere?.pere,
    pedigree.pere?.mere?.mere,
    pedigree.mere?.pere?.pere,
    pedigree.mere?.pere?.mere,
    pedigree.mere?.mere?.pere,
    pedigree.mere?.mere?.mere,
  ];
  agps.forEach((agp, i) => drawCell(agp, 3, yAGP[i]));

  // Connecteurs GP → AGP
  gps.forEach((_, gi) => {
    drawBracket(
      colX[2] + COL_W[2], yGP4[gi],
      colX[3],
      yAGP[gi * 2], yAGP[gi * 2 + 1]
    );
  });

  // ── Génération 4 : AAGP (backend s'arrête ici, toujours Inconnu) ──────────
  // Les arrière-arrière-grands-parents ne sont pas retournés par l'API
  // (generation > 4 → null), on affiche les cases vides pour le gabarit
  yAAGP.forEach(y => drawCell(null, 4, y));

  // Connecteurs AGP → AAGP
  agps.forEach((_, ai) => {
    drawBracket(
      colX[3] + COL_W[3], yAGP[ai],
      colX[4],
      yAAGP[ai * 2], yAAGP[ai * 2 + 1]
    );
  });

  // ── Pied de page ─────────────────────────────────────────────────────────
  const footerY = PH - 4;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(127, 140, 141);
  doc.text(`Généré le ${dateStr}`, MARGIN, footerY);
  doc.text(pedigree.matricule, PW / 2, footerY, { align: 'center' });
  doc.text('1 / 1', PW - MARGIN, footerY, { align: 'right' });

  // ── Sauvegarde ───────────────────────────────────────────────────────────
  const safe = pedigree.matricule.replace(/[^a-zA-Z0-9-]/g, '_');
  doc.save(`pedigree-${safe}.pdf`);
  showNotification(`PDF téléchargé ✅`);
}
