-- ============================================================================
-- Ligne&Bati — Espace connecté : schéma et règles d'accès
-- ----------------------------------------------------------------------------
-- Trois rôles :
--   admin   : gère les comptes, les chantiers et la carte des outils
--   salarie : voit et met à jour tous les chantiers et la carte des outils
--   client  : voit uniquement ses chantiers et les éléments marqués visibles
-- Toutes les tables sont protégées par la sécurité au niveau des lignes (RLS).
-- ============================================================================

create type public.role_utilisateur as enum ('admin', 'salarie', 'client');
create type public.statut_chantier as enum ('preparation', 'consultation', 'travaux', 'reception', 'termine', 'suspendu');

-- ---------------------------------------------------------------------------
-- Profils (un par compte utilisateur)
-- ---------------------------------------------------------------------------
create table public.profils (
  id uuid primary key references auth.users (id) on delete cascade,
  nom_complet text not null default '',
  email text,
  role public.role_utilisateur not null default 'client',
  doit_changer_mdp boolean not null default false,
  created_at timestamptz not null default now()
);

-- Fonctions d'aide utilisées par les règles d'accès.
-- SECURITY DEFINER : lisent le rôle sans être bloquées par la RLS des profils.
create function public.role_courant()
returns public.role_utilisateur
language sql stable security definer set search_path = ''
as $$
  select role from public.profils where id = (select auth.uid())
$$;

create function public.est_equipe()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(
    (select role in ('admin', 'salarie') from public.profils where id = (select auth.uid())),
    false)
$$;

create function public.est_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(
    (select role = 'admin' from public.profils where id = (select auth.uid())),
    false)
$$;

-- Création automatique du profil à la création d'un compte.
-- Le rôle n'est jamais lu depuis les données fournies par l'utilisateur :
-- tout nouveau compte est « client » ; seul un admin peut le promouvoir.
create function public.creer_profil()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profils (id, nom_complet, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nom_complet', ''), new.email);
  return new;
end;
$$;

create trigger profil_a_la_creation
after insert on auth.users
for each row execute function public.creer_profil();

-- Empêche un utilisateur de modifier son propre rôle.
-- Les opérations serveur (clé de service, console SQL) n'ont pas d'auth.uid()
-- et restent autorisées, ce qui permet de désigner le premier administrateur.
create function public.proteger_role()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.role is distinct from old.role
     and (select auth.uid()) is not null
     and not public.est_admin() then
    raise exception 'Seul un administrateur peut modifier un rôle.';
  end if;
  if new.id = (select auth.uid()) and new.role is distinct from old.role then
    raise exception 'Un administrateur ne peut pas modifier son propre rôle.';
  end if;
  return new;
end;
$$;

create trigger profil_protection_role
before update on public.profils
for each row execute function public.proteger_role();

-- ---------------------------------------------------------------------------
-- Chantiers
-- ---------------------------------------------------------------------------
create table public.chantiers (
  id uuid primary key default gen_random_uuid(),
  reference text unique,
  titre text not null,
  commune text,
  client_id uuid references public.profils (id) on delete set null,
  statut public.statut_chantier not null default 'preparation',
  avancement smallint not null default 0 check (avancement between 0 and 100),
  date_debut date,
  date_fin_prevue date,
  description text,
  message_client text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index chantiers_client_idx on public.chantiers (client_id);

-- Jalons (étapes du chantier) : base du calcul d'avancement
create table public.jalons (
  id uuid primary key default gen_random_uuid(),
  chantier_id uuid not null references public.chantiers (id) on delete cascade,
  ordre integer not null default 0,
  titre text not null,
  date_prevue date,
  date_reelle date,
  statut text not null default 'a_venir' check (statut in ('a_venir', 'en_cours', 'termine')),
  visible_client boolean not null default true,
  created_at timestamptz not null default now()
);

create index jalons_chantier_idx on public.jalons (chantier_id);

-- Journal de chantier (comptes rendus, notes, décisions)
create table public.journal (
  id uuid primary key default gen_random_uuid(),
  chantier_id uuid not null references public.chantiers (id) on delete cascade,
  date_entree date not null default current_date,
  titre text not null,
  contenu text,
  visible_client boolean not null default false,
  auteur_id uuid references public.profils (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create index journal_chantier_idx on public.journal (chantier_id);
create index journal_auteur_idx on public.journal (auteur_id);

-- Avancement recalculé automatiquement : part des jalons terminés
create function public.recalculer_avancement()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  cible uuid := coalesce(new.chantier_id, old.chantier_id);
begin
  update public.chantiers c
     set avancement = coalesce((
           select round(100.0 * count(*) filter (where j.statut = 'termine') / nullif(count(*), 0))
             from public.jalons j where j.chantier_id = cible), 0),
         updated_at = now()
   where c.id = cible;
  return null;
end;
$$;

create trigger jalons_avancement
after insert or update or delete on public.jalons
for each row execute function public.recalculer_avancement();

create function public.horodater()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger chantiers_horodatage
before update on public.chantiers
for each row execute function public.horodater();

-- ---------------------------------------------------------------------------
-- Carte des outils (usage interne : admin et salariés)
-- ---------------------------------------------------------------------------
create table public.outils (
  id uuid primary key default gen_random_uuid(),
  categorie text not null,
  nom text not null,
  description text,
  statut text not null default 'a_faire' check (statut in ('a_faire', 'en_cours', 'en_place', 'non_concerne')),
  priorite smallint not null default 2 check (priorite between 1 and 3),
  lien text,
  notes text,
  ordre integer not null default 0,
  updated_at timestamptz not null default now()
);

create trigger outils_horodatage
before update on public.outils
for each row execute function public.horodater();

-- ---------------------------------------------------------------------------
-- Sécurité au niveau des lignes
-- ---------------------------------------------------------------------------
alter table public.profils   enable row level security;
alter table public.chantiers enable row level security;
alter table public.jalons    enable row level security;
alter table public.journal   enable row level security;
alter table public.outils    enable row level security;

-- Les visiteurs non connectés n'ont accès à rien
revoke all on public.profils, public.chantiers, public.jalons, public.journal, public.outils from anon;

-- Profils
create policy "profils : lecture de soi ou par l'équipe" on public.profils
  for select to authenticated
  using (id = (select auth.uid()) or (select public.est_equipe()));
create policy "profils : modification de soi ou par un admin" on public.profils
  for update to authenticated
  using (id = (select auth.uid()) or (select public.est_admin()))
  with check (id = (select auth.uid()) or (select public.est_admin()));
create policy "profils : suppression par un admin" on public.profils
  for delete to authenticated
  using ((select public.est_admin()));

-- Chantiers
create policy "chantiers : lecture équipe ou client concerné" on public.chantiers
  for select to authenticated
  using ((select public.est_equipe()) or client_id = (select auth.uid()));
create policy "chantiers : création par l'équipe" on public.chantiers
  for insert to authenticated
  with check ((select public.est_equipe()));
create policy "chantiers : modification par l'équipe" on public.chantiers
  for update to authenticated
  using ((select public.est_equipe()))
  with check ((select public.est_equipe()));
create policy "chantiers : suppression par un admin" on public.chantiers
  for delete to authenticated
  using ((select public.est_admin()));

-- Jalons
create policy "jalons : lecture équipe ou client (éléments visibles)" on public.jalons
  for select to authenticated
  using (
    (select public.est_equipe())
    or (visible_client and exists (
      select 1 from public.chantiers c
       where c.id = chantier_id and c.client_id = (select auth.uid())))
  );
create policy "jalons : écriture par l'équipe" on public.jalons
  for all to authenticated
  using ((select public.est_equipe()))
  with check ((select public.est_equipe()));

-- Journal
create policy "journal : lecture équipe ou client (éléments visibles)" on public.journal
  for select to authenticated
  using (
    (select public.est_equipe())
    or (visible_client and exists (
      select 1 from public.chantiers c
       where c.id = chantier_id and c.client_id = (select auth.uid())))
  );
create policy "journal : écriture par l'équipe" on public.journal
  for all to authenticated
  using ((select public.est_equipe()))
  with check ((select public.est_equipe()));

-- Outils
create policy "outils : lecture et mise à jour par l'équipe" on public.outils
  for select to authenticated
  using ((select public.est_equipe()));
create policy "outils : modification par l'équipe" on public.outils
  for update to authenticated
  using ((select public.est_equipe()))
  with check ((select public.est_equipe()));
create policy "outils : ajout par un admin" on public.outils
  for insert to authenticated
  with check ((select public.est_admin()));
create policy "outils : suppression par un admin" on public.outils
  for delete to authenticated
  using ((select public.est_admin()));

-- Les fonctions d'aide ne sont utilisables que par les comptes connectés
revoke execute on function public.role_courant(), public.est_equipe(), public.est_admin() from public, anon;
grant execute on function public.role_courant(), public.est_equipe(), public.est_admin() to authenticated;
revoke execute on function public.creer_profil(), public.proteger_role(), public.recalculer_avancement(), public.horodater() from public, anon, authenticated;
