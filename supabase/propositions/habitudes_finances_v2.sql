-- SÉNEVÉ Habitudes & Défis V2 — habitudes financières facultatives.
-- PROPOSITION LOCALE : ne pas appliquer avant sauvegarde/restauration et tests ciblés.
-- Clône les versions éditoriales publiées dans une V2 brouillon ; aucun lien n'est activé.
-- La V1, ses inscriptions et son historique restent inchangés.

do $$
begin
 if exists(select 1 from seneve.programme_versions where programme_id in ('HABITUDES_DEFIS_30J_FR_V1','HABITUDES_DEFIS_30J_EN_V1') and version=2)
  or exists(select 1 from seneve.hd_modules where module_id='HABITUDES_DEFIS' and version=2)
  or exists(select 1 from seneve.hd_programme_links where programme_id in ('HABITUDES_DEFIS_30J_FR_V1','HABITUDES_DEFIS_30J_EN_V1') and version=2) then
  raise exception 'V2 déjà présente : vérifier la migration avant toute reprise';
 end if;
 if exists(
   select 1 from (values ('HABITUDES_DEFIS_30J_FR_V1','fr'),('HABITUDES_DEFIS_30J_EN_V1','en')) v(programme_id,langue)
   where (select count(*) from seneve.contents c join seneve.programme_versions pv using(programme_id,version)
           where c.programme_id=v.programme_id and c.version=1 and c.langue=v.langue and pv.etat='publiee')<>181
      or (select count(*) from seneve.hd_habit_templates t where t.module_id='HABITUDES_DEFIS' and t.version=1 and t.langue=v.langue)<>16
 ) then raise exception 'Inventaire source inattendu : arrêter et réexaminer le périmètre'; end if;
end $$;

-- 1. Version éditoriale FR/EN et module V2 restent en brouillon/inactifs.
insert into seneve.programme_versions(programme_id,version,etat)
select programme_id,2,'brouillon' from seneve.programme_versions
where programme_id in ('HABITUDES_DEFIS_30J_FR_V1','HABITUDES_DEFIS_30J_EN_V1') and version=1 and etat='publiee';

insert into seneve.hd_modules(module_id,version,langue,statut,nombre_mois,mois_gratuits,regle_mois,duree_gratuite_jours)
select module_id,2,langue,'brouillon',nombre_mois,mois_gratuits,regle_mois,duree_gratuite_jours
from seneve.hd_modules where module_id='HABITUDES_DEFIS' and version=1;

insert into seneve.hd_habit_templates(module_id,version,langue,habit_key,libelle,heure_proposee,jours_iso,duree_min,duree_max)
select module_id,2,langue,habit_key,libelle,heure_proposee,jours_iso,duree_min,duree_max
from seneve.hd_habit_templates where module_id='HABITUDES_DEFIS' and version=1;

create table seneve.hd_finance_habit_templates (
 module_id text not null,
 module_version integer not null,
 langue text not null check(langue in('fr','en')),
 habit_key text not null check(habit_key in('reserve_joie','epargne_investir','offrande','remboursement_dette')),
 libelle text not null,
 active_par_defaut boolean not null,
 cadence_autorisee text not null check(cadence_autorisee in('epargne','choisie')),
 primary key(module_id,module_version,langue,habit_key),
 foreign key(module_id,module_version,langue) references seneve.hd_modules(module_id,version,langue)
);

insert into seneve.hd_finance_habit_templates(module_id,module_version,langue,habit_key,libelle,active_par_defaut,cadence_autorisee) values
 ('HABITUDES_DEFIS',2,'fr','reserve_joie','Réserve de joie',true,'epargne'),
 ('HABITUDES_DEFIS',2,'fr','epargne_investir','Épargne pour investir',true,'epargne'),
 ('HABITUDES_DEFIS',2,'fr','offrande','Offrande libre',true,'choisie'),
 ('HABITUDES_DEFIS',2,'fr','remboursement_dette','Remboursement de dette',false,'choisie'),
 ('HABITUDES_DEFIS',2,'en','reserve_joie','Family joy reserve',true,'epargne'),
 ('HABITUDES_DEFIS',2,'en','epargne_investir','Savings for investing',true,'epargne'),
 ('HABITUDES_DEFIS',2,'en','offrande','Freewill offering',true,'choisie'),
 ('HABITUDES_DEFIS',2,'en','remboursement_dette','Debt repayment',false,'choisie');

create table seneve.hd_finance_habit_preferences (
 enrollment_id uuid not null references seneve.enrollments(enrollment_id) on delete cascade,
 module_id text not null default 'HABITUDES_DEFIS',
 module_version integer not null default 2,
 langue text not null check(langue in('fr','en')),
 habit_key text not null,
 active boolean not null,
 valide_du date not null,
 valide_au date,
 modifie_le timestamptz not null default now(),
 primary key(enrollment_id,habit_key,valide_du),
 foreign key(module_id,module_version,langue,habit_key) references seneve.hd_finance_habit_templates(module_id,module_version,langue,habit_key),
 check(valide_au is null or valide_au>=valide_du)
);

create table seneve.hd_finance_habit_schedules (
 schedule_id uuid primary key default gen_random_uuid(),
 enrollment_id uuid not null references seneve.enrollments(enrollment_id) on delete cascade,
 module_id text not null default 'HABITUDES_DEFIS',
 module_version integer not null default 2,
 langue text not null check(langue in('fr','en')),
 habit_key text not null,
 creneau_id text not null check(creneau_id ~ '^[a-z0-9_]{1,32}$'),
 heure_locale time not null,
 fuseau text not null default 'Africa/Kinshasa',
 jours_iso smallint[] not null,
 cadence text not null check(cadence in('quotidienne','hebdomadaire','choisie')),
 valide_du date not null,
 valide_au date,
 cree_le timestamptz not null default now(),
 foreign key(module_id,module_version,langue,habit_key) references seneve.hd_finance_habit_templates(module_id,module_version,langue,habit_key),
 check(valide_au is null or valide_au>=valide_du),
 check(cardinality(jours_iso) between 1 and 7 and jours_iso <@ array[1,2,3,4,5,6,7]::smallint[]),
 check((cadence='quotidienne' and cardinality(jours_iso)=7) or (cadence='hebdomadaire' and cardinality(jours_iso)=1) or cadence='choisie'),
 unique(enrollment_id,habit_key,creneau_id,valide_du)
);
create index hd_finance_schedules_enrollment_idx on seneve.hd_finance_habit_schedules(enrollment_id,habit_key,valide_du);
create index hd_finance_preferences_date_idx on seneve.hd_finance_habit_preferences(enrollment_id,habit_key,valide_du,valide_au);

alter table seneve.hd_finance_habit_templates enable row level security;
alter table seneve.hd_finance_habit_preferences enable row level security;
alter table seneve.hd_finance_habit_schedules enable row level security;
revoke all on seneve.hd_finance_habit_templates,seneve.hd_finance_habit_preferences,seneve.hd_finance_habit_schedules from public,anon,authenticated,service_role;

insert into seneve.hd_programme_links(programme_id,version,langue,module_id,module_version,actif)
select l.programme_id,2,l.langue,l.module_id,2,false
from seneve.hd_programme_links l where l.version=1 and l.module_id='HABITUDES_DEFIS'
 and l.programme_id in('HABITUDES_DEFIS_30J_FR_V1','HABITUDES_DEFIS_30J_EN_V1');

-- 2. Copie exacte des 181 contenus/jours et des activités déjà éditées dans une version distincte.
create temporary table hd_finance_v2_content_map(old_id uuid primary key,new_id uuid not null unique) on commit drop;
insert into hd_finance_v2_content_map(old_id,new_id)
select c.content_id,gen_random_uuid()
from seneve.contents c where c.version=1 and c.programme_id in('HABITUDES_DEFIS_30J_FR_V1','HABITUDES_DEFIS_30J_EN_V1');

insert into seneve.contents(content_id,legacy_contenu_id,programme_id,version,langue,jour,numero_message,racine_id,theme,titre,principe,lecture,explication,texte_officiel,type_texte,reference_livre,reference_biblique,cree_le)
select m.new_id,coalesce(c.legacy_contenu_id,c.programme_id||'_'||c.jour::text)||'_V2',c.programme_id,2,c.langue,c.jour,c.numero_message,c.racine_id,c.theme,c.titre,c.principe,c.lecture,c.explication,c.texte_officiel,c.type_texte,c.reference_livre,c.reference_biblique,now()
from seneve.contents c join hd_finance_v2_content_map m on m.old_id=c.content_id;

create temporary table hd_finance_v2_activity_map(old_id uuid primary key,new_id uuid not null unique,new_content_id uuid not null) on commit drop;
insert into hd_finance_v2_activity_map(old_id,new_id,new_content_id)
select a.activity_id,gen_random_uuid(),m.new_id from seneve.activities a join hd_finance_v2_content_map m on m.old_id=a.content_id;
do $$begin
 if exists(select 1 from seneve.activities a join hd_finance_v2_activity_map m on m.old_id=a.activity_id
  left join hd_finance_v2_activity_map v on v.old_id=a.variante_de where a.variante_de is not null and v.new_id is null) then
  raise exception 'Une variante liée sort de la version source : arrêter et cartographier la dépendance';
 end if;
end$$;

insert into seneve.activities(activity_id,content_id,type_activite,consigne,obligatoire,format_reponse,critere_realisation,variante_de,niveau,cree_le,note_source)
select m.new_id,m.new_content_id,a.type_activite,a.consigne,a.obligatoire,a.format_reponse,a.critere_realisation,coalesce(v.new_id,a.variante_de),a.niveau,now(),replace(a.note_source,'_V1:','_V2:')
from seneve.activities a join hd_finance_v2_activity_map m on m.old_id=a.activity_id
left join hd_finance_v2_activity_map v on v.old_id=a.variante_de;

-- 3. Quatre brouillons d'activité facultative par jour. Ils n'évaluent ni foi ni paiement.
insert into seneve.activities(activity_id,content_id,type_activite,consigne,obligatoire,format_reponse,critere_realisation,variante_de,niveau,cree_le,note_source)
select gen_random_uuid(),c.content_id,'action',x.consigne,false,null,null,null,null,now(),'RECETTE_HD_FINANCE_V2:'||x.habit_key
from seneve.contents c
cross join lateral (values
 ('reserve_joie',case c.langue when 'fr' then 'Consulte ton repère de Réserve de joie et décide librement de ce que tu souhaites mettre de côté.' else 'Review your Family joy reserve guide and freely decide what, if anything, to set aside.' end),
 ('epargne_investir',case c.langue when 'fr' then 'Consulte ton repère d’Épargne pour investir et décide librement de ce que tu souhaites mettre de côté.' else 'Review your Savings for investing guide and freely decide what, if anything, to set aside.' end),
 ('offrande',case c.langue when 'fr' then 'Si tu souhaites faire une offrande, décide librement de ce que tu veux offrir.' else 'If you wish to make an offering, freely decide what you would like to give.' end),
 ('remboursement_dette',case c.langue when 'fr' then 'Si tu souhaites avancer sur un remboursement, choisis librement l’action que tu veux entreprendre.' else 'If you want to make progress on a debt repayment, freely choose the step you want to take.' end)
) as x(habit_key,consigne)
where c.version=2 and c.programme_id in('HABITUDES_DEFIS_30J_FR_V1','HABITUDES_DEFIS_30J_EN_V1');


-- 4. API privée : aucune lecture directe des préférences ou horaires financiers.
create function seneve_private.hd_finance_settings(p_enrollment_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare e seneve.enrollments%rowtype;l seneve.hd_programme_links%rowtype;z text;j date;
begin
 if auth.uid() is null then raise exception 'Compte requis' using errcode='42501';end if;
 select * into e from seneve.enrollments where enrollment_id=p_enrollment_id
  and participant_id=(select seneve.current_participant_id());
 if not found or e.version<>2 or not seneve.hd_has_current_right(p_enrollment_id) then raise exception 'Réglages financiers non accessibles' using errcode='42501';end if;
 select * into l from seneve.hd_programme_links where programme_id=e.programme_id and version=e.version and langue=e.langue and actif;
 if not found or l.module_id<>'HABITUDES_DEFIS' or l.module_version<>2 then raise exception 'Version financière indisponible' using errcode='42501';end if;
 select coalesce(preferences#>>'{rappels,fuseau}',fuseau) into z from seneve.participants where participant_id=e.participant_id;
 if z is null or not exists(select 1 from pg_catalog.pg_timezone_names where name=z) then raise exception 'Fuseau invalide' using errcode='22023';end if;
 j:=(now() at time zone z)::date;
 return jsonb_build_object(
  'module_v2',true,'enrollment_id',e.enrollment_id,'version',l.module_version,'langue',e.langue,'fuseau',z,
  'date_locale',j,'modifications_a_partir_du',j+1,
  'historique',jsonb_build_object(
   'preferences',(select coalesce(jsonb_agg(jsonb_build_object('habit_key',p.habit_key,'active',p.active,'valide_du',p.valide_du,'valide_au',p.valide_au) order by p.habit_key,p.valide_du),'[]'::jsonb) from seneve.hd_finance_habit_preferences p where p.enrollment_id=e.enrollment_id),
   'creneaux',(select coalesce(jsonb_agg(jsonb_build_object('habit_key',s.habit_key,'creneau_id',s.creneau_id,'heure_locale',to_char(s.heure_locale,'HH24:MI'),'jours_iso',s.jours_iso,'fuseau',s.fuseau,'valide_du',s.valide_du,'valide_au',s.valide_au) order by s.habit_key,s.valide_du,s.heure_locale),'[]'::jsonb) from seneve.hd_finance_habit_schedules s where s.enrollment_id=e.enrollment_id)
  ),
  'habitudes',(select coalesce(jsonb_agg(jsonb_build_object(
    'habit_key',t.habit_key,'libelle',t.libelle,
    'active',coalesce((select p.active from seneve.hd_finance_habit_preferences p where p.enrollment_id=e.enrollment_id and p.habit_key=t.habit_key and p.valide_du<=j and (p.valide_au is null or p.valide_au>=j) order by p.valide_du desc limit 1),t.active_par_defaut),
    'prochain',(select jsonb_build_object('active',p.active,'date',p.valide_du) from seneve.hd_finance_habit_preferences p where p.enrollment_id=e.enrollment_id and p.habit_key=t.habit_key and p.valide_du>j order by p.valide_du limit 1),
    'creneaux',(select coalesce(jsonb_agg(jsonb_build_object('creneau_id',s.creneau_id,'heure_locale',to_char(s.heure_locale,'HH24:MI'),'jours_iso',s.jours_iso) order by s.heure_locale,s.creneau_id),'[]'::jsonb)
      from seneve.hd_finance_habit_schedules s where s.enrollment_id=e.enrollment_id and s.habit_key=t.habit_key and s.valide_du<=j and (s.valide_au is null or s.valide_au>=j) and s.fuseau=z),
    'creneaux_prochains',(select coalesce(jsonb_agg(jsonb_build_object('creneau_id',s.creneau_id,'heure_locale',to_char(s.heure_locale,'HH24:MI'),'jours_iso',s.jours_iso) order by s.heure_locale,s.creneau_id),'[]'::jsonb)
      from seneve.hd_finance_habit_schedules s where s.enrollment_id=e.enrollment_id and s.habit_key=t.habit_key and s.valide_du<=j+1 and (s.valide_au is null or s.valide_au>=j+1) and s.fuseau=z)
   ) order by t.habit_key),'[]'::jsonb)
   from seneve.hd_finance_habit_templates t where t.module_id=l.module_id and t.module_version=l.module_version and t.langue=e.langue)
 );
end$$;

create function seneve_private.hd_finance_habit_set(p_enrollment_id uuid,p_habit_key text,p_active boolean)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare e seneve.enrollments%rowtype;l seneve.hd_programme_links%rowtype;z text;j date;effectif date;
begin
 if auth.uid() is null then raise exception 'Compte requis' using errcode='42501';end if;
 if p_habit_key is null or p_habit_key not in('reserve_joie','epargne_investir','offrande','remboursement_dette') or p_active is null then raise exception 'Choix financier invalide' using errcode='22023';end if;
 select * into e from seneve.enrollments where enrollment_id=p_enrollment_id and participant_id=(select seneve.current_participant_id()) for share;
 if not found or e.version<>2 or not seneve.hd_has_current_right(p_enrollment_id) then raise exception 'Inscription financière non accessible' using errcode='42501';end if;
 select * into l from seneve.hd_programme_links where programme_id=e.programme_id and version=e.version and langue=e.langue and actif;
 if not found or l.module_id<>'HABITUDES_DEFIS' or l.module_version<>2 then raise exception 'Version financière indisponible' using errcode='42501';end if;
 select coalesce(preferences#>>'{rappels,fuseau}',fuseau) into z from seneve.participants where participant_id=e.participant_id for share;
 if z is null or not exists(select 1 from pg_catalog.pg_timezone_names where name=z) then raise exception 'Fuseau invalide' using errcode='22023';end if;
 j:=(now() at time zone z)::date;effectif:=j+1;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('hd-finance|'||e.enrollment_id::text||'|'||p_habit_key,0));
 delete from seneve.hd_finance_habit_preferences where enrollment_id=e.enrollment_id and habit_key=p_habit_key and valide_du>=effectif;
 update seneve.hd_finance_habit_preferences set valide_au=j where enrollment_id=e.enrollment_id and habit_key=p_habit_key and valide_du<effectif and (valide_au is null or valide_au>=effectif);
 insert into seneve.hd_finance_habit_preferences(enrollment_id,module_id,module_version,langue,habit_key,active,valide_du)
 values(e.enrollment_id,l.module_id,l.module_version,e.langue,p_habit_key,p_active,effectif);
 return jsonb_build_object('enrollment_id',e.enrollment_id,'habit_key',p_habit_key,'active',p_active,'effectif_du',effectif);
end$$;

create function seneve_private.hd_finance_savings_schedule_set(p_enrollment_id uuid,p_rythme text,p_heure_locale text,p_jours_iso smallint[])
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare e seneve.enrollments%rowtype;l seneve.hd_programme_links%rowtype;z text;j date;effectif date;jours smallint[];k text;
begin
 if auth.uid() is null then raise exception 'Compte requis' using errcode='42501';end if;
 if p_rythme is null or p_rythme not in('quotidien','hebdomadaire') or p_heure_locale is null or p_heure_locale !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or p_jours_iso is null then raise exception 'Horaire d’épargne invalide' using errcode='22023';end if;
 if p_rythme='quotidien' then jours:=array[1,2,3,4,5,6,7]::smallint[];
 else
  if cardinality(p_jours_iso)<>1 or p_jours_iso[1] not between 1 and 7 then raise exception 'Choisis un seul jour' using errcode='22023';end if;
  jours:=p_jours_iso;
 end if;
 select * into e from seneve.enrollments where enrollment_id=p_enrollment_id and participant_id=(select seneve.current_participant_id()) for share;
 if not found or e.version<>2 or not seneve.hd_has_current_right(p_enrollment_id) then raise exception 'Inscription financière non accessible' using errcode='42501';end if;
 select * into l from seneve.hd_programme_links where programme_id=e.programme_id and version=e.version and langue=e.langue and actif;
 if not found or l.module_id<>'HABITUDES_DEFIS' or l.module_version<>2 then raise exception 'Version financière indisponible' using errcode='42501';end if;
 select coalesce(preferences#>>'{rappels,fuseau}',fuseau) into z from seneve.participants where participant_id=e.participant_id for share;
 if z is null or not exists(select 1 from pg_catalog.pg_timezone_names where name=z) then raise exception 'Fuseau invalide' using errcode='22023';end if;
 j:=(now() at time zone z)::date;effectif:=j+1;
 foreach k in array array['reserve_joie','epargne_investir'] loop
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('hd-finance|'||e.enrollment_id::text||'|'||k,0));
  delete from seneve.hd_finance_habit_schedules where enrollment_id=e.enrollment_id and habit_key=k and valide_du>=effectif;
  update seneve.hd_finance_habit_schedules set valide_au=j where enrollment_id=e.enrollment_id and habit_key=k and valide_du<effectif and (valide_au is null or valide_au>=effectif);
  insert into seneve.hd_finance_habit_schedules(enrollment_id,module_id,module_version,langue,habit_key,creneau_id,heure_locale,fuseau,jours_iso,cadence,valide_du)
  values(e.enrollment_id,l.module_id,l.module_version,e.langue,k,'principal',p_heure_locale::time,z,jours,case when p_rythme='quotidien' then 'quotidienne' else 'hebdomadaire' end,effectif);
 end loop;
 return jsonb_build_object('enrollment_id',e.enrollment_id,'rythme',p_rythme,'effectif_du',effectif);
end$$;

create function seneve_private.hd_finance_schedule_set(p_enrollment_id uuid,p_habit_key text,p_creneau jsonb)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare e seneve.enrollments%rowtype;l seneve.hd_programme_links%rowtype;z text;j date;effectif date;jours smallint[];d jsonb;vus smallint[]:='{}';heure text;slot text;
begin
 if auth.uid() is null then raise exception 'Compte requis' using errcode='42501';end if;
 if p_habit_key not in('offrande','remboursement_dette') or jsonb_typeof(p_creneau)<>'object' or (select count(*) from jsonb_object_keys(p_creneau))<>3
  or not(p_creneau?&array['creneau_id','heure_locale','jours_iso']) then raise exception 'Horaire choisi invalide' using errcode='22023';end if;
 slot:=p_creneau->>'creneau_id';heure:=p_creneau->>'heure_locale';
 if slot !~ '^[a-z0-9_]{1,32}$' or heure !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or jsonb_typeof(p_creneau->'jours_iso')<>'array' or jsonb_array_length(p_creneau->'jours_iso') not between 1 and 7 then raise exception 'Horaire choisi invalide' using errcode='22023';end if;
 for d in select value from jsonb_array_elements(p_creneau->'jours_iso') loop
  if jsonb_typeof(d)<>'number' or d::text !~ '^[1-7]$' or (d::text::smallint)=any(vus) then raise exception 'Jours choisis invalides' using errcode='22023';end if;
  vus:=array_append(vus,d::text::smallint);
 end loop;
 select array_agg(v order by v) into jours from unnest(vus)v;
 select * into e from seneve.enrollments where enrollment_id=p_enrollment_id and participant_id=(select seneve.current_participant_id()) for share;
 if not found or e.version<>2 or not seneve.hd_has_current_right(p_enrollment_id) then raise exception 'Inscription financière non accessible' using errcode='42501';end if;
 select * into l from seneve.hd_programme_links where programme_id=e.programme_id and version=e.version and langue=e.langue and actif;
 if not found or l.module_id<>'HABITUDES_DEFIS' or l.module_version<>2 then raise exception 'Version financière indisponible' using errcode='42501';end if;
 select coalesce(preferences#>>'{rappels,fuseau}',fuseau) into z from seneve.participants where participant_id=e.participant_id for share;
 if z is null or not exists(select 1 from pg_catalog.pg_timezone_names where name=z) then raise exception 'Fuseau invalide' using errcode='22023';end if;
 j:=(now() at time zone z)::date;effectif:=j+1;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('hd-finance|'||e.enrollment_id::text||'|'||p_habit_key,0));
 delete from seneve.hd_finance_habit_schedules where enrollment_id=e.enrollment_id and habit_key=p_habit_key and valide_du>=effectif;
 update seneve.hd_finance_habit_schedules set valide_au=j where enrollment_id=e.enrollment_id and habit_key=p_habit_key and valide_du<effectif and (valide_au is null or valide_au>=effectif);
 insert into seneve.hd_finance_habit_schedules(enrollment_id,module_id,module_version,langue,habit_key,creneau_id,heure_locale,fuseau,jours_iso,cadence,valide_du)
 values(e.enrollment_id,l.module_id,l.module_version,e.langue,p_habit_key,slot,heure::time,z,jours,'choisie',effectif);
 return jsonb_build_object('enrollment_id',e.enrollment_id,'habit_key',p_habit_key,'effectif_du',effectif);
end$$;

create function seneve.hd_finance_settings(p_enrollment_id uuid) returns jsonb language sql stable security invoker set search_path=''
 as $$select seneve_private.hd_finance_settings(p_enrollment_id)$$;
create function seneve.hd_finance_habit_set(p_enrollment_id uuid,p_habit_key text,p_active boolean) returns jsonb language sql volatile security invoker set search_path=''
 as $$select seneve_private.hd_finance_habit_set(p_enrollment_id,p_habit_key,p_active)$$;
create function seneve.hd_finance_savings_schedule_set(p_enrollment_id uuid,p_rythme text,p_heure_locale text,p_jours_iso smallint[]) returns jsonb language sql volatile security invoker set search_path=''
 as $$select seneve_private.hd_finance_savings_schedule_set(p_enrollment_id,p_rythme,p_heure_locale,p_jours_iso)$$;
create function seneve.hd_finance_schedule_set(p_enrollment_id uuid,p_habit_key text,p_creneau jsonb) returns jsonb language sql volatile security invoker set search_path=''
 as $$select seneve_private.hd_finance_schedule_set(p_enrollment_id,p_habit_key,p_creneau)$$;
revoke all on function seneve_private.hd_finance_settings(uuid),seneve_private.hd_finance_habit_set(uuid,text,boolean),seneve_private.hd_finance_savings_schedule_set(uuid,text,text,smallint[]),seneve_private.hd_finance_schedule_set(uuid,text,jsonb) from public,anon,authenticated;
revoke all on function seneve.hd_finance_settings(uuid),seneve.hd_finance_habit_set(uuid,text,boolean),seneve.hd_finance_savings_schedule_set(uuid,text,text,smallint[]),seneve.hd_finance_schedule_set(uuid,text,jsonb) from public,anon;
grant execute on function seneve_private.hd_finance_settings(uuid),seneve_private.hd_finance_habit_set(uuid,text,boolean),seneve_private.hd_finance_savings_schedule_set(uuid,text,text,smallint[]),seneve_private.hd_finance_schedule_set(uuid,text,jsonb),seneve.hd_finance_settings(uuid),seneve.hd_finance_habit_set(uuid,text,boolean),seneve.hd_finance_savings_schedule_set(uuid,text,text,smallint[]),seneve.hd_finance_schedule_set(uuid,text,jsonb) to authenticated;

-- 5. Étendre le calcul des créneaux existant sans remplacer ses règles de consentement.
-- L'ancien calcul est conservé sous un nom privé et reste appelé pour les 16 habitudes d'origine.
do $$declare d text;old text;begin
 if to_regprocedure('seneve_private.hd_expected_push_slots_base(uuid,date)') is not null then
  raise exception 'Une base de calcul des rappels financiers existe déjà : examiner avant reprise';
 end if;
 if to_regprocedure('seneve_private.hd_expected_push_slots(uuid,date)') is null then
  raise exception 'Calcul des rappels existant absent : arrêter la migration';
 end if;
 d:=pg_get_functiondef('seneve_private.hd_expected_push_slots(uuid,date)'::regprocedure);
 old:='a.note_source=''RECETTE_HD_QUOTIDIEN_V1:''||r.habit_key';
 if strpos(d,old)=0 then raise exception 'Règle des rappels quotidiens différente : examiner avant migration';end if;
 d:=replace(d,old,'a.note_source in(''RECETTE_HD_QUOTIDIEN_V1:''||r.habit_key,''RECETTE_HD_QUOTIDIEN_V2:''||r.habit_key)');
 old:='a.note_source=''RECETTE_HD_CULTE_V1:''||r.habit_key||'':''||r.rang';
 if strpos(d,old)=0 then raise exception 'Règle des rappels de culte différente : examiner avant migration';end if;
 d:=replace(d,old,'a.note_source in(''RECETTE_HD_CULTE_V1:''||r.habit_key||'':''||r.rang,''RECETTE_HD_CULTE_V2:''||r.habit_key||'':''||r.rang)');
 old:='a.note_source=''RECETTE_HD_DIME_V1:dime''';
 if strpos(d,old)=0 then raise exception 'Règle des rappels de dîme différente : examiner avant migration';end if;
 d:=replace(d,old,'a.note_source in(''RECETTE_HD_DIME_V1:dime'',''RECETTE_HD_DIME_V2:dime'')');
 execute d;
 alter function seneve_private.hd_expected_push_slots(uuid,date) rename to hd_expected_push_slots_base;
end$$;

create function seneve_private.hd_expected_push_slots(p_enrollment_id uuid,p_date date)
returns table(activity_id uuid,creneau timestamptz)
language plpgsql stable security definer set search_path='' as $$
declare e seneve.enrollments%rowtype;l seneve.hd_programme_links%rowtype;z text;cfg seneve.hd_delivery_preferences%rowtype;accord boolean;relances boolean;
begin
 -- Les créneaux historiques gardent exactement leur contrôle et leur calcul d'origine.
 return query select x.activity_id,x.creneau from seneve_private.hd_expected_push_slots_base(p_enrollment_id,p_date)x;
 select * into e from seneve.enrollments where enrollment_id=p_enrollment_id and etat='active' and version=2
  and seneve_private.hd_push_participant_admis(participant_id);
 if not found then return;end if;
 select * into l from seneve.hd_programme_links where programme_id=e.programme_id and version=e.version and langue=e.langue and actif;
 if not found or l.module_id<>'HABITUDES_DEFIS' or l.module_version<>2 then return;end if;
 select coalesce(preferences#>>'{rappels,fuseau}',fuseau) into z from seneve.participants where participant_id=e.participant_id;
 select * into cfg from seneve.hd_delivery_preferences where participant_id=e.participant_id;
 if not found or not cfg.actif or not('push'=any(cfg.canaux)) or cfg.fuseau is distinct from z
  or z is null or not exists(select 1 from pg_catalog.pg_timezone_names where name=z) then return;end if;
 select coalesce(bool_and(c.etat='accorde' and c.preuve is not null and c.version_texte is not null),false) into accord
 from seneve.consents c where c.participant_id=e.participant_id and c.canal='push' and c.finalite='rappels'
  and c.decide_le=(select max(d.decide_le) from seneve.consents d where d.participant_id=e.participant_id and d.canal='push' and d.finalite='rappels' and d.decide_le<=now());
 if not coalesce(accord,false) or not exists(select 1 from seneve.push_appareils p where p.participant_id=e.participant_id) then return;end if;
 if p_date not in((now() at time zone z)::date,(now() at time zone z)::date+1) then return;end if;
 select coalesce(relances_30min_actives,false) into relances from seneve.hd_push_dispatch_config where id;
 return query
 with prefs as (
  select t.habit_key,coalesce((select p.active from seneve.hd_finance_habit_preferences p where p.enrollment_id=e.enrollment_id and p.habit_key=t.habit_key and p.valide_du<=p_date and (p.valide_au is null or p.valide_au>=p_date) order by p.valide_du desc limit 1),t.active_par_defaut) active
  from seneve.hd_finance_habit_templates t where t.module_id=l.module_id and t.module_version=l.module_version and t.langue=e.langue
 ), slots as (
  select a.activity_id aid,(p_date+s.heure_locale) at time zone z instant,s.heure_locale
  from seneve.hd_finance_habit_schedules s join prefs p using(habit_key)
  join seneve.contents c on c.programme_id=e.programme_id and c.version=e.version and c.langue=e.langue and seneve.hd_date_du_jour(e.enrollment_id,c.jour)=p_date
  join seneve.activities a on a.content_id=c.content_id and a.type_activite='action' and a.obligatoire=false and a.note_source='RECETTE_HD_FINANCE_V2:'||s.habit_key
  where s.enrollment_id=e.enrollment_id and s.module_id=l.module_id and s.module_version=l.module_version and s.langue=e.langue
   and s.valide_du<=p_date and(s.valide_au is null or s.valide_au>=p_date) and s.fuseau=z
   and extract(isodow from p_date)::smallint=any(s.jours_iso) and p.active
 ), eligible as (
  select distinct s.aid,s.instant from slots s where seneve.hd_droit_a(e.enrollment_id,s.instant)
   and(s.instant at time zone z)::time=s.heure_locale
   and not exists(select 1 from seneve.activity_state st where st.enrollment_id=e.enrollment_id and st.activity_id=s.aid and st.etat='realisee')
   and not exists(select 1 from seneve.hd_reminder_skips sk where sk.enrollment_id=e.enrollment_id and sk.activity_id=s.aid)
 )
 select el.aid,g.instant from eligible el cross join lateral generate_series(el.instant,
   case when coalesce(relances,false) then ((p_date+1)::timestamp at time zone z)-interval '1 microsecond' else el.instant end,
   interval '30 minutes')g(instant)
 where seneve.hd_droit_a(e.enrollment_id,g.instant);
end$$;
revoke all on function seneve_private.hd_expected_push_slots_base(uuid,date),seneve_private.hd_expected_push_slots(uuid,date) from public,anon,authenticated;
grant execute on function seneve_private.hd_expected_push_slots(uuid,date) to authenticated,service_role;

-- 5a. Le serveur refuse l'activité financière si elle n'a pas été activée explicitement
-- et si aucun créneau ne l'autorise pour cette date locale.
create function seneve_private.hd_finance_activity_admis(p_enrollment_id uuid,p_activity_id uuid)
returns boolean language plpgsql stable security definer set search_path='' as $$
declare e seneve.enrollments%rowtype;l seneve.hd_programme_links%rowtype;z text;j date;k text;
begin
 if auth.uid() is null then return false;end if;
 select * into e from seneve.enrollments where enrollment_id=p_enrollment_id and participant_id=(select seneve.current_participant_id()) and version=2 and etat='active';
 if not found or not seneve.hd_has_current_right(p_enrollment_id) then return false;end if;
 select * into l from seneve.hd_programme_links where programme_id=e.programme_id and version=e.version and langue=e.langue and actif;
 if not found or l.module_id<>'HABITUDES_DEFIS' or l.module_version<>2 then return false;end if;
 select coalesce(preferences#>>'{rappels,fuseau}',fuseau) into z from seneve.participants where participant_id=e.participant_id;
 if z is null or not exists(select 1 from pg_catalog.pg_timezone_names where name=z) then return false;end if;
 select split_part(a.note_source,':',2),seneve.hd_date_du_jour(e.enrollment_id,c.jour) into k,j
 from seneve.activities a join seneve.contents c using(content_id)
 where a.activity_id=p_activity_id and a.obligatoire=false and c.programme_id=e.programme_id and c.version=e.version and c.langue=e.langue
  and a.note_source ~ '^RECETTE_HD_FINANCE_V2:(reserve_joie|epargne_investir|offrande|remboursement_dette)$';
 if not found or j is null then return false;end if;
 return exists(
  select 1 from seneve.hd_finance_habit_templates t
  where t.module_id=l.module_id and t.module_version=l.module_version and t.langue=e.langue and t.habit_key=k
   and coalesce((select p.active from seneve.hd_finance_habit_preferences p where p.enrollment_id=e.enrollment_id and p.habit_key=k and p.valide_du<=j and(p.valide_au is null or p.valide_au>=j) order by p.valide_du desc limit 1),t.active_par_defaut)
   and exists(select 1 from seneve.hd_finance_habit_schedules s where s.enrollment_id=e.enrollment_id and s.habit_key=k and s.valide_du<=j and(s.valide_au is null or s.valide_au>=j) and s.fuseau=z and extract(isodow from j)::smallint=any(s.jours_iso))
 );
end$$;
revoke all on function seneve_private.hd_finance_activity_admis(uuid,uuid) from public,anon,authenticated;

-- Patch the existing trigger with guarded, exact source fragments; stop on an unexpected live definition.
do $$declare d text;old text;begin
 d:=pg_get_functiondef('seneve.hd_progress_access_guard()'::regprocedure);
 old:='if source like ''RECETTE_HD_CULTE_V1:%'' or source=''RECETTE_HD_DIME_V1:dime'' then';
 if strpos(d,old)=0 then raise exception 'Garde serveur des activités différente : examiner avant migration';end if;
 d:=replace(d,old,'if source like ''RECETTE_HD_CULTE_V1:%'' or source like ''RECETTE_HD_CULTE_V2:%'' or source in(''RECETTE_HD_DIME_V1:dime'',''RECETTE_HD_DIME_V2:dime'') then');
 old:='if source=''RECETTE_HD_DIME_V1:dime'' then habit:=''dime'';rang:=1;';
 if strpos(d,old)=0 then raise exception 'Contrôle de dîme différent : examiner avant migration';end if;
 d:=replace(d,old,'if source in(''RECETTE_HD_DIME_V1:dime'',''RECETTE_HD_DIME_V2:dime'') then habit:=''dime'';rang:=1;');
 old:='source!~''^RECETTE_HD_CULTE_V1:(culte_semaine|culte_dimanche):[1-7]$''';
 if strpos(d,old)=0 then raise exception 'Contrôle de créneaux de culte différent : examiner avant migration';end if;
 d:=replace(d,old,'source!~''^RECETTE_HD_CULTE_V[12]:(culte_semaine|culte_dimanche):[1-7]$''');
 old:='if source like ''RECETTE_HD_CULTE_V1:%'' or source like ''RECETTE_HD_CULTE_V2:%''';
 d:=replace(d,old,'if source like ''RECETTE_HD_FINANCE_V2:%'' then if not seneve_private.hd_finance_activity_admis(new.enrollment_id,new.activity_id) then raise exception ''Activité financière non choisie ou hors horaire'' using errcode=''42501'';end if;end if; '||old);
 execute d;
end$$;
