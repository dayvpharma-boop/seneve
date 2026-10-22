-- Suivi administratif séparé des états de livraison et des traitements sources.
create table seneve.incident_suivis (
  incident_id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('communication', 'traitement')),
  source_id uuid not null,
  revision text not null check (revision ~ '^[0-9a-f]{32}$'),
  categorie text not null,
  etat_source text not null,
  date_source timestamptz not null,
  gravite text not null,
  etat text not null default 'ouvert' check (etat in ('ouvert','en_cours','resolu')),
  note_resolution text,
  modifie_le timestamptz not null default clock_timestamp(),
  unique (source, source_id, revision)
);
create table seneve.incident_actions (
  operation_id uuid primary key,
  incident_id uuid not null references seneve.incident_suivis(incident_id),
  auteur uuid not null,
  action text not null check (action in ('note','prendre_en_charge','resoudre','rouvrir')),
  texte text not null check (length(btrim(texte)) between 1 and 4000),
  cree_le timestamptz not null default clock_timestamp()
);
create index incident_actions_historique on seneve.incident_actions(incident_id, cree_le desc);
alter table seneve.incident_suivis enable row level security;
alter table seneve.incident_actions enable row level security;
revoke all on seneve.incident_suivis, seneve.incident_actions from public, anon, authenticated;

create function seneve._incident_sources()
returns table(source text, source_id uuid, revision text, categorie text, etat_source text, date_source timestamptz, gravite text)
language sql stable security definer set search_path = '' as $f$
  select 'communication'::text, c.communication_id,
    md5(concat_ws('|', c.etat, c.tentatives::text, extract(epoch from c.modifie_le)::text)),
    c.canal, c.etat, c.modifie_le, case when c.etat = 'erreur' then 'Élevée' else 'Moyenne' end
  from seneve.communications c where c.etat in ('erreur','incertain','expire')
  union all
  select 'traitement'::text, j.job_id,
    md5(concat_ws('|', j.etat, j.tentatives::text, extract(epoch from j.reserve_le)::text, extract(epoch from j.echeance)::text)),
    j.type, j.etat, coalesce(j.reserve_le, j.echeance, j.cree_le),
    case when j.etat = 'erreur' then 'Élevée' else 'Moyenne' end
  from seneve.jobs j where j.etat in ('erreur','a_examiner')
    or (j.etat = 'en_attente' and j.echeance < now() - interval '24 hours');
$f$;
revoke all on function seneve._incident_sources() from public, anon, authenticated, service_role;

create function seneve.staff_list_incidents(p_limite integer default 200)
returns jsonb language plpgsql stable security definer set search_path = '' as $f$
declare v_result jsonb; v_limite integer := greatest(1, least(coalesce(p_limite,200),500));
begin
  if (select auth.uid()) is null or not seneve.has_role('administrateur') then
    raise exception 'Accès réservé aux administrateurs.' using errcode = '42501';
  end if;
  with sources as materialized (select * from seneve._incident_sources()),
  incidents as (
    select s.*, a.incident_id, coalesce(a.etat,'ouvert') as etat, a.note_resolution, a.modifie_le
    from sources s left join seneve.incident_suivis a using(source,source_id,revision)
    union all
    select a.source,a.source_id,a.revision,a.categorie,a.etat_source,a.date_source,a.gravite,
      a.incident_id,a.etat,a.note_resolution,a.modifie_le
    from seneve.incident_suivis a where not exists
      (select 1 from sources s where (s.source,s.source_id,s.revision)=(a.source,a.source_id,a.revision))
  ), page as (
    select * from incidents order by greatest(date_source,modifie_le) desc,source,source_id,revision limit v_limite
  )
  select jsonb_build_object('total',(select count(*) from incidents),'limite',v_limite,
    'incidents',coalesce((select jsonb_agg(jsonb_build_object(
      'id',p.source || ':' || p.source_id::text || ':' || p.revision,
      'source',p.source,'source_id',p.source_id,'revision',p.revision,'modifie_le',p.modifie_le,
      'type',p.categorie,'etat',p.etat,'etat_source',p.etat_source,'nombre',1,
      'date',p.date_source,'gravite',p.gravite,
      'titre',case when p.source='communication' then 'Envoi ' else 'Traitement ' end || p.categorie,
      'description',case when p.etat_source='en_attente' then 'Traitement en attente depuis plus de 24 heures.'
        else 'Un signalement technique a été détecté. État à la détection : ' || p.etat_source || '.' end,
      'impact',case when p.source='communication' then 'Une communication SÉNEVÉ.' else 'Un traitement SÉNEVÉ.' end,
      'note',p.note_resolution,
      'journal_total',(select count(*) from seneve.incident_actions a where a.incident_id=p.incident_id),
      'journal',coalesce((select jsonb_agg(jsonb_build_object('date',a.cree_le,'texte',a.texte,'action',a.action) order by a.cree_le)
        from (select * from seneve.incident_actions a where a.incident_id=p.incident_id order by a.cree_le desc,operation_id limit 20) a),'[]'::jsonb)
    ) order by greatest(p.date_source,p.modifie_le) desc,p.source,p.source_id,p.revision) from page p),'[]'::jsonb))
  into v_result;
  return v_result;
end $f$;
revoke all on function seneve.staff_list_incidents(integer) from public,anon;
grant execute on function seneve.staff_list_incidents(integer) to authenticated;

create function seneve.staff_update_incident(
  p_source text,p_source_id uuid,p_revision text,p_modifie_le timestamptz,
  p_action text,p_texte text,p_operation_id uuid
)
returns jsonb language plpgsql security definer set search_path = '' as $f$
declare
  v_uid uuid := (select auth.uid()); v_source record;
  v_suivi seneve.incident_suivis%rowtype; v_action seneve.incident_actions%rowtype;
  v_texte text := btrim(coalesce(p_texte,'')); v_etat text;
begin
  if v_uid is null or not seneve.has_role('administrateur') then
    raise exception 'Accès réservé aux administrateurs.' using errcode = '42501';
  end if;
  if p_source is null or p_source not in ('communication','traitement') or p_source_id is null
      or p_revision is null or p_revision !~ '^[0-9a-f]{32}$' or p_operation_id is null
      or p_action is null or p_action not in ('note','prendre_en_charge','resoudre','rouvrir') then
    raise exception 'Opération invalide.' using errcode = '22023';
  end if;
  if p_action in ('note','resoudre') and v_texte='' or length(v_texte)>4000 then
    raise exception 'Une note de 1 à 4000 caractères est requise.' using errcode = '22023';
  end if;
  if v_texte='' then v_texte := case when p_action='prendre_en_charge' then 'Signalement pris en charge.' else 'Signalement rouvert.' end; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_operation_id::text,0));
  perform pg_advisory_xact_lock(hashtextextended(p_source || ':' || p_source_id::text || ':' || p_revision,0));
  select * into v_suivi from seneve.incident_suivis
    where (source,source_id,revision)=(p_source,p_source_id,p_revision) for update;
  select * into v_action from seneve.incident_actions where operation_id=p_operation_id;
  if found then
    if v_action.incident_id is distinct from v_suivi.incident_id or v_action.auteur<>v_uid
        or v_action.action<>p_action or v_action.texte<>v_texte then
      raise exception 'Identifiant de tentative déjà utilisé.' using errcode='22023';
    end if;
    return jsonb_build_object('resultat','deja_enregistree');
  end if;
  if v_suivi.modifie_le is distinct from p_modifie_le then
    raise exception 'Le signalement a changé. Actualise le registre avant de réessayer.' using errcode='40001';
  end if;
  if v_suivi.incident_id is null then
    select * into v_source from seneve._incident_sources()
      where (source,source_id,revision)=(p_source,p_source_id,p_revision);
    if not found then
      raise exception 'Le signalement a changé. Actualise le registre avant de réessayer.' using errcode='40001';
    end if;
    insert into seneve.incident_suivis(source,source_id,revision,categorie,etat_source,date_source,gravite)
      values(p_source,p_source_id,p_revision,v_source.categorie,v_source.etat_source,v_source.date_source,v_source.gravite)
      returning * into v_suivi;
  end if;
  if (p_action='resoudre' and v_suivi.etat='resolu') or (p_action='rouvrir' and v_suivi.etat<>'resolu')
      or (p_action='prendre_en_charge' and v_suivi.etat='resolu') then
    raise exception 'Cette action ne correspond plus à l’état du signalement.' using errcode='40001';
  end if;
  v_etat := case p_action when 'resoudre' then 'resolu' when 'rouvrir' then 'ouvert'
    when 'prendre_en_charge' then 'en_cours' else v_suivi.etat end;
  update seneve.incident_suivis set etat=v_etat,
    note_resolution=case when p_action='resoudre' then v_texte when p_action='rouvrir' then null else note_resolution end,
    modifie_le=clock_timestamp() where incident_id=v_suivi.incident_id;
  insert into seneve.incident_actions(operation_id,incident_id,auteur,action,texte)
    values(p_operation_id,v_suivi.incident_id,v_uid,p_action,v_texte);
  insert into seneve.audit_events(acteur,action,objet,resultat,details)
    values('administration','incident_' || p_action,'incident:' || v_suivi.incident_id,'enregistree',
      jsonb_build_object('auth_user_id',v_uid,'operation_id',p_operation_id,'etat',v_etat));
  return jsonb_build_object('resultat','enregistree','etat',v_etat);
end $f$;
revoke all on function seneve.staff_update_incident(text,uuid,text,timestamptz,text,text,uuid) from public,anon;
grant execute on function seneve.staff_update_incident(text,uuid,text,timestamptz,text,text,uuid) to authenticated;

