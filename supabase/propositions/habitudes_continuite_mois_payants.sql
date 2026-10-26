-- Habitudes & Défis — mois 2 à 6 inclus dans l'abonnement de continuité
-- Décision Dr Justin Tshims du 26/10/2026 : « cela est inclus dans l'abonnement de continuité »
-- puis « oui il faut ouvrir le deux » (un achat Continuité ouvre ses contenus ET le mois HD suivant).
--
-- Appliquée d'abord sur seneve-test uniquement. Restauration : habitudes_continuite_mois_payants_retour.sql
-- (les définitions d'origine sont aussi copiées dans seneve_private.sauvegardes_definitions).
--
-- Ce que fait la migration :
--  1. Table hd_offres_mensuelles : offres acceptées comme droit d'un mois payant HD (mois 2 à 6 seulement).
--  2. Fonction hd_offre_acceptee : règle unique « cette offre ouvre-t-elle ce mois de ce programme HD ? ».
--  3. Les gardes existantes (validation des périodes, droit courant, pré-contrôle des rappels) utilisent
--     cette règle au lieu d'exiger que l'offre porte le programme HD lui-même. Le reste est inchangé
--     (droit actif, achat vérifié, dates, chevauchements). Le coach n'est PAS modifié (décision en attente).
--  4. _ouvrir_mois_habitudes : à l'achat Continuité, ouvre le mois HD suivant (≤ 6) si le participant
--     a une inscription HD active ou en pause avec son mois gratuit ; idempotent par droit.
--  5. _ouvrir_acces l'appelle après l'ouverture Continuité ; un échec HD n'empêche pas Continuité et est
--     inscrit dans le journal d'audit.
--  6. Révocation (remboursement) d'un droit : le mois HD qu'il ouvrait est retiré, la fin prévue de
--     l'inscription est recalculée, l'historique de progression est conservé.

begin;

create table if not exists seneve_private.sauvegardes_definitions (
  sauvegarde_id bigserial primary key,
  objet text not null,
  definition text not null,
  motif text not null,
  sauvegarde_le timestamptz not null default now()
);
revoke all on seneve_private.sauvegardes_definitions from public, anon, authenticated;

insert into seneve_private.sauvegardes_definitions (objet, definition, motif)
select p.oid::regprocedure::text, pg_get_functiondef(p.oid), 'avant habitudes_continuite_mois_payants'
  from pg_proc p
 where p.oid in ('seneve._ouvrir_acces(uuid,uuid)'::regprocedure,
                 'seneve.hd_has_current_right(uuid)'::regprocedure,
                 'seneve.hd_reminder_precheck(uuid)'::regprocedure,
                 'seneve.hd_validate_access_period()'::regprocedure);

-- 1. Offres acceptées pour les mois payants
create table seneve.hd_offres_mensuelles (
  module_id text not null,
  module_version integer not null,
  langue text not null,
  offre_id text not null references seneve.offers(offre_id),
  mois_min smallint not null default 2,
  mois_max smallint not null default 6,
  actif boolean not null default true,
  note text,
  cree_le timestamptz not null default now(),
  primary key (module_id, module_version, langue, offre_id),
  foreign key (module_id, module_version, langue) references seneve.hd_modules(module_id, version, langue),
  check (mois_min >= 2 and mois_max <= 6 and mois_min <= mois_max)
);
alter table seneve.hd_offres_mensuelles enable row level security;
revoke all on seneve.hd_offres_mensuelles from public, anon, authenticated;

insert into seneve.hd_offres_mensuelles (module_id, module_version, langue, offre_id, mois_min, mois_max, note)
values ('HABITUDES_DEFIS', 1, 'fr', 'CONTINUITE_MENSUEL_FR', 2, 6,
        'Décision 26/10/2026 : mois 2 à 6 inclus dans l''abonnement de continuité');

-- 2. Règle unique
create or replace function seneve.hd_offre_acceptee(p_offre_id text, p_programme_id text, p_version integer, p_langue text, p_mois integer)
returns boolean language sql stable security definer set search_path to '' as $$
 select exists(select 1 from seneve.offers o where o.offre_id=p_offre_id and o.programme_id=p_programme_id and o.langue=p_langue)
     or exists(select 1 from seneve.hd_offres_mensuelles a
                 join seneve.hd_programme_links l on l.module_id=a.module_id and l.module_version=a.module_version and l.langue=a.langue
                 join seneve.offers o on o.offre_id=a.offre_id and o.langue=a.langue
                where a.offre_id=p_offre_id and a.actif and l.programme_id=p_programme_id and l.version=p_version
                  and l.langue=p_langue and p_mois between a.mois_min and a.mois_max);
$$;
revoke all on function seneve.hd_offre_acceptee(text,text,integer,text,integer) from public, anon;
grant execute on function seneve.hd_offre_acceptee(text,text,integer,text,integer) to authenticated, service_role;

-- 3. Gardes existantes : remplacement textuel contrôlé (une seule occurrence attendue, sinon arrêt)
do $$
declare
  f text; d text; ancien text; nouveau text;
  j constant text := 'join seneve.offers o on o.offre_id=d.offre_id and o.programme_id=e.programme_id and o.langue=e.langue';
  jn constant text := 'join seneve.offers o on o.offre_id=d.offre_id and seneve.hd_offre_acceptee(o.offre_id,e.programme_id,e.version,e.langue,p.mois)';
begin
  foreach f in array array['seneve.hd_has_current_right(uuid)','seneve.hd_reminder_precheck(uuid)'] loop
    d := pg_get_functiondef(f::regprocedure);
    if (length(d) - length(replace(d, j, ''))) / length(j) <> 1 then raise exception 'Garde % : motif attendu introuvable ou multiple', f; end if;
    execute replace(d, j, jn);
  end loop;

  d := pg_get_functiondef('seneve.hd_validate_access_period()'::regprocedure);
  ancien := 'o.programme_id is distinct from e.programme_id or o.langue<>e.langue';
  nouveau := 'not seneve.hd_offre_acceptee(o.offre_id,e.programme_id,e.version,e.langue,new.mois)';
  if (length(d) - length(replace(d, ancien, ''))) / length(ancien) <> 1 then raise exception 'Validation : motif attendu introuvable'; end if;
  execute replace(d, ancien, nouveau);
end $$;

-- 4. Ouverture du mois HD suivant
create or replace function seneve._ouvrir_mois_habitudes(p_participant_id uuid, p_entitlement_id uuid)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
  d seneve.entitlements%rowtype; e seneve.enrollments%rowtype; v_max_mois int; v_mois int;
  v_debut timestamptz; v_fin timestamptz; v_fuseau text; v_fin_locale date; v_duree int; v_existant seneve.hd_access_periods%rowtype;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('hd-mois|'||p_participant_id::text,0));
  select * into d from seneve.entitlements where entitlement_id=p_entitlement_id and participant_id=p_participant_id;
  if not found then return jsonb_build_object('ouvert',false,'motif','droit_absent'); end if;
  select * into v_existant from seneve.hd_access_periods where entitlement_id=p_entitlement_id;
  if found then
    return jsonb_build_object('ouvert',false,'existant',true,'mois',v_existant.mois,'debut',v_existant.debut,'fin_exclue',v_existant.fin_exclue);
  end if;
  if d.etat<>'actif' or d.origine<>'achat' or d.payment_event_id is null then
    return jsonb_build_object('ouvert',false,'motif','droit_non_achat_actif');
  end if;

  select e2.* into e
    from seneve.enrollments e2
    join seneve.hd_programme_links l on l.programme_id=e2.programme_id and l.version=e2.version and l.langue=e2.langue and l.actif
    join seneve.hd_offres_mensuelles a on a.module_id=l.module_id and a.module_version=l.module_version and a.langue=l.langue
                                       and a.offre_id=d.offre_id and a.actif
   where e2.participant_id=p_participant_id and e2.etat in ('active','en_pause')
     and exists(select 1 from seneve.hd_access_periods p1 where p1.enrollment_id=e2.enrollment_id and p1.mois=1)
   order by e2.date_debut desc, e2.enrollment_id limit 1
   for update of e2;
  if not found then return jsonb_build_object('ouvert',false,'motif','aucune_inscription_hd_active'); end if;

  select least(m.nombre_mois, a.mois_max) into v_max_mois
    from seneve.hd_programme_links l
    join seneve.hd_modules m on m.module_id=l.module_id and m.version=l.module_version and m.langue=l.langue
    join seneve.hd_offres_mensuelles a on a.module_id=l.module_id and a.module_version=l.module_version and a.langue=l.langue and a.offre_id=d.offre_id
   where l.programme_id=e.programme_id and l.version=e.version and l.langue=e.langue;

  select max(mois)+1, max(fin_exclue) into v_mois, v_debut from seneve.hd_access_periods where enrollment_id=e.enrollment_id;
  if v_mois > v_max_mois then return jsonb_build_object('ouvert',false,'motif','six_mois_atteints','enrollment_id',e.enrollment_id); end if;

  -- Le mois suivant commence à la fin du précédent (ou maintenant s'il est déjà fini) : 30 jours de 24 h, fin exclusive.
  v_debut := greatest(now(), v_debut);
  v_fin := v_debut + interval '720 hours';
  -- Le droit Continuité couvre au moins ce mois HD (sinon la période dépasserait le droit).
  if d.fin is null or d.fin < v_fin then
    update seneve.entitlements set fin=v_fin where entitlement_id=d.entitlement_id;
  end if;

  insert into seneve.hd_access_periods(enrollment_id,participant_id,mois,entitlement_id,debut,fin_exclue)
  values(e.enrollment_id,p_participant_id,v_mois,d.entitlement_id,v_debut,v_fin);

  select coalesce(nullif(fuseau,''),'Africa/Kinshasa') into v_fuseau from seneve.participants where participant_id=p_participant_id;
  select duree_jours into v_duree from seneve.programmes where programme_id=e.programme_id;
  v_fin_locale := ((v_fin - interval '1 microsecond') at time zone v_fuseau)::date;
  update seneve.enrollments
     set date_fin_prevue=greatest(coalesce(date_fin_prevue, date_debut + (coalesce(v_duree,30) - 1)), v_fin_locale)
   where enrollment_id=e.enrollment_id;

  insert into seneve.audit_events (acteur, action, objet, resultat, details)
  values ('paiement','hd_mois_ouvert','enrollment:'||e.enrollment_id,'ok',
          jsonb_build_object('mois',v_mois,'entitlement_id',d.entitlement_id,'offre_id',d.offre_id,'debut',v_debut,'fin_exclue',v_fin));
  return jsonb_build_object('ouvert',true,'enrollment_id',e.enrollment_id,'mois',v_mois,'debut',v_debut,'fin_exclue',v_fin);
end $$;
revoke all on function seneve._ouvrir_mois_habitudes(uuid,uuid) from public, anon, authenticated;

-- 5. Appel depuis l'ouverture d'un achat (remplacement contrôlé)
do $$
declare d text; r record;
begin
  d := pg_get_functiondef('seneve._ouvrir_acces(uuid,uuid)'::regprocedure);
  for r in select * from (values
    ('v_n integer; v_prog_id text;'||chr(10)||'begin',
     'v_n integer; v_prog_id text; v_hd jsonb;'||chr(10)||'begin'),
    ('  update seneve.payment_events set participant_id = p_participant_id, statut_traitement = ''acces_ouvert''',
     '  if v_offre.offre_id like ''CONTINUITE_MENSUEL_%'' then'||chr(10)||
     '    begin'||chr(10)||
     '      v_hd := seneve._ouvrir_mois_habitudes(p_participant_id, v_ent);'||chr(10)||
     '    exception when others then'||chr(10)||
     '      v_hd := jsonb_build_object(''ouvert'', false, ''motif'', ''erreur'', ''detail'', sqlerrm);'||chr(10)||
     '    end;'||chr(10)||
     '  end if;'||chr(10)||
     '  update seneve.payment_events set participant_id = p_participant_id, statut_traitement = ''acces_ouvert'''),
    ('''offre_id'', v_offre.offre_id, ''controle'', v_pe.controle));',
     '''offre_id'', v_offre.offre_id, ''controle'', v_pe.controle, ''habitudes_defis'', v_hd));'),
    ('''parcours_planifie'', v_plan, ''controle'', v_pe.controle);',
     '''parcours_planifie'', v_plan, ''controle'', v_pe.controle, ''habitudes_defis'', v_hd);')
  ) t(ancien, nouveau) loop
    if (length(d) - length(replace(d, r.ancien, ''))) / length(r.ancien) <> 1 then
      raise exception '_ouvrir_acces : motif introuvable ou multiple : %', r.ancien;
    end if;
    d := replace(d, r.ancien, r.nouveau);
  end loop;
  execute d;
end $$;

-- 6. Révocation : retirer le mois HD ouvert par ce droit
create or replace function seneve.hd_retirer_mois_revoque()
returns trigger language plpgsql security definer set search_path to '' as $$
declare r record; v_fuseau text;
begin
  for r in delete from seneve.hd_access_periods where entitlement_id=new.entitlement_id and mois>1 returning * loop
    select coalesce(nullif(fuseau,''),'Africa/Kinshasa') into v_fuseau from seneve.participants where participant_id=r.participant_id;
    update seneve.enrollments e
       set date_fin_prevue = greatest(
             e.date_debut + (coalesce((select duree_jours from seneve.programmes where programme_id=e.programme_id),30) - 1),
             (select max(((p.fin_exclue - interval '1 microsecond') at time zone v_fuseau)::date)
                from seneve.hd_access_periods p where p.enrollment_id=e.enrollment_id and p.mois>1))
     where e.enrollment_id=r.enrollment_id;
    insert into seneve.audit_events (acteur, action, objet, resultat, details)
    values ('paiement','hd_mois_retire','enrollment:'||r.enrollment_id,'ok',
            jsonb_build_object('mois',r.mois,'entitlement_id',r.entitlement_id,'debut',r.debut,'fin_exclue',r.fin_exclue));
  end loop;
  return new;
end $$;
revoke all on function seneve.hd_retirer_mois_revoque() from public, anon, authenticated;

create trigger hd_retirer_mois_revoque
after update of etat on seneve.entitlements
for each row when (new.etat='revoque' and old.etat is distinct from 'revoque')
execute function seneve.hd_retirer_mois_revoque();

commit;
