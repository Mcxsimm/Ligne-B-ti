/* Modules 9 et 10 — Administration : tâches, documents, paramètres, sauvegarde et exports */
import { el, date, puce, tableau, onglets, toast, telecharger, csv, nombreCsv } from "../ui/outils.js";
import { ouvrirFormulaire, confirmer } from "../ui/formulaire.js";
import { TYPES_DOCUMENT, libelle, baseVide } from "../donnees/modele.js";
import { exporterJSON, importerJSON, initialiser } from "../donnees/store.js";
import { jeuDemo } from "../donnees/demo.js";
import { nomAffaire, tableHistorique } from "./commun.js";

export default {
  titre: "Administration",
  rendre(ctx, route) {
    const onglet = route.params.onglet || "taches";
    ctx.titre("Administration");
    ctx.corps.append(onglets([["taches", "Tâches"], ["documents", "Documents"], ["parametres", "Paramètres"], ["sauvegarde", "Sauvegarde et exports"], ["historique", "Journal"]], onglet, (o) => ctx.naviguer(`#/m/administration?onglet=${o}`)));
    ({ taches, documents, parametres, sauvegarde, historique }[onglet] || taches)(ctx);
  },
};

function taches(ctx) {
  const d = ctx.D();
  ctx.outils(el("button", { type: "button", class: "bouton", onclick: async () => {
    const v = await ouvrirFormulaire({ titre: "Nouvelle tâche", type: "tache", valeurs: {} });
    if (v) { ctx.store.ajouter("taches", { ...v, fait: false }); toast("Tâche ajoutée."); }
  } }, "+ Tâche"));
  const l = [...d.taches].sort((a, b) => Number(a.fait) - Number(b.fait) || (a.echeance || "9").localeCompare(b.echeance || "9"));
  ctx.corps.append(tableau([
    { titre: "Fait", valeur: (t) => { const c = el("input", { type: "checkbox", checked: t.fait, "aria-label": "Fait : " + t.libelle }); c.addEventListener("change", () => ctx.store.modifier("taches", t.id, { fait: c.checked })); return c; } },
    { titre: "Tâche", valeur: (t) => t.libelle, texte: true }, { titre: "Affaire", valeur: (t) => (t.affaire_id ? nomAffaire(d, t.affaire_id) : "Entreprise") },
    { titre: "Échéance", valeur: (t) => el("span", {}, [date(t.echeance), " ", !t.fait && t.echeance && t.echeance < ctx.AUJ ? puce("en retard", "alerte") : null]) },
    { titre: "", valeur: (t) => el("button", { type: "button", class: "bouton bouton--clair bouton--petit", onclick: async () => { if (await confirmer("Supprimer cette tâche ?")) ctx.store.supprimer("taches", t.id); } }, "Supprimer") },
  ], l, { vide: "Aucune tâche.", label: "Tâches" }));
}

function documents(ctx) {
  const d = ctx.D();
  ctx.outils(el("button", { type: "button", class: "bouton", onclick: async () => {
    const v = await ouvrirFormulaire({ titre: "Référencer un document", type: "document", valeurs: { date: ctx.AUJ, type: "autre" } });
    if (v) { ctx.store.ajouter("documents", v); toast("Document référencé."); }
  } }, "+ Document"));
  ctx.corps.append(tableau([
    { titre: "Document", valeur: (x) => x.nom }, { titre: "Type", valeur: (x) => libelle(TYPES_DOCUMENT, x.type) }, { titre: "Affaire", valeur: (x) => nomAffaire(d, x.affaire_id) },
    { titre: "Date", valeur: (x) => date(x.date) }, { titre: "Emplacement", valeur: (x) => x.emplacement || "—", texte: true },
    { titre: "", valeur: (x) => el("button", { type: "button", class: "bouton bouton--clair bouton--petit", onclick: async () => { if (await confirmer("Retirer ce document de la liste ?")) ctx.store.supprimer("documents", x.id); } }, "Retirer") },
  ], [...d.documents].sort((a, b) => (b.date || "").localeCompare(a.date || "")), { vide: "Aucun document référencé.", label: "Documents" }),
  el("p", { class: "note note--phase2", text: "Le prototype référence les documents (nom, type, emplacement) sans stocker les fichiers. Le stockage sécurisé des fichiers est prévu en phase 3 (version hébergée)." }));
}

function parametres(ctx) {
  const P = ctx.D().parametres;
  const champ = (id, lib, val, attrs = {}) => el("label", { class: "champ", for: id }, [lib, el("input", { id, value: val ?? "", ...attrs })]);
  const liste = (id, lib, val) => el("label", { class: "champ champ--plein", for: id }, [lib, el("textarea", { id, text: (val || []).join("\n") }), el("small", { text: "Une valeur par ligne." })]);
  const form = el("form", { class: "panneau", novalidate: true }, [
    el("h2", { class: "panneau__titre", text: "Paramètres" }),
    el("div", { class: "grille-2" }, [
      champ("p-nom", "Nom de l'entreprise", P.entreprise.nom), champ("p-siren", "SIREN", P.entreprise.siren),
      champ("p-tva", "Taux de TVA par défaut (%)", P.tva_defaut, { inputmode: "decimal" }), champ("p-seuil", "Seuil d'alerte de marge (%)", P.seuil_marge_pct, { inputmode: "decimal" }),
      champ("p-delai", "Délai de paiement client (jours)", P.delai_paiement_jours, { inputmode: "numeric" }),
    ]),
    el("div", { class: "grille-2" }, [
      liste("p-cat", "Catégories budgétaires", P.categories_budget), liste("p-types", "Types d'opérations", P.types_operation),
      liste("p-unites", "Unités", P.unites), liste("p-resp", "Responsables", P.responsables),
    ]),
    el("p", { class: "note", text: "Les statuts d'affaire sont fixes dans le prototype ; leur personnalisation est prévue avec la version hébergée." }),
    el("button", { type: "submit", class: "bouton" }, "Enregistrer les paramètres"),
  ]);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const n = (id) => Number(String(form.querySelector("#" + id).value).replace(",", "."));
    const lignes = (id) => form.querySelector("#" + id).value.split("\n").map((x) => x.trim()).filter(Boolean);
    const tva = n("p-tva"), seuil = n("p-seuil"), delai = n("p-delai");
    if (![tva, seuil, delai].every(Number.isFinite) || tva < 0 || tva > 30 || delai < 0) { toast("Vérifiez les valeurs numériques."); return; }
    ctx.store.parametres({
      entreprise: { ...P.entreprise, nom: form.querySelector("#p-nom").value.trim() || "Ligne&Bati", siren: form.querySelector("#p-siren").value.trim() },
      tva_defaut: tva, seuil_marge_pct: seuil, delai_paiement_jours: delai,
      categories_budget: lignes("p-cat"), types_operation: lignes("p-types"), unites: lignes("p-unites"), responsables: lignes("p-resp"),
    });
    toast("Paramètres enregistrés.");
  });
  ctx.corps.append(form);
}

function sauvegarde(ctx) {
  const d = ctx.D();
  const jour = ctx.AUJ;
  const exp = (lib, nom, cols, lignes) => el("button", { type: "button", class: "bouton bouton--clair", onclick: () => telecharger(nom, csv(cols, lignes)) }, lib);
  const fichier = el("input", { type: "file", accept: "application/json,.json", id: "import-json" });
  fichier.addEventListener("change", async () => {
    const f = fichier.files[0];
    if (!f) return;
    if (!(await confirmer("Importer cette sauvegarde remplacera TOUTES les données actuelles de ce navigateur. Continuer ?"))) { fichier.value = ""; return; }
    try { importerJSON(await f.text()); toast("Sauvegarde importée."); ctx.naviguer("#/m/administration?onglet=sauvegarde"); }
    catch (e) { toast(e.message); }
    fichier.value = "";
  });
  ctx.corps.append(
    el("section", { class: "panneau" }, [
      el("h2", { class: "panneau__titre", text: "Sauvegarde complète" }),
      el("p", { class: "note", text: "Prototype : les données ne sont enregistrées que dans ce navigateur, sur cet appareil. Ce n'est pas une sauvegarde. Exportez régulièrement le fichier JSON et conservez-le en lieu sûr (disque externe, espace de stockage professionnel)." }),
      el("div", { class: "filtres" }, [
        el("button", { type: "button", class: "bouton", onclick: () => { telecharger(`ligne-et-bati-sauvegarde-${jour}.json`, exporterJSON(), "application/json"); toast("Sauvegarde téléchargée."); } }, "Télécharger la sauvegarde (JSON)"),
        el("label", { class: "champ", for: "import-json" }, ["Restaurer une sauvegarde", fichier]),
      ]),
      el("p", { text: "Le fichier JSON contient l'intégralité des données dans un format ouvert et lisible : il permet de changer d'outil sans dépendre d'un fournisseur." }),
    ]),
    el("section", { class: "panneau" }, [
      el("h2", { class: "panneau__titre" }, ["Exports pour Excel", el("small", { text: "CSV, séparateur « ; », décimales à virgule" })]),
      el("div", { class: "filtres" }, [
        exp("Contacts professionnels", "contacts.csv", [{ titre: "Nom", valeur: (c) => c.nom }, { titre: "Type", valeur: (c) => c.type }, { titre: "Spécialité", valeur: (c) => c.specialite }, { titre: "E-mail", valeur: (c) => c.email }, { titre: "Téléphone", valeur: (c) => c.telephone }, { titre: "Commune", valeur: (c) => c.commune }, { titre: "SIRET", valeur: (c) => c.siret }], d.contacts),
        exp("Opérations", "operations.csv", [{ titre: "Affaire", valeur: (o) => nomAffaire(d, o.affaire_id) }, { titre: "Opération", valeur: (o) => o.nom }, { titre: "Statut", valeur: (o) => o.statut }, { titre: "Début prévu", valeur: (o) => o.date_debut_prevue }, { titre: "Fin prévue", valeur: (o) => o.date_fin_prevue }, { titre: "Début réel", valeur: (o) => o.date_debut_reelle }, { titre: "Fin réelle", valeur: (o) => o.date_fin_reelle }, { titre: "Avancement %", valeur: (o) => o.avancement }], d.operations),
        exp("Encaissements", "encaissements.csv", [{ titre: "Date", valeur: (p) => p.date }, { titre: "Facture", valeur: (p) => (d.factures_clients.find((f) => f.id === p.facture_client_id) || {}).numero }, { titre: "Montant TTC", valeur: (p) => nombreCsv(p.montant_ttc) }, { titre: "Mode", valeur: (p) => p.mode }], d.paiements),
        exp("Réserves", "reserves.csv", [{ titre: "Affaire", valeur: (r) => nomAffaire(d, r.affaire_id) }, { titre: "Réserve", valeur: (r) => r.libelle }, { titre: "Localisation", valeur: (r) => r.localisation }, { titre: "Constat", valeur: (r) => r.date_constat }, { titre: "Statut", valeur: (r) => r.statut }, { titre: "Levée", valeur: (r) => r.date_levee }], d.reserves),
      ]),
      el("p", { class: "note", text: "Les exports des affaires, budgets, commandes, factures, planning et indicateurs sont disponibles dans leurs modules respectifs (Affaires, Finances, Entrepôt, Planification)." }),
    ]),
    el("section", { class: "panneau" }, [
      el("h2", { class: "panneau__titre", text: "Données de démonstration" }),
      el("p", { text: d.meta.demo ? "Les données actuelles sont des données de démonstration fictives." : "Les données actuelles sont vos données." }),
      el("div", { class: "filtres" }, [
        el("button", { type: "button", class: "bouton bouton--danger", onclick: async () => {
          if (!(await confirmer("Effacer toutes les données de ce navigateur et repartir d'une base vide ? Pensez à télécharger une sauvegarde avant."))) return;
          initialiser(baseVide()); toast("Base vide créée : vous pouvez saisir vos premières affaires."); ctx.naviguer("#/");
        } }, "Repartir d'une base vide"),
        el("button", { type: "button", class: "bouton bouton--clair", onclick: async () => {
          if (!(await confirmer("Remplacer toutes les données par le jeu de démonstration ?"))) return;
          initialiser(jeuDemo()); toast("Données de démonstration rechargées."); ctx.naviguer("#/");
        } }, "Recharger la démonstration"),
      ]),
    ]),
  );
}

function historique(ctx) {
  ctx.corps.append(el("section", { class: "panneau" }, [el("h2", { class: "panneau__titre" }, ["Journal des opérations", el("small", { text: "200 dernières entrées" })]), tableHistorique(ctx.D(), () => true)]));
}
