/* Ligne&Bati — choix ou changement du mot de passe */
(function () {
  "use strict";
  var LB = window.LB;
  var form = document.getElementById("form-mdp");
  var etat = document.getElementById("etat");

  LB.exiger({ autoriserMdp: true }).then(function (profil) {
    if (profil.doit_changer_mdp) {
      document.getElementById("mdp-intro").textContent =
        "Pour sécuriser votre compte, remplacez le mot de passe provisoire qui vous a été transmis par un mot de passe personnel d'au moins 10 caractères.";
    }
  }).catch(function () {});

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var m1 = form.querySelector("#m1").value;
    var m2 = form.querySelector("#m2").value;
    if (m1.length < 10) { LB.etat(etat, "error", "Le mot de passe doit contenir au moins 10 caractères."); return; }
    if (m1 !== m2) { LB.etat(etat, "error", "Les deux saisies ne sont pas identiques."); return; }
    var bouton = form.querySelector('[type="submit"]');
    bouton.disabled = true;
    LB.sb.auth.updateUser({ password: m1 }).then(function (r) {
      if (r.error) throw r.error;
      return LB.sb.from("profils").update({ doit_changer_mdp: false }).eq("id", LB.profil.id);
    }).then(function (r) {
      if (r.error) throw r.error;
      form.reset();
      LB.etat(etat, "success", "Mot de passe enregistré. Redirection vers votre tableau de bord…");
      setTimeout(function () { window.location.replace("index.html"); }, 1200);
    }).catch(function (err) {
      LB.etat(etat, "error", LB.erreur(err));
      bouton.disabled = false;
    });
  });
})();
