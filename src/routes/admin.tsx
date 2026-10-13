import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { formatDateHeure } from '@/lib/journal';
import { ETATS_EQUIPE, ETAT_LIBELLE, REPONSE_MAX, erreurAdmin, filtrer, lienWhatsApp, type Filtre, type StaffRequest, type TeamMember } from '@/lib/admin';

type Me = { roles: string[]; admin: boolean };
type Loaded = { me: Me; requests: StaffRequest[]; team: TeamMember[] };

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
  return { me: m, requests: (r.data ?? []) as StaffRequest[], team: (t.data ?? []) as TeamMember[] };
}

export function Admin() {
  const navigate = useNavigate();
  const [data, setData] = useState<Loaded | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'no-access' | 'failed'>('loading');
  const [filtre, setFiltre] = useState<Filtre>('a_traiter');

  const refresh = useCallback(async () => {
    try {
      const res = await load();
      if (res === 'no-session') { navigate('/connexion', { replace: true }); return; }
      if (res === 'no-access') { setState('no-access'); return; }
      setData(res); setState('ok');
    } catch { setState('failed'); }
  }, [navigate]);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => { document.title = 'Administration — SÉNEVÉ'; document.documentElement.lang = 'fr'; }, []);

  const head = <><p className="brand">SÉNEVÉ</p><Link className="link" to="/espace">← Mon espace</Link><h1>Administration</h1></>;
  if (state === 'loading') return <main className="wrap">{head}<p className="muted">Chargement…</p></main>;
  if (state === 'no-access') return <main className="wrap">{head}<div className="card"><p>Cette page est réservée à l’équipe d’accompagnement SÉNEVÉ.</p></div></main>;
  if (state === 'failed' || !data) return <main className="wrap">{head}<div className="card"><p role="alert">Impossible de charger l’administration pour le moment.</p><button type="button" className="btn action-btn" onClick={() => { setState('loading'); void refresh(); }}>Réessayer</button></div></main>;

  const liste = filtrer(data.requests, filtre);
  const compte = (f: Filtre) => filtrer(data.requests, f).length;
  const onglets: [Filtre, string][] = [['a_traiter', 'À traiter'], ['resolues', 'Résolues'], ['annulees', 'Annulées']];

  return <main className="wrap">
    {head}
    <p className="muted">{data.me.admin ? 'Tu vois toutes les demandes d’aide. ' : 'Tu vois les demandes qui te sont confiées. '}Les journaux restent privés : seules les notes que le participant a choisi de joindre apparaissent ici.</p>
    <div className="prog-tabs" role="tablist" aria-label="Demandes">
      {onglets.map(([f, label]) => <button key={f} type="button" role="tab" className="prog-tab" aria-selected={filtre === f} onClick={() => setFiltre(f)}>{label} ({compte(f)})</button>)}
    </div>
    {liste.length === 0 ? <p className="muted">Aucune demande ici.</p>
      : liste.map(r => <RequestAdmin key={`${r.request_id}:${r.modifie_le}`} request={r} admin={data.me.admin} team={data.team} onSaved={refresh} />)}
    {data.me.admin && <Team team={data.team} onChanged={refresh} />}
  </main>;
}

function RequestAdmin({ request, admin, team, onSaved }: { request: StaffRequest; admin: boolean; team: TeamMember[]; onSaved: () => Promise<void> }) {
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

  return <article className="card">
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
        <p className="muted">La personne n’est pas prévenue automatiquement : si besoin, écris-lui aussi par e-mail ou WhatsApp.</p>
        <button type="submit" className="btn action-btn" disabled={busy || trop}>{busy ? 'Enregistrement…' : 'Enregistrer'}</button>
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

  return <section className="card">
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
