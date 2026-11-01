import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { analyserLienVideo, envoyerImageAnnonce, IMAGE_MAX_SOURCE, lienImageAnnonce, preparerImageAnnonce } from '@/lib/annonces-medias';

type Annonce = { annonce_id: string; titre: string; texte: string; langue: string; cible: string; programme_id: string | null; publie_le: string; retire_le: string | null; image_path?: string | null; video_url?: string | null; sonner?: boolean; fin_le?: string | null; affiche?: boolean; bouton_texte?: string | null; bouton_lien?: string | null; groupe_id?: string | null; affichages?: { vues: number; fermees: number; bouton: number }; envois?: { acceptes: number; en_attente: number; echecs: number } };
type Programme = { programme_id: string; nom: string };
const TITRE_MAX = 120, TEXTE_MAX = 2000, BOUTON_MAX = 40;
/** Pages que le bouton peut ouvrir (la version anglaise reçoit ?lang=en). */
const PAGES_BOUTON: [string, string][] = [['/espace', 'Aujourd’hui'], ['/habitudes', 'Habitudes & Défis'], ['/progres', 'Mon parcours'], ['/bible', 'Bible'], ['/bibliotheque', 'Bibliothèque'], ['/journal', 'Journal']];
function versIso(local: string): string | null { if (!local) return null; const d = new Date(local); return Number.isNaN(d.getTime()) ? null : d.toISOString(); }
function lienAnglais(lien: string): string { return lien.startsWith('/') ? `${lien}${lien.includes('?') ? '&' : '?'}lang=en` : lien; }
const lienWebValide = (l: string) => /^https:\/\/[A-Za-z0-9.-]+\.[A-Za-z]{2,}(\/[A-Za-z0-9/_?=&#%.~+:@-]*)?$/.test(l.trim());

/** Annonces de l'équipe (décision de Dr Justin du 29/10/2026) : visibles dans la page Notifications des participants
 *  concernés (tous, ou les inscrits d'un parcours), dans la langue choisie. Aucun envoi sur le téléphone. */
export function AnnoncesAdministration() {
  const [liste, setListe] = useState<Annonce[] | null>(null);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [erreurListe, setErreurListe] = useState(false);
  const [titre, setTitre] = useState(''), [texte, setTexte] = useState('');
  const [langue, setLangue] = useState<'fr' | 'en' | 'fr+en'>('fr'), [cible, setCible] = useState<'tous' | 'programme'>('tous'), [programme, setProgramme] = useState('');
  const [confirmer, setConfirmer] = useState(false), [occupe, setOccupe] = useState(false);
  const [message, setMessage] = useState(''), [erreur, setErreur] = useState('');
  const [aRetirer, setARetirer] = useState<string | null>(null);
  // Image réduite sur l'appareil, prête à l'envoi ; aperçu local ; lien vidéo saisi.
  const [image, setImage] = useState<Blob | null>(null), [apercu, setApercu] = useState<string | null>(null);
  const [prepImage, setPrepImage] = useState(false), [erreurImage, setErreurImage] = useState('');
  const [video, setVideo] = useState('');
  const [sonner, setSonner] = useState(true);
  // Annonce en anglais (quand « Français et anglais » est choisi), affiche à l'ouverture, bouton, période.
  const [titreEn, setTitreEn] = useState(''), [texteEn, setTexteEn] = useState('');
  const [affiche, setAffiche] = useState(true);
  const [boutonPage, setBoutonPage] = useState(''), [boutonUrl, setBoutonUrl] = useState('');
  const [boutonTexte, setBoutonTexte] = useState(''), [boutonTexteEn, setBoutonTexteEn] = useState('');
  const [debut, setDebut] = useState(''), [fin, setFin] = useState('');
  const clientIdEn = useRef<string | null>(null), groupeId = useRef<string | null>(null);
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
  const avecFr = langue !== 'en', avecEn = langue !== 'fr';
  const [tFr, xFr] = langue === 'en' ? ['', ''] : [titre, texte];
  const [tEn, xEn] = langue === 'en' ? [titre, texte] : [titreEn, texteEn];
  const champsOk = (t: string, x: string) => t.trim().length > 0 && t.trim().length <= TITRE_MAX && x.trim().length > 0 && x.trim().length <= TEXTE_MAX;
  const lienBouton = boutonPage === 'lien' ? boutonUrl.trim() : boutonPage;
  const boutonInvalide = boutonPage !== '' && ((boutonPage === 'lien' && !lienWebValide(boutonUrl))
    || (avecFr && !boutonTexte.trim()) || (avecEn && !(langue === 'en' ? boutonTexte : boutonTexteEn).trim()));
  const debutIso = versIso(debut), finIso = versIso(fin);
  const datesInvalides = (debut !== '' && !debutIso) || (fin !== '' && !finIso) || (!!finIso && new Date(finIso).getTime() <= (debutIso ? new Date(debutIso).getTime() : Date.now()));
  const valide = (!avecFr || champsOk(tFr, xFr)) && (!avecEn || champsOk(tEn, xEn)) && (cible === 'tous' || programme !== '') && !videoInvalide && !prepImage && !boutonInvalide && !datesInvalides;

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
  function modifier() { setConfirmer(false); setMessage(''); setErreur(''); clientId.current = null; clientIdEn.current = null; groupeId.current = null; }

  async function publier(e: FormEvent) {
    e.preventDefault();
    if (!valide || occupe) return;
    if (!confirmer) { setConfirmer(true); return; }
    clientId.current ??= crypto.randomUUID();
    clientIdEn.current ??= crypto.randomUUID();
    groupeId.current ??= langue === 'fr+en' ? crypto.randomUUID() : null;
    setOccupe(true); setErreur('');
    let chemin: string | null = null;
    // L'image est rangée sous l'identifiant de la première annonce (français, ou anglais seul) ; l'autre langue la reprend.
    const premier = avecFr ? clientId.current : clientIdEn.current;
    if (image) {
      try { chemin = await envoyerImageAnnonce(premier, image); }
      catch { setOccupe(false); setErreur('L’image n’a pas pu être envoyée. Vérifie ta connexion, puis réessaie : l’annonce ne sera pas publiée deux fois.'); return; }
    }
    const commun = { p_cible: cible, p_programme_id: cible === 'programme' ? programme : null, p_image_path: chemin, p_video_url: lienVideo ? lienVideo.lien : null,
      p_sonner: sonner, p_debut: debutIso, p_fin: finIso, p_affiche: affiche, p_groupe_id: groupeId.current };
    const envois: { p_client_id: string; p_titre: string; p_texte: string; p_langue: 'fr' | 'en'; p_bouton_texte: string | null; p_bouton_lien: string | null }[] = [];
    if (avecFr) envois.push({ p_client_id: clientId.current, p_titre: tFr, p_texte: xFr, p_langue: 'fr', p_bouton_texte: lienBouton ? boutonTexte : null, p_bouton_lien: lienBouton || null });
    if (avecEn) envois.push({ p_client_id: clientIdEn.current, p_titre: tEn, p_texte: xEn, p_langue: 'en', p_bouton_texte: lienBouton ? (langue === 'en' ? boutonTexte : boutonTexteEn) : null, p_bouton_lien: lienBouton ? lienAnglais(lienBouton) : null });
    let tel = 0, plusTard = 0;
    for (const envoi of envois) {
      const { data, error } = await supabase.rpc('staff_annonce_programmer', { ...commun, ...envoi });
      if (error) {
        setOccupe(false);
        setErreur(error.message.includes('Parcours inconnu') ? 'Ce parcours est inconnu. Choisis-en un dans la liste.'
          : error.message.includes('Lien vidéo invalide') ? 'Ce lien vidéo n’est pas accepté. Colle un lien YouTube ou TikTok.'
          : error.message.includes('Dates invalides') ? 'Les dates ne conviennent pas : le début doit être maintenant ou dans les 90 jours, la fin après le début.'
          : error.message.includes('Bouton invalide') ? 'Le bouton ne convient pas : écris son texte (40 caractères au plus) et choisis une page ou un lien https.'
          : 'L’annonce n’a pas été publiée. Vérifie ta connexion, puis réessaie : elle ne sera pas publiée deux fois.');
        return;
      }
      const res = (data ?? {}) as { telephones?: number; differes?: number };
      tel += Number(res.telephones ?? 0); plusTard += Number(res.differes ?? 0);
    }
    setOccupe(false);
    const maintenant = tel - plusTard;
    const futur = !!debutIso && new Date(debutIso).getTime() > Date.now() + 60_000;
    clientId.current = null; clientIdEn.current = null; groupeId.current = null;
    setTitre(''); setTexte(''); setTitreEn(''); setTexteEn(''); setVideo(''); setImage(null); setApercu(null); setConfirmer(false);
    setBoutonPage(''); setBoutonUrl(''); setBoutonTexte(''); setBoutonTexteEn(''); setDebut(''); setFin('');
    setMessage((futur ? `Annonce programmée pour le ${new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(debutIso!))}. `
        : 'Annonce publiée. ')
      + 'Elle apparaît dans la cloche des participants concernés' + (affiche ? ', et en grand à leur prochaine ouverture de SÉNEVÉ (une seule fois).' : '.')
      + (!sonner ? ' Aucun téléphone ne sonne (case décochée).'
        : tel === 0 ? ' Aucun téléphone ne sonne : aucun participant concerné n’a activé les rappels sur son téléphone.'
        : futur ? ` Elle sonnera sur ${tel} téléphone${tel > 1 ? 's' : ''} à son début (ou à 7 h si c’est la nuit chez le participant).`
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
  const nomLangue = langue === 'fr+en' ? 'français et anglais' : langue === 'en' ? 'anglais' : 'français';
  const destinataires = cible === 'tous' ? `tous les participants (${nomLangue})` : `les inscrits du parcours ${programme} (${nomLangue})`;
  const quand = debutIso && new Date(debutIso).getTime() > Date.now() + 60_000 ? `, à partir du ${new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(debutIso))}` : '';
  const jusqua = finIso ? ` jusqu’au ${new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(finIso))}` : '';
  const etat = (a: Annonce) => a.retire_le ? 'retirée' : new Date(a.publie_le).getTime() > Date.now() ? 'programmée' : a.fin_le && new Date(a.fin_le).getTime() <= Date.now() ? 'terminée' : 'en cours';
  return <section className="card admin-annonces" aria-labelledby="annonces-admin">
    <h2 id="annonces-admin">Annonces aux participants</h2>
    <p className="muted">Une même annonce peut passer par trois endroits : la cloche (page Notifications) des participants concernés, leur téléphone qui sonne (si tu le choisis), et une affiche en grand à leur prochaine ouverture de SÉNEVÉ, une seule fois, qu’ils peuvent fermer à tout moment. Tu peux la programmer et lui donner une fin.</p>
    <form className="admin-annonce-form" onSubmit={publier}>
      <label htmlFor="annonce-langue">Langue</label>
      <select id="annonce-langue" value={langue} onChange={e => { const v = e.target.value; setLangue(v === 'en' ? 'en' : v === 'fr' ? 'fr' : 'fr+en'); modifier(); }}><option value="fr+en">Français et anglais (chacun reçoit sa langue)</option><option value="fr">Français seulement</option><option value="en">Anglais seulement</option></select>
      <label htmlFor="annonce-titre">{langue === 'fr+en' ? 'Titre en français' : 'Titre'}</label>
      <input id="annonce-titre" value={titre} maxLength={TITRE_MAX} onChange={e => { setTitre(e.target.value); modifier(); }} />
      <label htmlFor="annonce-texte">{langue === 'fr+en' ? 'Message en français' : 'Message'}</label>
      <textarea id="annonce-texte" value={texte} rows={5} maxLength={TEXTE_MAX} onChange={e => { setTexte(e.target.value); modifier(); }} />
      <p className="muted">{texte.trim().length} / {TEXTE_MAX} caractères</p>
      {langue === 'fr+en' && <>
        <label htmlFor="annonce-titre-en">Titre en anglais</label>
        <input id="annonce-titre-en" lang="en" value={titreEn} maxLength={TITRE_MAX} onChange={e => { setTitreEn(e.target.value); modifier(); }} />
        <label htmlFor="annonce-texte-en">Message en anglais</label>
        <textarea id="annonce-texte-en" lang="en" value={texteEn} rows={5} maxLength={TEXTE_MAX} onChange={e => { setTexteEn(e.target.value); modifier(); }} />
        <p className="muted">{texteEn.trim().length} / {TEXTE_MAX} caractères</p>
      </>}
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
          : lienVideo ? `Vidéo ${lienVideo.plateforme === 'youtube' ? 'YouTube' : 'TikTok'} reconnue.`
          : 'La vidéo reste sur YouTube ou TikTok : le participant l’ouvre depuis l’annonce, dans l’application YouTube ou TikTok.'}
      </p>
      <div className="admin-annonce-choix">
        <label htmlFor="annonce-cible">Destinataires</label>
        <select id="annonce-cible" value={cible} onChange={e => { setCible(e.target.value === 'programme' ? 'programme' : 'tous'); modifier(); }}><option value="tous">Tous les participants</option><option value="programme">Les inscrits d’un parcours</option></select>
        {cible === 'programme' && <><label htmlFor="annonce-programme">Parcours</label>
          <select id="annonce-programme" value={programme} onChange={e => { setProgramme(e.target.value); modifier(); }}><option value="">Choisir un parcours…</option>{programmes.map(p => <option key={p.programme_id} value={p.programme_id}>{p.nom} — {p.programme_id}</option>)}</select></>}
      </div>
      <fieldset className="admin-annonce-bouton"><legend>Bouton (facultatif)</legend>
        <label htmlFor="annonce-bouton-page">Ouvre</label>
        <select id="annonce-bouton-page" value={boutonPage} onChange={e => { setBoutonPage(e.target.value); modifier(); }}>
          <option value="">Pas de bouton</option>{PAGES_BOUTON.map(([v, n]) => <option key={v} value={v}>{n}</option>)}<option value="lien">Un lien internet (https)</option>
        </select>
        {boutonPage === 'lien' && <><label htmlFor="annonce-bouton-url">Adresse</label>
          <input id="annonce-bouton-url" type="url" inputMode="url" value={boutonUrl} maxLength={500} placeholder="https://…" onChange={e => { setBoutonUrl(e.target.value); modifier(); }} /></>}
        {boutonPage !== '' && <>
          {langue !== 'en' && <><label htmlFor="annonce-bouton-texte">{langue === 'fr+en' ? 'Texte du bouton en français' : 'Texte du bouton'}</label>
            <input id="annonce-bouton-texte" value={boutonTexte} maxLength={BOUTON_MAX} placeholder="Je participe" onChange={e => { setBoutonTexte(e.target.value); modifier(); }} /></>}
          {langue === 'en' && <><label htmlFor="annonce-bouton-texte">Texte du bouton</label>
            <input id="annonce-bouton-texte" lang="en" value={boutonTexte} maxLength={BOUTON_MAX} placeholder="Join" onChange={e => { setBoutonTexte(e.target.value); modifier(); }} /></>}
          {langue === 'fr+en' && <><label htmlFor="annonce-bouton-texte-en">Texte du bouton en anglais</label>
            <input id="annonce-bouton-texte-en" lang="en" value={boutonTexteEn} maxLength={BOUTON_MAX} placeholder="Join" onChange={e => { setBoutonTexteEn(e.target.value); modifier(); }} /></>}
          {boutonInvalide && <p className="error" role="alert">{boutonPage === 'lien' && !lienWebValide(boutonUrl) ? 'Colle une adresse qui commence par https://' : 'Écris le texte du bouton.'}</p>}
        </>}
      </fieldset>
      <fieldset className="admin-annonce-periode"><legend>Période</legend>
        <label htmlFor="annonce-debut">Début (vide = maintenant)</label>
        <input id="annonce-debut" type="datetime-local" value={debut} onChange={e => { setDebut(e.target.value); modifier(); }} />
        <label htmlFor="annonce-fin">Fin (facultatif)</label>
        <input id="annonce-fin" type="datetime-local" value={fin} onChange={e => { setFin(e.target.value); modifier(); }} />
        {datesInvalides && <p className="error" role="alert">La fin doit venir après le début.</p>}
        <p className="muted admin-annonce-aide">Heure de ton appareil. À la fin, l’annonce disparaît de la cloche et de l’affiche.</p>
      </fieldset>
      <label className="admin-annonce-sonner"><input type="checkbox" checked={affiche} onChange={e => { setAffiche(e.target.checked); modifier(); }} /><span>Afficher en grand à l’ouverture de SÉNEVÉ</span></label>
      <p className="muted admin-annonce-aide">Une seule fois par personne, fermable à tout moment. Pas si la personne a déjà lu l’annonce dans la cloche.</p>
      <label className="admin-annonce-sonner"><input type="checkbox" checked={sonner} onChange={e => { setSonner(e.target.checked); modifier(); }} /><span>Faire sonner les téléphones</span></label>
      <p className="muted admin-annonce-aide">Seulement chez les participants concernés qui ont activé les rappels. Entre 21 h et 7 h (heure du participant), le téléphone sonne à 7 h.</p>
      {confirmer && valide && <p className="admin-annonce-confirmer" role="status">Publier « {titre.trim()} »{medias} pour {destinataires}{quand}{jusqua}{affiche ? ', avec l’affiche à l’ouverture' : ''}{sonner ? ', en faisant sonner leurs téléphones' : ', sans faire sonner les téléphones'} ? Appuie sur « Confirmer l’envoi ».</p>}
      <button type="submit" className="admin-annonce-envoyer" disabled={!valide || occupe}><span aria-hidden="true">➤</span>{occupe ? 'Envoi…' : confirmer ? 'Confirmer l’envoi' : 'Envoyer l’annonce'}</button>
      {!valide && !occupe && !videoInvalide && !prepImage && !boutonInvalide && !datesInvalides && <p className="muted admin-annonce-aide">Pour envoyer, écris un titre et un message{langue === 'fr+en' ? ' dans les deux langues' : ''}{cible === 'programme' && !programme ? ', puis choisis un parcours' : ''}.</p>}
      {confirmer && <button type="button" className="link" onClick={modifier}>Annuler</button>}
    </form>
    {message && <p className="success" role="status">{message}</p>}
    {erreur && <p className="error" role="alert">{erreur}</p>}
    <h3>Annonces publiées</h3>
    {erreurListe ? <p className="error" role="alert">La liste des annonces ne peut pas être chargée. <button type="button" className="link" onClick={() => void charger()}>Réessayer</button></p>
      : !liste ? <p className="muted" role="status">Chargement…</p>
      : liste.length === 0 ? <p className="muted">Aucune annonce pour le moment.</p>
      : <ul className="admin-annonces-liste">{liste.map(a => <li key={a.annonce_id}>
          <p><strong>{a.titre}</strong> · {a.langue === 'en' ? 'anglais' : 'français'} · {a.cible === 'tous' ? 'tous' : a.programme_id} · {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(a.publie_le))}{a.fin_le ? ` → ${new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(a.fin_le))}` : ''} · <span className={`admin-annonce-etat is-${etat(a).replace('é', 'e')}`}>{etat(a)}</span>{a.affiche ? ' · affiche' : ''}</p>
          <p className="muted">{a.texte}</p>
          {a.image_path && <img className="admin-annonce-vignette" src={lienImageAnnonce(a.image_path)} alt={`Image de l’annonce « ${a.titre} »`} loading="lazy" />}
          {a.envois && (a.envois.acceptes + a.envois.en_attente + a.envois.echecs > 0) && <p className="muted">Téléphones : {a.envois.acceptes} sonné{a.envois.acceptes > 1 ? 's' : ''}{a.envois.en_attente ? ` · ${a.envois.en_attente} en attente` : ''}{a.envois.echecs ? ` · ${a.envois.echecs} non joignable${a.envois.echecs > 1 ? 's' : ''}` : ''}</p>}
          {a.bouton_texte && a.bouton_lien && <p className="muted">Bouton : « {a.bouton_texte} » → {a.bouton_lien}</p>}
          {a.affiche && a.affichages && <p className="muted">Affiche : vue par {a.affichages.vues} personne{a.affichages.vues > 1 ? 's' : ''} · fermée {a.affichages.fermees} · bouton {a.affichages.bouton}</p>}
          {a.video_url && <p className="muted">Vidéo : <a href={a.video_url} target="_blank" rel="noopener noreferrer">{analyserLienVideo(a.video_url)?.plateforme === 'tiktok' ? 'TikTok' : 'YouTube'}</a></p>}
          {!a.retire_le && (aRetirer === a.annonce_id
            ? <p>Retirer cette annonce chez tous ses destinataires ? <button type="button" className="link" disabled={occupe} onClick={() => void retirer(a.annonce_id)}>Confirmer le retrait</button> <button type="button" className="link" onClick={() => setARetirer(null)}>Annuler</button></p>
            : <button type="button" className="link" onClick={() => setARetirer(a.annonce_id)}>Retirer</button>)}
        </li>)}</ul>}
  </section>;
}
