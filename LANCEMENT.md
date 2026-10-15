# Check-list de lancement — Ligne&Bati

Ce document liste **ce qui doit être fait avant de publier le site et de proposer des prestations**.
Les points réglementaires sont donnés pour vous orienter. Ils ne remplacent pas l'avis d'un professionnel (expert-comptable, avocat, assureur, chambre consulaire). Vérifiez toujours la version en vigueur des textes sur les sites officiels : [legifrance.gouv.fr](https://www.legifrance.gouv.fr), [entreprendre.service-public.fr](https://entreprendre.service-public.fr), [service-public.fr](https://www.service-public.fr), [cnil.fr](https://www.cnil.fr), [urssaf.fr](https://www.urssaf.fr).

---

## A. Informations à compléter dans le site

Recherchez `À COMPLÉTER` dans le dépôt : chaque occurrence est encadrée en pointillés sur le site.

| Où | Information |
|---|---|
| Pied de page (8 pages), `contact.html` | E-mail professionnel, téléphone et plages horaires |
| `contact.html` | Clé Web3Forms (`A_COMPLETER_CLE_WEB3FORMS`) et, si souhaité, `data-fallback-email` |
| `mentions-legales.html` | Identité de l'exploitant, forme juridique, adresse, SIREN, immatriculation, TVA, directeur de publication, assurances, médiateur, date |
| `confidentialite.html` | Responsable du traitement, e-mail de contact, fournisseur de messagerie, vérification de Web3Forms, date |
| `prestations.html` (section « Cadre ») | Assurances : assureur, n° de contrat, garanties — ou retrait des missions non couvertes |
| `a-propos.html` | Parcours professionnel, photo, qualifications éventuelles |

Remplacer dans le pied de page et la page contact, par exemple :
```html
<a href="mailto:contact@votre-domaine.fr">contact@votre-domaine.fr</a>
<a href="tel:+33600000000">06 00 00 00 00</a>
```

### Engagements rédigés dans le site, à confirmer ou modifier
Ces formulations sont des choix de positionnement que vous devez pouvoir tenir :
- « Premier échange sans engagement » (accueil, contact).
- « Ligne&Bati est rémunérée par vous uniquement, et non par les entreprises consultées » (prestations). **Ne gardez cette phrase que si vous ne percevez aucune commission ni rétrocession d'entreprises.**
- « Ligne&Bati ne perçoit pas d'argent pour votre compte et ne règle pas les entreprises à votre place » (prestations).
- Durée de conservation des demandes : 3 ans après le dernier échange (confidentialité).
- La liste des communes de la zone d'intervention (accueil).
- Les limites de mission listées pour chaque prestation : elles doivent correspondre à vos contrats.

---

## B. Vérifications réglementaires, professionnelles et assurantielles

### 1. Statut de l'entreprise et formalités
- [ ] Choisir le statut (micro-entreprise, EI au réel, société) avec un expert-comptable ou la CCI / le guichet unique.
- [ ] Déclarer l'activité sur le **guichet unique** de l'INPI ([formalites.entreprises.gouv.fr](https://formalites.entreprises.gouv.fr)). Faire préciser la nature de l'activité (libérale ou commerciale), le code APE et la **caisse de retraite** compétente (CIPAV ou Sécurité sociale des indépendants selon l'activité déclarée) : à confirmer auprès de l'URSSAF.
- [ ] Vérifier la disponibilité du nom « Ligne&Bati » : recherche de marques sur [data.inpi.fr](https://data.inpi.fr), recherche d'entreprises homonymes dans le secteur. Envisager un dépôt de marque.
- [ ] Ouvrir un compte bancaire dédié à l'activité.
- [ ] Préparer des modèles de devis et de factures avec les mentions obligatoires.

### 2. Obligations liées à votre emploi salarié
- [ ] Relire votre contrat de travail et votre convention collective : **clause d'exclusivité**, **clause de non-concurrence**, obligation de discrétion.
- [ ] Une clause d'exclusivité ne peut pas vous être opposée pendant **un an** à compter de la création de votre entreprise (Code du travail, art. L.1222-5), mais l'**obligation de loyauté** demeure : ne pas concurrencer votre employeur, ne pas démarcher ses clients, ne pas utiliser ses documents, fichiers ou outils, ne pas travailler pour l'activité pendant votre temps de travail.
- [ ] Respecter les durées maximales de travail et de repos dans l'organisation de vos deux activités.
- [ ] Ne pas citer votre employeur actuel ni ses chantiers sur le site sans accord écrit.

### 3. Responsabilité civile professionnelle
- [ ] Souscrire une **RC professionnelle** couvrant explicitement les missions de préparation, de consultation et de coordination de travaux pour des particuliers.
- [ ] Vérifier les exclusions, les plafonds, la franchise et l'activité déclarée au contrat (le libellé doit correspondre exactement à ce que présente le site).

### 4. Assurance décennale
- [ ] Le maître d'œuvre lié au maître d'ouvrage par un contrat de louage d'ouvrage est réputé « constructeur » (Code civil, art. 1792 et 1792-1). Pour les travaux qui relèvent de la garantie décennale, l'**assurance de responsabilité décennale est obligatoire** (Code des assurances, art. L.241-1).
- [ ] Faire préciser par l'assureur quelles missions et quels types de travaux sont couverts (rénovation légère, travaux touchant au clos et couvert ou à la structure, équipements…).
- [ ] L'attestation d'assurance doit être jointe aux devis et factures (Code des assurances, art. L.243-2).
- [ ] **Tant que la couverture d'une mission n'est pas acquise, retirer cette mission du site** ou indiquer qu'elle n'est pas encore proposée. En particulier la mission « Coordination et suivi des travaux ».

### 5. Périmètre exact des missions de maîtrise d'œuvre
- [ ] Définir par écrit, pour chaque mission, ce qui est inclus et exclu (le site en donne une base dans `prestations.html`).
- [ ] Ne pas utiliser le titre d'**architecte**, ni des formulations laissant croire à une inscription à l'Ordre des architectes (titre protégé, usurpation sanctionnée).
- [ ] Ne pas se présenter comme **Accompagnateur Rénov'** (agrément nécessaire pour les parcours MaPrimeRénov' concernés), ni comme bureau d'études, diagnostiqueur ou coordonnateur SPS sans les qualifications requises.
- [ ] Coordination SPS : les règles applicables aux opérations réalisées par des particuliers pour leur usage personnel sont spécifiques (Code du travail, art. L.4532-7). Faire vérifier si vos missions de coordination vous placent dans ce rôle.
- [ ] Vérification des situations de travaux avant paiement : préciser contractuellement qu'il s'agit d'un avis, la décision de payer appartenant au client.

### 6. Recours obligatoire à un architecte
- [ ] Une personne physique qui construit ou agrandit pour elle-même doit recourir à un architecte lorsque le projet nécessite un **permis de construire** et que la **surface de plancher dépasse 150 m²**, existant compris après travaux (Code de l'urbanisme, art. R.431-2 ; loi n° 77-2 du 3 janvier 1977 sur l'architecture). Les personnes morales (SCI, sociétés) y sont tenues quelle que soit la surface.
- [ ] Mettre en place un contrôle systématique de ce point lors du premier échange (il figure dans la méthode et la FAQ du site).
- [ ] Prévoir comment orienter le client vers un architecte lorsque c'est nécessaire.

### 7. Contrats, honoraires et responsabilités
- [ ] Faire rédiger ou relire par un avocat un **contrat de mission** type : objet, périmètre, livrables, honoraires et modalités de paiement, durée, responsabilités, assurances, résiliation, litiges.
- [ ] Contrats conclus **hors établissement** (chez le client) ou **à distance** : information précontractuelle et **droit de rétractation de 14 jours** du consommateur (Code de la consommation, art. L.221-5 et L.221-18). Prévoir le formulaire de rétractation et, si le client souhaite un démarrage anticipé, sa demande expresse.
- [ ] Adhérer à un **médiateur de la consommation** (obligation pour tout professionnel vendant à des consommateurs, Code de la consommation, art. L.612-1) et l'indiquer sur le site, les contrats et les factures. Liste des médiateurs référencés sur [economie.gouv.fr/mediation-conso](https://www.economie.gouv.fr/mediation-conso).
- [ ] Afficher les prix ou les modalités de calcul des honoraires de manière claire avant tout engagement.
- [ ] Régime de TVA (franchise en base ou non) et mentions correspondantes sur devis et factures.

### 8. Mentions légales et données personnelles
- [ ] Compléter les mentions légales (LCEN, art. 6). Ne publier que des informations exactes.
- [ ] Compléter la politique de confidentialité. Vérifier les conditions de Web3Forms (localisation, conservation, transferts hors UE) avant activation.
- [ ] Tenir un **registre des traitements** simplifié (modèle sur [cnil.fr](https://www.cnil.fr)).
- [ ] Organiser la suppression des demandes sans suite au-delà de la durée annoncée.
- [ ] Si vous ajoutez un outil de mesure d'audience : privilégier un outil exempté de consentement selon les critères de la CNIL, ou ajouter un bandeau de consentement, et mettre à jour la page confidentialité.
- [ ] Photos de chantier et témoignages : uniquement avec l'**accord écrit** des clients, sans adresse ni élément identifiant le logement.

---

## C. Budget technique

| Poste | Coût |
|---|---|
| GitHub (dépôt public) et GitHub Pages | 0 € |
| Formulaire Web3Forms, offre gratuite | 0 € |
| Polices, logo, illustrations, code | 0 € |
| Nom de domaine `.fr` ou `.com` | environ 10 à 20 € par an selon le registraire (prix à vérifier, souvent réduits la première année) |
| Adresse e-mail sur le domaine | 0 € avec une redirection vers une boîte existante, si le registraire la propose ; sinon quelques euros par mois |
| **Total première année** | **environ 10 à 70 €**, dans le budget de 100 € |

Hors budget du site : assurances, frais de création, honoraires de conseil, médiateur de la consommation (adhésion souvent payante).

---

## D. Ordre conseillé

1. Statut, assurances, contrat type et médiateur (sections B1 à B7).
2. Nom de domaine et adresse e-mail professionnelle.
3. Compléter les informations du site (section A) et activer le formulaire.
4. Publier (README, étape 2), tester en ligne (étape 3), connecter le domaine (étape 4).
5. Déclarer le site dans Google Search Console (étape 5).
6. Au fil des projets : ajouter des réalisations et des témoignages authentiques, avec accord écrit.
