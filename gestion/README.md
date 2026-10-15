# Ligne&Bati Gestion — application interne (prototype)

Application de pilotage d'entreprise et de suivi d'affaires, organisée autour d'une **carte isométrique** de l'entreprise. Projet **distinct du site vitrine** : aucun fichier n'est partagé avec lui.

> ⚠ **Prototype.** Les données sont enregistrées **dans le navigateur uniquement** (localStorage). Ce n'est ni une sauvegarde ni un système multi-utilisateur, et il n'y a pas d'authentification. Ne saisissez des données réelles qu'en connaissance de cause, et exportez régulièrement la sauvegarde JSON (Administration › Sauvegarde et exports).

- Concept, architecture, modèle de données, coûts, limites : [`docs/CONCEPT.md`](docs/CONCEPT.md)
- Formules financières : [`docs/FORMULES.md`](docs/FORMULES.md)

## Lancer l'application

Aucune installation : HTML, CSS et JavaScript natif (modules ES), sans dépendance ni compilation.

```bash
cd gestion
python3 -m http.server 8080
# puis ouvrir http://localhost:8080
```

Un serveur local est nécessaire : les modules JavaScript ne se chargent pas en ouvrant `index.html` directement (protocole `file://`).

Au premier lancement, un **jeu de démonstration fictif** est chargé. Il est signalé par un bandeau, et chaque élément porte la mention « (démo) ». Pour commencer avec vos propres données : **Administration › Sauvegarde et exports › Repartir d'une base vide**.

## Tests

```bash
cd gestion
node --test tests/*.test.mjs     # ou : npm test
```

15 tests couvrent le moteur financier (budgets, avenants, engagements sans double comptage, CAT, marges, facturation HT/TTC, encaissements, alertes) et le planning (avancement pondéré, écarts prévu/réel).

## Sauvegarde et restauration

1. **Administration › Sauvegarde et exports › Télécharger la sauvegarde (JSON)**.
2. Conservez le fichier hors de l'ordinateur (stockage professionnel, disque externe).
3. Pour restaurer : **Restaurer une sauvegarde**, puis choisir le fichier. Cette opération remplace toutes les données du navigateur.

Le JSON est un format ouvert : il contient toutes les données et permet d'en sortir sans dépendre d'un fournisseur. Des exports **CSV pour Excel** (séparateur `;`, décimales à virgule) existent pour les affaires, budgets, indicateurs, commandes, factures, contacts, planning, opérations, encaissements et réserves.

## Déploiement

**Recommandé** : un dépôt GitHub **privé** dédié (par exemple `ligne-et-bati-gestion`) contenant uniquement ce dossier, déployé sur **Cloudflare Pages** ou **Netlify** (gratuits avec un dépôt privé). Ce prototype ne nécessite aucune commande de compilation : le dossier de publication est la racine.

Pour une protection d'accès dès maintenant, Cloudflare Access (gratuit jusqu'à 50 utilisateurs) peut placer l'application derrière une connexion par e-mail.

**À éviter pour des données réelles** : le publier tel quel avec le site vitrine sur GitHub Pages. Le dépôt est public et l'application n'a pas d'authentification. Le dossier est exclu de l'indexation (`noindex`), mais il reste accessible à qui connaît l'adresse. Les données, elles, restent dans le navigateur de chaque visiteur.

## Structure

```
gestion/
├── index.html            point d'entrée (CSP stricte : aucun script externe)
├── css/app.css           styles de l'application
├── fonts/                Cormorant Garamond, Inter (licence OFL)
├── js/
│   ├── main.js           démarrage, routes, fenêtre de module, recherche, vue liste
│   ├── carte/            iso.js (moteur isométrique), batiments.js, chantiers.js, carte.js
│   ├── calculs/          finances.js, planning.js (fonctions pures testées)
│   ├── donnees/          modele.js (champs, validation), store.js (stockage, historique), demo.js
│   ├── modules/          un fichier par bâtiment + commun.js
│   └── ui/               outils.js, formulaire.js
├── tests/                tests Node du moteur de calcul
└── docs/                 concept et formules
```

### Ajouter un module
1. Créer `js/modules/mon-module.js`, qui exporte `{ titre, rendre(ctx, route) }`.
2. L'enregistrer dans `js/modules/index.js`.
3. Ajouter un bâtiment dans `js/carte/batiments.js` (même identifiant), et ses indicateurs dans `indicateurs()` de `js/main.js`.

### Passer à une base hébergée (phase 3)
Remplacer l'implémentation de `js/donnees/store.js` (mêmes fonctions : `charger`, `ajouter`, `modifier`, `supprimer`, `parametres`…) par des appels à Supabase. Le schéma suit `docs/CONCEPT.md` §4, avec des règles d'accès RLS par utilisateur. Les écrans et les calculs restent inchangés.
