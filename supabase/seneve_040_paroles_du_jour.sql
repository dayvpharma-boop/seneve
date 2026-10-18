-- Parole du jour : citation exacte du livre, une par jour de parcours, validée par Dr Justin.
-- Séparée des contenus publiés (aucune version publiée n'est modifiée). Lecture publique des
-- seules paroles publiées : ce sont des extraits du livre destinés à être partagés.
create table seneve.paroles (
  parole_id uuid primary key default gen_random_uuid(),
  programme_id text not null references seneve.programmes(programme_id),
  version integer not null,
  langue text not null check (langue in ('fr', 'en')),
  jour integer not null check (jour > 0),
  texte text not null check (char_length(btrim(texte)) between 5 and 400),
  reference_livre text not null,
  etat text not null default 'brouillon' check (etat in ('brouillon', 'publiee', 'archivee')),
  valide_par text,
  date_validation timestamptz,
  cree_le timestamptz not null default now(),
  unique (programme_id, version, langue, jour),
  foreign key (programme_id, version) references seneve.programme_versions(programme_id, version),
  check (etat <> 'publiee' or (valide_par is not null and date_validation is not null))
);
alter table seneve.paroles enable row level security;
create policy paroles_publiees on seneve.paroles for select to anon, authenticated using (etat = 'publiee');
revoke all on seneve.paroles from public, anon, authenticated;
grant select on seneve.paroles to anon, authenticated;
grant all on seneve.paroles to service_role;

-- Découverte 7 jours (FR, version 1) : 7 citations exactes, validées par Dr Justin le 18/10/2026.
insert into seneve.paroles (programme_id, version, langue, jour, texte, reference_livre, etat, valide_par, date_validation) values
('PROSPECT_LIVRE_7J_FR_V1', 1, 'fr', 1, 'Tant que Dieu n''est pas premier, tout le reste est en désordre — même ce qui semble réussir.', 'Chapitre 1 — page imprimée 9', 'publiee', 'Dr Justin Tshims (« Je valide les 7 citations », 18/10/2026, confirmé après relecture)', now()),
('PROSPECT_LIVRE_7J_FR_V1', 1, 'fr', 2, 'J''étais poussé par l''urgence — et non conduit par l''Esprit.', 'Chapitre 1 — page imprimée 15', 'publiee', 'Dr Justin Tshims (« Je valide les 7 citations », 18/10/2026, confirmé après relecture)', now()),
('PROSPECT_LIVRE_7J_FR_V1', 1, 'fr', 3, 'Seigneur, je ne Te demande plus d''effacer les conséquences. Apprends-moi à changer les causes.', 'Chapitre 1 — page imprimée 16', 'publiee', 'Dr Justin Tshims (« Je valide les 7 citations », 18/10/2026, confirmé après relecture)', now()),
('PROSPECT_LIVRE_7J_FR_V1', 1, 'fr', 4, 'Car le Royaume n''est pas dans les paroles — il est dans la transformation réelle d''une vie.', 'Chapitre 1 — page imprimée 19', 'publiee', 'Dr Justin Tshims (« Je valide les 7 citations », 18/10/2026, confirmé après relecture)', now()),
('PROSPECT_LIVRE_7J_FR_V1', 1, 'fr', 5, 'Le vrai chrétien ne met pas Dieu dans son agenda — il met son agenda dans les mains de Dieu.', 'Chapitre 1 — page imprimée 22', 'publiee', 'Dr Justin Tshims (« Je valide les 7 citations », 18/10/2026, confirmé après relecture)', now()),
('PROSPECT_LIVRE_7J_FR_V1', 1, 'fr', 6, 'Ce qu''Il te demande, ce n''est pas de courir. C''est de chercher.', 'Chapitre 1 — page imprimée 25', 'publiee', 'Dr Justin Tshims (« Je valide les 7 citations », 18/10/2026, confirmé après relecture)', now()),
('PROSPECT_LIVRE_7J_FR_V1', 1, 'fr', 7, 'Dieu ne cherche pas l''homme parfait. Il cherche l''homme obéissant.', 'Chapitre 1 — page imprimée 34', 'publiee', 'Dr Justin Tshims (« Je valide les 7 citations », 18/10/2026, confirmé après relecture)', now());
