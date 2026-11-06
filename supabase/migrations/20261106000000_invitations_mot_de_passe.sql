-- =====================================================================
-- Invitations : création du mot de passe par la personne invitée
-- =====================================================================
--
-- 1. membres_projet renvoie aussi « invitation_en_attente » : vrai tant que
--    la personne n'a pas choisi de mot de passe. La page Admin s'en sert pour
--    afficher « Invitation en attente » et le bouton « Renvoyer l'invitation ».
--
-- 2. Rattrapage : les comptes déjà invités qui n'ont jamais choisi de mot de
--    passe reçoivent user_metadata.invitation_en_attente = true. À leur prochaine
--    connexion par lien (invitation renvoyée ou « mot de passe oublié »),
--    l'application leur demandera leur nom et un mot de passe.
--
-- À exécuter en entier dans Supabase > SQL Editor (transaction : tout ou rien).
-- =====================================================================

begin;

-- 1. membres_projet : nouvelle colonne (le type de retour change : drop + create)
drop function if exists public.membres_projet(uuid);

create function public.membres_projet(p_projet_id uuid)
returns table (utilisateur_id uuid, email text, nom text, role text, invitation_en_attente boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select d.utilisateur_id,
         u.email::text,
         coalesce(nullif(trim(u.raw_user_meta_data ->> 'nom'), ''), split_part(u.email::text, '@', 1)),
         d.role,
         -- Source de vérité côté serveur : aucun mot de passe enregistré.
         (u.encrypted_password is null or u.encrypted_password = '')
  from public.droits_projet d
  join auth.users u on u.id = d.utilisateur_id
  where d.projet_id = p_projet_id
  order by lower(u.email::text)
$$;

revoke execute on function public.membres_projet(uuid) from public, anon, authenticated;
grant  execute on function public.membres_projet(uuid) to service_role;

-- 2. Rattrapage des comptes invités sans mot de passe
update auth.users
set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || '{"invitation_en_attente": true}'::jsonb
where invited_at is not null
  and (encrypted_password is null or encrypted_password = '');

commit;

-- Contrôle (facultatif) : comptes encore en attente
-- select email, invited_at, email_confirmed_at
-- from auth.users
-- where (raw_user_meta_data ->> 'invitation_en_attente')::boolean is true;
