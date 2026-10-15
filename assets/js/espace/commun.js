/* ==========================================================================
   Ligne&Bati — espace connecté : fonctions communes
   Chargé sur toutes les pages de /espace/, après config.js et supabase.js.
   Expose l'objet global LB.
   ========================================================================== */
(function () {
  "use strict";

  var root = document.documentElement;
  root.classList.remove("no-js");
  root.classList.add("js");

  var cfg = window.LB_CONFIG || {};
  var client = null;
  try {
    client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseCle, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
    });
  } catch (e) {
    client = null;
  }

  var LB = {
    sb: client,
    profil: null,
    session: null,

    PHASES: [
      { cle: "preparation", libelle: "Préparation" },
      { cle: "consultation", libelle: "Consultation" },
      { cle: "travaux", libelle: "Travaux" },
      { cle: "reception", libelle: "Réception" },
      { cle: "termine", libelle: "Terminé" }
    ],
    LIBELLES_STATUT: {
      preparation: "Préparation", consultation: "Consultation", travaux: "Travaux",
      reception: "Réception", termine: "Terminé", suspendu: "Suspendu"
    },
    LIBELLES_ROLE: { admin: "Administrateur", salarie: "Salarié", client: "Client" },
    LIBELLES_JALON: { a_venir: "À venir", en_cours: "En cours", termine: "Terminé" }
  };

  /* ---------- Utilitaires ------------------------------------------------ */

  // Crée un élément DOM sans jamais interpréter de HTML (protection XSS)
  LB.el = function (tag, attrs, enfants) {
    var n = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v === null || v === undefined || v === false) return;
        if (k === "class") n.className = v;
        else if (k === "text") n.textContent = v;
        else if (k.indexOf("on") === 0 && typeof v === "function") n.addEventListener(k.slice(2), v);
        else if (v === true) n.setAttribute(k, "");
        else n.setAttribute(k, String(v));
      });
    }
    (enfants || []).forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return n;
  };

  LB.vider = function (n) { while (n.firstChild) n.removeChild(n.firstChild); return n; };

  LB.date = function (iso) {
    if (!iso) return "—";
    var d = new Date(iso.length === 10 ? iso + "T12:00:00" : iso);
    if (isNaN(d)) return "—";
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  };

  LB.param = function (nom) {
    return new URLSearchParams(window.location.search).get(nom);
  };

  // Message dans une zone d'état (role="status")
  LB.etat = function (zone, type, texte) {
    if (!zone) return;
    zone.className = "form-status form-status--" + type;
    zone.textContent = texte;
    zone.hidden = !texte;
  };

  // Traduction des erreurs techniques en messages compréhensibles
  LB.erreur = function (err) {
    var m = (err && (err.message || err.error_description || err.erreur)) || "";
    if (/Invalid login credentials/i.test(m)) return "Adresse e-mail ou mot de passe incorrect.";
    if (/Email not confirmed/i.test(m)) return "Ce compte n'est pas encore activé.";
    if (/Password should be|weak/i.test(m)) return "Ce mot de passe est trop faible : utilisez au moins 10 caractères variés.";
    if (/same.*password|different from the old/i.test(m)) return "Le nouveau mot de passe doit être différent de l'ancien.";
    if (/Failed to fetch|NetworkError|network/i.test(m)) return "Connexion au service impossible. Vérifiez votre accès à internet puis réessayez.";
    if (/row-level security|permission denied/i.test(m)) return "Vous n'avez pas les droits nécessaires pour cette action.";
    if (/rate limit|too many/i.test(m)) return "Trop de tentatives. Patientez quelques minutes avant de réessayer.";
    return m ? "Une erreur est survenue : " + m : "Une erreur est survenue. Réessayez.";
  };

  // Barre de progression accessible
  LB.barre = function (valeur, libelle) {
    var v = Math.max(0, Math.min(100, Math.round(valeur || 0)));
    return LB.el("div", { class: "progress", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": "100",
      "aria-valuenow": String(v), "aria-label": libelle || "Avancement" }, [
      LB.el("span", { class: "progress__fill", style: null, "data-v": String(v) })
    ]);
  };

  // Les largeurs sont appliquées en JS (la CSP interdit les styles en ligne dans le HTML)
  LB.appliquerBarres = function (racine) {
    (racine || document).querySelectorAll(".progress__fill[data-v]").forEach(function (f) {
      f.style.width = f.getAttribute("data-v") + "%";
    });
    (racine || document).querySelectorAll("[data-ring]").forEach(function (r) {
      r.style.setProperty("--p", r.getAttribute("data-ring"));
    });
  };

  // Frise des phases du chantier
  LB.frise = function (statut) {
    var idx = LB.PHASES.findIndex(function (p) { return p.cle === statut; });
    var ol = LB.el("ol", { class: "phases", "aria-label": "Phase du chantier" });
    LB.PHASES.forEach(function (p, i) {
      var etat = statut === "suspendu" ? "" : (i < idx ? "is-done" : (i === idx ? "is-current" : ""));
      ol.appendChild(LB.el("li", { class: "phases__item " + etat, "aria-current": i === idx ? "step" : null }, [
        LB.el("span", { class: "phases__dot", "aria-hidden": "true" }),
        LB.el("span", { class: "phases__label", text: p.libelle })
      ]));
    });
    return ol;
  };

  /* ---------- Session et rôles ------------------------------------------- */

  LB.chargerProfil = function () {
    return client.auth.getSession().then(function (r) {
      LB.session = r.data && r.data.session;
      if (!LB.session) return null;
      return client.from("profils").select("id, nom_complet, email, role, doit_changer_mdp")
        .eq("id", LB.session.user.id).single()
        .then(function (p) { LB.profil = p.data || null; return LB.profil; });
    });
  };

  LB.estEquipe = function () { return LB.profil && (LB.profil.role === "admin" || LB.profil.role === "salarie"); };
  LB.estAdmin = function () { return LB.profil && LB.profil.role === "admin"; };

  // Garde d'accès : redirige si non connecté ou rôle insuffisant
  // options.roles : liste des rôles autorisés ; options.autoriserMdp : page de changement de mot de passe
  LB.exiger = function (options) {
    options = options || {};
    if (!client) {
      LB.indisponible();
      return Promise.reject(new Error("indisponible"));
    }
    return LB.chargerProfil().then(function (profil) {
      if (!profil) {
        var retour = encodeURIComponent(window.location.pathname.split("/").pop() + window.location.search);
        window.location.replace("connexion.html?retour=" + retour);
        throw new Error("non connecté");
      }
      if (profil.doit_changer_mdp && !options.autoriserMdp) {
        window.location.replace("mot-de-passe.html?premier=1");
        throw new Error("mot de passe à changer");
      }
      if (options.roles && options.roles.indexOf(profil.role) === -1) {
        window.location.replace("index.html");
        throw new Error("rôle insuffisant");
      }
      LB.preparerEntete();
      root.classList.add("espace-pret");
      return profil;
    });
  };

  LB.indisponible = function () {
    var main = document.getElementById("contenu");
    if (main) {
      LB.vider(main).appendChild(LB.el("div", { class: "container section" }, [
        LB.el("p", { class: "form-status form-status--error", text: "L'espace connecté est momentanément indisponible. Réessayez plus tard." })
      ]));
    }
    root.classList.add("espace-pret");
  };

  // En-tête : affiche les liens selon le rôle, nom de l'utilisateur, déconnexion
  LB.preparerEntete = function () {
    document.querySelectorAll("[data-role]").forEach(function (n) {
      var roles = n.getAttribute("data-role").split(" ");
      n.hidden = roles.indexOf(LB.profil.role) === -1;
    });
    var nom = document.querySelector("[data-nom-utilisateur]");
    if (nom) nom.textContent = LB.profil.nom_complet || LB.profil.email || "";
    var badge = document.querySelector("[data-role-utilisateur]");
    if (badge) badge.textContent = LB.LIBELLES_ROLE[LB.profil.role] || "";
    var deco = document.querySelector("[data-deconnexion]");
    if (deco) deco.addEventListener("click", function () {
      client.auth.signOut().finally(function () { window.location.replace("connexion.html?deconnecte=1"); });
    });
    initNav();
  };

  // Menu mobile (même comportement que le site public)
  function initNav() {
    var toggle = document.querySelector(".nav-toggle");
    var menu = document.getElementById("menu-principal");
    if (!toggle || !menu || toggle.dataset.pret) return;
    toggle.dataset.pret = "1";
    function setOpen(open) {
      toggle.setAttribute("aria-expanded", String(open));
      toggle.querySelector(".nav-toggle__text").textContent = open ? "Fermer" : "Menu";
      menu.classList.toggle("is-open", open);
    }
    toggle.addEventListener("click", function () { setOpen(toggle.getAttribute("aria-expanded") !== "true"); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") { setOpen(false); toggle.focus(); }
    });
  }

  window.LB = LB;
})();
