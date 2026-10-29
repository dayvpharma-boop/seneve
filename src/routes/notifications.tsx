import { useCallback, useEffect, useState } from 'react';
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
      {e.type === 'annonce' && e.image && <img className="nt-image" src={lienImageAnnonce(e.image)} alt={en ? `Image of the announcement: ${e.titre}` : `Image de l’annonce : ${e.titre}`} loading="lazy" decoding="async" />}
      {e.type === 'annonce' && e.video && <VideoAnnonce lien={e.video} titre={e.titre} en={en} />}
      {lien && <Link to={lien.to}>{lien.label}</Link>}
    </div>
  </li>;
}

/** Vidéo d'une annonce : rien n'est chargé depuis YouTube ou TikTok avant que le participant appuie (données mobiles). */
function VideoAnnonce({ lien, titre, en }: { lien: string; titre: string; en: boolean }) {
  const [ouverte, setOuverte] = useState(false);
  const v = analyserLienVideo(lien);
  if (!v) return null;
  const nom = v.plateforme === 'youtube' ? 'YouTube' : 'TikTok';
  const ouvrir = <a className="nt-video-lien" href={v.lien} target="_blank" rel="noopener noreferrer">{en ? `Open on ${nom}` : `Ouvrir sur ${nom}`}</a>;
  if (!v.integration) return <div className="nt-video">{ouvrir}</div>;
  return <div className="nt-video">
    {ouverte
      ? <div className={`nt-video-cadre${v.verticale ? ' is-verticale' : ''}${v.plateforme === 'tiktok' ? ' is-tiktok' : ''}`}>
          <iframe src={v.integration} title={en ? `Video: ${titre}` : `Vidéo : ${titre}`} loading="lazy" referrerPolicy="strict-origin-when-cross-origin"
            allow="encrypted-media; picture-in-picture; fullscreen" allowFullScreen sandbox="allow-scripts allow-same-origin allow-presentation allow-popups" />
        </div>
      : <button type="button" className="nt-video-lancer" onClick={() => setOuverte(true)}>
          <span aria-hidden="true">▶</span>{en ? `Watch the video (${nom})` : `Regarder la vidéo (${nom})`}
        </button>}
    {ouvrir}
  </div>;
}
