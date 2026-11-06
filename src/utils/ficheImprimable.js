import { formaterDate } from './recettes';

/**
 * Contenu de la fiche imprimable, sous forme de textes prêts à afficher.
 *
 * Une seule source pour les deux sorties :
 *  - FicheImpression.jsx (impression par le navigateur) ;
 *  - fichePdf.js (bouton « Télécharger »).
 * Les deux affichent donc exactement les mêmes valeurs, au même endroit.
 */

export const NB_NUANCES_FICHE = 6;
const NB_COLORANTS = 3;

// Largeurs relatives des colonnes (identiques pour l'impression et le PDF)
export const LARGEURS_IDENT = [0.17, 0.22, 0.25, 0.2, 0.16];
export const LARGEURS_PRODUITS = [0.34, 0.23, 0.17, 0.11, 0.15];
export const LARGEUR_PH = 0.3;

// Seuils au-delà desquels un texte libre passe en petite police
const SEUIL_TEXTE = 140;
const SEUIL_OBSERVATIONS = 180;

const rempli = (v) => v !== null && v !== undefined && v !== '';
// Valeur affichable : vide plutôt que « NaN », « Infinity » ou « — »
const propre = (v) => {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /NaN|Infinity|^—$/.test(s) ? '' : s;
};
const estLong = (v, seuil) => String(v || '').length > seuil || String(v || '').split('\n').length > 2;

export const construireFiche = ({ recette, couleurs, projetNom, calculs, t, aff, langue }) => {
  const n = (v) => propre(aff(propre(v)));
  const colonnes = Array.from({ length: NB_NUANCES_FICHE }, (_, i) => couleurs[i] || null);
  const colorantPresent = (i) => rempli(recette[`colorant_${i}`]);
  const mordantPresent = (i) => rempli(recette[`mordant_${i}`]);
  const indexColorants = Array.from({ length: NB_COLORANTS }, (_, i) => i + 1);
  // Au moins 2 lignes de sels (comme le modèle papier), 3 si le 3e est utilisé
  const indexSels = mordantPresent(3) ? [1, 2, 3] : [1, 2];

  const code = (valeurs) => (valeurs.every(rempli) ? valeurs.map((v) => n(v)).join(' · ') : '');
  const parNuance = (f) => colonnes.map((c) => (c ? propre(f(c)) : ''));
  const texteLong = (label, valeur, seuil = SEUIL_TEXTE) => ({
    haute: true,
    cases: [{ label, valeur: valeur || '', petit: estLong(valeur, seuil) }],
  });

  // Trois cases % / quantité / unité par nuance
  const triple = (present, pourcent, quantite, unite) =>
    colonnes.map((c) => (c && present ? [n(pourcent(c)), n(quantite(c)), unite] : ['', '', '']));

  const sousTitre = (label) => ({
    type: 'sousTitre',
    label,
    sous: [t('impression.pourcent'), t('impression.quantite'), t('impression.unite')],
  });

  return {
    marque: 'Tinctilab',
    bain: [
      `${t('fiche.rapportDeBain')} : ${rempli(recette.rapport_de_bain) ? `1:${recette.rapport_de_bain}` : '—'}`,
      `${t('fiche.partsTotales')} : ${rempli(recette.nb_parts_totales) ? n(recette.nb_parts_totales) : '—'}`,
    ],

    ident: [
      { label: t('impression.numeroFiche'), valeur: propre(recette.numero_fiche), gras: true },
      { label: t('impression.projet'), valeur: propre(projetNom) },
      { label: t('fiche.objet'), valeur: propre(recette.objet) },
      { label: t('fiche.nom'), valeur: propre(recette.nom) },
      { label: t('fiche.date'), valeur: formaterDate(recette.date, langue) },
    ],

    infos: [
      {
        cases: [
          { label: t('fiche.matiere'), valeur: propre(recette.matiere) },
          { label: t('fiche.phEau'), valeur: rempli(recette.ph_eau) ? n(recette.ph_eau) : '' },
        ],
      },
      texteLong(t('fiche.preMordancage'), recette.pre_mordancage),
      texteLong(t('fiche.monteeTemperature'), recette.montee_temperature),
      { cases: [{ label: t('impression.nuancage'), valeur: '' }] },
      texteLong(t('fiche.observations'), recette.observations, SEUIL_OBSERVATIONS),
    ],

    colorants: {
      entetes: [
        t('fiche.colorant'), t('fiche.fournisseur'), t('fiche.lot'),
        t('impression.concentration'), t('impression.solMere'),
      ],
      lignes: indexColorants.map((i) => [
        propre(recette[`colorant_${i}`]),
        propre(recette[`colorant_${i}_fournisseur`]),
        propre(recette[`colorant_${i}_lot`]),
        colorantPresent(i) ? n(recette[`colorant_${i}_qte_poudre`]) : '',
        colorantPresent(i) ? n(recette[`colorant_${i}_dilution`]) : '',
      ]),
    },

    // Dernière colonne (Sol. mère) sur la largeur des deux dernières colonnes des colorants
    sels: {
      entetes: [t('impression.selNuancage'), t('fiche.fournisseur'), t('fiche.lot'), t('impression.solMere')],
      lignes: indexSels.map((i) => [
        propre(recette[`mordant_${i}`]),
        propre(recette[`mordant_${i}_fournisseur`]),
        propre(recette[`mordant_${i}_lot`]),
        mordantPresent(i) ? n(recette[`mordant_${i}_dilution`] || 1) : '',
      ]),
    },

    // Tableau des nuances, ligne par ligne
    recette: [
      {
        type: 'titre',
        label: t('impression.recette'),
        valeurs: colonnes.map((c, i) => String(c ? c.couleur_numero : i + 1)),
      },
      {
        type: 'parts',
        label: t('fiche.nbParts'),
        gris: true,
        valeurs: colonnes.map((c) =>
          indexColorants.map((k) => (c && colorantPresent(k) ? n(c[`nb_part_colorant_${k}`] ?? 0) : ''))),
      },
      {
        type: 'simple',
        label: t('fiche.profondeur'),
        valeurs: parNuance((c) => (rempli(c.profondeur_ton) ? n(Number(c.profondeur_ton).toFixed(2)) : '')),
      },
      { type: 'simple', label: `${t('fiche.poids')} (g)`, gris: true, valeurs: parNuance((c) => n(c.poids_tissu)) },
      {
        type: 'simple',
        label: `${t('impression.volumeBain')} (ml)`,
        valeurs: parNuance((c) => n(calculs.volumeBain(c))),
      },
      { type: 'simple', label: t('impression.piedDeBleu'), gris: true, valeurs: parNuance((c) => c.bleu_depart || '') },
      { type: 'simple', label: t('impression.infos'), petit: true, valeurs: parNuance((c) => c.info || '') },

      sousTitre(t('impression.colorants')),
      ...indexColorants.map((i) => ({
        type: 'triple',
        label: recette[`colorant_${i}`] || t('impression.colorantN', { n: i }),
        gris: i === 2,
        valeurs: triple(
          colorantPresent(i),
          (c) => calculs.pourcentColorant(c, i),
          (c) => calculs.quantiteColorant(c, i),
          calculs.unite(i, 'colorant'),
        ),
      })),
      {
        type: 'simple',
        label: `${t('impression.volumeEau')} (ml)`,
        gris: true,
        valeurs: parNuance((c) => n(calculs.volumeEau(c))),
      },

      sousTitre(t('impression.sels')),
      ...indexSels.map((i) => ({
        type: 'triple',
        label: recette[`mordant_${i}`] || t('impression.selN', { n: i }),
        gris: i % 2 === 1,
        valeurs: triple(
          mordantPresent(i),
          (c) => c[`pourcent_mordant_${i}`],
          (c) => calculs.quantiteMordant(c, i),
          calculs.unite(i, 'mordant'),
        ),
      })),

      {
        type: 'colorimetrie',
        label: t('impression.colorimetrie'),
        lignes: ['Lab', 'LCh'],
        gris: true,
        valeurs: colonnes.map((c) =>
          c
            ? [
              code([c.couleur_lab_l, c.couleur_lab_a, c.couleur_lab_b]),
              code([c.couleur_lab_l, c.couleur_lch_c, c.couleur_lch_h]),
            ]
            : ['', '']),
      },
    ],
  };
};
