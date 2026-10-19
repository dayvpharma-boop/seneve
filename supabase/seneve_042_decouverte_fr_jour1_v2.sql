-- Découverte FR V2 : textes de l'accueil et du jour 1 validés par l'utilisateur le 19/10/2026.
-- Les inscriptions existantes conservent la V1 et leur historique.
do $migration$
declare
  v_programme constant text := 'PROSPECT_LIVRE_7J_FR_V1';
  v_new uuid;
  v_old record;
begin
  perform pg_advisory_xact_lock(hashtext(v_programme));
  if exists(select 1 from seneve.programme_versions where programme_id=v_programme and version=2) then
    raise exception 'La V2 existe déjà : vérifier avant toute nouvelle publication';
  end if;
  if (select count(*) from seneve.contents where programme_id=v_programme and version=1) <> 7
     or not exists(select 1 from seneve.programme_versions where programme_id=v_programme and version=1 and etat='publiee') then
    raise exception 'Source V1 publiée de sept jours attendue';
  end if;
  insert into seneve.programme_versions(programme_id,version,etat,valide_par,date_validation)
    values(v_programme,2,'approuvee','Validation des textes accueil et J1 par Dr Justin Tshims dans Codex, 19/10/2026',now());
  for v_old in select * from seneve.contents where programme_id=v_programme and version=1 order by jour,numero_message loop
    v_new := gen_random_uuid();
    insert into seneve.contents
      select (jsonb_populate_record(null::seneve.contents,to_jsonb(v_old) ||
        jsonb_build_object('content_id',v_new,'legacy_contenu_id',coalesce(v_old.legacy_contenu_id,v_programme || '_' || v_old.jour::text) || '_V2','version',2,'cree_le',now()))).*;
    insert into seneve.activities
      select (jsonb_populate_record(null::seneve.activities,to_jsonb(a) ||
        jsonb_build_object('activity_id',gen_random_uuid(),'content_id',v_new,'cree_le',now()))).*
        from seneve.activities a where a.content_id=v_old.content_id;
    -- Les ressources des jours inchangés sont conservées. L'audio J1 reste lié à la V1.
    if v_old.jour <> 1 then
      insert into seneve.resources
        select (jsonb_populate_record(null::seneve.resources,to_jsonb(r) ||
          jsonb_build_object('resource_id',gen_random_uuid(),'content_id',v_new,'version',2))).*
          from seneve.resources r where r.content_id=v_old.content_id;
    end if;
  end loop;
  update seneve.contents set
    explication='Aujourd’hui, regarde ce qu’une décision récente révèle de tes priorités.',
    texte_officiel=$texte$Bonjour {prenom} 👋 Jour 1/7 — Ce qui occupe la première place. Dans « Arrête de mendier des miracles », Dr Justin Tshims invite à regarder ce que nos décisions quotidiennes révèlent de la place de Dieu dans notre vie.

Aujourd’hui, repense à une décision récente. Qu’est-ce qui a principalement guidé ton choix ? Prends un moment pour reconnaître la priorité que cette décision révèle, sans chercher à te justifier ni à te condamner.$texte$
    where programme_id=v_programme and version=2 and jour=1 and numero_message=1;
  update seneve.activities a set
    consigne=case when a.type_activite='action' then 'Choisis une décision récente et nomme la priorité qui l’a guidée. Tu peux garder cette réflexion pour toi ou la noter dans ton journal.'
      else 'Quelle place souhaites-tu donner à Dieu dans ta prochaine décision ?' end,
    critere_realisation=case when a.type_activite='action' then 'Lorsque tu as identifié une décision précise et nommé la priorité qu’elle révèle.' else null end
    from seneve.contents c where a.content_id=c.content_id and c.programme_id=v_programme and c.version=2 and c.jour=1 and c.numero_message=1
      and a.type_activite in ('action','question');
  if (select count(*) from seneve.activities a join seneve.contents c using(content_id) where c.programme_id=v_programme and c.version=2)
      <> (select count(*) from seneve.activities a join seneve.contents c using(content_id) where c.programme_id=v_programme and c.version=1) then
    raise exception 'La copie des activités est incomplète';
  end if;
  update seneve.programme_versions set etat='archivee' where programme_id=v_programme and version=1;
  update seneve.programme_versions set etat='publiee',publiee_le=now() where programme_id=v_programme and version=2;
  insert into seneve.publications(programme_id,version,langue,demande_par,resultat,date_publication,version_precedente)
    values(v_programme,2,'fr','Validation des textes accueil et J1 par Dr Justin Tshims dans Codex, 19/10/2026','reussie',now(),1);
end $migration$;

