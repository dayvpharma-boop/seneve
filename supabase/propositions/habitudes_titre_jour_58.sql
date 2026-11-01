-- Jour 58 des programmes Habitudes & Défis : un titre distinct de celui du jour 28 (« Relire quatre semaines »).
-- Titre validé par Dr Justin Tshims le 01/11/2026 (« je valide »). Seul le titre change ; texte, objectif et question inchangés.
-- Retour : remettre les anciens titres « Relire quatre semaines » et « Look back over four weeks ».
do $$
declare n int;
begin
 update seneve.contents set titre=$t$Relire le mois : sept clés$t$
  where programme_id='HABITUDES_DEFIS_30J_FR_V1' and version=1 and langue='fr' and jour=58 and numero_message=1
   and titre=$t$Relire quatre semaines$t$;
 get diagnostics n=row_count;
 if n<>1 then raise exception 'Jour 58 FR : % ligne(s) modifiée(s) au lieu de 1',n; end if;

 update seneve.contents set titre=$t$Look back on the month: seven keys$t$
  where programme_id='HABITUDES_DEFIS_30J_EN_V1' and version=1 and langue='en' and jour=58 and numero_message=1
   and titre=$t$Look back over four weeks$t$;
 get diagnostics n=row_count;
 if n<>1 then raise exception 'Jour 58 EN : % ligne(s) modifiée(s) au lieu de 1',n; end if;
end$$;
