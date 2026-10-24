import {AvatarParticipant} from '@/components/AvatarParticipant';
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Icone } from './Icone';
import { IconeJournee } from './IconeJournee';
import { IconeAccueilEspace } from './IconeAccueilEspace';
import { PenseeLivre } from './RepereParcours';

// Version anglaise (?lang=en, test du 23/10/2026) : même carte, la Découverte anglaise en premier, le parcours français en second.
const TEXTES = {
  fr: {
    bonjour: 'Bonjour', pret: 'Ton espace est prêt. Choisis ton premier pas d’enracinement.',
    recommande: 'Parcours recommandé · Gratuit', rythme: 'À ton rythme', ancrage: '7 jours d’ancrage', titre: 'Découverte 7 jours',
    description: ['Découvre le premier principe du livre « Arrête de mendier des miracles » : chercher premièrement le Royaume de Dieu.', 'Pendant sept jours, tu recevras un enseignement court, une action à mettre en pratique et une question pour réfléchir. Ce parcours est commun à tous, quelle que soit la racine choisie au test.'],
    piliers: ['Un enseignement court pour éclairer ta journée', 'Une action concrète à mettre en pratique', 'Une question pour écrire dans ton journal'],
    deroulement: 'Comment se déroule la Découverte ?',
    reperes: ['Le jour 1 s’ouvre dès que tu commences. Une nouvelle journée s’ouvre ensuite chaque jour. Tu peux revenir aux journées déjà ouvertes.', 'Tu n’as pas besoin de tout réussir : tu peux indiquer une action préparée, réalisée en partie ou demander de l’aide. Aucun achat n’est obligatoire.'],
    instant: 'Un instant…', commencer: 'Commencer ma Découverte',
    autre: { langue: 'en' as const, titre: 'English track available', texte: 'A free 7-day journey based on the book “Stop Begging for Miracles”.', bouton: 'Start in English' },
    reglages: 'Mes réglages', reglagesDetail: 'Liaison WhatsApp et code de place offerte.',
  },
  en: {
    bonjour: 'Hello', pret: 'Your space is ready. Choose your first step to take root.',
    recommande: 'Recommended journey · Free', rythme: 'At your own pace', ancrage: '7 days to take root', titre: 'Discovery · 7 days',
    description: ['Discover the first principle of the book “Stop Begging for Miracles”: seek first the Kingdom of God.', 'For seven days, you will receive a short teaching, an action to put into practice and a question to reflect on. This journey is the same for everyone, whatever root you chose in the test.'],
    piliers: ['A short teaching to shed light on your day', 'A practical action to put into practice', 'A question to write about in your journal'],
    deroulement: 'How does the Discovery work?',
    reperes: ['Day 1 opens as soon as you start. A new day then opens each day. You can go back to the days already open.', 'You do not need to get everything right: you can record an action as prepared, partly done, or ask for help. No purchase is required.'],
    instant: 'One moment…', commencer: 'Start my Discovery',
    autre: { langue: 'fr' as const, titre: 'Parcours en français disponible', texte: 'Un parcours gratuit de 7 jours d’après le livre « Arrête de mendier des miracles ».', bouton: 'Commencer en français' },
    reglages: 'My settings', reglagesDetail: 'WhatsApp link and sponsored place code.',
  },
};

/** Accueil de l’espace avant la première inscription à un parcours. */
export function AccueilDecouverte({ prenom, starting, commencer, reglages, footer, langue = 'fr' }: {
  prenom: string; starting: boolean; commencer: (langue: 'fr' | 'en') => void;
  reglages: ReactNode; footer: ReactNode; langue?: string;
}) {
  const l = langue === 'en' ? 'en' : 'fr';
  const t = TEXTES[l];
  return <>
    <header className="decouverte-marque"><span><Icone nom="graine" taille={26} /><strong>SÉNEVÉ</strong></span><Link className="decouverte-avatar" to={langue === 'en' ? '/profil?lang=en' : '/profil'} aria-label={langue === 'en' ? 'My profile' : 'Mon profil'}><AvatarParticipant>{prenom ? prenom.charAt(0).toUpperCase() : 'S'}</AvatarParticipant></Link></header>
    <section className="decouverte-bienvenue"><h1>{prenom ? `${t.bonjour} ${prenom}` : t.bonjour}</h1><p>{t.pret}</p></section>
    <article className="decouverte-carte" aria-labelledby="titre-decouverte">
      <div className="decouverte-meta"><span>{t.recommande}</span><span><IconeJournee nom="schedule" taille={16} />{t.rythme}</span></div>
      <div className="decouverte-illustration"><img src={`${import.meta.env.BASE_URL}illustrations/decouverte-maquette.jpg`} width={512} height={279} alt="" /><span><IconeAccueilEspace nom="spa" taille={18} />{t.ancrage}</span></div>
      <div className="decouverte-description"><h2 id="titre-decouverte">{t.titre}</h2>{t.description.map(p => <p key={p}>{p}</p>)}</div>
      <ul className="decouverte-piliers"><li><IconeAccueilEspace nom="headphones" /><span>{t.piliers[0]}</span></li><li><IconeJournee nom="task_alt" taille={20} /><span>{t.piliers[1]}</span></li><li><IconeJournee nom="edit_note" taille={20} /><span>{t.piliers[2]}</span></li></ul>
      <details className="decouverte-reperes"><summary>{t.deroulement}</summary>{t.reperes.map(p => <p key={p}>{p}</p>)}</details>
      <button type="button" className="decouverte-commencer" disabled={starting} onClick={() => commencer(l)}><span>{starting ? t.instant : t.commencer}</span><IconeJournee nom="arrow_forward" taille={20} /></button>
      <div className="decouverte-anglais" lang={t.autre.langue}><p className="decouverte-anglais-titre"><IconeAccueilEspace nom="translate" taille={16} />{t.autre.titre}</p><p>{t.autre.texte}</p><button type="button" disabled={starting} onClick={() => commencer(t.autre.langue)}>{t.autre.bouton}<IconeAccueilEspace nom="east" taille={18} /></button></div>
    </article>
    <section className="decouverte-citation"><IconeAccueilEspace nom="format_quote" taille={32} /><PenseeLivre langue={l} /></section>
    <details className="decouverte-reglages"><summary><IconeAccueilEspace nom="tune" taille={22} /><span><strong>{t.reglages}</strong><small>{t.reglagesDetail}</small></span><IconeAccueilEspace nom="expand_more" taille={24} /></summary>{reglages}</details>
    {footer}
  </>;
}
