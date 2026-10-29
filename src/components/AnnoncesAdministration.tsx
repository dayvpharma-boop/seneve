import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';

type Annonce = { annonce_id: string; titre: string; texte: string; langue: string; cible: string; programme_id: string | null; publie_le: string; retire_le: string | null };
type Programme = { programme_id: string; nom: string };
const TITRE_MAX = 120, TEXTE_MAX = 2000;

/** Annonces de l'équipe (décision de Dr Justin du 29/10/2026) : visibles dans la page Notifications des participants
 *  concernés (tous, ou les inscrits d'un parcours), dans la langue choisie. Aucun envoi sur le téléphone. */
export function AnnoncesAdministration() {
  const [liste, setListe] = useState<Annonce[] | null>(null);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [erreurListe, setErreurListe] = useState(false);
  const [titre, setTitre] = useState(''), [texte, setTexte] = useState('');
  const [langue, setLangue] = useState<'fr' | 'en'>('fr'), [cible, setCible] = useState<'tous' | 'programme'>('tous'), [programme, setProgramme] = useState('');
  const [confirmer, setConfirmer] = useState(false), [occupe, setOccupe] = useState(false);
  const [message, setMessage] = useState(''), [erreur, setErreur] = useState('');
  const [aRetirer, setARetirer] = useState<string | null>(null);
  // Même identifiant si la publication échoue : un nouvel essai ne crée jamais deux annonces.
  const clientId = useRef<string | null>(null);

  const charger = useCallback(async () => {
    setErreurListe(false);
    try {
      const a = await supabase.rpc('staff_annonces');
      if (a.error || !Array.isArray(a.data)) { setErreurListe(true); return; }
      setListe(a.data as Annonce[]);
    } catch { setErreurListe(true); return; }
    // La liste des parcours ne sert qu'au ciblage : son échec n'empêche pas d'écrire une annonce à tous.
    try {
      const p = await supabase.from('programmes').select('programme_id, nom').order('programme_id');
      if (!p.error) setProgrammes((p.data ?? []) as Programme[]);
    } catch { /* ciblage par parcours indisponible */ }
  }, []);
  useEffect(() => { void charger(); }, [charger]);

  const valide = titre.trim().length > 0 && titre.trim().length <= TITRE_MAX && texte.trim().length > 0 && texte.trim().length <= TEXTE_MAX && (cible === 'tous' || programme !== '');
  function modifier() { setConfirmer(false); setMessage(''); setErreur(''); clientId.current = null; }

  async function publier(e: FormEvent) {
    e.preventDefault();
    if (!valide || occupe) return;
    if (!confirmer) { setConfirmer(true); return; }
    clientId.current ??= crypto.randomUUID();
    setOccupe(true); setErreur('');
    const { error } = await supabase.rpc('staff_annonce_publier', { p_client_id: clientId.current, p_titre: titre, p_texte: texte, p_langue: langue, p_cible: cible, p_programme_id: cible === 'programme' ? programme : null });
    setOccupe(false);
    if (error) { setErreur(error.message.includes('Parcours inconnu') ? 'Ce parcours est inconnu. Choisis-en un dans la liste.' : 'L’annonce n’a pas été publiée. Vérifie ta connexion, puis réessaie : elle ne sera pas publiée deux fois.'); return; }
    clientId.current = null; setTitre(''); setTexte(''); setConfirmer(false);
    setMessage('Annonce publiée. Elle apparaît dans la page Notifications des participants concernés.');
    await charger();
  }

  async function retirer(id: string) {
    setOccupe(true); setErreur('');
    const { error } = await supabase.rpc('staff_annonce_retirer', { p_annonce_id: id });
    setOccupe(false); setARetirer(null);
    if (error) { setErreur('L’annonce n’a pas été retirée. Réessaie.'); return; }
    setMessage('Annonce retirée. Elle n’apparaît plus chez les participants.');
    await charger();
  }

  const destinataires = cible === 'tous' ? `tous les participants (${langue === 'en' ? 'anglais' : 'français'})` : `les inscrits du parcours ${programme} (${langue === 'en' ? 'anglais' : 'français'})`;
  return <section className="card admin-annonces" aria-labelledby="annonces-admin">
    <h2 id="annonces-admin">Annonces aux participants</h2>
    <p className="muted">L’annonce s’affiche dans la page Notifications (icône cloche) des participants concernés, pendant 60 jours. Elle n’envoie pas de notification sur le téléphone.</p>
    <form className="admin-annonce-form" onSubmit={publier}>
      <label htmlFor="annonce-titre">Titre</label>
      <input id="annonce-titre" value={titre} maxLength={TITRE_MAX} onChange={e => { setTitre(e.target.value); modifier(); }} />
      <label htmlFor="annonce-texte">Message</label>
      <textarea id="annonce-texte" value={texte} rows={5} maxLength={TEXTE_MAX} onChange={e => { setTexte(e.target.value); modifier(); }} />
      <p className="muted">{texte.trim().length} / {TEXTE_MAX} caractères</p>
      <div className="admin-annonce-choix">
        <label htmlFor="annonce-langue">Langue</label>
        <select id="annonce-langue" value={langue} onChange={e => { setLangue(e.target.value === 'en' ? 'en' : 'fr'); modifier(); }}><option value="fr">Français</option><option value="en">Anglais</option></select>
        <label htmlFor="annonce-cible">Destinataires</label>
        <select id="annonce-cible" value={cible} onChange={e => { setCible(e.target.value === 'programme' ? 'programme' : 'tous'); modifier(); }}><option value="tous">Tous les participants</option><option value="programme">Les inscrits d’un parcours</option></select>
        {cible === 'programme' && <><label htmlFor="annonce-programme">Parcours</label>
          <select id="annonce-programme" value={programme} onChange={e => { setProgramme(e.target.value); modifier(); }}><option value="">Choisir un parcours…</option>{programmes.map(p => <option key={p.programme_id} value={p.programme_id}>{p.nom} — {p.programme_id}</option>)}</select></>}
      </div>
      {confirmer && valide && <p className="admin-annonce-confirmer" role="status">Publier « {titre.trim()} » pour {destinataires} ? Appuie sur « Confirmer l’envoi ».</p>}
      <button type="submit" className="admin-annonce-envoyer" disabled={!valide || occupe}><span aria-hidden="true">➤</span>{occupe ? 'Envoi…' : confirmer ? 'Confirmer l’envoi' : 'Envoyer l’annonce'}</button>
      {!valide && !occupe && <p className="muted admin-annonce-aide">Pour envoyer, écris un titre et un message{cible === 'programme' && !programme ? ', puis choisis un parcours' : ''}.</p>}
      {confirmer && <button type="button" className="link" onClick={modifier}>Annuler</button>}
    </form>
    {message && <p className="success" role="status">{message}</p>}
    {erreur && <p className="error" role="alert">{erreur}</p>}
    <h3>Annonces publiées</h3>
    {erreurListe ? <p className="error" role="alert">La liste des annonces ne peut pas être chargée. <button type="button" className="link" onClick={() => void charger()}>Réessayer</button></p>
      : !liste ? <p className="muted" role="status">Chargement…</p>
      : liste.length === 0 ? <p className="muted">Aucune annonce pour le moment.</p>
      : <ul className="admin-annonces-liste">{liste.map(a => <li key={a.annonce_id}>
          <p><strong>{a.titre}</strong> · {a.langue === 'en' ? 'anglais' : 'français'} · {a.cible === 'tous' ? 'tous' : a.programme_id} · {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(a.publie_le))}{a.retire_le ? ' · retirée' : ''}</p>
          <p className="muted">{a.texte}</p>
          {!a.retire_le && (aRetirer === a.annonce_id
            ? <p>Retirer cette annonce chez tous ses destinataires ? <button type="button" className="link" disabled={occupe} onClick={() => void retirer(a.annonce_id)}>Confirmer le retrait</button> <button type="button" className="link" onClick={() => setARetirer(null)}>Annuler</button></p>
            : <button type="button" className="link" onClick={() => setARetirer(a.annonce_id)}>Retirer</button>)}
        </li>)}</ul>}
  </section>;
}
