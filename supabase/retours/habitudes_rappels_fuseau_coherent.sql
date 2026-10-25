CREATE OR REPLACE FUNCTION seneve.hd_reminder_precheck(p_reminder_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare r seneve.hd_activity_reminders%rowtype; e seneve.enrollments%rowtype; cfg seneve.hd_delivery_preferences%rowtype;
 v_time time; v_identity text; v_links integer; v_consent boolean; v_jour integer;
begin
 select * into r from seneve.hd_activity_reminders where reminder_id=p_reminder_id;
 if not found or r.etat<>'planifie' then return jsonb_build_object('eligible_interne',false,'autorisation_envoi',false,'motif','rappel_absent_ou_non_planifie');end if;
 select * into e from seneve.enrollments where enrollment_id=r.enrollment_id;
 if not found or e.etat<>'active' then return jsonb_build_object('eligible_interne',false,'autorisation_envoi',false,'motif','inscription_inactive');end if;
 select * into cfg from seneve.hd_delivery_preferences where participant_id=e.participant_id;
 if not found or not cfg.actif or not(r.canal=any(cfg.canaux))then return jsonb_build_object('eligible_interne',false,'autorisation_envoi',false,'motif','configuration_absente_ou_inactive');end if;
 if not exists(select 1 from pg_catalog.pg_timezone_names where name=cfg.fuseau)then return jsonb_build_object('eligible_interne',false,'autorisation_envoi',false,'motif','fuseau_invalide');end if;
 if now()<r.creneau or now()>=r.creneau+make_interval(mins=>cfg.max_retard_minutes)then return jsonb_build_object('eligible_interne',false,'autorisation_envoi',false,'motif','hors_creneau');end if;
 v_time:=(now()at time zone cfg.fuseau)::time;
 if cfg.silence_debut is not null and ((cfg.silence_debut<cfg.silence_fin and v_time>=cfg.silence_debut and v_time<cfg.silence_fin)
   or(cfg.silence_debut>cfg.silence_fin and(v_time>=cfg.silence_debut or v_time<cfg.silence_fin)))then
  return jsonb_build_object('eligible_interne',false,'autorisation_envoi',false,'motif','heure_de_silence');end if;
 select c.jour into v_jour from seneve.activities a join seneve.contents c on c.content_id=a.content_id
 join seneve.hd_programme_links l on l.programme_id=c.programme_id and l.version=c.version and l.langue=c.langue and l.actif
 join seneve.programme_versions v on v.programme_id=c.programme_id and v.version=c.version and v.etat in('publiee','archivee')
 where a.activity_id=r.activity_id and c.programme_id=e.programme_id and c.version=e.version and c.langue=e.langue;
 if not found or (now()at time zone cfg.fuseau)::date<>e.date_debut+v_jour-1 or (r.creneau at time zone cfg.fuseau)::date<>e.date_debut+v_jour-1 then
  return jsonb_build_object('eligible_interne',false,'autorisation_envoi',false,'motif','activite_ou_jour_non_autorise');end if;
 if not exists(select 1 from seneve.hd_access_periods p join seneve.entitlements d on d.entitlement_id=p.entitlement_id
  join seneve.offers o on o.offre_id=d.offre_id and o.programme_id=e.programme_id and o.langue=e.langue
  where p.enrollment_id=e.enrollment_id and p.participant_id=e.participant_id and d.participant_id=e.participant_id
   and d.etat='actif' and d.fin is not null and now()>=p.debut and now()<p.fin_exclue and now()>=d.debut and now()<d.fin
   and p.debut>=d.debut and p.fin_exclue<=d.fin
   and((p.mois=1 and d.origine='gratuit')or(p.mois>1 and d.origine='achat' and d.payment_event_id is not null)))then
  return jsonb_build_object('eligible_interne',false,'autorisation_envoi',false,'motif','droit_inactif');end if;
 if exists(select 1 from seneve.activity_state s where s.enrollment_id=r.enrollment_id and s.activity_id=r.activity_id and s.etat='realisee')then
  return jsonb_build_object('eligible_interne',false,'autorisation_envoi',false,'motif','activite_realisee');end if;
 if r.canal='push' then
  if not exists(select 1 from seneve.push_appareils where participant_id=e.participant_id)then return jsonb_build_object('eligible_interne',false,'autorisation_envoi',false,'motif','appareil_absent');end if;
 elsif r.canal='whatsapp' then
  select count(*),min(identite_canal)into v_links,v_identity from seneve.channel_links where participant_id=e.participant_id and canal='whatsapp' and etat='verifiee' and verifiee_le is not null and revoquee_le is null and preuve is not null;
  if v_links<>1 then return jsonb_build_object('eligible_interne',false,'autorisation_envoi',false,'motif','liaison_absente_ou_ambigue');end if;
 else return jsonb_build_object('eligible_interne',false,'autorisation_envoi',false,'motif','verification_email_non_integree');
 end if;
 -- En cas de décisions contradictoires au même instant, le refus prévaut.
 select bool_and(c.etat='accorde' and c.preuve is not null and c.version_texte is not null)into v_consent from seneve.consents c
 where c.participant_id=e.participant_id and c.canal=r.canal and c.finalite='rappels'
 and(c.identite_canal is null or c.identite_canal=v_identity)
 and(r.canal<>'whatsapp' or c.identite_canal=v_identity)
 and c.decide_le=(select max(x.decide_le)from seneve.consents x where x.participant_id=e.participant_id and x.canal=r.canal and x.finalite='rappels' and x.decide_le<=now());
 if not coalesce(v_consent,false)then return jsonb_build_object('eligible_interne',false,'autorisation_envoi',false,'motif','consentement_absent_ou_retire');end if;
 return jsonb_build_object('eligible_interne',true,'autorisation_envoi',false,'motif','verification_fournisseur_et_reservation_requises');
end$function$;
