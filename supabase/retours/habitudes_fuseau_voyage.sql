-- Retour arrière du changement de fuseau en voyage. Les fuseaux déjà choisis par les participants sont conservés.
begin;
do $$declare d text;nouveau text;begin
 d:=pg_get_functiondef('seneve_private.hd_rappels_etat()'::regprocedure);
 nouveau:='''fuseau'',coalesce((select s.fuseau from seneve.hd_habit_schedules s where s.participant_id=c.pid order by s.valide_du desc limit 1),c.z),';
 if strpos(d,nouveau)=0 then raise exception 'État des rappels inattendu';end if;
 execute replace(d,nouveau,'');
end$$;
drop function seneve.hd_changer_fuseau(text);
drop function seneve_private.hd_changer_fuseau(text);
commit;
