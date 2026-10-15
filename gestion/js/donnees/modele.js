/* ==========================================================================
   Modèle de données — listes de valeurs, définitions des champs, validation
   Les définitions servent à la fois aux formulaires et à la validation des
   imports. Montants : saisis en euros, stockés en centimes (type "montant").
   ========================================================================== */

export const VERSION_SCHEMA = 1;

export const STATUTS_AFFAIRE = [
  ["prospect", "Prospect"], ["a_chiffrer", "À chiffrer"], ["offre_preparation", "Offre en préparation"],
  ["offre_envoyee", "Offre envoyée"], ["attente_decision", "En attente de décision"], ["gagnee", "Gagnée"],
  ["en_preparation", "En préparation"], ["en_cours", "En cours"], ["en_attente", "En attente"],
  ["terminee", "Terminée"], ["cloturee", "Clôturée"], ["perdue", "Perdue"],
];
export const STATUTS_OPERATION = [["a_venir", "À venir"], ["en_cours", "En cours"], ["suspendue", "Suspendue"], ["terminee", "Terminée"]];
export const STATUTS_COMMANDE = [
  ["brouillon", "Brouillon"], ["envoyee", "Envoyée"], ["confirmee", "Confirmée"],
  ["livree", "Livrée"], ["soldee", "Soldée"], ["annulee", "Annulée"],
];
export const STATUTS_FACTURE_F = [["recue", "Reçue, à payer"], ["payee", "Payée"], ["contestee", "Contestée"], ["annulee", "Annulée"]];
export const STATUTS_FACTURE_C = [["brouillon", "Brouillon"], ["emise", "Émise"], ["annulee", "Annulée"]];
export const TYPES_FACTURE_C = [["acompte", "Acompte"], ["situation", "Situation de travaux"], ["honoraires", "Note d'honoraires"], ["solde", "Facture de solde"]];
export const TYPES_CONTACT = [["client", "Client"], ["fournisseur", "Fournisseur"], ["sous_traitant", "Sous-traitant"], ["intervenant", "Intervenant (BET, contrôleur…)"]];
export const STATUTS_RESERVE = [["ouverte", "Ouverte"], ["levee", "Levée"]];
export const TYPES_EVENEMENT = [["reunion", "Réunion"], ["livraison", "Livraison"], ["jalon", "Jalon"], ["visite", "Visite"], ["autre", "Autre"]];
export const TYPES_DOCUMENT = [["devis", "Devis"], ["contrat", "Contrat"], ["bon_commande", "Bon de commande"], ["facture", "Facture"], ["plan", "Plan"], ["compte_rendu", "Compte rendu"], ["photo", "Photo"], ["avenant", "Avenant"], ["reception", "Document de réception"], ["autre", "Autre"]];
export const NATURES_CONTRAT = [["travaux", "Marché de travaux (montant vendu)"], ["honoraires", "Mission d'honoraires"]];
export const TYPES_BATIMENT = [["maison", "Maison individuelle"], ["appartement", "Appartement"], ["immeuble", "Immeuble"], ["local", "Local professionnel"], ["autre", "Autre"]];

export const PARAMETRES_DEFAUT = {
  entreprise: { nom: "Ligne&Bati", siren: "", adresse: "" },
  tva_defaut: 20,
  seuil_marge_pct: 10,
  delai_paiement_jours: 30,
  categories_budget: ["Démolition", "Gros œuvre", "Plomberie", "Électricité", "Menuiseries", "Plâtrerie", "Revêtements", "Peinture", "Études", "Divers"],
  types_operation: ["Préparation", "Démolition", "Gros œuvre", "Second œuvre", "Finitions", "Réception"],
  unites: ["u", "m²", "ml", "m³", "h", "j", "forfait", "kg"],
  responsables: ["Moi"],
};

export const libelle = (liste, cle) => (liste.find((x) => x[0] === cle) || [null, cle || "—"])[1];

/* ---------- Définitions des formulaires ---------------------------------- */
// type : texte, zone, date, montant, nombre, choix, case ; plein = pleine largeur
export const CHAMPS = {
  affaire: [
    { cle: "nom", label: "Nom de l'affaire", type: "texte", requis: true, max: 140, plein: true },
    { cle: "client_id", label: "Client", type: "choix", source: "clients" },
    { cle: "statut", label: "Statut", type: "choix", options: STATUTS_AFFAIRE, requis: true },
    { cle: "nature_contrat", label: "Nature du contrat", type: "choix", options: NATURES_CONTRAT, requis: true },
    { cle: "montant_vendu_ht", label: "Montant vendu / honoraires (HT, €)", type: "montant", min: 0 },
    { cle: "adresse", label: "Adresse du projet", type: "texte", max: 200, plein: true },
    { cle: "commune", label: "Commune", type: "texte", max: 80 },
    { cle: "type_batiment", label: "Type de bâtiment", type: "choix", options: TYPES_BATIMENT },
    { cle: "nature_travaux", label: "Nature des travaux", type: "texte", max: 140 },
    { cle: "responsable", label: "Responsable", type: "texte", max: 80 },
    { cle: "date_debut_prevue", label: "Démarrage prévu", type: "date" },
    { cle: "date_fin_prevue", label: "Fin prévue", type: "date", apres: "date_debut_prevue" },
    { cle: "description", label: "Description", type: "zone", max: 4000, plein: true },
  ],
  operation: [
    { cle: "nom", label: "Nom de l'opération ou phase", type: "texte", requis: true, max: 140, plein: true },
    { cle: "type", label: "Type", type: "choix", source: "types_operation" },
    { cle: "statut", label: "Statut", type: "choix", options: STATUTS_OPERATION, requis: true },
    { cle: "responsable", label: "Responsable", type: "texte", max: 80 },
    { cle: "intervenants", label: "Entreprises intervenantes", type: "texte", max: 200 },
    { cle: "date_debut_prevue", label: "Début prévu", type: "date" },
    { cle: "date_fin_prevue", label: "Fin prévue", type: "date", apres: "date_debut_prevue" },
    { cle: "date_debut_reelle", label: "Début réel", type: "date" },
    { cle: "date_fin_reelle", label: "Fin réelle", type: "date", apres: "date_debut_reelle" },
    { cle: "avancement", label: "Avancement (%)", type: "nombre", min: 0, max: 100 },
    { cle: "blocage", label: "Point de blocage", type: "texte", max: 200, plein: true },
    { cle: "contraintes", label: "Contraintes", type: "zone", max: 2000, plein: true },
  ],
  poste: [
    { cle: "libelle", label: "Poste budgétaire", type: "texte", requis: true, max: 120 },
    { cle: "categorie", label: "Catégorie", type: "choix", source: "categories_budget" },
    { cle: "operation_id", label: "Opération (facultatif)", type: "choix", source: "operations_affaire" },
    { cle: "montant_initial_ht", label: "Budget initial (HT, €)", type: "montant", requis: true, min: 0 },
    { cle: "reste_a_engager_ht", label: "Reste à engager estimé (HT, €)", type: "montant", min: 0, aide: "Laisser vide : calcul automatique (budget révisé − engagé)." },
  ],
  avenant: [
    { cle: "libelle", label: "Objet de l'avenant", type: "texte", requis: true, max: 160, plein: true },
    { cle: "type", label: "Effet", type: "choix", options: [["vente", "Modifie le montant vendu"], ["budget", "Modifie le budget de coûts"]], requis: true },
    { cle: "poste_id", label: "Poste concerné (budget)", type: "choix", source: "postes_affaire" },
    { cle: "montant_ht", label: "Montant (HT, €, négatif possible)", type: "montant", requis: true },
    { cle: "date", label: "Date", type: "date", requis: true },
  ],
  commande: [
    { cle: "numero", label: "Numéro", type: "texte", requis: true, max: 40 },
    { cle: "fournisseur_id", label: "Fournisseur / sous-traitant", type: "choix", source: "fournisseurs", requis: true },
    { cle: "affaire_id", label: "Affaire", type: "choix", source: "affaires", requis: true },
    { cle: "poste_id", label: "Poste budgétaire", type: "choix", source: "postes_affaire" },
    { cle: "statut", label: "Statut", type: "choix", options: STATUTS_COMMANDE, requis: true },
    { cle: "date", label: "Date de commande", type: "date", requis: true },
    { cle: "livraison_prevue", label: "Livraison prévue", type: "date" },
    { cle: "designation", label: "Désignation", type: "texte", requis: true, max: 200, plein: true },
    { cle: "quantite", label: "Quantité", type: "nombre", requis: true, min: 0, pas: "0.01" },
    { cle: "unite", label: "Unité", type: "choix", source: "unites" },
    { cle: "pu_ht", label: "Prix unitaire (HT, €)", type: "montant", requis: true, min: 0 },
  ],
  facture_fournisseur: [
    { cle: "numero", label: "Numéro de facture", type: "texte", requis: true, max: 40 },
    { cle: "fournisseur_id", label: "Fournisseur", type: "choix", source: "fournisseurs", requis: true },
    { cle: "affaire_id", label: "Affaire", type: "choix", source: "affaires" },
    { cle: "poste_id", label: "Poste budgétaire", type: "choix", source: "postes_affaire" },
    { cle: "commande_id", label: "Commande liée", type: "choix", source: "commandes_affaire" },
    { cle: "date", label: "Date de la facture", type: "date", requis: true },
    { cle: "echeance", label: "Échéance", type: "date" },
    { cle: "montant_ht", label: "Montant HT (€)", type: "montant", requis: true, min: 0 },
    { cle: "taux_tva", label: "TVA (%)", type: "nombre", min: 0, max: 30, pas: "0.1" },
    { cle: "statut", label: "Statut", type: "choix", options: STATUTS_FACTURE_F, requis: true },
  ],
  facture_client: [
    { cle: "numero", label: "Numéro", type: "texte", requis: true, max: 40 },
    { cle: "type", label: "Type", type: "choix", options: TYPES_FACTURE_C, requis: true },
    { cle: "date", label: "Date d'émission", type: "date", requis: true },
    { cle: "echeance", label: "Échéance", type: "date", requis: true, apres: "date" },
    { cle: "montant_ht", label: "Montant HT (€)", type: "montant", requis: true, min: 0 },
    { cle: "taux_tva", label: "TVA (%)", type: "nombre", requis: true, min: 0, max: 30, pas: "0.1" },
    { cle: "statut", label: "Statut", type: "choix", options: STATUTS_FACTURE_C, requis: true },
  ],
  paiement: [
    { cle: "date", label: "Date d'encaissement", type: "date", requis: true },
    { cle: "montant_ttc", label: "Montant encaissé (TTC, €)", type: "montant", requis: true, min: 0.01 },
    { cle: "mode", label: "Mode", type: "choix", options: [["virement", "Virement"], ["cheque", "Chèque"], ["autre", "Autre"]] },
  ],
  contact: [
    { cle: "nom", label: "Nom ou raison sociale", type: "texte", requis: true, max: 140, plein: true },
    { cle: "type", label: "Type", type: "choix", options: TYPES_CONTACT, requis: true },
    { cle: "specialite", label: "Spécialité / corps d'état", type: "texte", max: 80 },
    { cle: "email", label: "E-mail professionnel", type: "texte", max: 160 },
    { cle: "telephone", label: "Téléphone professionnel", type: "texte", max: 30 },
    { cle: "commune", label: "Commune", type: "texte", max: 80 },
    { cle: "siret", label: "SIRET (entreprises)", type: "texte", max: 20 },
    { cle: "notes", label: "Notes utiles à la gestion", type: "zone", max: 2000, plein: true },
  ],
  evenement: [
    { cle: "titre", label: "Titre", type: "texte", requis: true, max: 140, plein: true },
    { cle: "type", label: "Type", type: "choix", options: TYPES_EVENEMENT, requis: true },
    { cle: "date", label: "Date", type: "date", requis: true },
    { cle: "affaire_id", label: "Affaire", type: "choix", source: "affaires" },
    { cle: "compte_rendu", label: "Compte rendu (réunions)", type: "zone", max: 8000, plein: true },
  ],
  reserve: [
    { cle: "libelle", label: "Réserve constatée", type: "texte", requis: true, max: 200, plein: true },
    { cle: "localisation", label: "Localisation", type: "texte", max: 100 },
    { cle: "entreprise_id", label: "Entreprise concernée", type: "choix", source: "fournisseurs" },
    { cle: "date_constat", label: "Date de constat", type: "date", requis: true },
    { cle: "date_limite", label: "Levée attendue avant le", type: "date", apres: "date_constat" },
    { cle: "statut", label: "Statut", type: "choix", options: STATUTS_RESERVE, requis: true },
    { cle: "date_levee", label: "Date de levée", type: "date", apres: "date_constat" },
  ],
  tache: [
    { cle: "libelle", label: "Tâche", type: "texte", requis: true, max: 200, plein: true },
    { cle: "affaire_id", label: "Affaire", type: "choix", source: "affaires" },
    { cle: "operation_id", label: "Opération (facultatif)", type: "choix", source: "operations_affaire" },
    { cle: "echeance", label: "Échéance", type: "date" },
  ],
  document: [
    { cle: "nom", label: "Nom du document", type: "texte", requis: true, max: 160, plein: true },
    { cle: "type", label: "Type", type: "choix", options: TYPES_DOCUMENT, requis: true },
    { cle: "affaire_id", label: "Affaire", type: "choix", source: "affaires", requis: true },
    { cle: "date", label: "Date", type: "date" },
    { cle: "emplacement", label: "Emplacement (dossier ou lien)", type: "texte", max: 300, plein: true, aide: "Le prototype référence les documents sans les stocker." },
  ],
};

/* ---------- Validation ------------------------------------------------- */
/** Convertit et valide les valeurs saisies. Renvoie { valeurs, erreurs }. */
export function valider(type, brut) {
  const erreurs = [];
  const valeurs = {};
  (CHAMPS[type] || []).forEach((c) => {
    let v = brut[c.cle];
    if (typeof v === "string") v = v.trim();
    const vide = v === "" || v === null || v === undefined;
    if (vide) {
      if (c.requis) erreurs.push(`« ${c.label} » est obligatoire.`);
      valeurs[c.cle] = c.type === "case" ? false : null;
      return;
    }
    if (c.type === "montant") {
      const n = Number(String(v).replace(/\s/g, "").replace(",", "."));
      if (!Number.isFinite(n)) { erreurs.push(`« ${c.label} » doit être un montant.`); return; }
      if (c.min !== undefined && n < c.min) { erreurs.push(`« ${c.label} » doit être supérieur ou égal à ${c.min}.`); return; }
      valeurs[c.cle] = Math.round(n * 100);
    } else if (c.type === "nombre") {
      const n = Number(String(v).replace(",", "."));
      if (!Number.isFinite(n)) { erreurs.push(`« ${c.label} » doit être un nombre.`); return; }
      if (c.min !== undefined && n < c.min) { erreurs.push(`« ${c.label} » doit être ≥ ${c.min}.`); return; }
      if (c.max !== undefined && n > c.max) { erreurs.push(`« ${c.label} » doit être ≤ ${c.max}.`); return; }
      valeurs[c.cle] = n;
    } else if (c.type === "date") {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) { erreurs.push(`« ${c.label} » : date invalide.`); return; }
      valeurs[c.cle] = v;
    } else {
      if (c.max && String(v).length > c.max) { erreurs.push(`« ${c.label} » : ${c.max} caractères maximum.`); return; }
      valeurs[c.cle] = v;
    }
  });
  (CHAMPS[type] || []).filter((c) => c.apres).forEach((c) => {
    if (valeurs[c.cle] && valeurs[c.apres] && valeurs[c.cle] < valeurs[c.apres]) {
      erreurs.push(`« ${c.label} » ne peut pas précéder « ${(CHAMPS[type].find((x) => x.cle === c.apres) || {}).label} ».`);
    }
  });
  if (type === "contact" && valeurs.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(valeurs.email)) erreurs.push("Adresse e-mail invalide.");
  return { valeurs, erreurs };
}

/** Structure vide d'une base. */
export function baseVide() {
  return {
    version: VERSION_SCHEMA,
    meta: { demo: false, cree_le: new Date().toISOString() },
    parametres: structuredClone(PARAMETRES_DEFAUT),
    contacts: [], affaires: [], operations: [], taches: [], postes: [], avenants: [],
    commandes: [], factures_fournisseurs: [], factures_clients: [], paiements: [],
    evenements: [], documents: [], reserves: [], historique: [],
  };
}

export const COLLECTIONS = ["contacts", "affaires", "operations", "taches", "postes", "avenants", "commandes", "factures_fournisseurs", "factures_clients", "paiements", "evenements", "documents", "reserves", "historique"];
