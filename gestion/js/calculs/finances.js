/* ==========================================================================
   Moteur de calcul financier — Ligne&Bati Gestion
   --------------------------------------------------------------------------
   Règles générales (voir docs/FORMULES.md) :
   - Tous les montants sont stockés et calculés en CENTIMES (entiers) pour
     éviter les erreurs d'arrondi des nombres à virgule.
   - Côté coûts et ventes, tout est HT. Les encaissements sont TTC, car un
     client règle des montants TTC ; le solde client est donc calculé en TTC.
   - Une commande (engagement) ≠ une facture reçue (dépense comptabilisée)
     ≠ une facture payée ≠ une facture émise ≠ un encaissement.
   - Pas de double comptage : une facture fournisseur rattachée à une
     commande ne s'ajoute pas à l'engagé ; l'engagé de la commande est le
     maximum entre son montant et le total des factures qui lui sont liées.
   Fonctions pures : aucune lecture de l'horloge ou du stockage ici ;
   la date du jour est passée en paramètre (testabilité).
   ========================================================================== */

export const STATUTS_COMMANDE_ENGAGES = ["envoyee", "confirmee", "livree", "soldee"];
export const STATUTS_AFFAIRE_ACTIFS = ["gagnee", "en_preparation", "en_cours", "en_attente"];

const somme = (liste, f) => liste.reduce((s, x) => s + (f(x) || 0), 0);

/** Montant HT d'une ligne de commande (quantité × prix unitaire, arrondi au centime). */
export function montantLigne(l) {
  return Math.round((Number(l.quantite) || 0) * (Number(l.pu_ht) || 0));
}
export function montantCommande(c) {
  return somme(c.lignes || [], montantLigne);
}
export function estEngagee(c) {
  return STATUTS_COMMANDE_ENGAGES.includes(c.statut);
}
/** TTC d'un montant HT pour un taux en pourcentage (ex. 20). */
export function ttc(ht, taux) {
  return Math.round(ht * (1 + (Number(taux) || 0) / 100));
}

/**
 * Synthèse financière complète d'une affaire.
 * @param {object} donnees état complet de l'application
 * @param {string} affaireId
 * @param {string} aujourdhui date ISO AAAA-MM-JJ
 */
export function syntheseAffaire(donnees, affaireId, aujourdhui, parametres = {}) {
  const affaire = donnees.affaires.find((a) => a.id === affaireId);
  if (!affaire) return null;
  const seuilMarge = parametres.seuil_marge_pct ?? 10;

  const postes = donnees.postes.filter((p) => p.affaire_id === affaireId);
  const avenants = donnees.avenants.filter((a) => a.affaire_id === affaireId);
  const commandes = donnees.commandes.filter((c) => c.affaire_id === affaireId && estEngagee(c));
  const facturesF = donnees.factures_fournisseurs.filter((f) => f.affaire_id === affaireId && f.statut !== "annulee");
  const facturesC = donnees.factures_clients.filter((f) => f.affaire_id === affaireId && f.statut !== "annulee");

  /* ---- Ventilation par poste budgétaire -------------------------------- */
  // Un pseudo-poste « non ventilé » (id null) reçoit ce qui n'est rattaché à aucun poste.
  const ids = [...postes.map((p) => p.id), null];
  const lignes = ids.map((pid) => {
    const poste = postes.find((p) => p.id === pid) || null;
    const budgetInitial = poste ? poste.montant_initial_ht || 0 : 0;
    const avenantsBudget = somme(avenants.filter((a) => a.type === "budget" && (a.poste_id || null) === pid), (a) => a.montant_ht);
    const budgetRevise = budgetInitial + avenantsBudget;

    const cmds = commandes.filter((c) => (c.poste_id || null) === pid);
    const engageCommandes = somme(cmds, (c) => {
      const liees = somme(facturesF.filter((f) => f.commande_id === c.id), (f) => f.montant_ht);
      return Math.max(montantCommande(c), liees);
    });
    const facturesPoste = facturesF.filter((f) => (f.poste_id || null) === pid);
    // factures sans commande, ou rattachées à une commande non engagée (brouillon, annulée) ;
    // une facture liée à une commande engagée est déjà comptée dans l'engagé de cette commande
    const horsCommande = somme(facturesPoste.filter((f) => !f.commande_id || !commandes.some((c) => c.id === f.commande_id)), (f) => f.montant_ht);
    const engage = engageCommandes + horsCommande;
    const realise = somme(facturesPoste, (f) => f.montant_ht);
    const paye = somme(facturesPoste.filter((f) => f.statut === "payee"), (f) => f.montant_ht);

    const resteEstime = poste && poste.reste_a_engager_ht !== null && poste.reste_a_engager_ht !== undefined && poste.reste_a_engager_ht !== ""
      ? Number(poste.reste_a_engager_ht)
      : Math.max(0, budgetRevise - engage);
    const cat = engage + resteEstime;

    return {
      poste_id: pid,
      libelle: poste ? poste.libelle : "Non ventilé",
      categorie: poste ? poste.categorie : "",
      budget_initial: budgetInitial,
      avenants_budget: avenantsBudget,
      budget_revise: budgetRevise,
      engage, realise, paye,
      reste_a_engager: resteEstime,
      reste_saisi: !!(poste && poste.reste_a_engager_ht !== null && poste.reste_a_engager_ht !== undefined && poste.reste_a_engager_ht !== ""),
      cat,
      ecart: budgetRevise - cat,
    };
  }).filter((l) => l.poste_id !== null || l.budget_revise || l.engage || l.realise);

  const T = (k) => somme(lignes, (l) => l[k]);
  const budgetInitial = T("budget_initial");
  const avenantsBudget = T("avenants_budget");
  const budgetRevise = T("budget_revise");
  const engage = T("engage");
  const realise = T("realise");
  const paye = T("paye");
  const resteAEngager = T("reste_a_engager");
  const cat = T("cat");

  /* ---- Ventes, facturation, encaissements ------------------------------ */
  const venduInitial = affaire.montant_vendu_ht || 0;
  const avenantsVente = somme(avenants.filter((a) => a.type === "vente"), (a) => a.montant_ht);
  const venduRevise = venduInitial + avenantsVente;

  const factures = facturesC.map((f) => {
    const montantTtc = ttc(f.montant_ht, f.taux_tva);
    const encaisse = somme(donnees.paiements.filter((p) => p.facture_client_id === f.id), (p) => p.montant_ttc);
    const solde = montantTtc - encaisse;
    const echue = solde > 0 && f.echeance && f.echeance < aujourdhui;
    return { ...f, montant_ttc: montantTtc, encaisse, solde, echue };
  });
  const factureHt = somme(factures, (f) => f.montant_ht);
  const factureTtc = somme(factures, (f) => f.montant_ttc);
  const encaisseTtc = somme(factures, (f) => f.encaisse);
  const resteDuTtc = factureTtc - encaisseTtc;
  const echuTtc = somme(factures.filter((f) => f.echue), (f) => f.solde);

  const margePrev = venduRevise - budgetRevise;
  const margeTerm = venduRevise - cat;
  const pct = (m) => (venduRevise ? Math.round((m / venduRevise) * 1000) / 10 : null);

  const s = {
    affaire_id: affaireId,
    vendu_initial: venduInitial, avenants_vente: avenantsVente, vendu_revise: venduRevise,
    budget_initial: budgetInitial, avenants_budget: avenantsBudget, budget_revise: budgetRevise,
    engage, realise, paye, reste_a_engager: resteAEngager, cat,
    facture_ht: factureHt, facture_ttc: factureTtc, encaisse_ttc: encaisseTtc, reste_du_ttc: resteDuTtc, echu_ttc: echuTtc,
    reste_a_facturer_ht: venduRevise - factureHt,
    marge_prev: margePrev, marge_prev_pct: pct(margePrev),
    marge_term: margeTerm, marge_term_pct: pct(margeTerm),
    ecart_budget: budgetRevise - cat,
    postes: lignes,
    factures,
  };
  s.alertes = alertesAffaire(affaire, s, donnees, aujourdhui, seuilMarge);
  return s;
}

/* ---------- Alertes d'une affaire ---------------------------------------- */
function alertesAffaire(affaire, s, donnees, aujourdhui, seuilMarge) {
  const A = [];
  const ajout = (niveau, type, message, cible) => A.push({ niveau, type, message, affaire_id: affaire.id, cible: cible || null });
  const actif = !["perdue", "cloturee", "prospect", "a_chiffrer", "offre_preparation", "offre_envoyee", "attente_decision"].includes(affaire.statut);

  s.postes.forEach((l) => {
    if (l.realise > l.budget_revise && l.budget_revise >= 0 && (l.realise > 0)) {
      ajout("alerte", "budget_depasse", `Dépenses supérieures au budget sur « ${l.libelle} »`, { poste_id: l.poste_id });
    } else if (l.engage > l.budget_revise && l.engage > 0) {
      ajout("alerte", "commandes_depassent", `Commandes supérieures au budget disponible sur « ${l.libelle} »`, { poste_id: l.poste_id });
    }
    if (l.poste_id === null && (l.engage > 0 || l.realise > 0)) {
      ajout("attention", "non_ventile", "Des dépenses ou commandes ne sont rattachées à aucun poste budgétaire");
    }
  });
  if (s.budget_revise > 0 && s.cat > s.budget_revise) {
    ajout("alerte", "cat_depasse", "Le coût estimé à terminaison dépasse le budget révisé");
  }
  if (actif && s.vendu_revise > 0) {
    if (s.marge_term < s.marge_prev) {
      ajout("attention", "marge_baisse", "La marge à terminaison est inférieure à la marge prévisionnelle");
    }
    if (s.marge_term_pct !== null && s.marge_term_pct < seuilMarge) {
      ajout(s.marge_term < 0 ? "alerte" : "attention", "marge_faible", `Taux de marge à terminaison sous le seuil de ${seuilMarge} %`);
    }
  }
  s.factures.forEach((f) => {
    if (f.echue) ajout("alerte", "facture_echue", `Facture ${f.numero || ""} échue et non soldée`, { facture_client_id: f.id });
    else if (f.solde > 0 && f.echeance && joursEntre(aujourdhui, f.echeance) <= 7) {
      ajout("attention", "facture_echeance", `Facture ${f.numero || ""} à échéance le ${f.echeance}`, { facture_client_id: f.id });
    }
  });
  if (actif && affaire.date_fin_prevue && affaire.date_fin_prevue < aujourdhui && !["terminee", "cloturee"].includes(affaire.statut)) {
    ajout("alerte", "affaire_retard", "Date de fin prévue dépassée");
  }
  return A;
}

/* ---------- Alertes transverses (hors affaire) --------------------------- */
export function alertesGlobales(donnees, aujourdhui, parametres = {}) {
  const A = [];
  donnees.affaires.filter((a) => !a.archive).forEach((a) => {
    const s = syntheseAffaire(donnees, a.id, aujourdhui, parametres);
    A.push(...s.alertes);
  });
  donnees.factures_fournisseurs.filter((f) => !f.affaire_id && f.statut !== "annulee").forEach((f) => {
    A.push({ niveau: "attention", type: "depense_non_affectee", message: `Facture fournisseur ${f.numero || ""} non affectée à une affaire`, affaire_id: null, cible: { facture_fournisseur_id: f.id } });
  });
  donnees.operations.forEach((o) => {
    const a = donnees.affaires.find((x) => x.id === o.affaire_id);
    if (!a || a.archive) return;
    if (o.statut !== "terminee" && o.date_fin_prevue && o.date_fin_prevue < aujourdhui) {
      A.push({ niveau: "alerte", type: "operation_retard", message: `Opération « ${o.nom} » en retard`, affaire_id: o.affaire_id, cible: { operation_id: o.id } });
    }
    if (o.blocage) {
      A.push({ niveau: "attention", type: "blocage", message: `Point de blocage sur « ${o.nom} » : ${o.blocage}`, affaire_id: o.affaire_id, cible: { operation_id: o.id } });
    }
  });
  const ordre = { alerte: 0, attention: 1, info: 2 };
  return A.sort((x, y) => ordre[x.niveau] - ordre[y.niveau]);
}

/* ---------- Synthèse globale (tableau de bord) --------------------------- */
export function syntheseGlobale(donnees, aujourdhui, parametres = {}) {
  const affaires = donnees.affaires.filter((a) => !a.archive);
  const enCours = affaires.filter((a) => STATUTS_AFFAIRE_ACTIFS.includes(a.statut));
  const syntheses = enCours.map((a) => syntheseAffaire(donnees, a.id, aujourdhui, parametres));
  const T = (k) => somme(syntheses, (s) => s[k]);
  const operationsActives = donnees.operations.filter((o) => enCours.some((a) => a.id === o.affaire_id) && o.statut === "en_cours");
  return {
    nb_affaires_en_cours: enCours.length,
    nb_affaires_total: affaires.length,
    nb_operations_actives: operationsActives.length,
    budget_initial: T("budget_initial"),
    budget_revise: T("budget_revise"),
    engage: T("engage"),
    realise: T("realise"),
    vendu_revise: T("vendu_revise"),
    facture_ht: T("facture_ht"),
    encaisse_ttc: T("encaisse_ttc"),
    reste_du_ttc: T("reste_du_ttc"),
    marge_prev: T("marge_prev"),
    marge_term: T("marge_term"),
    affaires_retard: enCours.filter((a) => a.date_fin_prevue && a.date_fin_prevue < aujourdhui).length,
    affaires_risque: syntheses.filter((s) => s.alertes.some((x) => x.niveau === "alerte" && ["budget_depasse", "cat_depasse", "commandes_depassent", "marge_faible"].includes(x.type))).length,
    syntheses,
  };
}

export function joursEntre(a, b) {
  return Math.round((Date.parse(b + "T12:00:00Z") - Date.parse(a + "T12:00:00Z")) / 86400000);
}
