"""Génère une recette concurrente à exécuter exclusivement sur seneve-test."""
from pathlib import Path
import tempfile
import uuid
repo_root=Path(__file__).resolve().parent.parent
out=Path(tempfile.mkdtemp(prefix='seneve-hd-gratuit-'))
s=(repo_root/'supabase/tests/habitudes_ouvrir_gratuite.sql').read_text()
s=s[:s.index('set local role service_role;')]
fields='ua ub pa pb ea eb c1 c2 c3 c4 a1 a2 a3 a4 event1 event2 event3 event4 event5'.split()
d={k:str(uuid.uuid4()) for k in fields};d['programme']='HD_RECETTE_'+uuid.uuid4().hex
start=s.index('create temporary table hd_integration_ids');end=s.index('insert into auth.users')
s=s[:start]+"create temporary table hd_integration_ids as select "+','.join("'%s'::uuid %s"%(d[k],k)for k in fields)+",'%s'::text programme;\n"%d['programme']+s[end:]
s=s.replace('-- Tout est annulé par rollback ; aucun contenu approuvé ni compte réel conservé.','-- Fixtures validées pour deux sessions ; exécuter cleanup.sql même en cas d’échec.')
s+="update seneve.offers set type_offre='habitudes_defis_gratuit',prix=0,duree_acces_jours=30,chariow_product_id=null,lien_achat=null where programme_id='%s';\ncommit;\n"%d['programme']
(out/'setup.sql').write_text(s)
for n in (1,2):
 q="begin;set local role service_role;create temporary table hd_call as select clock_timestamp() started,pg_backend_pid() pid;\n"
 q+="create temporary table hd_result as select seneve.hd_open_free_period('%s'::uuid,'%s_FREE') result;\n"%(d['ea'],d['programme'])
 if n==1:q+='select pg_sleep(4);\n'
 q+='select result,started,clock_timestamp() finished,pid from hd_result cross join hd_call;commit;\n'
 (out/('%s.sql'%n)).write_text(q)
p="('%s'::uuid,'%s'::uuid)"%(d['pa'],d['pb']);e="('%s'::uuid,'%s'::uuid)"%(d['ea'],d['eb']);pr="'%s'"%d['programme']
(out/'check.sql').write_text(f'''do $$begin
 if(select count(*)from seneve.entitlements where participant_id in {p})<>1 then raise exception 'Nombre de droits incorrect';end if;
 if(select count(*)from seneve.hd_access_periods where enrollment_id in {e})<>1 then raise exception 'Nombre de périodes incorrect';end if;
 if exists(select 1 from seneve.entitlements where participant_id in {p} and(fin-debut<>interval '720 hours'or origine<>'gratuit'or payment_event_id is not null))then raise exception 'Durée ou origine incorrecte';end if;
end$$;
select count(*) droits_fictifs from seneve.entitlements where participant_id in {p};
''')
(out/'cleanup.sql').write_text(f'''begin;
delete from seneve.hd_access_periods where enrollment_id in {e};
delete from seneve.entitlements where participant_id in {p};
delete from seneve.offers where programme_id={pr};
delete from seneve.enrollments where enrollment_id in {e};
delete from seneve.hd_programme_links where programme_id={pr};
delete from seneve.activities where content_id in(select content_id from seneve.contents where programme_id={pr});
delete from seneve.contents where programme_id={pr};
delete from seneve.programme_versions where programme_id={pr};
delete from seneve.programmes where programme_id={pr};
delete from seneve.participants where participant_id in {p};
delete from auth.users where id in ('{d['ua']}'::uuid,'{d['ub']}'::uuid);
commit;
''')
print(out)
