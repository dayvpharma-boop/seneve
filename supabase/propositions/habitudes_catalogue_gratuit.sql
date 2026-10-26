-- Catalogue de préinscription : lecture authentifiée, sans création de droit.
create function seneve_private.hd_free_catalogue(p_langue text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare pid uuid;z text;offres jsonb:='[]';o record;plan jsonb;x record;slots jsonb;
begin
 if auth.uid()is null then raise exception 'Compte requis'using errcode='42501';end if;
 pid:=seneve.current_participant_id();
 if pid is null then raise exception 'Profil requis'using errcode='42501';end if;
 if p_langue is null or p_langue not in('fr','en')then raise exception 'Langue invalide'using errcode='22023';end if;
 select coalesce(preferences#>>'{rappels,fuseau}',fuseau)into z from seneve.participants where participant_id=pid;
 if z is null or not exists(select 1 from pg_catalog.pg_timezone_names where name=z)then raise exception 'Fuseau invalide'using errcode='22023';end if;
 if exists(select 1 from seneve.hd_access_periods where participant_id=pid and mois=1)then
  return jsonb_build_object('compte_id',auth.uid(),'fuseau',z,'offres','[]'::jsonb,'motif','gratuite_deja_utilisee');
 end if;
 for o in
  select l.programme_id,l.version,l.module_id,l.module_version,l.langue,p.nom,f.offre_id
  from seneve.hd_programme_links l
  join seneve.programme_versions v on v.programme_id=l.programme_id and v.version=l.version and v.etat='publiee'
  join seneve.programmes p on p.programme_id=l.programme_id and p.langue=l.langue and p.duree_jours>=30
  join seneve.hd_modules m on m.module_id=l.module_id and m.version=l.module_version and m.langue=l.langue and m.duree_gratuite_jours=30
  join seneve.offers f on f.programme_id=l.programme_id and f.langue=l.langue and f.actif and f.type_offre='habitudes_defis_gratuit'and f.prix=0 and f.duree_acces_jours=30 and f.chariow_product_id is null and f.lien_achat is null
  where l.actif and l.langue=p_langue
   and not exists(select 1 from seneve.enrollments e where e.participant_id=pid and e.programme_id=l.programme_id)
   and not exists(select 1 from seneve.hd_habit_schedules h where h.participant_id=pid and h.module_id=l.module_id and h.version=l.module_version and h.langue=l.langue)
   and not exists(select 1 from seneve_private.hd_schedule_heads h where h.participant_id=pid and h.module_id=l.module_id and h.version=l.module_version and h.langue=l.langue)
   and exists(select 1 from seneve.hd_habit_templates t where t.module_id=l.module_id and t.version=l.module_version and t.langue=l.langue)
   and not exists(select 1 from seneve.hd_habit_templates t where t.module_id=l.module_id and t.version=l.module_version and t.langue=l.langue and t.heure_proposee is null)
  order by l.programme_id,l.version,f.offre_id
 loop
  plan:='[]';
  for x in select * from seneve.hd_habit_templates t where t.module_id=o.module_id and t.version=o.module_version and t.langue=o.langue order by t.habit_key loop
   slots:=seneve_private.hd_normalize_schedule(x.habit_key,jsonb_build_array(jsonb_build_object('creneau_id','principal','heure_locale',to_char(x.heure_proposee,'HH24:MI'),'jours_iso',x.jours_iso)),x.jours_iso);
   plan:=plan||jsonb_build_array(jsonb_build_object('habit_key',x.habit_key,'libelle',x.libelle,'creneaux',slots));
  end loop;
  offres:=offres||jsonb_build_array(jsonb_build_object('programme_id',o.programme_id,'version',o.version,'langue',o.langue,'nom',o.nom,'offre_id',o.offre_id,'duree_gratuite_jours',30,'planning',plan));
 end loop;
 return jsonb_build_object('compte_id',auth.uid(),'fuseau',z,'offres',offres);
end$$;
create function seneve.hd_free_catalogue(p_langue text)
returns jsonb language sql stable security invoker set search_path='' as $$
 select seneve_private.hd_free_catalogue(p_langue)
$$;
revoke all on function seneve_private.hd_free_catalogue(text),seneve.hd_free_catalogue(text)from public,anon;
grant execute on function seneve_private.hd_free_catalogue(text),seneve.hd_free_catalogue(text)to authenticated;
