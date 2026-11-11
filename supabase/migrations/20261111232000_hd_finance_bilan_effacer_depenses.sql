-- « Effacer tout » dans le bilan de SÉNEVÉ Compte efface aussi la liste de SÉNEVÉ Dépenses (décision de Dr Justin du 11/11/2026).
-- La grande fonction seneve_private.hd_finance_bilan_effacer n'est pas modifiée. Seule la porte d'entrée publique change :
-- elle appelle l'effacement existant, puis, pour la remise à zéro complète (quoi = 'tout', depuis le début), efface les dépenses
-- de la même monnaie. Tout se passe dans la même transaction : si l'effacement existant échoue, aucune dépense n'est effacée.
--
-- Sauvegarde de la porte d'entrée avant modification (pour revenir en arrière) :
--   create or replace function seneve.hd_finance_bilan_effacer(p_enrollment_id uuid, p_currency text, p_depuis date, p_quoi text, p_confirmation text)
--    returns jsonb language sql set search_path to ''
--   as $function$select seneve_private.hd_finance_bilan_effacer(p_enrollment_id,p_currency,p_depuis,p_quoi,p_confirmation)$function$;

create or replace function seneve_private.hd_finance_expenses_reset(p_enrollment_id uuid,p_currency text,p_confirmation text)
returns integer language plpgsql security definer set search_path to '' as $$
declare enrollment uuid;n integer:=0;
begin
 if auth.uid() is null then raise exception 'Compte requis' using errcode='42501';end if;
 if p_currency is null or p_currency !~ '^[A-Z]{3}$' or coalesce(p_confirmation,'')<>'EFFACER' then raise exception 'Effacement invalide' using errcode='22023';end if;
 enrollment:=seneve_private.hd_finance_enrollment(p_enrollment_id);
 if p_enrollment_id is null or enrollment is null then raise exception 'Inscription financière non accessible' using errcode='42501';end if;
 delete from seneve.hd_finance_expenses where enrollment_id=enrollment and currency=p_currency;
 get diagnostics n=row_count;
 return n;
end$$;
revoke all on function seneve_private.hd_finance_expenses_reset(uuid,text,text) from public, anon;
grant execute on function seneve_private.hd_finance_expenses_reset(uuid,text,text) to authenticated;

create or replace function seneve.hd_finance_bilan_effacer(p_enrollment_id uuid, p_currency text, p_depuis date, p_quoi text, p_confirmation text)
returns jsonb language plpgsql set search_path to '' as $$
declare r jsonb;
begin
 r:=seneve_private.hd_finance_bilan_effacer(p_enrollment_id,p_currency,p_depuis,p_quoi,p_confirmation);
 if p_quoi='tout' and p_depuis is null then
  r:=r||jsonb_build_object('depenses',seneve_private.hd_finance_expenses_reset(p_enrollment_id,p_currency,p_confirmation));
 end if;
 return r;
end$$;
