/* Module — Centre de contrôle : alertes et indicateurs de performance */
import { el, kpi, pct, eur } from "../ui/outils.js";
import { alertesGlobales, syntheseGlobale } from "../calculs/finances.js";
import { listeAlertes } from "./commun.js";

const GROUPES = [
  ["Finances", ["budget_depasse", "commandes_depassent", "cat_depasse", "marge_baisse", "marge_faible", "non_ventile", "depense_non_affectee"]],
  ["Facturation et encaissements", ["facture_echue", "facture_echeance"]],
  ["Délais et chantiers", ["affaire_retard", "operation_retard", "blocage"]],
];

export default {
  titre: "Contrôle",
  rendre(ctx) {
    const d = ctx.D();
    const A = alertesGlobales(d, ctx.AUJ, d.parametres);
    const g = syntheseGlobale(d, ctx.AUJ, d.parametres);
    ctx.titre("Centre de contrôle");
    const tauxEnc = g.facture_ht ? Math.round((g.encaisse_ttc / g.syntheses.reduce((s, x) => s + x.facture_ttc, 0)) * 1000) / 10 : null;
    const tauxMarge = g.vendu_revise ? Math.round((g.marge_term / g.vendu_revise) * 1000) / 10 : null;
    const tauxEng = g.budget_revise ? Math.round((g.engage / g.budget_revise) * 1000) / 10 : null;
    ctx.corps.append(el("div", { class: "kpis" }, [
      kpi("Alertes", String(A.filter((a) => a.niveau === "alerte").length), null, A.some((a) => a.niveau === "alerte") ? "alerte" : "ok"),
      kpi("Points d'attention", String(A.filter((a) => a.niveau === "attention").length), null, "attention"),
      kpi("Taux de marge à terminaison", pct(tauxMarge), "seuil : " + d.parametres.seuil_marge_pct + " %", tauxMarge !== null && tauxMarge < d.parametres.seuil_marge_pct ? "alerte" : "ok"),
      kpi("Taux d'engagement", pct(tauxEng), "engagé / budget révisé"),
      kpi("Taux d'encaissement", pct(tauxEnc), "encaissé / facturé TTC"),
      kpi("Créances clients", eur(g.reste_du_ttc, "TTC", true)),
    ]));
    GROUPES.forEach(([titre, types]) => {
      const l = A.filter((a) => types.includes(a.type));
      ctx.corps.append(el("section", { class: "panneau" }, [el("h2", { class: "panneau__titre" }, [titre, el("small", { text: l.length + " élément(s)" })]), listeAlertes(l, ctx, "Rien à signaler.")]));
    });
  },
};
