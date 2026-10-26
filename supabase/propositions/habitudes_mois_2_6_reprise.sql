-- Habitudes & Défis — mois 2 à 6 : reprise des 30 lectures approuvées (décision du 26/10/2026, 23h01).
-- Ajoute les jours 31 à 181 au programme publié HABITUDES_DEFIS_30J_FR_V1 version 1, sans modifier les jours 1 à 30
-- (les inscriptions restent sur leur version ; ajout pur, aucune ligne existante touchée).
-- Jour j > 30 = copie de la lecture et des 16 rendez-vous du jour ((j-1) % 30) + 1, avec de NOUVEAUX identifiants
-- d'activités : la progression de chaque jour reste distincte (aucune réalisation du mois 1 ne compte pour le mois 2).
-- 181 = six mois de 720 heures comptés en journées civiles (le dernier mois finit le 181e jour civil).
-- Retour arrière : habitudes_mois_2_6_reprise_retour.sql.
do $$
declare n int;
begin
  if (select count(*) from seneve.contents where programme_id='HABITUDES_DEFIS_30J_FR_V1' and version=1 and langue='fr' and jour between 1 and 30)<>30
  or (select count(*) from seneve.activities a join seneve.contents c using(content_id)
       where c.programme_id='HABITUDES_DEFIS_30J_FR_V1' and c.version=1 and c.langue='fr' and c.jour between 1 and 30)<>480 then
    raise exception 'Programme source incomplet : 30 lectures et 480 rendez-vous attendus';
  end if;
  if exists(select 1 from seneve.contents where programme_id='HABITUDES_DEFIS_30J_FR_V1' and version=1 and jour>30) then
    raise exception 'Jours 31+ déjà présents : migration déjà appliquée';
  end if;

  with src as (
    select c.*, j as jour_cible from generate_series(31,181) j
    join seneve.contents c on c.programme_id='HABITUDES_DEFIS_30J_FR_V1' and c.version=1 and c.langue='fr'
                          and c.jour=((j-1)%30)+1 and c.numero_message=1
  ), nouveaux as (
    insert into seneve.contents(programme_id,version,langue,jour,numero_message,racine_id,theme,titre,principe,lecture,
                                explication,texte_officiel,type_texte,reference_livre,reference_biblique)
    select programme_id,version,langue,jour_cible,numero_message,racine_id,theme,titre,principe,lecture,explication,texte_officiel,type_texte,
           reference_livre||' Reprise approuvée de la lecture du jour '||jour||' (mois '||((jour_cible-1)/30+1)||').',reference_biblique
      from src
    returning content_id, jour
  )
  insert into seneve.activities(content_id,type_activite,consigne,obligatoire,format_reponse,critere_realisation,niveau,note_source)
  select nv.content_id,a.type_activite,a.consigne,a.obligatoire,a.format_reponse,a.critere_realisation,a.niveau,a.note_source
    from nouveaux nv
    join seneve.contents s on s.programme_id='HABITUDES_DEFIS_30J_FR_V1' and s.version=1 and s.langue='fr' and s.numero_message=1
                          and s.jour=((nv.jour-1)%30)+1
    join seneve.activities a on a.content_id=s.content_id;

  select count(*) into n from seneve.activities a join seneve.contents c using(content_id)
   where c.programme_id='HABITUDES_DEFIS_30J_FR_V1' and c.version=1 and c.jour between 31 and 181;
  if n<>151*16 then raise exception 'Rendez-vous copiés : % au lieu de %', n, 151*16; end if;
  if (select count(*) from seneve.contents where programme_id='HABITUDES_DEFIS_30J_FR_V1' and version=1 and jour between 31 and 181)<>151 then
    raise exception 'Lectures copiées incomplètes';
  end if;

  insert into seneve.audit_events(acteur,action,objet,resultat,details)
  values('administration','hd_mois_2_6_reprise','programme:HABITUDES_DEFIS_30J_FR_V1:1','ok',
         jsonb_build_object('jours','31-181','regle','lecture du jour ((j-1)%30)+1','decision','2026-10-26 23h01'));
end $$;
