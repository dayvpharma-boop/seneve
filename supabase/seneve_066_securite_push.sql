-- SÉNEVÉ — F01, 22/11/2026. Contrôle à l'écriture, y compris via rappels_activer.
-- Appliquer d'abord à seneve-test. Aucun changement des identifiants ni des consentements.
-- L'ajout/validation est atomique : un ancien abonnement incompatible fait échouer l'opération.
set local lock_timeout = '3s';
set local statement_timeout = '15s';

create or replace function seneve_private.push_abonnement_valide(p_endpoint text, p_p256dh text, p_auth text)
returns boolean language plpgsql immutable security invoker set search_path = '' as $$
declare
  v_cle bytea;
  v_auth bytea;
begin
  if p_endpoint is null or char_length(p_endpoint) > 1000 or p_endpoint ~ '[[:space:]]'
     or p_endpoint !~ '^https://(fcm[.]googleapis[.]com/fcm/send/[A-Za-z0-9_:-]+|updates[.]push[.]services[.]mozilla[.]com/wpush/v[12]/[A-Za-z0-9_-]+=*|web[.]push[.]apple[.]com/[A-Za-z0-9_-]+)$'
     or p_p256dh is null or p_p256dh !~ '^[A-Za-z0-9_-]{87}$'
     or p_auth is null or p_auth !~ '^[A-Za-z0-9_-]{22}$' then return false;
  end if;
  v_cle := pg_catalog.decode(pg_catalog.translate(p_p256dh, '-_', '+/') || '=', 'base64');
  v_auth := pg_catalog.decode(pg_catalog.translate(p_auth, '-_', '+/') || '==', 'base64');
  return pg_catalog.octet_length(v_cle) = 65 and pg_catalog.get_byte(v_cle, 0) = 4
     and pg_catalog.octet_length(v_auth) = 16
     and pg_catalog.translate(pg_catalog.rtrim(pg_catalog.replace(pg_catalog.encode(v_cle, 'base64'), E'\n', ''), '='), '+/', '-_') = p_p256dh
     and pg_catalog.translate(pg_catalog.rtrim(pg_catalog.encode(v_auth, 'base64'), '='), '+/', '-_') = p_auth;
exception when others then return false;
end $$;

revoke all on function seneve_private.push_abonnement_valide(text, text, text) from public, anon, authenticated;
grant usage on schema seneve_private to service_role;
grant execute on function seneve_private.push_abonnement_valide(text, text, text) to service_role;

alter table seneve.push_appareils add constraint push_appareils_abonnement_valide
  check (seneve_private.push_abonnement_valide(endpoint, p256dh, auth)) not valid;
alter table seneve.push_appareils validate constraint push_appareils_abonnement_valide;

comment on function seneve_private.push_abonnement_valide(text, text, text)
  is 'F01 : fournisseurs Web Push autorisés et structure des clés ; même validation avant transport Edge.';
