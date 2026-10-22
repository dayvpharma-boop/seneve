-- Cas réels sur données fictives ; le fichier entier est annulé à la fin.
begin;
do $test$
declare
  uid uuid; job uuid; futur uuid; retard uuid; comm uuid; op uuid := gen_random_uuid();
  suivi uuid; v_revision text; nouvelle text; stamp timestamptz; r jsonb; v jsonb; avant text;
  cle text := 'verification_incidents_' || gen_random_uuid()::text;
begin
  select auth_user_id into uid from seneve.staff_roles where role='administrateur' limit 1;
  if uid is null then raise exception 'Administrateur absent pour la vérification'; end if;
  perform set_config('request.jwt.claim.sub','',true);
  begin perform seneve.staff_list_incidents(); raise exception 'Session absente acceptée';
    exception when insufficient_privilege then null; end;
  perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
  begin perform seneve.staff_list_incidents(); raise exception 'Participant autorisé en lecture';
    exception when insufficient_privilege then null; end;
  begin perform seneve.staff_update_incident('traitement',gen_random_uuid(),repeat('a',32),null,'note','Essai',op);
    raise exception 'Participant autorisé en écriture'; exception when insufficient_privilege then null; end;
  if has_function_privilege('anon','seneve.staff_list_incidents(integer)','EXECUTE')
    or has_function_privilege('authenticated','seneve._incident_sources()','EXECUTE')
    or has_table_privilege('authenticated','seneve.incident_suivis','UPDATE')
    or has_table_privilege('authenticated','seneve.incident_actions','INSERT') then
    raise exception 'Permissions trop larges';
  end if;
  perform set_config('request.jwt.claim.sub',uid::text,true);
  insert into seneve.jobs(type,cle_logique,etat,echeance,charge,erreur)
    values('verification',cle,'erreur',now(),'{"donnee_privee":"NE_PAS_EXPOSER"}','NE_PAS_EXPOSER')
    returning job_id into job;
  insert into seneve.jobs(type,cle_logique,etat,echeance)
    values('verification',cle||'_futur','en_attente',now()+interval '2 days') returning job_id into futur;
  insert into seneve.jobs(type,cle_logique,etat,echeance)
    values('verification',cle||'_retard','en_attente',now()-interval '2 days') returning job_id into retard;
  insert into seneve.communications(cle_idempotence,canal,etat,motif,erreur)
    values(cle,'email','erreur','NE_PAS_EXPOSER','NE_PAS_EXPOSER') returning communication_id into comm;
  r:=seneve.staff_list_incidents();
  if position('NE_PAS_EXPOSER' in r::text)>0 then raise exception 'Donnée privée exposée'; end if;
  if not exists(select 1 from jsonb_array_elements(r->'incidents') e where e->>'source_id'=retard::text)
    or exists(select 1 from jsonb_array_elements(r->'incidents') e where e->>'source_id'=futur::text) then
    raise exception 'Détection des traitements retardés incorrecte';
  end if;
  select e into v from jsonb_array_elements(r->'incidents') e where e->>'source_id'=job::text;
  v_revision:=v->>'revision';
  if v_revision is null or v->>'etat'<>'ouvert' then raise exception 'Incident absent'; end if;
  perform set_config('TimeZone','Africa/Kinshasa',true);
  if (select s.revision from seneve._incident_sources() s where s.source_id=job)<>v_revision then
    raise exception 'Révision dépendante du fuseau horaire';
  end if;
  begin perform seneve.staff_update_incident('traitement',job,v_revision,null,'resoudre',' ',gen_random_uuid());
    raise exception 'Résolution sans note acceptée'; exception when invalid_parameter_value then null; end;
  begin perform seneve.staff_update_incident('traitement',job,v_revision,null,'note',repeat('x',4001),gen_random_uuid());
    raise exception 'Note trop longue acceptée'; exception when invalid_parameter_value then null; end;
  perform seneve.staff_update_incident('traitement',job,v_revision,null,'note','Vérification technique fictive.',op);
  perform seneve.staff_update_incident('traitement',job,v_revision,null,'note','Vérification technique fictive.',op);
  select incident_id,modifie_le into suivi,stamp from seneve.incident_suivis where source_id=job and incident_suivis.revision=v_revision;
  if (select count(*) from seneve.incident_actions where incident_id=suivi)<>1 then raise exception 'Doublon de note'; end if;
  begin perform seneve.staff_update_incident('traitement',job,v_revision,null,'note','Autre texte',op);
    raise exception 'Identifiant réutilisé accepté'; exception when invalid_parameter_value then null; end;
  begin perform seneve.staff_update_incident('traitement',job,v_revision,null,'resoudre','Résolution fictive.',gen_random_uuid());
    raise exception 'Modification périmée acceptée'; exception when serialization_failure then null; end;
  perform seneve.staff_update_incident('traitement',job,v_revision,stamp,'prendre_en_charge','',gen_random_uuid());
  select modifie_le into stamp from seneve.incident_suivis where incident_id=suivi;
  perform seneve.staff_update_incident('traitement',job,v_revision,stamp,'resoudre','Résolution fictive vérifiée.',gen_random_uuid());
  if (select etat from seneve.incident_suivis where incident_id=suivi)<>'resolu'
    or (select etat from seneve.jobs where job_id=job)<>'erreur' then raise exception 'Clôture incorrecte'; end if;
  select modifie_le into stamp from seneve.incident_suivis where incident_id=suivi;
  perform seneve.staff_update_incident('traitement',job,v_revision,stamp,'rouvrir','',gen_random_uuid());
  if (select etat from seneve.incident_suivis where incident_id=suivi)<>'ouvert' then raise exception 'Réouverture incorrecte'; end if;
  select modifie_le into stamp from seneve.incident_suivis where incident_id=suivi;
  perform seneve.staff_update_incident('traitement',job,v_revision,stamp,'resoudre','Ancienne occurrence clôturée.',gen_random_uuid());
  update seneve.jobs set tentatives=tentatives+1,reserve_le=clock_timestamp() where job_id=job;
  r:=seneve.staff_list_incidents();
  select e->>'revision' into nouvelle from jsonb_array_elements(r->'incidents') e where e->>'source_id'=job::text and e->>'etat'='ouvert';
  if nouvelle is null or nouvelle=v_revision or not exists(select 1 from jsonb_array_elements(r->'incidents') e
    where e->>'source_id'=job::text and e->>'revision'=v_revision and e->>'etat'='resolu') then
    raise exception 'Nouvel échec masqué ou historique perdu';
  end if;
  select e into v from jsonb_array_elements(r->'incidents') e where e->>'source_id'=comm::text;
  perform seneve.staff_update_incident('communication',comm,v->>'revision',null,'resoudre','Passerelle vérifiée sur données fictives.',gen_random_uuid());
  if (select etat from seneve.communications where communication_id=comm)<>'erreur' then raise exception 'Envoi modifié'; end if;
  r:=seneve.staff_list_incidents(1);
  if jsonb_array_length(r->'incidents')<>1 or (r->>'total')::int<4 then raise exception 'Limite du registre incorrecte'; end if;
end
$test$;
rollback;
select jsonb_build_object('verification','reussie','donnees_de_test_conservees',false) as resultat;

