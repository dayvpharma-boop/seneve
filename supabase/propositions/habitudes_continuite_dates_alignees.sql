-- Habitudes & Défis — choix B : abonnement Continuité aligné sur le mois HD qu'il ouvre
-- Décision Dr Justin Tshims du 26/10/2026, 19h58 (« B ») : un paiement = un mois complet.
-- L'abonnement acheté pendant un mois commence et finit avec le mois HD suivant ; les contenus Continuité
-- commencent le même jour (parcours programmé si ce jour est dans le futur).
-- Sans inscription HD (ou si l'ouverture HD échoue), Continuité fonctionne comme avant.
-- Appliquée sur seneve-test uniquement. Retour arrière : restaurer les définitions sauvegardées sous le motif
-- 'avant habitudes_continuite_dates_alignees' (_ouvrir_acces, _ouvrir_mois_habitudes, _hd_demarrer_cycle).
-- Le texte exact appliqué est celui de la migration habitudes_continuite_dates_alignees sur seneve-test ;
-- il est reproduit ci-dessous.

insert into seneve_private.sauvegardes_definitions (objet, definition, motif)
select p.oid::regprocedure::text, pg_get_functiondef(p.oid), 'avant habitudes_continuite_dates_alignees'
  from pg_proc p
 where p.oid in ('seneve._ouvrir_acces(uuid,uuid)'::regprocedure,
                 'seneve._ouvrir_mois_habitudes(uuid,uuid)'::regprocedure,
                 'seneve._hd_demarrer_cycle(uuid,uuid,uuid)'::regprocedure);

do $$
declare d text; r record; f text;
begin
  foreach f in array array['seneve._ouvrir_mois_habitudes(uuid,uuid)','seneve._hd_demarrer_cycle(uuid,uuid,uuid)','seneve._ouvrir_acces(uuid,uuid)'] loop
    d := pg_get_functiondef(f::regprocedure);
    for r in select * from (values
      ('seneve._ouvrir_mois_habitudes(uuid,uuid)',
       '    values(e.enrollment_id,p_participant_id,v_mois,d.entitlement_id,v_debut,v_fin);',
       '    values(e.enrollment_id,p_participant_id,v_mois,d.entitlement_id,v_debut,v_fin);'||chr(10)||
       '    -- Abonnement aligné sur le mois HD (choix B).'||chr(10)||
       '    update seneve.entitlements set debut=v_debut, fin=v_fin where entitlement_id=d.entitlement_id;'),
      ('seneve._ouvrir_mois_habitudes(uuid,uuid)',
       '    values (d.entitlement_id, p_participant_id, e.enrollment_id, v_debut);',
       '    values (d.entitlement_id, p_participant_id, e.enrollment_id, v_debut);'||chr(10)||
       '    update seneve.entitlements set debut=v_debut, fin=v_debut + interval ''720 hours'' where entitlement_id=d.entitlement_id;'),
      ('seneve._hd_demarrer_cycle(uuid,uuid,uuid)',
       '         (select coalesce(max(cycle),1)+1 from seneve.hd_access_periods where participant_id=p_participant_id));',
       '         (select coalesce(max(cycle),1)+1 from seneve.hd_access_periods where participant_id=p_participant_id));'||chr(10)||
       '  update seneve.entitlements set debut=v_debut, fin=v_fin where entitlement_id=p_entitlement_id;'),
      ('seneve._ouvrir_acces(uuid,uuid)',
       'v_n integer; v_prog_id text; v_hd jsonb;',
       'v_n integer; v_prog_id text; v_hd jsonb; v_hd_jour date; v_enr2 uuid; v_plan2 uuid;'),
      ('seneve._ouvrir_acces(uuid,uuid)',
       '      v_hd := seneve._ouvrir_mois_habitudes(p_participant_id, v_ent);',
       '      v_hd := seneve._ouvrir_mois_habitudes(p_participant_id, v_ent);'||chr(10)||
       '      v_enr2 := v_enr; v_plan2 := v_plan;'||chr(10)||
       '      -- Choix B : les contenus Continuité commencent le jour où commence le mois HD.'||chr(10)||
       '      if coalesce((v_hd->>''ouvert'')::boolean, false) or v_hd->>''nouveau_cycle'' = ''planifie'' then'||chr(10)||
       '        v_hd_jour := (coalesce(v_hd->>''debut'', v_hd->>''debut_prevu'')::timestamptz at time zone'||chr(10)||
       '                      (select coalesce(nullif(preferences#>>''{rappels,fuseau}'',''''), nullif(fuseau,''''), ''Africa/Kinshasa'')'||chr(10)||
       '                         from seneve.participants where participant_id = p_participant_id))::date;'||chr(10)||
       '        if v_enr2 is not null and v_hd_jour > v_auj then'||chr(10)||
       '          delete from seneve.enrollments where enrollment_id = v_enr2;'||chr(10)||
       '          insert into seneve.parcours_planifies (participant_id, programme_id, entitlement_id, date_debut)'||chr(10)||
       '          values (p_participant_id, v_prog_id, v_ent, v_hd_jour)'||chr(10)||
       '          on conflict (entitlement_id) do nothing returning planifie_id into v_plan2;'||chr(10)||
       '          v_enr2 := null;'||chr(10)||
       '        elsif v_plan2 is not null then'||chr(10)||
       '          update seneve.parcours_planifies set date_debut = greatest(date_debut, v_hd_jour), modifie_le = now()'||chr(10)||
       '           where planifie_id = v_plan2;'||chr(10)||
       '        end if;'||chr(10)||
       '      end if;'||chr(10)||
       '      v_enr := v_enr2; v_plan := v_plan2;')
    ) t(fn, ancien, nouveau) where fn=f loop
      if (length(d)-length(replace(d,r.ancien,'')))/length(r.ancien)<>1 then raise exception '% : motif introuvable : %', f, r.ancien; end if;
      d := replace(d, r.ancien, r.nouveau);
    end loop;
    execute d;
  end loop;
end $$;
