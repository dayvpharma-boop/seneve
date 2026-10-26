-- Correction de portée : gratuit sans coach, périodes payantes avec droit actif.
create or replace function seneve_private.hd_coach_excluded(p_enrollment_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from seneve.enrollments e
  where e.enrollment_id=p_enrollment_id
   and exists(select 1 from seneve.hd_programme_links known where known.programme_id=e.programme_id)
   and not exists(
    select 1 from seneve.hd_programme_links l
    join seneve.programme_versions v on v.programme_id=l.programme_id and v.version=l.version and v.etat in('publiee','archivee')
    join seneve.programmes pr on pr.programme_id=l.programme_id and pr.quota_coach_jour>0
    join seneve.hd_access_periods ap on ap.enrollment_id=e.enrollment_id and ap.participant_id=e.participant_id and ap.mois between 2 and 6
    join seneve.entitlements d on d.entitlement_id=ap.entitlement_id and d.participant_id=e.participant_id and d.origine='achat'and d.etat='actif'
    join seneve.offers o on o.offre_id=d.offre_id and o.programme_id=e.programme_id and o.langue=e.langue
    join seneve.payment_events pe on pe.payment_event_id=d.payment_event_id and pe.participant_id=e.participant_id and pe.offre_id=d.offre_id and pe.signature_verifiee and pe.statut_traitement='acces_ouvert'
    where l.programme_id=e.programme_id and l.version=e.version and l.langue=e.langue and l.actif and e.etat='active'
     and d.fin is not null and now()>=d.debut and now()<d.fin
     and now()>=ap.debut and now()<ap.fin_exclue and ap.debut>=d.debut and ap.fin_exclue<=d.fin
   ))
$$;
-- Les garde-fous déjà installés (demande, insertion, quota et réservation)
-- utilisent cette fonction et suivent donc la période payante réellement active.
create function seneve.coach_eligible_enrollments()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare pid uuid:=seneve.current_participant_id();r jsonb;
begin
 if auth.uid()is null or pid is null then raise exception 'Compte requis'using errcode='42501';end if;
 select coalesce(jsonb_agg(e.enrollment_id order by e.enrollment_id),'[]'::jsonb)into r
 from seneve.enrollments e where e.participant_id=pid and e.etat='active'
 and not seneve_private.hd_coach_excluded(e.enrollment_id);
 return r;
end$$;
revoke all on function seneve.coach_eligible_enrollments()from public,anon;
grant execute on function seneve.coach_eligible_enrollments()to authenticated;
