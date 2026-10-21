import type { ReactNode } from 'react';
import { Icone } from './Icone';
import { IconeJournee } from './IconeJournee';
import { IconeAccueilEspace } from './IconeAccueilEspace';
import { PenseeLivre } from './RepereParcours';

/** Accueil de l’espace avant la première inscription à un parcours. */
export function AccueilDecouverte({ prenom, starting, commencer, reglages, footer }: {
  prenom: string; starting: boolean; commencer: (langue: 'fr' | 'en') => void;
  reglages: ReactNode; footer: ReactNode;
}) {
  return <>
    <header className="decouverte-marque"><span><Icone nom="graine" taille={26} /><strong>SÉNEVÉ</strong></span><span className="decouverte-avatar" aria-hidden="true">{prenom ? prenom.charAt(0).toUpperCase() : 'S'}</span></header>
    <section className="decouverte-bienvenue"><h1>{prenom ? `Bonjour ${prenom}` : 'Bonjour'}</h1><p>Ton espace est prêt. Choisis ton premier pas d’enracinement.</p></section>
    <article className="decouverte-carte" aria-labelledby="titre-decouverte">
      <div className="decouverte-meta"><span>Parcours recommandé · Gratuit</span><span><IconeJournee nom="schedule" taille={16} />À ton rythme</span></div>
      <div className="decouverte-illustration"><img src={`${import.meta.env.BASE_URL}illustrations/decouverte-maquette.jpg`} width={512} height={279} alt="" /><span><IconeAccueilEspace nom="spa" taille={18} />7 jours d’ancrage</span></div>
      <div className="decouverte-description"><h2 id="titre-decouverte">Découverte 7 jours</h2><p>Découvre le premier principe du livre « Arrête de mendier des miracles » : chercher premièrement le Royaume de Dieu.</p><p>Pendant sept jours, tu recevras un enseignement court, une action à mettre en pratique et une question pour réfléchir. Ce parcours est commun à tous, quelle que soit la racine choisie au test.</p></div>
      <ul className="decouverte-piliers"><li><IconeAccueilEspace nom="headphones" /><span>Un enseignement court pour éclairer ta journée</span></li><li><IconeJournee nom="task_alt" taille={20} /><span>Une action concrète à mettre en pratique</span></li><li><IconeJournee nom="edit_note" taille={20} /><span>Une question pour écrire dans ton journal</span></li></ul>
      <details className="decouverte-reperes"><summary>Comment se déroule la Découverte ?</summary><p>Le jour 1 s’ouvre dès que tu commences. Une nouvelle journée s’ouvre ensuite chaque jour. Tu peux revenir aux journées déjà ouvertes.</p><p>Tu n’as pas besoin de tout réussir : tu peux indiquer une action préparée, réalisée en partie ou demander de l’aide. Aucun achat n’est obligatoire.</p></details>
      <button type="button" className="decouverte-commencer" disabled={starting} onClick={() => commencer('fr')}><span>{starting ? 'Un instant…' : 'Commencer ma Découverte'}</span><IconeJournee nom="arrow_forward" taille={20} /></button>
      <div className="decouverte-anglais" lang="en"><p className="decouverte-anglais-titre"><IconeAccueilEspace nom="translate" taille={16} />English track available</p><p>A free 7-day journey based on the book « Stop Begging for Miracles ».</p><button type="button" disabled={starting} onClick={() => commencer('en')}>Start in English<IconeAccueilEspace nom="east" taille={18} /></button></div>
    </article>
    <section className="decouverte-citation"><IconeAccueilEspace nom="format_quote" taille={32} /><PenseeLivre langue="fr" /></section>
    <details className="decouverte-reglages"><summary><IconeAccueilEspace nom="tune" taille={22} /><span><strong>Mes réglages</strong><small>Liaison WhatsApp et code de place offerte.</small></span><IconeAccueilEspace nom="expand_more" taille={24} /></summary>{reglages}</details>
    {footer}
  </>;
}
