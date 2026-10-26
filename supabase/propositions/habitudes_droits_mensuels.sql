-- Extension additive de TEST. Aucun parcours, droit, offre ou lien actif créé.
create table seneve.hd_programme_links (
 programme_id text not null, version integer not null, langue text not null,
 module_id text not null, module_version integer not null,
 actif boolean not null default false,
 primary key(programme_id,version,langue),
 foreign key(programme_id,version) references seneve.programme_versions(programme_id,version),
 foreign key(module_id,module_version,langue) references seneve.hd_modules(module_id,version,langue)
);
create index hd_programme_links_module_idx on seneve.hd_programme_links(module_id,module_version,langue);
create table seneve.hd_access_periods (
 enrollment_id uuid not null references seneve.enrollments(enrollment_id),
 participant_id uuid not null references seneve.participants(participant_id),
 mois smallint not null check(mois between 1 and 6),
 entitlement_id uuid not null unique references seneve.entitlements(entitlement_id),
 debut timestamptz not null, fin_exclue timestamptz not null,
 primary key(enrollment_id,mois), check(fin_exclue>debut)
);
-- Un seul premier mois gratuit pour le module, indépendamment de la langue/version.
create unique index hd_access_one_free_idx on seneve.hd_access_periods(participant_id) where mois=1;
create index hd_access_periods_participant_idx on seneve.hd_access_periods(participant_id);
alter table seneve.hd_programme_links enable row level security;
alter table seneve.hd_access_periods enable row level security;
revoke all on seneve.hd_programme_links,seneve.hd_access_periods from public,anon,authenticated,service_role;
grant select on seneve.hd_programme_links,seneve.hd_access_periods to authenticated;
create policy hd_links_read on seneve.hd_programme_links for select to authenticated using(actif);
create policy hd_period_owner_read on seneve.hd_access_periods for select to authenticated using(
 participant_id=(select seneve.current_participant_id()));
-- Contrôle de cohérence serveur des périodes préparées par l'administrateur.
create function seneve.hd_validate_access_period() returns trigger language plpgsql security invoker set search_path='' as $$
declare e seneve.enrollments%rowtype; d seneve.entitlements%rowtype; o seneve.offers%rowtype;
begin
 select * into strict e from seneve.enrollments where enrollment_id=new.enrollment_id;
 select * into strict d from seneve.entitlements where entitlement_id=new.entitlement_id;
 select * into strict o from seneve.offers where offre_id=d.offre_id;
 if new.participant_id<>e.participant_id or d.participant_id<>e.participant_id or o.programme_id is distinct from e.programme_id or o.langue<>e.langue then
  raise exception 'Période et droit ne correspondent pas à cette inscription.' using errcode='23514';
 end if;
 if not exists(select 1 from seneve.hd_programme_links l where l.programme_id=e.programme_id and l.version=e.version and l.langue=e.langue)then
  raise exception 'Programme non déclaré pour Habitudes et Défis.' using errcode='23514';
 end if;
 if d.fin is null or new.debut<d.debut or new.fin_exclue>d.fin then
  raise exception 'La période dépasse le droit.' using errcode='23514';
 end if;
 if (new.mois=1 and d.origine<>'gratuit') or (new.mois>1 and (d.origine<>'achat' or d.payment_event_id is null)) then
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
revoke all on function seneve.hd_validate_access_period() from public,anon,authenticated;
create trigger hd_access_period_check before insert or update on seneve.hd_access_periods for each row execute function seneve.hd_validate_access_period();
create function seneve.hd_has_current_right(p_enrollment_id uuid) returns boolean language sql stable security invoker set search_path='' as $$
 select exists(
 select 1 from seneve.enrollments e
 join seneve.hd_programme_links l on l.programme_id=e.programme_id and l.version=e.version and l.langue=e.langue and l.actif
 join seneve.programme_versions v on v.programme_id=e.programme_id and v.version=e.version and v.etat in ('publiee','archivee')
 join seneve.hd_access_periods p on p.enrollment_id=e.enrollment_id and p.participant_id=e.participant_id
 join seneve.entitlements d on d.entitlement_id=p.entitlement_id and d.participant_id=e.participant_id
 join seneve.offers o on o.offre_id=d.offre_id and o.programme_id=e.programme_id and o.langue=e.langue
 where e.enrollment_id=p_enrollment_id and e.participant_id=(select seneve.current_participant_id()) and e.etat='active'
 and d.etat='actif' and d.fin is not null
 and now()>=p.debut and now()<p.fin_exclue and now()>=d.debut and now()<d.fin
 and p.debut>=d.debut and p.fin_exclue<=d.fin
 and ((p.mois=1 and d.origine='gratuit') or (p.mois>1 and d.origine='achat' and d.payment_event_id is not null))
 );
$$;
revoke all on function seneve.hd_has_current_right(uuid) from public,anon;
grant execute on function seneve.hd_has_current_right(uuid) to authenticated;
