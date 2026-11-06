# Passage en multi-clients : guide de mise en place

Ce guide règle les trois problèmes à corriger avant d'ouvrir la version payante :

1. Une seule table `recettes` avec `projet_id`, protégée par des règles RLS (fini les tables `recettes_<projet>`).
2. `CreerProjetModal.jsx` ne donne plus de droits d'administrateur à des comptes écrits en dur.
3. La page Admin passe par l'Edge Function `gestion-membres` et n'appelle plus `auth.admin.listUsers()` depuis le navigateur.

> **Ordre important.** L'ancienne application ne fonctionne plus une fois la migration appliquée (elle lit les tables `recettes_*` et écrit directement dans `droits_projet`). La nouvelle application ne fonctionne pas tant que la migration n'est pas appliquée. Les étapes 3 à 5 se font donc d'affilée, de préférence à un moment où personne ne saisit de fiche.

---

## Étape 1 : sauvegarde

Supabase > **Database > Backups** : vérifier qu'une sauvegarde récente existe (ou en déclencher une si ton offre le permet). Sinon, exporter les tables `recettes_*`, `projets` et `droits_projet` depuis le **Table Editor** (Export to CSV).

## Étape 2 : vérifications (lecture seule)

Supabase > **SQL Editor** : coller `supabase/sql/00_verifications_avant_migration.sql` et exécuter **les requêtes une par une**.

| Requête | Résultat attendu |
|---|---|
| 1 | La liste de tes tables `recettes_*` et leur nombre de lignes. |
| 2 | `table_existe = true` pour chaque projet qui a des fiches. |
| 3 | `projets.id`, `droits_projet.utilisateur_id` et `droits_projet.projet_id` en `uuid`. |
| 4 | Aucune ligne (pas de doublon utilisateur / projet). |
| 5 | `supprimer_fiche`, `create_recettes_table`, `handle_new_projet` et le déclencheur `on_projet_created` : tous sont traités par la migration. |
| 6 | Les règles RLS actuelles (pour mémoire : elles vont être remplacées). |
| 7 | Les droits des deux comptes qui étaient écrits en dur (voir l'étape 6). |

**Si un résultat diffère, s'arrêter et me renvoyer la sortie.** Le cas le plus probable : un projet renommé depuis la création de sa table (requête 2 : `table_existe = false` alors que le projet a des fiches). La migration le signale aussi par un avertissement, mais il vaut mieux le voir avant.

## Étape 3 : migration

SQL Editor : coller `supabase/migrations/20261030000000_securisation_multi_clients.sql` en entier et exécuter.

- Le script tourne dans une transaction : en cas d'erreur, **rien n'est modifié**.
- Les messages (onglet *Results* / *Messages*) indiquent le nombre de lignes reprises par projet, et un avertissement pour toute table `recettes_*` qui ne correspond à aucun projet.
- Les anciennes tables `recettes_*` sont **conservées** (voir l'étape 7).

Ce que fait la migration :

- **Plus de table créée par projet** : suppression du déclencheur `on_projet_created` et des fonctions `handle_new_projet` et `create_recettes_table`. Cette dernière était appelable par n'importe qui via l'API, puisqu'elle était en SECURITY DEFINER sans restriction d'exécution. L'ajout du créateur comme Administrateur, que faisait `handle_new_projet`, est repris par `creer_projet`.
- **Table `public.recettes`** : mêmes colonnes que tes tables actuelles, plus `projet_id` (clé étrangère vers `projets`, suppression en cascade). Index sur `(projet_id, recette_id)` et `(projet_id, date)`. Le numéro de fiche reste unique **par projet** (contrainte d'exclusion, code d'erreur 23P01, déjà géré par le formulaire), et une nuance n'apparaît qu'une fois par fiche (`unique (recette_id, couleur_numero)`), comme avant.
- **RLS** :
  - `recettes` : lecture par les membres du projet uniquement. Aucune écriture directe depuis le navigateur.
  - `projets` : lecture par les membres ; renommage par les administrateurs.
  - `droits_projet` : chacun voit ses propres droits ; un administrateur voit ceux de son projet. Aucune écriture depuis le navigateur.
  - Plus aucun accès pour le rôle `anon` (visiteur non connecté).
- **Fonctions appelées par l'application** (elles vérifient le rôle côté serveur) :
  - `creer_projet(p_nom)` : crée le projet et donne le rôle Administrateur **au seul créateur**.
  - `enregistrer_fiche(p_projet_id, p_recette_id, p_lignes)` : réservée aux rôles Administrateur et Teinturier. Elle remplace les nuances en une seule transaction. Avant, les anciennes règles réservaient la suppression aux Administrateurs : quand un Teinturier modifiait une fiche, la suppression des anciennes nuances ne faisait rien et la réinsertion échouait.
  - `supprimer_fiche(p_projet_id, p_recette_id)` : réservée aux Administrateurs (remplace l'ancienne version).
- **Fonctions réservées au serveur** (`membres_projet`, `utilisateur_par_email`) : elles lisent `auth.users` et ne sont exécutables qu'avec la clé secrète, donc uniquement par l'Edge Function.

## Étape 4 : Edge Function `gestion-membres`

Avec la CLI Supabase (`npm i -g supabase` ou `brew install supabase/tap/supabase`), à la racine du dépôt :

```bash
supabase login
supabase link --project-ref vdlxzugpwrqtuqrgexyh

# Optionnel mais recommandé : n'accepter que les appels venant de ton site
supabase secrets set ORIGINES_AUTORISEES="https://amalice.github.io,http://localhost:3000"
# Page vers laquelle renvoie l'e-mail d'invitation
supabase secrets set URL_APPLICATION="https://amalice.github.io/teintures/"

supabase functions deploy gestion-membres
```

Sans la CLI : Supabase > **Edge Functions > Deploy a new function > Via Editor**, nom `gestion-membres`, coller le contenu de `supabase/functions/gestion-membres/index.ts`. Les secrets se règlent dans **Edge Functions > Secrets**.

`SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont fournies automatiquement à la fonction : **la clé secrète n'apparaît nulle part dans le code ni dans GitHub.** Laisser l'option « Verify JWT » activée (réglage par défaut).

Pour les invitations par e-mail, avant l'ouverture payante :

- **Authentication > URL Configuration** : *Site URL* = l'adresse GitHub Pages de l'application, et l'ajouter aux *Redirect URLs*.
- **Authentication > Emails > SMTP Settings** : configurer un SMTP (Brevo, Resend, Postmark…). Le serveur d'e-mails intégré de Supabase est limité à quelques envois par heure.

## Étape 5 : déployer l'application

Fusionner la branche `securisation-multi-clients` dans `main` (ou appliquer le patch, puis commit et push sur `main`). Le workflow GitHub Actions recompile et publie.

> La compilation n'a pas pu être lancée de mon côté (paquets npm inaccessibles). La syntaxe et les imports de tous les fichiers ont été vérifiés, mais surveille le premier passage du workflow : sur GitHub Actions, les avertissements ESLint bloquent la compilation.

Puis tester, avec un compte de chaque rôle si possible :

- [ ] Accueil : les dernières fiches du projet s'affichent.
- [ ] Nuancier, et ouverture d'une fiche.
- [ ] Modifier une fiche et l'enregistrer (Administrateur, Teinturier) ; un Visiteur reçoit un refus.
- [ ] Créer une fiche avec un numéro déjà pris : la fenêtre d'alerte s'affiche.
- [ ] Supprimer une fiche (Administrateur seulement).
- [ ] Recherche de teinte : résultats de tous tes projets, et d'aucun autre.
- [ ] Créer un projet : il apparaît, et toi seul en es membre.
- [ ] Menu du compte > « Gérer les membres » : liste, changement de rôle, ajout par e-mail, retrait.
- [ ] Avec un compte membre d'un seul projet : aucun autre projet ni aucune autre fiche n'est visible.

## Étape 6 : droits des deux comptes écrits en dur

L'ancien code ajoutait `80ed0f34-…` et `1be747ff-…` comme Administrateurs de **chaque** nouveau projet. Le nouveau code ne le fait plus, mais les droits déjà accordés restent. Avec le résultat de la requête 7 de l'étape 2 : sur chaque projet client où ces comptes n'ont rien à faire, les retirer depuis la page « Gérer les membres » (ou en SQL : `delete from droits_projet where projet_id = '…' and utilisateur_id = '…';`).

Si l'un de ces comptes est le tien, garde-le là où tu en as besoin : un projet doit toujours garder au moins un administrateur.

## Étape 7 : supprimer les anciennes tables (quelques jours plus tard)

Quand tout fonctionne : `supabase/sql/02_suppression_anciennes_tables.sql`. Lancer d'abord le contrôle (requête 1 : les deux colonnes doivent être égales pour chaque projet), puis décommenter et exécuter le bloc de suppression.

---

## Fichiers modifiés dans le dépôt

| Fichier | Changement |
|---|---|
| `src/components/CreerProjetModal.jsx` | Plus d'identifiants en dur ; appel de `creer_projet`. |
| `src/pages/Admin.jsx` | Réécrit : passe par l'Edge Function, n'affiche que les membres du projet, ajout et invitation par e-mail, retrait. |
| `src/utils/recettes.js` | Table unique `recettes`, filtre `projet_id`. |
| `src/components/Accueil.jsx`, `Nuancier.jsx`, `RecetteView.jsx` | Lecture dans `recettes` filtrée par `projet_id`. |
| `src/components/RecetteForm.jsx` | Lecture filtrée ; enregistrement via `enregistrer_fiche`. |
| `src/components/RechercheCouleur.jsx` | Une seule requête pour tous les projets accessibles. |
| `src/App.jsx` | Lien « Gérer les membres » dans le menu du compte (Administrateurs). |
| `src/i18n/fr.js`, `en.js` | Textes de la page Admin. |
| `src/utils/tableNames.js` | Supprimé. |
| `src/components/AjouterUtilisateurModal.jsx` | Supprimé (n'était utilisé nulle part et écrivait dans `utilisateurs` depuis le navigateur). |
| `supabase/…` | Nouveaux : scripts SQL, Edge Function, ce guide. |

## Points restant ouverts

- **Mot de passe des personnes invitées.** Réglé : voir `GUIDE_INVITATIONS.md` (écran Bienvenue, « Mot de passe oublié ? », renvoi d'invitation).
- **Premier projet d'un nouveau client.** `creer_projet` est réservée aux personnes déjà administratrices d'un projet (comme le bouton actuel). Pour un nouveau client : tu crées son projet, puis tu l'ajoutes comme Administrateur et tu te retires. À relier plus tard à l'inscription et au paiement.
- **Table `utilisateurs`.** Elle n'est plus utilisée par l'application : vérifier ses règles RLS, ou la supprimer.
