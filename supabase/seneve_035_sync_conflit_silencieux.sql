-- SÉNEVÉ 035 — Synchronisation feuille → base : conflit de compte sans répétition inutile
-- Constat du 17/10/2026 : une même inscription de test (livre EN, déjà « annulée ») produisait une trace
-- « conflit_compte » toutes les 15 minutes (70 en 18 h), parce que le numéro de la feuille est désormais
-- relié à un autre compte que celui qui détient l'inscription. Aucune fusion n'a lieu (comportement voulu).
-- Correction :
--   * si l'inscription et la feuille disent toutes deux « annulée / terminée », rien à faire : réponse « inchangee », pas de trace ;
--   * sinon, le conflit reste refusé, mais n'est tracé qu'une fois par 24 h et par inscription.
-- Ne change aucune donnée existante ; ne fusionne aucun compte.
do $$
declare f text; d text; n int; v_old text; v_new text;
begin
  foreach f in array array['seneve.sync_legacy_enrollment(text,text,text,text,text)', 'seneve.sync_legacy_enrollment_email(text,text,text,text,text)'] loop
    d := pg_get_functiondef(f::regprocedure);
    if position('inchangee_autre_compte' in d) > 0 then continue; end if;
    v_old := '    if v_enr.participant_id <> v_participant then
      insert into seneve.audit_events';
    n := (length(d) - length(replace(d, v_old, ''))) / length(v_old);
    if n <> 1 then raise exception '% : % occurrence(s)', f, n; end if;
    v_new := '    if v_enr.participant_id <> v_participant and v_enr.etat in (''annulee'', ''terminee'') and v_etat in (''annulee'', ''terminee'') then
      return jsonb_build_object(''resultat'', ''inchangee_autre_compte'');
    end if;
    if v_enr.participant_id <> v_participant and exists (
         select 1 from seneve.audit_events a where a.objet = p_inscription_id and a.resultat = ''conflit_compte''
            and a.cree_le > now() - interval ''24 hours'') then
      return jsonb_build_object(''resultat'', ''conflit_compte'');
    end if;
' || v_old;
    execute replace(d, v_old, v_new);
  end loop;
end $$;
