-- Catalogue éditorial HD : liens seulement, pas de copie de médias.
create table seneve.hd_recommendations(
 id uuid primary key,
 categorie text not null check(categorie in('lecture_pro','lecture_personnelle','predication')),
 titre text not null check(char_length(titre)between 1 and 180),
 auteur text not null check(char_length(auteur)between 1 and 160),
 langue text not null check(langue in('fr','en')),
 url text not null check(char_length(url)between 10 and 2000 and url~*'^https://[a-z0-9][a-z0-9.-]*\.[a-z]{2,}(:443)?([/?#][^[:space:]]*)?$'),
 description text not null default '' check(char_length(description)<=600),
 acces text not null check(acces in('gratuit','payant','a_verifier')),
 etat text not null check(etat in('brouillon','publie','retire')),
 validee_le timestamptz,
 revision integer not null default 1 check(revision>0),
 cree_le timestamptz not null default clock_timestamp(),
 modifie_le timestamptz not null default clock_timestamp(),
 check((etat='publie')=(validee_le is not null))
);
alter table seneve.hd_recommendations enable row level security;
create policy hd_recommendations_read on seneve.hd_recommendations for select to authenticated
 using((select auth.uid())is not null and (etat='publie' or (select seneve.has_role('administrateur'))));
revoke all on seneve.hd_recommendations from public,anon,authenticated;
grant select on seneve.hd_recommendations to authenticated;

create table seneve_private.hd_recommendation_writes(
 evenement uuid primary key, empreinte text not null, resultat jsonb not null
);
alter table seneve_private.hd_recommendation_writes enable row level security;
create policy hd_recommendation_writes_private on seneve_private.hd_recommendation_writes to authenticated using(false)with check(false);
revoke all on seneve_private.hd_recommendation_writes from public,anon,authenticated;

create function seneve.staff_hd_recommandations()
returns jsonb language plpgsql stable security invoker set search_path='' as $$
begin
 if auth.uid()is null or not seneve.has_role('administrateur')then raise exception 'Administration requise'using errcode='42501';end if;
 return(select coalesce(jsonb_agg(to_jsonb(r)order by r.modifie_le desc,r.id),'[]'::jsonb)from seneve.hd_recommendations r);
end $$;

create function seneve.hd_recommandations(p_langue text)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
begin
 if auth.uid()is null then raise exception 'Session requise'using errcode='28000';end if;
 if p_langue is null or p_langue not in('fr','en')then raise exception 'Langue invalide'using errcode='22023';end if;
 return(select coalesce(jsonb_agg(to_jsonb(r)order by r.categorie,r.titre,r.id),'[]'::jsonb)from seneve.hd_recommendations r where r.etat='publie' and r.langue=p_langue);
end $$;

create function seneve.staff_hd_recommandation_enregistrer(p_id uuid,p_revision integer,p_evenement uuid,p_contenu jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 ancien seneve.hd_recommendations%rowtype;r seneve.hd_recommendations%rowtype;
 deja seneve_private.hd_recommendation_writes%rowtype;
 empreinte text;publie boolean;
begin
 if auth.uid()is null or not seneve.has_role('administrateur')then raise exception 'Administration requise'using errcode='42501';end if;
 if p_id is null or p_evenement is null or p_revision is null or p_revision<0 or jsonb_typeof(p_contenu)is distinct from 'object'then
  raise exception 'Saisie invalide'using errcode='22023';end if;
 empreinte:=md5(p_id::text||'|'||p_revision::text||'|'||p_contenu::text);
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_id::text,0));
 select * into deja from seneve_private.hd_recommendation_writes where evenement=p_evenement;
 if found then
  if deja.empreinte<>empreinte then raise exception 'Cet enregistrement correspond à une autre saisie'using errcode='23505';end if;
  return deja.resultat;
 end if;
 select * into ancien from seneve.hd_recommendations where id=p_id for update;
 if (found and ancien.revision<>p_revision)or(not found and p_revision<>0)then
  raise exception 'Ce contenu a changé. Actualise la liste avant de réessayer'using errcode='40001';end if;
 if (p_contenu->>'etat')is null or (p_contenu->>'etat')not in('brouillon','publie','retire')then raise exception 'État invalide'using errcode='22023';end if;
 publie:=(p_contenu->>'etat')='publie';
 if publie and (p_contenu->'valide')is distinct from 'true'::jsonb then
  raise exception 'Valide le contenu et le lien avant publication'using errcode='22023';end if;
 insert into seneve.hd_recommendations(id,categorie,titre,auteur,langue,url,description,acces,etat,validee_le)
 values(p_id,p_contenu->>'categorie',nullif(btrim(p_contenu->>'titre'),''),nullif(btrim(p_contenu->>'auteur'),''),
 p_contenu->>'langue',btrim(p_contenu->>'url'),btrim(coalesce(p_contenu->>'description','')),p_contenu->>'acces',
 p_contenu->>'etat',case when publie then clock_timestamp()end)
 on conflict(id)do update set categorie=excluded.categorie,titre=excluded.titre,auteur=excluded.auteur,langue=excluded.langue,
 url=excluded.url,description=excluded.description,acces=excluded.acces,etat=excluded.etat,validee_le=excluded.validee_le,
 revision=seneve.hd_recommendations.revision+1,modifie_le=clock_timestamp()
 returning * into r;
 insert into seneve_private.hd_recommendation_writes values(p_evenement,empreinte,to_jsonb(r));
 insert into seneve.audit_events(acteur,action,objet,resultat,details)values('staff:'||auth.uid()::text,
 'hd_recommandation_'||r.etat,'hd_recommendation:'||r.id::text,'ok',jsonb_build_object('revision',r.revision));
 return to_jsonb(r);
end $$;
revoke all on function seneve.staff_hd_recommandations()from public,anon;
revoke all on function seneve.hd_recommandations(text)from public,anon;
revoke all on function seneve.staff_hd_recommandation_enregistrer(uuid,integer,uuid,jsonb)from public,anon;
grant execute on function seneve.staff_hd_recommandations(),seneve.hd_recommandations(text),seneve.staff_hd_recommandation_enregistrer(uuid,integer,uuid,jsonb)to authenticated;
notify pgrst,'reload schema';

