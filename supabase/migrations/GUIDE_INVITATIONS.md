# Invitations : création du mot de passe

## Ce qui change pour les personnes invitées

1. Une administratrice ajoute une adresse e-mail sans compte depuis « Gérer les membres ».
2. La personne reçoit l'e-mail d'invitation et ouvre le lien.
3. L'application affiche un écran **Bienvenue** : elle choisit son **nom d'utilisateur** et son **mot de passe** (au moins 8 caractères, à confirmer).
4. Elle arrive ensuite sur l'accueil. Les fois suivantes, elle se connecte seule avec son e-mail et son mot de passe.

Si elle ferme l'onglet sans terminer, l'écran revient tant que sa session est ouverte. Si la session a expiré, elle passe par « Mot de passe oublié ? » sur la page de connexion, ou l'administratrice clique sur **Renvoyer l'invitation**.

## Ce qui change pour tout le monde

- **Mot de passe oublié ?** sur la page de connexion : la personne reçoit un lien pour choisir un nouveau mot de passe.
- Lien expiré ou déjà utilisé : un message l'explique sur la page de connexion, au lieu d'un écran vide.
- Le menu du compte affiche le nom d'utilisateur, et les initiales viennent de ce nom.

## Ce qui change pour les administratrices

Dans « Gérer les membres », les personnes qui n'ont pas encore choisi de mot de passe portent la mention **Invitation en attente**, avec un bouton **Renvoyer l'invitation** :

- si le premier lien n'a jamais été ouvert (ou a expiré), une nouvelle invitation part ;
- si le lien a été ouvert mais qu'aucun mot de passe n'a été choisi, la personne reçoit un e-mail de réinitialisation, qui la ramène au même écran Bienvenue.

## Mise en place

### 1. Migration SQL

Supabase > **SQL Editor** : coller `supabase/migrations/20261106000000_invitations_mot_de_passe.sql` en entier et exécuter.

- `membres_projet` renvoie une colonne de plus (`invitation_en_attente`).
- Les comptes déjà invités qui n'ont jamais choisi de mot de passe sont marqués « en attente ». Ce sont les personnes bloquées aujourd'hui : il suffit ensuite de cliquer sur **Renvoyer l'invitation** pour chacune.

### 2. Edge Function

```bash
supabase functions deploy gestion-membres
```

(ou coller le nouveau `supabase/functions/gestion-membres/index.ts` dans l'éditeur de la fonction). La migration doit être appliquée **avant** : la nouvelle action lit la colonne `invitation_en_attente`.

### 3. Réglages Supabase > Authentication

- **URL Configuration** : *Site URL* = l'adresse de l'application (celle de `URL_APPLICATION`), et la même adresse dans les *Redirect URLs*. Le lien « Mot de passe oublié » renvoie vers l'adresse de la page en cours : si tu testes aussi en local, ajoute `http://localhost:3000/`.
- **Providers > Email** : *Minimum password length* = 8, pour correspondre à l'application.
- **Emails > Templates** (facultatif) : adapter les textes des modèles *Invite user* et *Reset password*, par exemple « Ouvrez ce lien pour choisir votre nom et votre mot de passe ». Garder `{{ .ConfirmationURL }}` comme lien.
- **SMTP** : toujours recommandé (le serveur intégré n'envoie que quelques e-mails par heure ; au-delà, l'application affiche « Trop d'e-mails envoyés récemment »).

### 4. Déployer l'application

Fusionner la branche `invitations-mot-de-passe` dans `main`.

### Tests

- [ ] Inviter une adresse sans compte : l'e-mail arrive, le lien ouvre l'écran Bienvenue.
- [ ] Choisir un nom et un mot de passe : arrivée sur l'accueil, le nom apparaît dans le menu du compte et dans « Gérer les membres ».
- [ ] Se déconnecter, puis se reconnecter avec l'e-mail et le mot de passe.
- [ ] Rouvrir le même lien d'invitation : message « lien expiré » sur la page de connexion.
- [ ] « Mot de passe oublié ? » : e-mail reçu, écran « Nouveau mot de passe », connexion avec le nouveau mot de passe.
- [ ] Une personne invitée qui n'a pas terminé : mention « Invitation en attente » et bouton « Renvoyer l'invitation ».
