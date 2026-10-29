import { useCallback, useEffect, useRef, useState } from 'react';
import { analyserLienVideo, lienImageAnnonce } from '@/lib/annonces-medias';
import { Link, useSearchParams } from 'react-router-dom';
import { ComptePrive } from '@/components/ComptePrive';
import { BarreNav } from '@/components/BarreNav';
import { IconeNotification, type SymboleNotification } from '@/components/IconeNotification';
import { CarteHorsConnexion, langueSansDonnees } from '@/components/HorsConnexion';
import { useEnLigne } from '@/lib/hors-ligne';
import { chargerNotifications, marquerNotificationsVues, NOMS_HABITUDES, TEXTES_MOMENTS, type ElementNotification, type Notifications as Liste } from '@/lib/notifications';

export function Notifications() {
  return <ComptePrive enfants={userId => <NotificationsDuCompte key={userId} />} />;
}

function NotificationsDuCompte() {
  const [params] = useSearchParams();
  const langue = langueSansDonnees(params), en = langue === 'en';
  const enLigne = useEnLigne();
  const [data, setData] = useState<Liste | null>(null);
  const [echec, setEchec] = useState(false);
  const charger = useCallback(async () => {
    setEchec(false);
    try {
      const d = await chargerNotifications(60);
      setData(d);
      // Ce qui vient d'être affiché est vu ; un échec garde simplement la pastille.
      void marquerNotificationsVues().catch(() => undefined);
    } catch { setEchec(true); }
  }, []);
  useEffect(() => { void charger(); }, [charger, enLigne]);
  useEffect(() => { document.title = `Notifications — SÉNEVÉ`; document.documentElement.lang = langue; }, [langue]);

  const tete = <header className="nt-tete">
    <Link to={en ? '/espace?lang=en' : '/espace'} aria-label={en ? 'Back to my day' : 'Revenir à ma journée'}><IconeNotification nom="arrow_back_ios_new" taille={20} /></Link>
    <h1>Notifications</h1>
  </header>;
  const pied = <BarreNav langue={langue} maquette iconesJournee />;

  if (echec && !data && !enLigne) return <main className="wrap avec-nav nt-page">{tete}<CarteHorsConnexion langue={langue} texte={en ? 'Your notifications need a connection. Reminders already received stay on your phone.' : 'Tes notifications demandent une connexion. Les rappels déjà reçus restent sur ton téléphone.'} reessayer={() => void charger()} />{pied}</main>;
  if (echec && !data) return <main className="wrap avec-nav nt-page">{tete}<div className="card"><p role="alert">{en ? 'Your notifications cannot be loaded right now.' : 'Tes notifications ne peuvent pas être chargées pour le moment.'}</p><button type="button" className="btn action-btn" onClick={() => void charger()}>{en ? 'Try again' : 'Réessayer'}</button></div>{pied}</main>;
  if (!data) return <main className="wrap avec-nav nt-page">{tete}<p className="muted" role="status">{en ? 'Loading…' : 'Chargement…'}</p>{pied}</main>;

  const messages = data.elements.filter(e => e.type === 'annonce' || e.type === 'reponse');
  const rappels = data.elements.filter(e => e.type === 'rappel_moment' || e.type === 'rappel_habitude');
  const nouveau = (e: ElementNotification & { nouveau?: boolean }) => e.nouveau === true;
  return <main className="wrap avec-nav nt-page">{tete}
    <section className="nt-section" aria-labelledby="nt-messages">
      <h2 id="nt-messages">{en ? 'Messages from the team' : 'Messages de l’équipe'}</h2>
      {messages.length ? <ul className="nt-liste">{messages.map(e => <Element key={e.type + e.id} e={e} en={en} nouveau={nouveau(e)} />)}</ul>
        : <p className="nt-vide">{en ? 'No message yet. Announcements from the SÉNEVÉ team and answers to your help requests will appear here.' : 'Aucun message pour le moment. Les annonces de l’équipe SÉNEVÉ et les réponses à tes demandes d’aide apparaîtront ici.'}</p>}
    </section>
    <section className="nt-section" aria-labelledby="nt-rappels">
      <h2 id="nt-rappels">{en ? 'Reminders received' : 'Rappels reçus'}</h2>
      {rappels.length ? <ul className="nt-liste">{rappels.map(e => <Element key={e.type + e.id} e={e} en={en} nouveau={nouveau(e)} />)}</ul>
        : <p className="nt-vide">{en ? 'No reminder in the last 60 days. You can turn reminders on in your profile and settings.' : 'Aucun rappel ces 60 derniers jours. Tu peux activer les rappels dans ton profil et tes réglages.'}</p>}
    </section>
    <p className="nt-note">{en ? 'Last 60 days. Reminders are listed once accepted by your phone’s notification service.' : '60 derniers jours. Un rappel est listé dès qu’il a été accepté par le service de notifications du téléphone.'}</p>
    {pied}
  </main>;
}

function Element({ e, en, nouveau }: { e: ElementNotification; en: boolean; nouveau: boolean }) {
  const date = new Intl.DateTimeFormat(en ? 'en-GB' : 'fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(new Date(e.date));
  let icone: SymboleNotification = 'notifications', titre = '', texte = '', lien: { to: string; label: string } | null = null;
  if (e.type === 'annonce') { icone = 'campaign'; titre = e.titre; texte = e.texte; }
  else if (e.type === 'reponse') { icone = 'support_agent'; titre = en ? 'The team answered you' : 'L’équipe t’a répondu'; texte = e.texte; lien = { to: en ? '/aide?lang=en' : '/aide', label: en ? 'Open my help requests' : 'Ouvrir mes demandes d’aide' }; }
  else if (e.type === 'rappel_moment') { icone = 'alarm'; titre = en ? `${e.moment === 'midi' ? 'Midday' : e.moment === 'soir' ? 'Evening' : 'Morning'} reminder` : `Rappel du ${e.moment === 'midi' ? 'midi' : e.moment === 'soir' ? 'soir' : 'matin'}`; texte = TEXTES_MOMENTS[en ? 'en' : 'fr'][e.moment] ?? ''; lien = { to: en ? '/espace?lang=en' : '/espace', label: en ? 'Open my day' : 'Ouvrir ma journée' }; }
  else { icone = 'alarm'; const nom = e.habit_key ? NOMS_HABITUDES[e.habit_key]?.[en ? 1 : 0] : undefined; titre = nom ?? (en ? 'Scheduled activity' : 'Activité prévue'); texte = en ? `It was time for: ${titre}.` : `C’était l’heure : ${titre}.`; lien = { to: `/habitudes/aujourdhui${en ? '?lang=en' : ''}`, label: en ? 'Open my habits' : 'Ouvrir mes habitudes' }; }
  return <li className={`nt-element is-${e.type}${nouveau ? ' is-nouveau' : ''}`}>
    <span className="nt-icone" aria-hidden="true"><IconeNotification nom={icone} taille={22} /></span>
    <div className="nt-corps">
      <p className="nt-titre">{nouveau && <span className="nt-badge">{en ? 'New' : 'Nouveau'}</span>}{titre}</p>
      <time dateTime={e.date}>{date}</time>
      {texte && <p className="nt-texte">{texte}</p>}
      {e.type === 'annonce' && e.image && <ImageAnnonce src={lienImageAnnonce(e.image)} titre={e.titre} en={en} />}
      {e.type === 'annonce' && e.video && <VideoAnnonce lien={e.video} titre={e.titre} en={en} />}
      {lien && <Link to={lien.to}>{lien.label}</Link>}
    </div>
  </li>;
}

/** Image d'une annonce : un appui l'affiche en plein écran ; « Fermer » ou la touche Échap revient à la liste. */
function ImageAnnonce({ src, titre, en }: { src: string; titre: string; en: boolean }) {
  const [grande, setGrande] = useState(false);
  const fermer = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (!grande) return;
    fermer.current?.focus();
    const touche = (ev: KeyboardEvent) => { if (ev.key === 'Escape') setGrande(false); };
    window.addEventListener('keydown', touche);
    const avant = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', touche); document.body.style.overflow = avant; };
  }, [grande]);
  const alt = en ? `Image of the announcement: ${titre}` : `Image de l’annonce : ${titre}`;
  return <>
    <button type="button" className="nt-image-bouton" onClick={() => setGrande(true)} aria-label={en ? `Enlarge the image: ${titre}` : `Agrandir l’image : ${titre}`}>
      <img className="nt-image" src={src} alt={alt} loading="lazy" decoding="async" />
    </button>
    {grande && <div className="nt-image-plein" role="dialog" aria-modal="true" aria-label={alt} onClick={() => setGrande(false)}>
      <img src={src} alt={alt} onClick={ev => ev.stopPropagation()} />
      <button type="button" ref={fermer} className="nt-image-fermer" onClick={() => setGrande(false)}>{en ? 'Close' : 'Fermer'}</button>
    </div>}
  </>;
}

/** Vidéo d'une annonce : YouTube et TikTok bloquent souvent la lecture intégrée à un autre site (vérification
 *  « je ne suis pas un robot », vidéo non intégrable ; constaté le 29/10/2026). La vidéo s'ouvre donc dans
 *  l'application YouTube ou TikTok du téléphone, ou dans le navigateur. Rien n'est chargé chez YouTube avant l'appui,
 *  sauf la miniature. */
function VideoAnnonce({ lien, titre, en }: { lien: string; titre: string; en: boolean }) {
  const v = analyserLienVideo(lien);
  if (!v) return null;
  const nom = v.plateforme === 'youtube' ? 'YouTube' : 'TikTok';
  const libelle = en ? `Watch the video on ${nom}` : `Regarder la vidéo sur ${nom}`;
  return <a className={`nt-video${v.vignette ? ' a-vignette' : ''}`} href={v.lien} target="_blank" rel="noopener noreferrer" aria-label={`${libelle} : ${titre}`}>
    {v.vignette && <span className="nt-video-vignette"><img src={v.vignette} alt="" loading="lazy" decoding="async" /><span className="nt-video-play" aria-hidden="true">▶</span></span>}
    <span className="nt-video-lancer"><span aria-hidden="true">▶</span>{libelle}</span>
  </a>;
}
