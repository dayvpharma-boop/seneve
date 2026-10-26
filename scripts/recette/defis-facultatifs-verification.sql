-- Défis facultatifs du premier mois, accord du porteur le 27/10/2026.
-- Ajout d'engagements distincts : les activités quotidiennes et leur progression restent inchangées.
begin;
do $$declare pr text;begin
 for pr in select programme_id from seneve.programmes where programme_id in('HABITUDES_DEFIS_30J_FR_V1','HD_RECETTE_INSCRIPTION_FR_20261026')loop
  if(select count(*)from seneve.contents where programme_id=pr and version=1 and langue='fr' and jour in(1,8,15,22,29) and numero_message=1)<>5 then raise exception 'Contenus des défis incomplets : %',pr;end if;
  if exists(select 1 from seneve.activities a join seneve.contents c using(content_id)where c.programme_id=pr and a.note_source like 'DEFI_HD_30J_V1:%')then raise exception 'Défis déjà présents : vérifier sans remplacer';end if;
  insert into seneve.activities(activity_id,content_id,type_activite,consigne,obligatoire,critere_realisation,note_source)
  select md5(pr||':DEFI_HD_30J_V1:'||d.jour)::uuid,c.content_id,'engagement',d.titre,false,d.critere,'DEFI_HD_30J_V1:'||d.jour
  from(values(1,'Préparer un rendez-vous fidèle','Déclare si tu as essayé de préparer ce rendez-vous et ce que tu en retiens. Aucun nombre de jours réussis n’est imposé.'),(8,'Prendre soin d’une responsabilité','Déclare ce que tu as réellement essayé ou réalisé, y compris partiellement. Aucune preuve publique n’est demandée.'),(15,'Exercer une générosité attentive','Indique seulement si tu as réfléchi à une aide ou posé un geste adapté. Ne renseigne aucun nom, montant ou détail privé.'),(22,'Faire une place au discernement','Déclare que tu as pris un temps de recul, même si aucune décision finale n’est prise.'),(29,'Choisir la suite avec clarté','Relis un apprentissage, une difficulté et une habitude à poursuivre, puis choisis un prochain pas réaliste. Aucun paiement n’est déclenché.'))d(jour,titre,critere)
  join seneve.contents c on c.programme_id=pr and c.version=1 and c.langue='fr' and c.jour=d.jour and c.numero_message=1;
 end loop;
end$$;

create temporary table hd_defis_ids as select gen_random_uuid()u,gen_random_uuid()p,gen_random_uuid()autre;
insert into auth.users(id)select u from hd_defis_ids union all select autre from hd_defis_ids;
insert into seneve.participants(participant_id,auth_user_id,prenom,fuseau)select p,u,'RECETTE_DEFIS_FACULTATIFS','Africa/Kinshasa'from hd_defis_ids;
do $$begin execute format('grant usage on schema %I to authenticated',(select nspname from pg_namespace where oid=pg_my_temp_schema()));end$$;
grant select on hd_defis_ids to authenticated;
select set_config('request.jwt.claim.sub',(select u::text from hd_defis_ids),true);
set local role authenticated;
do $$declare cat jsonb;o jsonb;h jsonb;r jsonb;eid uuid;aid uuid;futur uuid;ev uuid:=gen_random_uuid();begin
 cat:=seneve.hd_free_catalogue('fr');select value into o from jsonb_array_elements(cat->'offres')where value->>'offre_id'='HD_RECETTE_INSCRIPTION_FR_20261026_30J';
 select jsonb_agg(jsonb_build_object('habit_key',x->'habit_key','creneaux',x->'creneaux'))into h from jsonb_array_elements(o->'planning')x;
 perform seneve.hd_start_free(o->>'programme_id',1,'fr',o->>'offre_id',h,true);
 select enrollment_id into eid from seneve.enrollments where participant_id=seneve.current_participant_id()and programme_id='HD_RECETTE_INSCRIPTION_FR_20261026';
 select a.activity_id into aid from seneve.activities a join seneve.contents c using(content_id)where c.programme_id='HD_RECETTE_INSCRIPTION_FR_20261026'and a.note_source='DEFI_HD_30J_V1:1';
 select a.activity_id into futur from seneve.activities a join seneve.contents c using(content_id)where c.programme_id='HD_RECETTE_INSCRIPTION_FR_20261026'and a.note_source='DEFI_HD_30J_V1:8';
 if aid is null or futur is null then raise exception 'Défis non publiés';end if;
 if exists(select 1 from seneve.activities a join seneve.contents c using(content_id)where c.programme_id='HD_RECETTE_INSCRIPTION_FR_20261026'and a.note_source like 'DEFI_HD_30J_V1:%'and a.obligatoire)then raise exception 'Défi devenu obligatoire';end if;
 r:=seneve.record_progress(eid,aid,ev,'preparee','web');if r->>'etat'<>'preparee'then raise exception 'Préparation non enregistrée';end if;
 r:=seneve.record_progress(eid,aid,ev,'preparee','web');if r->>'repetition'<>'true'then raise exception 'Rejeu non idempotent';end if;
 r:=seneve.record_progress(eid,aid,gen_random_uuid(),'partielle','web');if r->>'etat'<>'partielle'then raise exception 'Partiel non enregistré';end if;
 r:=seneve.record_progress(eid,aid,gen_random_uuid(),'realisee','web');if r->>'etat'<>'realisee'then raise exception 'Réalisation non enregistrée';end if;
 if(select count(*)from seneve.activity_state where enrollment_id=eid)<>1 then raise exception 'État quotidien modifié ou doublon';end if;
 begin perform seneve.record_progress(eid,futur,gen_random_uuid(),'realisee','web');raise exception 'Défi futur accepté';exception when insufficient_privilege then null;end;
 perform set_config('request.jwt.claim.sub',(select autre::text from hd_defis_ids),true);
 begin perform seneve.record_progress(eid,aid,gen_random_uuid(),'realisee','web');raise exception 'Autre compte accepté';exception when sqlstate '28000' then null;when insufficient_privilege then null;end;
end$$;
reset role;
select 'OK : facultatif, préparé/partiel/réalisé, rejeu, refus futur et autre compte, habitudes inchangées. Tout annulé.'resultat;
rollback;
