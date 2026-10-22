import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ComptePrive } from '@/components/ComptePrive';
import { supabase } from '@/lib/supabase';
import { BarreNav } from '@/components/BarreNav';
import { Icone } from '@/components/Icone';
import { eventIdFor } from '@/lib/espace';
import { nomParcours } from '@/lib/espace-textes';
import { MOTIF_MAX, draft, formatDateHeure, journalTextes, peutAnnuler, texteValide } from '@/lib/journal';
import { IconeAide } from '@/components/IconeAide';


type Request = { request_id: string; motif: string; etat: string; reponse: string | null; extraits_partages: string | null; cree_le: string };
type Message = { request_id: string; auteur: 'participant' | 'equipe'; texte: string; cree_le: string };
type Note = { entry_id: string; texte: string; cree_le: string };
type Parcours = { enrollment_id: string; nom: string };
type Loaded = { prenom: string; langue: string; requests: Request[]; messages: Message[]; notes: Note[]; parcours: Parcours[] };

async function load(): Promise<Loaded | null> {
  const { data: s } = await supabase.auth.getSession();
  if (!s.session) return null;
  const ep = await supabase.rpc('ensure_participant', { p_prenom: (s.session.user.user_metadata?.['prenom'] as string | undefined) ?? '' });
  if (ep.error) throw ep.error;
  const [p, h, j, e, m] = await Promise.all([
    supabase.from('participants').select('langue,prenom').maybeSingle(),
    supabase.from('help_requests').select('request_id, motif, etat, reponse, extraits_partages, cree_le').order('cree_le', { ascending: false }),
    supabase.from('journal_entries').select('entry_id, texte, cree_le').order('cree_le', { ascending: false }),
    supabase.from('enrollments').select('enrollment_id, programme_id, langue').neq('etat', 'annulee'),
    supabase.from('help_messages').select('request_id, auteur, texte, cree_le').order('cree_le', { ascending: true }),
  ]);
  for (const r of [p, h, j, e, m]) if (r.error) throw r.error;
  const enr = (e.data ?? []) as { enrollment_id: string; programme_id: string; langue: string }[];
  let parcours: Parcours[] = [];
  if (enr.length) {
    const pr = await supabase.from('programmes').select('programme_id, nom, duree_jours').in('programme_id', [...new Set(enr.map(x => x.programme_id))]);
    if (pr.error) throw pr.error;
    const progs = (pr.data ?? []) as { programme_id: string; nom: string; duree_jours: number | null }[];
    parcours = enr.map(x => {
      const prog = progs.find(q => q.programme_id === x.programme_id);
      return { enrollment_id: x.enrollment_id, nom: nomParcours(prog?.nom ?? x.programme_id, x.langue, prog?.duree_jours ?? 7) };
    });
  }
  return {
    prenom: p.data?.prenom ?? s.session.user.user_metadata?.['prenom'] ?? '',
    langue: (p.data?.langue as string | undefined) ?? 'fr',
    requests: (h.data ?? []) as Request[],
    messages: (m.data ?? []) as Message[],
    notes: (j.data ?? []) as Note[],
    parcours,
  };
}

function apercu(texte: string): string {
  const t = texte.replace(/\s+/g, ' ').trim();
  return t.length > 90 ? `${t.slice(0, 90)}…` : t;
}

const SUJETS={fr:['Mon parcours','Mon compte','Mon achat','Autre'],en:['My journey','My account','My purchase','Other']} as const;
const CLE_SUJETS=['parcours','compte','achat','autre'];
export function Aide() {
  return <ComptePrive enfants={userId => <AideDuCompte userId={userId} />} />;
}

function AideDuCompte({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [data, setData] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState(false);
  const [motif, setMotif] = useState(() => draft.read('aide', userId) || ({'suppression-compte':'Je souhaite demander la suppression de mon compte SÉNEVÉ.','adresse-email':'Je souhaite modifier l’adresse e-mail de mon compte.','export-donnees':'Je souhaite recevoir une copie de toutes mes données personnelles.'}[params.get('motif')??'']??''));
  const [parcours, setParcours] = useState(params.get('inscription') ?? '');
  const [sujet,setSujet]=useState(()=>{const v=draft.read('aide:sujet', userId);return CLE_SUJETS.includes(v)?v:params.has('motif')?'compte':'parcours';});
  const [notes, setNotes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const pendingId = useRef<string | null>(null);

  const refresh = useCallback(async (actif: () => boolean = () => true) => {
    setFailed(false);
    try {
      const loaded = await load();
      if (!actif()) return;
      if (!loaded) { navigate('/connexion', { replace: true }); return; }
      setData(loaded);
    } catch { if (actif()) setFailed(true); }
  }, [navigate]);
  useEffect(() => { let actif = true; void refresh(() => actif); return () => { actif = false; }; }, [refresh]);

  const T = journalTextes(data?.langue);
  const en=data?.langue==='en';
  const sujets=SUJETS[en?'en':'fr'];
  const prefixe=`${en?'Subject':'Sujet'} : ${sujets[CLE_SUJETS.indexOf(sujet)]}\n\n`;
  const limite=MOTIF_MAX-prefixe.length;
  useEffect(() => { document.title = `${T.titreAide} — SÉNEVÉ`; document.documentElement.lang = data?.langue === 'en' ? 'en' : 'fr'; }, [T, data?.langue]);

  // Toute modification du formulaire en fait une nouvelle demande (nouvel identifiant à l'envoi).
  function edited() { pendingId.current = null; setSent(false); }
  function changeMotif(v: string) { setMotif(v); draft.write('aide', v, userId); edited(); }
  function toggle(id: string) { setNotes(n => n.includes(id) ? n.filter(x => x !== id) : [...n, id]); edited(); }

  async function send(e: FormEvent) {
    e.preventDefault();
    if (busy || !data) return;
    const m = texteValide(motif, limite);
    if (!m) { setError(motif.trim() ? T.trop(limite) : ''); return; }
    pendingId.current = eventIdFor(pendingId.current);
    setBusy(true); setError('');
    try {
      const { data: session } = await supabase.auth.getSession();
      if (session.session?.user.id !== userId) throw new Error('session');
      const enrollment = data.parcours.some(x => x.enrollment_id === parcours) ? parcours : null;
      const { error } = await supabase.rpc('request_help', { p_client_request_id: pendingId.current, p_motif: prefixe+m, p_enrollment_id: enrollment, p_entry_ids: notes });
      if (error) { setError(error.message.includes('Trop de demandes') ? T.tropDemandes : T.erreurEnvoi); return; }
      pendingId.current = null;
      setMotif(''); draft.write('aide', '', userId); setNotes([]); setSent(true);
      await refresh();
    } catch { setError(T.erreurEnvoi); }
    finally { setBusy(false); }
  }

  const tete = <header className="today-head page-tete"><div className="aide-barre"><p className="brand"><Icone nom="graine" taille={24} /><span>SÉNEVÉ</span></p><span className="aide-initiale" aria-hidden="true">{data?.prenom.trim().charAt(0).toUpperCase()}</span></div><p className="aide-repere"><span />{en?'Listening & support':'Écoute & Soutien'}</p><h1>{en?'Help & Contact':'Aide & Contact'}</h1></header>;
  const back = <Link className="link" to="/espace">← {T.retour}</Link>;
  if (failed) return <main className="wrap avec-nav aide-page">{tete}<div className="card"><p role="alert">{T.erreurChargement}</p><button type="button" className="btn action-btn" onClick={() => void refresh()}>{T.reessayer}</button></div>{back}<BarreNav langue={data?.langue} iconesAide /></main>;
  if (!data) return <main className="wrap avec-nav aide-page">{tete}<p className="muted">{T.chargement}</p><BarreNav langue={undefined} iconesAide /></main>;

  const trop = motif.trim().length > limite;
  return <main className="wrap avec-nav aide-page">
    {tete}
    <p className="aide-intro">{T.introAide}</p>
    <section className="aide-urgence" role="note"><span className="aide-bouclier"><IconeAide nom="shield_with_heart" taille={20} /></span><div><h2>{en?'Important note':'Note importante'}</h2><p>{T.urgence}</p><p>{en?'This help is not an emergency service.':'Cette aide n’est pas un service d’urgence.'}</p></div></section>
    <form className="card aide-form" onSubmit={send}>
      <div className="aide-form-tete"><h2><IconeAide nom="rate_review" taille={20} />{en?'New request':'Nouvelle demande'}</h2><span>{en?'Direct message':'Écrit direct'}</span></div>
      <fieldset className="aide-sujets"><legend>{en?'Subject of your message':'Sujet de ton message'}</legend><div>{sujets.map((nom,i)=><button key={CLE_SUJETS[i]} type="button" aria-pressed={sujet===CLE_SUJETS[i]} onClick={()=>{setSujet(CLE_SUJETS[i]!);draft.write('aide:sujet',CLE_SUJETS[i]!,userId);edited();}}><span>{nom}</span>{sujet===CLE_SUJETS[i]&&<IconeAide nom="check" taille={18} />}</button>)}</div></fieldset>
      <label className="field"><span>{T.motif}</span>
        <textarea rows={5} value={motif} maxLength={limite+500} placeholder={T.placeholderMotif} onChange={e => changeMotif(e.target.value)} />
      </label>
      {trop && <p className="error" role="alert">{T.trop(limite)}</p>}
      {data.parcours.length > 0 && <label className="field"><span>{T.parcours}</span>
        <select value={parcours} onChange={e => { setParcours(e.target.value); edited(); }}>
          <option value="">{T.aucunParcours}</option>
          {data.parcours.map(x => <option key={x.enrollment_id} value={x.enrollment_id}>{x.nom}</option>)}
        </select>
      </label>}
      {data.notes.length > 0 && <fieldset className="field">
        <legend>{T.partager}</legend>
        <p className="muted">{T.partagerAide}</p>
        {data.notes.slice(0, 20).map(n => <label key={n.entry_id} className="share-check">
          <input type="checkbox" checked={notes.includes(n.entry_id)} onChange={() => toggle(n.entry_id)} />
          <span>{apercu(n.texte)}<br /><span className="muted">{formatDateHeure(n.cree_le, T.locale)}</span></span>
        </label>)}
      </fieldset>}
      <button type="submit" className="btn action-btn moment-btn" disabled={busy || !motif.trim() || trop}>{busy ? T.envoi : T.envoyer}<IconeAide nom="arrow_forward" taille={18} /></button>
      {sent && <p className="success" role="status">{T.envoyee}</p>}
      {error && <p className="error" role="alert">{error}</p>}
    </form>
    {/* Le coach est rangé ici depuis la barre du bas (écran validé le 15/10/2026). */}
    <Link className="btn-secondaire coach-lien" to={`/coach${parcours ? `?inscription=${parcours}` : ''}`}><Icone nom="coach" taille={20} />{T.parlerCoach}</Link>
    <section className="today-section" aria-labelledby="titre-demandes">
      <div className="aide-historique-tete"><h2 id="titre-demandes">{T.mesDemandes}</h2><span>{data.requests.length} {en?(data.requests.length===1?"request":"requests"):(data.requests.length===1?"demande":"demandes")}</span></div>
      {data.requests.length === 0 ? <div className="card journal-vide"><Icone nom="aide" taille={28} /><p>{T.aucuneDemande}</p></div>
        : data.requests.map(r => <RequestCard key={r.request_id} request={r} messages={data.messages.filter(x => x.request_id === r.request_id)} langue={data.langue} onChanged={refresh} />)}
    </section>
    <footer className="aide-pied"><span><IconeAide nom="lock" taille={18} /></span><strong>{en?'Discretion & support':'Discrétion & accompagnement'}</strong><p>{en?'Your request and the excerpts you attach are read by the SÉNEVÉ support team.':'Ta demande et les extraits que tu joins sont lus par l’équipe d’accompagnement SÉNEVÉ.'}</p></footer>
    <BarreNav langue={data.langue} iconesAide />
  </main>;
}

function RequestCard({ request, messages, langue, onChanged }: { request: Request; messages: Message[]; langue: string; onChanged: () => Promise<void> }) {
  const T = journalTextes(langue);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // Une annulation se confirme d'abord : l'équipe ne traitera plus la demande.
  const [confirmer, setConfirmer] = useState(false);
  const conserver = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (confirmer) conserver.current?.focus(); }, [confirmer]);
  // Réponse du participant dans la même demande, une fois que l'équipe a répondu.
  const [repondre, setRepondre] = useState(false);
  const [texte, setTexte] = useState('');
  const [envoyee, setEnvoyee] = useState(false);
  const envoiId = useRef<string | null>(null);
  const champ = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (repondre) champ.current?.focus(); }, [repondre]);
  const equipeARepondu = messages.some(x => x.auteur === 'equipe') || Boolean(request.reponse);
  const peutRepondre = request.etat !== 'annulee' && equipeARepondu;

  async function envoyer(e: FormEvent) {
    e.preventDefault();
    const t = texte.trim();
    if (busy || !t || t.length > MOTIF_MAX) return;
    setBusy(true); setError('');
    envoiId.current = eventIdFor(envoiId.current);
    try {
      const { error } = await supabase.rpc('reply_help_request', { p_request_id: request.request_id, p_client_message_id: envoiId.current, p_texte: t });
      if (error) throw error;
      envoiId.current = null; setTexte(''); setRepondre(false); setEnvoyee(true);
      await onChanged();
    } catch { setError(T.erreurAction); }
    finally { setBusy(false); }
  }

  async function cancel() {
    setBusy(true); setError('');
    try {
      const { error } = await supabase.rpc('cancel_help_request', { p_request_id: request.request_id });
      if (error) throw error;
      await onChanged();
    } catch { setError(T.erreurAction); }
    finally { setBusy(false); }
  }

  const sujet=request.motif.match(/^(?:Sujet|Subject) : ([^\n]+)\n\n/);
  const message=sujet?request.motif.slice(sujet[0].length):request.motif;
  return <article className="card note-carte demande-carte">
    <div className="demande-tete"><div><p className="note-date">{formatDateHeure(request.cree_le, T.locale)}</p>{sujet&&<h3 className="demande-sujet">{sujet[1]}</h3>}</div><span className={`time-chip etat-${request.etat}`}>{T.etats[request.etat] ?? request.etat}</span></div>
    <p className="day-text">{message}</p>
    {request.extraits_partages && <details><summary className="muted">{T.notesJointes}</summary><p className="day-text">{request.extraits_partages}</p></details>}
    {messages.length
      ? messages.map((x, i) => x.auteur === 'equipe'
          ? <div key={i} className="prompt-carte demande-reponse"><p className="tag"><IconeAide nom="history_edu" taille={17} />{T.reponse}</p><p className="note-date">{formatDateHeure(x.cree_le, T.locale)}</p><p className="day-text">{x.texte}</p></div>
          : <div key={i} className="demande-message-participant"><p className="tag">{T.taReponse}</p><p className="note-date">{formatDateHeure(x.cree_le, T.locale)}</p><p className="day-text">{x.texte}</p></div>)
      : request.reponse && <div className="prompt-carte demande-reponse"><p className="tag"><IconeAide nom="history_edu" taille={17} />{T.reponse}</p><p className="day-text">{request.reponse}</p></div>}
    {envoyee && <p className="success" role="status">{T.reponseEnvoyee}</p>}
    {peutRepondre && (repondre
      ? <form className="demande-repondre" onSubmit={envoyer}>
          <label className="field" htmlFor={`reponse-${request.request_id}`}>{T.champReponse}</label>
          <textarea ref={champ} id={`reponse-${request.request_id}`} rows={3} value={texte} maxLength={MOTIF_MAX} onChange={e => { setTexte(e.target.value); envoiId.current = null; }} />
          {request.etat === 'resolue' && <p className="muted">{T.rouvrir}</p>}
          <button type="submit" className="btn" disabled={busy || !texte.trim()}>{busy ? T.enregistrement : T.envoyerReponse}</button>
          <button type="button" className="link" disabled={busy} onClick={() => { setRepondre(false); setTexte(''); }}>{T.annulerReponse}</button>
        </form>
      : <button type="button" className="link demande-bouton-repondre" disabled={busy} onClick={() => { setRepondre(true); setEnvoyee(false); }}><IconeAide nom="rate_review" taille={16} />{T.repondre}</button>)}
    {peutAnnuler(request.etat) && (confirmer
      ? <div className="demande-confirmation" role="group" aria-labelledby={`annuler-${request.request_id}`}>
          <p className="demande-confirmation-titre" id={`annuler-${request.request_id}`}>{T.confirmerAnnulTitre}</p>
          <p>{T.confirmerAnnulTexte}</p>
          <button ref={conserver} type="button" className="btn" disabled={busy} onClick={() => setConfirmer(false)}>{T.conserverDemande}</button>
          <button type="button" className="btn btn-danger" disabled={busy} onClick={() => void cancel()}>{T.confirmerAnnul}</button>
        </div>
      : <button type="button" className="link" disabled={busy} onClick={() => setConfirmer(true)}>{T.annulerDemande}</button>)}
    {error && <p className="error" role="alert">{error}</p>}
  </article>;
}
