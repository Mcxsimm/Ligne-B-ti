/* Module 4 — Finances : synthèse par affaire, dépenses, formules */
import { el, eur, pct, tableau, onglets, nombreCsv } from "../ui/outils.js";
import { syntheseAffaire, STATUTS_AFFAIRE_ACTIFS } from "../calculs/finances.js";
import { boutonExport, listeAlertes } from "./commun.js";
import { tableauFacturesFournisseurs, saisirFactureFournisseur } from "./affaires.js";
import { alertesGlobales } from "../calculs/finances.js";

export default {
  titre: "Finances",
  rendre(ctx, route) {
    const onglet = route.params.onglet || "synthese";
    ctx.titre("Finances : budgets, coûts, facturation et marges");
    ctx.corps.append(onglets([["synthese", "Synthèse par affaire"], ["depenses", "Dépenses fournisseurs"], ["formules", "Formules de calcul"]], onglet, (o) => ctx.naviguer(`#/m/finances?onglet=${o}`)));
    ({ synthese, depenses, formules }[onglet] || synthese)(ctx, route.params);
  },
};

function synthese(ctx, params) {
  const d = ctx.D();
  const tout = params.tout === "1";
  const affaires = d.affaires.filter((a) => !a.archive && (tout || STATUTS_AFFAIRE_ACTIFS.includes(a.statut)));
  const S = affaires.map((a) => ({ a, s: syntheseAffaire(d, a.id, ctx.AUJ, d.parametres) }));
  const T = (k) => S.reduce((x, y) => x + y.s[k], 0);
  const cols = [
    { titre: "Affaire", valeur: (r) => `${r.a.reference} · ${r.a.nom}`, csv: (r) => `${r.a.reference} ${r.a.nom}` },
    { titre: "Vendu HT", num: true, valeur: (r) => eur(r.s.vendu_revise), csv: (r) => nombreCsv(r.s.vendu_revise) },
    { titre: "Budget initial HT", num: true, valeur: (r) => eur(r.s.budget_initial), csv: (r) => nombreCsv(r.s.budget_initial) },
    { titre: "Budget révisé HT", num: true, valeur: (r) => eur(r.s.budget_revise), csv: (r) => nombreCsv(r.s.budget_revise) },
    { titre: "Engagé HT", num: true, valeur: (r) => eur(r.s.engage), csv: (r) => nombreCsv(r.s.engage) },
    { titre: "Réalisé HT", num: true, valeur: (r) => eur(r.s.realise), csv: (r) => nombreCsv(r.s.realise) },
    { titre: "Reste à engager HT", num: true, valeur: (r) => eur(r.s.reste_a_engager), csv: (r) => nombreCsv(r.s.reste_a_engager) },
    { titre: "Coût à terminaison HT", num: true, valeur: (r) => el("span", { class: r.s.cat > r.s.budget_revise ? "neg" : "", text: eur(r.s.cat) }), csv: (r) => nombreCsv(r.s.cat) },
    { titre: "Facturé HT", num: true, valeur: (r) => eur(r.s.facture_ht), csv: (r) => nombreCsv(r.s.facture_ht) },
    { titre: "Encaissé TTC", num: true, valeur: (r) => eur(r.s.encaisse_ttc, "TTC"), csv: (r) => nombreCsv(r.s.encaisse_ttc) },
    { titre: "Marge prév. HT", num: true, valeur: (r) => eur(r.s.marge_prev), csv: (r) => nombreCsv(r.s.marge_prev) },
    { titre: "Marge à term. HT", num: true, valeur: (r) => el("span", { class: r.s.marge_term < 0 ? "neg" : r.s.marge_term < r.s.marge_prev ? "neg" : "pos", text: `${eur(r.s.marge_term)} (${pct(r.s.marge_term_pct)})` }), csv: (r) => nombreCsv(r.s.marge_term) },
    { titre: "Alertes", num: true, valeur: (r) => String(r.s.alertes.filter((x) => x.niveau === "alerte").length) },
  ];
  ctx.outils(
    el("label", { class: "case" }, [(() => { const c = el("input", { type: "checkbox", checked: tout }); c.addEventListener("change", () => ctx.naviguer(`#/m/finances?tout=${c.checked ? 1 : 0}`)); return c; })(), "Inclure les affaires non actives"]),
    boutonExport("Exporter les indicateurs (CSV)", "indicateurs-gestion.csv", cols, () => S),
    boutonExport("Exporter les budgets (CSV)", "budgets.csv", [
      { titre: "Affaire", valeur: (l) => l.ref }, { titre: "Poste", valeur: (l) => l.libelle },
      { titre: "Budget initial HT", valeur: (l) => nombreCsv(l.budget_initial) }, { titre: "Avenants HT", valeur: (l) => nombreCsv(l.avenants_budget) },
      { titre: "Budget révisé HT", valeur: (l) => nombreCsv(l.budget_revise) }, { titre: "Engagé HT", valeur: (l) => nombreCsv(l.engage) },
      { titre: "Réalisé HT", valeur: (l) => nombreCsv(l.realise) }, { titre: "Reste à engager HT", valeur: (l) => nombreCsv(l.reste_a_engager) },
      { titre: "Coût à terminaison HT", valeur: (l) => nombreCsv(l.cat) },
    ], () => S.flatMap((r) => r.s.postes.map((l) => ({ ...l, ref: r.a.reference })))),
  );
  ctx.corps.append(
    el("p", { class: "note", text: "Toutes les valeurs proviennent des postes, commandes, factures et règlements enregistrés. Coûts et ventes HT ; encaissements TTC. Détail et justification des calculs dans l'onglet « Formules de calcul »." }),
    tableau(cols, S, { onClic: (r) => ctx.naviguer(`#/m/affaires/${r.a.id}?onglet=budget`), lien: (r) => `#/m/affaires/${r.a.id}`, vide: "Aucune affaire active.", label: "Synthèse financière",
      pied: ["Total", eur(T("vendu_revise")), eur(T("budget_initial")), eur(T("budget_revise")), eur(T("engage")), eur(T("realise")), eur(T("reste_a_engager")), eur(T("cat")), eur(T("facture_ht")), eur(T("encaisse_ttc"), "TTC"), eur(T("marge_prev")), eur(T("marge_term")), ""] }),
    el("section", { class: "panneau" }, [el("h2", { class: "panneau__titre", text: "Alertes financières" }),
      listeAlertes(alertesGlobales(d, ctx.AUJ, d.parametres).filter((a) => !["operation_retard", "blocage", "affaire_retard"].includes(a.type)), ctx)]),
  );
}

function depenses(ctx) {
  const d = ctx.D();
  ctx.outils(el("button", { type: "button", class: "bouton", onclick: () => saisirFactureFournisseur(ctx, {}) }, "+ Facture fournisseur"),
    boutonExport("Exporter les factures (CSV)", "factures-fournisseurs.csv", [
      { titre: "Numéro", valeur: (f) => f.numero }, { titre: "Date", valeur: (f) => f.date }, { titre: "Échéance", valeur: (f) => f.echeance || "" },
      { titre: "Fournisseur", valeur: (f) => (d.contacts.find((c) => c.id === f.fournisseur_id) || {}).nom || "" },
      { titre: "Affaire", valeur: (f) => (d.affaires.find((a) => a.id === f.affaire_id) || {}).reference || "NON AFFECTÉE" },
      { titre: "Montant HT", valeur: (f) => nombreCsv(f.montant_ht) }, { titre: "TVA %", valeur: (f) => String(f.taux_tva ?? "").replace(".", ",") }, { titre: "Statut", valeur: (f) => f.statut },
    ], () => d.factures_fournisseurs),
    boutonExport("Exporter les factures clients (CSV)", "factures-clients.csv", [
      { titre: "Numéro", valeur: (f) => f.numero }, { titre: "Affaire", valeur: (f) => (d.affaires.find((a) => a.id === f.affaire_id) || {}).reference || "" },
      { titre: "Date", valeur: (f) => f.date }, { titre: "Échéance", valeur: (f) => f.echeance }, { titre: "Montant HT", valeur: (f) => nombreCsv(f.montant_ht) },
      { titre: "TVA %", valeur: (f) => String(f.taux_tva).replace(".", ",") }, { titre: "Statut", valeur: (f) => f.statut },
      { titre: "Encaissé TTC", valeur: (f) => nombreCsv(d.paiements.filter((p) => p.facture_client_id === f.id).reduce((s, p) => s + p.montant_ttc, 0)) },
    ], () => d.factures_clients));
  const nonAff = d.factures_fournisseurs.filter((f) => !f.affaire_id);
  ctx.corps.append(
    el("section", { class: "panneau" }, [el("h2", { class: "panneau__titre" }, ["Dépenses non affectées à une affaire", el("small", { text: nonAff.length + " facture(s)" })]), tableauFacturesFournisseurs(ctx, nonAff)]),
    el("section", { class: "panneau" }, [el("h2", { class: "panneau__titre", text: "Toutes les factures fournisseurs" }), tableauFacturesFournisseurs(ctx, [...d.factures_fournisseurs].sort((a, b) => (b.date || "").localeCompare(a.date || "")))]),
  );
}

function formules(ctx) {
  const li = (t, f) => el("li", {}, [el("strong", { text: t + " : " }), el("code", { text: f })]);
  ctx.corps.append(el("section", { class: "panneau formules" }, [
    el("h2", { class: "panneau__titre", text: "Comment sont calculés les montants" }),
    el("p", { text: "Tous les calculs sont faits en centimes d'euro (entiers), puis affichés avec deux décimales. Coûts, ventes et factures sont HT ; les encaissements et soldes clients sont TTC." }),
    el("ul", {}, [
      li("Budget initial", "Σ budgets initiaux des postes"),
      li("Budget révisé", "budget initial + Σ avenants de type « budget »"),
      li("Montant vendu révisé", "montant vendu (ou honoraires) + Σ avenants de type « vente »"),
      li("Engagé d'une commande", "max(montant de la commande, Σ factures liées) — commandes envoyées, confirmées, livrées ou soldées"),
      li("Engagé d'un poste", "Σ engagé des commandes + Σ factures sans commande"),
      li("Réalisé (dépenses comptabilisées)", "Σ factures fournisseurs reçues (hors annulées)"),
      li("Payé", "Σ factures fournisseurs au statut « payée »"),
      li("Reste à engager", "valeur saisie sur le poste, sinon max(0, budget révisé − engagé)"),
      li("Coût à terminaison", "engagé + reste à engager"),
      li("Marge prévisionnelle", "vendu révisé − budget révisé"),
      li("Marge à terminaison", "vendu révisé − coût à terminaison"),
      li("Écart", "budget révisé − coût à terminaison (positif = favorable)"),
      li("Facturé", "Σ montants HT des factures clients émises ; TTC = HT × (1 + TVA)"),
      li("Encaissé", "Σ règlements reçus (TTC) ; solde = TTC facturé − encaissé"),
    ]),
    el("h3", { text: "Pourquoi pas de double comptage" }),
    el("p", { text: "Une commande engage une dépense ; la facture qui lui correspond ne s'y ajoute pas, elle la confirme. Si la facture dépasse la commande, c'est le montant facturé qui est retenu. Une facture sans commande est engagée dès sa réception." }),
    el("h3", { text: "Alertes" }),
    el("ul", {}, [
      el("li", { text: "Budget dépassé : réalisé > budget révisé sur un poste." }),
      el("li", { text: "Commandes supérieures au budget : engagé > budget révisé sur un poste." }),
      el("li", { text: "Coût à terminaison > budget révisé." }),
      el("li", { text: "Marge en baisse : marge à terminaison < marge prévisionnelle ; marge faible : taux sous le seuil des paramètres." }),
      el("li", { text: "Facture client échue (solde > 0 après l'échéance) ou à échéance sous 7 jours." }),
      el("li", { text: "Dépense non affectée à une affaire, ou non ventilée sur un poste." }),
    ]),
    el("p", { class: "note", text: "Les calculs sont vérifiés par des tests automatiques (tests/finances.test.mjs). Détail complet : docs/FORMULES.md." }),
  ]));
}
