# Check-list de lancement — site de vente ChargéPro

À traiter **avant de publier le site et d'encaisser un premier abonnement**. Les points réglementaires orientent ; ils ne remplacent pas l'avis d'un professionnel (expert-comptable, avocat). Textes en vigueur : [legifrance.gouv.fr](https://www.legifrance.gouv.fr), [entreprendre.service-public.fr](https://entreprendre.service-public.fr), [cnil.fr](https://www.cnil.fr).

## A. Informations à compléter

Recherchez `À COMPLÉTER` dans le dépôt (encadré en pointillés sur le site).

| Où | Information | État |
|---|---|---|
| `index.html` (section Tarifs) | Prix mensuel et conditions de la formule « Chargé d'affaires » | ⬜ à faire |
| `mentions-legales.html` | Forme juridique, adresse, SIREN/SIRET, immatriculation, TVA | ⬜ à faire |
| `contact.html` | Clé Web3Forms et adresse de secours | ✅ fait |

## B. Avant de vendre ChargéPro

1. **Statut** : une activité de vente de logiciel exige une immatriculation (micro-entreprise ou société). Les mentions légales doivent alors être complètes.
2. **Propriété du logiciel** : ChargéPro a été conçu en contexte salarié et contient des référentiels métier (base Cadences, modèle de BTE). Vérifiez que ces contenus vous appartiennent et qu'aucune clause de votre contrat de travail (propriété intellectuelle, exclusivité, non-concurrence, confidentialité) ne s'oppose à la vente. Retirez de l'application toute donnée ou nom propre à votre employeur.
3. **Mentions de l'application** : `mentions-legales.html` du dépôt `Charg` indique « outil personnel, non commercial ». À réécrire avant toute vente, avec des conditions générales d'utilisation et de vente (CGU/CGV).
4. **Encaissement** : choisir un moyen de paiement (virement, Stripe, etc.) et un mode de facturation conforme.
5. **Coordonnées publiques** : l'e-mail et le téléphone affichés sont personnels. Une adresse et un numéro dédiés limitent le démarchage et le spam.
6. **Accès à l'application** : décider comment un client payant accède à ChargéPro (lien privé, licence, compte) ; aujourd'hui l'application est en accès libre.

## C. Vérifications techniques

- Pages testées à 375 px et 1280 px, thèmes clair et sombre, sans défilement horizontal.
- Aucun cookie ni traceur ; polices et images servies depuis le site.
- Après passage à un nom de domaine : `bash outils/changer-adresse.sh https://www.votre-domaine.fr/`.
