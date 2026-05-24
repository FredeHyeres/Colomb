// ===== EXPORT PDF PEDIGREE =====

async function imageToBase64(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width  = img.width;
      canvas.height = img.height;
      canvas.getContext('2d').drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function collectIds(node, ids = new Set()) {
  if (!node) return ids;
  ids.add(node.id);
  if (node.pere) collectIds(node.pere, ids);
  if (node.mere) collectIds(node.mere, ids);
  return ids;
}

async function exportPedigreePDF(pigeonId) {
  showNotification('Génération du PDF...', 'info');

  const [pedigree, lignees, eleveur] = await Promise.all([
    apiFetch(`/pigeons/${pigeonId}/pedigree`),
    apiFetch('/lignees/'),
    apiFetch('/eleveur/'),
  ]);

  const ligneesMap = {};
  lignees.forEach(l => { ligneesMap[l.id] = l; });

  const allIds = collectIds(pedigree);

  // Chargement parallèle : photos + performances + santé
  const photosBase64 = {};

  const [perfsMap, santeMap] = await Promise.all([
    Promise.all([...allIds].map(async id => {
      const perfs = await apiFetch(`/performances/pigeon/${id}`).catch(() => []);
      return [id, perfs];
    })).then(Object.fromEntries),

    Promise.all([...allIds].map(async id => {
      const sante = await apiFetch(`/sante/pigeon/${id}`).catch(() => []);
      return [id, sante];
    })).then(Object.fromEntries),
  ]);

  await Promise.all([
    ...[pedigree, pedigree.pere, pedigree.mere]
      .filter(p => p && p.photo)
      .map(async p => {
        photosBase64[p.id] = await imageToBase64(`http://localhost:8001${p.photo}`);
      }),
    eleveur.photo_colombier
      ? imageToBase64(`http://localhost:8001${eleveur.photo_colombier}`)
          .then(b64 => { photosBase64['colombier'] = b64; })
      : Promise.resolve(),
  ]);

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const PW = 297, PH = 210;
  const MARGIN = 8;
  const HEADER_H = 28;
  const today = new Date();
  const dateStr = today.toLocaleDateString('fr-FR');

  // ── En-tête ───────────────────────────────────────────────────────────────────

  let headerX = MARGIN;
  if (photosBase64['colombier']) {
    try {
      doc.addImage(photosBase64['colombier'], 'JPEG', MARGIN, MARGIN, 22, 22);
      headerX = MARGIN + 26;
    } catch (e) { /* ignorée */ }
  }

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(127, 140, 141);
  doc.text('PEDIGREE', headerX, MARGIN + 8);

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(41, 128, 185);
  doc.text(pedigree.matricule, headerX, MARGIN + 20);

  const eleveurX = Math.round(PW * 0.52);
  let ety = MARGIN + 7;

  const nomEleveur = [eleveur.prenom, eleveur.nom].filter(Boolean).join(' ');
  if (nomEleveur) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(44, 62, 80);
    doc.text(nomEleveur, eleveurX, ety);
    ety += 5;
  }
  if (eleveur.nom_colombier) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(44, 62, 80);
    doc.text(eleveur.nom_colombier, eleveurX, ety);
    ety += 4.5;
  }
  if (eleveur.ville) {
    doc.setFontSize(8);
    doc.setTextColor(127, 140, 141);
    doc.text(eleveur.ville, eleveurX, ety);
    ety += 4;
  }
  if (eleveur.numero_licence) {
    doc.setFontSize(7);
    doc.setTextColor(127, 140, 141);
    doc.text(`Licence : ${eleveur.numero_licence}`, eleveurX, ety);
  }

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(127, 140, 141);
  doc.text(dateStr, PW - MARGIN, MARGIN + 7, { align: 'right' });

  doc.setDrawColor(189, 195, 199);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, MARGIN + HEADER_H, PW - MARGIN, MARGIN + HEADER_H);

  // ── Coordonnées fixes ─────────────────────────────────────────────────────────
  const BODY_TOP = MARGIN + HEADER_H + 2;
  const BODY_H   = PH - BODY_TOP - 10;
  const COL_W = [55, 50, 50, 50, 42];
  const COL_X = [5, 62, 114, 166, 218];

  const positions = {
    g0: [BODY_TOP + BODY_H / 2],
    g1: [
      BODY_TOP + BODY_H * 1 / 4,
      BODY_TOP + BODY_H * 3 / 4,
    ],
    g2: [
      BODY_TOP + BODY_H * 1 / 8,
      BODY_TOP + BODY_H * 3 / 8,
      BODY_TOP + BODY_H * 5 / 8,
      BODY_TOP + BODY_H * 7 / 8,
    ],
    g3: [
      BODY_TOP + BODY_H *  1 / 16,
      BODY_TOP + BODY_H *  3 / 16,
      BODY_TOP + BODY_H *  5 / 16,
      BODY_TOP + BODY_H *  7 / 16,
      BODY_TOP + BODY_H *  9 / 16,
      BODY_TOP + BODY_H * 11 / 16,
      BODY_TOP + BODY_H * 13 / 16,
      BODY_TOP + BODY_H * 15 / 16,
    ],
  };

  const heights = {
    g0: BODY_H,
    g1: BODY_H / 2,
    g2: BODY_H / 4,
    g3: BODY_H / 8,
  };

  // ── Helpers ───────────────────────────────────────────────────────────────────

  function hexToRgb(hex) {
    if (!hex || hex.length < 7) return { r: 127, g: 140, b: 141 };
    return {
      r: parseInt(hex.slice(1, 3), 16),
      g: parseInt(hex.slice(3, 5), 16),
      b: parseInt(hex.slice(5, 7), 16),
    };
  }

  function truncate(text, maxChars) {
    if (!text) return '';
    return text.length > maxChars ? text.substring(0, maxChars - 1) + '…' : text;
  }

  function drawSeparator(x, ty, w) {
    doc.setDrawColor(221, 227, 234);
    doc.setLineWidth(0.2);
    doc.setLineDashPattern([], 0);
    doc.line(x + 1.5, ty, x + w - 1.5, ty);
    return ty + 1.5;
  }

  // generation : 0=pigeon, 1=parents, 2=GP, 3=AGP
  function drawCell(p, x, y, w, h, generation = 2) {
    if ([x, y, w, h].some(v => isNaN(v) || v == null)) {
      console.warn('drawCell: coordonnées invalides', { x, y, w, h, matricule: p?.matricule });
      return;
    }

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
      doc.text('Inconnu', x + w / 2, y + h / 2 + 1.5, { align: 'center' });
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

    // Photo — gen 0 et gen 1 seulement
    if (generation <= 1 && p.id && photosBase64[p.id]) {
      const photoSize = generation === 0 ? 20 : 14;
      const photoX = x + (w - photoSize) / 2;
      const photoY = y + 2;
      try {
        doc.addImage(photosBase64[p.id], 'JPEG', photoX, photoY, photoSize, photoSize);
        ty = photoY + photoSize + 2;
      } catch (e) {
        console.warn('Photo non insérée:', e);
      }
    }

    // Matricule
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...bdr);
    const mat = p.matricule.length > 19 ? p.matricule.substring(0, 18) + '…' : p.matricule;
    doc.text(mat, x + pad, ty);
    ty += 3.5;

    // Année
    if (p.annee_naissance && ty < y + h - 2) {
      doc.setFontSize(5.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(127, 140, 141);
      doc.text(String(p.annee_naissance), x + pad, ty);
      ty += 3;
    }

    // Couleur plumage
    if (p.couleur_plumage && ty < y + h - 2) {
      doc.setFontSize(5);
      doc.setTextColor(127, 140, 141);
      doc.text(truncate(p.couleur_plumage, 20), x + pad, ty);
      ty += 2.8;
    }

    // Lignée
    if (p.lignee_id && ligneesMap[p.lignee_id] && ty < y + h - 2) {
      const lig = ligneesMap[p.lignee_id];
      const rgb = hexToRgb(lig.couleur_label);
      doc.setFontSize(5);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(rgb.r, rgb.g, rgb.b);
      doc.text(truncate(lig.nom, 20), x + pad, ty);
      ty += 3;
    }

    // AGP et au-delà : matricule + lignée seulement
    if (generation >= 3) return;

    // ── Données perfs et santé ────────────────────────────────────────────────

    const perfs = (perfsMap[p.id] || [])
      .slice()
      .sort((a, b) => (a.classement || 999) - (b.classement || 999));

    const santeBrute = santeMap[p.id] || [];
    const vaccinations = santeBrute
      .filter(e => e.type === 'vaccination')
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    const derniereVisite = santeBrute
      .filter(e => e.type === 'visite vétérinaire')
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 1);
    const santeAffichee = [...vaccinations, ...derniereVisite]
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    const hasPerfs = perfs.length > 0;
    const hasSante = santeAffichee.length > 0;

    if (!hasPerfs && !hasSante) return;

    if (ty < y + h - 2) {
      ty = drawSeparator(x, ty, w);
    }

    // ── GÉNÉRATION 0 — tout ──────────────────────────────────────────────────

    if (generation === 0) {
      if (hasPerfs && ty < y + h - 2) {
        doc.setFontSize(5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(230, 126, 34);
        doc.text('Performances', x + pad, ty);
        ty += 3;

        for (const perf of perfs) {
          if (ty + 3 > y + h - 2) break;
          const concours = truncate(perf.nom_concours || '', 25);
          doc.setFontSize(5);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(230, 126, 34);
          doc.text(`cl.${perf.classement} - ${concours}`, x + pad, ty);
          ty += 2.8;

          if (ty + 2.5 > y + h - 2) break;
          const dist = perf.distance_km ? `${perf.distance_km}km` : '';
          const eng  = perf.nb_pigeons_engages ? `${perf.nb_pigeons_engages} eng.` : '';
          const detail = [dist, eng].filter(Boolean).join(' | ');
          if (detail) {
            doc.setFontSize(4.5);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(149, 165, 166);
            doc.text(detail, x + pad, ty);
            ty += 2.5;
          }
        }
      }

      if (hasPerfs && hasSante && ty < y + h - 2) {
        ty = drawSeparator(x, ty, w);
      }

      if (hasSante && ty < y + h - 2) {
        doc.setFontSize(5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(39, 174, 96);
        doc.text('Sante', x + pad, ty);
        ty += 3;

        for (const evt of santeAffichee) {
          if (ty + 3 > y + h - 2) break;
          if (evt.type === 'vaccination') {
            doc.setFontSize(5);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(39, 174, 96);
            doc.text('Vaccin: ' + truncate(evt.produit || '', 25), x + pad, ty);
            ty += 2.5;
            if (evt.date && ty < y + h - 2) {
              doc.setFontSize(4);
              doc.setFont('helvetica', 'normal');
              doc.setTextColor(149, 165, 166);
              doc.text(new Date(evt.date).toLocaleDateString('fr-FR'), x + pad, ty);
              ty += 2.5;
            }
          } else if (evt.type === 'visite vétérinaire') {
            const dateEvt = evt.date ? new Date(evt.date).toLocaleDateString('fr-FR') : '';
            doc.setFontSize(5);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(41, 128, 185);
            doc.text('Visite ' + dateEvt, x + pad, ty);
            ty += 2.5;
          }
        }
      }
    }

    // ── GÉNÉRATION 1 — essentiel ─────────────────────────────────────────────

    if (generation === 1) {
      const top2Perfs = perfs.slice(0, 2);
      const top2Sante = [...vaccinations.slice(0, 2), ...derniereVisite]
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      for (const perf of top2Perfs) {
        if (ty + 3 > y + h - 2) break;
        const concours = truncate(perf.nom_concours || '', 18);
        doc.setFontSize(4.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(230, 126, 34);
        doc.text(`cl.${perf.classement} ${concours}`, x + pad, ty);
        ty += 2.8;
      }

      if (top2Perfs.length > 0 && top2Sante.length > 0 && ty < y + h - 2) {
        ty = drawSeparator(x, ty, w);
      }

      for (const evt of top2Sante) {
        if (ty + 3 > y + h - 2) break;
        if (evt.type === 'vaccination') {
          doc.setFontSize(4);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(39, 174, 96);
          doc.text('Vaccin: ' + truncate(evt.produit || '', 18), x + pad, ty);
        } else if (evt.type === 'visite vétérinaire') {
          const dateEvt = evt.date ? new Date(evt.date).toLocaleDateString('fr-FR') : '';
          doc.setFontSize(4);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(41, 128, 185);
          doc.text('Visite ' + dateEvt, x + pad, ty);
        }
        ty += 2.5;
      }
    }

    // ── GÉNÉRATION 2 — minimum ───────────────────────────────────────────────

    if (generation === 2) {
      const bestPerf  = perfs[0];
      const lastVaccin = vaccinations[0];

      if (bestPerf && ty < y + h - 2) {
        const concours = truncate(bestPerf.nom_concours || '', 15);
        doc.setFontSize(4);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(230, 126, 34);
        doc.text(`Perf: cl.${bestPerf.classement} ${concours}`, x + pad, ty);
        ty += 2.5;
      }

      if (lastVaccin && ty < y + h - 2) {
        doc.setFontSize(4);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(39, 174, 96);
        doc.text('Vaccin: ' + truncate(lastVaccin.produit || '', 15), x + pad, ty);
      }
    }
  }

  // Connecteur en L entre deux cellules adjacentes
  function drawConnector(x1, y1, x2, y2) {
    if ([x1, y1, x2, y2].some(v => isNaN(v) || v == null)) return;
    const midX = (x1 + x2) / 2;
    doc.setDrawColor(189, 195, 199);
    doc.setLineWidth(0.2);
    doc.setLineDashPattern([], 0);
    doc.line(x1, y1, midX, y1);
    doc.line(midX, y1, midX, y2);
    doc.line(midX, y2, x2, y2);
  }

  // ── Dessin ────────────────────────────────────────────────────────────────────
  try {
    const p = pedigree;

    // Génération 0 — pigeon principal
    drawCell(p, COL_X[0], positions.g0[0] - heights.g0 / 2, COL_W[0], heights.g0, 0);

    // Génération 1 — parents
    drawCell(p.pere, COL_X[1], positions.g1[0] - heights.g1 / 2, COL_W[1], heights.g1, 1);
    drawCell(p.mere, COL_X[1], positions.g1[1] - heights.g1 / 2, COL_W[1], heights.g1, 1);

    drawConnector(COL_X[0] + COL_W[0], positions.g0[0], COL_X[1], positions.g1[0]);
    drawConnector(COL_X[0] + COL_W[0], positions.g0[0], COL_X[1], positions.g1[1]);

    // Génération 2 — grands-parents
    const gps = [p.pere?.pere, p.pere?.mere, p.mere?.pere, p.mere?.mere];
    gps.forEach((gp, i) => {
      drawCell(gp, COL_X[2], positions.g2[i] - heights.g2 / 2, COL_W[2], heights.g2, 2);
    });

    drawConnector(COL_X[1] + COL_W[1], positions.g1[0], COL_X[2], positions.g2[0]);
    drawConnector(COL_X[1] + COL_W[1], positions.g1[0], COL_X[2], positions.g2[1]);
    drawConnector(COL_X[1] + COL_W[1], positions.g1[1], COL_X[2], positions.g2[2]);
    drawConnector(COL_X[1] + COL_W[1], positions.g1[1], COL_X[2], positions.g2[3]);

    // Génération 3 — arrière-grands-parents
    const agps = [
      p.pere?.pere?.pere, p.pere?.pere?.mere,
      p.pere?.mere?.pere, p.pere?.mere?.mere,
      p.mere?.pere?.pere, p.mere?.pere?.mere,
      p.mere?.mere?.pere, p.mere?.mere?.mere,
    ];
    agps.forEach((agp, i) => {
      drawCell(agp, COL_X[3], positions.g3[i] - heights.g3 / 2, COL_W[3], heights.g3, 3);
    });

    gps.forEach((_, gi) => {
      drawConnector(COL_X[2] + COL_W[2], positions.g2[gi], COL_X[3], positions.g3[gi * 2]);
      drawConnector(COL_X[2] + COL_W[2], positions.g2[gi], COL_X[3], positions.g3[gi * 2 + 1]);
    });

    // ── Pied de page ──────────────────────────────────────────────────────────
    const footerY = PH - 4;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(127, 140, 141);
    doc.text(`Généré le ${dateStr}`, MARGIN, footerY);
    doc.text(pedigree.matricule, PW / 2, footerY, { align: 'center' });
    doc.text('1 / 1', PW - MARGIN, footerY, { align: 'right' });

    const safe = pedigree.matricule.replace(/[^a-zA-Z0-9-]/g, '_');
    doc.save(`pedigree-${safe}.pdf`);
    showNotification('PDF téléchargé ✅');
  } catch (err) {
    console.error('Erreur PDF:', err);
    showNotification('Erreur PDF : ' + err.message, 'danger');
  }
}
