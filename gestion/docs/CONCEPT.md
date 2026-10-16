# Ligne&Bati Gestion — concept, architecture et feuille de route

Application **interne** de pilotage d'entreprise et de suivi d'affaires (projet B). Elle est totalement distincte du site vitrine (projet A) : code, styles, données et déploiement sont séparés.

---

## 1. Concept visuel : le quartier Ligne&Bati

L'application s'ouvre sur une **carte isométrique** : un quartier d'architecture contemporaine où chaque bâtiment est un module de gestion.

```
                    Administration
            Affaires              Finances
     Partenaires        Siège            Contrôle
            Planification          Entrepôt
                      Chantiers
        P A R C   D E S   C H A N T I E R S   (bordure avant)
```

| Bâtiment | Module | Signal affiché sur la carte |
|---|---|---|
| **Siège** (tour vitrée, au centre) | Tableau de bord général | affaires en cours, marge, alertes |
| **Affaires** (immeuble de bureaux) | Liste et fiches d'affaires | nombre d'affaires en cours |
| **Chantiers** (ossature et grue) | Suivi des opérations | opérations en retard |
| **Finances** (bâtiment à colonnade) | Budgets, coûts, facturation, marges | affaires à risque |
| **Entrepôt** (halle à sheds, quais) | Commandes et approvisionnements | commandes à valider |
| **Planification** (façade calendrier, horloge) | Calendrier, jalons, Gantt | événements de la semaine |
| **Administration** (bureaux et tour d'archives) | Tâches, documents, paramètres, sauvegardes | tâches en retard |
| **Contrôle** (tour de contrôle) | Alertes et indicateurs | nombre d'alertes |
| **Partenaires** (pavillon ouvert) | Clients, fournisseurs, intervenants | — |

**Parc des chantiers.** Chaque affaire en phase d'exécution (gagnée, en préparation, en cours, en attente) occupe automatiquement une parcelle en bordure du quartier :
- la construction monte d'un niveau tous les 30 % d'avancement ;
- une grue signale un chantier **en cours**, une bâche grise un chantier **en attente**, une implantation au sol un chantier **en préparation** ;
- une épingle affiche la commune et le pourcentage, en rouge en cas d'alerte ;
- un clic ouvre la **fiche de suivi dédiée** du chantier ;
- le bouton **« + Nouveau chantier »** place sur la carte une affaire existante, ou en crée une nouvelle.

**Direction artistique** : anthracite, ivoire, gris minéral, vert sauge, accents sable. Ombres douces, signalétique en étiquettes, typographies Cormorant Garamond (titres) et Inter (texte). Aucun personnage, aucune mécanique de jeu.

**Navigation**
- Souris : glisser pour se déplacer, molette pour zoomer, survol pour les indicateurs, clic pour entrer.
- Tactile : un doigt pour se déplacer, deux doigts pour zoomer.
- Clavier : Tab parcourt les bâtiments et les chantiers, Entrée ouvre, flèches et + / − déplacent et zooment, 0 recentre, Échap revient à la carte, Ctrl K ouvre la recherche.
- Ouvrir un module zoome vers le bâtiment, puis ouvre une fenêtre ; « Carte » ou Échap restaure **exactement** le cadrage précédent.
- Sur mobile, une **vue liste** est proposée par défaut (chantiers puis modules), la carte restant disponible.

## 2. Choix technique de la carte

| Option | Avantages | Inconvénients | Verdict |
|---|---|---|---|
| Image de fond + zones cliquables | simple | pas de vraie navigation spatiale, flou au zoom, figé | écarté |
| **SVG généré en isométrie** | vectoriel (net à tout zoom), léger (< 100 Ko), accessible (éléments focalisables), stylable en CSS, données dynamiques faciles | rendu de très grandes scènes moins performant | **retenu** |
| Canvas 2D | performant pour des milliers d'objets | accessibilité et interactions à reconstruire | inutile à cette échelle |
| WebGL / Three.js | 3D réelle, éclairage | lourd, complexe, consommation, maintenance | disproportionné |

La scène est **dessinée par le code** (`js/carte/`) : un moteur de projection isométrique (`iso.js`), la description des bâtiments (`batiments.js`) et du parc des chantiers (`chantiers.js`). La caméra est un `viewBox` SVG, avec des étiquettes HTML de taille constante superposées.

## 3. Architecture

### Prototype (cette version)

```
Navigateur ─ index.html (ES modules, sans compilation ni dépendance)
            ├─ js/carte/      carte isométrique SVG
            ├─ js/modules/    9 modules métier
            ├─ js/calculs/    moteur financier et planning (fonctions pures, testées)
            ├─ js/donnees/    modèle, validation, stockage (localStorage), démo
            └─ js/ui/         utilitaires d'interface, formulaires
```

Toutes les lectures et écritures passent par `js/donnees/store.js`. C'est le seul fichier à remplacer pour brancher une base distante.

### Cible professionnelle (phases 2 et 3)

| Comparatif | Application locale (prototype) | Application hébergée (recommandée) |
|---|---|---|
| Données | navigateur de l'appareil | base PostgreSQL (Supabase, région Paris) |
| Sauvegarde | export manuel JSON | sauvegardes quotidiennes automatiques (offre payante), plus exports |
| Multi-appareil, multi-utilisateur | non | oui |
| Authentification | aucune | obligatoire (comptes, rôles) |
| Autorisations | — | vérifiées côté serveur (règles RLS) |
| Fichiers (photos, PDF) | références seulement | stockage sécurisé (Supabase Storage) |
| Coût | 0 € | 0 € (offre gratuite) à environ 25 $ par mois (Pro, avec sauvegardes) |

**Hébergement de l'interface** : un dépôt **privé** (le code métier n'a pas à être public), déployé sur Cloudflare Pages ou Netlify (offres gratuites compatibles avec un dépôt privé). GitHub Pages ne sert que des fichiers statiques et impose un dépôt public sur l'offre gratuite.

## 4. Modèle de données

Identifiants : UUID stables. Montants : **centimes entiers**. Dates : ISO `AAAA-MM-JJ`.

```
contacts (client | fournisseur | sous_traitant | intervenant)
  └─< affaires (client_id) ──────────────┐
        ├─< operations ─< taches          │
        ├─< postes (budget initial, reste à engager estimé)
        ├─< avenants (type vente | budget, poste_id)
        ├─< commandes (fournisseur_id, poste_id, lignes[quantité, unité, PU HT])
        │      └─< factures_fournisseurs (commande_id, poste_id)
        ├─< factures_clients ─< paiements (TTC)
        ├─< evenements (réunions + compte rendu, livraisons, jalons)
        ├─< reserves (entreprise_id, constat, levée)
        └─< documents (références)
historique (entité, id, action, détail des champs modifiés, date, auteur)
parametres (entreprise, TVA, seuil de marge, catégories, unités, types d'opérations)
```

Règles de validation : champs obligatoires, montants numériques ≥ 0 (avenants : négatifs autorisés), dates cohérentes (fin ≥ début), e-mail valide. Une facture fournisseur liée à une commande hérite de l'affaire et du poste de cette commande. Aucune donnée n'est dupliquée : les montants agrégés sont **toujours recalculés**, jamais stockés.

## 5. Écrans

| Écran | Contenu |
|---|---|
| Carte | quartier, parc des chantiers, indicateurs au survol, badges d'alertes, actions rapides |
| Siège | 11 indicateurs, actions urgentes, tâches à 7 jours, affaires en cours, prochaines échéances |
| Affaires | recherche, filtres, export CSV ; fiche en 6 onglets : synthèse, budget et avenants, commandes et dépenses, facturation, documents, historique |
| Suivi de chantier | avancement, retards, réserves, actions, prochain rendez-vous, blocages ; onglets opérations, prévu / réel (Gantt), réunions et comptes rendus, réserves, actions et échéances, photos et documents, historique |
| Chantiers | toutes les opérations ; Gantt prévu / réel |
| Finances | tableau des 12 indicateurs par affaire avec totaux, dépenses non affectées, formules |
| Entrepôt | commandes (filtres, écarts facturés), détail des lignes, réception, factures liées |
| Planification | mois, 7 jours, Gantt ; échéances de factures, livraisons, fins d'opérations, tâches |
| Contrôle | taux de marge, d'engagement, d'encaissement ; alertes par domaine |
| Partenaires | contacts, fiche avec affaires, commandes et historique |
| Administration | tâches, documents, paramètres, sauvegarde et restauration JSON, exports CSV, journal |

## 6. Contenu des versions

| Phase | Contenu | État |
|---|---|---|
| **1. Prototype interactif** | carte, navigation, parc des chantiers, modules sur données de démonstration | ✅ livré |
| **2. Première version métier** | création et gestion des affaires, opérations, budgets, commandes, dépenses, facturation, tableau de bord, persistance, exports | ✅ fonctionnel **en local** dans ce prototype |
| **3. Sécurisation** | authentification, rôles, base Supabase avec RLS, sauvegardes automatiques, stockage des fichiers, journal côté serveur | à faire |
| **4. Évolutions** | Gantt interactif (glisser-déposer), gestion documentaire, notifications, automatisations, statuts personnalisables, commandes multi-lignes à la saisie, photos depuis le téléphone | à faire |

## 7. Coûts

| Poste | Coût |
|---|---|
| Prototype actuel | 0 € |
| Hébergement de l'interface (Cloudflare Pages ou Netlify, dépôt privé) | 0 € |
| Supabase gratuit (mise en pause après 7 jours d'inactivité, sans sauvegarde téléchargeable) | 0 € |
| Supabase Pro (sauvegardes quotidiennes, sans mise en pause), recommandé pour des données d'entreprise | environ 25 $ par mois, soit environ 280 € par an (tarif à vérifier) |
| Nom de domaine (partagé avec le site vitrine) | déjà prévu |

L'offre gratuite suffit pour la phase 3 de mise au point. L'offre Pro devient nécessaire dès que l'application contient des données réelles et que la perte d'une journée de saisie n'est pas acceptable. Elle dépasse alors le budget initial de 100 € : c'est un choix à faire.

## 8. Limites connues

- **Stockage local** : les données ne sont ni sauvegardées ni partagées. Vider le navigateur ou changer d'appareil les fait disparaître. Exportez le JSON régulièrement.
- **Aucune authentification** dans le prototype : ne l'utilisez pas sur un poste partagé pour des données réelles.
- **Documents et photos** : référencés, mais pas stockés.
- **Facturation** : suivi uniquement. Les factures officielles doivent être émises par un logiciel conforme à la facturation électronique.
- **Saisie des commandes** : une ligne à la création, d'autres lignes ensuite depuis le détail de la commande.
- **Statuts d'affaire** : fixes dans le prototype (le modèle permet de les rendre configurables).
- **Gantt** : affichage seul ; la modification des dates se fait par formulaire.
