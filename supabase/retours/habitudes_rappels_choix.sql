-- Retour arrière du choix des rappels d'habitudes. Refusé si un participant a déjà coupé des habitudes.
begin;
do $$declare d text;nouveau text;begin
 if exists(select 1 from seneve.hd_delivery_preferences where habitudes_coupees<>'{}')then
  raise exception 'Retour refusé : des choix de rappels doivent être préservés';
 end if;
 d:=pg_get_functiondef('seneve_private.hd_expected_push_slots(uuid,date)'::regprocedure);
 nouveau:='count(*)over(partition by r.habit_key)n from rdv r where not(r.habit_key=any(cfg.habitudes_coupees)))';
 if strpos(d,nouveau)=0 then raise exception 'Planification inattendue';end if;
 execute replace(d,nouveau,'count(*)over(partition by r.habit_key)n from rdv r)');
end$$;
drop function seneve.hd_rappels_regler(boolean,text[]);
drop function seneve.hd_rappels_etat();
drop function seneve_private.hd_rappels_regler(boolean,text[]);
drop function seneve_private.hd_rappels_etat();
drop function seneve_private.hd_rappels_contexte();
alter table seneve.hd_delivery_preferences drop column habitudes_coupees;
-- La suppression en cascade est conservée : elle corrige le blocage de la suppression de compte.
commit;
