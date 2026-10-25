begin;
do $$
begin
 if (select count(*) from seneve.hd_habit_templates) <> 15 then raise exception '15 modèles attendus'; end if;
 if (select count(*) from seneve.hd_habit_templates where habit_key like 'priere_%') <> 3 then raise exception '3 prières attendues'; end if;
 if exists(select 1 from seneve.hd_modules where statut <> 'brouillon' or regle_mois is not null) then raise exception 'Activation prématurée'; end if;
 if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='seneve' and c.relname like 'hd_%' and c.relkind in ('r','p') and not c.relrowsecurity) then raise exception 'RLS manquante'; end if;
 if has_table_privilege('authenticated','seneve.hd_habit_schedules','INSERT') or has_table_privilege('authenticated','seneve.hd_period_plans','INSERT') or has_table_privilege('anon','seneve.hd_modules','SELECT') or has_table_privilege('authenticated','seneve.hd_modules','SELECT') then raise exception 'Permission excessive'; end if;
 begin
  insert into seneve.hd_modules(module_id,version,langue,nombre_mois) values('TEST_INVALID',1,'fr',7);
  raise exception 'Contrainte durée absente';
 exception when check_violation then null;
 end;
 begin
  insert into seneve.hd_habit_templates(module_id,version,langue,habit_key,libelle,jours_iso) values('HABITUDES_DEFIS',1,'fr','invalid','test',array[8]::smallint[]);
  raise exception 'Contrainte jours absente';
 exception when check_violation then null;
 end;
end $$;
rollback;
