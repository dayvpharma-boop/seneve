-- Habitudes & Défis — reprise après un abonnement Continuité payé en retard.
-- Décision de Dr Justin Tshims (26/10/2026, 23h40) : « Il reprend où il était ». Un achat fait après la fin du mois
-- précédent ouvre le mois suivant le jour de l'achat, et le parcours reprend au premier jour de ce mois (jour 31 pour
-- le mois 2, etc.), même après une coupure.
--  1. hd_debuts_mois / hd_jour_du / hd_date_du_jour : le jour HD se calcule à partir des périodes d'accès. Sans
--     coupure, le résultat est identique au calcul civil d'avant (jour = date - date_debut + 1).
--  2. La garde de progression et les rappels utilisent la date du jour HD (plus date_debut + jour - 1).
--  3. _ouvrir_mois_habitudes rouvre une inscription terminée par la fin de sa durée (règle fin_de_duree), au lieu
--     de la refuser. Une inscription terminée pour une autre raison reste refusée.
-- Sauvegarde préalable des définitions ; retour arrière : habitudes_reprise_apres_retard_retour.sql.
insert into seneve_private.sauvegardes_definitions(objet,definition,motif)
select p.oid::regprocedure::text,pg_get_functiondef(p.oid),'avant habitudes_reprise_apres_retard'
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='seneve' and p.proname in ('hd_progress_access_guard','hd_reminder_precheck','hd_validate_activity_reminder','_ouvrir_mois_habitudes');

-- Premier jour local de chaque mois : mois 1 = date_debut ; mois suivant = 30 jours plus tard, plus les jours de
-- coupure (date locale du début du mois moins date locale de fin du mois précédent).
create or replace function seneve.hd_debuts_mois(p_enrollment_id uuid)
returns table(mois smallint, debut_local date)
language plpgsql stable security definer set search_path to '' as $$
declare e seneve.enrollments%rowtype; z text; r record; s date; prec_fin date; prec_mois int;
begin
  select * into e from seneve.enrollments x where x.enrollment_id=p_enrollment_id
     and ((select auth.uid()) is null or x.participant_id=(select seneve.current_participant_id()));
  if not found then return; end if;
  select coalesce(nullif(pa.preferences#>>'{rappels,fuseau}',''),nullif(pa.fuseau,''),'Africa/Kinshasa') into z
    from seneve.participants pa where pa.participant_id=e.participant_id;
  for r in select p.mois, p.debut, p.fin_exclue from seneve.hd_access_periods p where p.enrollment_id=p_enrollment_id order by p.mois loop
    if prec_mois is null then
      s := e.date_debut + 30*(r.mois-1);
    else
      s := s + 30*(r.mois-prec_mois) + greatest(0, (r.debut at time zone z)::date - prec_fin);
    end if;
    mois := r.mois; debut_local := s; return next;
    prec_mois := r.mois; prec_fin := ((r.fin_exclue - interval '1 microsecond') at time zone z)::date;
  end loop;
end $$;

create or replace function seneve.hd_jour_du(p_enrollment_id uuid, p_date date)
returns integer language sql stable security definer set search_path to '' as $$
  select coalesce(
    (select 30*(m.mois-1) + (p_date - m.debut_local) + 1 from seneve.hd_debuts_mois(p_enrollment_id) m
      where m.debut_local<=p_date order by m.mois desc limit 1),
    (select p_date - e.date_debut + 1 from seneve.enrollments e where e.enrollment_id=p_enrollment_id
       and ((select auth.uid()) is null or e.participant_id=(select seneve.current_participant_id()))));
$$;

create or replace function seneve.hd_date_du_jour(p_enrollment_id uuid, p_jour integer)
returns date language sql stable security definer set search_path to '' as $$
  select coalesce(
    (select m.debut_local + (p_jour - 30*(m.mois-1) - 1) from seneve.hd_debuts_mois(p_enrollment_id) m
      where m.mois <= ((p_jour-1)/30)+1 order by m.mois desc limit 1),
    (select e.date_debut + p_jour - 1 from seneve.enrollments e where e.enrollment_id=p_enrollment_id
       and ((select auth.uid()) is null or e.participant_id=(select seneve.current_participant_id()))));
$$;
revoke all on function seneve.hd_debuts_mois(uuid), seneve.hd_jour_du(uuid,date), seneve.hd_date_du_jour(uuid,integer) from public, anon;
grant execute on function seneve.hd_debuts_mois(uuid), seneve.hd_jour_du(uuid,date), seneve.hd_date_du_jour(uuid,integer) to authenticated, service_role;

do $$
declare
  f record; d text; n int;
  remplacements constant text[][] := array[
    ['hd_progress_access_guard', 'e.date_debut+c.jour-1', 'seneve.hd_date_du_jour(e.enrollment_id,c.jour)', '1'],
    ['hd_reminder_precheck', 'e.date_debut+v_jour-1', 'seneve.hd_date_du_jour(e.enrollment_id,v_jour)', '2'],
    ['hd_validate_activity_reminder', 'e.date_debut+v_jour-1', 'seneve.hd_date_du_jour(e.enrollment_id,v_jour)', '1'],
    ['_ouvrir_mois_habitudes',
     $a$      return jsonb_build_object('ouvert',false,'motif','inscription_hd_terminee','enrollment_id',e.enrollment_id);$a$,
     $b$      -- Reprise après retard (décision du 26/10/2026, 23h40) : seulement si le parcours s'est arrêté à la fin de sa durée.
      if coalesce((select a.details->>'regle' from seneve.audit_events a
                    where a.objet='enrollment:'||e.enrollment_id and a.action='parcours_termine'
                    order by a.cree_le desc limit 1),'')<>'fin_de_duree' then
        return jsonb_build_object('ouvert',false,'motif','inscription_hd_terminee','enrollment_id',e.enrollment_id);
      end if;
      update seneve.enrollments set etat='active' where enrollment_id=e.enrollment_id;
      insert into seneve.audit_events (acteur, action, objet, resultat, details)
      values ('paiement','hd_parcours_repris','enrollment:'||e.enrollment_id,'ok',
              jsonb_build_object('mois',v_mois+1,'entitlement_id',d.entitlement_id,'regle','reprise_apres_retard'));$b$, '1']];
begin
  for i in 1..array_length(remplacements,1) loop
    select p.oid into f from pg_proc p join pg_namespace ns on ns.oid=p.pronamespace
     where ns.nspname='seneve' and p.proname=remplacements[i][1];
    d := pg_get_functiondef(f.oid);
    n := (length(d) - length(replace(d, remplacements[i][2], ''))) / length(remplacements[i][2]);
    if n <> remplacements[i][4]::int then
      raise exception '% : % occurrence(s) de « % » au lieu de %', remplacements[i][1], n, remplacements[i][2], remplacements[i][4];
    end if;
    execute replace(d, remplacements[i][2], remplacements[i][3]);
  end loop;
end $$;
