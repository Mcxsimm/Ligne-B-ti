/* Ligne&Bati — fiche chantier : étapes, journal, réglages */
(function () {
  "use strict";
  var LB = window.LB;
  var el = LB.el;
  var etat = document.getElementById("etat");
  var id = LB.param("id");
  var chantier = null;

  LB.exiger().then(function () {
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
      LB.etat(etat, "error", "Chantier introuvable.");
      return;
    }
    if (LB.estEquipe()) initEquipe();
    return charger();
  }).catch(function () {});

  function charger() {
    return Promise.all([
      LB.sb.from("chantiers").select("*").eq("id", id).maybeSingle(),
      LB.sb.from("jalons").select("*").eq("chantier_id", id).order("ordre").order("created_at"),
      LB.sb.from("journal").select("*").eq("chantier_id", id).order("date_entree", { ascending: false }).order("created_at", { ascending: false })
    ]).then(function (r) {
      if (r[0].error) throw r[0].error;
      if (!r[0].data) {
        document.getElementById("ch-titre").textContent = "Chantier introuvable";
        LB.etat(etat, "error", "Ce chantier n'existe pas ou n'est pas associé à votre compte.");
        return;
      }
      chantier = r[0].data;
      afficherEntete();
      afficherJalons(r[1].data || []);
      afficherJournal(r[2].data || []);
      if (LB.estEquipe()) remplirReglages();
    }).catch(function (err) { LB.etat(etat, "error", LB.erreur(err)); });
  }

  function afficherEntete() {
    document.title = chantier.titre + " | Espace Ligne&Bati";
    document.getElementById("fil-titre").textContent = chantier.titre;
    document.getElementById("ch-titre").textContent = chantier.titre;
    document.getElementById("ch-ref").textContent = [chantier.reference, LB.LIBELLES_STATUT[chantier.statut]].filter(Boolean).join(" · ");
    var dates = [];
    if (chantier.commune) dates.push(chantier.commune);
    if (chantier.date_debut) dates.push("début " + LB.date(chantier.date_debut));
    if (chantier.date_fin_prevue) dates.push("fin prévue " + LB.date(chantier.date_fin_prevue));
    document.getElementById("ch-sous-titre").textContent = dates.join(" · ");
    var ring = document.getElementById("ch-ring");
    ring.setAttribute("data-ring", String(chantier.avancement));
    ring.setAttribute("aria-label", "Avancement : " + chantier.avancement + " %");
    document.getElementById("ch-pct").textContent = chantier.avancement + " %";
    LB.vider(document.getElementById("ch-frise")).appendChild(LB.frise(chantier.statut));
    var msg = document.getElementById("ch-message");
    LB.vider(msg);
    if (chantier.message_client) {
      msg.appendChild(el("strong", { text: "Message de Ligne&Bati" }));
      msg.appendChild(el("span", { text: chantier.message_client }));
      msg.hidden = false;
    } else {
      msg.hidden = true;
    }
    var desc = document.getElementById("ch-desc");
    desc.textContent = chantier.description || "";
    desc.hidden = !chantier.description;
    LB.appliquerBarres();
  }

  /* ---------- Étapes ----------------------------------------------------- */
  function afficherJalons(jalons) {
    var ol = LB.vider(document.getElementById("jalons"));
    if (!jalons.length) {
      ol.appendChild(el("li", { class: "vide", text: "Les étapes du chantier seront affichées ici." }));
      return;
    }
    jalons.forEach(function (j) {
      var meta = [];
      if (j.date_reelle) meta.push("Réalisé le " + LB.date(j.date_reelle));
      else if (j.date_prevue) meta.push("Prévu le " + LB.date(j.date_prevue));
      if (LB.estEquipe() && !j.visible_client) meta.push("Interne");
      var li = el("li", { class: "jalon jalon--" + j.statut }, [
        el("span", { class: "jalon__titre", text: j.titre }),
        el("span", { class: "badge badge--" + j.statut, text: LB.LIBELLES_JALON[j.statut] }),
        meta.length ? el("span", { class: "jalon__meta", text: meta.join(" · ") }) : null
      ]);
      if (LB.estEquipe()) li.appendChild(actionsJalon(j));
      ol.appendChild(li);
    });
  }

  function actionsJalon(j) {
    var select = el("select", { "aria-label": "État de l'étape « " + j.titre + " »" });
    ["a_venir", "en_cours", "termine"].forEach(function (s) {
      select.appendChild(el("option", { value: s, text: LB.LIBELLES_JALON[s], selected: s === j.statut }));
    });
    select.addEventListener("change", function () {
      var maj = { statut: select.value };
      if (select.value === "termine" && !j.date_reelle) maj.date_reelle = new Date().toISOString().slice(0, 10);
      if (select.value !== "termine") maj.date_reelle = null;
      modifier("jalons", j.id, maj, "Étape mise à jour.");
    });
    var visible = el("input", { type: "checkbox", checked: j.visible_client });
    visible.addEventListener("change", function () {
      modifier("jalons", j.id, { visible_client: visible.checked }, visible.checked ? "Étape visible par le client." : "Étape masquée au client.");
    });
    var suppr = el("button", { type: "button", class: "btn btn--ghost btn--icon", text: "Supprimer",
      "aria-label": "Supprimer l'étape « " + j.titre + " »" });
    suppr.addEventListener("click", function () {
      if (window.confirm("Supprimer l'étape « " + j.titre + " » ?")) supprimer("jalons", j.id, "Étape supprimée.");
    });
    return el("div", { class: "jalon__actions" }, [
      select, el("label", { class: "mini-check" }, [visible, "Visible client"]), suppr
    ]);
  }

  /* ---------- Journal ---------------------------------------------------- */
  function afficherJournal(entrees) {
    var ol = LB.vider(document.getElementById("journal"));
    if (!entrees.length) {
      ol.appendChild(el("li", { class: "vide", text: LB.estEquipe()
        ? "Aucune entrée. Ajoutez comptes rendus, décisions et points d'étape."
        : "Les comptes rendus partagés par Ligne&Bati apparaîtront ici." }));
      return;
    }
    entrees.forEach(function (n) {
      var li = el("li", { class: "entree" }, [
        el("div", { class: "entree__head" }, [
          el("p", { class: "entree__titre", text: n.titre }),
          el("span", { class: "entree__date", text: LB.date(n.date_entree) + (LB.estEquipe() ? (n.visible_client ? " · visible client" : " · interne") : "") })
        ]),
        n.contenu ? el("p", { class: "entree__contenu", text: n.contenu }) : null
      ]);
      if (LB.estEquipe()) {
        var vis = el("input", { type: "checkbox", checked: n.visible_client });
        vis.addEventListener("change", function () {
          modifier("journal", n.id, { visible_client: vis.checked }, vis.checked ? "Entrée visible par le client." : "Entrée masquée au client.");
        });
        var suppr = el("button", { type: "button", class: "btn btn--ghost btn--icon", text: "Supprimer" });
        suppr.addEventListener("click", function () {
          if (window.confirm("Supprimer l'entrée « " + n.titre + " » ?")) supprimer("journal", n.id, "Entrée supprimée.");
        });
        li.appendChild(el("div", { class: "jalon__actions" }, [el("label", { class: "mini-check" }, [vis, "Visible client"]), suppr]));
      }
      ol.appendChild(li);
    });
  }

  /* ---------- Écritures (équipe) ----------------------------------------- */
  function modifier(table, ligne, valeurs, message) {
    return LB.sb.from(table).update(valeurs).eq("id", ligne).then(function (r) {
      if (r.error) throw r.error;
      LB.etat(etat, "success", message);
      return charger();
    }).catch(function (err) { LB.etat(etat, "error", LB.erreur(err)); });
  }

  function supprimer(table, ligne, message) {
    return LB.sb.from(table).delete().eq("id", ligne).then(function (r) {
      if (r.error) throw r.error;
      LB.etat(etat, "success", message);
      return charger();
    }).catch(function (err) { LB.etat(etat, "error", LB.erreur(err)); });
  }

  function initEquipe() {
    var fJalon = document.getElementById("form-jalon");
    fJalon.addEventListener("submit", function (e) {
      e.preventDefault();
      var titre = fJalon.querySelector("#j-titre").value.trim();
      if (!titre) { LB.etat(etat, "error", "L'intitulé de l'étape est obligatoire."); return; }
      var ordre = document.querySelectorAll("#jalons .jalon").length + 1;
      LB.sb.from("jalons").insert({
        chantier_id: id, titre: titre, ordre: ordre,
        date_prevue: fJalon.querySelector("#j-date").value || null,
        visible_client: fJalon.querySelector("#j-visible").checked
      }).then(function (r) {
        if (r.error) throw r.error;
        fJalon.reset();
        LB.etat(etat, "success", "Étape ajoutée.");
        return charger();
      }).catch(function (err) { LB.etat(etat, "error", LB.erreur(err)); });
    });

    var fJournal = document.getElementById("form-journal");
    fJournal.querySelector("#n-date").value = new Date().toISOString().slice(0, 10);
    fJournal.addEventListener("submit", function (e) {
      e.preventDefault();
      var titre = fJournal.querySelector("#n-titre").value.trim();
      if (!titre) { LB.etat(etat, "error", "Le titre de l'entrée est obligatoire."); return; }
      LB.sb.from("journal").insert({
        chantier_id: id, titre: titre,
        date_entree: fJournal.querySelector("#n-date").value || undefined,
        contenu: fJournal.querySelector("#n-contenu").value.trim() || null,
        visible_client: fJournal.querySelector("#n-visible").checked
      }).then(function (r) {
        if (r.error) throw r.error;
        fJournal.reset();
        fJournal.querySelector("#n-date").value = new Date().toISOString().slice(0, 10);
        LB.etat(etat, "success", "Entrée publiée.");
        return charger();
      }).catch(function (err) { LB.etat(etat, "error", LB.erreur(err)); });
    });

    var select = document.getElementById("r-client");
    LB.sb.from("profils").select("id, nom_complet, email").eq("role", "client").order("nom_complet").then(function (r) {
      (r.data || []).forEach(function (p) {
        select.appendChild(el("option", { value: p.id, text: (p.nom_complet || "Sans nom") + (p.email ? " — " + p.email : "") }));
      });
      if (chantier) select.value = chantier.client_id || "";
    });

    document.getElementById("form-reglages").addEventListener("submit", function (e) {
      e.preventDefault();
      var titre = document.getElementById("r-titre").value.trim();
      if (!titre) { LB.etat(etat, "error", "L'intitulé est obligatoire."); return; }
      modifier("chantiers", id, {
        titre: titre,
        reference: document.getElementById("r-ref").value.trim() || null,
        commune: document.getElementById("r-commune").value.trim() || null,
        statut: document.getElementById("r-statut").value,
        date_debut: document.getElementById("r-debut").value || null,
        date_fin_prevue: document.getElementById("r-fin").value || null,
        client_id: select.value || null,
        message_client: document.getElementById("r-message").value.trim() || null,
        description: document.getElementById("r-desc").value.trim() || null
      }, "Chantier enregistré.");
    });

    document.getElementById("btn-supprimer").addEventListener("click", function () {
      if (!chantier) return;
      var saisie = window.prompt("Cette action supprime le chantier, ses étapes et son journal. Tapez SUPPRIMER pour confirmer.");
      if (saisie !== "SUPPRIMER") return;
      LB.sb.from("chantiers").delete().eq("id", id).then(function (r) {
        if (r.error) throw r.error;
        window.location.replace("index.html");
      }).catch(function (err) { LB.etat(etat, "error", LB.erreur(err)); });
    });
  }

  function remplirReglages() {
    document.getElementById("r-titre").value = chantier.titre || "";
    document.getElementById("r-ref").value = chantier.reference || "";
    document.getElementById("r-commune").value = chantier.commune || "";
    document.getElementById("r-statut").value = chantier.statut;
    document.getElementById("r-debut").value = chantier.date_debut || "";
    document.getElementById("r-fin").value = chantier.date_fin_prevue || "";
    document.getElementById("r-client").value = chantier.client_id || "";
    document.getElementById("r-message").value = chantier.message_client || "";
    document.getElementById("r-desc").value = chantier.description || "";
  }
})();
