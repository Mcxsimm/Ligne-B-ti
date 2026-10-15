/* Ligne&Bati — carte des outils : trois lignes, une station par domaine */
(function () {
  "use strict";
  var LB = window.LB;
  var el = LB.el;
  var etat = document.getElementById("etat");
  var metro = document.getElementById("metro");
  var fiche = document.getElementById("fiche");
  var outils = [];
  var courant = null;

  // Regroupement des domaines (préfixe numérique de la catégorie) en trois lignes
  var LIGNES = [
    { cle: "entreprise", num: "1", titre: "Piloter l'entreprise", domaines: ["1", "2", "3", "8"] },
    { cle: "activite", num: "2", titre: "Développer l'activité", domaines: ["4", "9"] },
    { cle: "metier", num: "3", titre: "Exercer le métier", domaines: ["5", "6", "7"] }
  ];
  var LIBELLES = { a_faire: "À faire", en_cours: "En cours", en_place: "En place", non_concerne: "Non concerné" };

  LB.exiger({ roles: ["admin", "salarie"] }).then(charger).catch(function () {});

  function charger() {
    return LB.sb.from("outils").select("*").order("ordre").then(function (r) {
      if (r.error) throw r.error;
      outils = r.data || [];
      dessiner();
    }).catch(function (err) { LB.etat(etat, "error", LB.erreur(err)); });
  }

  function prefixe(cat) { return (cat.match(/^(\d+)/) || [])[1] || "9"; }
  function nomDomaine(cat) { return cat.replace(/^\d+\.\s*/, ""); }

  function stats(liste) {
    var utiles = liste.filter(function (o) { return o.statut !== "non_concerne"; });
    var faits = utiles.filter(function (o) { return o.statut === "en_place"; }).length;
    return { faits: faits, total: utiles.length, pct: utiles.length ? Math.round(100 * faits / utiles.length) : 100 };
  }

  function dessiner() {
    // Synthèse globale
    var g = stats(outils);
    var ring = document.getElementById("hub-ring");
    ring.setAttribute("data-ring", String(g.pct));
    ring.setAttribute("aria-label", "Avancement global : " + g.pct + " % des outils en place");
    document.getElementById("hub-pct").textContent = g.pct + " %";
    var cpt = LB.vider(document.getElementById("compteurs"));
    ["en_place", "en_cours", "a_faire", "non_concerne"].forEach(function (s) {
      var n = outils.filter(function (o) { return o.statut === s; }).length;
      cpt.appendChild(el("dt", { text: LIBELLES[s] }));
      cpt.appendChild(el("dd", { text: String(n) }));
    });
    var prio = outils.filter(function (o) { return o.priorite === 1 && o.statut !== "en_place" && o.statut !== "non_concerne"; }).length;
    cpt.appendChild(el("dt", { text: "Priorités restantes" }));
    cpt.appendChild(el("dd", { text: String(prio) }));

    // Lignes et stations
    LB.vider(metro);
    var domaines = {};
    outils.forEach(function (o) { (domaines[o.categorie] = domaines[o.categorie] || []).push(o); });
    var categories = Object.keys(domaines).sort();

    LIGNES.forEach(function (ligne) {
      var stations = el("ol", { class: "ligne__stations" });
      categories.filter(function (c) { return ligne.domaines.indexOf(prefixe(c)) !== -1; }).forEach(function (cat) {
        var liste = domaines[cat];
        var s = stats(liste);
        var puces = el("ul", { class: "outils-liste" });
        liste.forEach(function (o) {
          var bouton = el("button", { type: "button", class: "outil outil--" + o.statut, "data-id": o.id,
            "aria-label": o.nom + " — " + LIBELLES[o.statut] + (o.priorite === 1 ? ", priorité haute" : "") }, [
            el("span", { class: "pastille pastille--" + o.statut, "aria-hidden": "true" }),
            el("span", { text: o.nom }),
            o.priorite === 1 && o.statut !== "en_place" ? el("span", { class: "prio-mark", "aria-hidden": "true", text: "!" }) : null
          ]);
          bouton.addEventListener("click", function () { ouvrir(o); });
          puces.appendChild(el("li", {}, [bouton]));
        });
        stations.appendChild(el("li", { class: "station" + (s.faits === s.total && s.total ? " is-complete" : "") }, [
          el("div", { class: "station__head" }, [
            el("h3", { class: "station__nom", text: nomDomaine(cat) }),
            el("span", { class: "station__compte", text: s.faits + " / " + s.total })
          ]),
          LB.barre(s.pct, "Avancement : " + nomDomaine(cat)),
          puces
        ]));
      });
      metro.appendChild(el("section", { class: "ligne ligne--" + ligne.cle, "aria-label": "Ligne " + ligne.num + " : " + ligne.titre }, [
        el("h2", { class: "ligne__titre" }, [el("span", { class: "ligne__badge", "aria-hidden": "true", text: ligne.num }), ligne.titre]),
        stations
      ]));
    });
    LB.appliquerBarres();
    filtrer();
  }

  // Filtres d'affichage
  function filtrer() {
    var f = (document.querySelector('input[name="filtre"]:checked') || {}).value || "tous";
    metro.querySelectorAll(".outil").forEach(function (b) {
      var o = outils.find(function (x) { return x.id === b.getAttribute("data-id"); });
      var garder = f === "tous" ||
        (f === "a_faire" && (o.statut === "a_faire" || o.statut === "en_cours")) ||
        (f === "prioritaires" && o.priorite === 1 && o.statut !== "en_place" && o.statut !== "non_concerne") ||
        (f === "en_place" && o.statut === "en_place");
      b.parentNode.hidden = !garder;
    });
  }
  document.querySelectorAll('input[name="filtre"]').forEach(function (r) { r.addEventListener("change", filtrer); });

  // Fiche d'un outil
  function ouvrir(o) {
    courant = o;
    document.getElementById("fiche-cat").textContent = nomDomaine(o.categorie) + (o.priorite === 1 ? " · priorité haute" : "");
    document.getElementById("fiche-titre").textContent = o.nom;
    document.getElementById("fiche-desc").textContent = o.description || "";
    var lien = document.getElementById("fiche-lien");
    if (o.lien && /^https:\/\//.test(o.lien)) {
      var a = document.getElementById("fiche-lien-a");
      a.setAttribute("href", o.lien);
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener noreferrer");
      lien.hidden = false;
    } else {
      lien.hidden = true;
    }
    document.getElementById("fiche-statut").value = o.statut;
    document.getElementById("fiche-notes").value = o.notes || "";
    if (typeof fiche.showModal === "function") fiche.showModal(); else fiche.setAttribute("open", "");
    document.getElementById("fiche-statut").focus();
  }

  fiche.addEventListener("close", function () {
    if (fiche.returnValue !== "enregistrer" || !courant) return;
    var maj = {
      statut: document.getElementById("fiche-statut").value,
      notes: document.getElementById("fiche-notes").value.trim() || null
    };
    var cible = courant;
    LB.sb.from("outils").update(maj).eq("id", cible.id).then(function (r) {
      if (r.error) throw r.error;
      Object.assign(cible, maj);
      LB.etat(etat, "success", "« " + cible.nom + " » : " + LIBELLES[maj.statut] + ".");
      dessiner();
      var b = metro.querySelector('[data-id="' + cible.id + '"]');
      if (b) b.focus();
    }).catch(function (err) { LB.etat(etat, "error", LB.erreur(err)); });
  });
})();
