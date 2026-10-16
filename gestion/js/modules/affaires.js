/* Module 2 — Affaires : liste, filtres, fiche détaillée, saisies financières */
import { el, eur, date, puce, tableau, onglets, toast, barre, nombreCsv } from "../ui/outils.js";
import { ouvrirFormulaire, confirmer } from "../ui/formulaire.js";
import { syntheseAffaire, montantCommande, estEngagee } from "../calculs/finances.js";
import { avancementAffaire } from "../calculs/planning.js";
import { STATUTS_AFFAIRE, STATUTS_COMMANDE, STATUTS_FACTURE_F, STATUTS_FACTURE_C, TYPES_FACTURE_C, TYPES_BATIMENT, NATURES_CONTRAT, TYPES_DOCUMENT, libelle } from "../donnees/modele.js";
import { blocFinancier, listeAlertes, boutonExport, nomContact, tableHistorique } from "./commun.js";

const TON = { prospect: "", a_chiffrer: "", offre_preparation: "info", offre_envoyee: "info", attente_decision: "attention", gagnee: "ok", en_preparation: "ok", en_cours: "ok", en_attente: "attention", terminee: "", cloturee: "", perdue: "alerte" };
const filtres = { q: "", statut: "", archives: false };

export default {
  titre: "Affaires",
  rendre(ctx, route) {
    if (route.id) return fiche(ctx, route.id, route.params.onglet || "synthese");
    liste(ctx, route.params);
  },
};

/* ---------- Liste ---------------------------------------------------------- */
function liste(ctx, params) {
  const d = ctx.D();
  ctx.titre("Affaires");
  const colonnesCsv = [
    { titre: "Référence", valeur: (a) => a.reference }, { titre: "Nom", valeur: (a) => a.nom },
    { titre: "Client", valeur: (a) => nomContact(d, a.client_id) }, { titre: "Statut", valeur: (a) => libelle(STATUTS_AFFAIRE, a.statut) },
    { titre: "Commune", valeur: (a) => a.commune || "" }, { titre: "Début prévu", valeur: (a) => a.date_debut_prevue || "" },
    { titre: "Fin prévue", valeur: (a) => a.date_fin_prevue || "" }, { titre: "Vendu HT", valeur: (a) => nombreCsv(syntheseAffaire(d, a.id, ctx.AUJ).vendu_revise) },
    { titre: "Archivée", valeur: (a) => (a.archive ? "oui" : "non") },
  ];
  ctx.outils(
    boutonExport("Exporter (CSV)", "affaires.csv", colonnesCsv, () => d.affaires),
    el("button", { type: "button", class: "bouton", onclick: () => creer(ctx) }, "+ Nouvelle affaire"),
  );

  const q = el("input", { type: "search", id: "flt-q", value: filtres.q, placeholder: "Référence, nom, commune, client…" });
  const st = el("select", { id: "flt-statut" }, [el("option", { value: "", text: "Tous les statuts" }), ...STATUTS_AFFAIRE.map(([k, l]) => el("option", { value: k, text: l, selected: filtres.statut === k }))]);
  const ar = el("input", { type: "checkbox", id: "flt-archives", checked: filtres.archives });
  const zone = el("div");
  const maj = () => {
    filtres.q = q.value; filtres.statut = st.value; filtres.archives = ar.checked;
    const n = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    const lignes = d.affaires
      .filter((a) => (filtres.archives ? true : !a.archive))
      .filter((a) => !filtres.statut || a.statut === filtres.statut)
      .filter((a) => !filtres.q || [a.reference, a.nom, a.commune, nomContact(d, a.client_id)].some((x) => n(x).includes(n(filtres.q))))
      .sort((a, b) => (b.reference || "").localeCompare(a.reference || ""));
    zone.replaceChildren(tableau([
      { titre: "Affaire", valeur: (a) => `${a.reference} · ${a.nom}` },
      { titre: "Client", valeur: (a) => nomContact(d, a.client_id) },
      { titre: "Statut", valeur: (a) => el("span", {}, [puce(libelle(STATUTS_AFFAIRE, a.statut), TON[a.statut]), a.archive ? puce("archivée") : null, a.demo ? puce("démo", "demo") : null]) },
      { titre: "Commune", valeur: (a) => a.commune || "—" },
      { titre: "Fin prévue", valeur: (a) => date(a.date_fin_prevue) },
      { titre: "Vendu", num: true, valeur: (a) => eur(syntheseAffaire(d, a.id, ctx.AUJ).vendu_revise) },
      { titre: "Marge à term.", num: true, valeur: (a) => { const s = syntheseAffaire(d, a.id, ctx.AUJ); return el("span", { class: s.marge_term < 0 ? "neg" : "" , text: eur(s.marge_term) }); } },
    ], lignes, { onClic: (a) => ctx.naviguer(`#/m/affaires/${a.id}`), lien: (a) => `#/m/affaires/${a.id}`, vide: "Aucune affaire ne correspond aux filtres.", label: "Liste des affaires" }));
  };
  [q, st, ar].forEach((c) => c.addEventListener("input", maj));
  ctx.corps.append(el("div", { class: "filtres" }, [
    el("label", { class: "champ champ--large", for: "flt-q" }, ["Rechercher", q]),
    el("label", { class: "champ", for: "flt-statut" }, ["Statut", st]),
    el("label", { class: "case", for: "flt-archives" }, [ar, "Afficher les archives"]),
  ]), zone);
  maj();
  if (params && params.nouveau) creer(ctx);
}

async function creer(ctx, base = {}) {
  const v = await ouvrirFormulaire({ titre: "Nouvelle affaire", type: "affaire", valeurs: { statut: "prospect", nature_contrat: "travaux", responsable: "Moi", ...base } });
  if (!v) return;
  const a = ctx.store.ajouter("affaires", { ...v, reference: ctx.store.prochaineReference("AFF", "affaires"), archive: false });
  toast(`Affaire ${a.reference} créée.`);
  ctx.naviguer(`#/m/affaires/${a.id}`);
}

/* ---------- Fiche ---------------------------------------------------------- */
function fiche(ctx, id, onglet) {
  const d = ctx.D();
  const a = d.affaires.find((x) => x.id === id);
  if (!a) { ctx.titre("Affaire introuvable"); ctx.corps.append(el("p", { class: "vide", text: "Cette affaire n'existe pas ou a été supprimée." })); return; }
  const s = syntheseAffaire(d, id, ctx.AUJ, d.parametres);
  ctx.titre(`${a.reference} · ${a.nom}`);
  ctx.fil([["Carte", "#/"], ["Affaires", "#/m/affaires"], [a.reference, null]]);
  ctx.outils(
    a.archive ? null : el("button", { type: "button", class: "bouton bouton--clair", onclick: () => ctx.naviguer(`#/m/chantiers/${a.id}`) }, "Suivi de chantier"),
    el("button", { type: "button", class: "bouton bouton--clair", onclick: () => modifier(ctx, a) }, "Modifier"),
    el("button", { type: "button", class: "bouton bouton--clair", onclick: () => dupliquer(ctx, a) }, "Dupliquer"),
    el("button", { type: "button", class: "bouton bouton--clair", onclick: () => archiver(ctx, a) }, a.archive ? "Désarchiver" : "Archiver"),
  );

  const changer = (o) => ctx.naviguer(`#/m/affaires/${id}?onglet=${o}`);
  const nb = (coll) => d[coll].filter((x) => x.affaire_id === id).length;
  ctx.corps.append(onglets([
    ["synthese", "Synthèse"], ["budget", "Budget et avenants"], ["achats", "Commandes et dépenses", nb("commandes") + nb("factures_fournisseurs")],
    ["facturation", "Facturation", nb("factures_clients")], ["documents", "Documents", nb("documents")], ["historique", "Historique"],
  ], onglet, changer));

  const vues = { synthese, budget, achats, facturation, documents, historique };
  (vues[onglet] || synthese)(ctx, a, s);
}

function synthese(ctx, a, s) {
  const d = ctx.D();
  const ops = d.operations.filter((o) => o.affaire_id === a.id);
  ctx.corps.append(
    a.demo ? el("p", { class: "note", text: "Affaire de démonstration (données fictives)." }) : null,
    el("section", { class: "panneau" }, [
      el("h2", { class: "panneau__titre" }, ["Informations générales", puce(libelle(STATUTS_AFFAIRE, a.statut), TON[a.statut])]),
      el("dl", { class: "fiche-infos" }, [
        ...[
          ["Référence", a.reference], ["Client", nomContact(d, a.client_id)], ["Nature du contrat", libelle(NATURES_CONTRAT, a.nature_contrat)],
          ["Adresse du projet", [a.adresse, a.commune].filter(Boolean).join(", ") || "—"], ["Type de bâtiment", libelle(TYPES_BATIMENT, a.type_batiment)],
          ["Nature des travaux", a.nature_travaux || "—"], ["Responsable", a.responsable || "—"], ["Créée le", date((a.cree_le || "").slice(0, 10))],
          ["Démarrage prévu", date(a.date_debut_prevue)], ["Fin prévue", date(a.date_fin_prevue)], ["Avancement des opérations", avancementAffaire(ops) + " %"],
        ].flatMap(([k, v]) => [el("dt", { text: k }), el("dd", { text: v || "—" })]),
      ]),
      a.description ? el("p", { style: null, class: "note", text: a.description }) : null,
    ]),
    el("section", { class: "panneau" }, [el("h2", { class: "panneau__titre" }, ["Situation financière", el("small", { text: "montants HT sauf mention TTC" })]), blocFinancier(s, a.nature_contrat)]),
    el("section", { class: "panneau" }, [el("h2", { class: "panneau__titre", text: "Alertes de l'affaire" }), listeAlertes(s.alertes, ctx)]),
  );
}

/* ---------- Budget et avenants ------------------------------------------- */
function budget(ctx, a, s) {
  const d = ctx.D();
  ctx.corps.append(el("section", { class: "panneau" }, [
    el("h2", { class: "panneau__titre" }, ["Postes budgétaires", el("span", {}, [
      el("button", { type: "button", class: "bouton bouton--petit", onclick: () => ajouterPoste(ctx, a) }, "+ Poste"), " ",
      el("button", { type: "button", class: "bouton bouton--clair bouton--petit", onclick: () => ajouterAvenant(ctx, a) }, "+ Avenant"),
    ])]),
    tableau([
      { titre: "Poste", valeur: (l) => l.libelle },
      { titre: "Budget initial", num: true, valeur: (l) => eur(l.budget_initial) },
      { titre: "Avenants", num: true, valeur: (l) => eur(l.avenants_budget) },
      { titre: "Budget révisé", num: true, valeur: (l) => eur(l.budget_revise) },
      { titre: "Engagé", num: true, valeur: (l) => el("span", { class: l.engage > l.budget_revise ? "neg" : "", text: eur(l.engage) }) },
      { titre: "Réalisé", num: true, valeur: (l) => el("span", { class: l.realise > l.budget_revise ? "neg" : "", text: eur(l.realise) }) },
      { titre: "Reste à engager", num: true, valeur: (l) => eur(l.reste_a_engager) + (l.reste_saisi ? " ✎" : "") },
      { titre: "Coût à terminaison", num: true, valeur: (l) => eur(l.cat) },
      { titre: "Écart", num: true, valeur: (l) => el("span", { class: l.ecart < 0 ? "neg" : "pos", text: eur(l.ecart) }) },
      { titre: "", valeur: (l) => l.poste_id ? el("button", { type: "button", class: "bouton bouton--clair bouton--petit", onclick: () => modifierPoste(ctx, a, l.poste_id) }, "Modifier") : "" },
    ], s.postes, { vide: "Aucun poste budgétaire. Ajoutez les postes de coûts de l'affaire.", label: "Postes budgétaires",
      pied: ["Total", eur(s.budget_initial), eur(s.avenants_budget), eur(s.budget_revise), eur(s.engage), eur(s.realise), eur(s.reste_a_engager), eur(s.cat), eur(s.ecart_budget), ""] }),
    el("p", { class: "note", text: "✎ : reste à engager saisi manuellement. Sinon, il est estimé à budget révisé − engagé (jamais négatif). Engagé = commandes validées, ou factures si elles les dépassent, + factures sans commande." }),
  ]));
  const av = d.avenants.filter((x) => x.affaire_id === a.id);
  ctx.corps.append(el("section", { class: "panneau" }, [
    el("h2", { class: "panneau__titre", text: "Avenants" }),
    tableau([
      { titre: "Date", valeur: (x) => date(x.date) }, { titre: "Objet", valeur: (x) => x.libelle, texte: true },
      { titre: "Effet", valeur: (x) => (x.type === "vente" ? "Montant vendu" : "Budget de coûts") },
      { titre: "Poste", valeur: (x) => (d.postes.find((p) => p.id === x.poste_id) || {}).libelle || "—" },
      { titre: "Montant", num: true, valeur: (x) => eur(x.montant_ht) },
      { titre: "", valeur: (x) => el("button", { type: "button", class: "bouton bouton--clair bouton--petit", onclick: async () => { if (await confirmer("Supprimer cet avenant ?")) ctx.store.supprimer("avenants", x.id); } }, "Supprimer") },
    ], av, { vide: "Aucun avenant.", label: "Avenants" }),
  ]));
}
async function ajouterPoste(ctx, a) {
  const v = await ouvrirFormulaire({ titre: "Nouveau poste budgétaire", type: "poste", valeurs: { affaire_id: a.id }, contexte: { affaire_id: a.id } });
  if (v) { ctx.store.ajouter("postes", { ...v, affaire_id: a.id }); toast("Poste ajouté."); }
}
async function modifierPoste(ctx, a, pid) {
  const p = ctx.D().postes.find((x) => x.id === pid);
  const v = await ouvrirFormulaire({ titre: "Modifier le poste", type: "poste", valeurs: p, contexte: { affaire_id: a.id } });
  if (v) { ctx.store.modifier("postes", pid, v); toast("Poste mis à jour."); }
}
async function ajouterAvenant(ctx, a) {
  const v = await ouvrirFormulaire({ titre: "Nouvel avenant", type: "avenant", valeurs: { type: "vente", date: ctx.AUJ }, contexte: { affaire_id: a.id } });
  if (!v) return;
  if (v.type === "vente") v.poste_id = null;
  ctx.store.ajouter("avenants", { ...v, affaire_id: a.id });
  toast("Avenant enregistré.");
}

/* ---------- Commandes et dépenses ------------------------------------------ */
function achats(ctx, a) {
  const d = ctx.D();
  const cmds = d.commandes.filter((c) => c.affaire_id === a.id);
  const ff = d.factures_fournisseurs.filter((f) => f.affaire_id === a.id);
  ctx.corps.append(
    el("section", { class: "panneau" }, [
      el("h2", { class: "panneau__titre" }, ["Commandes", el("button", { type: "button", class: "bouton bouton--petit", onclick: () => ctx.naviguer(`#/m/entrepot?nouvelle=${a.id}`) }, "+ Commande")]),
      tableau([
        { titre: "Numéro", valeur: (c) => c.numero }, { titre: "Fournisseur", valeur: (c) => nomContact(d, c.fournisseur_id) },
        { titre: "Poste", valeur: (c) => (d.postes.find((p) => p.id === c.poste_id) || {}).libelle || "Non ventilé" },
        { titre: "Statut", valeur: (c) => puce(libelle(STATUTS_COMMANDE, c.statut), estEngagee(c) ? "ok" : "") },
        { titre: "Montant", num: true, valeur: (c) => eur(montantCommande(c)) },
        { titre: "Facturé", num: true, valeur: (c) => eur(d.factures_fournisseurs.filter((f) => f.commande_id === c.id).reduce((s, f) => s + f.montant_ht, 0)) },
      ], cmds, { vide: "Aucune commande.", onClic: (c) => ctx.naviguer(`#/m/entrepot?commande=${c.id}`), label: "Commandes" }),
    ]),
    el("section", { class: "panneau" }, [
      el("h2", { class: "panneau__titre" }, ["Factures fournisseurs (dépenses)", el("button", { type: "button", class: "bouton bouton--petit", onclick: () => saisirFactureFournisseur(ctx, { affaire_id: a.id }) }, "+ Facture reçue")]),
      tableauFacturesFournisseurs(ctx, ff),
    ]),
  );
}
export function tableauFacturesFournisseurs(ctx, ff) {
  const d = ctx.D();
  return tableau([
    { titre: "Numéro", valeur: (f) => f.numero }, { titre: "Fournisseur", valeur: (f) => nomContact(d, f.fournisseur_id) },
    { titre: "Date", valeur: (f) => date(f.date) },
    { titre: "Poste", valeur: (f) => (d.postes.find((p) => p.id === f.poste_id) || {}).libelle || puce("non ventilée", "attention") },
    { titre: "Commande", valeur: (f) => (d.commandes.find((c) => c.id === f.commande_id) || {}).numero || "—" },
    { titre: "Montant", num: true, valeur: (f) => eur(f.montant_ht) },
    { titre: "Statut", valeur: (f) => puce(libelle(STATUTS_FACTURE_F, f.statut), f.statut === "payee" ? "ok" : f.statut === "contestee" ? "alerte" : "attention") },
    { titre: "", valeur: (f) => el("button", { type: "button", class: "bouton bouton--clair bouton--petit", onclick: () => saisirFactureFournisseur(ctx, f, f.id) }, "Modifier") },
  ], ff, { vide: "Aucune facture fournisseur.", label: "Factures fournisseurs" });
}
export async function saisirFactureFournisseur(ctx, valeurs, id) {
  const v = await ouvrirFormulaire({ titre: id ? "Modifier la facture fournisseur" : "Facture fournisseur reçue", type: "facture_fournisseur", valeurs: { taux_tva: ctx.D().parametres.tva_defaut, statut: "recue", date: ctx.AUJ, ...valeurs } });
  if (!v) return;
  // cohérence : une facture liée à une commande prend l'affaire et le poste de la commande
  if (v.commande_id) {
    const c = ctx.D().commandes.find((x) => x.id === v.commande_id);
    if (c) { v.affaire_id = c.affaire_id; v.poste_id = c.poste_id || null; }
  }
  if (id) ctx.store.modifier("factures_fournisseurs", id, v); else ctx.store.ajouter("factures_fournisseurs", v);
  toast(id ? "Facture mise à jour." : "Facture enregistrée.");
}

/* ---------- Facturation client ---------------------------------------------- */
function facturation(ctx, a, s) {
  const d = ctx.D();
  ctx.corps.append(el("section", { class: "panneau" }, [
    el("h2", { class: "panneau__titre" }, ["Factures émises et encaissements", el("button", { type: "button", class: "bouton bouton--petit", onclick: () => saisirFactureClient(ctx, a) }, "+ Facture")]),
    tableau([
      { titre: "Numéro", valeur: (f) => f.numero }, { titre: "Type", valeur: (f) => libelle(TYPES_FACTURE_C, f.type) },
      { titre: "Émise le", valeur: (f) => date(f.date) },
      { titre: "Échéance", valeur: (f) => el("span", {}, [date(f.echeance), " ", f.echue ? puce("échue", "alerte") : null]) },
      { titre: "HT", num: true, valeur: (f) => eur(f.montant_ht) }, { titre: "TTC", num: true, valeur: (f) => eur(f.montant_ttc, "TTC") },
      { titre: "Encaissé", num: true, valeur: (f) => eur(f.encaisse, "TTC") },
      { titre: "Solde", num: true, valeur: (f) => el("span", { class: f.solde > 0 && f.echue ? "neg" : "", text: eur(f.solde, "TTC") }) },
      { titre: "", valeur: (f) => el("span", {}, [
        f.solde > 0 ? el("button", { type: "button", class: "bouton bouton--petit", onclick: () => encaisser(ctx, f) }, "Encaisser") : puce("soldée", "ok"), " ",
        el("button", { type: "button", class: "bouton bouton--clair bouton--petit", onclick: () => saisirFactureClient(ctx, a, f) }, "Modifier"),
      ]) },
    ], s.factures, { vide: "Aucune facture émise.", label: "Factures clients",
      pied: ["Total", "", "", "", eur(s.facture_ht), eur(s.facture_ttc, "TTC"), eur(s.encaisse_ttc, "TTC"), eur(s.reste_du_ttc, "TTC"), ""] }),
    el("p", { class: "note", text: "Le prototype suit les factures et leurs règlements. Les factures officielles doivent être émises par un logiciel de facturation conforme (facturation électronique)." }),
  ]));
  const paiements = d.paiements.filter((p) => s.factures.some((f) => f.id === p.facture_client_id));
  ctx.corps.append(el("section", { class: "panneau" }, [el("h2", { class: "panneau__titre", text: "Règlements reçus" }),
    tableau([
      { titre: "Date", valeur: (p) => date(p.date) }, { titre: "Facture", valeur: (p) => (s.factures.find((f) => f.id === p.facture_client_id) || {}).numero },
      { titre: "Mode", valeur: (p) => p.mode || "—" }, { titre: "Montant", num: true, valeur: (p) => eur(p.montant_ttc, "TTC") },
      { titre: "", valeur: (p) => el("button", { type: "button", class: "bouton bouton--clair bouton--petit", onclick: async () => { if (await confirmer("Supprimer ce règlement ?")) ctx.store.supprimer("paiements", p.id); } }, "Supprimer") },
    ], paiements, { vide: "Aucun règlement reçu.", label: "Règlements" })]));
}
async function saisirFactureClient(ctx, a, f) {
  const P = ctx.D().parametres;
  const ech = new Date(ctx.AUJ + "T12:00:00"); ech.setDate(ech.getDate() + (P.delai_paiement_jours || 30));
  const v = await ouvrirFormulaire({ titre: f ? "Modifier la facture" : "Nouvelle facture client", type: "facture_client",
    valeurs: f || { numero: ctx.store.prochaineReference("FA", "factures_clients", "numero"), type: a.nature_contrat === "honoraires" ? "honoraires" : "situation", date: ctx.AUJ, echeance: ech.toISOString().slice(0, 10), taux_tva: P.tva_defaut, statut: "emise" } });
  if (!v) return;
  if (f) ctx.store.modifier("factures_clients", f.id, v); else ctx.store.ajouter("factures_clients", { ...v, affaire_id: a.id });
  toast("Facture enregistrée.");
}
async function encaisser(ctx, f) {
  const v = await ouvrirFormulaire({ titre: `Encaissement — ${f.numero}`, type: "paiement", valeurs: { date: ctx.AUJ, montant_ttc: f.solde, mode: "virement" } });
  if (!v) return;
  if (v.montant_ttc > f.solde) { toast("Montant supérieur au solde : vérifiez la saisie."); return; }
  ctx.store.ajouter("paiements", { ...v, facture_client_id: f.id });
  toast("Encaissement enregistré.");
}

/* ---------- Documents et historique ------------------------------------------ */
function documents(ctx, a) {
  const d = ctx.D();
  ctx.corps.append(el("section", { class: "panneau" }, [
    el("h2", { class: "panneau__titre" }, ["Documents de l'affaire", el("button", { type: "button", class: "bouton bouton--petit", onclick: async () => {
      const v = await ouvrirFormulaire({ titre: "Référencer un document", type: "document", valeurs: { affaire_id: a.id, date: ctx.AUJ, type: "autre" } });
      if (v) { ctx.store.ajouter("documents", v); toast("Document référencé."); }
    } }, "+ Document")]),
    tableau([
      { titre: "Document", valeur: (x) => x.nom }, { titre: "Type", valeur: (x) => libelle(TYPES_DOCUMENT, x.type) },
      { titre: "Date", valeur: (x) => date(x.date) }, { titre: "Emplacement", valeur: (x) => x.emplacement || "—", texte: true },
    ], d.documents.filter((x) => x.affaire_id === a.id), { vide: "Aucun document référencé.", label: "Documents" }),
    el("p", { class: "note note--phase2", text: "Prototype : les documents sont référencés (nom, type, emplacement) mais pas encore stockés. Le dépôt de fichiers est prévu avec la version hébergée." }),
  ]));
}
function historique(ctx, a) {
  const d = ctx.D();
  const ids = new Set([a.id, ...["postes", "avenants", "commandes", "factures_fournisseurs", "factures_clients", "operations", "documents", "reserves"].flatMap((c) => d[c].filter((x) => x.affaire_id === a.id).map((x) => x.id))]);
  ctx.corps.append(el("section", { class: "panneau" }, [el("h2", { class: "panneau__titre" }, ["Historique des modifications", el("small", { text: "montants, dates et statuts journalisés" })]), tableHistorique(d, (h) => ids.has(h.entite_id))]));
}

/* ---------- Actions ---------------------------------------------------------- */
async function modifier(ctx, a) {
  const v = await ouvrirFormulaire({ titre: "Modifier l'affaire", type: "affaire", valeurs: a });
  if (v) { ctx.store.modifier("affaires", a.id, v); toast("Affaire mise à jour."); }
}
async function dupliquer(ctx, a) {
  if (!(await confirmer(`Dupliquer « ${a.nom} » ? Les informations générales et les postes budgétaires sont copiés ; commandes, factures et opérations ne le sont pas.`))) return;
  const { id, reference, cree_le, modifie_le, demo, ...reste } = a;
  const n = ctx.store.ajouter("affaires", { ...reste, nom: a.nom + " (copie)", statut: "prospect", reference: ctx.store.prochaineReference("AFF", "affaires"), archive: false });
  ctx.D().postes.filter((p) => p.affaire_id === a.id).forEach((p) => { const { id: _i, demo: _d, ...pr } = p; ctx.store.ajouter("postes", { ...pr, affaire_id: n.id, reste_a_engager_ht: null }); });
  toast(`Affaire dupliquée : ${n.reference}.`);
  ctx.naviguer(`#/m/affaires/${n.id}`);
}
async function archiver(ctx, a) {
  if (!a.archive && !(await confirmer(`Archiver « ${a.nom} » ? Elle n'apparaîtra plus dans les listes ni sur la carte, mais reste consultable.`))) return;
  ctx.store.modifier("affaires", a.id, { archive: !a.archive });
  toast(a.archive ? "Affaire désarchivée." : "Affaire archivée.");
}
