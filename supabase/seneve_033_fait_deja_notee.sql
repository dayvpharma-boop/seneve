-- SÉNEVÉ 033 — FAIT envoyé une deuxième fois le même jour
-- Constat (test réel du 16/10/2026, 21 h 00) : un second « FAIT 3 » (nouveau message WhatsApp)
-- n'altérait pas l'état de l'action, mais ajoutait une seconde ligne dans progress_events
-- et une seconde trace d'audit. Désormais, si l'action est déjà « realisee »,
-- la fonction répond « deja_notee » sans rien écrire.
-- Appliquée le 16/10/2026 ; droits inchangés (service_role uniquement).
do $$
declare d text; n int;
begin
  d := pg_get_functiondef('seneve.whatsapp_fait(text,text,integer)'::regprocedure);
  if position('''deja_notee'', ''prenom'', v_prenom, ''jour'', v_jour, ''programme'', v_nom);
  end if;
  v_client' in d) > 0 then
    return; -- déjà appliquée
  end if;
  n := (length(d) - length(replace(d, '  v_client := md5(', ''))) / length('  v_client := md5(');
  if n <> 1 then raise exception 'occurrences: %', n; end if;
  d := replace(d, '  v_client := md5(', '  if v_avant = ''realisee'' then
    return jsonb_build_object(''resultat'', ''deja_notee'', ''prenom'', v_prenom, ''jour'', v_jour, ''programme'', v_nom);
  end if;
  v_client := md5(');
  execute d;
end $$;
