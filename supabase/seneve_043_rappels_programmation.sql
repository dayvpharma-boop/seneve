-- SÉNEVÉ 043 — Envoi programmé des rappels sur le téléphone (suite de 041).
-- Toutes les 15 minutes, la base appelle la fonction « envoyer-rappels » avec sa clé d'appel (créée dans
-- seneve.push_config, jamais affichée). Remplacer <REF> par l'identifiant du projet (essai ou réel).
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule(jobid) from cron.job where jobname = 'seneve-rappels-telephone';
select cron.schedule('seneve-rappels-telephone', '*/15 * * * *', $cron$
  select net.http_post(
    url := 'https://<REF>.supabase.co/functions/v1/envoyer-rappels',
    headers := jsonb_build_object('Content-Type', 'application/json',
                                  'x-seneve-cle', (select cle_appel from seneve.push_config where id = 1)),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000)
$cron$);
