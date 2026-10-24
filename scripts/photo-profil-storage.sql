-- Photos de profil privées : un JPEG léger par personne, sous son identifiant Auth.
-- Ce script ne rend aucune photo publique et ne change aucun accès aux autres fichiers.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('photos-profil','photos-profil',false,262144,array['image/jpeg']);

create policy "photo_profil_lire_la_sienne" on storage.objects for select to authenticated
using (bucket_id='photos-profil' and name=(select auth.uid())::text||'/avatar.jpg');
create policy "photo_profil_ajouter_la_sienne" on storage.objects for insert to authenticated
with check (bucket_id='photos-profil' and name=(select auth.uid())::text||'/avatar.jpg');
create policy "photo_profil_remplacer_la_sienne" on storage.objects for update to authenticated
using (bucket_id='photos-profil' and name=(select auth.uid())::text||'/avatar.jpg')
with check (bucket_id='photos-profil' and name=(select auth.uid())::text||'/avatar.jpg');
create policy "photo_profil_retirer_la_sienne" on storage.objects for delete to authenticated
using (bucket_id='photos-profil' and name=(select auth.uid())::text||'/avatar.jpg');
