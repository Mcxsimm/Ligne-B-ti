/* Ligne&Bati — page de connexion */
(function () {
  "use strict";
  var LB = window.LB;
  var form = document.getElementById("form-connexion");
  var etat = document.getElementById("etat");
  var bouton = form.querySelector('[type="submit"]');

  if (!LB.sb) {
    LB.etat(etat, "error", "L'espace connecté est momentanément indisponible. Réessayez plus tard.");
    bouton.disabled = true;
    return;
  }

  if (LB.param("deconnecte")) LB.etat(etat, "info", "Vous êtes déconnecté.");

  // Retour vers la page demandée, limité aux pages de l'espace (pas de redirection ouverte)
  function destination() {
    var r = LB.param("retour") || "";
    return /^[a-z-]+\.html(\?[\w=&%-]*)?$/i.test(r) ? r : "index.html";
  }

  // Déjà connecté : aller directement au tableau de bord
  LB.chargerProfil().then(function (p) {
    if (p) window.location.replace(p.doit_changer_mdp ? "mot-de-passe.html?premier=1" : destination());
  }).catch(function () {});

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var email = form.email.value.trim();
    var mdp = form.mdp.value;
    if (!email || !mdp) {
      LB.etat(etat, "error", "Saisissez votre adresse e-mail et votre mot de passe.");
      (email ? form.mdp : form.email).focus();
      return;
    }
    bouton.disabled = true;
    bouton.textContent = "Connexion…";
    LB.sb.auth.signInWithPassword({ email: email, password: mdp }).then(function (r) {
      if (r.error) throw r.error;
      return LB.chargerProfil();
    }).then(function (p) {
      window.location.replace(p && p.doit_changer_mdp ? "mot-de-passe.html?premier=1" : destination());
    }).catch(function (err) {
      LB.etat(etat, "error", LB.erreur(err));
      etat.focus();
      bouton.disabled = false;
      bouton.textContent = "Se connecter";
    });
  });
})();
