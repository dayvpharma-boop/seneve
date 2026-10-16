-- SÉNEVÉ 025 — Réponses « Qu'est-ce qui t'a freiné ? » dans l'Administration (décision de Dr Justin, 16/10/2026 10 h 22 : « Oui »).
-- Administrateur : chiffres par motif + coordonnées des personnes (pour pouvoir les contacter).
-- Accompagnateur : chiffres seulement (pas de nom ni de coordonnées).
-- 90 derniers jours. Lecture seule.
create or replace function seneve.staff_list_obstacles()
returns table(cree_le timestamptz, motif text, prenom text, langue text, programme_id text, email text, whatsapp text)
language plpgsql stable security definer set search_path to '' as $$
#variable_conflict use_column
declare
  v_admin boolean := seneve.has_role('administrateur');
begin
  if (select auth.uid()) is null then raise exception 'Session requise.' using errcode = '28000'; end if;
  if not v_admin and not seneve.has_role('accompagnateur') then
    raise exception 'Accès réservé à l''équipe d''accompagnement.' using errcode = '42501';
  end if;
  return query
  select o.cree_le, o.motif,
         case when v_admin then p.prenom end, p.langue, e.programme_id,
         case when v_admin then u.email::text end,
         case when v_admin then (select c.identite_canal from seneve.channel_links c
            where c.participant_id = o.participant_id and c.canal = 'whatsapp' and c.etat = 'verifiee'
            order by c.verifiee_le desc limit 1) end
    from seneve.obstacles o
    join seneve.participants p on p.participant_id = o.participant_id
    join seneve.enrollments e on e.enrollment_id = o.enrollment_id
    left join auth.users u on u.id = p.auth_user_id
   where o.cree_le > now() - interval '90 days'
   order by o.cree_le desc
   limit 500;
end $$;
revoke all on function seneve.staff_list_obstacles() from public, anon;
grant execute on function seneve.staff_list_obstacles() to authenticated;
