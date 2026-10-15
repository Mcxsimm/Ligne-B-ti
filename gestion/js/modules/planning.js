/* Module 7 — Planification : calendrier mensuel, semaine, Gantt */
import { el, date, dateLongue, tableau, onglets, toast, csv, telecharger } from "../ui/outils.js";
import { ouvrirFormulaire } from "../ui/formulaire.js";
import { STATUTS_SUR_CARTE } from "../carte/chantiers.js";
import { gantt } from "./chantiers.js";
import { syntheseAffaire } from "../calculs/finances.js";

export default {
  titre: "Planification",
  rendre(ctx, route) {
    const vue = route.params.vue || "mois";
    ctx.titre("Planification");
    ctx.outils(
      el("button", { type: "button", class: "bouton bouton--clair", onclick: () => telecharger("planning.csv", csv([
        { titre: "Date", valeur: (e) => e.date }, { titre: "Type", valeur: (e) => e.type }, { titre: "Libellé", valeur: (e) => e.titre }, { titre: "Affaire", valeur: (e) => e.ref },
      ], evenements(ctx))) }, "Exporter le planning (CSV)"),
      el("button", { type: "button", class: "bouton", onclick: async () => {
        const v = await ouvrirFormulaire({ titre: "Nouvel événement", type: "evenement", valeurs: { type: "reunion", date: ctx.AUJ } });
        if (v) { ctx.store.ajouter("evenements", v); toast("Événement ajouté."); }
      } }, "+ Événement"),
    );
    ctx.corps.append(onglets([["mois", "Mois"], ["semaine", "7 prochains jours"], ["gantt", "Opérations (Gantt)"]], vue, (v) => ctx.naviguer(`#/m/planning?vue=${v}`)));
    if (vue === "gantt") {
      const d = ctx.D();
      ctx.corps.append(gantt(ctx, d.operations.filter((o) => d.affaires.some((a) => a.id === o.affaire_id && !a.archive && STATUTS_SUR_CARTE.includes(a.statut)))));
    } else if (vue === "semaine") semaine(ctx);
    else mois(ctx, route.params.m);
  },
};

/** Tous les événements datés : rendez-vous, échéances de factures, fins d'opérations, livraisons, tâches. */
function evenements(ctx) {
  const d = ctx.D();
  const ref = (id) => (d.affaires.find((a) => a.id === id) || {}).reference || "";
  const L = [];
  d.evenements.forEach((e) => L.push({ date: e.date, titre: e.titre, type: e.type, ref: ref(e.affaire_id), lien: e.affaire_id ? `#/m/chantiers/${e.affaire_id}?onglet=${e.type === "reunion" ? "reunions" : "actions"}` : null }));
  d.affaires.filter((a) => !a.archive).forEach((a) => {
    syntheseAffaire(d, a.id, ctx.AUJ).factures.filter((f) => f.solde > 0 && f.echeance).forEach((f) => L.push({ date: f.echeance, titre: `Échéance ${f.numero}`, type: f.echue ? "retard" : "echeance", ref: a.reference, lien: `#/m/affaires/${a.id}?onglet=facturation` }));
  });
  d.operations.forEach((o) => { if (o.date_fin_prevue && o.statut !== "terminee") L.push({ date: o.date_fin_prevue, titre: `Fin prévue : ${o.nom}`, type: o.date_fin_prevue < ctx.AUJ ? "retard" : "jalon", ref: ref(o.affaire_id), lien: `#/m/chantiers/${o.affaire_id}` }); });
  d.commandes.forEach((c) => { if (c.livraison_prevue && ["envoyee", "confirmee"].includes(c.statut)) L.push({ date: c.livraison_prevue, titre: `Livraison ${c.numero}`, type: "livraison", ref: ref(c.affaire_id), lien: `#/m/entrepot?commande=${c.id}` }); });
  d.taches.forEach((t) => { if (t.echeance && !t.fait) L.push({ date: t.echeance, titre: `Tâche : ${t.libelle}`, type: t.echeance < ctx.AUJ ? "retard" : "tache", ref: ref(t.affaire_id), lien: t.affaire_id ? `#/m/chantiers/${t.affaire_id}?onglet=actions` : "#/m/administration?onglet=taches" }); });
  return L.sort((a, b) => a.date.localeCompare(b.date));
}

function mois(ctx, m) {
  const ref = m && /^\d{4}-\d{2}$/.test(m) ? m : ctx.AUJ.slice(0, 7);
  const premier = new Date(ref + "-01T12:00:00");
  const lib = premier.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const decal = (n) => { const x = new Date(premier); x.setMonth(x.getMonth() + n); return x.toISOString().slice(0, 7); };
  const E = evenements(ctx);
  const debut = new Date(premier); debut.setDate(1 - ((premier.getDay() + 6) % 7));
  // Grille visuelle ; chaque case porte sa date complète pour les lecteurs d'écran
  const grille = el("div", { class: "calendrier" });
  ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].forEach((j) => grille.append(el("div", { class: "calendrier__jour-nom", "aria-hidden": "true", text: j })));
  for (let i = 0; i < 42; i++) {
    const jour = new Date(debut); jour.setDate(debut.getDate() + i);
    const iso = jour.toISOString().slice(0, 10);
    const evs = E.filter((e) => e.date === iso);
    const caseJ = el("div", { class: "calendrier__case" + (iso.slice(0, 7) !== ref ? " calendrier__case--hors" : "") + (iso === ctx.AUJ ? " calendrier__case--auj" : "") },
      [el("span", { class: "calendrier__num", "aria-hidden": "true", text: String(jour.getDate()) }),
        el("span", { class: "visually-hidden", text: dateLongue(iso) + (evs.length ? ` : ${evs.length} événement(s)` : " : aucun événement") }), ...evs.slice(0, 4).map((e) => el("button", { type: "button", class: "evt evt--" + e.type, title: `${e.titre} ${e.ref}`, onclick: () => e.lien && ctx.naviguer(e.lien) }, e.titre)), evs.length > 4 ? el("small", { text: `+ ${evs.length - 4} autre(s)` }) : null]);
    grille.append(caseJ);
  }
  ctx.corps.append(el("div", { class: "filtres" }, [
    el("button", { type: "button", class: "bouton bouton--clair bouton--petit", onclick: () => ctx.naviguer(`#/m/planning?vue=mois&m=${decal(-1)}`) }, "← Mois précédent"),
    el("h2", { text: lib.charAt(0).toUpperCase() + lib.slice(1) }),
    el("button", { type: "button", class: "bouton bouton--clair bouton--petit", onclick: () => ctx.naviguer(`#/m/planning?vue=mois&m=${decal(1)}`) }, "Mois suivant →"),
    el("button", { type: "button", class: "bouton bouton--clair bouton--petit", onclick: () => ctx.naviguer("#/m/planning?vue=mois") }, "Aujourd'hui"),
  ]), el("div", { class: "table-wrap" }, grille));
}

function semaine(ctx) {
  const fin = new Date(ctx.AUJ + "T12:00:00"); fin.setDate(fin.getDate() + 7);
  const E = evenements(ctx).filter((e) => (e.date >= ctx.AUJ && e.date <= fin.toISOString().slice(0, 10)) || e.type === "retard");
  ctx.corps.append(tableau([
    { titre: "Date", valeur: (e) => date(e.date) }, { titre: "Événement", valeur: (e) => e.titre, texte: true },
    { titre: "Type", valeur: (e) => ({ reunion: "Réunion", livraison: "Livraison", jalon: "Jalon", visite: "Visite", echeance: "Échéance", retard: "En retard", tache: "Tâche", autre: "Autre" }[e.type] || e.type) },
    { titre: "Affaire", valeur: (e) => e.ref || "—" },
  ], E, { onClic: (e) => e.lien && ctx.naviguer(e.lien), vide: "Rien de prévu dans les 7 prochains jours.", label: "Agenda de la semaine" }));
}
