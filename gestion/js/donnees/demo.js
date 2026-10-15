/* ==========================================================================
   DONNÉES DE DÉMONSTRATION — FICTIVES
   Servent uniquement à essayer le prototype. Chaque enregistrement porte
   demo: true, les noms contiennent « (démo) » et un bandeau est affiché.
   Les dates sont calculées par rapport au jour d'ouverture.
   ========================================================================== */
import { baseVide } from "./modele.js";
import { uid } from "./store.js";

const E = (euros) => Math.round(euros * 100);

export function jeuDemo(aujourdhui = new Date()) {
  const j = (decalage) => { const d = new Date(aujourdhui); d.setDate(d.getDate() + decalage); return d.toISOString().slice(0, 10); };
  const an = aujourdhui.getFullYear();
  const b = baseVide();
  b.meta.demo = true;
  const D = { demo: true };

  /* Contacts (professionnels uniquement, fictifs) */
  const c = (nom, type, specialite, commune) => { const o = { id: uid(), nom, type, specialite, commune, email: "", telephone: "", siret: "", notes: "", ...D }; b.contacts.push(o); return o.id; };
  const cliA = c("Client A (démo)", "client", "", "Bois-Guillaume");
  const cliB = c("Client B (démo)", "client", "", "Le Havre");
  const cliC = c("Client C (démo)", "client", "", "Rouen");
  const cliD = c("Client D (démo)", "client", "", "Montivilliers");
  const fDemol = c("Entreprise Démolition (démo)", "sous_traitant", "Démolition, curage", "Sotteville-lès-Rouen");
  const fPlomb = c("Plomberie Exemple (démo)", "sous_traitant", "Plomberie, chauffage", "Rouen");
  const fElec = c("Électricité Exemple (démo)", "sous_traitant", "Électricité", "Darnétal");
  const fMenu = c("Menuiseries Exemple (démo)", "fournisseur", "Menuiseries extérieures", "Barentin");
  const fPlat = c("Plâtrerie Exemple (démo)", "sous_traitant", "Plâtrerie, isolation", "Elbeuf");
  const fBenne = c("Location de bennes (démo)", "fournisseur", "Évacuation des déchets", "Rouen");
  const bet = c("Bureau d'études structure (démo)", "intervenant", "Structure", "Rouen");

  /* Affaires */
  const aff = (o) => { const x = { id: uid(), archive: false, responsable: "Moi", cree_le: j(-120) + "T09:00:00Z", ...D, ...o }; b.affaires.push(x); return x.id; };
  const A1 = aff({ reference: `AFF-${an}-001`, nom: "Rénovation complète d'une maison (démo)", client_id: cliA, statut: "en_cours", nature_contrat: "travaux", montant_vendu_ht: E(85000), adresse: "Adresse fictive", commune: "Bois-Guillaume", type_batiment: "maison", nature_travaux: "Rénovation intérieure complète", date_debut_prevue: j(-75), date_fin_prevue: j(40), description: "Affaire de démonstration : travaux tous corps d'état." });
  const A2 = aff({ reference: `AFF-${an}-002`, nom: "Maîtrise d'œuvre d'un appartement (démo)", client_id: cliB, statut: "en_cours", nature_contrat: "honoraires", montant_vendu_ht: E(9800), adresse: "Adresse fictive", commune: "Le Havre", type_batiment: "appartement", nature_travaux: "Redistribution et rénovation", date_debut_prevue: j(-30), date_fin_prevue: j(90), description: "Mission de préparation, consultation et coordination." });
  const A3 = aff({ reference: `AFF-${an}-003`, nom: "Salle de bains et cuisine (démo)", client_id: cliC, statut: "offre_envoyee", nature_contrat: "travaux", montant_vendu_ht: E(32000), commune: "Rouen", type_batiment: "appartement", nature_travaux: "Rénovation de pièces d'eau", date_debut_prevue: j(45), date_fin_prevue: j(100) });
  const A4 = aff({ reference: `AFF-${an}-004`, nom: "Extension et isolation (démo)", client_id: cliD, statut: "en_preparation", nature_contrat: "travaux", montant_vendu_ht: E(48000), commune: "Montivilliers", type_batiment: "maison", nature_travaux: "Isolation par l'extérieur", date_debut_prevue: j(20), date_fin_prevue: j(110) });
  aff({ reference: `AFF-${an}-005`, nom: "Aménagement de combles (démo)", client_id: cliC, statut: "perdue", nature_contrat: "travaux", montant_vendu_ht: E(27000), commune: "Rouen", type_batiment: "maison" });

  /* Postes budgétaires (coûts HT) */
  const poste = (affaire_id, libelle, categorie, montant, extra = {}) => { const o = { id: uid(), affaire_id, libelle, categorie, montant_initial_ht: E(montant), reste_a_engager_ht: null, ...D, ...extra }; b.postes.push(o); return o.id; };
  const pDem = poste(A1, "Démolition et curage", "Démolition", 6000);
  const pPlo = poste(A1, "Plomberie", "Plomberie", 14000);
  const pEle = poste(A1, "Électricité", "Électricité", 12000);
  const pMen = poste(A1, "Menuiseries", "Menuiseries", 18000);
  const pPla = poste(A1, "Plâtrerie et isolation", "Plâtrerie", 9000);
  poste(A1, "Peinture et sols", "Peinture", 7000);
  const pBet = poste(A2, "Études de structure", "Études", 1200);
  poste(A2, "Diagnostics", "Études", 450);
  poste(A2, "Frais de déplacement", "Divers", 300);
  poste(A4, "Isolation extérieure", "Plâtrerie", 26000);
  poste(A4, "Menuiseries", "Menuiseries", 9500);

  /* Avenants */
  b.avenants.push({ id: uid(), affaire_id: A1, type: "vente", libelle: "Salle d'eau supplémentaire", montant_ht: E(4500), date: j(-20), ...D });
  b.avenants.push({ id: uid(), affaire_id: A1, type: "budget", poste_id: pPlo, libelle: "Salle d'eau supplémentaire : plomberie", montant_ht: E(3200), date: j(-20), ...D });

  /* Opérations */
  const op = (o) => { const x = { id: uid(), avancement: 0, blocage: "", contraintes: "", intervenants: "", responsable: "Moi", ...D, ...o }; b.operations.push(x); return x.id; };
  op({ affaire_id: A1, nom: "Démolition et curage", type: "Démolition", statut: "terminee", date_debut_prevue: j(-75), date_fin_prevue: j(-60), date_debut_reelle: j(-74), date_fin_reelle: j(-58), avancement: 100, intervenants: "Entreprise Démolition (démo)" });
  op({ affaire_id: A1, nom: "Réseaux : plomberie et électricité", type: "Second œuvre", statut: "en_cours", date_debut_prevue: j(-55), date_fin_prevue: j(-5), date_debut_reelle: j(-52), avancement: 70, intervenants: "Plomberie Exemple (démo), Électricité Exemple (démo)", blocage: "Attente d'une pièce de raccordement" });
  op({ affaire_id: A1, nom: "Menuiseries et plâtrerie", type: "Second œuvre", statut: "a_venir", date_debut_prevue: j(2), date_fin_prevue: j(25), intervenants: "Menuiseries Exemple (démo), Plâtrerie Exemple (démo)" });
  op({ affaire_id: A1, nom: "Finitions et réception", type: "Finitions", statut: "a_venir", date_debut_prevue: j(26), date_fin_prevue: j(40) });
  op({ affaire_id: A2, nom: "Préparation et descriptif", type: "Préparation", statut: "terminee", date_debut_prevue: j(-30), date_fin_prevue: j(-10), date_debut_reelle: j(-30), date_fin_reelle: j(-8), avancement: 100 });
  op({ affaire_id: A2, nom: "Consultation des entreprises", type: "Préparation", statut: "en_cours", date_debut_prevue: j(-8), date_fin_prevue: j(15), date_debut_reelle: j(-7), avancement: 40 });
  op({ affaire_id: A4, nom: "Préparation du chantier", type: "Préparation", statut: "en_cours", date_debut_prevue: j(-5), date_fin_prevue: j(19), date_debut_reelle: j(-5), avancement: 20 });

  /* Commandes (lignes en centimes) */
  const cmd = (o, lignes) => { const x = { id: uid(), lignes: lignes.map(([designation, quantite, unite, pu]) => ({ designation, quantite, unite, pu_ht: E(pu) })), ...D, ...o }; b.commandes.push(x); return x.id; };
  const cDem = cmd({ numero: `CMD-${an}-001`, affaire_id: A1, poste_id: pDem, fournisseur_id: fDemol, statut: "soldee", date: j(-78), livraison_prevue: j(-75) }, [["Démolition et curage", 1, "forfait", 5800]]);
  const cPlo = cmd({ numero: `CMD-${an}-002`, affaire_id: A1, poste_id: pPlo, fournisseur_id: fPlomb, statut: "confirmee", date: j(-58), livraison_prevue: j(-50) }, [["Réseaux d'alimentation et d'évacuation", 1, "forfait", 9800], ["Appareils sanitaires", 6, "u", 450], ["Salle d'eau supplémentaire", 1, "forfait", 3000]]);
  const cEle = cmd({ numero: `CMD-${an}-003`, affaire_id: A1, poste_id: pEle, fournisseur_id: fElec, statut: "livree", date: j(-56), livraison_prevue: j(-48) }, [["Mise en conformité électrique", 1, "forfait", 12400]]);
  cmd({ numero: `CMD-${an}-004`, affaire_id: A1, poste_id: pMen, fournisseur_id: fMenu, statut: "envoyee", date: j(-10), livraison_prevue: j(5) }, [["Fenêtres aluminium", 8, "u", 1650], ["Porte d'entrée", 1, "u", 4000]]);
  cmd({ numero: `CMD-${an}-005`, affaire_id: A1, poste_id: pPla, fournisseur_id: fPlat, statut: "brouillon", date: j(-2), livraison_prevue: j(8) }, [["Cloisons et doublages", 120, "m²", 58]]);
  const cBet = cmd({ numero: `CMD-${an}-006`, affaire_id: A2, poste_id: pBet, fournisseur_id: bet, statut: "confirmee", date: j(-25) }, [["Note de calcul : ouverture de mur porteur", 1, "forfait", 1100]]);

  /* Factures fournisseurs (dépenses comptabilisées) */
  const ff = (o) => b.factures_fournisseurs.push({ id: uid(), taux_tva: 20, ...D, ...o });
  ff({ numero: "FF-DEM-118", fournisseur_id: fDemol, affaire_id: A1, poste_id: pDem, commande_id: cDem, date: j(-57), echeance: j(-27), montant_ht: E(5800), statut: "payee" });
  ff({ numero: "FF-PLO-0457", fournisseur_id: fPlomb, affaire_id: A1, poste_id: pPlo, commande_id: cPlo, date: j(-20), echeance: j(10), montant_ht: E(8000), statut: "recue" });
  ff({ numero: "FF-ELE-2210", fournisseur_id: fElec, affaire_id: A1, poste_id: pEle, commande_id: cEle, date: j(-12), echeance: j(18), montant_ht: E(12900), statut: "recue" });
  ff({ numero: "FF-BEN-031", fournisseur_id: fBenne, affaire_id: A1, poste_id: null, commande_id: null, date: j(-60), echeance: j(-30), montant_ht: E(640), statut: "payee" });
  ff({ numero: "FF-BET-77", fournisseur_id: bet, affaire_id: A2, poste_id: pBet, commande_id: cBet, date: j(-6), echeance: j(24), montant_ht: E(1100), statut: "recue" });
  ff({ numero: "FF-BEN-044", fournisseur_id: fBenne, affaire_id: null, poste_id: null, date: j(-4), echeance: j(26), montant_ht: E(320), statut: "recue" });

  /* Factures clients et encaissements */
  const fc = (o) => { const x = { id: uid(), taux_tva: 10, statut: "emise", ...D, ...o }; b.factures_clients.push(x); return x.id; };
  const fc1 = fc({ affaire_id: A1, numero: `FA-${an}-001`, type: "acompte", date: j(-80), echeance: j(-50), montant_ht: E(25500) });
  const fc2 = fc({ affaire_id: A1, numero: `FA-${an}-002`, type: "situation", date: j(-35), echeance: j(-5), montant_ht: E(21000) });
  fc({ affaire_id: A1, numero: `FA-${an}-004`, type: "situation", date: j(-3), echeance: j(27), montant_ht: E(14000) });
  const fc3 = fc({ affaire_id: A2, numero: `FA-${an}-003`, type: "honoraires", date: j(-8), echeance: j(4), montant_ht: E(2940), taux_tva: 20 });
  b.paiements.push({ id: uid(), facture_client_id: fc1, date: j(-52), montant_ttc: E(28050), mode: "virement", ...D });
  b.paiements.push({ id: uid(), facture_client_id: fc2, date: j(-3), montant_ttc: E(10000), mode: "virement", ...D });
  void fc3;

  /* Planning, tâches, documents */
  const ev = (o) => b.evenements.push({ id: uid(), ...D, ...o });
  [-21, -14, -7, 0, 7, 14, 21].forEach((k, i) => ev({ titre: `Réunion de chantier n° ${i + 1}`, type: "reunion", date: j(k), affaire_id: A1,
    compte_rendu: k < 0 ? `Présents : client, plombier, électricien (démo).\nAvancement conforme hors raccordement en attente.\nActions : relancer la livraison des menuiseries.` : "" }));
  ev({ titre: "Livraison des menuiseries", type: "livraison", date: j(5), affaire_id: A1 });
  ev({ titre: "Remise des offres des entreprises", type: "jalon", date: j(12), affaire_id: A2 });
  ev({ titre: "Visite de relevé", type: "visite", date: j(3), affaire_id: A3 });
  ev({ titre: "Réception des travaux (prévisionnelle)", type: "jalon", date: j(40), affaire_id: A1 });

  const t = (o) => b.taches.push({ id: uid(), fait: false, ...D, ...o });
  t({ libelle: "Relancer le client pour la situation n° 2", affaire_id: A1, echeance: j(1) });
  t({ libelle: "Valider le bon de commande plâtrerie", affaire_id: A1, echeance: j(2) });
  t({ libelle: "Analyser les offres reçues", affaire_id: A2, echeance: j(13) });
  t({ libelle: "Relancer le client pour la décision", affaire_id: A3, echeance: j(-1) });
  t({ libelle: "Mettre à jour l'attestation d'assurance", affaire_id: null, echeance: j(20) });

  const res = (o) => b.reserves.push({ id: uid(), ...D, ...o });
  res({ affaire_id: A1, libelle: "Reprise d'enduit autour du tableau électrique", localisation: "Entrée", entreprise_id: fElec, date_constat: j(-6), date_limite: j(10), statut: "ouverte" });
  res({ affaire_id: A1, libelle: "Fuite sur un raccord sous évier", localisation: "Cuisine", entreprise_id: fPlomb, date_constat: j(-10), date_limite: j(-2), statut: "ouverte" });
  res({ affaire_id: A1, libelle: "Gravats non évacués", localisation: "Jardin", entreprise_id: fDemol, date_constat: j(-60), date_limite: j(-55), statut: "levee", date_levee: j(-56) });

  const doc = (o) => b.documents.push({ id: uid(), ...D, ...o });
  doc({ nom: "Devis signé (démo)", type: "devis", affaire_id: A1, date: j(-90), emplacement: "Dossier affaire / 01 Contrat" });
  doc({ nom: "Bon de commande menuiseries (démo)", type: "bon_commande", affaire_id: A1, date: j(-10), emplacement: "Dossier affaire / 03 Commandes" });
  doc({ nom: "Compte rendu de chantier n° 3 (démo)", type: "compte_rendu", affaire_id: A1, date: j(-7), emplacement: "Dossier affaire / 05 Comptes rendus" });
  doc({ nom: "Contrat de maîtrise d'œuvre (démo)", type: "contrat", affaire_id: A2, date: j(-32), emplacement: "Dossier affaire / 01 Contrat" });

  b.historique.unshift({ id: uid(), date: new Date().toISOString(), entite: "base", entite_id: null, action: "création", details: "Chargement des données de démonstration", auteur: "Moi" });
  return b;
}
