# Ligne&Bati — site vitrine

Site statique (HTML, CSS, JavaScript natif) de Ligne&Bati, accompagnement de projets de rénovation et maîtrise d'œuvre à Rouen, au Havre et alentour.

- Aucun framework, aucune base de données, aucun outil de compilation : les fichiers du dépôt **sont** le site.
- Hébergement gratuit sur GitHub Pages ; formulaire de contact gratuit via Web3Forms.
- Aucun cookie, aucun traceur, polices hébergées sur le site (pas d'appel à Google Fonts).

> **Espace connecté** (bouton « Se connecter ») : mise en service et utilisation dans [`ESPACE.md`](ESPACE.md).

> **Avant toute mise en ligne publique, traitez la liste [`LANCEMENT.md`](LANCEMENT.md).**
> Elle recense les informations à compléter et les vérifications juridiques et assurantielles indispensables.

---

## 1. Structure

```
├── index.html               Accueil
├── prestations.html         Les 3 missions : besoin, actions, livrables, limites
├── methode.html             Chronologie en 4 phases
├── a-propos.html            Présentation (emplacements à compléter)
├── contact.html             Formulaire de contact
├── mentions-legales.html    Mentions légales (champs à compléter)
├── confidentialite.html     Données personnelles et cookies
├── 404.html                 Page d'erreur
├── favicon.svg
├── robots.txt / sitemap.xml
├── .nojekyll                Désactive le traitement Jekyll de GitHub Pages
├── assets/
│   ├── css/style.css        Feuille de style unique, commentée par sections
│   ├── js/main.js           Menu mobile, animations, formulaire
│   ├── fonts/               Cormorant Garamond + Inter (licence SIL OFL)
│   └── images/
│       ├── logo/            Logo horizontal, version claire, signature, compact, PNG 512
│       ├── plan-renovation.svg       Illustration de l'accueil
│       ├── zone-intervention.svg     Schéma de la zone
│       ├── og-image.png              Image de partage (réseaux sociaux)
│       └── favicon-32.png, apple-touch-icon.png
├── espace/                  Espace connecté (clients, salariés, administrateur) — voir ESPACE.md
│   ├── connexion.html, index.html (tableau de bord), chantier.html,
│   └── carte.html (carte des outils), comptes.html, mot-de-passe.html
├── assets/js/espace/        Scripts de l'espace (config.js = URL et clé publique Supabase)
├── assets/vendor/supabase/  Bibliothèque Supabase (licence MIT), servie depuis le site
├── supabase/                Schéma de la base (migrations) et fonction serveur gerer-comptes
├── outils/changer-adresse.sh  Remplace l'adresse du site (passage au nom de domaine)
├── LANCEMENT.md             Check-list avant publication
└── README.md
```

**Chemins relatifs partout** : le site fonctionne aussi bien à l'adresse `https://<compte>.github.io/<dépôt>/` qu'avec un nom de domaine. Seules les adresses absolues exigées par le référencement (balises `canonical`, `og:url`, sitemap, robots, balise `<base>` de la page 404) contiennent l'adresse publique ; le script `outils/changer-adresse.sh` les met à jour en une commande.

## 2. Direction artistique

| Élément | Choix |
|---|---|
| Positionnement visuel | Cabinet indépendant, à la croisée de l'architecture et de la gestion de chantier : sobre, précis, éditorial |
| Anthracite | `#23262A` — textes, boutons, fonds sombres |
| Ivoire | `#F7F4EE` — fond principal ; `#ECE7DE` pour les sections alternées |
| Vert sauge | `#6B7D68` décor ; `#4F5F4D` pour les textes et liens (contraste 6,2:1) |
| Beige sable | `#C9B490` — filets et accents discrets |
| Titres | Cormorant Garamond (empattements fins, évocation du dessin d'architecte) |
| Texte | Inter (très lisible à l'écran) |
| Motif | La « ligne » : filets fins, cotes, plans au trait, chronologies |
| Visuels | Dessins au trait créés pour le site (plan, schéma de zone) plutôt que des photos de banque d'images |

**Logo** : logotype typographique « Ligne&Bati », esperluette italique en vert sauge, souligné d'un filet sable.
- `logo-horizontal.svg` (fonds clairs), `logo-horizontal-clair.svg` (fonds sombres), `logo-signature.svg` (avec « Préparer · Consulter · Coordonner », pour devis et documents), `logo-compact.svg` / `logo-512.png` (monogramme L&B pour réseaux sociaux), `favicon.svg`.
- Les lettres sont vectorisées : le logo s'affiche à l'identique partout, sans dépendre d'une police installée.

**Photos** : la page d'accueil utilise un plan dessiné. Lorsque vous disposerez de vos propres photos de chantier (avec l'accord des propriétaires), remplacez `assets/images/plan-renovation.svg` dans `index.html` par un fichier JPEG/WebP de 1440 × 1120 px, moins de 250 Ko, et mettez à jour l'attribut `alt`.

## 3. Modifier le contenu

- Les textes se modifient directement dans les fichiers `.html`.
- L'en-tête et le pied de page sont **répétés dans chaque page** (pas d'outil de compilation) : une modification du menu ou des coordonnées doit être reportée dans les 8 fichiers HTML. Astuce : la fonction « Rechercher dans les fichiers » de votre éditeur.
- Toutes les informations manquantes sont repérées par **`À COMPLÉTER`** (texte encadré en pointillés sur le site). Recherchez ce mot dans le dépôt pour toutes les retrouver.
- Après ajout d'une page : l'ajouter au menu des 8 pages, au pied de page et à `sitemap.xml`.

## 4. Formulaire de contact

Le formulaire envoie réellement les demandes par e-mail via **[Web3Forms](https://web3forms.com)** (offre gratuite, 250 envois par mois à la date de rédaction — à vérifier sur leur site). Aucune donnée n'est stockée dans le dépôt GitHub.

Activation :
1. Sur web3forms.com, saisissez votre **e-mail professionnel** : une clé d'accès vous est envoyée.
2. Dans `contact.html`, remplacez `A_COMPLETER_CLE_WEB3FORMS` par cette clé. Cette clé est conçue pour être publique : elle permet seulement d'envoyer des messages vers votre adresse.
3. Facultatif : renseignez `data-fallback-email="votre@adresse.fr"` sur la balise `<form>` ; cette adresse est proposée en cas de panne du service.
4. Publiez, puis envoyez une demande de test depuis le site en ligne et vérifiez sa réception (pensez aux courriers indésirables).

Comportement garanti par le code :
- **Clé absente** : rien n'est envoyé. Un bandeau l'indique, et le bouton ouvre la messagerie du visiteur si `data-fallback-email` est renseigné, sinon affiche « Votre demande n'a pas été envoyée ».
- **Validation** : messages d'erreur en français sous chaque champ, focus sur le premier champ à corriger.
- **Erreur réseau ou serveur** : message d'erreur, saisie conservée, bouton réactivé.
- **Succès** : message de confirmation uniquement après réponse positive du service.
- **Anti-spam** : champ piège invisible (`botcheck`).
- **Sans JavaScript** : le formulaire est envoyé classiquement au service.

Alternative : [Formspree](https://formspree.io) (offre gratuite plus limitée). Il faudrait alors adapter l'attribut `action`, les noms de champs cachés, la politique de confidentialité et la directive `connect-src` de la balise `Content-Security-Policy` de chaque page.

## 5. Publication sur GitHub Pages — pas à pas

### Étape 1 — Le dépôt
Le code est dans le dépôt `mcxsimm/Ligne-B-ti`. Si vous repartez de zéro : sur github.com, **New repository**, nom au choix, visibilité **Public** (GitHub Pages est gratuit pour les dépôts publics ; un dépôt privé nécessite un abonnement payant), puis déposez les fichiers via **Add file → Upload files** ou `git push`.

> Le dépôt étant public, n'y placez jamais : demandes de clients, devis, contrats, pièces d'identité, mots de passe, clés secrètes.

### Étape 2 — Activer GitHub Pages
1. Dépôt → **Settings** → **Pages**.
2. **Source** : *Deploy from a branch*.
3. **Branch** : `main`, dossier `/ (root)` → **Save**.
4. Après une à deux minutes, l'adresse s'affiche : `https://mcxsimm.github.io/Ligne-B-ti/`.

### Étape 3 — Tester en ligne
Sur ordinateur **et** sur téléphone :
- [ ] Chaque page du menu s'ouvre, le menu mobile s'ouvre et se ferme.
- [ ] Le formulaire envoie une demande de test, reçue dans votre boîte.
- [ ] `https://…/page-inexistante` affiche la page 404.
- [ ] Les liens du pied de page (mentions légales, confidentialité) fonctionnent.
- [ ] Partage d'un lien sur une messagerie : l'image d'aperçu s'affiche.
- [ ] Facultatif : [PageSpeed Insights](https://pagespeed.web.dev) pour mesurer les performances.

### Étape 4 — Nom de domaine (recommandé, environ 10 à 20 € par an)
1. Vérifiez la disponibilité du nom (ex. `ligne-et-bati.fr` ; l'esperluette n'est pas autorisée dans un nom de domaine) chez un registraire (OVHcloud, Gandi, Infomaniak…). Un `.fr` exige une adresse dans l'Union européenne.
2. Chez le registraire, zone DNS :
   - pour `www` : un enregistrement **CNAME** `www` → `mcxsimm.github.io.`
   - pour le domaine nu : quatre enregistrements **A** vers `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` (valeurs à vérifier dans la [documentation GitHub](https://docs.github.com/fr/pages/configuring-a-custom-domain-for-your-github-pages-site)).
3. GitHub : **Settings → Pages → Custom domain** : saisissez `www.votre-domaine.fr` → **Save**. GitHub crée un fichier `CNAME` dans le dépôt.
4. Une fois le certificat émis (jusqu'à 24 h), cochez **Enforce HTTPS**.
5. Recommandé : **Settings → Pages → Verify a custom domain** pour protéger le domaine contre une prise de contrôle.
6. Mettez à jour les adresses absolues, puis publiez :
   ```bash
   bash outils/changer-adresse.sh https://www.votre-domaine.fr/
   git add -A && git commit -m "Passage au nom de domaine" && git push
   ```
   Sans terminal : remplacez `https://mcxsimm.github.io/Ligne-B-ti/` par la nouvelle adresse dans tous les fichiers via l'éditeur de GitHub ou de votre ordinateur.

### Étape 5 — Google Search Console
1. [search.google.com/search-console](https://search.google.com/search-console) → **Ajouter une propriété**.
2. Type **Domaine** (vérification par enregistrement DNS TXT chez le registraire) ou **Préfixe d'URL** (vérification par fichier HTML à déposer à la racine du dépôt).
3. **Sitemaps** → soumettez `sitemap.xml`.
4. Suivez l'indexation des pages et les requêtes qui amènent des visiteurs.

Fiche **Google Business Profile** : utile pour le référencement local, mais elle ne doit indiquer qu'une adresse réelle. Pour une activité sans local recevant du public, choisissez l'option « zone desservie » et masquez l'adresse.

## 6. Tests réalisés

Contrôles effectués avant livraison, sur un serveur local reproduisant l'hébergement dans un sous-dossier (`/Ligne-B-ti/`), avec Chromium :

| Contrôle | Résultat |
|---|---|
| Liens internes et ancres, sur les 8 pages | aucun lien cassé |
| Validation HTML (html-validate, règles recommandées) | aucune erreur |
| Accessibilité automatique (axe-core, WCAG 2.1 AA), ordinateur et mobile | aucune violation |
| Console JavaScript sur toutes les pages | aucune erreur |
| Débordement horizontal à 375 px de large | aucun |
| Menu mobile : ouverture, fermeture (bouton, touche Échap, clic extérieur) | conforme |
| Navigation sans JavaScript | menu et contenus visibles |
| Formulaire : 7 champs obligatoires, e-mail, téléphone, longueur | erreurs affichées correctement |
| Formulaire sans clé configurée | aucun envoi, message explicite |
| Formulaire avec clé, réponses succès et erreur **simulées** | confirmation / message d'erreur avec saisie conservée |

**Non testé** (impossible avant activation) : envoi réel vers Web3Forms avec votre clé, affichage sur iPhone/Safari et Android réels, comportement sur le domaine définitif, mesure PageSpeed en ligne. Ces points figurent dans l'étape 3 ci-dessus.

## 7. Sécurité et confidentialité

- Politique de sécurité du contenu (`Content-Security-Policy`) dans chaque page : seuls les fichiers du site et le service de formulaire sont autorisés.
- Aucune clé secrète dans le code (la clé Web3Forms est publique par conception).
- Aucune donnée personnelle stockée dans le dépôt ni dans le navigateur.
- Les liens externes utilisent `rel="noopener"`.

## 8. Licences

- Polices Cormorant Garamond et Inter : SIL Open Font License 1.1 (fichiers de licence dans `assets/fonts/`).
- Logo, illustrations et textes : créés pour Ligne&Bati.
