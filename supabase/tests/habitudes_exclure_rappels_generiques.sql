-- Essai de l'API EXISTANTE sur seneve-test, données fictives exclusivement.
-- Tout est annulé par rollback ; aucun contenu approuvé ni compte réel conservé.
begin;


create temporary table hd_integration_ids as select
 gen_random_uuid() ua,gen_random_uuid() ub,gen_random_uuid() pa,gen_random_uuid() pb,
 gen_random_uuid() ea,gen_random_uuid() eb,
 gen_random_uuid() c1,gen_random_uuid() c2,gen_random_uuid() c3,gen_random_uuid() c4,
 gen_random_uuid() a1,gen_random_uuid() a2,gen_random_uuid() a3,gen_random_uuid() a4,
 gen_random_uuid() event1,gen_random_uuid() event2,gen_random_uuid() event3,
 gen_random_uuid() event4,gen_random_uuid() event5,
 'HD_RECETTE_'||replace(gen_random_uuid()::text,'-','') programme;
insert into auth.users(id)select ua from hd_integration_ids union all select ub from hd_integration_ids;
insert into seneve.participants(participant_id,auth_user_id,prenom)
 select pa,ua,'RECETTE_FICTIVE_A' from hd_integration_ids union all select pb,ub,'RECETTE_FICTIVE_B' from hd_integration_ids;
insert into seneve.programmes(programme_id,nom,type_parcours,langue,duree_jours,messages_par_jour)
 select programme,'Recette fictive — ne pas publier','recette','fr',2,3 from hd_integration_ids;
-- Version de fixture uniquement, jamais conservée ni rendue accessible à un vrai compte.
insert into seneve.programme_versions(programme_id,version,etat)
 select programme,1,'archivee' from hd_integration_ids;
insert into seneve.contents(content_id,programme_id,version,langue,jour,numero_message,theme,texte_officiel,type_texte)
 select c1,programme,1,'fr',1,1,'RECETTE MATIN','Fixture fictive sans contenu spirituel','explication' from hd_integration_ids union all
 select c2,programme,1,'fr',1,2,'RECETTE MIDI','Fixture fictive sans contenu spirituel','explication' from hd_integration_ids union all
 select c3,programme,1,'fr',1,3,'RECETTE SOIR','Fixture fictive sans contenu spirituel','explication' from hd_integration_ids union all
 select c4,programme,1,'fr',2,1,'RECETTE DEMAIN','Fixture fictive sans contenu spirituel','explication' from hd_integration_ids;
insert into seneve.activities(activity_id,content_id,type_activite,consigne,obligatoire)
 select a1,c1,'action','RECETTE : prière matin',true from hd_integration_ids union all
 select a2,c2,'action','RECETTE : prière midi',true from hd_integration_ids union all
 select a3,c3,'action','RECETTE : prière soir',true from hd_integration_ids union all
 select a4,c4,'action','RECETTE : action future',true from hd_integration_ids;
insert into seneve.enrollments(enrollment_id,participant_id,programme_id,version,langue,date_debut,date_fin_prevue,etat)
 select ea,pa,programme,1,'fr',(now()at time zone 'Africa/Kinshasa')::date,(now()at time zone 'Africa/Kinshasa')::date+1,'active' from hd_integration_ids union all
 select eb,pb,programme,1,'fr',(now()at time zone 'Africa/Kinshasa')::date,(now()at time zone 'Africa/Kinshasa')::date+1,'active' from hd_integration_ids;

insert into seneve.hd_programme_links(programme_id,version,langue,module_id,module_version,actif)
select programme,1,'fr','HABITUDES_DEFIS',1,true from hd_integration_ids;
insert into seneve.offers(offre_id,produit,type_offre,langue,programme_id,actif)
select programme||'_FREE','Fixture fictive','recette','fr',programme,true from hd_integration_ids;
insert into seneve.entitlements(participant_id,offre_id,origine,etat,debut,fin)
select pa,programme||'_FREE','gratuit','actif',now()-interval '1 hour',now()+interval '1 hour' from hd_integration_ids;
insert into seneve.hd_access_periods(enrollment_id,participant_id,mois,entitlement_id,debut,fin_exclue)
select i.ea,i.pa,1,d.entitlement_id,d.debut,d.fin from hd_integration_ids i join seneve.entitlements d on d.participant_id=i.pa;

-- Un parcours témoin distinct, pour le même participant : il doit rester éligible.
create temporary table hd_generic_ids as select gen_random_uuid() ec,gen_random_uuid() cc;
insert into seneve.programmes(programme_id,nom,type_parcours,langue,duree_jours,messages_par_jour)
select programme||'_CONTROL','RECETTE TEMOIN','recette','fr',2,1 from hd_integration_ids;
insert into seneve.programme_versions(programme_id,version,etat)
select programme||'_CONTROL',1,'archivee'from hd_integration_ids;
insert into seneve.contents(content_id,programme_id,version,langue,jour,numero_message,theme,texte_officiel,type_texte)
select g.cc,i.programme||'_CONTROL',1,'fr',1,1,'RECETTE TEMOIN','Fixture fictive sans contenu spirituel','explication'from hd_integration_ids i cross join hd_generic_ids g;
insert into seneve.enrollments(enrollment_id,participant_id,programme_id,version,langue,date_debut,date_fin_prevue,etat)
select g.ec,i.pa,i.programme||'_CONTROL',1,'fr',(now()at time zone 'Africa/Kinshasa')::date,(now()at time zone 'Africa/Kinshasa')::date+1,'active'from hd_integration_ids i cross join hd_generic_ids g;
update seneve.participants set preferences=jsonb_build_object('rappels',jsonb_build_object('fuseau','Africa/Kinshasa','moments',jsonb_build_object('matin',to_char(now()at time zone 'Africa/Kinshasa','HH24:MI')))),fuseau='Africa/Kinshasa'where participant_id in(select pa from hd_integration_ids);
update auth.users set email='recette-'||id::text||'@example.invalid'where id in(select ua from hd_integration_ids);
insert into seneve.push_appareils(participant_id,endpoint,p256dh,auth)select pa,'https://example.invalid/'||pa::text,repeat('x',30),repeat('x',15)from hd_integration_ids;
insert into seneve.consents(participant_id,canal,finalite,etat,version_texte,preuve)
select pa,'push','rappels','accorde','RECETTE','FICTIVE'from hd_integration_ids union all
select pa,'email','email_matin','accorde','RECETTE','FICTIVE'from hd_integration_ids;
-- Même une liaison HD inactive doit fermer le circuit générique.
update seneve.hd_programme_links set actif=false where programme_id in(select programme from hd_integration_ids);
-- Inclure les anciens rappels et les reprises, sans toucher aux états fournisseur.
insert into seneve.communications(cle_idempotence,enrollment_id,content_id,canal,creneau,etat,motif,modifie_le)
select 'recette-generic|'||i.ea::text||'|'||c.canal||'|'||st.etat,i.ea,i.c1,c.canal,now(),st.etat,
case when c.canal='push'then 'rappel_matin'else 'email_matin'end,
case when st.etat='erreur'then now()-interval '20 minutes'else now()end
from hd_integration_ids i cross join(values('push'),('email'))c(canal)
cross join(values('planifie'),('erreur'),('en_traitement'),('accepte'),('incertain'))st(etat);
do $$begin
 if exists(select 1 from seneve.communications m join hd_integration_ids i on i.ea=m.enrollment_id where m.canal='push'and seneve._push_rappel_eligible(m.communication_id))then raise exception 'Liaison HD inactive éligible au push générique';end if;
end$$;
create temporary table generic_push_claims as select communication_id from seneve.claim_push_reminders(200);
create temporary table generic_mail_claims as select communication_id from seneve.claim_morning_emails(50);
do $$declare i record;g record;begin
 select * into i from hd_integration_ids;select * into g from hd_generic_ids;
 if exists(select 1 from generic_push_claims x join seneve.communications m using(communication_id)where m.enrollment_id=i.ea)or exists(select 1 from generic_mail_claims x join seneve.communications m using(communication_id)where m.enrollment_id=i.ea)then raise exception 'Rappel HD réservé par le circuit générique';end if;
 if exists(select 1 from seneve.communications where enrollment_id=i.ea and cle_idempotence not like 'recette-generic|%')then raise exception 'Rappel générique HD créé';end if;
 if(select count(*)from seneve.communications where enrollment_id=i.ea and etat='annule')<>4 then raise exception 'Rappels HD en attente non annulés';end if;
 if(select count(*)from seneve.communications where enrollment_id=i.ea and etat in('en_traitement','accepte','incertain'))<>6 then raise exception 'État fournisseur ou traitement récent modifié';end if;
 if(select count(*)from generic_push_claims x join seneve.communications m using(communication_id)where m.enrollment_id=g.ec)<>1 then raise exception 'Push témoin perturbé';end if;
 -- L'email matinal générique conserve sa fenêtre existante 07h–20h.
 if extract(hour from now()at time zone 'Africa/Kinshasa')between 7 and 20 then
  if(select count(*)from generic_mail_claims x join seneve.communications m using(communication_id)where m.enrollment_id=g.ec)<>1 then raise exception 'Email témoin perturbé';end if;
 end if;
end$$;
-- Réactiver la liaison ne doit pas rouvrir le circuit générique.
update seneve.hd_programme_links set actif=true where programme_id in(select programme from hd_integration_ids);
do $$begin
 if exists(select 1 from seneve.communications m join hd_integration_ids i on i.ea=m.enrollment_id where m.canal='push'and seneve._push_rappel_eligible(m.communication_id))then raise exception 'Liaison HD active éligible au push générique';end if;
end$$;
rollback;
