-- SÉNEVÉ 048 (25/10/2026) — Publication de la Découverte EN V2 et des Paroles du jour,
-- validée par Dr Justin (« Adapté le parcours de 7 jours », 25/10/2026 12 h 45). Appliquée sur seneve-prod.
do $m$
declare
  v_en constant text := 'PROSPECT_LIVRE_7J_EN_V1';
  v_fr constant text := 'PROSPECT_LIVRE_7J_FR_V1';
  v_valid constant text := 'Dr Justin Tshims (« Adapté le parcours de 7 jours », 25/10/2026)';
begin
  perform pg_advisory_xact_lock(hashtext(v_en));
  if not exists(select 1 from seneve.programme_versions where programme_id=v_en and version=2 and etat='a_relire') then
    raise exception 'V2 EN à relire introuvable';
  end if;
  if not exists(select 1 from seneve.programme_versions where programme_id=v_fr and version=3 and etat='publiee') then
    raise exception 'V3 FR publiée attendue';
  end if;
  update seneve.programme_versions set etat='archivee' where programme_id=v_en and version=1;
  update seneve.programme_versions set etat='publiee', valide_par=v_valid, date_validation=now(), publiee_le=now() where programme_id=v_en and version=2;
  insert into seneve.publications(programme_id, version, langue, demande_par, resultat, date_publication, version_precedente)
    values (v_en, 2, 'en', v_valid, 'reussie', now(), 1);
  update seneve.paroles set etat='publiee', valide_par=v_valid, date_validation=now()
   where programme_id=v_en and version=2 and langue='en';
  -- Paroles FR déjà validées le 18/10/2026 : rattachées à la V3 FR publiée (mêmes textes).
  insert into seneve.paroles (programme_id, version, langue, jour, texte, reference_livre, etat, valide_par, date_validation)
    select programme_id, 3, langue, jour, texte, reference_livre, 'publiee', valide_par, date_validation
    from seneve.paroles where programme_id=v_fr and version=1 and langue='fr' and etat='publiee'
    on conflict (programme_id, version, langue, jour) do nothing;
  if (select count(*) from seneve.paroles where programme_id=v_en and version=2 and etat='publiee') <> 7
     or (select count(*) from seneve.paroles where programme_id=v_fr and version=3 and etat='publiee') <> 7 then
    raise exception 'Paroles incomplètes';
  end if;
end $m$;
