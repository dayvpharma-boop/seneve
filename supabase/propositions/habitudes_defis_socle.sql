-- Habitudes & Défis : fondation de test, aucune activation ni publication.
create table seneve.hd_modules (
 module_id text not null,
 version integer not null check (version > 0),
 langue text not null check (langue in ('fr','en')),
 statut text not null default 'brouillon' check (statut = 'brouillon'),
 nombre_mois integer not null default 6 check (nombre_mois = 6),
 mois_gratuits integer not null default 1 check (mois_gratuits = 1),
 regle_mois text check (regle_mois in ('30_jours','calendaire')),
 primary key (module_id,version,langue)
);
create table seneve.hd_habit_templates (
 module_id text not null, version integer not null, langue text not null,
 habit_key text not null, libelle text not null,
 heure_proposee time, jours_iso smallint[] not null default array[1,2,3,4,5,6,7]::smallint[],
 duree_min integer check (duree_min > 0), duree_max integer,
 primary key(module_id,version,langue,habit_key),
 foreign key(module_id,version,langue) references seneve.hd_modules,
 check (duree_max is null or (duree_min is not null and duree_max >= duree_min)),
 check (cardinality(jours_iso) between 1 and 7 and jours_iso <@ array[1,2,3,4,5,6,7]::smallint[])
);
create table seneve.hd_habit_schedules (
 schedule_id uuid primary key default gen_random_uuid(),
 participant_id uuid not null references seneve.participants(participant_id),
 module_id text not null, version integer not null, langue text not null, habit_key text not null,
 heure_locale time not null, fuseau text not null default 'Africa/Kinshasa',
 jours_iso smallint[] not null,
 valide_du date not null, valide_au date,
 foreign key(module_id,version,langue,habit_key) references seneve.hd_habit_templates,
 check (valide_au is null or valide_au >= valide_du),
 check (cardinality(jours_iso) between 1 and 7 and jours_iso <@ array[1,2,3,4,5,6,7]::smallint[]),
 unique(participant_id,module_id,version,langue,habit_key,valide_du)
);
-- Plans seulement : cette table ne confère jamais de droit.
-- L'activation future devra vérifier l'inscription, l'offre, le paiement et entitlements.
create table seneve.hd_period_plans (
 participant_id uuid not null references seneve.participants(participant_id),
 module_id text not null, version integer not null, langue text not null,
 mois smallint not null check (mois between 1 and 6),
 debut date not null, fin_exclue date not null,
 primary key(participant_id,module_id,version,langue,mois),
 foreign key(module_id,version,langue) references seneve.hd_modules,
 check (fin_exclue > debut)
);
create index hd_period_plans_module_idx on seneve.hd_period_plans(module_id,version,langue);
alter table seneve.hd_modules enable row level security;
alter table seneve.hd_habit_templates enable row level security;
alter table seneve.hd_habit_schedules enable row level security;
alter table seneve.hd_period_plans enable row level security;
-- Brouillons invisibles et non modifiables depuis le client.
revoke all on seneve.hd_modules,seneve.hd_habit_templates,seneve.hd_habit_schedules,seneve.hd_period_plans from public,anon,authenticated,service_role;
-- Accès futur aux horaires : propriétaire seulement, écriture API à construire.
grant select on seneve.hd_habit_schedules to authenticated;
create policy hd_schedule_owner_read on seneve.hd_habit_schedules for select to authenticated
 using (participant_id in (select participant_id from seneve.participants where auth_user_id = (select auth.uid())));
insert into seneve.hd_modules(module_id,version,langue) values ('HABITUDES_DEFIS',1,'fr');
insert into seneve.hd_habit_templates(module_id,version,langue,habit_key,libelle,heure_proposee,jours_iso,duree_min,duree_max)
select 'HABITUDES_DEFIS',1,'fr', k,l,h::time,j::smallint[],d,x from (values
 ('reveil','Réveil','05:45','{1,2,3,4,5,6,7}',null::integer,null::integer),
 ('gratitude_matin','Gratitude du matin','05:50','{1,2,3,4,5,6,7}',null,null),
 ('priere_matin','Prière du matin','06:00','{1,2,3,4,5,6,7}',null,null),
 ('bible_matin','Bible du matin','06:20','{1,2,3,4,5,6,7}',null,null),
 ('exercice','Exercice adapté','06:45','{1,2,3,4,5,6,7}',10,15),
 ('lecture_pro','Lecture professionnelle','12:30','{1,2,3,4,5,6,7}',30,30),
 ('priere_midi','Prière de midi','13:10','{1,2,3,4,5,6,7}',null,null),
 ('predication','Écoute d’une prédication','18:00','{1,2,3,4,5,6,7}',30,30),
 ('lecture_personnelle','Développement personnel','20:00','{1,2,3,4,5,6,7}',30,30),
 ('bible_soir','Bible du soir','20:35','{1,2,3,4,5,6,7}',null,null),
 ('gratitude_soir','Gratitude du soir','21:00','{1,2,3,4,5,6,7}',null,null),
 ('priere_soir','Prière du soir','21:10','{1,2,3,4,5,6,7}',null,null),
 ('coucher','Coucher','22:00','{1,2,3,4,5,6,7}',null,null),
 ('culte_semaine','Culte en semaine','18:30','{3,5}',null,null),
 ('culte_dimanche','Culte du dimanche','09:00','{7}',null,null)
) v(k,l,h,j,d,x);
