-- TEST exclusivement, RPC existantes et profil fictif ; rien conservé.
begin;
create temporary table hd_premier_compte as select gen_random_uuid() uid;
insert into auth.users(id)select uid from hd_premier_compte;
do $$begin execute format('grant usage on schema %I to authenticated',(select nspname from pg_namespace where oid=pg_my_temp_schema()));end$$;
grant select on hd_premier_compte to authenticated;
select set_config('request.jwt.claim.sub',(select uid::text from hd_premier_compte),true);
set local role authenticated;
do $$declare a uuid;b uuid;r jsonb;begin
 if seneve.current_participant_id()is not null then raise exception 'Profil déjà présent';end if;
 a:=seneve.ensure_participant('RECETTE_PREMIER_PROFIL');b:=seneve.ensure_participant('Autre prénom à ne pas imposer');
 if a is null or a<>b or a<>seneve.current_participant_id()then raise exception 'Profil non idempotent';end if;
 r:=seneve.hd_free_catalogue('fr');
 if r->>'compte_id'<>(select uid::text from hd_premier_compte)or r->>'fuseau' is null then raise exception 'Catalogue impossible après création du profil';end if;
 if exists(select 1 from seneve.enrollments where participant_id=a)or exists(select 1 from seneve.entitlements where participant_id=a)or exists(select 1 from seneve.hd_access_periods where participant_id=a)then raise exception 'Accès ou parcours créé implicitement';end if;
 if(select prenom from seneve.participants where participant_id=a)<>'RECETTE_PREMIER_PROFIL'then raise exception 'Prénom existant remplacé';end if;
end$$;
reset role;
rollback;
