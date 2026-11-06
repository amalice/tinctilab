-- =====================================================================
-- Sels de nuançage : fournisseur et lot, comme pour les colorants
-- =====================================================================
--
-- Ajoute mordant_1_fournisseur, mordant_1_lot … mordant_3_lot à la table
-- recettes (les colonnes « mordant_* » sont affichées « Sel de nuançage »).
--
-- Rien d'autre à modifier : enregistrer_fiche() insère toutes les colonnes
-- de la table présentes dans les données envoyées par l'application.
-- Les fiches existantes gardent ces champs vides.
--
-- À coller dans Supabase > SQL Editor et exécuter.
-- =====================================================================

alter table public.recettes
  add column if not exists mordant_1_fournisseur text,
  add column if not exists mordant_1_lot         text,
  add column if not exists mordant_2_fournisseur text,
  add column if not exists mordant_2_lot         text,
  add column if not exists mordant_3_fournisseur text,
  add column if not exists mordant_3_lot         text;

-- Contrôle (facultatif) : les six colonnes doivent apparaître
-- select column_name, data_type from information_schema.columns
-- where table_schema = 'public' and table_name = 'recettes'
--   and column_name like 'mordant\_%' order by column_name;
