-- Habitudes & Défis — Continuité : 30 jours sans prolongation, nouveau cycle après 6 mois
-- Décision Dr Justin Tshims du 26/10/2026, 19h30 : « cela démarre le 2e mois de habitudes et défis mais cela va
-- commencer à la fin de celui de gratuit et celui de continuité doit s'arrêter dans les trente jours programmés.
-- Une fois le défi de 6 mois passé on reprend encore à zéro. »
--
-- Complète habitudes_continuite_mois_payants.sql. Appliquée sur seneve-test uniquement.
-- Restauration : habitudes_continuite_cycles_retour.sql (définitions copiées dans seneve_private.sauvegardes_definitions).
--
--  1. Le droit Continuité n'est plus prolongé : il garde ses 30 jours. Le mois HD qu'il a ouvert garde ses
--     propres dates (30 jours de 24 h, à la suite du mois précédent) et reste valable tant que l'achat
--     n'est pas remboursé.
--  2. Après le mois 6, l'achat Continuité suivant ouvre un nouveau cycle : nouvelle inscription, mois 1
--     (payé par Continuité, la gratuité n'est pas redonnée), jours 1 à 30 de nouveau. L'ancien cycle et son
--     historique sont conservés. Acheté pendant le mois 6 : le nouveau cycle est programmé et démarre quand
--     l'ancien est clôturé.
--  3. Hors du lien : inscription HD terminée avant le mois 6, places financées, offre anglaise.

insert into seneve_private.sauvegardes_definitions (objet, definition, motif)
select p.oid::regprocedure::text, pg_get_functiondef(p.oid), 'avant habitudes_continuite_cycles'
  from pg_proc p
 where p.oid in ('seneve._ouvrir_mois_habitudes(uuid,uuid)'::regprocedure,
                 'seneve.hd_offre_acceptee(text,text,integer,text,integer)'::regprocedure,
                 'seneve.hd_has_current_right(uuid)'::regprocedure,
                 'seneve.hd_reminder_precheck(uuid)'::regprocedure,
                 'seneve.hd_validate_access_period()'::regprocedure,
                 'seneve.hd_validate_activity_reminder()'::regprocedure,
                 'seneve.hd_retirer_mois_revoque()'::regprocedure);

alter table seneve.hd_offres_mensuelles add column nouveau_cycle boolean not null default true;

create table seneve.hd_cycles_planifies (
  entitlement_id uuid primary key references seneve.entitlements(entitlement_id),
  participant_id uuid not null references seneve.participants(participant_id),
  enrollment_precedent uuid not null references seneve.enrollments(enrollment_id),
  debut_prevu timestamptz not null,
  etat text not null default 'en_attente' check (etat in ('en_attente','demarre','annule')),
  enrollment_id uuid references seneve.enrollments(enrollment_id),
  cree_le timestamptz not null default now(),
  modifie_le timestamptz not null default now()
);
alter table seneve.hd_cycles_planifies enable row level security;
revoke all on seneve.hd_cycles_planifies from public, anon, authenticated;

-- Règles d'offre
create or replace function seneve.hd_offre_mensuelle(p_offre_id text, p_programme_id text, p_version integer, p_langue text, p_mois integer)
returns boolean language sql stable security definer set search_path to '' as $$
 select exists(select 1 from seneve.hd_offres_mensuelles a
   join seneve.hd_programme_links l on l.module_id=a.module_id and l.module_version=a.module_version and l.langue=a.langue
   join seneve.offers o on o.offre_id=a.offre_id and o.langue=a.langue
  where a.offre_id=p_offre_id and a.actif and l.programme_id=p_programme_id and l.version=p_version and l.langue=p_langue
    and (p_mois between a.mois_min and a.mois_max or (p_mois=1 and a.nouveau_cycle)));
$$;
revoke all on function seneve.hd_offre_mensuelle(text,text,integer,text,integer) from public, anon;
grant execute on function seneve.hd_offre_mensuelle(text,text,integer,text,integer) to authenticated, service_role;

create or replace function seneve.hd_offre_acceptee(p_offre_id text, p_programme_id text, p_version integer, p_langue text, p_mois integer)
returns boolean language sql stable security definer set search_path to '' as $$
 select exists(select 1 from seneve.offers o where o.offre_id=p_offre_id and o.programme_id=p_programme_id and o.langue=p_langue)
     or seneve.hd_offre_mensuelle(p_offre_id,p_programme_id,p_version,p_langue,p_mois);
$$;

-- Droit à un instant donné (règle unique pour l'accès, les rappels et leur pré-contrôle)
create or replace function seneve.hd_droit_a(p_enrollment_id uuid, p_instant timestamptz)
returns boolean language sql stable set search_path to '' as $$
 select exists(select 1 from seneve.enrollments e
   join seneve.hd_access_periods p on p.enrollment_id=e.enrollment_id and p.participant_id=e.participant_id
   join seneve.entitlements d on d.entitlement_id=p.entitlement_id and d.participant_id=e.participant_id
   join seneve.offers o on o.offre_id=d.offre_id
  where e.enrollment_id=p_enrollment_id and p_instant>=p.debut and p_instant<p.fin_exclue and p.debut>=d.debut
    and (
      -- Droit propre au programme HD : la période doit tenir dans le droit.
      (o.programme_id=e.programme_id and o.langue=e.langue and d.etat='actif' and d.fin is not null
       and p_instant>=d.debut and p_instant<d.fin and p.fin_exclue<=d.fin
       and ((p.mois=1 and d.origine='gratuit') or (p.mois>1 and d.origine='achat' and d.payment_event_id is not null)))
      -- Mois ouvert par Continuité : valable sur ses propres dates tant que l'achat n'est pas remboursé.
   or ((o.programme_id is distinct from e.programme_id or o.langue<>e.langue)
       and d.etat<>'revoque' and d.origine='achat' and d.payment_event_id is not null
       and seneve.hd_offre_mensuelle(o.offre_id,e.programme_id,e.version,e.langue,p.mois))));
$$;
revoke all on function seneve.hd_droit_a(uuid,timestamptz) from public, anon;
grant execute on function seneve.hd_droit_a(uuid,timestamptz) to authenticated, service_role;

create or replace function seneve.hd_has_current_right(p_enrollment_id uuid)
returns boolean language sql stable set search_path to '' as $$
 select exists(
 select 1 from seneve.enrollments e
 join seneve.hd_programme_links l on l.programme_id=e.programme_id and l.version=e.version and l.langue=e.langue and l.actif
 join seneve.programme_versions v on v.programme_id=e.programme_id and v.version=e.version and v.etat in ('publiee','archivee')
 where e.enrollment_id=p_enrollment_id and e.participant_id=(select seneve.current_participant_id()) and e.etat='active'
 and seneve.hd_droit_a(e.enrollment_id, now())
 );
$$;

create or replace function seneve.hd_validate_access_period()
returns trigger language plpgsql set search_path to '' as $$
declare e seneve.enrollments%rowtype; d seneve.entitlements%rowtype; o seneve.offers%rowtype; v_mens boolean;
begin
 select * into strict e from seneve.enrollments where enrollment_id=new.enrollment_id;
 select * into strict d from seneve.entitlements where entitlement_id=new.entitlement_id;
 select * into strict o from seneve.offers where offre_id=d.offre_id;
 if new.participant_id<>e.participant_id or d.participant_id<>e.participant_id
    or not seneve.hd_offre_acceptee(o.offre_id,e.programme_id,e.version,e.langue,new.mois) then
  raise exception 'Période et droit ne correspondent pas à cette inscription.' using errcode='23514';
 end if;
 if not exists(select 1 from seneve.hd_programme_links l where l.programme_id=e.programme_id and l.version=e.version and l.langue=e.langue)then
  raise exception 'Programme non déclaré pour Habitudes et Défis.' using errcode='23514';
 end if;
 v_mens := o.programme_id is distinct from e.programme_id or o.langue<>e.langue;
 if new.debut<d.debut or (not v_mens and (d.fin is null or new.fin_exclue>d.fin)) then
  raise exception 'La période dépasse le droit.' using errcode='23514';
 end if;
 if v_mens then
  if d.origine<>'achat' or d.payment_event_id is null or d.etat='revoque' then
   raise exception 'Origine du droit non autorisée pour ce mois.' using errcode='23514';
  end if;
  if new.mois=1 and (new.cycle<2 or not exists(select 1 from seneve.hd_access_periods x where x.participant_id=e.participant_id and x.mois=6
       and x.enrollment_id<>new.enrollment_id and x.fin_exclue<=new.debut)) then
   raise exception 'Un nouveau cycle commence seulement après les six mois du précédent.' using errcode='23514';
  end if;
 elsif (new.mois=1 and (d.origine<>'gratuit' or new.cycle<>1)) or (new.mois>1 and (d.origine<>'achat' or d.payment_event_id is null)) then
  raise exception 'Origine du droit non autorisée pour ce mois.' using errcode='23514';
 end if;
 -- Sérialise les vérifications de chevauchement pour une même inscription.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.enrollment_id::text,0));
 if exists(select 1 from seneve.hd_access_periods p where p.enrollment_id=new.enrollment_id and p.mois<>new.mois
   and tstzrange(p.debut,p.fin_exclue,'[)') && tstzrange(new.debut,new.fin_exclue,'[)'))then
  raise exception 'Périodes qui se chevauchent.' using errcode='23514';
 end if;
 return new;
end$$;

-- Rappels : même règle de droit (remplacement contrôlé du bloc de contrôle)
do $$
declare d text; i int; j int; debut constant text := 'if not exists(select 1 from seneve.hd_access_periods p join seneve.entitlements d on d.entitlement_id=p.entitlement_id';
  fin text; nouveau text; f text;
begin
  foreach f in array array['seneve.hd_reminder_precheck(uuid)','seneve.hd_validate_activity_reminder()'] loop
    d := pg_get_functiondef(f::regprocedure);
    if f like '%precheck%' then
      fin := '''motif'',''droit_inactif'');end if;';
      nouveau := 'if not seneve.hd_droit_a(e.enrollment_id, now()) then'||chr(10)||'  return jsonb_build_object(''eligible_interne'',false,''autorisation_envoi'',false,''motif'',''droit_inactif'');end if;';
    else
      fin := 'raise exception ''Le créneau du rappel ne possède pas de droit.'' using errcode=''23514'';end if;';
      nouveau := 'if not seneve.hd_droit_a(e.enrollment_id, new.creneau) then'||chr(10)||'  raise exception ''Le créneau du rappel ne possède pas de droit.'' using errcode=''23514'';end if;';
    end if;
    if (length(d)-length(replace(d,debut,'')))/length(debut)<>1 or (length(d)-length(replace(d,fin,'')))/length(fin)<>1 then
      raise exception '% : bloc attendu introuvable ou multiple', f;
    end if;
    i := strpos(d, debut); j := strpos(d, fin) + length(fin);
    if j <= i then raise exception '% : ordre inattendu', f; end if;
    execute substr(d,1,i-1) || nouveau || substr(d,j);
  end loop;
end $$;

-- Démarrage d'un nouveau cycle (mois 1 payé par Continuité)
create or replace function seneve._hd_demarrer_cycle(p_participant_id uuid, p_entitlement_id uuid, p_precedent uuid)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare l0 seneve.enrollments%rowtype; v_prog text; v_version int; v_langue text; z text;
  v_debut timestamptz; v_fin timestamptz; v_enr uuid;
begin
  select * into strict l0 from seneve.enrollments where enrollment_id=p_precedent;
  select l.programme_id, l.version, l.langue into v_prog, v_version, v_langue
    from seneve.hd_programme_links l0l
    join seneve.hd_programme_links l on l.module_id=l0l.module_id and l.module_version=l0l.module_version and l.langue=l0l.langue and l.actif
    join seneve.programme_versions v on v.programme_id=l.programme_id and v.version=l.version and v.etat='publiee'
   where l0l.programme_id=l0.programme_id and l0l.version=l0.version and l0l.langue=l0.langue
   order by (l.programme_id=l0.programme_id) desc, l.version desc limit 1;
  if v_prog is null then return jsonb_build_object('ouvert',false,'motif','programme_hd_non_publie'); end if;
  select coalesce(nullif(preferences#>>'{rappels,fuseau}',''),nullif(fuseau,''),'Africa/Kinshasa') into z
    from seneve.participants where participant_id=p_participant_id;
  select greatest(now(), max(fin_exclue)) into v_debut from seneve.hd_access_periods where enrollment_id=p_precedent;
  v_fin := v_debut + interval '720 hours';
  insert into seneve.enrollments (participant_id, programme_id, version, langue, date_debut, date_fin_prevue, etat, entitlement_id)
  values (p_participant_id, v_prog, v_version, v_langue, (v_debut at time zone z)::date,
          ((v_fin - interval '1 microsecond') at time zone z)::date, 'active', p_entitlement_id)
  returning enrollment_id into v_enr;
  insert into seneve.hd_access_periods(enrollment_id,participant_id,mois,entitlement_id,debut,fin_exclue,cycle)
  values(v_enr,p_participant_id,1,p_entitlement_id,v_debut,v_fin,
         (select coalesce(max(cycle),1)+1 from seneve.hd_access_periods where participant_id=p_participant_id));
  insert into seneve.audit_events (acteur, action, objet, resultat, details)
  values ('paiement','hd_nouveau_cycle','enrollment:'||v_enr,'ok',
          jsonb_build_object('cycle_precedent',p_precedent,'entitlement_id',p_entitlement_id,'debut',v_debut,'fin_exclue',v_fin));
  return jsonb_build_object('ouvert',true,'nouveau_cycle',true,'enrollment_id',v_enr,'mois',1,'debut',v_debut,'fin_exclue',v_fin);
end $$;
revoke all on function seneve._hd_demarrer_cycle(uuid,uuid,uuid) from public, anon, authenticated;

-- Ouverture à l'achat Continuité
create or replace function seneve._ouvrir_mois_habitudes(p_participant_id uuid, p_entitlement_id uuid)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
  d seneve.entitlements%rowtype; e seneve.enrollments%rowtype; v_max_mois int; v_mois int;
  v_debut timestamptz; v_fin timestamptz; z text; v_duree int; v_existant seneve.hd_access_periods%rowtype;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('hd-mois|'||p_participant_id::text,0));
  select * into d from seneve.entitlements where entitlement_id=p_entitlement_id and participant_id=p_participant_id;
  if not found then return jsonb_build_object('ouvert',false,'motif','droit_absent'); end if;
  select * into v_existant from seneve.hd_access_periods where entitlement_id=p_entitlement_id;
  if found then
    return jsonb_build_object('ouvert',false,'existant',true,'enrollment_id',v_existant.enrollment_id,'mois',v_existant.mois,'debut',v_existant.debut,'fin_exclue',v_existant.fin_exclue);
  end if;
  if exists(select 1 from seneve.hd_cycles_planifies where entitlement_id=p_entitlement_id and etat='en_attente') then
    return jsonb_build_object('ouvert',false,'existant',true,'nouveau_cycle','planifie');
  end if;
  if d.etat<>'actif' or d.origine<>'achat' or d.payment_event_id is null then
    return jsonb_build_object('ouvert',false,'motif','droit_non_achat_actif');
  end if;

  -- Dernier cycle HD du participant pour un programme qui accepte cette offre
  select e2.* into e
    from seneve.enrollments e2
    join seneve.hd_programme_links l on l.programme_id=e2.programme_id and l.version=e2.version and l.langue=e2.langue and l.actif
    join seneve.hd_offres_mensuelles a on a.module_id=l.module_id and a.module_version=l.module_version and a.langue=l.langue
                                       and a.offre_id=d.offre_id and a.actif
   where e2.participant_id=p_participant_id and e2.etat in ('active','en_pause','terminee')
     and exists(select 1 from seneve.hd_access_periods p1 where p1.enrollment_id=e2.enrollment_id)
   order by e2.date_debut desc, e2.enrollment_id desc limit 1
   for update of e2;
  if not found then return jsonb_build_object('ouvert',false,'motif','aucune_inscription_hd'); end if;

  select least(m.nombre_mois, a.mois_max) into v_max_mois
    from seneve.hd_programme_links l
    join seneve.hd_modules m on m.module_id=l.module_id and m.version=l.module_version and m.langue=l.langue
    join seneve.hd_offres_mensuelles a on a.module_id=l.module_id and a.module_version=l.module_version and a.langue=l.langue and a.offre_id=d.offre_id
   where l.programme_id=e.programme_id and l.version=e.version and l.langue=e.langue;
  select max(mois), max(fin_exclue) into v_mois, v_debut from seneve.hd_access_periods where enrollment_id=e.enrollment_id;

  if v_mois < v_max_mois then
    if e.etat='terminee' then
      return jsonb_build_object('ouvert',false,'motif','inscription_hd_terminee','enrollment_id',e.enrollment_id);
    end if;
    -- Mois suivant, à la fin du précédent (ou maintenant s'il est déjà fini) ; le droit Continuité garde ses 30 jours.
    v_mois := v_mois + 1;
    v_debut := greatest(now(), v_debut);
    v_fin := v_debut + interval '720 hours';
    insert into seneve.hd_access_periods(enrollment_id,participant_id,mois,entitlement_id,debut,fin_exclue)
    values(e.enrollment_id,p_participant_id,v_mois,d.entitlement_id,v_debut,v_fin);
    select coalesce(nullif(preferences#>>'{rappels,fuseau}',''),nullif(fuseau,''),'Africa/Kinshasa') into z
      from seneve.participants where participant_id=p_participant_id;
    select duree_jours into v_duree from seneve.programmes where programme_id=e.programme_id;
    update seneve.enrollments
       set date_fin_prevue=greatest(coalesce(date_fin_prevue, date_debut + (coalesce(v_duree,30) - 1)),
                                    ((v_fin - interval '1 microsecond') at time zone z)::date)
     where enrollment_id=e.enrollment_id;
    insert into seneve.audit_events (acteur, action, objet, resultat, details)
    values ('paiement','hd_mois_ouvert','enrollment:'||e.enrollment_id,'ok',
            jsonb_build_object('mois',v_mois,'entitlement_id',d.entitlement_id,'offre_id',d.offre_id,'debut',v_debut,'fin_exclue',v_fin));
    return jsonb_build_object('ouvert',true,'enrollment_id',e.enrollment_id,'mois',v_mois,'debut',v_debut,'fin_exclue',v_fin);
  end if;

  -- Six mois atteints : nouveau cycle (reprise à zéro).
  if e.etat in ('active','en_pause') and now() < v_debut then
    insert into seneve.hd_cycles_planifies(entitlement_id, participant_id, enrollment_precedent, debut_prevu)
    values (d.entitlement_id, p_participant_id, e.enrollment_id, v_debut);
    insert into seneve.audit_events (acteur, action, objet, resultat, details)
    values ('paiement','hd_nouveau_cycle_planifie','enrollment:'||e.enrollment_id,'ok',
            jsonb_build_object('entitlement_id',d.entitlement_id,'debut_prevu',v_debut));
    return jsonb_build_object('ouvert',false,'nouveau_cycle','planifie','debut_prevu',v_debut,'enrollment_precedent',e.enrollment_id);
  end if;
  if e.etat in ('active','en_pause') then
    -- Le mois 6 est fini mais la clôture quotidienne n'est pas encore passée : on clôture comme elle.
    update seneve.communications set etat='annule', modifie_le=now() where enrollment_id=e.enrollment_id and etat='planifie';
    update seneve.enrollments set etat='terminee' where enrollment_id=e.enrollment_id;
    insert into seneve.audit_events (acteur, action, objet, resultat, details)
    values ('systeme','parcours_termine','enrollment:'||e.enrollment_id,'ok',jsonb_build_object('regle','six_mois_termines'));
    -- La clôture a pu démarrer un cycle déjà programmé : on recommence la sélection.
    return seneve._ouvrir_mois_habitudes(p_participant_id, p_entitlement_id);
  end if;
  return seneve._hd_demarrer_cycle(p_participant_id, d.entitlement_id, e.enrollment_id);
end $$;
revoke all on function seneve._ouvrir_mois_habitudes(uuid,uuid) from public, anon, authenticated;

-- Clôture d'un cycle : démarrer le cycle programmé (puis les mois suivants déjà achetés)
create or replace function seneve.hd_cycle_apres_fin()
returns trigger language plpgsql security definer set search_path to '' as $$
declare r record; v jsonb; v_premier boolean := true;
begin
  for r in select c.* from seneve.hd_cycles_planifies c join seneve.entitlements d on d.entitlement_id=c.entitlement_id
            where c.enrollment_precedent=new.enrollment_id and c.etat='en_attente' and d.etat<>'revoque'
            order by c.cree_le, c.entitlement_id loop
    begin
      update seneve.hd_cycles_planifies set etat='demarre', modifie_le=now() where entitlement_id=r.entitlement_id;
      if v_premier then v := seneve._hd_demarrer_cycle(r.participant_id, r.entitlement_id, new.enrollment_id);
      else v := seneve._ouvrir_mois_habitudes(r.participant_id, r.entitlement_id); end if;
      update seneve.hd_cycles_planifies set enrollment_id=(v->>'enrollment_id')::uuid where entitlement_id=r.entitlement_id;
      v_premier := false;
    exception when others then
      insert into seneve.audit_events (acteur, action, objet, resultat, details)
      values ('systeme','hd_nouveau_cycle','enrollment:'||new.enrollment_id,'erreur',
              jsonb_build_object('entitlement_id',r.entitlement_id,'detail',sqlerrm));
    end;
  end loop;
  return new;
end $$;
revoke all on function seneve.hd_cycle_apres_fin() from public, anon, authenticated;

create trigger hd_cycle_apres_fin
after update of etat on seneve.enrollments
for each row when (new.etat='terminee' and old.etat is distinct from 'terminee')
execute function seneve.hd_cycle_apres_fin();

-- Remboursement : retirer ce que l'achat avait ouvert dans HD
create or replace function seneve.hd_retirer_mois_revoque()
returns trigger language plpgsql security definer set search_path to '' as $$
declare r record; z text;
begin
  update seneve.hd_cycles_planifies set etat='annule', modifie_le=now() where entitlement_id=new.entitlement_id and etat='en_attente';
  if new.origine<>'achat' then return new; end if;
  for r in delete from seneve.hd_access_periods where entitlement_id=new.entitlement_id returning * loop
    select coalesce(nullif(preferences#>>'{rappels,fuseau}',''),nullif(fuseau,''),'Africa/Kinshasa') into z
      from seneve.participants where participant_id=r.participant_id;
    if exists(select 1 from seneve.hd_access_periods where enrollment_id=r.enrollment_id) then
      -- L'inscription reste portée par un autre mois encore payé : elle n'est pas annulée par le remboursement.
      update seneve.enrollments set entitlement_id=(select p.entitlement_id from seneve.hd_access_periods p
               where p.enrollment_id=r.enrollment_id order by p.mois limit 1)
       where enrollment_id=r.enrollment_id and entitlement_id=new.entitlement_id;
      update seneve.enrollments e
         set date_fin_prevue = greatest(
               e.date_debut + (coalesce((select duree_jours from seneve.programmes where programme_id=e.programme_id),30) - 1),
               (select max(((p.fin_exclue - interval '1 microsecond') at time zone z)::date)
                  from seneve.hd_access_periods p join seneve.entitlements x on x.entitlement_id=p.entitlement_id
                 where p.enrollment_id=e.enrollment_id and x.origine='achat'))
       where e.enrollment_id=r.enrollment_id;
    else
      -- Cycle dont l'unique mois vient d'être remboursé : inscription annulée (l'historique reste).
      update seneve.communications set etat='annule', modifie_le=now() where enrollment_id=r.enrollment_id and etat='planifie';
      update seneve.enrollments set etat='annulee' where enrollment_id=r.enrollment_id and etat in ('active','en_pause');
    end if;
    insert into seneve.audit_events (acteur, action, objet, resultat, details)
    values ('paiement','hd_mois_retire','enrollment:'||r.enrollment_id,'ok',
            jsonb_build_object('mois',r.mois,'entitlement_id',r.entitlement_id,'debut',r.debut,'fin_exclue',r.fin_exclue));
  end loop;
  return new;
end $$;

-- 7. Numéro de cycle : « un seul mois gratuit » devient « un seul mois 1 du cycle 1 »
alter table seneve.hd_access_periods add column cycle smallint not null default 1 check (cycle >= 1);
drop index seneve.hd_access_one_free_idx;
create unique index hd_access_one_free_idx on seneve.hd_access_periods (participant_id) where mois = 1 and cycle = 1;
create unique index hd_access_un_mois1_par_cycle_idx on seneve.hd_access_periods (participant_id, cycle) where mois = 1;

create or replace function seneve.hd_cycle_coherent()
returns trigger language plpgsql set search_path to '' as $$
declare v_c smallint;
begin
  if new.mois > 1 then
    select cycle into v_c from seneve.hd_access_periods where enrollment_id=new.enrollment_id and mois=1;
    new.cycle := coalesce(v_c, new.cycle);
  end if;
  return new;
end $$;
create trigger hd_access_period_cycle before insert or update on seneve.hd_access_periods
for each row execute function seneve.hd_cycle_coherent();
