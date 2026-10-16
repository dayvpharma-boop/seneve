-- SÉNEVÉ 024 — « Qu'est-ce qui t'a freiné ? » (cahier des charges : deux actions non réalisées → demander l'obstacle).
-- Décision de Dr Justin du 16/10/2026 (07 h 25) : les 5 réponses proposées et le seuil de 2 actions sont validés.
-- Une réponse par série d'actions (cle = jours concernés). Réponse privée : visible par le participant et l'équipe.
-- Aucune variante d'exercice n'est proposée (elles doivent d'abord être rédigées et validées).

create table if not exists seneve.obstacles (
  obstacle_id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references seneve.participants(participant_id),
  enrollment_id uuid not null references seneve.enrollments(enrollment_id),
  cle text not null,
  motif text not null check (motif in ('temps','compris','difficile','personnel','autre','plus_tard')),
  cree_le timestamptz not null default now(),
  unique (enrollment_id, cle)
);
alter table seneve.obstacles enable row level security;
create policy obstacles_lecture_soi on seneve.obstacles for select to authenticated
  using (participant_id = seneve.current_participant_id());
grant select on seneve.obstacles to authenticated;

create or replace function seneve.obstacle_repondre(p_enrollment_id uuid, p_cle text, p_motif text)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
  v_participant uuid := seneve.current_participant_id();
  v_id uuid;
begin
  if v_participant is null then raise exception 'Session requise.' using errcode = '28000'; end if;
  if not exists (select 1 from seneve.enrollments where enrollment_id = p_enrollment_id and participant_id = v_participant) then
    raise exception 'Inscription introuvable pour ce compte.' using errcode = '42501';
  end if;
  if p_motif not in ('temps','compris','difficile','personnel','autre','plus_tard') then
    raise exception 'Réponse inconnue.' using errcode = '22023';
  end if;
  if coalesce(p_cle, '') !~ '^[0-9]{1,3}-[0-9]{1,3}$' then
    raise exception 'Clé invalide.' using errcode = '22023';
  end if;
  insert into seneve.obstacles (participant_id, enrollment_id, cle, motif)
  values (v_participant, p_enrollment_id, p_cle, p_motif)
  on conflict (enrollment_id, cle) do nothing
  returning obstacle_id into v_id;
  return jsonb_build_object('enregistre', v_id is not null);
end $$;

revoke all on function seneve.obstacle_repondre(uuid, text, text) from public, anon;
grant execute on function seneve.obstacle_repondre(uuid, text, text) to authenticated;
