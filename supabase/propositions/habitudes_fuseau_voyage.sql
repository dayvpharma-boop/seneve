-- TEST d'abord. Voyage : garder ses horaires d'habitudes à l'heure du lieu où l'on se trouve (demande de Dr Justin du 27/10/2026).
-- Les horaires gardent les mêmes heures (06:00 reste 06:00) mais suivent le nouveau fuseau, choisi par le participant.
-- Tout passe au même fuseau en une fois (horaires, préférences, rappels) : un écart arrêtait les rappels sans prévenir.
-- Les rappels déjà planifiés à l'ancienne heure ne partent plus (contrôle final) et sont recalculés au passage suivant.
create function seneve_private.hd_changer_fuseau(p_fuseau text)returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare c record;
begin
 select * into c from seneve_private.hd_rappels_contexte();
 if (c.l).module_id is null then raise exception 'Inscription Habitudes & Défis requise'using errcode='42501';end if;
 if p_fuseau is null or length(p_fuseau)>64 or not exists(select 1 from pg_catalog.pg_timezone_names where name=p_fuseau)then
  raise exception 'Fuseau invalide'using errcode='22023';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('hd-fuseau|'||c.pid::text,0));
 update seneve.hd_habit_schedules set fuseau=p_fuseau where participant_id=c.pid and fuseau<>p_fuseau;
 update seneve.participants set preferences=coalesce(preferences,'{}'::jsonb)||jsonb_build_object('rappels',coalesce(preferences->'rappels','{}'::jsonb)||jsonb_build_object('fuseau',p_fuseau)),
  modifie_le=now() where participant_id=c.pid;
 update seneve.hd_delivery_preferences set fuseau=p_fuseau where participant_id=c.pid;
 return seneve_private.hd_rappels_etat();
end$$;

-- L'état des rappels indique aussi le fuseau suivi par les horaires, pour le comparer à celui du téléphone.
do $$declare d text;old text;begin
 d:=pg_get_functiondef('seneve_private.hd_rappels_etat()'::regprocedure);
 old:='return jsonb_build_object(''inscrit'',true,''push_pret'',pret,';
 if strpos(d,old)=0 then raise exception 'État des rappels inattendu';end if;
 execute replace(d,old,'return jsonb_build_object(''inscrit'',true,''push_pret'',pret,''fuseau'',coalesce((select s.fuseau from seneve.hd_habit_schedules s where s.participant_id=c.pid order by s.valide_du desc limit 1),c.z),');
end$$;

create function seneve.hd_changer_fuseau(p_fuseau text)returns jsonb language sql volatile security invoker set search_path=''
 as $$select seneve_private.hd_changer_fuseau(p_fuseau)$$;
revoke all on function seneve_private.hd_changer_fuseau(text),seneve.hd_changer_fuseau(text)from public,anon;
grant execute on function seneve_private.hd_changer_fuseau(text),seneve.hd_changer_fuseau(text)to authenticated;
