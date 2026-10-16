-- SÉNEVÉ 034 — Places financées (décisions de Dr Justin du 16/10/2026, 21 h 50)
--   * Programme offert : Sénevé Continuité uniquement (offre CONTINUITE_MENSUEL_FR).
--   * Attribution : code personnel ; un code = une place ; le participant le saisit dans son espace.
--   * Le financeur ne voit que le nombre de places utilisées : aucun nom, aucune progression.
-- Chaque mois offert crée un droit d'origine « place_financee » et suit exactement les règles
-- d'un achat Continuité (rotation Mois 1 → 2 → 3, mois à la suite, droit prolongé).

create table if not exists seneve.conventions_places (
  convention_id   uuid primary key default gen_random_uuid(),
  organisation    text not null check (length(btrim(organisation)) between 2 and 120),
  offre_id        text not null default 'CONTINUITE_MENSUEL_FR' references seneve.offers (offre_id)
                    check (offre_id = 'CONTINUITE_MENSUEL_FR'),
  nb_places       integer not null check (nb_places between 1 and 5000),
  mois_par_place  integer not null default 1 check (mois_par_place between 1 and 12),
  valide_jusqu_au date not null,
  etat            text not null default 'active' check (etat in ('active', 'close')),
  note            text check (note is null or length(note) <= 500),
  cree_par        uuid,
  cree_le         timestamptz not null default now()
);

create table if not exists seneve.codes_places (
  code           text primary key check (code ~ '^SNV-[A-Z2-9]{4}-[A-Z2-9]{4}$'),
  convention_id  uuid not null references seneve.conventions_places (convention_id),
  etat           text not null default 'libre' check (etat in ('libre', 'utilise', 'annule')),
  participant_id uuid references seneve.participants (participant_id),
  utilise_le     timestamptz,
  cree_le        timestamptz not null default now(),
  check ((etat = 'utilise') = (participant_id is not null and utilise_le is not null))
);
create index if not exists codes_places_convention_idx on seneve.codes_places (convention_id, etat);
create unique index if not exists codes_places_un_par_convention
  on seneve.codes_places (convention_id, participant_id) where participant_id is not null;

create table if not exists seneve.codes_places_essais (
  participant_id uuid not null references seneve.participants (participant_id),
  essaye_le      timestamptz not null default now(),
  reussi         boolean not null
);
create index if not exists codes_places_essais_idx on seneve.codes_places_essais (participant_id, essaye_le);

-- Lien entre un droit et le code qui l'a ouvert (traçabilité ; aucune donnée transmise au financeur).
alter table seneve.entitlements add column if not exists code_place text references seneve.codes_places (code);

alter table seneve.conventions_places enable row level security;
alter table seneve.codes_places enable row level security;
alter table seneve.codes_places_essais enable row level security;
revoke all on seneve.conventions_places, seneve.codes_places, seneve.codes_places_essais from anon, authenticated;

-- Code lisible : SNV-XXXX-XXXX, sans 0/O, 1/I/L.
create or replace function seneve._nouveau_code_place()
returns text language plpgsql volatile set search_path = '' as $$
declare
  a constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  b bytea := extensions.gen_random_bytes(8);
  s text := '';
  i int;
begin
  for i in 0..7 loop
    s := s || substr(a, (get_byte(b, i) % length(a)) + 1, 1);
  end loop;
  return 'SNV-' || substr(s, 1, 4) || '-' || substr(s, 5, 4);
end $$;
revoke all on function seneve._nouveau_code_place() from public, anon, authenticated;

-- Ouvre un mois de Continuité pour un participant à partir d'un droit déjà créé (même logique qu'un achat).
create or replace function seneve._ouvrir_mois_continuite(p_participant_id uuid, p_entitlement_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_auj date := (now() at time zone 'Africa/Kinshasa')::date;
  v_n int; v_prog_id text; v_prog seneve.programmes%rowtype; v_version int;
  v_enr_fin date; v_dernier date; v_debut date; v_enr uuid; v_plan uuid;
begin
  select count(*) into v_n from seneve.entitlements
   where participant_id = p_participant_id and offre_id = 'CONTINUITE_MENSUEL_FR' and etat <> 'revoque';
  v_prog_id := case (v_n - 1) % 3 when 1 then 'ABONNE_CONTINUITE_M2_FR_V1' when 2 then 'ABONNE_CONTINUITE_M3_FR_V1' else 'ABONNE_CONTINUITE_FR_V1' end;
  if not exists (select 1 from seneve.programme_versions where programme_id = v_prog_id and etat = 'publiee') then
    v_prog_id := 'ABONNE_CONTINUITE_FR_V1';
  end if;
  select max(coalesce(e.date_fin_prevue, e.date_debut + (coalesce(pr.duree_jours, 30) - 1))) into v_enr_fin
    from seneve.enrollments e join seneve.programmes pr on pr.programme_id = e.programme_id
   where e.participant_id = p_participant_id and e.programme_id like 'ABONNE_CONTINUITE%' and e.etat in ('active', 'en_pause');
  select max(p.date_debut + (coalesce(pr.duree_jours, 30) - 1)) into v_dernier
    from seneve.parcours_planifies p join seneve.programmes pr on pr.programme_id = p.programme_id
   where p.participant_id = p_participant_id and p.programme_id like 'ABONNE_CONTINUITE%' and p.etat = 'en_attente';
  v_debut := greatest(v_auj, coalesce(v_enr_fin + 1, v_auj), coalesce(v_dernier + 1, v_auj));
  select * into v_prog from seneve.programmes where programme_id = v_prog_id;

  if v_enr_fin is null and v_dernier is null then
    select version into v_version from seneve.programme_versions
     where programme_id = v_prog_id and etat = 'publiee' order by version desc limit 1;
    if v_version is null then
      raise exception 'Programme Continuité non publié.' using errcode = 'P0001';
    end if;
    insert into seneve.enrollments (participant_id, programme_id, version, langue, date_debut, date_fin_prevue, etat, entitlement_id)
    values (p_participant_id, v_prog_id, v_version, v_prog.langue, v_debut,
            case when v_prog.duree_jours is null then null else v_debut + (v_prog.duree_jours - 1) end, 'active', p_entitlement_id)
    returning enrollment_id into v_enr;
  else
    insert into seneve.parcours_planifies (participant_id, programme_id, entitlement_id, date_debut)
    values (p_participant_id, v_prog_id, p_entitlement_id, v_debut)
    on conflict (entitlement_id) do nothing
    returning planifie_id into v_plan;
  end if;

  update seneve.entitlements
     set fin = greatest(now(), v_debut::timestamp at time zone 'Africa/Kinshasa',
                        (select max(e.fin) from seneve.entitlements e
                          where e.participant_id = p_participant_id and e.offre_id = 'CONTINUITE_MENSUEL_FR'
                            and e.etat = 'actif' and e.entitlement_id <> p_entitlement_id))
               + make_interval(days => coalesce((select duree_acces_jours from seneve.offers where offre_id = 'CONTINUITE_MENSUEL_FR'), 30))
   where entitlement_id = p_entitlement_id;

  return jsonb_build_object('programme_id', v_prog_id, 'date_debut', v_debut, 'enrollment_id', v_enr, 'parcours_planifie', v_plan);
end $$;
revoke all on function seneve._ouvrir_mois_continuite(uuid, uuid) from public, anon, authenticated;

-- Participant : utiliser un code de place financée.
create or replace function seneve.utiliser_code_place(p_code text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_part uuid := seneve.current_participant_id();
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  v_c seneve.codes_places%rowtype; v_conv seneve.conventions_places%rowtype;
  v_echecs int; v_ent uuid; v_r jsonb; v_premier jsonb; i int;
  v_auj date := (now() at time zone 'Africa/Kinshasa')::date;
begin
  if v_part is null then raise exception 'Connexion requise.' using errcode = '42501'; end if;
  perform pg_advisory_xact_lock(hashtext('participant:' || v_part::text));

  select count(*) into v_echecs from seneve.codes_places_essais
   where participant_id = v_part and not reussi and essaye_le > now() - interval '1 hour';
  if v_echecs >= 10 then
    return jsonb_build_object('resultat', 'trop_d_essais');
  end if;

  if v_code ~ '^SNV[A-Z0-9]{8}$' then
    v_code := 'SNV-' || substr(v_code, 4, 4) || '-' || substr(v_code, 8, 4);
  end if;
  select * into v_c from seneve.codes_places where code = v_code for update;
  if found then select * into v_conv from seneve.conventions_places where convention_id = v_c.convention_id; end if;

  if not found or v_c.etat = 'annule' or v_conv.etat <> 'active' then
    insert into seneve.codes_places_essais (participant_id, reussi) values (v_part, false);
    return jsonb_build_object('resultat', 'code_invalide');
  end if;
  if v_c.etat = 'utilise' then
    if v_c.participant_id = v_part then return jsonb_build_object('resultat', 'deja_utilise_par_toi'); end if;
    insert into seneve.codes_places_essais (participant_id, reussi) values (v_part, false);
    return jsonb_build_object('resultat', 'code_deja_utilise');
  end if;
  if v_conv.valide_jusqu_au < v_auj then
    insert into seneve.codes_places_essais (participant_id, reussi) values (v_part, false);
    return jsonb_build_object('resultat', 'code_expire');
  end if;
  if exists (select 1 from seneve.codes_places where convention_id = v_conv.convention_id and participant_id = v_part) then
    return jsonb_build_object('resultat', 'deja_une_place');
  end if;

  update seneve.codes_places set etat = 'utilise', participant_id = v_part, utilise_le = now() where code = v_code;
  for i in 1..v_conv.mois_par_place loop
    insert into seneve.entitlements (participant_id, offre_id, origine, etat, debut, code_place)
    values (v_part, v_conv.offre_id, 'place_financee', 'actif', now(), v_code)
    returning entitlement_id into v_ent;
    v_r := seneve._ouvrir_mois_continuite(v_part, v_ent);
    if i = 1 then v_premier := v_r; end if;
  end loop;
  insert into seneve.codes_places_essais (participant_id, reussi) values (v_part, true);
  insert into seneve.audit_events (acteur, action, objet, resultat, details)
  values ('participant', 'place_financee_utilisee', 'convention:' || v_conv.convention_id, 'ok',
          jsonb_build_object('mois', v_conv.mois_par_place));
  return jsonb_build_object('resultat', 'ok', 'mois', v_conv.mois_par_place,
                            'date_debut', v_premier->>'date_debut', 'commence_maintenant', (v_premier->>'enrollment_id') is not null);
end $$;
revoke all on function seneve.utiliser_code_place(text) from public, anon;
grant execute on function seneve.utiliser_code_place(text) to authenticated;

-- Administrateur : créer une convention et ses codes.
create or replace function seneve.staff_creer_convention(p_organisation text, p_nb_places integer, p_mois_par_place integer,
                                                         p_valide_jusqu_au date, p_note text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_code text; v_n int := 0;
begin
  if not seneve.has_role('administrateur') then raise exception 'Réservé à l''administrateur.' using errcode = '42501'; end if;
  if p_valide_jusqu_au < (now() at time zone 'Africa/Kinshasa')::date then
    raise exception 'La date de validité est déjà passée.' using errcode = '22023';
  end if;
  insert into seneve.conventions_places (organisation, nb_places, mois_par_place, valide_jusqu_au, note, cree_par)
  values (btrim(p_organisation), p_nb_places, coalesce(p_mois_par_place, 1), p_valide_jusqu_au, nullif(btrim(coalesce(p_note, '')), ''), (select auth.uid()))
  returning convention_id into v_id;
  while v_n < p_nb_places loop
    v_code := seneve._nouveau_code_place();
    insert into seneve.codes_places (code, convention_id) values (v_code, v_id) on conflict (code) do nothing;
    if found then v_n := v_n + 1; end if;
  end loop;
  insert into seneve.audit_events (acteur, action, objet, resultat, details)
  values ('equipe', 'convention_creee', 'convention:' || v_id, 'ok',
          jsonb_build_object('places', p_nb_places, 'mois', p_mois_par_place, 'valide_jusqu_au', p_valide_jusqu_au));
  return jsonb_build_object('convention_id', v_id, 'places', v_n);
end $$;
revoke all on function seneve.staff_creer_convention(text, integer, integer, date, text) from public, anon;
grant execute on function seneve.staff_creer_convention(text, integer, integer, date, text) to authenticated;

-- Administrateur : liste des conventions (nombres seulement).
create or replace function seneve.staff_list_conventions()
returns table (convention_id uuid, organisation text, nb_places int, mois_par_place int, valide_jusqu_au date,
               etat text, note text, cree_le timestamptz, utilisees bigint, libres bigint, annulees bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not seneve.has_role('administrateur') then raise exception 'Réservé à l''administrateur.' using errcode = '42501'; end if;
  return query
  select c.convention_id, c.organisation, c.nb_places, c.mois_par_place, c.valide_jusqu_au, c.etat, c.note, c.cree_le,
         count(*) filter (where k.etat = 'utilise'), count(*) filter (where k.etat = 'libre'), count(*) filter (where k.etat = 'annule')
    from seneve.conventions_places c left join seneve.codes_places k using (convention_id)
   group by c.convention_id order by c.cree_le desc;
end $$;
revoke all on function seneve.staff_list_conventions() from public, anon;
grant execute on function seneve.staff_list_conventions() to authenticated;

-- Administrateur : codes d'une convention (état seulement, jamais le participant).
create or replace function seneve.staff_codes_convention(p_convention_id uuid)
returns table (code text, etat text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not seneve.has_role('administrateur') then raise exception 'Réservé à l''administrateur.' using errcode = '42501'; end if;
  return query select k.code, k.etat from seneve.codes_places k where k.convention_id = p_convention_id order by k.etat, k.code;
end $$;
revoke all on function seneve.staff_codes_convention(uuid) from public, anon;
grant execute on function seneve.staff_codes_convention(uuid) to authenticated;

-- Administrateur : clore une convention (les codes non utilisés sont annulés ; les places utilisées restent).
create or replace function seneve.staff_fermer_convention(p_convention_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_n int;
begin
  if not seneve.has_role('administrateur') then raise exception 'Réservé à l''administrateur.' using errcode = '42501'; end if;
  update seneve.conventions_places set etat = 'close' where convention_id = p_convention_id;
  if not found then raise exception 'Convention introuvable.' using errcode = 'P0002'; end if;
  update seneve.codes_places set etat = 'annule' where convention_id = p_convention_id and etat = 'libre';
  get diagnostics v_n = row_count;
  insert into seneve.audit_events (acteur, action, objet, resultat, details)
  values ('equipe', 'convention_close', 'convention:' || p_convention_id, 'ok', jsonb_build_object('codes_annules', v_n));
  return jsonb_build_object('codes_annules', v_n);
end $$;
revoke all on function seneve.staff_fermer_convention(uuid) from public, anon;
grant execute on function seneve.staff_fermer_convention(uuid) to authenticated;
