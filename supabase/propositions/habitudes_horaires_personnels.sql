-- TEST uniquement. Pas de mise en service, de génération d'activité ou de rappel.
alter table seneve.hd_habit_schedules add column creneau_id text not null default 'principal'
 check(creneau_id ~ '^[a-z0-9_]{1,32}$');
alter table seneve.hd_habit_schedules drop constraint hd_habit_schedules_participant_id_module_id_version_langue__key;
alter table seneve.hd_habit_schedules add constraint hd_schedule_slot_date_unique
 unique(participant_id,module_id,version,langue,habit_key,creneau_id,valide_du);

create schema seneve_private;
revoke all on schema seneve_private from public,anon;
grant usage on schema seneve_private to authenticated;
create table seneve_private.hd_schedule_heads(
 participant_id uuid not null references seneve.participants(participant_id)on delete cascade,
 module_id text not null,version integer not null,langue text not null,habit_key text not null,
 revision uuid not null unique,empreinte text not null,effectif_du date not null,
 primary key(participant_id,module_id,version,langue,habit_key),
 foreign key(module_id,version,langue,habit_key)references seneve.hd_habit_templates(module_id,version,langue,habit_key)
);
alter table seneve_private.hd_schedule_heads enable row level security;
revoke all on seneve_private.hd_schedule_heads from public,anon,authenticated;

-- Seul le propriétaire du compte, muni d'un droit actif, lit cette configuration.
create function seneve_private.hd_schedule_settings(p_enrollment_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare e seneve.enrollments%rowtype;l seneve.hd_programme_links%rowtype;z text;j date;
begin
 if auth.uid()is null then raise exception 'Compte requis'using errcode='42501';end if;
 select * into e from seneve.enrollments where enrollment_id=p_enrollment_id
 and participant_id=(select seneve.current_participant_id());
 if not found or not seneve.hd_has_current_right(p_enrollment_id)then raise exception 'Planning non accessible'using errcode='42501';end if;
 select * into strict l from seneve.hd_programme_links where programme_id=e.programme_id and version=e.version and langue=e.langue and actif;
 select coalesce(preferences#>>'{rappels,fuseau}',fuseau)into z from seneve.participants where participant_id=e.participant_id;
 if z is null or not exists(select 1 from pg_catalog.pg_timezone_names where name=z)then raise exception 'Fuseau invalide'using errcode='22023';end if;
 j:=(now()at time zone z)::date;
 return jsonb_build_object('enrollment_id',e.enrollment_id,'fuseau',z,'date_locale',j,'modifications_a_partir_du',j+1,
 'modeles',(select coalesce(jsonb_agg(to_jsonb(t)order by t.habit_key),'[]'::jsonb)from seneve.hd_habit_templates t where t.module_id=l.module_id and t.version=l.module_version and t.langue=e.langue),
 'horaires',(select coalesce(jsonb_agg(to_jsonb(s)order by s.habit_key,s.valide_du,s.creneau_id),'[]'::jsonb)from seneve.hd_habit_schedules s where s.participant_id=e.participant_id and s.module_id=l.module_id and s.version=l.module_version and s.langue=e.langue),
 'revisions',(select coalesce(jsonb_agg(jsonb_build_object('habit_key',h.habit_key,'revision',h.revision,'effectif_du',h.effectif_du)),'[]'::jsonb)from seneve_private.hd_schedule_heads h where h.participant_id=e.participant_id and h.module_id=l.module_id and h.version=l.module_version and h.langue=e.langue));
end$$;

create function seneve_private.hd_save_schedule(p_enrollment_id uuid,p_habit_key text,p_creneaux jsonb,p_effectif_du date,p_revision_attendue uuid,p_client_event_id uuid)
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
 if p_client_event_id is null or p_effectif_du is null or p_creneaux is null or jsonb_typeof(p_creneaux)<>'array' or octet_length(p_creneaux::text)>8192 then raise exception 'Configuration invalide'using errcode='22023';end if;
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
 if total<>cardinality(t.jours_iso)then raise exception 'Fréquence différente du modèle'using errcode='22023';end if;
 select jsonb_agg(v order by v->>'creneau_id')into normalise from jsonb_array_elements(normalise)v;
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

-- Façades RPC invoker ; l'écriture privilégiée reste dans le schéma privé.
create function seneve.hd_schedule_settings(p_enrollment_id uuid)returns jsonb language sql stable security invoker set search_path=''
 as $$select seneve_private.hd_schedule_settings(p_enrollment_id)$$;
create function seneve.hd_save_schedule(p_enrollment_id uuid,p_habit_key text,p_creneaux jsonb,p_effectif_du date,p_revision_attendue uuid,p_client_event_id uuid)
returns jsonb language sql volatile security invoker set search_path=''
 as $$select seneve_private.hd_save_schedule(p_enrollment_id,p_habit_key,p_creneaux,p_effectif_du,p_revision_attendue,p_client_event_id)$$;
revoke all on function seneve_private.hd_schedule_settings(uuid),seneve.hd_schedule_settings(uuid)from public,anon;
revoke all on function seneve_private.hd_save_schedule(uuid,text,jsonb,date,uuid,uuid),seneve.hd_save_schedule(uuid,text,jsonb,date,uuid,uuid)from public,anon;
grant execute on function seneve_private.hd_schedule_settings(uuid),seneve.hd_schedule_settings(uuid)to authenticated;
grant execute on function seneve_private.hd_save_schedule(uuid,text,jsonb,date,uuid,uuid),seneve.hd_save_schedule(uuid,text,jsonb,date,uuid,uuid)to authenticated;
