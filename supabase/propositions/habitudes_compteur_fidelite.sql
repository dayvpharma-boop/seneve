-- TEST d'abord. Compteur privé « Mes jours de fidélité » (cahier HD § 7.2–7.3, HD-10 à HD-15).
-- Décisions de Dr Justin du 27/10/2026 : masqué par défaut, effacé 30 jours après la fin du parcours.
-- Données minimales : une date de début de série, un choix d'affichage, la valeur précédente pour annuler.
-- Aucun motif, aucun texte, aucun partenaire, aucune trace d'audit ni de progression.
create table seneve_private.hd_fidelite(
 enrollment_id uuid primary key references seneve.enrollments(enrollment_id)on delete cascade,
 participant_id uuid not null references seneve.participants(participant_id)on delete cascade,
 debut_serie date not null,
 masque boolean not null default true,
 precedent_debut date,
 derniere_declaration uuid,
 maj_le timestamptz not null default now()
);
alter table seneve_private.hd_fidelite enable row level security;
revoke all on seneve_private.hd_fidelite from public,anon,authenticated;

-- Seul le titulaire d'une inscription Habitudes & Défis y accède ; renvoie l'inscription et sa date locale.
create function seneve_private.hd_fidelite_inscription(p_enrollment_id uuid,out e seneve.enrollments,out j date)
language plpgsql stable security definer set search_path='' as $$
declare z text;
begin
 if auth.uid()is null then raise exception 'Compte requis'using errcode='42501';end if;
 select * into e from seneve.enrollments x where x.enrollment_id=p_enrollment_id
 and x.participant_id=(select seneve.current_participant_id());
 if not found or not exists(select 1 from seneve.hd_programme_links l where l.programme_id=e.programme_id and l.version=e.version and l.langue=e.langue)
  then raise exception 'Compteur non accessible'using errcode='42501';end if;
 select coalesce(preferences#>>'{rappels,fuseau}',fuseau)into z from seneve.participants where participant_id=e.participant_id;
 if z is null or not exists(select 1 from pg_catalog.pg_timezone_names where name=z)then raise exception 'Fuseau invalide'using errcode='22023';end if;
 j:=(now()at time zone z)::date;
end$$;

create function seneve_private.hd_fidelite_etat(e seneve.enrollments,j date)returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('enrollment_id',e.enrollment_id,'date_locale',j,
  'debut_serie',coalesce(f.debut_serie,e.date_debut),'jours',greatest(0,j-coalesce(f.debut_serie,e.date_debut)),
  'masque',coalesce(f.masque,true),'annulable',f.precedent_debut is not null)
 from(select 1)x left join seneve_private.hd_fidelite f on f.enrollment_id=e.enrollment_id
$$;

-- Lecture : toujours possible pour le titulaire, même accès arrêté (rien n'est effacé avant 30 jours).
create function seneve_private.hd_fidelite_lire(p_enrollment_id uuid)returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare i record;
begin
 select * into i from seneve_private.hd_fidelite_inscription(p_enrollment_id);
 return seneve_private.hd_fidelite_etat(i.e,i.j);
end$$;

create function seneve_private.hd_fidelite_masquer(p_enrollment_id uuid,p_masque boolean)returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare i record;
begin
 if p_masque is null then raise exception 'Choix invalide'using errcode='22023';end if;
 select * into i from seneve_private.hd_fidelite_inscription(p_enrollment_id);
 insert into seneve_private.hd_fidelite(enrollment_id,participant_id,debut_serie,masque)
 values((i.e).enrollment_id,(i.e).participant_id,(i.e).date_debut,p_masque)
 on conflict(enrollment_id)do update set masque=excluded.masque,maj_le=now();
 return seneve_private.hd_fidelite_etat(i.e,i.j);
end$$;

-- Seule déclaration possible : relation sexuelle hors mariage, volontaire, confirmée.
-- Remet uniquement la série à aujourd'hui ; jour du parcours, activités, achats et droits ne bougent pas.
-- Un double appui (même identifiant) ne produit qu'une remise à zéro.
create function seneve_private.hd_fidelite_declarer(p_enrollment_id uuid,p_client_event_id uuid,p_confirmation boolean)returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare i record;f seneve_private.hd_fidelite%rowtype;
begin
 if p_client_event_id is null or p_confirmation is distinct from true then raise exception 'Confirmation requise'using errcode='22023';end if;
 select * into i from seneve_private.hd_fidelite_inscription(p_enrollment_id);
 if not seneve.hd_has_current_right(p_enrollment_id)then raise exception 'Accès non ouvert'using errcode='42501';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('hd-fidelite|'||p_enrollment_id::text,0));
 select * into f from seneve_private.hd_fidelite where enrollment_id=p_enrollment_id;
 if f.derniere_declaration=p_client_event_id then
  return seneve_private.hd_fidelite_etat(i.e,i.j)||jsonb_build_object('repetition',true);
 end if;
 insert into seneve_private.hd_fidelite as t(enrollment_id,participant_id,debut_serie,precedent_debut,derniere_declaration)
 values((i.e).enrollment_id,(i.e).participant_id,i.j,(i.e).date_debut,p_client_event_id)
 on conflict(enrollment_id)do update set
  -- Deux déclarations le même jour gardent la valeur d'avant la première, pour que l'annulation reste juste.
  precedent_debut=case when t.debut_serie=i.j then coalesce(t.precedent_debut,t.debut_serie)else t.debut_serie end,
  debut_serie=i.j,derniere_declaration=excluded.derniere_declaration,maj_le=now();
 return seneve_private.hd_fidelite_etat(i.e,i.j)||jsonb_build_object('repetition',false);
end$$;

-- « Annuler ma dernière saisie » : rétablit la série d'avant la dernière déclaration, une seule fois.
create function seneve_private.hd_fidelite_annuler(p_enrollment_id uuid)returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare i record;
begin
 select * into i from seneve_private.hd_fidelite_inscription(p_enrollment_id);
 update seneve_private.hd_fidelite set debut_serie=precedent_debut,precedent_debut=null,derniere_declaration=null,maj_le=now()
 where enrollment_id=p_enrollment_id and precedent_debut is not null;
 if not found then raise exception 'Rien à annuler'using errcode='22023';end if;
 return seneve_private.hd_fidelite_etat(i.e,i.j);
end$$;

-- Effacement 30 jours après la fin du parcours : dernière période d'accès, à défaut la fin prévue.
create function seneve_private.hd_fidelite_purger()returns integer
language plpgsql volatile security definer set search_path='' as $$
declare n integer;
begin
 delete from seneve_private.hd_fidelite f using seneve.enrollments e
 where e.enrollment_id=f.enrollment_id
 and coalesce((select max(p.fin_exclue)from seneve.hd_access_periods p where p.enrollment_id=f.enrollment_id),
  (e.date_fin_prevue+1)::timestamptz)+interval '30 days'<now();
 get diagnostics n=row_count;
 return n;
end$$;
revoke all on function seneve_private.hd_fidelite_purger()from public,anon,authenticated;
select cron.schedule('seneve-hd-fidelite-effacement','40 2 * * *','select seneve_private.hd_fidelite_purger()');

-- Façades RPC invoker ; la lecture et l'écriture restent dans le schéma privé.
create function seneve.hd_fidelite_lire(p_enrollment_id uuid)returns jsonb language sql stable security invoker set search_path=''
 as $$select seneve_private.hd_fidelite_lire(p_enrollment_id)$$;
create function seneve.hd_fidelite_masquer(p_enrollment_id uuid,p_masque boolean)returns jsonb language sql volatile security invoker set search_path=''
 as $$select seneve_private.hd_fidelite_masquer(p_enrollment_id,p_masque)$$;
create function seneve.hd_fidelite_declarer(p_enrollment_id uuid,p_client_event_id uuid,p_confirmation boolean)returns jsonb language sql volatile security invoker set search_path=''
 as $$select seneve_private.hd_fidelite_declarer(p_enrollment_id,p_client_event_id,p_confirmation)$$;
create function seneve.hd_fidelite_annuler(p_enrollment_id uuid)returns jsonb language sql volatile security invoker set search_path=''
 as $$select seneve_private.hd_fidelite_annuler(p_enrollment_id)$$;
revoke all on function seneve_private.hd_fidelite_inscription(uuid),seneve_private.hd_fidelite_etat(seneve.enrollments,date)from public,anon,authenticated;
revoke all on function seneve_private.hd_fidelite_lire(uuid),seneve_private.hd_fidelite_masquer(uuid,boolean),
 seneve_private.hd_fidelite_declarer(uuid,uuid,boolean),seneve_private.hd_fidelite_annuler(uuid),
 seneve.hd_fidelite_lire(uuid),seneve.hd_fidelite_masquer(uuid,boolean),seneve.hd_fidelite_declarer(uuid,uuid,boolean),seneve.hd_fidelite_annuler(uuid)from public,anon;
grant execute on function seneve_private.hd_fidelite_lire(uuid),seneve_private.hd_fidelite_masquer(uuid,boolean),
 seneve_private.hd_fidelite_declarer(uuid,uuid,boolean),seneve_private.hd_fidelite_annuler(uuid),
 seneve.hd_fidelite_lire(uuid),seneve.hd_fidelite_masquer(uuid,boolean),seneve.hd_fidelite_declarer(uuid,uuid,boolean),seneve.hd_fidelite_annuler(uuid)to authenticated;
