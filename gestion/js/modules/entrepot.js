/* Module 5 — Entrepôt : commandes, lignes, réceptions, factures associées, écarts de prix */
import { el, eur, date, puce, tableau, toast, nombreCsv } from "../ui/outils.js";
import { ouvrirFormulaire, confirmer } from "../ui/formulaire.js";
import { montantCommande, montantLigne, estEngagee } from "../calculs/finances.js";
import { STATUTS_COMMANDE, libelle } from "../donnees/modele.js";
import { boutonExport, nomContact, nomAffaire } from "./commun.js";
import { saisirFactureFournisseur, tableauFacturesFournisseurs } from "./affaires.js";

const filtres = { statut: "", fournisseur: "" };

export default {
  titre: "Entrepôt · Commandes",
  rendre(ctx, route) {
    const d = ctx.D();
    if (route.params.commande) return detail(ctx, route.params.commande);
    ctx.titre("Commandes et approvisionnements");
    ctx.outils(
      boutonExport("Exporter les commandes (CSV)", "commandes.csv", [
        { titre: "Numéro", valeur: (x) => x.c.numero }, { titre: "Date", valeur: (x) => x.c.date }, { titre: "Statut", valeur: (x) => libelle(STATUTS_COMMANDE, x.c.statut) },
        { titre: "Fournisseur", valeur: (x) => nomContact(d, x.c.fournisseur_id) }, { titre: "Affaire", valeur: (x) => nomAffaire(d, x.c.affaire_id) },
        { titre: "Désignation", valeur: (x) => x.l.designation }, { titre: "Quantité", valeur: (x) => String(x.l.quantite).replace(".", ",") }, { titre: "Unité", valeur: (x) => x.l.unite || "" },
        { titre: "PU HT", valeur: (x) => nombreCsv(x.l.pu_ht) }, { titre: "Montant HT", valeur: (x) => nombreCsv(montantLigne(x.l)) },
      ], () => d.commandes.flatMap((c) => (c.lignes || []).map((l) => ({ c, l })))),
      el("button", { type: "button", class: "bouton", onclick: () => nouvelle(ctx, route.params.nouvelle) }, "+ Commande"),
    );
    const st = el("select", { id: "f-st" }, [el("option", { value: "", text: "Tous" }), ...STATUTS_COMMANDE.map(([k, l]) => el("option", { value: k, text: l, selected: filtres.statut === k }))]);
    const fo = el("select", { id: "f-fo" }, [el("option", { value: "", text: "Tous" }), ...d.contacts.filter((c) => c.type !== "client").map((c) => el("option", { value: c.id, text: c.nom, selected: filtres.fournisseur === c.id }))]);
    const zone = el("div");
    const maj = () => {
      filtres.statut = st.value; filtres.fournisseur = fo.value;
      const l = d.commandes.filter((c) => (!filtres.statut || c.statut === filtres.statut) && (!filtres.fournisseur || c.fournisseur_id === filtres.fournisseur)).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
      zone.replaceChildren(tableau([
        { titre: "Numéro", valeur: (c) => c.numero }, { titre: "Date", valeur: (c) => date(c.date) },
        { titre: "Fournisseur", valeur: (c) => nomContact(d, c.fournisseur_id) }, { titre: "Affaire", valeur: (c) => nomAffaire(d, c.affaire_id) },
        { titre: "Statut", valeur: (c) => puce(libelle(STATUTS_COMMANDE, c.statut), estEngagee(c) ? "ok" : c.statut === "brouillon" ? "attention" : "") },
        { titre: "Livraison prévue", valeur: (c) => el("span", {}, [date(c.livraison_prevue), " ", ["envoyee", "confirmee"].includes(c.statut) && c.livraison_prevue && c.livraison_prevue < ctx.AUJ ? puce("en retard", "alerte") : null]) },
        { titre: "Montant", num: true, valeur: (c) => eur(montantCommande(c)) },
        { titre: "Écart facturé", num: true, valeur: (c) => { const f = facture(d, c); const e = f - montantCommande(c); return f ? el("span", { class: e > 0 ? "neg" : "", text: e ? eur(e) : "—" }) : "—"; } },
      ], l, { onClic: (c) => ctx.naviguer(`#/m/entrepot?commande=${c.id}`), lien: (c) => `#/m/entrepot?commande=${c.id}`, vide: "Aucune commande.", label: "Commandes" }));
    };
    [st, fo].forEach((c) => c.addEventListener("change", maj));
    ctx.corps.append(el("div", { class: "filtres" }, [el("label", { class: "champ", for: "f-st" }, ["Statut", st]), el("label", { class: "champ", for: "f-fo" }, ["Fournisseur", fo])]), zone,
      el("p", { class: "note", text: "Une commande est engagée dès qu'elle est envoyée, confirmée, livrée ou soldée ; un brouillon n'engage rien. L'écart facturé compare les factures reçues au montant commandé." }));
    maj();
    if (route.params.nouvelle) nouvelle(ctx, route.params.nouvelle);
  },
};

const facture = (d, c) => d.factures_fournisseurs.filter((f) => f.commande_id === c.id && f.statut !== "annulee").reduce((s, f) => s + f.montant_ht, 0);

async function nouvelle(ctx, affaireId) {
  const v = await ouvrirFormulaire({ titre: "Nouvelle commande", type: "commande", valeurs: { numero: ctx.store.prochaineReference("CMD", "commandes", "numero"), statut: "brouillon", date: ctx.AUJ, affaire_id: affaireId || null, quantite: 1, unite: "forfait" } });
  if (!v) return;
  const { designation, quantite, unite, pu_ht, ...cmd } = v;
  const c = ctx.store.ajouter("commandes", { ...cmd, lignes: [{ designation, quantite, unite, pu_ht }] });
  toast(`Commande ${c.numero} créée.`);
  ctx.naviguer(`#/m/entrepot?commande=${c.id}`);
}

function detail(ctx, id) {
  const d = ctx.D();
  const c = d.commandes.find((x) => x.id === id);
  if (!c) { ctx.titre("Commande introuvable"); return; }
  ctx.titre(`Commande ${c.numero}`);
  ctx.fil([["Carte", "#/"], ["Entrepôt", "#/m/entrepot"], [c.numero, null]]);
  const statut = el("select", { "aria-label": "Statut de la commande" }, STATUTS_COMMANDE.map(([k, l]) => el("option", { value: k, text: l, selected: k === c.statut })));
  statut.addEventListener("change", () => { ctx.store.modifier("commandes", c.id, { statut: statut.value }); toast("Statut mis à jour."); });
  ctx.outils(el("label", { class: "case" }, ["Statut ", statut]),
    el("button", { type: "button", class: "bouton bouton--clair", onclick: () => saisirFactureFournisseur(ctx, { fournisseur_id: c.fournisseur_id, affaire_id: c.affaire_id, poste_id: c.poste_id, commande_id: c.id, montant_ht: Math.max(0, montantCommande(c) - facture(d, c)) }) }, "+ Facture reçue"),
    el("button", { type: "button", class: "bouton bouton--danger", onclick: async () => { if (await confirmer(`Supprimer la commande ${c.numero} ?`)) { ctx.store.supprimer("commandes", c.id); ctx.naviguer("#/m/entrepot"); } } }, "Supprimer"));

  const total = montantCommande(c), fact = facture(d, c);
  ctx.corps.append(
    el("section", { class: "panneau" }, [el("dl", { class: "fiche-infos" }, [
      ["Fournisseur", nomContact(d, c.fournisseur_id)], ["Affaire", nomAffaire(d, c.affaire_id)],
      ["Poste budgétaire", (d.postes.find((p) => p.id === c.poste_id) || {}).libelle || "Non ventilé"],
      ["Date", date(c.date)], ["Livraison prévue", date(c.livraison_prevue)], ["Réception", c.date_reception ? date(c.date_reception) : "—"],
      ["Montant commandé", eur(total)], ["Facturé", eur(fact)], ["Écart de prix", fact ? eur(fact - total) : "—"],
    ].flatMap(([k, v]) => [el("dt", { text: k }), el("dd", { text: v })]))]),
    el("section", { class: "panneau" }, [
      el("h2", { class: "panneau__titre" }, ["Lignes de commande", el("button", { type: "button", class: "bouton bouton--petit", onclick: () => ajouterLigne(ctx, c) }, "+ Ligne")]),
      tableau([
        { titre: "Désignation", valeur: (l) => l.designation, texte: true }, { titre: "Quantité", num: true, valeur: (l) => String(l.quantite).replace(".", ",") },
        { titre: "Unité", valeur: (l) => l.unite || "—" }, { titre: "PU HT", num: true, valeur: (l) => eur(l.pu_ht) }, { titre: "Montant HT", num: true, valeur: (l) => eur(montantLigne(l)) },
        { titre: "", valeur: (l) => el("button", { type: "button", class: "bouton bouton--clair bouton--petit", onclick: () => { const lignes = c.lignes.filter((x) => x !== l); ctx.store.modifier("commandes", c.id, { lignes }); } }, "Retirer") },
      ], c.lignes || [], { vide: "Aucune ligne.", label: "Lignes de commande", pied: ["Total", "", "", "", eur(total), ""] }),
      el("p", {}, [el("button", { type: "button", class: "bouton bouton--clair bouton--petit", onclick: () => { ctx.store.modifier("commandes", c.id, { date_reception: ctx.AUJ, statut: c.statut === "soldee" ? "soldee" : "livree" }); toast("Réception enregistrée."); } }, "Enregistrer la réception aujourd'hui")]),
    ]),
    el("section", { class: "panneau" }, [el("h2", { class: "panneau__titre", text: "Factures associées" }), tableauFacturesFournisseurs(ctx, d.factures_fournisseurs.filter((f) => f.commande_id === c.id))]),
  );
}

async function ajouterLigne(ctx, c) {
  const v = await ouvrirFormulaire({ titre: "Nouvelle ligne", type: "commande", valeurs: { ...c, quantite: 1, unite: "u" }, masquer: ["numero", "fournisseur_id", "affaire_id", "poste_id", "statut", "date", "livraison_prevue"] });
  if (!v) return;
  ctx.store.modifier("commandes", c.id, { lignes: [...(c.lignes || []), { designation: v.designation, quantite: v.quantite, unite: v.unite, pu_ht: v.pu_ht }] });
  toast("Ligne ajoutée.");
}
