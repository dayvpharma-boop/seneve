-- 057 : e-mail de bienvenue à l'ouverture d'un compte (texte validé par Dr Justin le 03/11/2026).
-- Une tâche « bienvenue_email » est créée quand un participant reçoit un compte de connexion
-- (création, ou achat lié plus tard à un compte). Envoi par n8n, comme compte_supprime_email.
-- L'adresse n'est pas copiée dans la tâche : elle est lue au moment de l'envoi.
-- Échéance + 5 min : le prénom et la langue choisis juste après l'inscription sont pris en compte.

create or replace function seneve.tg_bienvenue_email()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  if new.auth_user_id is not null and (tg_op = 'INSERT' or old.auth_user_id is null) then
    insert into seneve.jobs (type, cle_logique, echeance, charge)
    values ('bienvenue_email', 'bienvenue:' || new.auth_user_id::text, now() + interval '5 minutes',
            jsonb_build_object('participant_id', new.participant_id))
    on conflict (cle_logique) do nothing;
  end if;
  return new;
end $function$;

drop trigger if exists bienvenue_email on seneve.participants;
create trigger bienvenue_email after insert or update of auth_user_id on seneve.participants
  for each row execute function seneve.tg_bienvenue_email();

create or replace function seneve.claim_welcome_emails(p_limite integer default 10)
 returns table(job_id uuid, email text, prenom text, langue text, tentatives integer)
 language plpgsql
 security definer
 set search_path to ''
as $function$
#variable_conflict use_column
begin
  -- Compte supprimé avant l'envoi : rien à envoyer.
  update seneve.jobs j set etat = 'annulee', erreur = 'Compte supprimé avant l''envoi'
   where j.type = 'bienvenue_email' and j.etat in ('en_attente', 'en_traitement')
     and not exists (select 1 from seneve.participants p join auth.users u on u.id = p.auth_user_id
                      where p.participant_id = (j.charge->>'participant_id')::uuid);
  return query
  with pris as (
    update seneve.jobs j set etat = 'en_traitement', reserve_le = now(), tentatives = j.tentatives + 1
     where j.job_id in (
       select x.job_id from seneve.jobs x
        where x.type = 'bienvenue_email'
          and (x.etat = 'en_attente' or (x.etat = 'en_traitement' and x.reserve_le < now() - interval '15 minutes'))
          and x.echeance <= now() and x.tentatives < 5
        order by x.cree_le limit greatest(1, least(p_limite, 50))
        for update skip locked)
    returning j.job_id, j.charge, j.tentatives)
  select pris.job_id, u.email::text, p.prenom, p.langue, pris.tentatives
    from pris
    join seneve.participants p on p.participant_id = (pris.charge->>'participant_id')::uuid
    join auth.users u on u.id = p.auth_user_id
   where coalesce(u.email, '') <> '';
end $function$;

create or replace function seneve.finish_welcome_email(p_job_id uuid, p_ok boolean, p_erreur text default null)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  update seneve.jobs
     set etat = case when p_ok then 'terminee' when tentatives >= 5 then 'a_examiner' else 'en_attente' end,
         charge = case when p_ok then charge || jsonb_build_object('envoye_le', now()) else charge end,
         erreur = case when p_ok then null else left(coalesce(p_erreur, 'erreur inconnue'), 500) end,
         echeance = case when p_ok then echeance else now() + interval '10 minutes' end
   where job_id = p_job_id and type = 'bienvenue_email' and etat = 'en_traitement';
end $function$;

revoke all on function seneve.tg_bienvenue_email() from public, anon, authenticated;
revoke all on function seneve.claim_welcome_emails(integer) from public, anon, authenticated;
revoke all on function seneve.finish_welcome_email(uuid, boolean, text) from public, anon, authenticated;
grant execute on function seneve.claim_welcome_emails(integer) to service_role;
grant execute on function seneve.finish_welcome_email(uuid, boolean, text) to service_role;
