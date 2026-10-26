-- Service interne TEST : réutilise une inscription HD existante et explicitement configurée.
-- Aucun catalogue, inscription ou paiement créé par cette migration.
grant insert on seneve.hd_access_periods to service_role;
grant select on seneve.hd_modules to service_role;
create function seneve.hd_open_free_period(p_enrollment_id uuid,p_offre_id text)
returns jsonb language plpgsql volatile security invoker set search_path='' as $$
declare e seneve.enrollments%rowtype;ancien seneve.hd_access_periods%rowtype;
 d seneve.entitlements%rowtype;o seneve.offers%rowtype;v_fuseau text;v_debut timestamptz:=now();v_fin timestamptz;
begin
 select * into e from seneve.enrollments where enrollment_id=p_enrollment_id;
 if not found then return jsonb_build_object('cree',false,'motif','inscription_absente');end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('hd-gratuit|'||e.participant_id::text,0));
 select * into ancien from seneve.hd_access_periods where participant_id=e.participant_id and mois=1;
 if found then
  if ancien.enrollment_id<>e.enrollment_id then return jsonb_build_object('cree',false,'motif','gratuite_deja_utilisee');end if;
  select * into d from seneve.entitlements where entitlement_id=ancien.entitlement_id;
  return jsonb_build_object('cree',false,'existant',true,'enrollment_id',ancien.enrollment_id,'entitlement_id',ancien.entitlement_id,'debut',ancien.debut,'fin_exclue',ancien.fin_exclue,'etat',d.etat);
 end if;
 if e.etat<>'active' or not exists(
  select 1 from seneve.hd_programme_links l
  join seneve.hd_modules m on m.module_id=l.module_id and m.version=l.module_version and m.langue=l.langue
  join seneve.programme_versions v on v.programme_id=l.programme_id and v.version=l.version
  where l.programme_id=e.programme_id and l.version=e.version and l.langue=e.langue and l.actif
   and m.duree_gratuite_jours=30 and v.etat in('publiee','archivee'))then
  return jsonb_build_object('cree',false,'motif','programme_non_autorise');end if;
 select * into o from seneve.offers where offre_id=p_offre_id;
 if not found or not o.actif or o.programme_id is distinct from e.programme_id or o.langue<>e.langue
  or o.type_offre<>'habitudes_defis_gratuit' or o.prix is distinct from 0::numeric
  or o.duree_acces_jours is distinct from 30 or o.chariow_product_id is not null or o.lien_achat is not null then
  return jsonb_build_object('cree',false,'motif','offre_gratuite_non_configuree');end if;
 select coalesce(p.preferences#>>'{rappels,fuseau}',p.fuseau)into v_fuseau from seneve.participants p where p.participant_id=e.participant_id;
 if v_fuseau is null or not exists(select 1 from pg_catalog.pg_timezone_names where name=v_fuseau)then
  return jsonb_build_object('cree',false,'motif','fuseau_invalide');end if;
 if e.date_debut<>(v_debut at time zone v_fuseau)::date then
  return jsonb_build_object('cree',false,'motif','debut_inscription_non_concordant');end if;
 -- Trente jours de 24 heures à compter de l'ouverture effective ; fin exclusive.
 v_fin:=v_debut+interval '720 hours';
 insert into seneve.entitlements(participant_id,offre_id,origine,etat,debut,fin)
 values(e.participant_id,o.offre_id,'gratuit','actif',v_debut,v_fin)returning * into d;
 insert into seneve.hd_access_periods(enrollment_id,participant_id,mois,entitlement_id,debut,fin_exclue)
 values(e.enrollment_id,e.participant_id,1,d.entitlement_id,v_debut,v_fin);
 return jsonb_build_object('cree',true,'existant',false,'enrollment_id',e.enrollment_id,'entitlement_id',d.entitlement_id,'debut',v_debut,'fin_exclue',v_fin,'etat',d.etat);
end$$;
revoke all on function seneve.hd_open_free_period(uuid,text)from public,anon,authenticated;
grant execute on function seneve.hd_open_free_period(uuid,text)to service_role;
