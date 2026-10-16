// Tests du moteur financier : node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { syntheseAffaire, montantCommande, ttc, alertesGlobales, syntheseGlobale } from "../js/calculs/finances.js";

const AUJ = "2026-10-15";
const vide = () => ({ affaires: [], postes: [], avenants: [], commandes: [], factures_fournisseurs: [], factures_clients: [], paiements: [], operations: [] });
// montants en centimes
const E = (euros) => Math.round(euros * 100);

function base() {
  const d = vide();
  d.affaires.push({ id: "A", statut: "en_cours", montant_vendu_ht: E(100000), date_fin_prevue: "2026-12-31" });
  d.postes.push({ id: "P1", affaire_id: "A", libelle: "Gros œuvre", montant_initial_ht: E(50000) });
  d.postes.push({ id: "P2", affaire_id: "A", libelle: "Électricité", montant_initial_ht: E(20000) });
  return d;
}

test("montant de commande : somme des lignes arrondie au centime", () => {
  assert.equal(montantCommande({ lignes: [{ quantite: 3, pu_ht: 3333 }, { quantite: 0.5, pu_ht: 101 }] }), 9999 + 51);
  assert.equal(ttc(E(1000), 20), E(1200));
  assert.equal(ttc(E(1000), 5.5), E(1055));
});

test("affaire sans dépense : budget, CAT et marges", () => {
  const s = syntheseAffaire(base(), "A", AUJ);
  assert.equal(s.budget_initial, E(70000));
  assert.equal(s.budget_revise, E(70000));
  assert.equal(s.engage, 0);
  assert.equal(s.cat, E(70000));            // reste à engager = budget
  assert.equal(s.marge_prev, E(30000));
  assert.equal(s.marge_term, E(30000));
  assert.equal(s.marge_prev_pct, 30);
});

test("avenants : vente et budget séparés", () => {
  const d = base();
  d.avenants.push({ id: "av1", affaire_id: "A", type: "vente", montant_ht: E(5000) });
  d.avenants.push({ id: "av2", affaire_id: "A", type: "budget", poste_id: "P2", montant_ht: E(3000) });
  const s = syntheseAffaire(d, "A", AUJ);
  assert.equal(s.vendu_revise, E(105000));
  assert.equal(s.budget_revise, E(73000));
  assert.equal(s.marge_prev, E(32000));
});

test("commande engagée puis facturée : pas de double comptage", () => {
  const d = base();
  d.commandes.push({ id: "C1", affaire_id: "A", poste_id: "P2", statut: "confirmee", lignes: [{ quantite: 1, pu_ht: E(15000) }] });
  d.factures_fournisseurs.push({ id: "F1", affaire_id: "A", poste_id: "P2", commande_id: "C1", montant_ht: E(9000), statut: "recue" });
  const s = syntheseAffaire(d, "A", AUJ);
  const p2 = s.postes.find((p) => p.poste_id === "P2");
  assert.equal(p2.engage, E(15000));        // la facture partielle ne s'ajoute pas à la commande
  assert.equal(p2.realise, E(9000));
  assert.equal(p2.reste_a_engager, E(5000));
  assert.equal(p2.cat, E(20000));
});

test("facture supérieure à la commande : l'engagé suit la facture", () => {
  const d = base();
  d.commandes.push({ id: "C1", affaire_id: "A", poste_id: "P2", statut: "livree", lignes: [{ quantite: 1, pu_ht: E(15000) }] });
  d.factures_fournisseurs.push({ id: "F1", affaire_id: "A", poste_id: "P2", commande_id: "C1", montant_ht: E(15600), statut: "recue" });
  const p2 = syntheseAffaire(d, "A", AUJ).postes.find((p) => p.poste_id === "P2");
  assert.equal(p2.engage, E(15600));
});

test("facture liée à une commande d'un autre poste : comptée une seule fois", () => {
  const d = base();
  d.commandes.push({ id: "C1", affaire_id: "A", poste_id: "P1", statut: "confirmee", lignes: [{ quantite: 1, pu_ht: E(10000) }] });
  d.factures_fournisseurs.push({ id: "F1", affaire_id: "A", poste_id: "P2", commande_id: "C1", montant_ht: E(4000), statut: "recue" });
  const s = syntheseAffaire(d, "A", AUJ);
  assert.equal(s.engage, E(10000));
});

test("commande en brouillon ou annulée : non engagée", () => {
  const d = base();
  d.commandes.push({ id: "C1", affaire_id: "A", poste_id: "P1", statut: "brouillon", lignes: [{ quantite: 1, pu_ht: E(10000) }] });
  d.commandes.push({ id: "C2", affaire_id: "A", poste_id: "P1", statut: "annulee", lignes: [{ quantite: 1, pu_ht: E(10000) }] });
  assert.equal(syntheseAffaire(d, "A", AUJ).engage, 0);
});

test("facture sans commande et dépense non ventilée", () => {
  const d = base();
  d.factures_fournisseurs.push({ id: "F1", affaire_id: "A", poste_id: null, montant_ht: E(640), statut: "payee" });
  const s = syntheseAffaire(d, "A", AUJ);
  const nv = s.postes.find((p) => p.poste_id === null);
  assert.equal(nv.engage, E(640));
  assert.equal(nv.realise, E(640));
  assert.equal(nv.paye, E(640));
  assert.equal(s.cat, E(70640));
  assert.ok(s.alertes.some((a) => a.type === "non_ventile"));
});

test("reste à engager saisi manuellement remplace l'estimation", () => {
  const d = base();
  d.postes[0].reste_a_engager_ht = E(60000);  // le gros œuvre coûtera plus que prévu
  const s = syntheseAffaire(d, "A", AUJ);
  assert.equal(s.cat, E(80000));
  assert.equal(s.marge_term, E(20000));
  assert.ok(s.alertes.some((a) => a.type === "cat_depasse"));
  assert.ok(s.alertes.some((a) => a.type === "marge_baisse"));
});

test("dépassement de budget et commandes supérieures au budget", () => {
  const d = base();
  d.commandes.push({ id: "C1", affaire_id: "A", poste_id: "P2", statut: "confirmee", lignes: [{ quantite: 1, pu_ht: E(21000) }] });
  let s = syntheseAffaire(d, "A", AUJ);
  assert.ok(s.alertes.some((a) => a.type === "commandes_depassent"));
  d.factures_fournisseurs.push({ id: "F1", affaire_id: "A", poste_id: "P2", commande_id: "C1", montant_ht: E(21000), statut: "recue" });
  s = syntheseAffaire(d, "A", AUJ);
  assert.ok(s.alertes.some((a) => a.type === "budget_depasse"));
});

test("facturation client : HT, TTC, encaissé, solde et échéance", () => {
  const d = base();
  d.factures_clients.push({ id: "FC1", affaire_id: "A", numero: "FA-1", montant_ht: E(30000), taux_tva: 20, echeance: "2026-09-30", statut: "emise" });
  d.factures_clients.push({ id: "FC2", affaire_id: "A", numero: "FA-2", montant_ht: E(10000), taux_tva: 20, echeance: "2026-10-20", statut: "emise" });
  d.paiements.push({ id: "R1", facture_client_id: "FC1", montant_ttc: E(20000) });
  const s = syntheseAffaire(d, "A", AUJ);
  assert.equal(s.facture_ht, E(40000));
  assert.equal(s.facture_ttc, E(48000));
  assert.equal(s.encaisse_ttc, E(20000));
  assert.equal(s.reste_du_ttc, E(28000));
  assert.equal(s.echu_ttc, E(16000));
  assert.equal(s.reste_a_facturer_ht, E(60000));
  assert.ok(s.alertes.some((a) => a.type === "facture_echue"));
  assert.ok(s.alertes.some((a) => a.type === "facture_echeance"));
});

test("alertes globales : dépense non affectée et opération en retard", () => {
  const d = base();
  d.factures_fournisseurs.push({ id: "F9", affaire_id: null, montant_ht: E(100), statut: "recue" });
  d.operations.push({ id: "O1", affaire_id: "A", nom: "Lot 1", statut: "en_cours", date_fin_prevue: "2026-10-01" });
  const A = alertesGlobales(d, AUJ);
  assert.ok(A.some((a) => a.type === "depense_non_affectee"));
  assert.ok(A.some((a) => a.type === "operation_retard"));
  assert.equal(A[0].niveau, "alerte");
});

test("synthèse globale : seules les affaires actives sont agrégées", () => {
  const d = base();
  d.affaires.push({ id: "B", statut: "perdue", montant_vendu_ht: E(50000) });
  d.affaires.push({ id: "C", statut: "en_cours", montant_vendu_ht: E(10000), archive: true });
  const g = syntheseGlobale(d, AUJ);
  assert.equal(g.nb_affaires_en_cours, 1);
  assert.equal(g.vendu_revise, E(100000));
});

import { avancementAffaire, ecartsOperation } from "../js/calculs/planning.js";

test("planning : avancement pondéré par la durée prévue", () => {
  const ops = [
    { statut: "terminee", date_debut_prevue: "2026-01-01", date_fin_prevue: "2026-01-10", avancement: 0 },   // 10 j à 100 %
    { statut: "en_cours", date_debut_prevue: "2026-01-11", date_fin_prevue: "2026-02-09", avancement: 50 },  // 30 j à 50 %
  ];
  assert.equal(avancementAffaire(ops), Math.round((10 * 100 + 30 * 50) / 40));
  assert.equal(avancementAffaire([]), 0);
});

test("planning : écarts prévu / réel", () => {
  const e = ecartsOperation({ statut: "en_cours", date_debut_prevue: "2026-10-01", date_debut_reelle: "2026-10-04", date_fin_prevue: "2026-10-10" }, AUJ);
  assert.equal(e.retard_debut, 3);
  assert.equal(e.retard_fin, 5);      // projetée à aujourd'hui (15/10)
  assert.ok(e.en_retard);
  const t = ecartsOperation({ statut: "terminee", date_fin_prevue: "2026-10-10", date_fin_reelle: "2026-10-08" }, AUJ);
  assert.equal(t.retard_fin, -2);     // en avance
  assert.ok(!t.en_retard);
  const late = ecartsOperation({ statut: "terminee", date_fin_prevue: "2026-10-10", date_fin_reelle: "2026-10-12" }, AUJ);
  assert.equal(late.retard_fin, 2);   // écart historique conservé
  assert.ok(!late.en_retard);         // mais l'opération terminée n'est plus « en retard »
});
