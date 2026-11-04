-- SÉNEVÉ 063 — Abonnements Sénevé, Sénevé Plus et Accompagnement, au mois ou à l'année
-- (maquette « Mon abonnement » validée par Dr Justin le 04/11/2026 ; « Prépare l'application »).
-- Ajouts seulement. Les achats existants (livre, formations, Continuité) ne changent pas.
-- * 12 offres ABONNEMENT_<SENEVE|PLUS|ACCOMP>_<MOIS|AN>_<FR|EN>, sans produit Chariow tant que Dr Justin
--   ne les a pas créés (aucun achat possible avant).
-- * Un abonnement ouvre les mois Habitudes & Défis comme Continuité. À l'année : 1 mois tout de suite,
--   puis les 11 suivants s'ouvrent seuls, chacun à la fin du précédent, tant que l'année court.
-- * seneve.abonnements garde la période payée (affichage « Mon abonnement », droits livre).
-- * Sénevé Plus et Accompagnement ouvrent le livre PDF et audio ; Sénevé à l'année offre le PDF.
-- Retour arrière en fin de fichier.

-- 1. Offres (prix validés sur la maquette ; actives pour l'affichage, sans lien d'achat).
insert into seneve.offers (offre_id, produit, type_offre, langue, programme_id, chariow_product_id, prix, devise, duree_acces_jours, actif)
select 'ABONNEMENT_'||f.code||'_'||p.code||'_'||upper(l.langue),
       case l.langue when 'fr' then f.nom_fr else f.nom_en end,
       'abonnement', l.langue, null, null,
       case p.code when 'MOIS' then f.mois else f.an end, 'USD',
       case p.code when 'MOIS' then 30 else 365 end, true
  from (values ('SENEVE','Sénevé','Sénevé',5,50),('PLUS','Sénevé Plus','Sénevé Plus',20,200),('ACCOMP','Accompagnement','Mentoring',200,2000))
       f(code,nom_fr,nom_en,mois,an)
 cross join (values ('MOIS'),('AN')) p(code)
 cross join (values ('fr'),('en')) l(langue)
on conflict (offre_id) do nothing;

-- 2. Chaque abonnement ouvre les mois 2 à 6 de Habitudes & Défis (puis un nouveau cycle), comme Continuité.
insert into seneve.hd_offres_mensuelles (module_id, module_version, langue, offre_id, mois_min, mois_max, actif, note, nouveau_cycle)
select c.module_id, c.module_version, c.langue, o.offre_id, c.mois_min, c.mois_max, true,
       'Abonnements du 04/11/2026 (maquette « Mon abonnement »)', c.nouveau_cycle
  from seneve.hd_offres_mensuelles c
  join seneve.offers o on o.offre_id like 'ABONNEMENT_%' and o.langue = c.langue
 where c.offre_id like 'CONTINUITE_MENSUEL_%'
on conflict do nothing;

-- 3. Période payée de chaque abonnement.
create table if not exists seneve.abonnements (
  abonnement_id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references seneve.participants(participant_id) on delete cascade,
  offre_id text not null references seneve.offers(offre_id),
  formule text not null check (formule in ('senev','plus','accompagnement')),
  periode text not null check (periode in ('mois','an')),
  payment_event_id uuid unique references seneve.payment_events(payment_event_id),
  entitlement_id uuid unique references seneve.entitlements(entitlement_id) on delete set null,
  debut timestamptz not null,
  fin timestamptz not null,
  cree_le timestamptz not null default now(),
  check (fin > debut));
create index if not exists abonnements_participant_idx on seneve.abonnements (participant_id, fin desc);
alter table seneve.abonnements enable row level security;
drop policy if exists abonnements_lire_les_miens on seneve.abonnements;
create policy abonnements_lire_les_miens on seneve.abonnements for select to authenticated
  using (participant_id = (select seneve.current_participant_id()) or (select seneve.has_role('administrateur')));
grant select on seneve.abonnements to authenticated;

-- 4. Mois suivants d'un abonnement annuel : droits « enfants », ouverts un par un.
alter table seneve.entitlements add column if not exists parent_entitlement_id uuid references seneve.entitlements(entitlement_id) on delete cascade;
create index if not exists entitlements_parent_idx on seneve.entitlements (parent_entitlement_id) where parent_entitlement_id is not null;

-- 5. Un droit enfant d'abonnement annuel peut ouvrir un mois HD (en plus des achats directs).
do $$
declare s text; ancien text := 'if d.etat<>''actif'' or d.origine<>''achat'' or d.payment_event_id is null then';
begin
  s := pg_get_functiondef('seneve._ouvrir_mois_habitudes(uuid,uuid)'::regprocedure);
  if position(ancien in s) = 0 then raise exception 'seneve_063 : contrôle du droit introuvable dans _ouvrir_mois_habitudes'; end if;
  s := replace(s, ancien, 'if d.etat<>''actif'' or not ((d.origine=''achat'' and d.payment_event_id is not null) or (d.origine=''abonnement'' and d.parent_entitlement_id is not null)) then');
  execute s;
end $$;

-- 5 bis. Le contrôle des périodes HD accepte aussi ces droits enfants d'abonnement annuel.
do $
declare s text;
  a1 text := 'if d.origine<>''achat'' or d.payment_event_id is null or d.etat=''revoque'' then';
  a2 text := '(new.mois>1 and (d.origine<>''achat'' or d.payment_event_id is null))';
  ok text := '((d.origine=''achat'' and d.payment_event_id is not null) or (d.origine=''abonnement'' and d.parent_entitlement_id is not null))';
begin
  s := pg_get_functiondef('seneve.hd_validate_access_period()'::regprocedure);
  if position('parent_entitlement_id' in s) = 0 then
    if position(a1 in s) = 0 or position(a2 in s) = 0 then raise exception 'seneve_063 : contrôle introuvable dans hd_validate_access_period'; end if;
    s := replace(s, a1, 'if not ' || ok || ' or d.etat=''revoque'' then');
    s := replace(s, a2, '(new.mois>1 and not ' || ok || ')');
    execute s;
  end if;
end $;

-- 6. Ouverture d'un abonnement payé : période, premier mois HD, et 11 mois à venir pour l'année.
do $$
declare s text; repere text := '  update seneve.payment_events set participant_id = p_participant_id, statut_traitement = ''acces_ouvert''';
  bloc text := $bloc$
  -- seneve_063 : abonnements Sénevé / Plus / Accompagnement.
  if v_offre.offre_id like 'ABONNEMENT_%' then
    insert into seneve.abonnements (participant_id, offre_id, formule, periode, payment_event_id, entitlement_id, debut, fin)
    select p_participant_id, v_offre.offre_id,
           case split_part(v_offre.offre_id,'_',2) when 'SENEVE' then 'senev' when 'PLUS' then 'plus' else 'accompagnement' end,
           case split_part(v_offre.offre_id,'_',3) when 'AN' then 'an' else 'mois' end,
           p_payment_event_id, v_ent, x.debut, x.debut + make_interval(days => coalesce(v_offre.duree_acces_jours, 30))
      from (select greatest(now(), coalesce((select max(a.fin) from seneve.abonnements a where a.participant_id = p_participant_id), now())) debut) x
    on conflict (payment_event_id) do nothing;
    if split_part(v_offre.offre_id,'_',3) = 'AN' then
      insert into seneve.entitlements (participant_id, offre_id, origine, etat, debut, fin, parent_entitlement_id)
      select p_participant_id, v_offre.offre_id, 'abonnement', 'actif', v_paye_le, null, v_ent
        from generate_series(1, 11)
       where not exists (select 1 from seneve.entitlements c where c.parent_entitlement_id = v_ent);
    end if;
    begin
      v_hd := seneve._ouvrir_mois_habitudes(p_participant_id, v_ent);
    exception when others then
      v_hd := jsonb_build_object('ouvert', false, 'motif', 'erreur', 'detail', sqlerrm);
    end;
  end if;
$bloc$;
begin
  s := pg_get_functiondef('seneve._ouvrir_acces(uuid,uuid)'::regprocedure);
  if position(repere in s) = 0 then raise exception 'seneve_063 : repère introuvable dans _ouvrir_acces'; end if;
  if position('seneve_063' in s) = 0 then s := replace(s, repere, bloc || repere); end if;
  execute s;
end $$;

-- 7. Chaque jour : pour les abonnements annuels en cours, ouvrir le mois HD suivant quand le précédent finit.
create or replace function seneve_private.abonnements_ouvrir_mois_suivants()
returns integer language plpgsql security definer set search_path = '' as $$
declare r record; n integer := 0; v jsonb;
begin
  for r in
    select distinct on (c.participant_id) c.participant_id, c.entitlement_id
      from seneve.entitlements c
      join seneve.abonnements a on a.entitlement_id = c.parent_entitlement_id
     where c.origine = 'abonnement' and c.etat = 'actif' and a.fin > now()
       and not exists (select 1 from seneve.hd_access_periods p where p.entitlement_id = c.entitlement_id)
       and not exists (select 1 from seneve.hd_cycles_planifies q where q.entitlement_id = c.entitlement_id)
       -- le mois HD en cours se termine dans moins d'un jour (ou est fini)
       and coalesce((select max(p.fin_exclue) from seneve.hd_access_periods p where p.participant_id = c.participant_id), now()) <= now() + interval '1 day'
     order by c.participant_id, c.cree_le, c.entitlement_id
  loop
    begin
      v := seneve._ouvrir_mois_habitudes(r.participant_id, r.entitlement_id);
      if coalesce((v->>'ouvert')::boolean, false) or v->>'nouveau_cycle' = 'planifie' then n := n + 1; end if;
    exception when others then
      insert into seneve.audit_events (acteur, action, objet, resultat, details)
      values ('systeme', 'abonnement_mois_suivant', 'entitlement:' || r.entitlement_id, 'erreur', jsonb_build_object('code', sqlstate));
    end;
  end loop;
  return n;
end $$;
revoke all on function seneve_private.abonnements_ouvrir_mois_suivants() from public, anon, authenticated;

-- 8. Livre : Sénevé Plus et Accompagnement ouvrent PDF et audio ; Sénevé à l'année offre le PDF.
create or replace function seneve.livre_acces(p_offre text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid()); v_email text; v_part uuid;
begin
  if v_uid is null or p_offre is null or p_offre not in ('LIVRE_PDF_FR','LIVRE_PDF_EN','LIVRE_AUDIO_FR','LIVRE_AUDIO_EN') then return false; end if;
  if seneve.has_role('administrateur') then return true; end if;
  select lower(email) into v_email from auth.users where id = v_uid and email_confirmed_at is not null;
  v_part := seneve.current_participant_id();
  if v_part is not null and exists (select 1 from seneve.abonnements a where a.participant_id = v_part and a.debut <= now() and a.fin > now()
       and (a.formule in ('plus','accompagnement') or (a.formule = 'senev' and a.periode = 'an' and p_offre like 'LIVRE_PDF_%'))) then
    return true;
  end if;
  return exists (select 1 from seneve.payment_events pe
    where pe.offre_id = p_offre and pe.signature_verifiee and pe.statut_traitement = 'acces_ouvert'
      and ((v_part is not null and pe.participant_id = v_part) or (v_email is not null and pe.email_acheteur = v_email)));
end $$;

-- 9. « Mon abonnement » : formule en cours (ou la dernière), mois gratuit, achats.
create or replace function seneve.mon_abonnement()
returns jsonb language sql stable security definer set search_path = '' as $$
  with moi as (select seneve.current_participant_id() p),
  ab as (select a.* from seneve.abonnements a, moi where a.participant_id = moi.p
          order by (a.debut <= now() and a.fin > now()) desc, a.fin desc limit 1),
  fin_totale as (select max(a.fin) f from seneve.abonnements a, moi where a.participant_id = moi.p),
  gratuit as (select p.debut, p.fin_exclue from seneve.hd_access_periods p, moi where p.participant_id = moi.p and p.mois = 1 order by p.cycle desc limit 1)
  select jsonb_build_object(
    'formule', coalesce((select formule from ab), 'graine'),
    'periode', (select periode from ab),
    'debut', coalesce((select debut from ab), (select debut from gratuit)),
    'fin', coalesce((select f from fin_totale where (select formule from ab) is not null), (select fin_exclue from gratuit)),
    'achats', coalesce((select jsonb_agg(jsonb_build_object('offre_id', e.offre_id, 'produit', o.produit, 'type_offre', o.type_offre, 'le', e.debut) order by e.debut desc)
       from seneve.entitlements e join seneve.offers o on o.offre_id = e.offre_id, moi
      where e.participant_id = moi.p and e.origine = 'achat' and e.etat <> 'revoque' and o.type_offre <> 'abonnement'
        and e.offre_id not like 'CONTINUITE_%'), '[]'::jsonb),
    'liens', coalesce((select jsonb_object_agg(o.offre_id, o.lien_achat) from seneve.offers o where o.offre_id like 'ABONNEMENT_%' and o.lien_achat is not null), '{}'::jsonb))
$$;
revoke all on function seneve.mon_abonnement() from public, anon;
grant execute on function seneve.mon_abonnement() to authenticated;

-- Retour arrière (dans l'ordre) :
-- select cron.unschedule('abonnements-mois-suivants');  -- si la tâche a été planifiée
-- drop function if exists seneve.mon_abonnement(); drop function if exists seneve_private.abonnements_ouvrir_mois_suivants();
-- remettre seneve.livre_acces, hd_validate_access_period, _ouvrir_mois_habitudes et _ouvrir_acces depuis seneve_061 et la sauvegarde précédente ;
-- delete from seneve.hd_offres_mensuelles where offre_id like 'ABONNEMENT_%'; drop table seneve.abonnements;
-- alter table seneve.entitlements drop column parent_entitlement_id; delete from seneve.offers where offre_id like 'ABONNEMENT_%';
