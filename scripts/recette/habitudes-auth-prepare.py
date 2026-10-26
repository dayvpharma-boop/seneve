"""Préparer deux comptes fictifs TEST et leur nettoyage ; aucun e-mail envoyé.

N'exécute pas de SQL. Nécessite Python avec crypt/Blowfish. Conserver les fichiers
générés dans un dossier temporaire privé, jamais dans git.
Usage : python habitudes-auth-prepare.py /chemin/config-privee.json
La configuration initiale doit contenir apiKey et url du projet TEST.
"""
import crypt
import json
import os
import secrets
import sys
import uuid
from pathlib import Path

p = Path(sys.argv[1])
c = json.loads(p.read_text())
assert c['url'] == 'https://rlojnuaajeubzlwofwhn.supabase.co', 'TEST uniquement'
assert set(c) <= {'url', 'apiKey'}, 'Utiliser une nouvelle configuration sans identifiants existants'
for key in ['ua', 'ub', 'pa', 'pb']:
    c[key] = str(uuid.uuid4())
c['programme'] = 'HD_HTTP_' + uuid.uuid4().hex
c['password'] = secrets.token_urlsafe(40)
h = crypt.crypt(c['password'], crypt.mksalt(crypt.METHOD_BLOWFISH))
assert h.startswith('$2')
q = lambda s: "'" + s.replace("'", "''") + "'"
sql = ['begin;']
for user, participant in [('ua', 'pa'), ('ub', 'pb')]:
    uid, pid = c[user], c[participant]
    email = uid + '@recette.invalid'
    sql.append(f"""insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,confirmation_token,recovery_token,email_change_token_new,email_change,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values('00000000-0000-0000-0000-000000000000',{q(uid)},'authenticated','authenticated',{q(email)},{q(h)},now(),'','','','','{{"provider":"email","providers":["email"]}}','{{"recette":"HD_HTTP_FICTIVE"}}',now(),now());
insert into auth.identities(provider_id,user_id,identity_data,provider,created_at,updated_at)
values({q(uid)},{q(uid)},jsonb_build_object('sub',{q(uid)},'email',{q(email)},'email_verified',true),'email',now(),now());
insert into seneve.participants(participant_id,auth_user_id,prenom,fuseau)values({q(pid)},{q(uid)},'RECETTE_HTTP_FICTIVE','Africa/Kinshasa');""")
pr = q(c['programme'])
sql.append(f"""insert into seneve.programmes(programme_id,nom,type_parcours,langue,duree_jours,messages_par_jour)values({pr},'RECETTE HTTP FICTIVE — à supprimer','recette','fr',45,3);
insert into seneve.programme_versions(programme_id,version,etat,valide_par,date_validation)values({pr},1,'publiee','RECETTE_HTTP_FICTIVE_TEMPORAIRE',now());
insert into seneve.hd_programme_links(programme_id,version,langue,module_id,module_version,actif)values({pr},1,'fr','HABITUDES_DEFIS',1,true);
insert into seneve.offers(offre_id,produit,type_offre,langue,programme_id,prix,duree_acces_jours,actif)values({q(c['programme']+'_FREE')},'RECETTE HTTP FICTIVE','habitudes_defis_gratuit','fr',{pr},0,30,true);
commit;""")
pids = ','.join(q(c[k]) for k in ['pa', 'pb'])
uids = ','.join(q(c[k]) for k in ['ua', 'ub'])
cleanup = f"""-- Supprime uniquement les identifiants générés pour cette recette TEST.
begin;
delete from seneve_private.hd_schedule_heads where participant_id in({pids});
delete from seneve.hd_habit_schedules where participant_id in({pids});
delete from seneve.hd_access_periods where participant_id in({pids});
delete from seneve.enrollments where participant_id in({pids});
delete from seneve.entitlements where participant_id in({pids});
delete from seneve.hd_programme_links where programme_id={pr};
delete from seneve.offers where programme_id={pr};
delete from seneve.programme_versions where programme_id={pr};
delete from seneve.programmes where programme_id={pr};
delete from seneve.participants where participant_id in({pids});
delete from auth.users where id in({uids});
commit;
"""
for target, value in [(p, json.dumps(c)), (p.with_suffix('.setup.sql'), '\n'.join(sql)), (p.with_suffix('.cleanup.sql'), cleanup)]:
    fd = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, 'w') as f:
        f.write(value)
print('Configuration, SQL de préparation et nettoyage générés ; TEST uniquement.')
