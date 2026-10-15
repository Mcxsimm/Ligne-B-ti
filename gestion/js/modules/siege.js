/* Module 1 — Siège : tableau de bord général (tous les chiffres viennent des données saisies) */
import { el, eur, kpi, tableau, date, puce, barre } from "../ui/outils.js";
import { syntheseGlobale, alertesGlobales } from "../calculs/finances.js";
import { avancementAffaire } from "../calculs/planning.js";
import { STATUTS_AFFAIRE, libelle } from "../donnees/modele.js";
import { listeAlertes } from "./commun.js";

export default {
  titre: "Siège · Tableau de bord",
  rendre(ctx) {
    const d = ctx.D(), P = d.parametres;
    const g = syntheseGlobale(d, ctx.AUJ, P);
    const A = alertesGlobales(d, ctx.AUJ, P);
    ctx.titre("Tableau de bord");
    ctx.outils(el("button", { type: "button", class: "bouton bouton--clair", onclick: () => ctx.naviguer("#/m/finances") }, "Détail financier"));

    ctx.corps.append(
      el("p", { class: "note", text: `Indicateurs calculés sur les ${g.nb_affaires_en_cours} affaires en phase active (gagnée, en préparation, en cours, en attente). Montants HT sauf mention TTC.` }),
      el("div", { class: "kpis" }, [
        kpi("Affaires en cours", String(g.nb_affaires_en_cours), `${g.nb_affaires_total} affaires actives au total`),
        kpi("Opérations actives", String(g.nb_operations_actives)),
        kpi("Budgets initiaux", eur(g.budget_initial, "HT", true), "révisés : " + eur(g.budget_revise, "HT", true)),
        kpi("Commandes engagées", eur(g.engage, "HT", true)),
        kpi("Dépenses comptabilisées", eur(g.realise, "HT", true)),
        kpi("Facturé", eur(g.facture_ht, "HT", true), "vendu : " + eur(g.vendu_revise, "HT", true)),
        kpi("Encaissé", eur(g.encaisse_ttc, "TTC", true), "reste dû : " + eur(g.reste_du_ttc, "TTC", true), g.reste_du_ttc > 0 ? "attention" : ""),
        kpi("Marge prévisionnelle", eur(g.marge_prev, "HT", true), null, g.marge_prev < 0 ? "alerte" : "ok"),
        kpi("Marge à terminaison", eur(g.marge_term, "HT", true), null, g.marge_term < g.marge_prev ? "attention" : "ok"),
        kpi("Affaires en retard", String(g.affaires_retard), null, g.affaires_retard ? "alerte" : "ok"),
        kpi("Affaires à risque financier", String(g.affaires_risque), null, g.affaires_risque ? "alerte" : "ok"),
      ]),
    );

    const urgentes = A.filter((a) => a.niveau === "alerte");
    const taches = d.taches.filter((t) => !t.fait && t.echeance && t.echeance <= plus(ctx.AUJ, 7)).sort((a, b) => a.echeance.localeCompare(b.echeance));
    const echeances = [
      ...d.evenements.filter((e) => e.date >= ctx.AUJ).map((e) => ({ date: e.date, lib: e.titre, type: "Événement", affaire: e.affaire_id })),
      ...g.syntheses.flatMap((s) => s.factures.filter((f) => f.solde > 0 && f.echeance >= ctx.AUJ).map((f) => ({ date: f.echeance, lib: `Échéance facture ${f.numero}`, type: "Encaissement", affaire: s.affaire_id }))),
      ...d.operations.filter((o) => o.statut !== "terminee" && o.date_fin_prevue >= ctx.AUJ).map((o) => ({ date: o.date_fin_prevue, lib: `Fin prévue : ${o.nom}`, type: "Opération", affaire: o.affaire_id })),
    ].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 10);

    const g2 = el("div", { class: "grille-2" });
    g2.append(
      el("section", { class: "panneau" }, [el("h2", { class: "panneau__titre" }, ["Actions urgentes", el("small", { text: urgentes.length + " alerte(s)" })]), listeAlertes(urgentes.slice(0, 8), ctx, "Aucune alerte urgente.")]),
      el("section", { class: "panneau" }, [el("h2", { class: "panneau__titre", text: "Tâches des 7 prochains jours" }),
        tableau([
          { titre: "Tâche", valeur: (t) => t.libelle },
          { titre: "Échéance", valeur: (t) => el("span", {}, [date(t.echeance), " ", t.echeance < ctx.AUJ ? puce("en retard", "alerte") : null]) },
        ], taches, { vide: "Aucune tâche à échéance proche.", onClic: () => ctx.naviguer("#/m/administration?onglet=taches"), label: "Tâches" })]),
    );
    ctx.corps.append(g2);

    const g3 = el("div", { class: "grille-2 grille-2--large" });
    const actives = d.affaires.filter((a) => !a.archive && ["gagnee", "en_preparation", "en_cours", "en_attente"].includes(a.statut));
    g3.append(
      el("section", { class: "panneau" }, [el("h2", { class: "panneau__titre", text: "Affaires en cours" }),
        tableau([
          { titre: "Affaire", valeur: (a) => `${a.reference} · ${a.nom}` },
          { titre: "Statut", valeur: (a) => puce(libelle(STATUTS_AFFAIRE, a.statut), "info") },
          { titre: "Avancement", valeur: (a) => barre(avancementAffaire(d.operations.filter((o) => o.affaire_id === a.id))) },
          { titre: "Marge à terminaison", num: true, valeur: (a) => { const s = g.syntheses.find((x) => x.affaire_id === a.id); return s ? eur(s.marge_term) : "—"; } },
        ], actives, { onClic: (a) => ctx.naviguer(`#/m/affaires/${a.id}`), lien: (a) => `#/m/affaires/${a.id}`, label: "Affaires en cours" })]),
      el("section", { class: "panneau" }, [el("h2", { class: "panneau__titre", text: "Prochaines échéances" }),
        tableau([
          { titre: "Date", valeur: (e) => date(e.date) },
          { titre: "Échéance", valeur: (e) => e.lib, texte: true },
          { titre: "Type", valeur: (e) => e.type },
        ], echeances, { vide: "Aucune échéance à venir.", label: "Échéances" })]),
    );
    ctx.corps.append(g3);
  },
};
function plus(iso, n) { const x = new Date(iso + "T12:00:00"); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); }
