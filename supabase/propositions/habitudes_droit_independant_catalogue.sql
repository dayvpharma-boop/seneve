-- Habitudes & Défis — le droit d'un inscrit ne dépend plus de la visibilité de l'offre au catalogue.
-- Défaut constaté en production le 26/10/2026 (21h48) : fermer l'offre gratuite aux nouveaux inscrits
-- (offers.actif=false) masquait l'offre au participant (politique « offres_actives ») et lui retirait son droit.
-- hd_droit_a lit désormais les droits avec les privilèges du propriétaire, en restant limité au participant
-- connecté (ou au service, sans compte, pour les rappels).
insert into seneve_private.sauvegardes_definitions(objet,definition,motif)
select p.oid::regprocedure::text,pg_get_functiondef(p.oid),'avant habitudes_droit_independant_catalogue'
 from pg_proc p where p.oid='seneve.hd_droit_a(uuid,timestamptz)'::regprocedure;

create or replace function seneve.hd_droit_a(p_enrollment_id uuid, p_instant timestamptz)
returns boolean language sql stable security definer set search_path to '' as $$
 select exists(select 1 from seneve.enrollments e
   join seneve.hd_access_periods p on p.enrollment_id=e.enrollment_id and p.participant_id=e.participant_id
   join seneve.entitlements d on d.entitlement_id=p.entitlement_id and d.participant_id=e.participant_id
   join seneve.offers o on o.offre_id=d.offre_id
  where e.enrollment_id=p_enrollment_id and p_instant>=p.debut and p_instant<p.fin_exclue and p.debut>=d.debut
    and ((select auth.uid()) is null or e.participant_id=(select seneve.current_participant_id()))
    and (
      -- Droit propre au programme HD (mois gratuit) : la période doit tenir dans le droit.
      (o.programme_id=e.programme_id and o.langue=e.langue and d.etat='actif' and d.fin is not null
       and p_instant>=d.debut and p_instant<d.fin and p.fin_exclue<=d.fin
       and ((p.mois=1 and d.origine='gratuit') or (p.mois>1 and d.origine='achat' and d.payment_event_id is not null)))
      -- Mois ouvert par Continuité : achat non remboursé ET abonnement Continuité actif à cet instant.
   or ((o.programme_id is distinct from e.programme_id or o.langue<>e.langue)
       and d.etat<>'revoque' and d.origine='achat' and d.payment_event_id is not null
       and seneve.hd_offre_mensuelle(o.offre_id,e.programme_id,e.version,e.langue,p.mois)
       and exists(select 1 from seneve.entitlements x
                   where x.participant_id=e.participant_id and x.etat='actif' and x.origine='achat'
                     and x.payment_event_id is not null and x.fin is not null
                     and p_instant>=x.debut and p_instant<x.fin
                     and seneve.hd_offre_mensuelle(x.offre_id,e.programme_id,e.version,e.langue,p.mois)))));
$$;
revoke all on function seneve.hd_droit_a(uuid,timestamptz) from public, anon;
grant execute on function seneve.hd_droit_a(uuid,timestamptz) to authenticated, service_role;
