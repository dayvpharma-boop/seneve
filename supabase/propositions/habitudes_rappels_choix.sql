-- TEST d'abord, après habitudes_push_dispatch_test et habitudes_push_planification_test (branche feat/habitudes-defis-socle).
-- Décision de Dr Justin du 27/10/2026 : rappels de toutes les habitudes par défaut, chacun peut en retirer.
-- Le participant choisit lui-même d'activer les rappels d'habitudes ; l'accord push et l'appareil restent
-- ceux de « Recevoir mes rappels » (rappels_activer). Aucun envoi n'est déclenché ici.
alter table seneve.hd_delivery_preferences add column habitudes_coupees text[] not null default '{}';
-- Suppression du compte : les préférences partent avec la personne (la contrainte d'origine bloquait la suppression).
alter table seneve.hd_delivery_preferences drop constraint hd_delivery_preferences_participant_id_fkey,
 add constraint hd_delivery_preferences_participant_id_fkey foreign key(participant_id)references seneve.participants(participant_id)on delete cascade;

-- Module HD de l'inscription active du titulaire, même ordre que la préparation (programme réel d'abord).
create function seneve_private.hd_rappels_contexte(out pid uuid,out l seneve.hd_programme_links,out z text)
language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid()is null then raise exception 'Compte requis'using errcode='42501';end if;
 pid:=seneve.current_participant_id();
 if pid is null then raise exception 'Compte requis'using errcode='42501';end if;
 select x.* into l from seneve.enrollments e join seneve.hd_programme_links x on x.programme_id=e.programme_id and x.version=e.version and x.langue=e.langue and x.actif
 where e.participant_id=pid and e.etat='active'
 order by(e.programme_id='HABITUDES_DEFIS_30J_FR_V1')desc,e.date_debut desc,e.enrollment_id desc limit 1;
 select coalesce(preferences#>>'{rappels,fuseau}',fuseau)into z from seneve.participants where participant_id=pid;
end$$;

create function seneve_private.hd_rappels_etat()returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare c record;cfg seneve.hd_delivery_preferences%rowtype;pret boolean;
begin
 select * into c from seneve_private.hd_rappels_contexte();
 if (c.l).module_id is null then return jsonb_build_object('inscrit',false);end if;
 select * into cfg from seneve.hd_delivery_preferences where participant_id=c.pid;
 select coalesce(bool_and(x.etat='accorde'and x.preuve is not null and x.version_texte is not null),false)
  and exists(select 1 from seneve.push_appareils a where a.participant_id=c.pid)into pret
 from seneve.consents x where x.participant_id=c.pid and x.canal='push'and x.finalite='rappels'
  and x.decide_le=(select max(d.decide_le)from seneve.consents d where d.participant_id=c.pid and d.canal='push'and d.finalite='rappels');
 return jsonb_build_object('inscrit',true,'push_pret',pret,
  'actif',coalesce(cfg.actif and 'push'=any(cfg.canaux),false),
  'habitudes',(select coalesce(jsonb_agg(jsonb_build_object('habit_key',t.habit_key,'libelle',t.libelle,'recu',not(t.habit_key=any(coalesce(cfg.habitudes_coupees,'{}'))))
   order by t.heure_proposee,t.habit_key),'[]'::jsonb)
   from seneve.hd_habit_templates t where t.module_id=(c.l).module_id and t.version=(c.l).module_version and t.langue=(c.l).langue));
end$$;

-- Activer, désactiver, ou couper certaines habitudes. Par défaut, toutes sont rappelées.
create function seneve_private.hd_rappels_regler(p_actif boolean,p_habitudes_coupees text[])returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare c record;cles text[];coupees text[];
begin
 if p_actif is null or p_habitudes_coupees is null or cardinality(p_habitudes_coupees)>32 then raise exception 'Choix invalide'using errcode='22023';end if;
 select * into c from seneve_private.hd_rappels_contexte();
 if (c.l).module_id is null then raise exception 'Inscription Habitudes & Défis requise'using errcode='42501';end if;
 if c.z is null or not exists(select 1 from pg_catalog.pg_timezone_names where name=c.z)then raise exception 'Fuseau invalide'using errcode='22023';end if;
 select array_agg(t.habit_key)into cles from seneve.hd_habit_templates t where t.module_id=(c.l).module_id and t.version=(c.l).module_version and t.langue=(c.l).langue;
 select coalesce(array_agg(distinct k order by k),'{}')into coupees from unnest(p_habitudes_coupees)k;
 if not coupees<@cles then raise exception 'Habitude inconnue'using errcode='22023';end if;
 if p_actif and not coalesce((seneve_private.hd_rappels_etat()->>'push_pret')::boolean,false)then
  raise exception 'Active d’abord les notifications sur ce téléphone'using errcode='22023';end if;
 insert into seneve.hd_delivery_preferences as p(participant_id,actif,fuseau,canaux,max_retard_minutes,habitudes_coupees)
 values(c.pid,p_actif,c.z,case when p_actif then array['push']else '{}'end,30,coupees)
 on conflict(participant_id)do update set actif=excluded.actif,fuseau=excluded.fuseau,canaux=excluded.canaux,habitudes_coupees=excluded.habitudes_coupees;
 -- Les rappels déjà planifiés d'une habitude coupée ne partent plus : le contrôle final recalcule le créneau attendu.
 return seneve_private.hd_rappels_etat();
end$$;

-- La préparation ignore les habitudes coupées (rangs des cultes recalculés sans elles).
do $$declare d text;old text;begin
 d:=pg_get_functiondef('seneve_private.hd_expected_push_slots(uuid,date)'::regprocedure);
 old:='count(*)over(partition by r.habit_key)n from rdv r)';
 if strpos(d,old)=0 then raise exception 'Planification inattendue';end if;
 execute replace(d,old,'count(*)over(partition by r.habit_key)n from rdv r where not(r.habit_key=any(cfg.habitudes_coupees)))');
end$$;

create function seneve.hd_rappels_etat()returns jsonb language sql stable security invoker set search_path=''
 as $$select seneve_private.hd_rappels_etat()$$;
create function seneve.hd_rappels_regler(p_actif boolean,p_habitudes_coupees text[])returns jsonb language sql volatile security invoker set search_path=''
 as $$select seneve_private.hd_rappels_regler(p_actif,p_habitudes_coupees)$$;
revoke all on function seneve_private.hd_rappels_contexte()from public,anon,authenticated;
revoke all on function seneve_private.hd_rappels_etat(),seneve_private.hd_rappels_regler(boolean,text[]),
 seneve.hd_rappels_etat(),seneve.hd_rappels_regler(boolean,text[])from public,anon;
grant execute on function seneve_private.hd_rappels_etat(),seneve_private.hd_rappels_regler(boolean,text[]),
 seneve.hd_rappels_etat(),seneve.hd_rappels_regler(boolean,text[])to authenticated;
