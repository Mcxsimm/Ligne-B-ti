# Espace connecté Ligne&Bati — guide

L'espace connecté est accessible par le lien **« Se connecter »** en haut à droite du site (`espace/connexion.html`).

| Rôle | Ce qu'il voit et fait |
|---|---|
| **Administrateur** (vous) | Tous les chantiers ; création et modification ; carte des outils ; création des comptes clients et salariés |
| **Salarié** | Accès à **OmSmK** (conduite de travaux) ; tous les chantiers et la carte des outils ; peut mettre à jour étapes, journal et réglages vus par les clients ; ne gère pas les comptes et ne supprime pas de chantier |
| **Client** | Uniquement ses chantiers : avancement, phase, étapes et comptes rendus que vous avez marqués « visibles par le client » |

## Conduite de travaux : OmSmK

Le travail de chantier des salariés se fait dans **OmSmK** (`https://mcxsimm.github.io/OmSmK/`, dépôt `Mcxsimm/OmSmK`) : pointage, journal et photos, planning, suivi hebdomadaire, réserves, sécurité, réunions, commandes, situations. Le menu **Conduite de travaux** et le tableau de bord de l'espace y mènent.

- OmSmK reste un **site séparé** : sa propre base Supabase et sa connexion par code e-mail. Créez une équipe « Ligne&Bati » dans OmSmK (Paramètres → Travail en équipe) et invitez-y chaque salarié avec son adresse professionnelle.
- **Sauvegardes** : les chantiers partagés en équipe sont enregistrés dans Supabase. Une fois Google configuré, une **copie de nuit automatique** part sur le Google Drive de l'entreprise (procédure dans le README d'OmSmK, section « Sauvegarde automatique de nuit »). Chaque appareil peut en plus enregistrer ses données sur Google Drive.
- Pour un chantier de rénovation, choisissez le métier **Rénovation** : phases par lot et préparation de maîtrise d'œuvre.
- L'espace connecté de ce site reste la **vitrine du suivi pour les clients** : avancement, étapes et comptes rendus que vous choisissez de leur montrer. Les deux ne sont pas reliés automatiquement : reportez ici l'avancement à communiquer au client.

## 1. Architecture

- **Pages** : HTML, CSS et JavaScript natif dans `espace/` et `assets/js/espace/`, hébergés sur GitHub Pages comme le reste du site.
- **Données et comptes** : projet Supabase **`ligne-et-bati`**, offre gratuite, région **Paris (eu-west-3)**.
- **Sécurité** : la base applique des règles d'accès par ligne (RLS). Même en manipulant le navigateur, un client ne peut lire que ses chantiers et les éléments partagés, et ne peut rien modifier. Ces règles ont été testées en base avec des comptes fictifs.
- **Création des comptes** : fonction serveur `gerer-comptes` (dossier `supabase/functions/`), réservée aux administrateurs. Elle seule utilise la clé de service, qui n'apparaît jamais dans le site.
- **Schéma** : `supabase/migrations/` (à rejouer dans l'ordre pour recréer la base).

Les clés présentes dans `assets/js/espace/config.js` sont **publiques par conception** (clé « anon »). Ne placez jamais la clé `service_role` dans le dépôt.

## 2. Mise en service — à faire une seule fois

### Étape 1 — Créer votre compte administrateur
1. Ouvrez [supabase.com/dashboard](https://supabase.com/dashboard), puis le projet **ligne-et-bati**.
2. **Authentication → Users → Add user → Create new user**.
3. Saisissez votre adresse e-mail et un mot de passe solide, cochez **Auto Confirm User**, validez.
4. **SQL Editor → New query**, collez la requête suivante en remplaçant l'adresse, puis **Run** :
   ```sql
   update public.profils
      set role = 'admin', nom_complet = 'Prénom Nom'
    where email = 'votre-adresse@exemple.fr';
   ```
   La requête doit indiquer « 1 row affected ».
5. Connectez-vous sur le site par **Se connecter**.

### Étape 2 — Fermer les inscriptions libres (important)
**Authentication → Sign In / Providers → Email** : désactivez **Allow new users to sign up**.
Sans ce réglage, n'importe qui pourrait se créer un compte. Il ne verrait aucune donnée, mais ces comptes inutiles encombreraient la base.

### Étape 3 — Adresse du site
**Authentication → URL Configuration → Site URL** : `https://mcxsimm.github.io/Ligne-B-ti/`, puis votre nom de domaine quand il sera connecté.

### Étape 4 (facultative) — Envoi d'e-mails
Par défaut, Supabase n'envoie des e-mails qu'aux membres de votre organisation Supabase. L'espace fonctionne sans e-mail : les mots de passe provisoires sont générés dans l'écran **Comptes**. Pour permettre plus tard la réinitialisation de mot de passe par e-mail, configurez un serveur d'envoi dans **Authentication → Emails → SMTP Settings** (par exemple l'offre gratuite d'un service d'e-mails transactionnels).

## 3. Utilisation au quotidien

**Accueillir un client**
1. **Comptes** → nom, e-mail, type « Client » → **Créer le compte**.
2. Notez le **mot de passe provisoire** affiché (une seule fois). Transmettez-le de vive voix ou par SMS, séparément de l'adresse e-mail.
3. À sa première connexion, le client doit choisir son propre mot de passe.

**Suivre un chantier**
1. **Tableau de bord → Nouveau chantier**, en choisissant le client. Les 7 étapes types sont créées automatiquement.
2. Sur la fiche, passez chaque étape à « En cours » puis « Terminé » : **l'avancement se calcule tout seul** (part des étapes terminées).
3. **Journal** : un compte rendu par réunion. Cochez « Visible par le client » pour le partager, sinon il reste interne.
4. **Informations et réglages** : phase du chantier, dates, message mis en avant pour le client.

> La « Description du projet » est visible par le client. Pour une note réservée à l'équipe, utilisez une entrée de journal non visible.

**Carte des outils**
56 éléments répartis sur trois lignes : *Piloter l'entreprise*, *Développer l'activité*, *Exercer le métier*. Cliquez sur un élément pour changer son état (à faire, en cours, en place, non concerné) et noter une référence. Le tableau de bord affiche le nombre d'outils en place.

**Client ayant oublié son mot de passe** : **Comptes → Nouveau mot de passe**.

## 4. Limites de l'offre gratuite Supabase (à vérifier sur supabase.com/pricing)

- **Mise en pause après une semaine sans activité** : les données sont conservées, mais l'espace ne répond plus tant que vous n'avez pas cliqué sur **Restore** dans le tableau de bord Supabase. Une utilisation régulière l'évite. L'offre payante supprime cette mise en pause.
- **Pas de sauvegarde automatique téléchargeable** sur l'offre gratuite : exportez régulièrement vos données (**Table Editor → Export to CSV**), au minimum les tables `chantiers`, `jalons` et `journal`.
- Les quotas gratuits (taille de base, utilisateurs actifs) sont largement suffisants pour une activité qui démarre.

## 5. Données personnelles

L'espace contient des données de vos clients. Vous en êtes responsable de traitement :
- la politique de confidentialité du site décrit ce traitement (section « Espace client et équipe ») ;
- ajoutez ce traitement à votre registre RGPD ;
- supprimez les comptes clients en fin de mission, sous réserve des durées de conservation légales (**Authentication → Users → Delete user**) ;
- ne déposez dans le journal aucune pièce d'identité, aucune coordonnée bancaire ni aucune information sensible.

## 6. Évolutions possibles

- Dépôt de documents et photos par chantier (Supabase Storage, avec les mêmes règles d'accès).
- Notification par e-mail du client à chaque compte rendu partagé (nécessite l'étape 4).
- Planning détaillé par lot, suivi budgétaire du chantier.
- La **comptabilité** n'est volontairement pas intégrée : utilisez un logiciel de facturation relié à une plateforme agréée (facturation électronique obligatoire). Le portail pourra afficher un lien vers ses factures.
