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
