import { NB_NUANCES_FICHE, LARGEURS_IDENT, LARGEURS_PRODUITS, LARGEUR_PH } from './ficheImprimable';

/**
 * PDF de la fiche recette (bouton « Télécharger »).
 *
 * Reprend à l'identique la fiche imprimée (FicheImpression.jsx + styles .fi-* de index.css) :
 * même contenu (construireFiche), mêmes dimensions en millimètres, mêmes tailles de police,
 * mêmes gris. Une page A4 paysage, texte vectoriel (net et sélectionnable).
 *
 * Si la mise en page imprimée change dans index.css, reporter les cotes ci-dessous.
 */

// ---- Cotes (mm), reprises de index.css ----
// Hauteurs de ligne telles que le navigateur les dessine : hauteur CSS + bordure
// (+ marge intérieure haute de 1,2 mm pour le bloc d'informations).
const PAGE = { largeur: 297, hauteur: 210 };
const MARGES = { haut: 8, droite: 9, bas: 16, gauche: 9 };
const H_LIGNE = 5.86; // .fi-table td : 5,6 mm
const H_IDENT = 7.26; // .fi-ident td : 7 mm
const H_INFO = 7.06; // .fi-infos td : 5,6 mm + 1,2 mm
const H_HAUTE = 15.86; // .fi-infos tr.fi-haute td : 14,4 mm + 1,2 mm
const H_BOITE = 12.8; // .fi-boite max-height
const H_COLORIMETRIE = 9.26; // .fi-colorimetrie : 9 mm
const LARGEUR_LIB = 41; // .fi-col-lib
const PADDING = 1.6;
const PADDING_SC = 0.5;
const CASE = { largeur: 9.4, hauteur: 4.6, ecart: 1.2 }; // .fi-case : 9 × 4,2 mm + bordure
const INTERLIGNE = 1.2;

// Traits et gris
const TRAIT_FIN = 0.4; // pt
const TRAIT_FORT = 1; // pt
const TRAIT_CASE = 0.6; // pt
const GRIS_TRAIT = 0x9a / 255;
const GRIS_SOUS_COLONNE = 0xd4 / 255;
const GRIS_FOND = 0xec / 255;
const GRIS_LIBELLE = 0x33 / 255;
const GRIS_ENTETE = 0x44 / 255;
const GRIS_CASE = 0x55 / 255;

const PT_PAR_MM = 72 / 25.4;
const pt = (mm) => mm * PT_PAR_MM;
const mmDePt = (p) => p / PT_PAR_MM;

/**
 * @param {object} fiche résultat de construireFiche()
 * @returns {Promise<Uint8Array>} le PDF
 */
export const genererFichePdf = async (fiche, { titre = 'Fiche recette' } = {}) => {
  // Chargé à la demande : la bibliothèque n'alourdit pas le reste du site
  const { PDFDocument, StandardFonts, rgb, grayscale } = await import('pdf-lib');

  const doc = await PDFDocument.create();
  doc.setTitle(titre);
  doc.setCreator('Tinctilab');
  const page = doc.addPage([pt(PAGE.largeur), pt(PAGE.hauteur)]);

  const polices = {
    normal: await doc.embedFont(StandardFonts.Helvetica),
    gras: await doc.embedFont(StandardFonts.HelveticaBold),
    serif: await doc.embedFont(StandardFonts.TimesRoman),
    serifGras: await doc.embedFont(StandardFonts.TimesRomanBold),
  };

  // Les polices standard du PDF ne connaissent que l'alphabet latin (WinAnsi) :
  // tout autre caractère est remplacé, plutôt que de faire échouer le téléchargement.
  const encodables = new Map();
  const nettoyer = (texte, police) =>
    Array.from(String(texte ?? '').replace(/\u2212/g, '-').replace(/\t/g, ' '))
      .map((car) => {
        if (car === '\n') return car; // retours à la ligne gérés par texteLong()
        const cle = `${police.name}${car}`;
        if (!encodables.has(cle)) {
          try {
            police.encodeText(car);
            encodables.set(cle, true);
          } catch {
            encodables.set(cle, false);
          }
        }
        return encodables.get(cle) ? car : '?';
      })
      .join('');

  const largeurTexte = (texte, police, taille) => mmDePt(police.widthOfTextAtSize(texte, taille));

  // Coupe le texte avec « … » s'il dépasse la largeur disponible (comme text-overflow: ellipsis)
  const ajuster = (texte, police, taille, largeur) => {
    let s = nettoyer(texte, police);
    if (largeurTexte(s, police, taille) <= largeur) return s;
    while (s.length > 0 && largeurTexte(`${s}…`, police, taille) > largeur) s = s.slice(0, -1);
    return s.length ? `${s.trimEnd()}…` : '';
  };

  // ---- Primitives de dessin (coordonnées en mm depuis le coin haut gauche de la zone utile) ----
  const X = (mm) => pt(MARGES.gauche + mm);
  const Y = (mm) => pt(PAGE.hauteur - MARGES.haut - mm);

  const fond = (x, y, l, h, gris = GRIS_FOND) =>
    page.drawRectangle({ x: X(x), y: Y(y + h), width: pt(l), height: pt(h), color: grayscale(gris) });

  const trait = (x1, y1, x2, y2, epaisseur = TRAIT_FIN, gris = GRIS_TRAIT) =>
    page.drawLine({
      start: { x: X(x1), y: Y(y1) },
      end: { x: X(x2), y: Y(y2) },
      thickness: epaisseur,
      color: grayscale(gris),
    });

  const cadre = (x, y, l, h, epaisseur = TRAIT_FORT, gris = 0) =>
    page.drawRectangle({
      x: X(x), y: Y(y + h), width: pt(l), height: pt(h),
      borderWidth: epaisseur, borderColor: grayscale(gris),
    });

  // Texte sur une ligne, centré verticalement dans [y, y + h]
  const texte = (s, x, y, h, { police = polices.normal, taille = 8.5, gris = 0, align = 'left', largeur } = {}) => {
    const contenu = largeur !== undefined ? ajuster(s, police, taille, largeur) : nettoyer(s, police);
    if (!contenu) return 0;
    const l = largeurTexte(contenu, police, taille);
    let x0 = x;
    if (align === 'center') x0 = x + (largeur - l) / 2;
    if (align === 'right') x0 = x + largeur - l;
    // ligne de base : milieu de la case + la moitié de la hauteur des capitales (~0,7 em)
    const base = y + h / 2 + mmDePt(taille) * 0.35;
    page.drawText(contenu, { x: X(x0), y: Y(base), size: taille, font: police, color: rgb(gris, gris, gris) });
    return l;
  };

  // « Libellé : » en gris puis la valeur, sur une ligne
  const libelleValeur = (label, valeur, x, y, h, largeur, { taille = 8.5, gras = false } = {}) => {
    const lib = `${label} : `;
    const l = texte(lib, x, y, h, { taille, gris: GRIS_LIBELLE, largeur });
    texte(valeur, x + l, y, h, { taille, police: gras ? polices.gras : polices.normal, largeur: Math.max(0, largeur - l) });
  };

  // Texte libre sur plusieurs lignes (retours à la ligne conservés), coupé à la hauteur de la boîte
  const texteLong = (label, valeur, x, y, largeur, hauteurMax, taille) => {
    const police = polices.normal;
    const hLigne = mmDePt(taille) * INTERLIGNE;
    const lignesMax = Math.max(1, Math.floor(hauteurMax / hLigne + 0.01));
    const lib = nettoyer(`${label} : `, police);
    const lLib = largeurTexte(lib, police, taille);

    // Découpe en lignes : la première commence après le libellé
    const lignes = [];
    let courante = '';
    let dispo = largeur - lLib;
    const pousser = () => {
      lignes.push(courante);
      courante = '';
      dispo = largeur;
    };
    nettoyer(valeur, police).split('\n').forEach((paragraphe, iPar) => {
      if (iPar > 0) pousser();
      paragraphe.split(/(\s+)/).filter((m) => m !== '').forEach((mot) => {
        const essai = courante + mot;
        if (largeurTexte(essai, police, taille) <= dispo || courante === '') {
          // mot plus long que la ligne : on le coupe
          let m = essai;
          while (largeurTexte(m, police, taille) > dispo && m.length > 1) {
            let coupe = m.length - 1;
            while (coupe > 1 && largeurTexte(m.slice(0, coupe), police, taille) > dispo) coupe -= 1;
            courante = m.slice(0, coupe);
            pousser();
            m = m.slice(coupe);
          }
          courante = m;
        } else {
          pousser();
          courante = mot.trimStart();
        }
      });
    });
    lignes.push(courante);

    const base0 = y + hLigne / 2 + mmDePt(taille) * 0.35; // même calage que texte()
    page.drawText(lib, { x: X(x), y: Y(base0), size: taille, font: police, color: rgb(GRIS_LIBELLE, GRIS_LIBELLE, GRIS_LIBELLE) });
    lignes.slice(0, lignesMax).forEach((l, i) => {
      const s = l.trimEnd();
      if (!s) return;
      page.drawText(s, {
        x: X(i === 0 ? x + lLib : x),
        y: Y(base0 + i * hLigne),
        size: taille,
        font: police,
        color: rgb(0, 0, 0),
      });
    });
  };

  const W = PAGE.largeur - MARGES.gauche - MARGES.droite;
  let y = 0;

  // ===== En-tête : marque à gauche, rapport de bain et parts totales à droite =====
  const hHaut = mmDePt(10) * INTERLIGNE;
  texte(fiche.marque, 0, 0, hHaut, { police: polices.serif, taille: 10, gris: GRIS_ENTETE });
  const bain = `${fiche.bain[0]}     ${fiche.bain[1]}`;
  texte(bain, 0, 0.3, hHaut, { taille: 8, gris: GRIS_ENTETE, align: 'right', largeur: W });
  y = hHaut + 1.5;

  // ===== Ligne d'identification =====
  {
    let x = 0;
    fiche.ident.forEach((c, i) => {
      const l = LARGEURS_IDENT[i] * W;
      libelleValeur(c.label, c.valeur, x + PADDING, y, H_IDENT, l - 2 * PADDING, { gras: c.gras });
      if (i > 0) trait(x, y, x, y + H_IDENT);
      x += l;
    });
    cadre(0, y, W, H_IDENT);
    y += H_IDENT;
  }

  // Cases courtes du bloc infos : texte en haut de la case (vertical-align: top, padding 1,2 mm)
  const caseInfo = (c, x, yc, largeur) =>
    libelleValeur(c.label, c.valeur, x, yc + 1.2, mmDePt(8.5) * INTERLIGNE, largeur);

  // ===== Informations (gauche) et produits (droite) =====
  const yMilieu = y;
  const lInfos = W / 2;
  const hauteursInfos = fiche.infos.map((ligne) => (ligne.haute ? H_HAUTE : H_INFO));
  const hMilieu = hauteursInfos.reduce((a, b) => a + b, 0);
  {
    let yl = yMilieu;
    fiche.infos.forEach((ligne, i) => {
      const h = hauteursInfos[i];
      if (ligne.cases.length === 2) {
        const lPh = LARGEUR_PH * lInfos;
        const [a, b] = ligne.cases;
        caseInfo(a, PADDING, yl, lInfos - lPh - 2 * PADDING);
        caseInfo(b, lInfos - lPh + PADDING, yl, lPh - 2 * PADDING);
        trait(lInfos - lPh, yl, lInfos - lPh, yl + h);
      } else if (ligne.haute) {
        const c = ligne.cases[0];
        texteLong(c.label, c.valeur, PADDING, yl + 1.2, lInfos - 2 * PADDING, H_BOITE, c.petit ? 7 : 8.5);
      } else {
        caseInfo(ligne.cases[0], PADDING, yl, lInfos - 2 * PADDING);
      }
      if (i > 0) trait(0, yl, lInfos, yl);
      yl += h;
    });
    cadre(0, yMilieu, lInfos, hMilieu);
  }

  // Tableaux des colorants et des sels : même grille de colonnes, hauteur répartie par ligne
  {
    const x0 = lInfos;
    const lProduits = W - lInfos;
    const largeurs = LARGEURS_PRODUITS.map((p) => p * lProduits);
    // Comme dans le navigateur (flex-grow = nombre de lignes) : la hauteur restante est
    // partagée entre les deux tableaux, puis entre leurs lignes (l'en-tête garde sa hauteur).
    const nbRangs = [fiche.colorants.lignes.length + 1, fiche.sels.lignes.length + 1];
    const surplus = hMilieu - (nbRangs[0] + nbRangs[1]) * H_LIGNE;
    const hCorps = (k) => H_LIGNE + (surplus * nbRangs[k]) / (nbRangs[0] + nbRangs[1]) / (nbRangs[k] - 1);

    const tableau = (bloc, yt, fusionDerniere, k) => {
      const rangs = [bloc.entetes, ...bloc.lignes];
      let yr = yt;
      rangs.forEach((rang, r) => {
        const hRang = r === 0 ? H_LIGNE : hCorps(k);
        if (r > 0 && (r - 1) % 2 === 0) fond(x0, yr, lProduits, hRang);
        let x = x0;
        rang.forEach((v, k) => {
          const fusion = fusionDerniere && k === rang.length - 1;
          const l = fusion ? largeurs[k] + largeurs[k + 1] : largeurs[k];
          const centre = r === 0 || k >= 3;
          texte(v, x + PADDING, yr, hRang, {
            taille: r === 0 ? 8.5 : 8,
            align: centre ? 'center' : 'left',
            largeur: l - 2 * PADDING,
          });
          if (k > 0) trait(x, yr, x, yr + hRang);
          x += l;
        });
        if (r > 0) trait(x0, yr, x0 + lProduits, yr);
        yr += hRang;
      });
      cadre(x0, yt, lProduits, yr - yt);
      return yr;
    };

    const ySels = tableau(fiche.colorants, yMilieu, false, 0);
    tableau(fiche.sels, ySels, true, 1);
  }
  y = yMilieu + hMilieu;

  // ===== Tableau des nuances =====
  {
    const lSous = (W - LARGEUR_LIB) / (NB_NUANCES_FICHE * 3);
    const lNuance = lSous * 3;
    const xNuance = (i) => LARGEUR_LIB + i * lNuance;
    const hauteur = (ligne) => (ligne.type === 'colorimetrie' ? H_COLORIMETRIE : H_LIGNE);
    const yDebut = y;

    fiche.recette.forEach((ligne) => {
      const h = hauteur(ligne);
      if (ligne.gris) fond(0, y, W, h);

      // Libellé de la ligne
      const titre = ['titre', 'sousTitre'].includes(ligne.type);
      if (ligne.type === 'colorimetrie') {
        const hL = h / 2;
        const l = texte(ligne.label, PADDING, y + 0.3, hL, { police: polices.serifGras, taille: 9 });
        texte(` ${ligne.lignes[0]}`, PADDING + l, y + 0.3, hL, { taille: 8 });
        texte(ligne.lignes[1], PADDING, y + hL - 0.3, hL, { taille: 8 });
      } else {
        texte(ligne.label, PADDING, y, h, {
          police: titre ? polices.serifGras : polices.normal,
          taille: titre ? 9 : 8,
          largeur: LARGEUR_LIB - 2 * PADDING,
        });
      }

      // Cases des nuances
      for (let i = 0; i < NB_NUANCES_FICHE; i += 1) {
        const x = xNuance(i);
        switch (ligne.type) {
          case 'titre':
            texte(ligne.valeurs[i], x, y, h, { police: polices.gras, align: 'center', largeur: lNuance });
            break;
          case 'parts': {
            const lCases = 3 * CASE.largeur + 2 * CASE.ecart;
            let xc = x + (lNuance - lCases) / 2;
            const yc = y + (h - CASE.hauteur) / 2;
            ligne.valeurs[i].forEach((v) => {
              fond(xc, yc, CASE.largeur, CASE.hauteur, 1);
              cadre(xc, yc, CASE.largeur, CASE.hauteur, TRAIT_CASE, GRIS_CASE);
              texte(v, xc, yc, CASE.hauteur, { taille: 8, align: 'center', largeur: CASE.largeur });
              xc += CASE.largeur + CASE.ecart;
            });
            break;
          }
          case 'sousTitre':
            ligne.sous.forEach((s, k) => texte(s, x + k * lSous + PADDING_SC, y, h, {
              taille: 7, gris: GRIS_LIBELLE, align: 'center', largeur: lSous - 2 * PADDING_SC,
            }));
            break;
          case 'triple':
            ligne.valeurs[i].forEach((v, k) => texte(v, x + k * lSous + PADDING_SC, y, h, {
              taille: 8, align: 'center', largeur: lSous - 2 * PADDING_SC,
            }));
            break;
          case 'colorimetrie': {
            const [a, b] = ligne.valeurs[i];
            const hL = h / 2;
            texte(a, x + PADDING, y + 0.6, hL, { taille: 7, align: 'center', largeur: lNuance - 2 * PADDING });
            texte(b, x + PADDING, y + hL - 0.6, hL, { taille: 7, align: 'center', largeur: lNuance - 2 * PADDING });
            break;
          }
          default:
            texte(ligne.valeurs[i], x + PADDING, y, h, {
              taille: ligne.petit ? 7 : 8.5, align: 'center', largeur: lNuance - 2 * PADDING,
            });
        }

        // Séparateurs fins entre % / quantité / unité
        if (ligne.type === 'sousTitre' || ligne.type === 'triple') {
          trait(x + lSous, y, x + lSous, y + h, TRAIT_FIN, GRIS_SOUS_COLONNE);
          trait(x + 2 * lSous, y, x + 2 * lSous, y + h, TRAIT_FIN, GRIS_SOUS_COLONNE);
        }
      }

      // Traits horizontaux : fort au début d'une section, fin sinon
      const section = ['titre', 'sousTitre', 'colorimetrie'].includes(ligne.type);
      if (y > yDebut) trait(0, y, W, y, section ? TRAIT_FORT : TRAIT_FIN, section ? 0 : GRIS_TRAIT);
      y += h;
    });

    // Traits verticaux entre nuances, puis cadre
    for (let i = 0; i < NB_NUANCES_FICHE; i += 1) trait(xNuance(i), yDebut, xNuance(i), y);
    cadre(0, yDebut, W, y - yDebut);
  }

  return doc.save();
};

/** Propose le PDF au téléchargement. */
export const telechargerPdf = (octets, nomFichier) => {
  const url = URL.createObjectURL(new Blob([octets], { type: 'application/pdf' }));
  const lien = document.createElement('a');
  lien.href = url;
  lien.download = nomFichier;
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
};
