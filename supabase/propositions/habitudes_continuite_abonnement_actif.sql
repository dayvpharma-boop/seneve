-- Habitudes & Défis — sans abonnement Continuité actif, pas d'accès aux mois payants
-- Décision Dr Justin Tshims du 26/10/2026, 19h48 : « le 3 à 6 mois s'ouvre seulement si l'abonnement est actif ;
-- sans abonnement pas habitudes et défis ».
-- Appliquée sur seneve-test uniquement, après habitudes_continuite_cycles.sql.
-- Effet : un mois ouvert par Continuité n'est accessible (contenus, déclarations, rappels) qu'aux instants où un
-- abonnement Continuité acheté, vérifié et non remboursé est en cours. Le calendrier des mois n'est pas prolongé.
-- Retour arrière : restaurer la définition sauvegardée sous le motif 'avant habitudes_continuite_abonnement_actif'.

insert into seneve_private.sauvegardes_definitions (objet, definition, motif)
select p.oid::regprocedure::text, pg_get_functiondef(p.oid), 'avant habitudes_continuite_abonnement_actif'
  from pg_proc p where p.oid='seneve.hd_droit_a(uuid,timestamptz)'::regprocedure;

create or replace function seneve.hd_droit_a(p_enrollment_id uuid, p_instant timestamptz)
returns boolean language sql stable set search_path to '' as $$
 select exists(select 1 from seneve.enrollments e
   join seneve.hd_access_periods p on p.enrollment_id=e.enrollment_id and p.participant_id=e.participant_id
   join seneve.entitlements d on d.entitlement_id=p.entitlement_id and d.participant_id=e.participant_id
   join seneve.offers o on o.offre_id=d.offre_id
  where e.enrollment_id=p_enrollment_id and p_instant>=p.debut and p_instant<p.fin_exclue and p.debut>=d.debut
    and (
      (o.programme_id=e.programme_id and o.langue=e.langue and d.etat='actif' and d.fin is not null
       and p_instant>=d.debut and p_instant<d.fin and p.fin_exclue<=d.fin
       and ((p.mois=1 and d.origine='gratuit') or (p.mois>1 and d.origine='achat' and d.payment_event_id is not null)))
   or ((o.programme_id is distinct from e.programme_id or o.langue<>e.langue)
       and d.etat<>'revoque' and d.origine='achat' and d.payment_event_id is not null
       and seneve.hd_offre_mensuelle(o.offre_id,e.programme_id,e.version,e.langue,p.mois)
       and exists(select 1 from seneve.entitlements x
                   where x.participant_id=e.participant_id and x.etat='actif' and x.origine='achat'
                     and x.payment_event_id is not null and x.fin is not null
                     and p_instant>=x.debut and p_instant<x.fin
                     and seneve.hd_offre_mensuelle(x.offre_id,e.programme_id,e.version,e.langue,p.mois)))));
$$;
