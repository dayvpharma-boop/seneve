import {FormulaireDemandeFidele} from '@/components/FormulaireDemandeFidele';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { EtatAdministration } from '@/components/EtatAdministration';
import { supabase } from '@/lib/supabase';
import {AdministrationBureau} from '@/components/AdministrationBureau';
import { FreinsAdmin } from '@/components/FreinsAdmin';
import { ConventionsAdmin } from '@/components/ConventionsAdmin';
import { InterventionAdministration,IncidentsIntervention,identifiantDemande } from '@/components/InterventionAdministration';
import { IconeAdministration } from '@/components/IconeAdministration';
import {IconePilotage} from '@/components/IconePilotage';
import { Icone } from '@/components/Icone';
import { IconeConfidentialite } from '@/components/IconeConfidentialite';
import { PilotageAdmin } from '@/components/PilotageAdmin';
import { formatDateHeure } from '@/lib/journal';
import { ETATS_EQUIPE, ETAT_LIBELLE, REPONSE_MAX, erreurAdmin, filtrer, lienWhatsApp, type Filtre, type StaffRequest, type TeamMember } from '@/lib/admin';

type Me = { roles: string[]; admin: boolean };
type Loaded = { authId:string; prenom:string; me: Me; requests: StaffRequest[]; team: TeamMember[] };

async function load(): Promise<Loaded | 'no-session' | 'no-access'> {
  const { data: s } = await supabase.auth.getSession();
  if (!s.session) return 'no-session';
  const me = await supabase.rpc('staff_me');
  if (me.error) throw me.error;
  const m = (me.data ?? { roles: [], admin: false }) as Me;
  if (!m.admin && !m.roles?.length) return 'no-access';
  const [r, t] = await Promise.all([
    supabase.rpc('staff_list_help_requests'),
    m.admin ? supabase.rpc('staff_list_team') : Promise.resolve({ data: [], error: null }),
  ]);
  if (r.error) throw r.error;
  if (t.error) throw t.error;
  return { authId:s.session.user?.id??'', prenom: typeof s.session.user?.user_metadata?.prenom==='string'?s.session.user.user_metadata.prenom:'Équipe SÉNEVÉ', me: m, requests: (r.data ?? []) as StaffRequest[], team: (t.data ?? []) as TeamMember[] };
}

export function Admin() {
  const [params,setParams]=useSearchParams();
  const intervention=params.get('vue')==='intervention';
  const [data, setData] = useState<Loaded | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'no-access' | 'failed' | 'expired'>('loading');
  const [heureErreur,setHeureErreur]=useState<Date>();
  const [outilsDemandes,setOutilsDemandes]=useState(false);
  const [ordinateur,setOrdinateur]=useState(()=>window.matchMedia?.('(min-width:1024px)').matches??false);
  useEffect(()=>{const m=window.matchMedia?.('(min-width:1024px)');if(!m)return;const changer=()=>setOrdinateur(m.matches);m.addEventListener('change',changer);return()=>m.removeEventListener('change',changer);},[]);
  const [filtre, setFiltre] = useState<Filtre>('a_traiter');

  const refresh = useCallback(async () => {
    try {
      const res = await load();
      if (res === 'no-session') { setData(null); setState('expired'); return; }
      if (res === 'no-access') { setData(null); setState('no-access'); return; }
      setData(res); setState('ok');
    } catch { setData(null); setHeureErreur(new Date()); setState('failed'); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => { document.title = 'Administration — SÉNEVÉ'; document.documentElement.lang = 'fr'; }, []);

  const head = <header className="admin-maquette-header"><Link className="admin-identite" to="/espace"><Icone nom="graine"/><strong>SÉNEVÉ</strong></Link><h1>· Administration</h1><Link className="admin-profil" to="/espace" aria-label="Mon espace"><IconeConfidentialite nom="person" taille={20}/></Link></header>;
  if (state !== 'ok' || !data) return <EtatAdministration etat={state==='ok'?'failed':state} heureErreur={heureErreur} reessayer={()=>{setState('loading');void refresh();}}/>;

  const liste = filtrer(data.requests, filtre);
  const compte = (f: Filtre) => filtrer(data.requests, f).length;
  const onglets: [Filtre, string][] = [['a_traiter', 'À traiter'], ['resolues', 'Résolues'], ['annulees', 'Annulées']];

  const demandes=<section className="admin-demandes">    <h2 id="demandes-admin">Demandes d’aide</h2>
    <p className="muted">{data.me.admin ? 'Tu vois toutes les demandes d’aide. ' : 'Tu vois les demandes qui te sont confiées. '}Les journaux restent privés : seules les notes que le participant a choisi de joindre apparaissent ici.</p>
    <div className="prog-tabs" role="tablist" aria-label="Demandes">
      {onglets.map(([f, label]) => <button key={f} type="button" role="tab" className="prog-tab" aria-selected={filtre === f} onClick={() => setFiltre(f)}>{label} ({compte(f)})</button>)}
    </div>
    {liste.length === 0 ? <p className="muted">Aucune demande ici.</p>
      : liste.map(r => <RequestAdmin key={`${r.request_id}:${r.modifie_le}`} request={r} admin={data.me.admin} team={data.team} onSaved={refresh} />)}
</section>;

  if(intervention||data.me.admin||params.get('vue')==='demandes'||params.get('vue')==='contenus')return <AdministrationBureau authId={data.authId} vue={intervention?'intervention':params.get('vue')==='demandes'?'demandes':params.get('vue')==='participants'&&data.me.admin?'participants':params.get('vue')==='achats'&&data.me.admin?'achats':params.get('vue')==='contenus'?'contenus':params.get('vue')==='communications'&&data.me.admin?'communications':params.get('vue')==='incidents'&&data.me.admin?'incidents':'tableau'} mobile={!ordinateur} admin={data.me.admin} prenom={data.prenom} requests={data.requests} outils={{detailDemande:r=><RequestAdmin maquette key={`${r.request_id}:${r.modifie_le}`} request={r} admin={data.me.admin} team={data.team} onSaved={refresh}/>,demandes,places:<ConventionsAdmin/>,equipe:<Team team={data.team} onChanged={refresh}/>,freins:<FreinsAdmin admin={data.me.admin}/>,indicateurs:<PilotageAdmin/>}}/>;

  return <main className={`wrap admin-maquette admin-tableau${intervention?' admin-intervention':''}`}>
    {head}
    <nav className="admin-maquette-nav" aria-label="Administration">{data.me.admin && <a href="#pilotage" onClick={()=>{if(intervention)setParams({vue:'tableau'});}}><IconeAdministration nom="grid_view"/>Tableau de bord</a>}<a href="#demandes-admin" onClick={()=>setOutilsDemandes(true)}><IconeAdministration nom="inbox"/><span>Aide</span></a>{data.me.admin && <><a href="#achats-admin" onClick={()=>{if(intervention)setParams({vue:'tableau'});}}><IconeAdministration nom="key"/>Achats</a><a href={intervention?'#incidents-intervention':'#incidents-admin'}><IconeAdministration nom="shield_with_heart"/>Incidents</a>{<a href="#places-admin"><IconeAdministration nom="volunteer_activism"/>Places financées</a>}<a href="#equipe-admin"><IconeAdministration nom="group"/>Équipe</a></>}</nav>
    <div className="admin-vues" role="group" aria-label="Administration SÉNEVÉ"><button type="button" aria-pressed={!intervention} onClick={()=>setParams({})}>Tableau de bord</button><button type="button" aria-pressed={intervention} onClick={()=>setParams({vue:'intervention'})}>Interventions</button></div>
    {data.me.admin && !intervention && <PilotageAdmin />}
    {<InterventionAdministration requests={data.requests} admin={data.me.admin} onOpenRequest={()=>setOutilsDemandes(true)} desktop={ordinateur}/>}
    {intervention&&ordinateur?<details className="intervention-outils-demandes" open={outilsDemandes} onToggle={e=>setOutilsDemandes(e.currentTarget.open)}><summary>Traitement des demandes · {compte('a_traiter')} à traiter</summary>{demandes}</details>:demandes}
    {data.me.admin&&intervention&&ordinateur?<div className="intervention-registres"><ConventionsAdmin compact/><IncidentsIntervention/></div>:data.me.admin&&<ConventionsAdmin/>}
    {intervention&&ordinateur?<details className="intervention-autres"><summary>Autres outils d’accompagnement</summary><FreinsAdmin admin={data.me.admin}/></details>:<FreinsAdmin admin={data.me.admin}/>}
    {data.me.admin && <Team team={data.team} onChanged={refresh} />}
  </main>;
}

function RequestAdmin({ request, admin, team, onSaved,maquette=false }: { maquette?:boolean;request: StaffRequest; admin: boolean; team: TeamMember[]; onSaved: () => Promise<void> }) {
  const [etat, setEtat] = useState(request.etat === 'annulee' ? 'recue' : request.etat);
  const [reponse, setReponse] = useState(request.reponse ?? '');
  const [affecte, setAffecte] = useState(request.affecte_a ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fermee = request.etat === 'annulee';
  const trop = reponse.trim().length > REPONSE_MAX;

  async function save(e: FormEvent) {
    e.preventDefault();
    if (busy || trop) return;
    setBusy(true); setError('');
    const { error } = await supabase.rpc('staff_update_help_request', {
      p_request_id: request.request_id, p_modifie_le: request.modifie_le, p_etat: etat,
      p_reponse: reponse, p_affecte_a: admin ? (affecte || null) : request.affecte_a,
    });
    setBusy(false);
    if (error) { setError(erreurAdmin(error.message)); return; }
    await onSaved();
  }

  if(maquette)return <FormulaireDemandeFidele request={request} admin={admin} team={team} etat={etat} reponse={reponse} affecte={affecte} busy={busy} error={error} trop={trop} etatChange={setEtat} reponseChange={setReponse} affecteChange={setAffecte} annuler={()=>{setEtat(request.etat==='annulee'?'recue':request.etat);setReponse(request.reponse??'');setAffecte(request.affecte_a??'');setError('');}} save={save}/>;

  return <article className="card admin-demande" id={identifiantDemande(request.request_id)}>
    <p className="tag">{ETAT_LIBELLE[request.etat] ?? request.etat}</p>
    <p className="muted">{formatDateHeure(request.cree_le, 'fr-FR')} · {request.prenom || 'Sans prénom'} · {request.langue === 'en' ? 'anglais' : 'français'}{request.programme_id ? ` · ${request.programme_id}` : ''}</p>
    <p className="day-text">{request.motif}</p>
    {request.extraits_partages && <details><summary className="muted">Notes jointes par le participant</summary><p className="day-text">{request.extraits_partages}</p></details>}
    <p className="muted">
      {request.email && <>E-mail : <a href={`mailto:${request.email}`}>{request.email}</a><br /></>}
      {request.whatsapp ? <>WhatsApp vérifié : <a href={lienWhatsApp(request.whatsapp)} target="_blank" rel="noopener noreferrer">{request.whatsapp}</a></> : 'Aucun WhatsApp relié'}
    </p>
    {!admin && request.affecte_email && <p className="muted">Confiée à : {request.affecte_email}</p>}
    {fermee ? <p className="muted">Le participant a annulé cette demande : elle n’est plus modifiable.</p> :
      <form onSubmit={save}>
        {admin && <label className="field"><span>Confier à</span>
          <select value={affecte} onChange={e => setAffecte(e.target.value)}>
            <option value="">Personne pour l’instant</option>
            {team.map(m => <option key={m.auth_user_id} value={m.auth_user_id}>{m.prenom ? `${m.prenom} — ` : ''}{m.email}</option>)}
          </select>
        </label>}
        <label className="field"><span>État</span>
          <select value={etat} onChange={e => setEtat(e.target.value)}>
            {ETATS_EQUIPE.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </label>
        <label className="field"><span>Réponse visible par le participant dans son espace</span>
          <textarea rows={4} value={reponse} onChange={e => setReponse(e.target.value)} placeholder="Écris ici la réponse que la personne lira." />
        </label>
        {trop && <p className="error" role="alert">{REPONSE_MAX} caractères au plus.</p>}
        <p className="muted">{etat === 'resolue'
          ? 'En passant à « Résolue », la personne recevra un e-mail avec ta réponse (si son compte a une adresse e-mail).'
          : 'La personne n’est prévenue par e-mail qu’au passage à « Résolue ». Avant cela, écris-lui par e-mail ou WhatsApp si besoin.'}</p>
        <button type="submit" className="btn action-btn" disabled={busy || trop}><IconePilotage nom="send" taille={18}/>{busy ? 'Enregistrement…' : 'Enregistrer'}</button>
        {error && <p className="error" role="alert">{error}</p>}
      </form>}
  </article>;
}

function Team({ team, onChanged }: { team: TeamMember[]; onChanged: () => Promise<void> }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('accompagnateur');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  async function setR(mail: string, r: string, actif: boolean) {
    setBusy(true); setError(''); setInfo('');
    const { error } = await supabase.rpc('staff_set_role', { p_email: mail, p_role: r, p_actif: actif });
    setBusy(false);
    if (error) { setError(erreurAdmin(error.message)); return false; }
    await onChanged();
    return true;
  }
  async function add(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    if (await setR(email.trim(), role, true)) { setInfo(`Rôle donné à ${email.trim()}.`); setEmail(''); }
  }

  return <section className="card" id="equipe-admin">
    <p className="tag">Équipe</p>
    {team.map(m => <div key={m.auth_user_id} className="row-actions">
      <p><strong>{m.prenom || m.email}</strong>{m.prenom ? ` · ${m.email}` : ''} — {m.roles.join(', ')}</p>
      {m.roles.map(r => <button key={r} type="button" className="link" disabled={busy} onClick={() => void setR(m.email, r, false)}>Retirer « {r} »</button>)}
    </div>)}
    <form onSubmit={add}>
      <label className="field"><span>Ajouter une personne (elle doit déjà avoir un compte SÉNEVÉ)</span>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="adresse e-mail du compte" />
      </label>
      <label className="field"><span>Rôle</span>
        <select value={role} onChange={e => setRole(e.target.value)}>
          <option value="accompagnateur">Accompagnateur : traite les demandes qui lui sont confiées</option>
          <option value="administrateur">Administrateur : voit tout et gère l’équipe</option>
        </select>
      </label>
      <button type="submit" className="btn action-btn" disabled={busy || !email.trim()}>{busy ? 'Un instant…' : 'Donner ce rôle'}</button>
      {info && <p className="success" role="status">{info}</p>}
      {error && <p className="error" role="alert">{error}</p>}
    </form>
  </section>;
}
