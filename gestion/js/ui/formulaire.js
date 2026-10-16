/* ==========================================================================
   Formulaires générés à partir des définitions du modèle (CHAMPS).
   ouvrirFormulaire({ titre, type, valeurs, contexte }) → Promise<valeurs|null>
   Les valeurs renvoyées sont validées et converties (montants en centimes).
   ========================================================================== */
import { CHAMPS, valider } from "../donnees/modele.js";
import { donnees } from "../donnees/store.js";
import { el, vider, centsVersSaisie } from "./outils.js";

/** Listes de choix dynamiques. `ctx.affaire_id` filtre les sources liées à une affaire. */
function options(source, ctx) {
  const d = donnees();
  const P = d.parametres;
  const nomContact = (c) => c.nom + (c.specialite ? " — " + c.specialite : "");
  switch (source) {
    case "clients": return d.contacts.filter((c) => c.type === "client").map((c) => [c.id, c.nom]);
    case "fournisseurs": return d.contacts.filter((c) => c.type !== "client").map((c) => [c.id, nomContact(c)]);
    case "affaires": return d.affaires.filter((a) => !a.archive).map((a) => [a.id, `${a.reference} · ${a.nom}`]);
    case "postes_affaire": return d.postes.filter((p) => p.affaire_id === ctx.affaire_id).map((p) => [p.id, p.libelle]);
    case "operations_affaire": return d.operations.filter((o) => o.affaire_id === ctx.affaire_id).map((o) => [o.id, o.nom]);
    case "commandes_affaire": return d.commandes.filter((c) => c.affaire_id === ctx.affaire_id && c.statut !== "annulee").map((c) => [c.id, c.numero]);
    case "categories_budget": return P.categories_budget.map((x) => [x, x]);
    case "types_operation": return P.types_operation.map((x) => [x, x]);
    case "unites": return P.unites.map((x) => [x, x]);
    default: return [];
  }
}

export function ouvrirFormulaire({ titre, type, valeurs = {}, contexte = {}, masquer = [] }) {
  const dlg = document.getElementById("formulaire");
  const form = document.getElementById("formulaire-form");
  const zone = vider(document.getElementById("formulaire-champs"));
  const erreur = document.getElementById("formulaire-erreur");
  document.getElementById("formulaire-titre").textContent = titre;
  erreur.hidden = true;
  const ctx = { ...contexte, affaire_id: valeurs.affaire_id || contexte.affaire_id || null };
  const champs = CHAMPS[type].filter((c) => !masquer.includes(c.cle));
  const controles = {};

  function remplirSelect(sel, c, val) {
    vider(sel);
    const liste = c.options || options(c.source, ctx);
    if (!c.requis || !liste.length) sel.append(el("option", { value: "", text: c.requis ? "— Aucun élément disponible —" : "—" }));
    else sel.append(el("option", { value: "", text: "Choisir…" }));
    liste.forEach(([v, l]) => sel.append(el("option", { value: v, text: l, selected: String(v) === String(val ?? "") })));
  }

  champs.forEach((c, i) => {
    const id = "f-" + c.cle;
    let ctrl;
    const val = valeurs[c.cle];
    if (c.type === "zone") ctrl = el("textarea", { id, maxlength: c.max || null });
    else if (c.type === "choix") { ctrl = el("select", { id }); remplirSelect(ctrl, c, val); }
    else ctrl = el("input", {
      id, type: c.type === "date" ? "date" : c.type === "montant" || c.type === "nombre" ? "text" : "text",
      inputmode: c.type === "montant" || c.type === "nombre" ? "decimal" : null, maxlength: c.max || null, autocomplete: "off",
    });
    if (c.type !== "choix") ctrl.value = c.type === "montant" ? centsVersSaisie(val) : val ?? "";
    if (c.requis) ctrl.setAttribute("aria-required", "true");
    const aideId = c.aide ? id + "-aide" : null;
    if (aideId) ctrl.setAttribute("aria-describedby", aideId);
    controles[c.cle] = { c, ctrl };
    zone.append(el("label", { class: "champ" + (c.plein || c.type === "zone" ? " champ--plein" : ""), for: id }, [
      c.label + (c.requis ? " *" : ""), ctrl, c.aide ? el("small", { id: aideId, text: c.aide }) : null,
    ]));
    if (i === 0) setTimeout(() => ctrl.focus(), 30);
  });

  // Les listes dépendantes (postes, opérations, commandes) suivent l'affaire choisie
  if (controles.affaire_id) controles.affaire_id.ctrl.addEventListener("change", () => {
    ctx.affaire_id = controles.affaire_id.ctrl.value || null;
    Object.values(controles).forEach(({ c, ctrl }) => { if (c.source && c.source.endsWith("_affaire")) remplirSelect(ctrl, c, ""); });
  });

  return new Promise((resolve) => {
    function soumettre(e) {
      const bouton = e.submitter;
      if (bouton && bouton.value === "annuler") return; // fermeture normale
      e.preventDefault();
      const brut = {};
      Object.entries(controles).forEach(([k, { ctrl }]) => { brut[k] = ctrl.value; });
      const { valeurs: v, erreurs } = valider(type, brut);
      // les champs masqués conservent leur valeur d'origine
      masquer.forEach((k) => { if (k in valeurs) v[k] = valeurs[k]; });
      if (erreurs.length) {
        erreur.textContent = erreurs.join(" ");
        erreur.hidden = false;
        return;
      }
      fin(v);
    }
    function fermer() { fin(null); }
    function fin(v) {
      form.removeEventListener("submit", soumettre);
      dlg.removeEventListener("close", fermer);
      if (dlg.open) dlg.close();
      resolve(v);
    }
    form.addEventListener("submit", soumettre);
    dlg.addEventListener("close", fermer);
    dlg.showModal();
  });
}

/** Confirmation simple (boîte native, accessible). */
export const confirmer = (message) => Promise.resolve(window.confirm(message));
