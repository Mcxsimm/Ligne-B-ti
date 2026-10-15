/* Ligne&Bati — gestion des comptes (administrateur) */
(function () {
  "use strict";
  var LB = window.LB;
  var el = LB.el;
  var etat = document.getElementById("etat");
  var form = document.getElementById("form-compte");
  var tbody = document.getElementById("liste-comptes");
  var boite = document.getElementById("mdp-provisoire");

  LB.exiger({ roles: ["admin"] }).then(charger).catch(function () {});

  function charger() {
    return LB.sb.from("profils").select("id, nom_complet, email, role, doit_changer_mdp, created_at")
      .order("role").order("nom_complet").then(function (r) {
        if (r.error) throw r.error;
        afficher(r.data || []);
      }).catch(function (err) { LB.etat(etat, "error", LB.erreur(err)); });
  }

  function afficher(profils) {
    LB.vider(tbody);
    profils.forEach(function (p) {
      var soi = p.id === LB.profil.id;
      var actions = el("div", { class: "actions" });
      if (!soi && p.role !== "admin") {
        var autre = p.role === "client" ? "salarie" : "client";
        var bRole = el("button", { type: "button", class: "btn btn--ghost btn--icon",
          text: autre === "salarie" ? "Passer salarié" : "Passer client" });
        bRole.addEventListener("click", function () {
          if (!window.confirm("Changer le rôle de " + (p.nom_complet || p.email) + " en « " + LB.LIBELLES_ROLE[autre] + " » ?")) return;
          LB.sb.from("profils").update({ role: autre }).eq("id", p.id).then(function (r) {
            if (r.error) throw r.error;
            LB.etat(etat, "success", "Rôle mis à jour.");
            charger();
          }).catch(function (err) { LB.etat(etat, "error", LB.erreur(err)); });
        });
        var bMdp = el("button", { type: "button", class: "btn btn--ghost btn--icon", text: "Nouveau mot de passe" });
        bMdp.addEventListener("click", function () {
          if (!window.confirm("Générer un nouveau mot de passe provisoire pour " + (p.nom_complet || p.email) + " ? L'ancien ne fonctionnera plus.")) return;
          appeler({ action: "reinitialiser", id: p.id }).then(function (res) {
            montrerMdp(p.nom_complet || p.email, res.mot_de_passe_provisoire);
            charger();
          }).catch(function (err) { LB.etat(etat, "error", err.message); });
        });
        actions.appendChild(bRole);
        actions.appendChild(bMdp);
      }
      tbody.appendChild(el("tr", {}, [
        el("td", { text: (p.nom_complet || "—") + (soi ? " (vous)" : "") }),
        el("td", { text: p.email || "—" }),
        el("td", {}, [el("span", { class: "badge", text: LB.LIBELLES_ROLE[p.role] })]),
        el("td", { text: p.doit_changer_mdp ? "Mot de passe provisoire" : "Actif" }),
        el("td", {}, [actions])
      ]));
    });
  }

  // Appel de la fonction serveur « gerer-comptes » avec la session de l'administrateur
  function appeler(corps) {
    return LB.sb.functions.invoke("gerer-comptes", { body: corps }).then(function (r) {
      if (r.error) {
        // Le message d'erreur métier est dans le corps de la réponse
        var ctx = r.error.context;
        if (ctx && typeof ctx.json === "function") {
          return ctx.json().then(function (j) { throw new Error(j.erreur || "L'opération a échoué."); },
            function (e) { throw e instanceof Error && e.message !== "" ? e : new Error("L'opération a échoué."); });
        }
        throw new Error(LB.erreur(r.error));
      }
      return r.data;
    });
  }

  function montrerMdp(pour, mdp) {
    document.getElementById("mdp-pour").textContent = pour;
    document.getElementById("mdp-valeur").textContent = mdp;
    boite.hidden = false;
    boite.focus();
  }

  document.getElementById("btn-copier").addEventListener("click", function () {
    var v = document.getElementById("mdp-valeur").textContent;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(v).then(function () { LB.etat(etat, "success", "Mot de passe copié."); },
        function () { LB.etat(etat, "info", "Copie impossible : sélectionnez le mot de passe manuellement."); });
    }
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var nom = form.querySelector("#a-nom").value.trim();
    var email = form.querySelector("#a-email").value.trim();
    var role = form.querySelector("#a-role").value;
    if (!nom) { LB.etat(etat, "error", "Le nom est obligatoire."); form.querySelector("#a-nom").focus(); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { LB.etat(etat, "error", "Adresse e-mail invalide."); form.querySelector("#a-email").focus(); return; }
    var bouton = form.querySelector('[type="submit"]');
    bouton.disabled = true;
    appeler({ action: "creer", nom_complet: nom, email: email, role: role }).then(function (res) {
      form.reset();
      LB.etat(etat, "success", "Compte créé pour " + nom + ".");
      montrerMdp(nom + " (" + res.email + ")", res.mot_de_passe_provisoire);
      return charger();
    }).catch(function (err) {
      LB.etat(etat, "error", err.message || "La création du compte a échoué.");
    }).then(function () { bouton.disabled = false; });
  });
})();
