from pathlib import Path
import uuid
import tempfile
output_dir=Path(tempfile.mkdtemp(prefix="seneve-hd-concurrence-"))
repo_root=Path(__file__).resolve().parent.parent
s=(repo_root/'supabase/tests/habitudes_precontrole_rappels.sql').read_text()
fields='ua ub pa pb ea eb c1 c2 c3 c4 a1 a2 a3 a4 event1 event2 event3 event4 event5'.split()
d={k:str(uuid.uuid4())for k in fields}; d['programme']='HD_RECETTE_'+uuid.uuid4().hex
start=s.index('create temporary table hd_integration_ids')
end=s.index('insert into auth.users')
s=s[:start]+"create temporary table hd_integration_ids as select "+','.join("'%s'::uuid %s"%(d[k],k)for k in fields)+",'%s'::text programme;\n"%d['programme']+s[end:]
s=s[:s.index('do $$declare i record;begin select * into i from hd_integration_ids;')]
s+='''insert into seneve.hd_delivery_preferences(participant_id,actif,fuseau,canaux,max_retard_minutes)select pa,true,'Africa/Kinshasa',array['push'],10 from hd_integration_ids;
insert into seneve.push_appareils(participant_id,endpoint,p256dh,auth)select pa,'https://example.invalid/'||pa::text,repeat('x',30),repeat('x',15)from hd_integration_ids;
insert into seneve.consents(participant_id,canal,finalite,etat,version_texte,preuve)select pa,'push','rappels','accorde','RECETTE','FICTIVE'from hd_integration_ids;
commit;
'''
(output_dir/'setup.sql').write_text(s)
for n in (1,2):
 q="begin;set local role service_role;select seneve.hd_reserve_reminder(reminder_id,'%s'::uuid) result from seneve.hd_activity_reminders where enrollment_id='%s'::uuid and activity_id='%s'::uuid and canal='push';"%(uuid.uuid4(),d['ea'],d['a1'])
 if n==1:
  q=q.replace(' result from seneve.hd_activity_reminders',' result into temporary table hd_concurrency_result from seneve.hd_activity_reminders')
  q+='select pg_sleep(3);select result from hd_concurrency_result;'
 q+='commit;'
 (output_dir/('%s.sql'%n)).write_text(q)
# Nettoyage limité à des UUID générés pour cette recette.
p="('%s'::uuid,'%s'::uuid)"%(d['pa'],d['pb']);e="('%s'::uuid,'%s'::uuid)"%(d['ea'],d['eb']);pr="'%s'"%d['programme']
cleanup=f'''begin;
delete from seneve.hd_reminder_reservations where reminder_id in(select reminder_id from seneve.hd_activity_reminders where enrollment_id in {e});
delete from seneve.hd_activity_reminders where enrollment_id in {e};
delete from seneve.hd_delivery_preferences where participant_id in {p};
delete from seneve.push_appareils where participant_id in {p};
delete from seneve.consents where participant_id in {p};
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
'''
(output_dir/'cleanup.sql').write_text(cleanup)

print(output_dir)
