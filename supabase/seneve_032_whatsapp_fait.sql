-- SÉNEVÉ 2.0 — Migration 032 (16/10/2026) : mot-clé « FAIT » sur WhatsApp
-- Décision de Dr Justin (16/10/2026, 20 h 01, « Validé ») :
--   le participant répond FAIT (ou FAIT 1, FAIT 2…) → si son numéro est relié (liaison vérifiée) à son compte,
--   l'action du jour de son programme est notée « réalisée » dans l'espace (canal whatsapp).
--   Plusieurs programmes actifs sans numéro → on lui demande lequel ; numéro non relié → rien n'est noté.
-- Le jour est le jour calendaire du parcours (fuseau Africa/Kinshasa), comme dans l'espace.
-- Un même message WhatsApp (identifiant fournisseur) ne peut être compté qu'une fois.
-- Réservée au serveur (n8n) : aucun droit pour les visiteurs ni les participants.

create or replace function seneve.whatsapp_fait(p_identite_canal text, p_message_id text, p_choix integer default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_phone text := '+' || regexp_replace(coalesce(p_identite_canal, ''), '\D', '', 'g');
  v_participant uuid; v_prenom text;
  v_auj date := (now() at time zone 'Africa/Kinshasa')::date;
  v_options jsonb; v_n int;
  v_enr seneve.enrollments%rowtype; v_nom text; v_duree int; v_jour int;
  v_act uuid; v_client uuid; v_event uuid; v_avant text;
begin
  if length(v_phone) < 9 or coalesce(btrim(p_message_id), '') = '' then
    return jsonb_build_object('resultat', 'invalide');
  end if;
  select l.participant_id, p.prenom into v_participant, v_prenom
    from seneve.channel_links l join seneve.participants p using (participant_id)
   where l.canal = 'whatsapp' and l.identite_canal = v_phone and l.etat = 'verifiee'
   limit 1;
  if v_participant is null then
    return jsonb_build_object('resultat', 'non_lie');
  end if;

  -- Programmes en cours (commencés, non terminés), numérotés dans un ordre stable.
  with en_cours as (
    select e.enrollment_id, coalesce(pr.nom, e.programme_id) nom, e.cree_le,
           row_number() over (order by e.cree_le, e.enrollment_id) n
      from seneve.enrollments e left join seneve.programmes pr on pr.programme_id = e.programme_id
     where e.participant_id = v_participant and e.etat = 'active' and e.date_debut <= v_auj
       and (e.date_fin_prevue is null or e.date_fin_prevue >= v_auj))
  select jsonb_agg(jsonb_build_object('n', n, 'nom', nom, 'enrollment_id', enrollment_id) order by n), count(*)
    into v_options, v_n from en_cours;

  if coalesce(v_n, 0) = 0 then
    return jsonb_build_object('resultat', 'aucun_parcours', 'prenom', v_prenom);
  end if;
  if v_n > 1 and p_choix is null then
    return jsonb_build_object('resultat', 'choix', 'prenom', v_prenom,
      'options', (select jsonb_agg(o - 'enrollment_id') from jsonb_array_elements(v_options) o));
  end if;
  if p_choix is not null and (p_choix < 1 or p_choix > v_n) then
    return jsonb_build_object('resultat', 'choix_invalide', 'prenom', v_prenom,
      'options', (select jsonb_agg(o - 'enrollment_id') from jsonb_array_elements(v_options) o));
  end if;

  select * into v_enr from seneve.enrollments
   where enrollment_id = (select (o->>'enrollment_id')::uuid from jsonb_array_elements(v_options) o
                           where (o->>'n')::int = coalesce(p_choix, 1));
  select coalesce(nom, v_enr.programme_id), duree_jours into v_nom, v_duree from seneve.programmes where programme_id = v_enr.programme_id;
  v_jour := v_auj - v_enr.date_debut + 1;
  if v_duree is not null and v_jour > v_duree then
    return jsonb_build_object('resultat', 'aucun_parcours', 'prenom', v_prenom);
  end if;

  select a.activity_id into v_act
    from seneve.contents c join seneve.activities a on a.content_id = c.content_id and a.type_activite = 'action'
   where c.programme_id = v_enr.programme_id and c.version = v_enr.version and c.jour = v_jour
   order by c.numero_message, a.activity_id limit 1;
  if v_act is null then
    return jsonb_build_object('resultat', 'pas_d_action', 'prenom', v_prenom, 'jour', v_jour, 'programme', v_nom);
  end if;

  select etat into v_avant from seneve.activity_state where enrollment_id = v_enr.enrollment_id and activity_id = v_act;
  v_client := md5('whatsapp_fait:' || p_message_id)::uuid;
  insert into seneve.progress_events (client_event_id, enrollment_id, activity_id, nouvel_etat, canal, empreinte)
  values (v_client, v_enr.enrollment_id, v_act, 'realisee', 'whatsapp',
          md5(v_enr.enrollment_id::text || '|' || v_act::text || '|realisee|whatsapp'))
  on conflict (client_event_id) do nothing
  returning event_id into v_event;
  if v_event is null then
    return jsonb_build_object('resultat', 'deja_compte', 'prenom', v_prenom, 'jour', v_jour, 'programme', v_nom);
  end if;

  insert into seneve.activity_state as s (enrollment_id, activity_id, etat, aide_demandee, realisee_le)
  values (v_enr.enrollment_id, v_act, 'realisee', false, now())
  on conflict (enrollment_id, activity_id) do update set
    etat = 'realisee', realisee_le = coalesce(s.realisee_le, now()), modifie_le = now();

  insert into seneve.audit_events (acteur, action, objet, resultat, details)
  values ('n8n', 'action_fait_whatsapp', 'enrollment:' || v_enr.enrollment_id::text, 'ok',
          jsonb_build_object('jour', v_jour, 'etat_avant', v_avant, 'event_id', v_event));

  return jsonb_build_object('resultat', case when v_avant = 'realisee' then 'deja_notee' else 'notee' end,
                            'prenom', v_prenom, 'jour', v_jour, 'programme', v_nom);
end $function$;

revoke all on function seneve.whatsapp_fait(text, text, integer) from public, anon, authenticated;
grant execute on function seneve.whatsapp_fait(text, text, integer) to service_role;
