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
commit;
