/* ==========================================================================
   Ligne&Bati Gestion — point d'entrée
   Routes (hash) :
     #/                         carte
     #/liste                    vue liste des modules
     #/m/<module>               module
     #/m/<module>/<id>          fiche (affaire, chantier, contact…)
   La carte reste en mémoire derrière les modules : revenir à la carte
   restaure le cadrage d'origine.
   ========================================================================== */
import * as store from "./donnees/store.js";
import { jeuDemo } from "./donnees/demo.js";
import { creerCarte } from "./carte/carte.js";
import { BATIMENTS } from "./carte/batiments.js";
import { STATUTS_SUR_CARTE } from "./carte/chantiers.js";
import { syntheseGlobale, alertesGlobales } from "./calculs/finances.js";
import { avancementAffaire } from "./calculs/planning.js";
import { STATUTS_AFFAIRE, libelle } from "./donnees/modele.js";
import { el, vider, eur, aujourdhui, toast } from "./ui/outils.js";
import { MODULES } from "./modules/index.js";
import { ouvrirFormulaire } from "./ui/formulaire.js";

document.documentElement.classList.replace("no-js", "js");

/* ---------- Données --------------------------------------------------- */
if (!store.charger()) store.initialiser(jeuDemo());
const D = () => store.donnees();
const AUJ = aujourdhui();

function majBandeau() {
  const b = document.getElementById("bandeau-demo");
  b.hidden = !D().meta.demo;
  if (!store.estPersistant()) {
    b.hidden = false;
    b.replaceChildren(el("strong", { text: "Attention" }), " le navigateur bloque le stockage local : les données seront perdues à la fermeture.");
  }
}

/* ---------- Indicateurs affichés sur la carte --------------------------- */
let cacheG = null, cacheA = null;
store.abonner(() => { cacheG = null; cacheA = null; });
const G = () => cacheG || (cacheG = syntheseGlobale(D(), AUJ, D().parametres));
const ALERTES = () => cacheA || (cacheA = alertesGlobales(D(), AUJ, D().parametres));

function indicateurs(id) {
  const g = G(), A = ALERTES(), d = D();
  const nAlertes = A.filter((a) => a.niveau === "alerte").length;
  switch (id) {
    case "siege": return { lignes: [["Affaires en cours", g.nb_affaires_en_cours], ["Marge à terminaison", eur(g.marge_term, "HT", true)], ["Alertes", nAlertes]], resume: `${g.nb_affaires_en_cours} affaires en cours` };
    case "affaires": {
      const pipe = d.affaires.filter((a) => !a.archive && ["prospect", "a_chiffrer", "offre_preparation", "offre_envoyee", "attente_decision"].includes(a.statut)).length;
      return { lignes: [["En cours", g.nb_affaires_en_cours], ["En négociation", pipe], ["Total actives", g.nb_affaires_total]], badge: { texte: String(g.nb_affaires_en_cours), niveau: "info", titre: "Affaires en cours" } };
    }
    case "chantiers": {
      const ret = A.filter((a) => a.type === "operation_retard").length;
      return { lignes: [["Opérations actives", g.nb_operations_actives], ["Opérations en retard", ret], ["Réserves ouvertes", d.reserves.filter((r) => r.statut === "ouverte").length]], badge: ret ? { texte: ret + " retard" + (ret > 1 ? "s" : ""), niveau: "alerte" } : null };
    }
    case "finances": {
      const risques = g.affaires_risque;
      return { lignes: [["Vendu révisé", eur(g.vendu_revise, "HT", true)], ["Engagé", eur(g.engage, "HT", true)], ["Reste dû clients", eur(g.reste_du_ttc, "TTC", true)]], badge: risques ? { texte: risques + " à risque", niveau: "alerte" } : { texte: "OK", niveau: "ok" } };
    }
    case "entrepot": {
      const enCours = d.commandes.filter((c) => ["envoyee", "confirmee"].includes(c.statut)).length;
      const brouillons = d.commandes.filter((c) => c.statut === "brouillon").length;
      return { lignes: [["Commandes en cours", enCours], ["Brouillons à valider", brouillons], ["Fournisseurs", d.contacts.filter((c) => c.type !== "client").length]], badge: brouillons ? { texte: brouillons + " à valider", niveau: "attention" } : null };
    }
    case "planning": {
      const sem = d.evenements.filter((e) => e.date >= AUJ && e.date <= plusJours(AUJ, 7)).length;
      return { lignes: [["Événements sous 7 jours", sem], ["Tâches ouvertes", d.taches.filter((t) => !t.fait).length]], badge: sem ? { texte: String(sem), niveau: "info", titre: "Événements cette semaine" } : null };
    }
    case "administration": {
      const tRetard = d.taches.filter((t) => !t.fait && t.echeance && t.echeance < AUJ).length;
      return { lignes: [["Documents référencés", d.documents.length], ["Tâches en retard", tRetard]], badge: tRetard ? { texte: tRetard + " en retard", niveau: "attention" } : null };
    }
    case "controle": return { lignes: [["Alertes", nAlertes], ["Points d'attention", A.filter((a) => a.niveau === "attention").length]], badge: nAlertes ? { texte: String(nAlertes), niveau: "alerte", titre: "Alertes" } : { texte: "0", niveau: "ok" } };
    case "partenaires": return { lignes: [["Clients", d.contacts.filter((c) => c.type === "client").length], ["Fournisseurs et sous-traitants", d.contacts.filter((c) => c.type === "fournisseur" || c.type === "sous_traitant").length], ["Intervenants", d.contacts.filter((c) => c.type === "intervenant").length]] };
    default: return {};
  }
}
function plusJours(iso, n) { const x = new Date(iso + "T12:00:00"); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); }

/** Chantiers affichés dans le parc : affaires en phase d'exécution. */
function chantiersCarte() {
  const d = D(), A = ALERTES();
  return d.affaires
    .filter((a) => !a.archive && STATUTS_SUR_CARTE.includes(a.statut))
    .sort((x, y) => (x.reference || "").localeCompare(y.reference || ""))
    .map((a) => {
      const ops = d.operations.filter((o) => o.affaire_id === a.id);
      const av = avancementAffaire(ops);
      const alertes = A.filter((x) => x.affaire_id === a.id && x.niveau === "alerte");
      const prochaine = d.evenements.filter((e) => e.affaire_id === a.id && e.date >= AUJ).sort((x, y) => x.date.localeCompare(y.date))[0];
      return {
        id: a.id, nom: a.nom, court: (a.commune || a.reference || a.nom).slice(0, 22), statut: a.statut,
        statutLibelle: libelle(STATUTS_AFFAIRE, a.statut), avancement: av, alerte: alertes.length > 0,
        lignes: [
          ["Référence", a.reference || "—"], ["Avancement", av + " %"],
          ["Opérations", String(ops.length)], ["Alertes", String(alertes.length)],
          ["Prochain rendez-vous", prochaine ? prochaine.titre.slice(0, 26) : "—"],
        ],
      };
    });
}

/* ---------- Carte ------------------------------------------------------- */
const carte = creerCarte(document.getElementById("carte"), {
  indicateurs,
  chantiers: chantiersCarte,
  onOpen: (id) => naviguer(`#/m/${id}`),
  onOpenChantier: (id) => naviguer(`#/m/chantiers/${id}`),
});
store.abonner(() => carte.rafraichir());
document.getElementById("ctrl-plus").addEventListener("click", () => carte.zoomer(0.8));
document.getElementById("ctrl-moins").addEventListener("click", () => carte.zoomer(1.25));
document.getElementById("ctrl-centre").addEventListener("click", () => carte.recentrer());

// Actions fréquentes accessibles depuis la carte
const raccourcis = document.getElementById("raccourcis");
function majRaccourcis() {
  const n = ALERTES().filter((a) => a.niveau === "alerte").length;
  raccourcis.replaceChildren(
    el("button", { type: "button", class: "bouton", onclick: () => nouveauChantier() }, "+ Nouveau chantier"),
    el("button", { type: "button", class: "bouton bouton--clair", onclick: () => naviguer("#/m/affaires?nouveau=1") }, "+ Nouvelle affaire"),
    el("button", { type: "button", class: "bouton bouton--clair", onclick: () => naviguer("#/m/controle") }, `Alertes (${n})`),
  );
}
store.abonner(majRaccourcis);

/** Ajout d'un chantier sur la carte : nouvelle affaire en phase d'exécution, ou affaire existante. */
async function nouveauChantier() {
  const d = D();
  const candidates = d.affaires.filter((a) => !a.archive && !STATUTS_SUR_CARTE.includes(a.statut) && !["perdue", "cloturee", "terminee"].includes(a.statut));
  const choix = candidates.length
    ? await choisirAffaireExistante(candidates)
    : "nouvelle";
  if (!choix) return;
  if (choix !== "nouvelle") {
    store.modifier("affaires", choix, { statut: "en_preparation" });
    toast("Chantier placé sur la carte, dans le parc des chantiers.");
    naviguer(`#/m/chantiers/${choix}`);
    return;
  }
  const v = await ouvrirFormulaire({ titre: "Nouveau chantier", type: "affaire", valeurs: { statut: "en_preparation", nature_contrat: "travaux", responsable: "Moi" } });
  if (!v) return;
  const a = store.ajouter("affaires", { ...v, reference: store.prochaineReference("AFF", "affaires"), archive: false });
  if (!STATUTS_SUR_CARTE.includes(a.statut)) toast("Affaire créée. Elle apparaîtra sur la carte lorsqu'elle passera en préparation ou en cours.");
  else toast("Chantier ajouté au parc des chantiers.");
  naviguer(`#/m/chantiers/${a.id}`);
}
function choisirAffaireExistante(liste) {
  return new Promise((resolve) => {
    const dlg = el("dialog", { class: "formulaire", "aria-labelledby": "choix-titre" });
    const sel = el("select", { id: "choix-affaire" }, [
      el("option", { value: "nouvelle", text: "Créer une nouvelle affaire" }),
      ...liste.map((a) => el("option", { value: a.id, text: `${a.reference} · ${a.nom} (${libelle(STATUTS_AFFAIRE, a.statut)})` })),
    ]);
    const form = el("form", { method: "dialog" }, [
      el("h2", { id: "choix-titre", text: "Nouveau chantier" }),
      el("p", { text: "Placez sur la carte une affaire gagnée existante, ou créez une nouvelle affaire." }),
      el("label", { class: "champ", for: "choix-affaire" }, ["Affaire", sel]),
      el("div", { class: "formulaire__actions" }, [
        el("button", { class: "bouton", type: "submit", value: "ok", text: "Continuer" }),
        el("button", { class: "bouton bouton--clair", type: "submit", value: "annuler", text: "Annuler" }),
      ]),
    ]);
    dlg.append(form);
    document.body.append(dlg);
    dlg.addEventListener("close", () => { const v = dlg.returnValue === "ok" ? sel.value : null; dlg.remove(); resolve(v); });
    dlg.showModal();
    sel.focus();
  });
}

/* ---------- Vue liste --------------------------------------------------- */
const btnVue = document.getElementById("btn-vue");
btnVue.addEventListener("click", () => naviguer(location.hash === "#/liste" ? "#/" : "#/liste"));
function rendreListe() {
  const g = vider(document.getElementById("liste-modules-grille"));
  // chantiers en premier sur mobile : accès direct au suivi
  chantiersCarte().forEach((c) => g.append(el("li", {}, el("button", { type: "button", class: "tuile", onclick: () => naviguer(`#/m/chantiers/${c.id}`) }, [
    el("span", { class: "tuile__role", text: "Chantier · " + c.statutLibelle }),
    el("span", { class: "tuile__nom", text: c.nom }),
    el("span", { class: "tuile__ind", text: `Avancement ${c.avancement} %${c.alerte ? " · alerte" : ""}` }),
  ]))));
  BATIMENTS.forEach((b) => {
    const ind = indicateurs(b.id);
    g.append(el("li", {}, el("button", { type: "button", class: "tuile", onclick: () => naviguer(`#/m/${b.id}`) }, [
      el("span", { class: "tuile__nom", text: b.nom }),
      el("span", { class: "tuile__role", text: b.role }),
      el("span", { class: "tuile__ind", text: (ind.lignes || []).slice(0, 2).map(([k, v]) => `${k} : ${v}`).join(" · ") }),
    ])));
  });
}

/* ---------- Fenêtre de module --------------------------------------------- */
const fen = document.getElementById("module");
const corps = document.getElementById("module-corps");
const outils = document.getElementById("module-outils");
const fil = document.getElementById("module-fil");
let routeCourante = null;

document.getElementById("module-retour").addEventListener("click", () => naviguer(window.innerWidth < 760 && localStorage.getItem("lb-vue") === "liste" ? "#/liste" : "#/"));
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !fen.hidden && !document.querySelector("dialog[open]")) naviguer("#/");
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); ouvrirRecherche(); }
});

const ctx = {
  store, D, AUJ, naviguer,
  titre(t) { document.getElementById("module-titre").textContent = t; document.title = t + " · Ligne&Bati Gestion"; },
  fil(items) {
    vider(fil);
    items.forEach(([lib, href], i) => {
      if (i) fil.append(" / ");
      fil.append(href ? el("a", { href, text: lib }) : el("span", { text: lib }));
    });
  },
  outils(...boutons) { vider(outils).append(...boutons.filter(Boolean)); },
  corps,
  rafraichir() { if (routeCourante) rendreModule(routeCourante, true); },
};
store.abonner(() => { if (!fen.hidden) ctx.rafraichir(); });

function rendreModule(route, conserverDefilement = false) {
  const m = MODULES[route.module];
  if (!m) { naviguer("#/"); return; }
  const y = corps.scrollTop;
  vider(corps); vider(outils);
  ctx.fil([["Carte", "#/"], [m.titre, route.id ? `#/m/${route.module}` : null]]);
  m.rendre(ctx, route);
  if (conserverDefilement) corps.scrollTop = y;
}

/* ---------- Routeur ------------------------------------------------------- */
function naviguer(hash) { if (location.hash === hash) router(); else location.hash = hash; }
function analyser() {
  const [chemin, requete] = (location.hash || "#/").slice(1).split("?");
  const parts = chemin.split("/").filter(Boolean);
  const params = Object.fromEntries(new URLSearchParams(requete || ""));
  if (parts[0] === "m") return { vue: "module", module: parts[1], id: parts[2] || null, params };
  if (parts[0] === "liste") return { vue: "liste" };
  return { vue: "carte" };
}
let vuePrecedente = "carte";
function router() {
  const r = analyser();
  const liste = document.getElementById("liste-modules");
  majBandeau();
  if (r.vue === "module") {
    const premiere = fen.hidden;
    routeCourante = r;
    fen.hidden = false;
    document.body.classList.add("module-ouvert");
    btnVue.setAttribute("aria-pressed", "false");
    rendreModule(r);
    if (premiere) document.getElementById("module-titre").focus({ preventScroll: true });
    return;
  }
  routeCourante = null;
  const etaitModule = !fen.hidden;
  fen.hidden = true;
  document.body.classList.remove("module-ouvert");
  document.title = "Ligne&Bati · Gestion";
  liste.hidden = r.vue !== "liste";
  btnVue.setAttribute("aria-pressed", String(r.vue === "liste"));
  try { localStorage.setItem("lb-vue", r.vue === "liste" ? "liste" : "carte"); } catch (e) { /* stockage indisponible */ }
  if (r.vue === "liste") rendreListe();
  else if (etaitModule || vuePrecedente === "module") carte.retour();
  vuePrecedente = r.vue;
}
window.addEventListener("hashchange", router);

/* ---------- Recherche rapide ---------------------------------------------- */
const dlgR = document.getElementById("recherche");
const champR = document.getElementById("recherche-champ");
const resR = document.getElementById("recherche-resultats");
let resultats = [], sel = 0;
document.getElementById("btn-recherche").addEventListener("click", ouvrirRecherche);
function ouvrirRecherche() { champR.value = ""; chercher(); dlgR.showModal(); champR.focus(); }
function normaliser(s) { return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
function chercher() {
  const q = normaliser(champR.value.trim());
  const d = D();
  const tout = [
    ...d.affaires.map((a) => ({ t: `${a.reference} · ${a.nom}`, s: "Affaire" + (a.archive ? " archivée" : ""), h: `#/m/affaires/${a.id}`, k: [a.reference, a.nom, a.commune] })),
    ...d.affaires.filter((a) => STATUTS_SUR_CARTE.includes(a.statut)).map((a) => ({ t: a.nom, s: "Suivi de chantier", h: `#/m/chantiers/${a.id}`, k: [a.nom, a.commune, "chantier"] })),
    ...d.operations.map((o) => ({ t: o.nom, s: "Opération · " + ((d.affaires.find((a) => a.id === o.affaire_id) || {}).reference || ""), h: `#/m/chantiers/${o.affaire_id}`, k: [o.nom, o.intervenants] })),
    ...d.contacts.map((c) => ({ t: c.nom, s: "Contact", h: `#/m/partenaires/${c.id}`, k: [c.nom, c.specialite, c.commune] })),
    ...d.commandes.map((c) => ({ t: c.numero, s: "Commande", h: `#/m/entrepot?commande=${c.id}`, k: [c.numero, ...(c.lignes || []).map((l) => l.designation)] })),
    ...BATIMENTS.map((b) => ({ t: b.nom, s: "Module", h: `#/m/${b.id}`, k: [b.nom, b.role] })),
  ];
  resultats = (q ? tout.filter((r) => r.k.some((x) => normaliser(x).includes(q))) : tout.filter((r) => r.s === "Module")).slice(0, 12);
  sel = 0;
  afficherResultats();
}
function afficherResultats() {
  vider(resR);
  if (!resultats.length) { resR.append(el("li", { "aria-disabled": "true", text: "Aucun résultat" })); return; }
  resultats.forEach((r, i) => {
    const li = el("li", { role: "option", id: "res-" + i, "aria-selected": i === sel ? "true" : "false" }, [el("span", { text: r.t }), el("small", { text: r.s })]);
    li.addEventListener("click", () => { dlgR.close(); naviguer(r.h); });
    resR.append(li);
  });
  champR.setAttribute("aria-activedescendant", "res-" + sel);
}
champR.addEventListener("input", chercher);
champR.addEventListener("keydown", (e) => {
  if (e.key === "ArrowDown") { e.preventDefault(); sel = Math.min(resultats.length - 1, sel + 1); afficherResultats(); }
  if (e.key === "ArrowUp") { e.preventDefault(); sel = Math.max(0, sel - 1); afficherResultats(); }
  if (e.key === "Enter") { e.preventDefault(); if (resultats[sel]) { dlgR.close(); naviguer(resultats[sel].h); } }
});
champR.setAttribute("role", "combobox");
champR.setAttribute("aria-controls", "recherche-resultats");
champR.setAttribute("aria-expanded", "true");

/* ---------- Démarrage ----------------------------------------------------- */
majRaccourcis();
// Sur petit écran, la vue liste est proposée par défaut (la carte reste accessible)
if (!location.hash && window.innerWidth < 760) {
  let pref = null;
  try { pref = localStorage.getItem("lb-vue"); } catch (e) { /* ignoré */ }
  if (pref !== "carte") location.hash = "#/liste";
}
router();
