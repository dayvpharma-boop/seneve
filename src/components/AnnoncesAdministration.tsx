import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { analyserLienVideo, envoyerImageAnnonce, IMAGE_MAX_SOURCE, lienImageAnnonce, preparerImageAnnonce } from '@/lib/annonces-medias';

type Annonce = { annonce_id: string; titre: string; texte: string; langue: string; cible: string; programme_id: string | null; publie_le: string; retire_le: string | null; image_path?: string | null; video_url?: string | null; sonner?: boolean; envois?: { acceptes: number; en_attente: number; echecs: number } };
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
  // Image réduite sur l'appareil, prête à l'envoi ; aperçu local ; lien vidéo saisi.
  const [image, setImage] = useState<Blob | null>(null), [apercu, setApercu] = useState<string | null>(null);
  const [prepImage, setPrepImage] = useState(false), [erreurImage, setErreurImage] = useState('');
  const [video, setVideo] = useState('');
  const [sonner, setSonner] = useState(true);
  const champImage = useRef<HTMLInputElement | null>(null);
  useEffect(() => () => { if (apercu) URL.revokeObjectURL(apercu); }, [apercu]);
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

  const lienVideo = analyserLienVideo(video);
  const videoInvalide = video.trim() !== '' && !lienVideo;
  const valide = titre.trim().length > 0 && titre.trim().length <= TITRE_MAX && texte.trim().length > 0 && texte.trim().length <= TEXTE_MAX && (cible === 'tous' || programme !== '') && !videoInvalide && !prepImage;

  async function choisirImage(fichier: File | undefined) {
    modifier(); setErreurImage('');
    if (!fichier) return;
    if (fichier.size > IMAGE_MAX_SOURCE) { setErreurImage('Cette image est trop lourde (20 Mo au plus).'); return; }
    setPrepImage(true);
    try {
      const pret = await preparerImageAnnonce(fichier);
      setImage(pret); setApercu(URL.createObjectURL(pret));
    } catch { setErreurImage('Cette image ne peut pas être utilisée. Choisis une photo JPEG, PNG ou WebP.'); }
    finally { setPrepImage(false); if (champImage.current) champImage.current.value = ''; }
  }
  function retirerImage() { modifier(); setImage(null); setApercu(null); setErreurImage(''); }
  function modifier() { setConfirmer(false); setMessage(''); setErreur(''); clientId.current = null; }

  async function publier(e: FormEvent) {
    e.preventDefault();
    if (!valide || occupe) return;
    if (!confirmer) { setConfirmer(true); return; }
    clientId.current ??= crypto.randomUUID();
    setOccupe(true); setErreur('');
    let chemin: string | null = null;
    if (image) {
      try { chemin = await envoyerImageAnnonce(clientId.current, image); }
      catch { setOccupe(false); setErreur('L’image n’a pas pu être envoyée. Vérifie ta connexion, puis réessaie : l’annonce ne sera pas publiée deux fois.'); return; }
    }
    const { data, error } = await supabase.rpc('staff_annonce_publier', { p_client_id: clientId.current, p_titre: titre, p_texte: texte, p_langue: langue, p_cible: cible, p_programme_id: cible === 'programme' ? programme : null, p_image_path: chemin, p_video_url: lienVideo ? lienVideo.lien : null, p_sonner: sonner });
    setOccupe(false);
    if (error) { setErreur(error.message.includes('Parcours inconnu') ? 'Ce parcours est inconnu. Choisis-en un dans la liste.' : error.message.includes('Lien vidéo invalide') ? 'Ce lien vidéo n’est pas accepté. Colle un lien YouTube ou TikTok.' : 'L’annonce n’a pas été publiée. Vérifie ta connexion, puis réessaie : elle ne sera pas publiée deux fois.'); return; }
    const res = (data ?? {}) as { telephones?: number; differes?: number };
    const tel = Number(res.telephones ?? 0), plusTard = Number(res.differes ?? 0), maintenant = tel - plusTard;
    clientId.current = null; setTitre(''); setTexte(''); setVideo(''); setImage(null); setApercu(null); setConfirmer(false);
    setMessage('Annonce publiée. Elle apparaît dans la page Notifications des participants concernés.'
      + (!sonner ? ' Aucun téléphone ne sonne (case décochée).'
        : tel === 0 ? ' Aucun téléphone ne sonne : aucun participant concerné n’a activé les rappels sur son téléphone.'
        : ` Elle sonne sur ${maintenant} téléphone${maintenant > 1 ? 's' : ''} maintenant${plusTard ? `, et sur ${plusTard} autre${plusTard > 1 ? 's' : ''} à 7 h (heure du participant)` : ''}.`));
    setSonner(true);
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

  const medias = image && lienVideo ? ' avec son image et sa vidéo' : image ? ' avec son image' : lienVideo ? ' avec sa vidéo' : '';
  const destinataires = cible === 'tous' ? `tous les participants (${langue === 'en' ? 'anglais' : 'français'})` : `les inscrits du parcours ${programme} (${langue === 'en' ? 'anglais' : 'français'})`;
  return <section className="card admin-annonces" aria-labelledby="annonces-admin">
    <h2 id="annonces-admin">Annonces aux participants</h2>
    <p className="muted">L’annonce s’affiche dans la page Notifications (icône cloche) des participants concernés, pendant 60 jours. Elle n’envoie pas de notification sur le téléphone. Tu peux y joindre une image et un lien vidéo YouTube ou TikTok.</p>
    <form className="admin-annonce-form" onSubmit={publier}>
      <label htmlFor="annonce-titre">Titre</label>
      <input id="annonce-titre" value={titre} maxLength={TITRE_MAX} onChange={e => { setTitre(e.target.value); modifier(); }} />
      <label htmlFor="annonce-texte">Message</label>
      <textarea id="annonce-texte" value={texte} rows={5} maxLength={TEXTE_MAX} onChange={e => { setTexte(e.target.value); modifier(); }} />
      <p className="muted">{texte.trim().length} / {TEXTE_MAX} caractères</p>
      <label htmlFor="annonce-image">Image (facultatif)</label>
      {apercu ? <div className="admin-annonce-apercu">
          <img src={apercu} alt="Aperçu de l’image de l’annonce" />
          <button type="button" className="link" onClick={retirerImage}>Retirer l’image</button>
        </div>
        : <input id="annonce-image" ref={champImage} type="file" accept="image/jpeg,image/png,image/webp" disabled={prepImage} onChange={e => void choisirImage(e.target.files?.[0])} />}
      {prepImage && <p className="muted" role="status">Préparation de l’image…</p>}
      {erreurImage && <p className="error" role="alert">{erreurImage}</p>}
      {!apercu && !prepImage && <p className="muted admin-annonce-aide">Photo JPEG, PNG ou WebP. Elle est réduite avant l’envoi pour rester légère.</p>}
      <label htmlFor="annonce-video">Lien vidéo YouTube ou TikTok (facultatif)</label>
      <input id="annonce-video" type="url" inputMode="url" value={video} maxLength={500} placeholder="https://www.youtube.com/watch?v=…" aria-describedby="annonce-video-etat" onChange={e => { setVideo(e.target.value); modifier(); }} />
      <p id="annonce-video-etat" className={videoInvalide ? 'error' : 'muted admin-annonce-aide'} role={videoInvalide ? 'alert' : undefined}>
        {videoInvalide ? 'Ce lien n’est pas reconnu. Colle un lien qui commence par https://www.youtube.com, https://youtu.be ou https://www.tiktok.com.'
          : lienVideo ? `Vidéo ${lienVideo.plateforme === 'youtube' ? 'YouTube' : 'TikTok'} reconnue.${lienVideo.integration ? '' : ' Elle s’ouvrira dans TikTok.'}`
          : 'La vidéo reste sur YouTube ou TikTok ; le participant la regarde depuis l’annonce.'}
      </p>
      <div className="admin-annonce-choix">
        <label htmlFor="annonce-langue">Langue</label>
        <select id="annonce-langue" value={langue} onChange={e => { setLangue(e.target.value === 'en' ? 'en' : 'fr'); modifier(); }}><option value="fr">Français</option><option value="en">Anglais</option></select>
        <label htmlFor="annonce-cible">Destinataires</label>
        <select id="annonce-cible" value={cible} onChange={e => { setCible(e.target.value === 'programme' ? 'programme' : 'tous'); modifier(); }}><option value="tous">Tous les participants</option><option value="programme">Les inscrits d’un parcours</option></select>
        {cible === 'programme' && <><label htmlFor="annonce-programme">Parcours</label>
          <select id="annonce-programme" value={programme} onChange={e => { setProgramme(e.target.value); modifier(); }}><option value="">Choisir un parcours…</option>{programmes.map(p => <option key={p.programme_id} value={p.programme_id}>{p.nom} — {p.programme_id}</option>)}</select></>}
      </div>
      <label className="admin-annonce-sonner"><input type="checkbox" checked={sonner} onChange={e => { setSonner(e.target.checked); modifier(); }} /><span>Faire sonner les téléphones</span></label>
      <p className="muted admin-annonce-aide">Seulement chez les participants concernés qui ont activé les rappels. Entre 21 h et 7 h (heure du participant), le téléphone sonne à 7 h.</p>
      {confirmer && valide && <p className="admin-annonce-confirmer" role="status">Publier « {titre.trim()} »{medias} pour {destinataires}{sonner ? ', en faisant sonner leurs téléphones' : ', sans faire sonner les téléphones'} ? Appuie sur « Confirmer l’envoi ».</p>}
      <button type="submit" className="admin-annonce-envoyer" disabled={!valide || occupe}><span aria-hidden="true">➤</span>{occupe ? 'Envoi…' : confirmer ? 'Confirmer l’envoi' : 'Envoyer l’annonce'}</button>
      {!valide && !occupe && !videoInvalide && !prepImage && <p className="muted admin-annonce-aide">Pour envoyer, écris un titre et un message{cible === 'programme' && !programme ? ', puis choisis un parcours' : ''}.</p>}
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
          {a.image_path && <img className="admin-annonce-vignette" src={lienImageAnnonce(a.image_path)} alt={`Image de l’annonce « ${a.titre} »`} loading="lazy" />}
          {a.envois && (a.envois.acceptes + a.envois.en_attente + a.envois.echecs > 0) && <p className="muted">Téléphones : {a.envois.acceptes} sonné{a.envois.acceptes > 1 ? 's' : ''}{a.envois.en_attente ? ` · ${a.envois.en_attente} en attente` : ''}{a.envois.echecs ? ` · ${a.envois.echecs} non joignable${a.envois.echecs > 1 ? 's' : ''}` : ''}</p>}
          {a.video_url && <p className="muted">Vidéo : <a href={a.video_url} target="_blank" rel="noopener noreferrer">{analyserLienVideo(a.video_url)?.plateforme === 'tiktok' ? 'TikTok' : 'YouTube'}</a></p>}
          {!a.retire_le && (aRetirer === a.annonce_id
            ? <p>Retirer cette annonce chez tous ses destinataires ? <button type="button" className="link" disabled={occupe} onClick={() => void retirer(a.annonce_id)}>Confirmer le retrait</button> <button type="button" className="link" onClick={() => setARetirer(null)}>Annuler</button></p>
            : <button type="button" className="link" onClick={() => setARetirer(a.annonce_id)}>Retirer</button>)}
        </li>)}</ul>}
  </section>;
}
