-- Retour arrière du compteur de fidélité, refusé dès qu'un compteur réel est conservé.
begin;
do $$begin
 if exists(select 1 from seneve_private.hd_fidelite)then
  raise exception 'Retour refusé : des compteurs doivent être préservés ou effacés explicitement';
 end if;
end$$;
select cron.unschedule('seneve-hd-fidelite-effacement');
drop function seneve.hd_fidelite_lire(uuid);
drop function seneve.hd_fidelite_masquer(uuid,boolean);
drop function seneve.hd_fidelite_declarer(uuid,uuid,boolean);
drop function seneve.hd_fidelite_annuler(uuid);
drop function seneve_private.hd_fidelite_lire(uuid);
drop function seneve_private.hd_fidelite_masquer(uuid,boolean);
drop function seneve_private.hd_fidelite_declarer(uuid,uuid,boolean);
drop function seneve_private.hd_fidelite_annuler(uuid);
drop function seneve_private.hd_fidelite_purger();
drop function seneve_private.hd_fidelite_etat(seneve.enrollments,date);
drop function seneve_private.hd_fidelite_inscription(uuid);
drop table seneve_private.hd_fidelite;
commit;
