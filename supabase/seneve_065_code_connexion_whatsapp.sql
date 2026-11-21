-- SÉNEVÉ — seneve_065_code_connexion_whatsapp (21/11/2026)
-- Décision de Dr Justin du 21/11/2026 : se connecter avec son numéro WhatsApp SANS modèle « Authentification » Meta
-- (l'entreprise n'est pas encore vérifiée par Meta). Même principe que « Relier mon WhatsApp » :
-- c'est la personne qui écrit d'abord à SÉNEVÉ.
--
-- Parcours :
-- 1. Dans l'app, la personne saisit son numéro. Supabase Auth crée le code à 6 chiffres (expiration, essais, limites)
--    et appelle le crochet « Send SMS » (fonction envoyer-code-whatsapp), qui DÉPOSE le code ici sans rien envoyer.
-- 2. La personne envoie « CODE » au WhatsApp de SÉNEVÉ. WHATSAPP BASE (n8n) appelle remettre_code_connexion avec le
--    numéro donné par Meta (jamais un numéro saisi) et répond dans la conversation ouverte par la personne : gratuit.
-- 3. La personne saisit le code dans l'app ; Supabase Auth le vérifie (verifyOtp) et ouvre la session.
-- Le code n'est remis qu'au WhatsApp du numéro demandé : quelqu'un qui saisit le numéro d'un autre ne reçoit rien.
--
-- Ajout seulement : aucune table ni fonction existante n'est modifiée.

create table if not exists seneve.codes_connexion_whatsapp (
  telephone text primary key check (telephone ~ '^\+[1-9][0-9]{7,14}$'),
  code text not null check (code ~ '^[0-9]{6}$'),
  langue text not null default 'fr' check (langue in ('fr','en')),
  cree_le timestamptz not null default now(),
  expire_le timestamptz not null,
  remises int not null default 0
);
alter table seneve.codes_connexion_whatsapp enable row level security;
revoke all on seneve.codes_connexion_whatsapp from public, anon, authenticated;

-- Appelée par le crochet (clé de service) : remplace le code précédent du même numéro.
create or replace function seneve.deposer_code_connexion(p_telephone text, p_code text, p_langue text default 'fr')
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_telephone !~ '^\+[1-9][0-9]{7,14}$' or p_code !~ '^[0-9]{6}$' then
    raise exception 'Demande invalide' using errcode = '22023';
  end if;
  delete from seneve.codes_connexion_whatsapp where expire_le <= now();
  insert into seneve.codes_connexion_whatsapp (telephone, code, langue, expire_le)
  values (p_telephone, p_code, case when p_langue = 'en' then 'en' else 'fr' end, now() + interval '10 minutes')
  on conflict (telephone) do update
    set code = excluded.code, langue = excluded.langue, cree_le = now(), expire_le = excluded.expire_le, remises = 0;
end $$;
revoke all on function seneve.deposer_code_connexion(text, text, text) from public, anon, authenticated;
grant execute on function seneve.deposer_code_connexion(text, text, text) to service_role;

-- Appelée par n8n (clé de service) avec l'expéditeur WhatsApp fourni par Meta.
create or replace function seneve.remettre_code_connexion(p_identite_canal text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_phone text := '+' || regexp_replace(coalesce(p_identite_canal, ''), '\D', '', 'g');
  v_hash text := encode(sha256(convert_to(v_phone, 'UTF8')), 'hex');
  v_ligne seneve.codes_connexion_whatsapp%rowtype;
  v_resultat text;
begin
  if v_phone !~ '^\+[1-9][0-9]{7,14}$' then
    return jsonb_build_object('resultat', 'aucune_demande');
  end if;
  -- Au plus 5 remises par numéro et par heure.
  if (select count(*) from seneve.audit_events
       where action = 'code_connexion_whatsapp' and objet = v_hash and resultat = 'remis'
         and cree_le > now() - interval '1 hour') >= 5 then
    v_resultat := 'trop_d_essais';
  else
    delete from seneve.codes_connexion_whatsapp where expire_le <= now();
    update seneve.codes_connexion_whatsapp set remises = remises + 1
     where telephone = v_phone and expire_le > now()
     returning * into v_ligne;
    v_resultat := case when found then 'remis' else 'aucune_demande' end;
  end if;
  insert into seneve.audit_events (acteur, action, objet, resultat, details)
  values ('n8n', 'code_connexion_whatsapp', v_hash, v_resultat, '{}'::jsonb);
  return jsonb_build_object('resultat', v_resultat,
    'code', case when v_resultat = 'remis' then v_ligne.code end,
    'langue', coalesce(v_ligne.langue, 'fr'));
end $$;
revoke all on function seneve.remettre_code_connexion(text) from public, anon, authenticated;
grant execute on function seneve.remettre_code_connexion(text) to service_role;

-- Retour arrière :
--   drop function seneve.remettre_code_connexion(text); drop function seneve.deposer_code_connexion(text, text, text);
--   drop table seneve.codes_connexion_whatsapp;
