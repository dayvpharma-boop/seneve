
begin;
-- Activation temporaire, invisible aux autres sessions et annulée par rollback.
update seneve.hd_programme_links set actif=true where programme_id='HABITUDES_DEFIS_30J_FR_V1' and version=1 and langue='fr';
create temporary table hd_validation_paiement as
select gen_random_uuid() utilisateur,gen_random_uuid() participant,gen_random_uuid() inscription,gen_random_uuid() gratuit,gen_random_uuid() paiement,fin_gratuite,cas
from(values(now()-interval '1 hour','apres_gratuit'),(now()+interval '24 hours','pendant_gratuit'))t(fin_gratuite,cas);
insert into auth.users(id) select utilisateur from hd_validation_paiement;
insert into seneve.participants(participant_id,auth_user_id,prenom,fuseau)select participant,utilisateur,'RECETTE_VALIDATION_PAIEMENT_HD','Africa/Kinshasa'from hd_validation_paiement;
insert into seneve.entitlements(entitlement_id,participant_id,offre_id,origine,etat,debut,fin)
select gratuit,participant,'HABITUDES_DEFIS_30J_FR_V1_GRATUIT_30J','gratuit','actif',fin_gratuite-interval '720 hours',fin_gratuite from hd_validation_paiement;
insert into seneve.enrollments(enrollment_id,participant_id,programme_id,version,langue,date_debut,date_fin_prevue,etat,entitlement_id)
select inscription,participant,'HABITUDES_DEFIS_30J_FR_V1',1,'fr',((fin_gratuite-interval '720 hours')at time zone 'Africa/Kinshasa')::date,((fin_gratuite-interval '1 microsecond')at time zone 'Africa/Kinshasa')::date,'active',gratuit from hd_validation_paiement;
insert into seneve.hd_access_periods(enrollment_id,participant_id,mois,entitlement_id,debut,fin_exclue)
select inscription,participant,1,gratuit,fin_gratuite-interval '720 hours',fin_gratuite from hd_validation_paiement;
insert into seneve.payment_events(payment_event_id,fournisseur,id_evenement,type_evenement,signature_verifiee,montant_observe,devise_observee,participant_id,offre_id,brut,produit_fournisseur,date_paiement,controle)
select paiement,'recette',paiement::text,'payment.confirmed',true,5,'USD',participant,'CONTINUITE_MENSUEL_FR','{}','prd_xn8p0wrx',now(),'ok' from hd_validation_paiement;
do $$declare x record;r jsonb;rep jsonb;d seneve.entitlements%rowtype;ap seneve.hd_access_periods%rowtype;begin
 for x in select *from hd_validation_paiement loop
  perform set_config('request.jwt.claim.sub',x.utilisateur::text,true);
  if not seneve_private.hd_coach_excluded(x.inscription)then raise exception 'Coach proposé avant achat';end if;
  r:=seneve._ouvrir_acces(x.paiement,x.participant);
  if r->>'resultat'<>'acces_ouvert' or r#>>'{habitudes_defis,ouvert}'<>'true' then raise exception 'Ouverture refusée : %',r;end if;
  select *into strict d from seneve.entitlements where payment_event_id=x.paiement;
  select *into strict ap from seneve.hd_access_periods where entitlement_id=d.entitlement_id;
  if ap.mois<>2 or ap.fin_exclue-ap.debut<>interval '720 hours'or d.debut<>ap.debut or d.fin<>ap.fin_exclue then raise exception 'Mois ou dates non alignés';end if;
  if x.cas='pendant_gratuit'and ap.debut<>x.fin_gratuite then raise exception 'Début du mois anticipé incorrect';end if;
  if x.cas='apres_gratuit'and ap.debut<>now()then raise exception 'Ouverture après interruption incorrecte';end if;
  if seneve_private.hd_coach_excluded(x.inscription) is distinct from (x.cas='pendant_gratuit')then raise exception 'Coach ouvert au mauvais moment';end if;
  rep:=seneve._ouvrir_acces(x.paiement,x.participant);
  if rep->>'resultat'<>'deja_acces_ouvert'or (select count(*)from seneve.hd_access_periods where enrollment_id=x.inscription)<>2 then raise exception 'Paiement rejoué dupliqué';end if;
  if x.cas='apres_gratuit'then
   if not seneve.hd_has_current_right(x.inscription)then raise exception 'Droit payant courant absent';end if;
   if not(seneve.coach_eligible_enrollments()@>jsonb_build_array(x.inscription))then raise exception 'Coach payé absent du catalogue';end if;
   update seneve.entitlements set etat='revoque'where entitlement_id=d.entitlement_id;
   if seneve.hd_has_current_right(x.inscription)or not seneve_private.hd_coach_excluded(x.inscription)then raise exception 'Révocation sans effet';end if;
   update seneve.entitlements set etat='actif',fin=now()where entitlement_id=d.entitlement_id;
   if seneve.hd_has_current_right(x.inscription)or not seneve_private.hd_coach_excluded(x.inscription)then raise exception 'Expiration sans effet';end if;
  end if;
 end loop;
end$$;
select 'OK : avant/après fin gratuite, mois 2 complet et aligné, rejeu, coach au bon moment, révocation et expiration. Tout annulé.' as resultat;
rollback;
