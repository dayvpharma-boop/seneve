-- TEST : normalisation partagée, aucun accès direct client.
create function seneve_private.hd_normalize_schedule(p_habit_key text,p_creneaux jsonb,p_jours_iso smallint[])
returns jsonb language plpgsql immutable security invoker set search_path='' as $$
declare x jsonb;d jsonb;n int;total int:=0;ids text[]:='{}';vus text[]:='{}';jours smallint[];normalise jsonb:='[]';cle text;
begin
 if p_creneaux is null or jsonb_typeof(p_creneaux)<>'array' or octet_length(p_creneaux::text)>8192 then raise exception 'Configuration invalide'using errcode='22023';end if;
 if jsonb_array_length(p_creneaux)not between 1 and 7 then raise exception 'Créneaux invalides'using errcode='22023';end if;
 for x in select value from jsonb_array_elements(p_creneaux)loop
  if jsonb_typeof(x)<>'object' then raise exception 'Créneau invalide'using errcode='22023';end if;
  if(select count(*)from jsonb_object_keys(x))<>3 or not(x?&array['creneau_id','heure_locale','jours_iso'])or coalesce(x->>'creneau_id','')!~'^[a-z0-9_]{1,32}$'
   or coalesce(x->>'heure_locale','')!~'^([01][0-9]|2[0-3]):[0-5][0-9]$' then raise exception 'Créneau invalide'using errcode='22023';end if;
  if(x->>'creneau_id')=any(ids)then raise exception 'Créneau répété'using errcode='22023';end if;
  ids:=array_append(ids,x->>'creneau_id');
  if jsonb_typeof(x->'jours_iso')is distinct from 'array'then raise exception 'Jours invalides'using errcode='22023';end if;
  if jsonb_array_length(x->'jours_iso')not between 1 and 7 then raise exception 'Jours invalides'using errcode='22023';end if;
  jours:='{}';
  for d in select value from jsonb_array_elements(x->'jours_iso')loop
   if jsonb_typeof(d)<>'number'or d::text!~'^[1-7]$'then raise exception 'Jour invalide'using errcode='22023';end if;
   n:=d::text::int;
   if n=any(jours)then raise exception 'Jour répété'using errcode='22023';end if;
   -- Un repère quotidien garde une occurrence par jour ; les cultes gardent les créneaux distincts.
   cle:=n::text||case when p_habit_key like 'culte_%'then '|'||(x->>'heure_locale')else ''end;
   if cle=any(vus)then raise exception 'Rendez-vous répété'using errcode='22023';end if;
   vus:=array_append(vus,cle);jours:=array_append(jours,n::smallint);total:=total+1;
  end loop;
  select array_agg(v order by v)into jours from unnest(jours)v;
  normalise:=normalise||jsonb_build_array(jsonb_build_object('creneau_id',x->>'creneau_id','heure_locale',x->>'heure_locale','jours_iso',jours));
 end loop;
 if total<>cardinality(p_jours_iso)then raise exception 'Fréquence différente du modèle'using errcode='22023';end if;
 select jsonb_agg(v order by v->>'creneau_id')into normalise from jsonb_array_elements(normalise)v;
 return normalise;
end$$;
revoke all on function seneve_private.hd_normalize_schedule(text,jsonb,smallint[])from public,anon,authenticated;

create or replace function seneve_private.hd_save_schedule(p_enrollment_id uuid,p_habit_key text,p_creneaux jsonb,p_effectif_du date,p_revision_attendue uuid,p_client_event_id uuid)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare e seneve.enrollments%rowtype;l seneve.hd_programme_links%rowtype;t seneve.hd_habit_templates%rowtype;
 h seneve_private.hd_schedule_heads%rowtype;z text;j date;x jsonb;d jsonb;n int;total int:=0;
 ids text[]:='{}';vus text[]:='{}';jours smallint[];normalise jsonb:='[]';empreinte text;cle text;
begin
 if auth.uid()is null then raise exception 'Compte requis'using errcode='42501';end if;
 select * into e from seneve.enrollments where enrollment_id=p_enrollment_id
 and participant_id=(select seneve.current_participant_id())for share;
 if not found or not seneve.hd_has_current_right(p_enrollment_id)then raise exception 'Planning non accessible'using errcode='42501';end if;
 select * into strict l from seneve.hd_programme_links where programme_id=e.programme_id and version=e.version and langue=e.langue and actif;
 select * into t from seneve.hd_habit_templates where module_id=l.module_id and version=l.module_version and langue=e.langue and habit_key=p_habit_key;
 if not found then raise exception 'Habitude inconnue'using errcode='22023';end if;
 select coalesce(preferences#>>'{rappels,fuseau}',fuseau)into z from seneve.participants where participant_id=e.participant_id for share;
 if z is null or not exists(select 1 from pg_catalog.pg_timezone_names where name=z)then raise exception 'Fuseau invalide'using errcode='22023';end if;
 j:=(now()at time zone z)::date;
 if p_client_event_id is null or p_effectif_du is null then raise exception 'Configuration invalide'using errcode='22023';end if;
 normalise:=seneve_private.hd_normalize_schedule(p_habit_key,p_creneaux,t.jours_iso);
 empreinte:=md5(jsonb_build_object('creneaux',normalise,'effectif_du',p_effectif_du,'fuseau',z)::text);
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('hd-horaire|'||e.participant_id::text||'|'||l.module_id||'|'||l.module_version::text||'|'||e.langue||'|'||p_habit_key,0));
 select * into h from seneve_private.hd_schedule_heads where participant_id=e.participant_id and module_id=l.module_id and version=l.module_version and langue=e.langue and habit_key=p_habit_key;
 if h.revision=p_client_event_id then
  if h.empreinte<>empreinte then raise exception 'Identifiant réutilisé pour un autre choix'using errcode='22023';end if;
  return jsonb_build_object('revision',h.revision,'effectif_du',h.effectif_du,'repetition',true);
 end if;
 if h.revision is distinct from p_revision_attendue then raise exception 'Planning modifié : actualiser avant de réessayer'using errcode='40001';end if;
 -- Convention de préparation : les modifications s'appliquent le lendemain local.
 if p_effectif_du<>j+1 then raise exception 'Choisir le lendemain du jour local'using errcode='22023';end if;
 delete from seneve.hd_habit_schedules where participant_id=e.participant_id and module_id=l.module_id and version=l.module_version and langue=e.langue and habit_key=p_habit_key and valide_du>=p_effectif_du;
 update seneve.hd_habit_schedules set valide_au=j where participant_id=e.participant_id and module_id=l.module_id and version=l.module_version and langue=e.langue and habit_key=p_habit_key and valide_du<p_effectif_du and(valide_au is null or valide_au>=p_effectif_du);
 for x in select value from jsonb_array_elements(normalise)loop
  insert into seneve.hd_habit_schedules(participant_id,module_id,version,langue,habit_key,creneau_id,heure_locale,fuseau,jours_iso,valide_du)
  values(e.participant_id,l.module_id,l.module_version,e.langue,p_habit_key,x->>'creneau_id',(x->>'heure_locale')::time,z,array(select value::text::smallint from jsonb_array_elements(x->'jours_iso')),p_effectif_du);
 end loop;
 insert into seneve_private.hd_schedule_heads(participant_id,module_id,version,langue,habit_key,revision,empreinte,effectif_du)
 values(e.participant_id,l.module_id,l.module_version,e.langue,p_habit_key,p_client_event_id,empreinte,p_effectif_du)
 on conflict(participant_id,module_id,version,langue,habit_key)do update set revision=excluded.revision,empreinte=excluded.empreinte,effectif_du=excluded.effectif_du;
 return jsonb_build_object('revision',p_client_event_id,'effectif_du',p_effectif_du,'repetition',false);
end$$;

-- Inscription explicite, immédiate, sans paiement ou consentement de communication implicite.
create function seneve_private.hd_start_free(p_programme_id text,p_version integer,p_langue text,p_offre_id text,p_horaires jsonb,p_confirmation boolean)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare pid uuid;l seneve.hd_programme_links%rowtype;pr seneve.programmes%rowtype;e seneve.enrollments%rowtype;
 ancien seneve.hd_access_periods%rowtype;d seneve.entitlements%rowtype;t seneve.hd_habit_templates%rowtype;
 z text;j date;x jsonb;c jsonb;normalise jsonb:='[]';groupe jsonb;cles text[]:='{}';r jsonb;rev uuid;
begin
 if auth.uid()is null or p_confirmation is distinct from true then raise exception 'Confirmation et compte requis'using errcode='42501';end if;
 pid:=seneve.current_participant_id();
 if pid is null then raise exception 'Profil requis'using errcode='42501';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('hd-gratuit|'||pid::text,0));
 select * into ancien from seneve.hd_access_periods where participant_id=pid and mois=1;
 if found then
  select * into e from seneve.enrollments where enrollment_id=ancien.enrollment_id and participant_id=pid;
  select * into d from seneve.entitlements where entitlement_id=ancien.entitlement_id and participant_id=pid;
  if e.programme_id is distinct from p_programme_id or e.version is distinct from p_version or e.langue is distinct from p_langue or d.offre_id is distinct from p_offre_id then
   return jsonb_build_object('cree',false,'motif','gratuite_deja_utilisee');
  end if;
  -- Une reprise ne modifie ni les dates, ni les horaires, ni l'état de l'inscription ou du droit.
  return jsonb_build_object('cree',false,'existant',true,'enrollment_id',e.enrollment_id,'entitlement_id',d.entitlement_id,'debut',ancien.debut,'fin_exclue',ancien.fin_exclue,'etat',d.etat,'horaires_appliques',false);
 end if;
 select * into l from seneve.hd_programme_links where programme_id=p_programme_id and version=p_version and langue=p_langue and actif;
 if not found or not exists(select 1 from seneve.programme_versions where programme_id=p_programme_id and version=p_version and etat='publiee')
  or not exists(select 1 from seneve.hd_modules where module_id=l.module_id and version=l.module_version and langue=p_langue and duree_gratuite_jours=30)then
  raise exception 'Programme non ouvert à l’inscription'using errcode='42501';end if;
 select * into pr from seneve.programmes where programme_id=p_programme_id and langue=p_langue and duree_jours>=30;
 if not found then raise exception 'Calendrier du programme non configuré'using errcode='22023';end if;
 if not exists(select 1 from seneve.offers where offre_id=p_offre_id and actif and programme_id=p_programme_id and langue=p_langue
  and type_offre='habitudes_defis_gratuit'and prix=0 and duree_acces_jours=30 and chariow_product_id is null and lien_achat is null)then
  raise exception 'Offre gratuite non configurée'using errcode='42501';end if;
 if exists(select 1 from seneve.enrollments where participant_id=pid and programme_id=p_programme_id)then raise exception 'Inscription déjà présente : vérifier le compte'using errcode='22023';end if;
 if exists(select 1 from seneve.hd_habit_schedules where participant_id=pid and module_id=l.module_id and version=l.module_version and langue=p_langue)
 or exists(select 1 from seneve_private.hd_schedule_heads where participant_id=pid and module_id=l.module_id and version=l.module_version and langue=p_langue)then
  raise exception 'Planning existant à préserver'using errcode='22023';end if;
 select coalesce(preferences#>>'{rappels,fuseau}',fuseau)into z from seneve.participants where participant_id=pid for share;
 if z is null or not exists(select 1 from pg_catalog.pg_timezone_names where name=z)then raise exception 'Fuseau invalide'using errcode='22023';end if;
 j:=(now()at time zone z)::date;
 if p_horaires is null or jsonb_typeof(p_horaires)<>'array'or octet_length(p_horaires::text)>65536 then raise exception 'Horaires invalides'using errcode='22023';end if;
 if jsonb_array_length(p_horaires)<>(select count(*)from seneve.hd_habit_templates where module_id=l.module_id and version=l.module_version and langue=p_langue)
  or jsonb_array_length(p_horaires)=0 then raise exception 'Planning incomplet'using errcode='22023';end if;
 for x in select value from jsonb_array_elements(p_horaires)loop
  if jsonb_typeof(x)<>'object'then raise exception 'Planning invalide'using errcode='22023';end if;
  if(select count(*)from jsonb_object_keys(x))<>2 or not(x?&array['habit_key','creneaux'])then raise exception 'Planning invalide'using errcode='22023';end if;
  if(x->>'habit_key')=any(cles)then raise exception 'Habitude répétée'using errcode='22023';end if;
  select * into t from seneve.hd_habit_templates where module_id=l.module_id and version=l.module_version and langue=p_langue and habit_key=x->>'habit_key';
  if not found then raise exception 'Habitude inconnue'using errcode='22023';end if;
  groupe:=seneve_private.hd_normalize_schedule(t.habit_key,x->'creneaux',t.jours_iso);
  cles:=array_append(cles,t.habit_key);normalise:=normalise||jsonb_build_array(jsonb_build_object('habit_key',t.habit_key,'creneaux',groupe));
 end loop;
 insert into seneve.enrollments(participant_id,programme_id,version,langue,date_debut,date_fin_prevue,etat)
 values(pid,p_programme_id,p_version,p_langue,j,j+pr.duree_jours-1,'active')returning * into e;
 r:=seneve.hd_open_free_period(e.enrollment_id,p_offre_id);
 if not coalesce((r->>'cree')::boolean,false)then raise exception 'Ouverture gratuite refusée'using errcode='42501';end if;
 update seneve.enrollments set entitlement_id=(r->>'entitlement_id')::uuid where enrollment_id=e.enrollment_id;
 for x in select value from jsonb_array_elements(normalise)loop
  for c in select value from jsonb_array_elements(x->'creneaux')loop
   insert into seneve.hd_habit_schedules(participant_id,module_id,version,langue,habit_key,creneau_id,heure_locale,fuseau,jours_iso,valide_du)
   values(pid,l.module_id,l.module_version,p_langue,x->>'habit_key',c->>'creneau_id',(c->>'heure_locale')::time,z,array(select value::text::smallint from jsonb_array_elements(c->'jours_iso')),j);
  end loop;
  rev:=gen_random_uuid();
  insert into seneve_private.hd_schedule_heads(participant_id,module_id,version,langue,habit_key,revision,empreinte,effectif_du)
  values(pid,l.module_id,l.module_version,p_langue,x->>'habit_key',rev,md5(jsonb_build_object('creneaux',x->'creneaux','effectif_du',j,'fuseau',z)::text),j);
 end loop;
 return r||jsonb_build_object('horaires_appliques',true);
end$$;
create function seneve.hd_start_free(p_programme_id text,p_version integer,p_langue text,p_offre_id text,p_horaires jsonb,p_confirmation boolean)
returns jsonb language sql volatile security invoker set search_path='' as $$
 select seneve_private.hd_start_free(p_programme_id,p_version,p_langue,p_offre_id,p_horaires,p_confirmation)
$$;
revoke all on function seneve_private.hd_start_free(text,integer,text,text,jsonb,boolean),seneve.hd_start_free(text,integer,text,text,jsonb,boolean)from public,anon;
grant execute on function seneve_private.hd_start_free(text,integer,text,text,jsonb,boolean),seneve.hd_start_free(text,integer,text,text,jsonb,boolean)to authenticated;
