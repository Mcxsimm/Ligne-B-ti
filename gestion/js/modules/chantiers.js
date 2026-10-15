/* Module 3 — Chantiers : suivi des opérations, et fiche de suivi dédiée par chantier
   (avancement, prévu / réel, blocages, réunions et comptes rendus, réserves,
   actions, documents et photos, échéances). */
import { el, date, puce, tableau, barre, toast, onglets, kpi } from "../ui/outils.js";
import { ouvrirFormulaire, confirmer } from "../ui/formulaire.js";
import { avancementAffaire, ecartsOperation } from "../calculs/planning.js";
import { STATUTS_OPERATION, STATUTS_AFFAIRE, TYPES_EVENEMENT, TYPES_DOCUMENT, libelle } from "../donnees/modele.js";
import { STATUTS_SUR_CARTE } from "../carte/chantiers.js";
import { nomContact, tableHistorique } from "./commun.js";

const TON_OP = { a_venir: "", en_cours: "ok", suspendue: "attention", terminee: "info" };

export default {
  titre: "Chantiers",
  rendre(ctx, route) {
    if (route.id) return suivi(ctx, route.id, route.params.onglet || "operations");
    vueGenerale(ctx, route.params.vue || "liste");
  },
};

/* ---------- Vue générale : tous les chantiers ------------------------------ */
function vueGenerale(ctx, vue) {
  const d = ctx.D();
  ctx.titre("Chantiers et opérations");
  const chantiers = d.affaires.filter((a) => !a.archive && STATUTS_SUR_CARTE.includes(a.statut));
  ctx.outils(el("button", { type: "button", class: "bouton", onclick: () => ctx.naviguer("#/") }, "Voir le parc sur la carte"));
  ctx.corps.append(onglets([["liste", "Chantiers"], ["gantt", "Planning (Gantt)"]], vue, (v) => ctx.naviguer(`#/m/chantiers?vue=${v}`)));
  if (vue === "gantt") { ctx.corps.append(gantt(ctx, d.operations.filter((o) => chantiers.some((a) => a.id === o.affaire_id)))); return; }

  if (!chantiers.length) { ctx.corps.append(el("p", { class: "vide", text: "Aucun chantier actif. Utilisez « + Nouveau chantier » sur la carte." })); return; }
  const grille = el("div", { class: "kpis" });
  chantiers.forEach((a) => {
    const ops = d.operations.filter((o) => o.affaire_id === a.id);
    const retard = ops.filter((o) => ecartsOperation(o, ctx.AUJ).en_retard).length;
    const reserves = d.reserves.filter((r) => r.affaire_id === a.id && r.statut === "ouverte").length;
    const b = el("button", { type: "button", class: "tuile", onclick: () => ctx.naviguer(`#/m/chantiers/${a.id}`) }, [
      el("span", { class: "tuile__role", text: `${a.reference} · ${libelle(STATUTS_AFFAIRE, a.statut)}` }),
      el("span", { class: "tuile__nom", text: a.nom }),
      barre(avancementAffaire(ops), retard > 0),
      el("span", { class: "tuile__ind", text: `${avancementAffaire(ops)} % · ${ops.length} opération(s) · ${retard} en retard · ${reserves} réserve(s) ouverte(s)` }),
    ]);
    grille.append(b);
  });
  ctx.corps.append(grille);
}

/* ---------- Fiche de suivi d'un chantier ------------------------------------ */
function suivi(ctx, id, onglet) {
  const d = ctx.D();
  const a = d.affaires.find((x) => x.id === id);
  if (!a) { ctx.titre("Chantier introuvable"); ctx.corps.append(el("p", { class: "vide", text: "Ce chantier n'existe pas." })); return; }
  const ops = d.operations.filter((o) => o.affaire_id === id).sort((x, y) => (x.date_debut_prevue || "").localeCompare(y.date_debut_prevue || ""));
  const av = avancementAffaire(ops);
  ctx.titre(`Chantier · ${a.nom}`);
  ctx.fil([["Carte", "#/"], ["Chantiers", "#/m/chantiers"], [a.reference, null]]);
  ctx.outils(
    el("button", { type: "button", class: "bouton bouton--clair", onclick: () => ctx.naviguer(`#/m/affaires/${a.id}`) }, "Fiche affaire et finances"),
    el("label", { class: "case" }, ["Statut ", (() => {
      const s = el("select", { "aria-label": "Statut du chantier" }, STATUTS_AFFAIRE.map(([k, l]) => el("option", { value: k, text: l, selected: k === a.statut })));
      s.addEventListener("change", () => { ctx.store.modifier("affaires", a.id, { statut: s.value }); toast(STATUTS_SUR_CARTE.includes(s.value) ? "Statut mis à jour." : "Statut mis à jour : le chantier quitte le parc de la carte."); });
      return s;
    })()]),
  );

  const retards = ops.filter((o) => ecartsOperation(o, ctx.AUJ).en_retard);
  const resOuv = d.reserves.filter((r) => r.affaire_id === id && r.statut === "ouverte");
  const actions = d.taches.filter((t) => t.affaire_id === id && !t.fait);
  const nbReunions = d.evenements.filter((e) => e.affaire_id === id && e.type === "reunion").length;
  const prochaine = d.evenements.filter((e) => e.affaire_id === id && e.date >= ctx.AUJ).sort((x, y) => x.date.localeCompare(y.date))[0];
  ctx.corps.append(el("div", { class: "kpis" }, [
    kpi("Avancement", av + " %", "pondéré par la durée des opérations", av >= 100 ? "ok" : ""),
    kpi("Opérations en retard", String(retards.length), `${ops.length} opération(s)`, retards.length ? "alerte" : "ok"),
    kpi("Réserves ouvertes", String(resOuv.length), null, resOuv.length ? "attention" : "ok"),
    kpi("Actions à réaliser", String(actions.length), null, actions.some((t) => t.echeance && t.echeance < ctx.AUJ) ? "alerte" : ""),
    kpi("Prochain rendez-vous", prochaine ? date(prochaine.date) : "—", prochaine ? prochaine.titre : null),
  ]));
  const blocages = ops.filter((o) => o.blocage);
  if (blocages.length) ctx.corps.append(el("div", { class: "panneau" }, [el("h2", { class: "panneau__titre", text: "Points de blocage" }),
    el("ul", { class: "alertes" }, blocages.map((o) => el("li", { class: "alerte alerte--attention" }, [el("span", { class: "alerte__type", text: "Blocage" }), el("span", { text: `${o.nom} : ${o.blocage}` }), el("span")])))]));

  const changer = (o) => ctx.naviguer(`#/m/chantiers/${id}?onglet=${o}`);
  ctx.corps.append(onglets([
    ["operations", "Opérations", ops.length], ["planning", "Prévu / réel"], ["reunions", "Réunions et comptes rendus", nbReunions],
    ["reserves", "Réserves", resOuv.length], ["actions", "Actions et échéances", actions.length], ["documents", "Photos et documents"], ["historique", "Historique"],
  ], onglet, changer));
  const vues = { operations, planning, reunions, reserves, actions: actionsVue, documents, historique };
  (vues[onglet] || operations)(ctx, a, ops);
}

function operations(ctx, a, ops) {
  ctx.corps.append(el("section", { class: "panneau" }, [
    el("h2", { class: "panneau__titre" }, ["Opérations, phases et zones de travaux", el("button", { type: "button", class: "bouton bouton--petit", onclick: () => editerOperation(ctx, a) }, "+ Opération")]),
    tableau([
      { titre: "Opération", valeur: (o) => o.nom },
      { titre: "Statut", valeur: (o) => puce(libelle(STATUTS_OPERATION, o.statut), TON_OP[o.statut]) },
      { titre: "Intervenants", valeur: (o) => o.intervenants || "—", texte: true },
      { titre: "Prévu", valeur: (o) => `${date(o.date_debut_prevue)} → ${date(o.date_fin_prevue)}` },
      { titre: "Réel", valeur: (o) => o.date_debut_reelle ? `${date(o.date_debut_reelle)} → ${date(o.date_fin_reelle)}` : "—" },
      { titre: "Avancement", valeur: (o) => avancementCtrl(ctx, o) },
      { titre: "Écart", valeur: (o) => { const e = ecartsOperation(o, ctx.AUJ); return e.retard_fin > 0 ? puce(`+${e.retard_fin} j`, "alerte") : e.retard_fin < 0 ? puce(`${e.retard_fin} j`, "ok") : "—"; } },
      { titre: "", valeur: (o) => el("span", {}, [
        el("button", { type: "button", class: "bouton bouton--clair bouton--petit", onclick: () => editerOperation(ctx, a, o) }, "Modifier"), " ",
        el("button", { type: "button", class: "bouton bouton--clair bouton--petit", onclick: async () => { if (await confirmer(`Supprimer l'opération « ${o.nom} » ?`)) ctx.store.supprimer("operations", o.id); } }, "Supprimer"),
      ]) },
    ], ops, { vide: "Aucune opération. Découpez le chantier en phases ou zones de travaux.", label: "Opérations" }),
  ]));
}
function avancementCtrl(ctx, o) {
  const s = el("select", { "aria-label": `Avancement de ${o.nom}` }, [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((v) => el("option", { value: v, text: v + " %", selected: Number(o.avancement) === v || (o.statut === "terminee" && v === 100) })));
  if (![0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].includes(Number(o.avancement)) && o.statut !== "terminee") s.prepend(el("option", { value: o.avancement, text: o.avancement + " %", selected: true }));
  s.addEventListener("change", () => {
    const v = Number(s.value);
    const patch = { avancement: v };
    if (v === 100 && o.statut !== "terminee") { patch.statut = "terminee"; patch.date_fin_reelle = o.date_fin_reelle || ctx.AUJ; }
    if (v > 0 && o.statut === "a_venir") { patch.statut = "en_cours"; patch.date_debut_reelle = o.date_debut_reelle || ctx.AUJ; }
    ctx.store.modifier("operations", o.id, patch);
  });
  return el("span", { class: "case" }, [barre(o.statut === "terminee" ? 100 : o.avancement), s]);
}
async function editerOperation(ctx, a, o) {
  const v = await ouvrirFormulaire({ titre: o ? "Modifier l'opération" : "Nouvelle opération", type: "operation", valeurs: o || { statut: "a_venir", avancement: 0, responsable: "Moi" } });
  if (!v) return;
  if (v.statut === "terminee") v.avancement = 100;
  if (o) ctx.store.modifier("operations", o.id, v); else ctx.store.ajouter("operations", { ...v, affaire_id: a.id });
  toast("Opération enregistrée.");
}

function planning(ctx, a, ops) {
  ctx.corps.append(el("section", { class: "panneau" }, [el("h2", { class: "panneau__titre", text: "Prévu / réel" }), gantt(ctx, ops)]));
}

/** Diagramme de Gantt : barre grise = prévu, barre verte = réel (rouge si retard). */
export function gantt(ctx, ops) {
  const d = ctx.D();
  const dates = ops.flatMap((o) => [o.date_debut_prevue, o.date_fin_prevue, o.date_debut_reelle, o.date_fin_reelle]).filter(Boolean).concat([ctx.AUJ]).sort();
  if (!ops.length) return el("p", { class: "vide", text: "Aucune opération à planifier." });
  const debut = new Date(dates[0].slice(0, 7) + "-01T12:00:00");
  const fin = new Date(dates[dates.length - 1] + "T12:00:00"); fin.setMonth(fin.getMonth() + 1, 1);
  const total = (fin - debut) / 86400000;
  const pos = (iso) => Math.max(0, Math.min(100, ((new Date(iso + "T12:00:00") - debut) / 86400000 / total) * 100));
  const mois = [];
  for (let m = new Date(debut); m < fin; m.setMonth(m.getMonth() + 1)) mois.push(m.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }));
  const barreG = (cls, a, b, titre) => { const x = el("span", { class: "gantt__barre " + cls, title: titre }); x.style.left = pos(a) + "%"; x.style.width = Math.max(0.6, pos(b) - pos(a)) + "%"; return x; };
  const auj = el("span", { class: "gantt__auj", title: "Aujourd'hui" }); auj.style.left = pos(ctx.AUJ) + "%";
  const g = el("div", { class: "gantt" }, [
    el("div", { class: "gantt__entete" }, [el("span", { class: "gantt__nom", text: "Opération" }), el("div", { class: "gantt__mois" }, mois.map((m) => el("span", { text: m })))]),
    ...ops.map((o, i) => {
      const e = ecartsOperation(o, ctx.AUJ);
      const piste = el("div", { class: "gantt__piste" }, [i === 0 ? auj : null]);
      if (o.date_debut_prevue && o.date_fin_prevue) piste.append(barreG("gantt__barre--prevu", o.date_debut_prevue, o.date_fin_prevue, "Prévu"));
      if (o.date_debut_reelle) piste.append(barreG("gantt__barre--reel" + (e.en_retard ? " gantt__barre--retard" : ""), o.date_debut_reelle, o.date_fin_reelle || ctx.AUJ, o.date_fin_reelle ? "Réel" : "Réel (en cours)"));
      const aff = d.affaires.find((x) => x.id === o.affaire_id);
      return el("div", { class: "gantt__ligne" }, [el("div", { class: "gantt__nom" }, [o.nom, el("small", { text: aff ? aff.reference : "" })]), piste]);
    }),
  ]);
  const legende = el("div", { class: "legende" }, [el("span", { text: "Prévu" }), el("span", { text: "Réel" }), el("span", { text: "Réel en retard" }), el("span", { text: "Aujourd'hui" })]);
  [["#d9d3c6"], ["#6b7d68"], ["#b8655a"], ["#9c8259"]].forEach(([c], i) => legende.children[i].style.setProperty("--c", c));
  return el("div", {}, [el("div", { class: "table-wrap", tabindex: "0", role: "region", "aria-label": "Planning de Gantt" }, g), legende]);
}

function reunions(ctx, a) {
  const d = ctx.D();
  const evts = d.evenements.filter((e) => e.affaire_id === a.id && e.type === "reunion").sort((x, y) => y.date.localeCompare(x.date));
  ctx.corps.append(el("section", { class: "panneau" }, [
    el("h2", { class: "panneau__titre" }, ["Réunions de chantier", el("button", { type: "button", class: "bouton bouton--petit", onclick: () => editerReunion(ctx, a) }, "+ Réunion")]),
    evts.length ? el("div", {}, evts.map((e) => el("article", { class: "panneau" }, [
      el("h3", {}, [e.titre, " ", el("small", { text: "· " + date(e.date) }), e.date > ctx.AUJ ? puce("à venir", "info") : null]),
      e.compte_rendu ? el("p", { class: "note", text: e.compte_rendu }) : el("p", { class: "vide", text: e.date > ctx.AUJ ? "Réunion à venir." : "Compte rendu non rédigé." }),
      el("button", { type: "button", class: "bouton bouton--clair bouton--petit", onclick: () => editerReunion(ctx, a, e) }, e.compte_rendu ? "Modifier le compte rendu" : "Rédiger le compte rendu"),
    ]))) : el("p", { class: "vide", text: "Aucune réunion planifiée." }),
  ]));
}
async function editerReunion(ctx, a, e) {
  const v = await ouvrirFormulaire({ titre: e ? e.titre : "Nouvelle réunion", type: "evenement", valeurs: e || { type: "reunion", date: ctx.AUJ, affaire_id: a.id, titre: `Réunion de chantier n° ${ctx.D().evenements.filter((x) => x.affaire_id === a.id && x.type === "reunion").length + 1}` }, masquer: ["affaire_id"] });
  if (!v) return;
  if (e) ctx.store.modifier("evenements", e.id, v); else ctx.store.ajouter("evenements", { ...v, affaire_id: a.id });
  toast("Réunion enregistrée.");
}

function reserves(ctx, a) {
  const d = ctx.D();
  const liste = d.reserves.filter((r) => r.affaire_id === a.id).sort((x, y) => (x.statut === y.statut ? 0 : x.statut === "ouverte" ? -1 : 1));
  ctx.corps.append(el("section", { class: "panneau" }, [
    el("h2", { class: "panneau__titre" }, ["Réserves", el("button", { type: "button", class: "bouton bouton--petit", onclick: () => editerReserve(ctx, a) }, "+ Réserve")]),
    tableau([
      { titre: "Réserve", valeur: (r) => r.libelle, texte: true }, { titre: "Localisation", valeur: (r) => r.localisation || "—" },
      { titre: "Entreprise", valeur: (r) => nomContact(d, r.entreprise_id) },
      { titre: "Constat", valeur: (r) => date(r.date_constat) },
      { titre: "Levée attendue", valeur: (r) => el("span", {}, [date(r.date_limite), " ", r.statut === "ouverte" && r.date_limite && r.date_limite < ctx.AUJ ? puce("dépassée", "alerte") : null]) },
      { titre: "Statut", valeur: (r) => r.statut === "levee" ? puce("levée le " + date(r.date_levee), "ok") : puce("ouverte", "attention") },
      { titre: "", valeur: (r) => el("span", {}, [
        r.statut === "ouverte" ? el("button", { type: "button", class: "bouton bouton--petit", onclick: () => { ctx.store.modifier("reserves", r.id, { statut: "levee", date_levee: ctx.AUJ }); toast("Réserve levée."); } }, "Lever") : null, " ",
        el("button", { type: "button", class: "bouton bouton--clair bouton--petit", onclick: () => editerReserve(ctx, a, r) }, "Modifier"),
      ]) },
    ], liste, { vide: "Aucune réserve.", label: "Réserves" }),
  ]));
}
async function editerReserve(ctx, a, r) {
  const v = await ouvrirFormulaire({ titre: r ? "Modifier la réserve" : "Nouvelle réserve", type: "reserve", valeurs: r || { date_constat: ctx.AUJ, statut: "ouverte" } });
  if (!v) return;
  if (v.statut === "levee" && !v.date_levee) v.date_levee = ctx.AUJ;
  if (r) ctx.store.modifier("reserves", r.id, v); else ctx.store.ajouter("reserves", { ...v, affaire_id: a.id });
  toast("Réserve enregistrée.");
}

function actionsVue(ctx, a) {
  const d = ctx.D();
  const taches = d.taches.filter((t) => t.affaire_id === a.id).sort((x, y) => Number(x.fait) - Number(y.fait) || (x.echeance || "9").localeCompare(y.echeance || "9"));
  const echeances = d.evenements.filter((e) => e.affaire_id === a.id && e.date >= ctx.AUJ && e.type !== "reunion").sort((x, y) => x.date.localeCompare(y.date));
  ctx.corps.append(el("div", { class: "grille-2" }, [
    el("section", { class: "panneau" }, [
      el("h2", { class: "panneau__titre" }, ["Actions à réaliser", el("button", { type: "button", class: "bouton bouton--petit", onclick: async () => {
        const v = await ouvrirFormulaire({ titre: "Nouvelle action", type: "tache", valeurs: { affaire_id: a.id }, contexte: { affaire_id: a.id }, masquer: ["affaire_id"] });
        if (v) { ctx.store.ajouter("taches", { ...v, affaire_id: a.id, fait: false }); toast("Action ajoutée."); }
      } }, "+ Action")]),
      taches.length ? el("ul", { class: "alertes" }, taches.map((t) => {
        const c = el("input", { type: "checkbox", checked: t.fait, "aria-label": "Fait : " + t.libelle });
        c.addEventListener("change", () => ctx.store.modifier("taches", t.id, { fait: c.checked }));
        return el("li", { class: "alerte " + (t.fait ? "alerte--info" : t.echeance && t.echeance < ctx.AUJ ? "alerte--alerte" : "") }, [c, el("span", { text: t.libelle }), el("small", { text: date(t.echeance) })]);
      })) : el("p", { class: "vide", text: "Aucune action." }),
    ]),
    el("section", { class: "panneau" }, [
      el("h2", { class: "panneau__titre" }, ["Échéances et jalons", el("button", { type: "button", class: "bouton bouton--petit", onclick: async () => {
        const v = await ouvrirFormulaire({ titre: "Nouvel événement", type: "evenement", valeurs: { type: "jalon", date: ctx.AUJ, affaire_id: a.id }, masquer: ["affaire_id", "compte_rendu"] });
        if (v) { ctx.store.ajouter("evenements", { ...v, affaire_id: a.id }); toast("Événement ajouté."); }
      } }, "+ Événement")]),
      tableau([{ titre: "Date", valeur: (e) => date(e.date) }, { titre: "Événement", valeur: (e) => e.titre, texte: true }, { titre: "Type", valeur: (e) => libelle(TYPES_EVENEMENT, e.type) }], echeances, { vide: "Aucune échéance à venir.", label: "Échéances" }),
    ]),
  ]));
}

function documents(ctx, a) {
  const d = ctx.D();
  ctx.corps.append(el("section", { class: "panneau" }, [
    el("h2", { class: "panneau__titre" }, ["Photos et documents du chantier", el("button", { type: "button", class: "bouton bouton--petit", onclick: async () => {
      const v = await ouvrirFormulaire({ titre: "Référencer une photo ou un document", type: "document", valeurs: { affaire_id: a.id, date: ctx.AUJ, type: "photo" }, masquer: ["affaire_id"] });
      if (v) { ctx.store.ajouter("documents", { ...v, affaire_id: a.id }); toast("Élément référencé."); }
    } }, "+ Photo ou document")]),
    tableau([{ titre: "Nom", valeur: (x) => x.nom }, { titre: "Type", valeur: (x) => libelle(TYPES_DOCUMENT, x.type) }, { titre: "Date", valeur: (x) => date(x.date) }, { titre: "Emplacement", valeur: (x) => x.emplacement || "—", texte: true }],
      d.documents.filter((x) => x.affaire_id === a.id), { vide: "Aucun élément.", label: "Photos et documents" }),
    el("p", { class: "note note--phase2", text: "Prototype : photos et documents sont référencés (nom, emplacement). Le stockage des fichiers et la prise de photo depuis le téléphone arrivent avec la version hébergée." }),
  ]));
}
function historique(ctx, a) {
  const d = ctx.D();
  const ids = new Set([a.id, ...["operations", "reserves", "evenements", "taches", "documents"].flatMap((c) => d[c].filter((x) => x.affaire_id === a.id).map((x) => x.id))]);
  ctx.corps.append(el("section", { class: "panneau" }, [el("h2", { class: "panneau__titre", text: "Historique du chantier" }), tableHistorique(d, (h) => ids.has(h.entite_id))]));
}
