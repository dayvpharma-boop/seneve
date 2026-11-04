-- SÉNEVÉ 061 — Livre PDF et livre audio dans l'application, réservés aux acheteurs
-- (décision de Dr Justin du 04/11/2026 : « seulement les acheteurs », lecture dans l'application, français et anglais).
-- * Coffre privé « livres » : pdf/<langue>/livre.pdf et audio/<langue>/<nn>.mp3 (aucun lien public).
-- * Un fichier n'est lisible que par un compte qui a acheté ce format dans cette langue
--   (paiement vérifié et accès ouvert, rattaché au compte ou à son adresse e-mail confirmée), ou par un administrateur.
-- * Dépôt et retrait : administrateur seulement.
-- Ajouts seulement ; rien d'existant n'est modifié. Retour arrière en fin de fichier.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('livres', 'livres', false, 52428800, array['application/pdf','audio/mpeg'])
on conflict (id) do update set public = false, file_size_limit = 52428800, allowed_mime_types = array['application/pdf','audio/mpeg'];

-- Offre correspondant à un chemin du coffre (pdf/fr/... → LIVRE_PDF_FR) ; null pour tout autre chemin.
create or replace function seneve_private.livre_offre_du_chemin(p_chemin text)
returns text language sql immutable set search_path = '' as $$
  select case when p_chemin ~ '^pdf/(fr|en)/livre\.pdf$' then 'LIVRE_PDF_'||upper(split_part(p_chemin,'/',2))
              when p_chemin ~ '^audio/(fr|en)/[0-9]{2}\.mp3$' then 'LIVRE_AUDIO_'||upper(split_part(p_chemin,'/',2))
         end
$$;

-- Le compte connecté a-t-il acheté cette offre du livre ?
create or replace function seneve.livre_acces(p_offre text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid()); v_email text; v_part uuid;
begin
  if v_uid is null or p_offre is null or p_offre not in ('LIVRE_PDF_FR','LIVRE_PDF_EN','LIVRE_AUDIO_FR','LIVRE_AUDIO_EN') then return false; end if;
  if seneve.has_role('administrateur') then return true; end if;
  select lower(email) into v_email from auth.users where id = v_uid and email_confirmed_at is not null;
  v_part := seneve.current_participant_id();
  return exists (select 1 from seneve.payment_events pe
    where pe.offre_id = p_offre and pe.signature_verifiee and pe.statut_traitement = 'acces_ouvert'
      and ((v_part is not null and pe.participant_id = v_part) or (v_email is not null and pe.email_acheteur = v_email)));
end $$;
revoke all on function seneve.livre_acces(text) from public, anon;
grant execute on function seneve.livre_acces(text) to authenticated;

-- Résumé pour l'écran Bibliothèque : quels formats ce compte peut ouvrir.
create or replace function seneve.mes_livres()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'pdf_fr', seneve.livre_acces('LIVRE_PDF_FR'), 'pdf_en', seneve.livre_acces('LIVRE_PDF_EN'),
    'audio_fr', seneve.livre_acces('LIVRE_AUDIO_FR'), 'audio_en', seneve.livre_acces('LIVRE_AUDIO_EN'))
$$;
revoke all on function seneve.mes_livres() from public, anon;
grant execute on function seneve.mes_livres() to authenticated;

drop policy if exists livres_lire on storage.objects;
create policy livres_lire on storage.objects for select to authenticated
  using (bucket_id = 'livres' and (select seneve.livre_acces(seneve_private.livre_offre_du_chemin(name))));
drop policy if exists livres_deposer on storage.objects;
create policy livres_deposer on storage.objects for insert to authenticated
  with check (bucket_id = 'livres' and (select seneve.has_role('administrateur')) and seneve_private.livre_offre_du_chemin(name) is not null);
drop policy if exists livres_remplacer on storage.objects;
create policy livres_remplacer on storage.objects for update to authenticated
  using (bucket_id = 'livres' and (select seneve.has_role('administrateur')))
  with check (bucket_id = 'livres' and (select seneve.has_role('administrateur')) and seneve_private.livre_offre_du_chemin(name) is not null);
drop policy if exists livres_retirer on storage.objects;
create policy livres_retirer on storage.objects for delete to authenticated
  using (bucket_id = 'livres' and (select seneve.has_role('administrateur')));

-- Retour arrière :
-- drop policy if exists livres_lire on storage.objects; drop policy if exists livres_deposer on storage.objects;
-- drop policy if exists livres_remplacer on storage.objects; drop policy if exists livres_retirer on storage.objects;
-- drop function if exists seneve.mes_livres(); drop function if exists seneve.livre_acces(text);
-- drop function if exists seneve_private.livre_offre_du_chemin(text);
-- (le coffre « livres » se vide puis se supprime depuis le tableau de bord Supabase)
