import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ComptePrive } from '@/components/ComptePrive';
import { supabase } from '@/lib/supabase';
import { BarreNav } from '@/components/BarreNav';
import { IconeMaquette } from '@/components/IconeMaquette';
import { eventIdFor } from '@/lib/espace';
import { NOTE_MAX, draft, formatDateHeure, journalTextes, texteValide } from '@/lib/journal';
import { Icone } from '@/components/Icone';
import { IconeJournal } from '@/components/IconeJournal';

type Entry = { entry_id: string; texte: string; usage_ia_autorise: boolean; cree_le: string; modifie_le: string; activity_id: string | null };
type Loaded = { participantId: string; prenom: string; langue: string; entries: Entry[]; consigne: string | null };

async function load(activite: string | null): Promise<Loaded | null> {
  const { data: s } = await supabase.auth.getSession();
  if (!s.session) return null;
  const ep = await supabase.rpc('ensure_participant', { p_prenom: (s.session.user.user_metadata?.['prenom'] as string | undefined) ?? '' });
  if (ep.error) throw ep.error;
  const [p, e, a] = await Promise.all([
    supabase.from('participants').select('langue,prenom').maybeSingle(),
    supabase.from('journal_entries').select('entry_id, texte, usage_ia_autorise, cree_le, modifie_le, activity_id').order('cree_le', { ascending: false }),
    activite ? supabase.from('activities').select('consigne').eq('activity_id', activite).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ]);
  if (p.error) throw p.error;
  if (e.error) throw e.error;
  return {
    participantId: ep.data as string,
    prenom: p.data?.prenom ?? s.session.user.user_metadata?.['prenom'] ?? '',
    langue: (p.data?.langue as string | undefined) ?? 'fr',
    entries: (e.data ?? []) as Entry[],
    consigne: a.error ? null : ((a.data as { consigne?: string } | null)?.consigne ?? null),
  };
}

export function Journal() {
  return <ComptePrive enfants={userId => <JournalDuCompte userId={userId} />} />;
}

function JournalDuCompte({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const inscription = params.get('inscription');
  const activite = inscription ? params.get('activite') : null;
  const draftKey = `journal:${activite ?? 'libre'}`;
  const location = useLocation();
  const cleChargee = useRef(draftKey);
  const citationRecue = useRef(false);

  const [data, setData] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState(false);
  const [texte, setTexte] = useState(() => draft.read(draftKey, userId));
  const [ia, setIa] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const pendingId = useRef<string | null>(null);
  // « Écrire » (barre du bas) ou « Écrire ma réflexion » : le champ de la note est prêt à recevoir le texte.
  const champ = useRef<HTMLTextAreaElement>(null);
  const ecrire = params.has('ecrire') || Boolean(activite);
  // Les nouvelles maquettes gardent l’éditeur visible dans les deux états du journal.
  const [formOuvert, setFormOuvert] = useState(true);
  const focusDemande = useRef(false);
  const refresh = useCallback(async (actif: () => boolean = () => true) => {
    setFailed(false);
    try {
      const loaded = await load(activite);
      if (!actif()) return;
      if (!loaded) { navigate('/connexion', { replace: true }); return; }
      setData(loaded);
    } catch { if (actif()) setFailed(true); }
  }, [activite, navigate]);
  useEffect(() => { let actif = true; void refresh(() => actif); return () => { actif = false; }; }, [refresh]);
  useEffect(() => {
    if (cleChargee.current !== draftKey) {
      cleChargee.current = draftKey;
      setTexte(draft.read(draftKey, userId)); setIa(false); setSaved(false); setError(''); pendingId.current = null;
    }
    const citation = location.state?.citationBiblique;
    if (!citationRecue.current && typeof citation === 'string' && citation) {
      citationRecue.current = true;
      const actuel = draft.read(draftKey, userId);
      const prochain = `${actuel ? actuel + '\n\n' : ''}${citation}\n\n`;
      draft.write(draftKey, prochain, userId); setTexte(prochain);
      navigate(location.pathname + location.search, { replace: true, state: null });
    }
  }, [draftKey, userId, location, navigate]);
  const pret = data !== null;
  useEffect(() => {
    if (!pret || !formOuvert || !champ.current || !(ecrire || focusDemande.current)) return;
    focusDemande.current = false;
    try { champ.current.scrollIntoView({ block: 'center' }); } catch { /* sans défilement */ }
    champ.current.focus({ preventScroll: true });
  }, [pret, ecrire, formOuvert]);

  // ?lang=en ou ?lang=fr (barre du bas, liens anglais) prime sur la langue du compte.
  const langueUI = params.get('lang') === 'en' ? 'en' : params.get('lang') === 'fr' ? 'fr' : (data?.langue ?? 'fr');
  const T = journalTextes(langueUI);
  useEffect(() => { document.title = `${T.titreJournal} — SÉNEVÉ`; document.documentElement.lang = langueUI === 'en' ? 'en' : 'fr'; }, [T, langueUI]);

  function change(v: string) { setTexte(v); setSaved(false); draft.write(draftKey, v, userId); }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const t = texteValide(texte, NOTE_MAX);
    if (!t) { setError(texte.trim() ? T.trop(NOTE_MAX) : ''); return; }
    // Même identifiant si l'envoi échoue : une nouvelle tentative ne crée jamais de note en double.
    pendingId.current = eventIdFor(pendingId.current);
    setBusy(true); setError('');
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!data || session.session?.user.id !== userId) throw new Error('session');
      const { error } = await supabase.from('journal_entries').insert({
        entry_id: pendingId.current, participant_id: data.participantId, texte: t, usage_ia_autorise: ia,
        enrollment_id: inscription, activity_id: activite,
      });
      if (error && error.code !== '23505') throw error;
      pendingId.current = null;
      change(''); setIa(false); setSaved(true);
      await refresh();
    } catch { setError(T.erreurNote); }
    finally { setBusy(false); }
  }

  const en = langueUI === 'en';
  const tete = <header className="today-head page-tete"><div className="barre-haut barre-espace"><p className="brand logo-marque"><Icone nom="graine" taille={24} /><span>SÉNEVÉ<small>{en ? 'Journal' : 'Journal'}</small></span></p><span className="journal-profil" aria-hidden="true">{data?.prenom.trim().charAt(0).toUpperCase() || <IconeMaquette nom="person" taille={18} />}</span></div><p className="journal-repere"><span />{en ? 'One step each day' : 'Un pas chaque jour'}</p><h1>{T.titreJournal}</h1></header>;
  const intro = <div className="journal-confidentialite"><IconeJournal nom="lock" taille={20} /><p className="journal-intro">{T.introJournal}</p></div>;
  const back = <Link className="link" to="/espace">← {T.retour}</Link>;
  if (failed) return <main className="wrap avec-nav journal-page journal-nouveau">{tete}<div className="card"><p role="alert">{T.erreurChargement}</p><button type="button" className="btn action-btn" onClick={() => void refresh()}>{T.reessayer}</button></div>{back}<BarreNav langue={langueUI} maquette iconesJournal /></main>;
  if (!data) return <main className="wrap avec-nav journal-page journal-nouveau">{tete}<p className="muted">{T.chargement}</p><BarreNav langue={langueUI} maquette iconesJournal /></main>;

  const trop = texte.trim().length > NOTE_MAX;
  return <main className="wrap avec-nav journal-page journal-nouveau">
    {tete}
    {intro}
    {data.entries.length === 0 && <JournalImage en={en} avecNotes={data.entries.length > 0} />}
    {formOuvert
      ? <form className="card journal-form" onSubmit={save} aria-label={T.nouvelle}>
          <div className="journal-form-haut"><p className="tag"><span />{en ? "New reflection" : "Nouvelle réflexion"}</p><span>{en ? "Today" : "Aujourd’hui"}</span></div>
          {data.consigne && <div className="prompt-carte journal-question"><p className="tag"><IconeJournal nom="psychology_alt" taille={16} />{en ? "Guiding question" : "Question guide"}</p><div className="journal-question-ligne"><p className="prompt-question">{data.consigne}</p></div></div>}
          <label className="field"><span className="sr-only">{T.nouvelle}</span>
            <textarea ref={champ} rows={6} value={texte} maxLength={NOTE_MAX + 500} placeholder={T.placeholderNote} onChange={e => change(e.target.value)} />
          </label>
          <p className="journal-mots" aria-live="off">{texte.trim() ? texte.trim().split(/\s+/u).length : 0} {langueUI === 'en' ? 'words' : (texte.trim().split(/\s+/u).filter(Boolean).length === 1 ? 'mot déposé' : 'mots déposés')} <IconeJournal nom="draw" taille={16} /></p>
          {trop && <p className="error" role="alert">{T.trop(NOTE_MAX)}</p>}
          <label className="share-check"><input type="checkbox" checked={ia} onChange={e => setIa(e.target.checked)} /><span>{T.iaCase}<br /><span className="muted">{T.iaAide}</span></span></label>
          <button type="submit" className="btn action-btn moment-btn" disabled={busy || !texte.trim() || trop}>{busy ? T.enregistrement : T.enregistrer}<IconeJournal nom="arrow_forward" taille={20} /></button>
          {texte.trim() && !busy && <p className="muted journal-brouillon"><IconeMaquette nom="history" taille={16} />{T.brouillon}</p>}
          {saved && <p className="success" role="status">{T.enregistree}</p>}
          {error && <p className="error" role="alert">{error}</p>}
        </form>
      : <button type="button" className="btn moment-btn journal-nouvelle" onClick={() => { focusDemande.current = true; setFormOuvert(true); }}><IconeMaquette nom="history_edu" taille={22} />{T.nouvelle}</button>}
    {data.entries.length > 0 && <JournalImage en={en} avecNotes={data.entries.length > 0} />}
    <section className="today-section journal-historique" aria-labelledby="titre-notes">
      <div className="journal-historique-tete"><h2 id="titre-notes">{en ? "Previous reflections" : "Mes réflexions précédentes"}</h2><span>{data.entries.length} {langueUI === 'en' ? (data.entries.length === 1 ? 'note' : 'notes') : (data.entries.length === 1 ? 'note' : 'notes')}</span></div>
      {data.entries.length === 0
        ? <div className="card journal-vide"><span className="journal-eco"><IconeJournal nom="eco" taille={28} /></span><p>{en ? 'You haven’t written anything yet. Your first reflection will appear here.' : 'Tu n’as encore rien écrit. Ta première réflexion apparaîtra ici.'}</p><span className="journal-graine"><IconeJournal nom="flare" taille={15} />{en ? 'Like a mustard seed taking root' : 'Comme la graine de sénevé qui prend racine'}</span></div>
        : data.entries.map(x => <EntryCard key={x.entry_id} entry={x} langue={langueUI} onChanged={refresh} />)}
    </section>
    <footer className="journal-pied"><IconeJournal nom="verified_user" taille={18} />{en ? "Saved notes are kept in your personal space." : "Les notes enregistrées sont conservées dans ton espace."}</footer>
    <BarreNav langue={langueUI} maquette iconesJournal />
  </main>;
}

function EntryCard({ entry, langue, onChanged }: { entry: Entry; langue: string; onChanged: () => Promise<void> }) {
  const T = journalTextes(langue);
  const [editing, setEditing] = useState(false);
  const [texte, setTexte] = useState(entry.texte);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function run(op: () => PromiseLike<{ error: unknown }>) {
    setBusy(true); setError('');
    try {
      const { error } = await op();
      if (error) throw error;
      setEditing(false); setConfirm(false);
      await onChanged();
    } catch { setError(T.erreurAction); }
    finally { setBusy(false); }
  }
  const t = texteValide(texte, NOTE_MAX);
  const edited = entry.modifie_le && new Date(entry.modifie_le).getTime() - new Date(entry.cree_le).getTime() > 60000;

  return <article className="card note-carte">
    <p className="note-date">{formatDateHeure(entry.cree_le, T.locale)}{edited ? ` · ${T.modifiee}` : ''}</p>
    {editing
      ? <label className="field"><span className="sr-only">{T.modifier}</span><textarea rows={5} value={texte} onChange={e => setTexte(e.target.value)} /></label>
      : <p className="day-text">{entry.texte}</p>}
    <p className="note-ia"><span className="time-chip"><IconeMaquette nom="check_circle" taille={15} />{entry.usage_ia_autorise ? T.iaOui : T.iaNon}</span></p>
    {editing ? <div className="row-actions">
      <button type="button" className="btn action-btn" disabled={busy || !t} onClick={() => void run(() => supabase.from('journal_entries').update({ texte: t }).eq('entry_id', entry.entry_id))}>{busy ? T.enregistrement : T.enregistrer}</button>
      <button type="button" className="link" onClick={() => { setEditing(false); setTexte(entry.texte); }}>{T.annulerModif}</button>
    </div> : confirm ? <div className="row-actions">
      <p>{T.confirmerSuppr}</p>
      <button type="button" className="link danger" disabled={busy} onClick={() => void run(() => supabase.from('journal_entries').delete().eq('entry_id', entry.entry_id))}>{T.oui}</button>
      <button type="button" className="link" onClick={() => setConfirm(false)}>{T.non}</button>
    </div> : <div className="row-actions">
      <button type="button" className="link" disabled={busy} onClick={() => void run(() => supabase.from('journal_entries').update({ usage_ia_autorise: !entry.usage_ia_autorise }).eq('entry_id', entry.entry_id))}>{entry.usage_ia_autorise ? T.retirerIa : T.autoriserIa}</button>
      <button type="button" className="link" onClick={() => setEditing(true)}><IconeJournal nom="edit" taille={16} />{T.modifier}</button>
      <button type="button" className="link" onClick={() => setConfirm(true)}><IconeJournal nom="delete" taille={16} />{T.supprimer}</button>
    </div>}
    {error && <p className="error" role="alert">{error}</p>}
  </article>;
}

function JournalImage({en,avecNotes}:{en:boolean;avecNotes:boolean}) { return <figure className="journal-image"><img src={`${import.meta.env.BASE_URL}illustrations/journal-maquette-${avecNotes ? 'notes' : 'vide'}.jpg`} alt={avecNotes ? (en ? 'A quiet courtyard in natural light' : 'Une cour paisible dans la lumière naturelle') : (en ? 'An open journal in natural light' : 'Un journal ouvert dans la lumière naturelle')} width={720} height={400} /><figcaption><IconeJournal nom="spa" taille={20} /><span>{en ? 'A moment to reflect' : 'Un temps pour réfléchir'}</span></figcaption></figure>; }
