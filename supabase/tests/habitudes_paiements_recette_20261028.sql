-- Recette de paiements HD : exclusivement seneve-test, données fictives annulées.
begin;
set local statement_timeout='30s';
do $recette$
declare
 scenario int; ua uuid; pa uuid; ea uuid; free_id uuid; paid_id uuid; pe uuid;
 c1 uuid; c31 uuid; a1 uuid; a31 uuid; programme text; email_fixture text; vente text;
 offre seneve.offers%rowtype; r jsonb; r2 jsonb; periode seneve.hd_access_periods%rowtype;
 debut_gratuit timestamptz; fin_gratuit timestamptz; jour_debut date; date_continuite date;
begin
 select * into strict offre from seneve.offers where offre_id='CONTINUITE_MENSUEL_FR' and actif and chariow_product_id is not null;
 for scenario in 1..2 loop
  ua:=gen_random_uuid();pa:=gen_random_uuid();ea:=gen_random_uuid();c1:=gen_random_uuid();c31:=gen_random_uuid();a1:=gen_random_uuid();a31:=gen_random_uuid();
  programme:='HD_PAIEMENT_RECETTE_'||replace(ua::text,'-','');
  email_fixture:='recette.hd.'||ua::text||'@example.invalid';
  vente:='recette_hd_20261028_'||ua::text;
  debut_gratuit:=now()-case when scenario=1 then interval '29 days' else interval '32 days' end;
  fin_gratuit:=debut_gratuit+interval '720 hours';
  jour_debut:=(debut_gratuit at time zone 'Africa/Kinshasa')::date;
  insert into auth.users(id,email,email_confirmed_at) values(ua,email_fixture,now());
  insert into seneve.participants(participant_id,auth_user_id,prenom,fuseau) values(pa,ua,'RECETTE_HD_FICTIVE','Africa/Kinshasa');
  insert into seneve.programmes(programme_id,nom,type_parcours,langue,duree_jours,messages_par_jour) values(programme,'RECETTE FICTIVE ANNULEE','recette','fr',30,1);
  insert into seneve.programme_versions(programme_id,version,etat) values(programme,1,'archivee');
  insert into seneve.hd_programme_links(programme_id,version,langue,module_id,module_version,actif) values(programme,1,'fr','HABITUDES_DEFIS',1,true);
  insert into seneve.offers(offre_id,produit,type_offre,langue,programme_id,actif) values(programme||'_FREE','RECETTE FICTIVE','recette','fr',programme,true);
  insert into seneve.entitlements(participant_id,offre_id,origine,etat,debut,fin) values(pa,programme||'_FREE','gratuit','actif',debut_gratuit,fin_gratuit) returning entitlement_id into free_id;
  insert into seneve.enrollments(enrollment_id,participant_id,programme_id,version,langue,date_debut,date_fin_prevue,etat,entitlement_id) values(ea,pa,programme,1,'fr',jour_debut,jour_debut+29,'active',free_id);
  insert into seneve.hd_access_periods(enrollment_id,participant_id,mois,entitlement_id,debut,fin_exclue) values(ea,pa,1,free_id,debut_gratuit,fin_gratuit);
  insert into seneve.contents(content_id,programme_id,version,langue,jour,numero_message,theme,texte_officiel,type_texte) values
   (c1,programme,1,'fr',1,1,'RECETTE','Texte fictif de test','explication'),(c31,programme,1,'fr',31,1,'RECETTE','Texte fictif de test','explication');
  insert into seneve.activities(activity_id,content_id,type_activite,consigne,obligatoire,note_source) values
   (a1,c1,'action','RECETTE historique',true,'RECETTE_HD_QUOTIDIEN_V1:priere_matin'),(a31,c31,'action','RECETTE mois 2',true,'RECETTE_HD_QUOTIDIEN_V1:priere_matin');
  insert into seneve.activity_state(enrollment_id,activity_id,etat) values(ea,a1,'realisee');

  -- Même avec un compte confirmé, un montant incorrect ne doit créer aucun droit acheté.
  r:=seneve.record_chariow_sale(vente||'_incorrect','successful.sale','completed',offre.chariow_product_id,offre.prix+1,offre.devise,email_fixture,now(),true);
  if r->>'resultat'<>'a_examiner' or exists(select 1 from seneve.entitlements where participant_id=pa and origine='achat') then raise exception 'Montant incorrect avec compte accepté';end if;

  -- Paiement conforme : un mois HD et un droit Continuité exactement alignés.
  r:=seneve.record_chariow_sale(vente,'successful.sale','completed',offre.chariow_product_id,offre.prix,offre.devise,email_fixture,now(),true);
  if r->>'resultat'<>'acces_ouvert' or r#>>'{habitudes_defis,mois}'<>'2' or coalesce((r#>>'{habitudes_defis,ouvert}')::boolean,false) is not true then raise exception 'Ouverture HD incorrecte : %',r;end if;
  paid_id:=(r->>'entitlement_id')::uuid;pe:=(r->>'payment_event_id')::uuid;
  select * into strict periode from seneve.hd_access_periods where enrollment_id=ea and mois=2;
  if periode.fin_exclue-periode.debut<>interval '720 hours' then raise exception 'Durée différente de 30 jours';end if;
  if not exists(select 1 from seneve.entitlements d where d.entitlement_id=paid_id and d.debut=periode.debut and d.fin=periode.fin_exclue and d.etat='actif') then raise exception 'Dates Continuité/HD décalées';end if;
  if periode.debut is distinct from greatest(now(),fin_gratuit) then raise exception 'Date de démarrage incorrecte';end if;
  select coalesce((select date_debut from seneve.enrollments where entitlement_id=paid_id),(select date_debut from seneve.parcours_planifies where entitlement_id=paid_id)) into date_continuite;
  if date_continuite is distinct from (periode.debut at time zone 'Africa/Kinshasa')::date then raise exception 'Contenus Continuité/HD non coordonnés';end if;

  r2:=seneve.record_chariow_sale(vente,'successful.sale','completed',offre.chariow_product_id,offre.prix,offre.devise,email_fixture,now(),true);
  if r2->>'resultat'<>'deja_recu' or (select count(*) from seneve.entitlements where payment_event_id=pe)<>1 or (select count(*) from seneve.hd_access_periods where entitlement_id=paid_id)<>1 then raise exception 'Doublon de paiement ou de période';end if;

  perform set_config('request.jwt.claim.sub',ua::text,true);
  if not seneve.hd_has_current_right(ea) then raise exception 'Droit courant manquant';end if;
  if scenario=1 then
   if seneve.hd_jour_du(ea,(now() at time zone 'Africa/Kinshasa')::date)<>30 then raise exception 'Achat anticipé a avancé le jour pédagogique';end if;
   if not exists(select 1 from seneve.parcours_planifies where entitlement_id=paid_id and date_debut=date_continuite) then raise exception 'Parcours anticipé non programmé';end if;
  else
   if seneve.hd_jour_du(ea,(now() at time zone 'Africa/Kinshasa')::date)<>31 then raise exception 'Reprise tardive ne reprend pas au jour 31';end if;
   r2:=seneve.record_progress(ea,a31,gen_random_uuid(),'realisee','web');
   if r2->>'etat'<>'realisee' then raise exception 'Déclaration du jour repris impossible';end if;
  end if;

  r2:=seneve.revoke_purchase(vente,'RECETTE FICTIVE : remboursement simulé');
  if not exists(select 1 from seneve.entitlements where entitlement_id=paid_id and etat='revoque') or exists(select 1 from seneve.hd_access_periods where entitlement_id=paid_id) then raise exception 'Révocation ne retire pas le mois financé';end if;
  if not exists(select 1 from seneve.activity_state where enrollment_id=ea and activity_id=a1 and etat='realisee') then raise exception 'Historique perdu à la révocation';end if;
  if scenario=2 and seneve.hd_has_current_right(ea) then raise exception 'Droit payé révoqué toujours utilisable';end if;
  r2:=seneve.revoke_purchase(vente,'RECETTE FICTIVE : répétition');
  if r2->>'resultat'<>'deja_revoque' then raise exception 'Révocation répétée non idempotente';end if;
 end loop;
end $recette$;
rollback;
select jsonb_build_object('verification','reussie','scenarios',array['montant incorrect avec compte','paiement conforme','achat anticipé','dates Continuité/HD','durée 720 heures','démarrage des contenus','rejeu du paiement','reprise après coupure au jour 31','progression après reprise','révocation','historique conservé','rejeu de la révocation'],'donnees_fictives_conservees',false) as resultat;
