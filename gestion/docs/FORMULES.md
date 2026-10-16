# Formules de calcul financier

Source : `js/calculs/finances.js` (fonctions pures). Tests : `tests/finances.test.mjs` (`npm test`, ou `node --test tests/*.test.mjs`).

## Conventions

- Montants stockés et calculés en **centimes entiers** : aucune erreur d'arrondi cumulée. Affichage en euros avec deux décimales.
- **HT** : budgets, avenants, commandes, factures fournisseurs, montant vendu, factures clients.
- **TTC** : règlements clients, soldes et créances. `TTC = arrondi(HT × (1 + taux / 100))`.
- Cinq notions à ne jamais confondre :

| Notion | Source | Effet |
|---|---|---|
| Commande | bon de commande envoyé, confirmé, livré ou soldé | **engage** une dépense |
| Facture reçue | facture fournisseur, hors annulée | **réalise** (comptabilise) la dépense |
| Dépense payée | facture fournisseur au statut « payée » | sortie de trésorerie |
| Facture émise | facture client émise | **facturé** |
| Encaissement | règlement reçu | **encaissé** (TTC) |

## Par poste budgétaire

| Indicateur | Formule |
|---|---|
| Budget révisé | budget initial + Σ avenants « budget » du poste |
| Engagé d'une commande | max(montant de la commande ; Σ factures liées à cette commande) |
| Engagé du poste | Σ engagé des commandes engagées + Σ factures du poste sans commande engagée |
| Réalisé | Σ factures reçues du poste |
| Payé | Σ factures payées du poste |
| Reste à engager | valeur saisie sur le poste, sinon max(0 ; budget révisé − engagé) |
| Coût à terminaison (CAT) | engagé + reste à engager |
| Écart | budget révisé − CAT (positif = favorable) |

Un pseudo-poste **« Non ventilé »** regroupe les commandes, factures et avenants rattachés à l'affaire sans poste. Il est inclus dans les totaux et déclenche une alerte.

## Par affaire

| N° | Indicateur | Formule |
|---|---|---|
| 1 | Budget initial | Σ budgets initiaux des postes |
| 2 | Budget révisé | Σ budgets révisés |
| 3 | Montant vendu (ou honoraires) révisé | montant vendu initial + Σ avenants « vente » |
| 4 | Commandes engagées | Σ engagé des postes |
| 5 | Dépenses comptabilisées | Σ réalisé des postes |
| 6 | Montant facturé | Σ HT des factures clients émises |
| 7 | Montant encaissé | Σ règlements (TTC) |
| 8 | Coûts restant à engager | Σ reste à engager |
| 9 | Coût estimé à terminaison | Σ CAT |
| 10 | Marge prévisionnelle | vendu révisé − budget révisé |
| 11 | Marge à terminaison | vendu révisé − CAT |
| 12 | Écart prévisionnel / réalisé | budget révisé − CAT |
| — | Reste dû (TTC) | Σ TTC facturé − Σ encaissé |
| — | Reste à facturer (HT) | vendu révisé − facturé HT |

Taux de marge = marge / vendu révisé, arrondi au dixième de point.

## Pourquoi il n'y a pas de double comptage

1. Une facture liée à une commande **confirme** l'engagement, elle ne s'y ajoute pas.
2. Si elle **dépasse** la commande, l'engagé retient le montant facturé (écart de prix).
3. Une facture liée à une commande d'un autre poste n'est comptée qu'une fois, dans l'engagé de cette commande.
4. Une commande en brouillon ou annulée n'engage rien. Une facture qui s'y rattacherait est engagée comme une facture sans commande.
5. Les totaux sont toujours **recalculés** depuis les pièces, jamais stockés.

## Alertes

| Alerte | Condition |
|---|---|
| Budget dépassé | réalisé > budget révisé sur un poste |
| Commandes supérieures au budget | engagé > budget révisé sur un poste |
| Coût à terminaison > budget | CAT > budget révisé de l'affaire |
| Marge en baisse | marge à terminaison < marge prévisionnelle (affaire active) |
| Marge faible | taux de marge à terminaison < seuil des paramètres (10 % par défaut) |
| Facture échue | solde TTC > 0 et échéance dépassée |
| Facture à échéance | solde TTC > 0 et échéance sous 7 jours |
| Dépense non affectée | facture fournisseur sans affaire |
| Dépense non ventilée | commande ou facture sans poste budgétaire |
| Affaire en retard | date de fin prévue dépassée, affaire non terminée |
| Opération en retard | fin prévue dépassée ou démarrage en retard, opération non terminée |

## Planning

- Avancement d'une affaire = moyenne des avancements des opérations, pondérée par leur durée prévue (une opération terminée compte pour 100 %).
- Écart de fin = fin réelle − fin prévue. Pour une opération non terminée dont la fin prévue est dépassée, l'écart est projeté à la date du jour.
