import { supabase } from '../supabaseClient';

// Toutes les fiches de tous les projets sont dans une seule table, filtrée par projet_id.
// Les règles RLS de Supabase garantissent qu'un utilisateur ne lit que ses projets.
export const TABLE_RECETTES = 'recettes';

// Champs communs à toute la fiche (répétés sur chaque ligne-nuance de la table)
export const CHAMPS_RECETTE = [
  'numero_fiche', 'date', 'objet', 'matiere', 'observations', 'pre_mordancage', 'nom',
  'ph_eau', 'montee_temperature',
  'rapport_de_bain', 'nb_parts_totales',
  ...[1, 2, 3].flatMap((i) => [
    `colorant_${i}`, `colorant_${i}_fournisseur`, `colorant_${i}_lot`,
    `colorant_${i}_qte_poudre`, `colorant_${i}_dilution`,
  ]),
  // Colonnes « mordant_* » : affichées « Sel de nuançage » dans l'interface
  ...[1, 2, 3].flatMap((i) => [
    `mordant_${i}`, `mordant_${i}_fournisseur`, `mordant_${i}_lot`, `mordant_${i}_dilution`,
  ]),
];

// Champs propres à chaque nuance
export const CHAMPS_COULEUR = [
  'couleur_numero',
  'nb_part_colorant_1', 'nb_part_colorant_2', 'nb_part_colorant_3',
  'profondeur_ton', 'poids_tissu', 'bleu_depart', 'info',
  'pourcent_mordant_1', 'pourcent_mordant_2', 'pourcent_mordant_3',
  'couleur_lab_l', 'couleur_lab_a', 'couleur_lab_b',
  'couleur_lch_c', 'couleur_lch_h',
];

/**
 * Charge toutes les lignes d'une requête, par paquets : Supabase ne renvoie
 * au plus que 1000 lignes par appel (une fiche = jusqu'à 6 lignes).
 * `construireRequete` doit renvoyer une requête triée de façon stable.
 * @returns {Promise<{data: Array|null, error: object|null}>}
 */
export const chargerToutesLesLignes = async (construireRequete, taille = 1000) => {
  const lignes = [];
  for (let debut = 0; ; debut += taille) {
    const { data, error } = await construireRequete().range(debut, debut + taille - 1);
    if (error) return { data: null, error };
    lignes.push(...data);
    if (data.length < taille) return { data: lignes, error: null };
  }
};

/** Ne garde de `ligne` que les champs listés. */
export const extraire = (ligne, champs) =>
  Object.fromEntries(champs.map((champ) => [champ, ligne?.[champ] ?? null]));

/**
 * Vrai si une autre fiche du projet porte déjà ce numéro.
 * `recetteIdExclu` : la fiche en cours de modification (elle ne compte pas comme doublon).
 */
export const numeroFicheExiste = async (projetId, numero, recetteIdExclu = null) => {
  let requete = supabase
    .from(TABLE_RECETTES)
    .select('recette_id')
    .eq('projet_id', projetId)
    .eq('numero_fiche', numero)
    .limit(1);
  if (recetteIdExclu) requete = requete.neq('recette_id', recetteIdExclu);
  const { data, error } = await requete;
  if (error) throw error;
  return data.length > 0;
};

/**
 * Cherche une recette par son numéro de fiche.
 * L'erreur éventuelle est renvoyée sous forme de clé de traduction (+ message technique) :
 * l'appelant l'affiche avec t(erreur.cle, { message: erreur.message }).
 * @returns {Promise<{recetteId: string|null, erreur: {cle: string, message?: string}|null}>}
 */
export const rechercherRecetteParNumero = async (projetId, numero) => {
  if (!numero || !projetId) return { recetteId: null, erreur: null };

  try {
    const { data, error } = await supabase
      .from(TABLE_RECETTES)
      .select('recette_id')
      .eq('projet_id', projetId)
      .eq('numero_fiche', numero)
      .limit(1);

    if (error) {
      console.error('Erreur Supabase:', error);
      return { recetteId: null, erreur: { cle: 'commun.erreur', message: error.message } };
    }
    if (data && data.length > 0) {
      return { recetteId: data[0].recette_id, erreur: null };
    }
    return { recetteId: null, erreur: { cle: 'commun.aucuneRecetteNumero' } };
  } catch (err) {
    console.error('Erreur:', err);
    return { recetteId: null, erreur: { cle: 'commun.erreurGenerique' } };
  }
};

/** Formate une date ISO (AAAA-MM-JJ) : « 5 avr. 2026 » en français, « 5 Apr 2026 » en anglais. */
export const formaterDate = (date, langue = 'fr') => {
  if (!date) return '';
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString(langue === 'en' ? 'en-GB' : 'fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};
