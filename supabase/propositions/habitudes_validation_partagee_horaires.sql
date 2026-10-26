-- TEST : normalisation partagée, aucun accès direct client.
create function seneve_private.hd_normalize_schedule(p_habit_key text,p_creneaux jsonb,p_jours_iso smallint[])
returns jsonb language plpgsql immutable security invoker set search_path='' as $$
declare x jsonb;d jsonb;n int;total int:=0;ids text[]:='{}';vus text[]:='{}';jours smallint[];normalise jsonb:='[]';cle text;
begin
 if p_creneaux is null or jsonb_typeof(p_creneaux)<>'array' or octet_length(p_creneaux::text)>8192 then raise exception 'Configuration invalide'using errcode='22023';end if;
 if jsonb_array_length(p_creneaux)not between 1 and 7 then raise exception 'Créneaux invalides'using errcode='22023';end if;
 for x in select value from jsonb_array_elements(p_creneaux)loop
  if jsonb_typeof(x)<>'object' then raise exception 'Créneau invalide'using errcode='22023';end if;
  if(select count(*)from jsonb_object_keys(x))<>3 or not(x?&array['creneau_id','heure_locale','jours_iso'])or coalesce(x->>'creneau_id','')!~'^[a-z0-9_]{1,32}$'
   or coalesce(x->>'heure_locale','')!~'^([01][0-9]|2[0-3]):[0-5][0-9]$' then raise exception 'Créneau invalide'using errcode='22023';end if;
  if(x->>'creneau_id')=any(ids)then raise exception 'Créneau répété'using errcode='22023';end if;
  ids:=array_append(ids,x->>'creneau_id');
  if jsonb_typeof(x->'jours_iso')is distinct from 'array'then raise exception 'Jours invalides'using errcode='22023';end if;
  if jsonb_array_length(x->'jours_iso')not between 1 and 7 then raise exception 'Jours invalides'using errcode='22023';end if;
  jours:='{}';
  for d in select value from jsonb_array_elements(x->'jours_iso')loop
   if jsonb_typeof(d)<>'number'or d::text!~'^[1-7]$'then raise exception 'Jour invalide'using errcode='22023';end if;
   n:=d::text::int;
   if n=any(jours)then raise exception 'Jour répété'using errcode='22023';end if;
   -- Un repère quotidien garde une occurrence par jour ; les cultes gardent les créneaux distincts.
   cle:=n::text||case when p_habit_key like 'culte_%'then '|'||(x->>'heure_locale')else ''end;
   if cle=any(vus)then raise exception 'Rendez-vous répété'using errcode='22023';end if;
   vus:=array_append(vus,cle);jours:=array_append(jours,n::smallint);total:=total+1;
  end loop;
  select array_agg(v order by v)into jours from unnest(jours)v;
  normalise:=normalise||jsonb_build_array(jsonb_build_object('creneau_id',x->>'creneau_id','heure_locale',x->>'heure_locale','jours_iso',jours));
 end loop;
 if total<>cardinality(p_jours_iso)then raise exception 'Fréquence différente du modèle'using errcode='22023';end if;
 select jsonb_agg(v order by v->>'creneau_id')into normalise from jsonb_array_elements(normalise)v;
 return normalise;
end$$;
revoke all on function seneve_private.hd_normalize_schedule(text,jsonb,smallint[])from public,anon,authenticated;

