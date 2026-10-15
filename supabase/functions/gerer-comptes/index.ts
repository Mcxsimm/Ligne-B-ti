// ============================================================================
// Ligne&Bati — Fonction serveur « gerer-comptes »
// ----------------------------------------------------------------------------
// Réservée aux administrateurs. Permet de :
//   - creer        : créer un compte (client ou salarié) avec un mot de passe
//                    provisoire, que la personne devra changer à sa première
//                    connexion ;
//   - reinitialiser: générer un nouveau mot de passe provisoire.
// La clé de service n'existe que côté serveur (variable d'environnement
// fournie par Supabase) : elle n'apparaît jamais dans le site.
// ============================================================================
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const ENTETES = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function reponse(statut: number, corps: Record<string, unknown>) {
  return new Response(JSON.stringify(corps), { status: statut, headers: ENTETES });
}

// Mot de passe provisoire lisible : 4 groupes de 4 caractères sans ambiguïté
function motDePasseProvisoire(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const octets = crypto.getRandomValues(new Uint8Array(16));
  const car = Array.from(octets, (o) => alphabet[o % alphabet.length]).join("");
  return car.match(/.{4}/g)!.join("-");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: ENTETES });
  if (req.method !== "POST") return reponse(405, { erreur: "Méthode non autorisée." });

  const url = Deno.env.get("SUPABASE_URL")!;
  const cleService = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const jeton = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jeton) return reponse(401, { erreur: "Connexion requise." });

  const admin = createClient(url, cleService, { auth: { persistSession: false } });

  // 1. Identifier l'appelant et vérifier qu'il est administrateur
  const { data: appelant, error: errAppelant } = await admin.auth.getUser(jeton);
  if (errAppelant || !appelant?.user) return reponse(401, { erreur: "Session invalide." });
  const { data: profilAppelant } = await admin
    .from("profils").select("role").eq("id", appelant.user.id).single();
  if (profilAppelant?.role !== "admin") {
    return reponse(403, { erreur: "Action réservée aux administrateurs." });
  }

  let corps: Record<string, unknown>;
  try {
    corps = await req.json();
  } catch {
    return reponse(400, { erreur: "Requête invalide." });
  }

  const action = String(corps.action ?? "");

  // 2. Création d'un compte
  if (action === "creer") {
    const email = String(corps.email ?? "").trim().toLowerCase();
    const nom = String(corps.nom_complet ?? "").trim().slice(0, 120);
    const role = String(corps.role ?? "client");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return reponse(400, { erreur: "Adresse e-mail invalide." });
    if (!nom) return reponse(400, { erreur: "Le nom est obligatoire." });
    if (!["client", "salarie"].includes(role)) return reponse(400, { erreur: "Rôle invalide." });

    const mdp = motDePasseProvisoire();
    const { data: cree, error } = await admin.auth.admin.createUser({
      email,
      password: mdp,
      email_confirm: true,
      user_metadata: { nom_complet: nom },
    });
    if (error || !cree?.user) {
      const deja = /already|registered|exists/i.test(error?.message ?? "");
      return reponse(deja ? 409 : 500, {
        erreur: deja ? "Un compte existe déjà avec cette adresse." : "La création du compte a échoué.",
      });
    }
    // Le profil est créé par déclencheur ; on fixe le rôle et l'obligation de changer le mot de passe.
    const { error: errProfil } = await admin.from("profils")
      .update({ role, nom_complet: nom, doit_changer_mdp: true })
      .eq("id", cree.user.id);
    if (errProfil) return reponse(500, { erreur: "Compte créé, mais le rôle n'a pas pu être enregistré." });

    return reponse(200, { id: cree.user.id, email, mot_de_passe_provisoire: mdp });
  }

  // 3. Nouveau mot de passe provisoire
  if (action === "reinitialiser") {
    const id = String(corps.id ?? "");
    if (!/^[0-9a-f-]{36}$/.test(id)) return reponse(400, { erreur: "Identifiant invalide." });
    if (id === appelant.user.id) {
      return reponse(400, { erreur: "Utilisez « Changer mon mot de passe » pour votre propre compte." });
    }
    const mdp = motDePasseProvisoire();
    const { error } = await admin.auth.admin.updateUserById(id, { password: mdp });
    if (error) return reponse(500, { erreur: "La réinitialisation a échoué." });
    await admin.from("profils").update({ doit_changer_mdp: true }).eq("id", id);
    return reponse(200, { id, mot_de_passe_provisoire: mdp });
  }

  return reponse(400, { erreur: "Action inconnue." });
});
