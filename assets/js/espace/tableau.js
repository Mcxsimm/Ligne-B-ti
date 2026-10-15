/* Ligne&Bati — tableau de bord (client : ses chantiers ; équipe : tous + indicateurs) */
(function () {
  "use strict";
  var LB = window.LB;
  var el = LB.el;
  var etat = document.getElementById("etat");
  var liste = document.getElementById("liste-chantiers");

  var JALONS_TYPES = [
    "Visite et relevé de l'existant",
    "Descriptif des travaux validé",
    "Consultation des entreprises",
    "Choix des entreprises et signature des devis",
    "Travaux en cours",
    "Réception des travaux",
    "Levée des réserves"
  ];

  LB.exiger().then(function (profil) {
    var prenom = (profil.nom_complet || "").split(" ")[0];
    document.querySelector("[data-salutation]").textContent = prenom ? "Bonjour " + prenom : "Tableau de bord";
    if (LB.estEquipe()) {
      document.getElementById("titre-page").textContent = "Tableau de bord";
      document.getElementById("intro-page").textContent = "Vue d'ensemble des chantiers et de la mise en place des outils.";
      initCreation();
    } else {
      document.getElementById("intro-page").textContent =
        "Retrouvez ici l'avancement de vos travaux, les prochaines étapes et les comptes rendus partagés par Ligne&Bati.";
    }
    return charger();
  }).catch(function () {});

  function charger() {
    var requetes = [
      LB.sb.from("chantiers").select("id, reference, titre, commune, statut, avancement, date_debut, date_fin_prevue, updated_at, client:profils!chantiers_client_id_fkey(nom_complet)")
        .order("updated_at", { ascending: false })
    ];
    if (LB.estEquipe()) requetes.push(LB.sb.from("outils").select("statut"));
    return Promise.all(requetes).then(function (res) {
      if (res[0].error) throw res[0].error;
      afficherChantiers(res[0].data || []);
      if (res[1]) afficherKpis(res[0].data || [], res[1].data || []);
    }).catch(function (err) {
      LB.etat(etat, "error", LB.erreur(err));
    });
  }

  function afficherKpis(chantiers, outils) {
    var actifs = chantiers.filter(function (c) { return c.statut !== "termine"; });
    var moy = actifs.length ? Math.round(actifs.reduce(function (s, c) { return s + c.avancement; }, 0) / actifs.length) : 0;
    var utiles = outils.filter(function (o) { return o.statut !== "non_concerne"; });
    var enPlace = utiles.filter(function (o) { return o.statut === "en_place"; }).length;
    var kpis = LB.vider(document.getElementById("kpis"));
    [
      [String(actifs.length), "chantiers actifs", null],
      [moy + " %", "avancement moyen des chantiers actifs", null],
      [enPlace + " / " + utiles.length, "outils en place", "carte.html"]
    ].forEach(function (k) {
      kpis.appendChild(el("div", { class: "kpi" }, [
        el("span", { class: "kpi__val", text: k[0] }),
        el("span", { class: "kpi__lbl", text: k[1] }),
        k[2] ? el("p", {}, [el("a", { href: k[2], text: "Ouvrir la carte des outils" })]) : null
      ]));
    });
  }

  function afficherChantiers(chantiers) {
    LB.vider(liste);
    if (!chantiers.length) {
      liste.appendChild(el("p", { class: "vide", text: LB.estEquipe()
        ? "Aucun chantier pour l'instant. Créez le premier avec le bouton « Nouveau chantier »."
        : "Aucun chantier n'est encore associé à votre compte. Ligne&Bati l'ajoutera dès le démarrage de votre projet." }));
      return;
    }
    chantiers.forEach(function (c) {
      var meta = [c.reference, c.commune].filter(Boolean).join(" · ");
      if (LB.estEquipe()) meta = [meta, c.client && c.client.nom_complet ? "Client : " + c.client.nom_complet : "Sans client"].filter(Boolean).join(" · ");
      liste.appendChild(el("a", { class: "carte-chantier", href: "chantier.html?id=" + encodeURIComponent(c.id) }, [
        el("div", { class: "carte-chantier__top" }, [
          el("h3", { text: c.titre }),
          el("span", { class: "badge badge--" + c.statut, text: LB.LIBELLES_STATUT[c.statut] || c.statut })
        ]),
        meta ? el("p", { class: "carte-chantier__meta", text: meta }) : null,
        el("div", { class: "carte-chantier__pct" }, [
          el("span", { text: "Avancement" }), el("strong", { text: c.avancement + " %" })
        ]),
        LB.barre(c.avancement, "Avancement de " + c.titre),
        LB.frise(c.statut),
        el("p", { class: "carte-chantier__meta", text: c.date_fin_prevue ? "Fin prévue : " + LB.date(c.date_fin_prevue) : "Dates à préciser" })
      ]));
    });
    LB.appliquerBarres(liste);
  }

  /* ---------- Création d'un chantier (équipe) ---------------------------- */
  function initCreation() {
    var bouton = document.getElementById("btn-nouveau");
    var form = document.getElementById("form-chantier");
    var select = document.getElementById("c-client");

    LB.sb.from("profils").select("id, nom_complet, email").eq("role", "client").order("nom_complet")
      .then(function (r) {
        (r.data || []).forEach(function (p) {
          select.appendChild(el("option", { value: p.id, text: (p.nom_complet || "Sans nom") + (p.email ? " — " + p.email : "") }));
        });
      });

    function basculer(ouvrir) {
      form.hidden = !ouvrir;
      bouton.setAttribute("aria-expanded", String(ouvrir));
      if (ouvrir) form.querySelector("#c-titre").focus();
    }
    bouton.addEventListener("click", function () { basculer(form.hidden); });
    document.getElementById("btn-annuler").addEventListener("click", function () { basculer(false); bouton.focus(); });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var titre = form.titre.value.trim();
      if (!titre) { LB.etat(etat, "error", "L'intitulé du chantier est obligatoire."); form.titre.focus(); return; }
      var valider = form.querySelector('[type="submit"]');
      valider.disabled = true;
      var donnees = {
        titre: titre,
        reference: form.reference.value.trim() || null,
        commune: form.commune.value.trim() || null,
        client_id: form.client_id.value || null,
        date_debut: form.date_debut.value || null,
        date_fin_prevue: form.date_fin_prevue.value || null
      };
      LB.sb.from("chantiers").insert(donnees).select("id").single().then(function (r) {
        if (r.error) throw r.error;
        var id = r.data.id;
        if (!form.jalons_types.checked) return id;
        var jalons = JALONS_TYPES.map(function (t, i) { return { chantier_id: id, titre: t, ordre: i + 1 }; });
        return LB.sb.from("jalons").insert(jalons).then(function (j) { if (j.error) throw j.error; return id; });
      }).then(function (id) {
        window.location.href = "chantier.html?id=" + encodeURIComponent(id);
      }).catch(function (err) {
        var msg = /duplicate key.*reference/i.test(err.message || "") ? "Cette référence est déjà utilisée par un autre chantier." : LB.erreur(err);
        LB.etat(etat, "error", msg);
        valider.disabled = false;
      });
    });
  }
})();
