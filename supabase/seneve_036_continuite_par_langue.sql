-- SÉNEVÉ 036 — Sénevé Continuité : rotation des mois selon la langue de l'offre (préparation de l'anglais)
-- Décision de Dr Justin du 17/10/2026 : réaliser Sénevé Continuité en anglais (contenus en relecture).
-- Avant : seule l'offre CONTINUITE_MENSUEL_FR ouvrait la rotation Mois 1 → 2 → 3.
-- Après : toute offre CONTINUITE_MENSUEL_<LANGUE> l'ouvre, avec les programmes de sa langue :
--   fr → ABONNE_CONTINUITE_FR_V1, ABONNE_CONTINUITE_M2_FR_V1, ABONNE_CONTINUITE_M3_FR_V1 (inchangé)
--   en → ABONNE_CONTINUITE_EN_V1, ABONNE_CONTINUITE_M2_EN_V1, ABONNE_CONTINUITE_M3_EN_V1
-- Le compte des mois se fait par offre (donc par langue). Un mois non publié retombe sur le programme de l'offre.
-- Sans offre anglaise active, rien ne change pour les participants.
do $$
declare d text; n int; a text; b text;
begin
  d := pg_get_functiondef('seneve._ouvrir_acces(uuid,uuid)'::regprocedure);
  if position('CONTINUITE_MENSUEL_%' in d) > 0 then return; end if;

  a := 'v_offre.offre_id = ''CONTINUITE_MENSUEL_FR''';
  n := (length(d) - length(replace(d, a, ''))) / length(a);
  if n <> 2 then raise exception 'offre FR : % occurrence(s)', n; end if;
  d := replace(d, a, 'v_offre.offre_id like ''CONTINUITE_MENSUEL_%''');

  a := 'v_prog_id := case (v_n - 1) % 3 when 1 then ''ABONNE_CONTINUITE_M2_FR_V1'' when 2 then ''ABONNE_CONTINUITE_M3_FR_V1'' else ''ABONNE_CONTINUITE_FR_V1'' end;';
  n := (length(d) - length(replace(d, a, ''))) / length(a);
  if n <> 1 then raise exception 'rotation : % occurrence(s)', n; end if;
  b := 'v_prog_id := case (v_n - 1) % 3 when 1 then ''ABONNE_CONTINUITE_M2_'' when 2 then ''ABONNE_CONTINUITE_M3_'' else ''ABONNE_CONTINUITE_'' end
                 || upper(coalesce(nullif(v_offre.langue, ''''), ''fr'')) || ''_V1'';';
  d := replace(d, a, b);
  execute d;
end $$;
