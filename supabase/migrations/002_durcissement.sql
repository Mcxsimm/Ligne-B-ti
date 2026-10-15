-- ============================================================================
-- Durcissement suite à l'analyse de sécurité Supabase
-- Les fonctions d'aide passent dans un schéma « prive », non exposé par l'API
-- (/rest/v1/rpc). Les règles existantes sont modifiées pour les utiliser et
-- les anciennes fonctions publiques ne sont plus exécutables.
-- ============================================================================

create schema if not exists prive;
grant usage on schema prive to authenticated;

create function prive.est_equipe()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(
    (select role in ('admin', 'salarie') from public.profils where id = (select auth.uid())),
    false)
$$;

create function prive.est_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(
    (select role = 'admin' from public.profils where id = (select auth.uid())),
    false)
$$;

revoke execute on function prive.est_equipe(), prive.est_admin() from public, anon;
grant execute on function prive.est_equipe(), prive.est_admin() to authenticated;

create or replace function public.proteger_role()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.role is distinct from old.role
     and (select auth.uid()) is not null
     and not prive.est_admin() then
    raise exception 'Seul un administrateur peut modifier un rôle.';
  end if;
  if new.id = (select auth.uid()) and new.role is distinct from old.role then
    raise exception 'Un administrateur ne peut pas modifier son propre rôle.';
  end if;
  return new;
end;
$$;

alter policy "profils : lecture de soi ou par l'équipe" on public.profils
  using (id = (select auth.uid()) or (select prive.est_equipe()));
alter policy "profils : modification de soi ou par un admin" on public.profils
  using (id = (select auth.uid()) or (select prive.est_admin()))
  with check (id = (select auth.uid()) or (select prive.est_admin()));
alter policy "profils : suppression par un admin" on public.profils
  using ((select prive.est_admin()));

alter policy "chantiers : lecture équipe ou client concerné" on public.chantiers
  using ((select prive.est_equipe()) or client_id = (select auth.uid()));
alter policy "chantiers : création par l'équipe" on public.chantiers
  with check ((select prive.est_equipe()));
alter policy "chantiers : modification par l'équipe" on public.chantiers
  using ((select prive.est_equipe())) with check ((select prive.est_equipe()));
alter policy "chantiers : suppression par un admin" on public.chantiers
  using ((select prive.est_admin()));

alter policy "jalons : lecture équipe ou client (éléments visibles)" on public.jalons
  using ((select prive.est_equipe())
         or (visible_client and exists (select 1 from public.chantiers c
              where c.id = chantier_id and c.client_id = (select auth.uid()))));
alter policy "jalons : écriture par l'équipe" on public.jalons
  using ((select prive.est_equipe())) with check ((select prive.est_equipe()));

alter policy "journal : lecture équipe ou client (éléments visibles)" on public.journal
  using ((select prive.est_equipe())
         or (visible_client and exists (select 1 from public.chantiers c
              where c.id = chantier_id and c.client_id = (select auth.uid()))));
alter policy "journal : écriture par l'équipe" on public.journal
  using ((select prive.est_equipe())) with check ((select prive.est_equipe()));

alter policy "outils : lecture et mise à jour par l'équipe" on public.outils
  using ((select prive.est_equipe()));
alter policy "outils : modification par l'équipe" on public.outils
  using ((select prive.est_equipe())) with check ((select prive.est_equipe()));
alter policy "outils : ajout par un admin" on public.outils
  with check ((select prive.est_admin()));
alter policy "outils : suppression par un admin" on public.outils
  using ((select prive.est_admin()));

revoke execute on function public.role_courant(), public.est_equipe(), public.est_admin() from authenticated, anon, public;
