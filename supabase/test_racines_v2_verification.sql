-- Vérification transactionnelle : tous les résultats créés ici sont annulés.
begin;
do $$
declare r jsonb; version_no int; n int;
begin
 r := seneve.submit_test_result('fr',array_fill(3,array[21]),'verification_v2');
 select v.version into version_no from seneve.test_results t join seneve.test_versions v using(test_version_id) where t.result_id=(r->>'result_id')::uuid;
 if version_no<>1 then raise exception 'Ancienne page enregistrée hors V1'; end if;
 r := seneve.submit_test_result_versioned('fr',array_fill(3,array[21]),2,'verification_v2');
 select v.version into version_no from seneve.test_results t join seneve.test_versions v using(test_version_id) where t.result_id=(r->>'result_id')::uuid;
 if version_no<>2 or r->'totaux'<>'[9,9,9,9,9,9,9]'::jsonb or r->'choix'<>'[1,2,3,4,5,6,7]'::jsonb then raise exception 'Égalité ou version incorrecte'; end if;
 r := seneve.submit_test_result_versioned('en',array_fill(5,array[21]),1,'verification_v2');
 if r->'totaux'<>'[15,15,15,15,15,15,15]'::jsonb then raise exception 'Totaux EN incorrects'; end if;
 r := seneve.submit_test_result_versioned('fr',array[5,5,5,3,3,3,1,2,1,4,4,4,5,4,5,2,2,2,3,3,3],2,'verification_v2');
 if r->'totaux'<>'[15,9,4,12,14,6,9]'::jsonb or (r->>'racine_retenue')::int<>3 then raise exception 'Minimum unique incorrect'; end if;
 begin
  perform seneve.submit_test_result_versioned('fr',array_fill(3,array[20]),2,null);
  raise exception 'Réponses incomplètes acceptées';
 exception when invalid_parameter_value then null; end;
 begin
  perform seneve.submit_test_result_versioned('fr',array_fill(6,array[21]),2,null);
  raise exception 'Réponses hors échelle acceptées';
 exception when invalid_parameter_value then null; end;
 begin
  perform seneve.submit_test_result_versioned('fr',array_fill(3,array[21]),999,null);
  raise exception 'Version absente acceptée';
 exception when raise_exception then
  if sqlerrm='Version absente acceptée' then raise; end if;
 when no_data_found then null;
 end;
end $$;
set local role anon;
select seneve.submit_test_result_versioned('fr',array_fill(3,array[21]),2,null)->'totaux' as totaux_anonymes;
reset role;
rollback;
