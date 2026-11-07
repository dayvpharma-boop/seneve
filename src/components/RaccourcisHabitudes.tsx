import { Link } from 'react-router-dom';
import { suiviFinancierActive } from '@/lib/habitudes-configuration';
import { IconeTrait, type SymboleTrait } from '@/components/IconeTrait';

/** Raccourcis du bas de la journée Habitudes & Défis, en liste groupée façon iPhone (05/11/2026) :
 *  tuile de couleur, titre, courte explication, chevron. Les adresses et les libellés restent ceux d'avant. */
export type Raccourci = { cle: string; vers: string; titre: string; detail: string; icone: SymboleTrait; ton: 'bleu' | 'orange' | 'vert' | 'gris' };

export function RaccourcisHabitudes({ titre, liens }: { titre: string; liens: Raccourci[] }) {
  return <nav className="hd-raccourcis" aria-label={titre}>
    <p className="hd-raccourcis-titre" aria-hidden="true">{titre}</p>
    <ul className="hd-raccourcis-liste">
      {liens.map(l => <li key={l.cle}>
        <Link className="hd-raccourci" data-ton={l.ton} to={l.vers} aria-label={l.titre}>
          <span className="hd-raccourci-tuile" aria-hidden="true"><IconeTrait nom={l.icone} taille={18} /></span>
          <span className="hd-raccourci-texte" aria-hidden="true"><strong>{l.titre}</strong><small>{l.detail}</small></span>
          <span className="hd-raccourci-chevron" aria-hidden="true"><IconeTrait nom="chevron" taille={16} /></span>
        </Link>
      </li>)}
    </ul>
  </nav>;
}

export function raccourcisHabitudes(en: boolean, enrollmentId: string, engagements: boolean, horsLigne = false): Raccourci[] {
  const q = en ? '?lang=en' : '';
  const aide: Raccourci = { cle: 'aide', vers: `/habitudes/aide${q}`, titre: en ? 'Help and privacy' : 'Aide et confidentialité', detail: en ? 'Questions and personal data' : 'Questions et données personnelles', icone: 'bouclier', ton: 'gris' };
  if (horsLigne) return [aide];
  return [
    { cle: 'acces', vers: `/habitudes/aujourdhui${q}`, titre: en ? 'My access and schedule' : 'Mon accès et mes horaires', detail: en ? 'Open months and times' : 'Mois ouverts et horaires', icone: 'calendrier', ton: 'bleu' },
    { cle: 'horaires', vers: `/reglages?parcours=${encodeURIComponent(enrollmentId)}${en ? '&lang=en' : ''}`, titre: en ? 'Adjust my habit schedule' : 'Régler mes horaires d’habitudes', detail: en ? 'Wake-up, prayer, reading, bedtime' : 'Réveil, prière, lecture, coucher', icone: 'cloche', ton: 'orange' },
    // Un seul raccourci d'épargne (maquette du 07/11/2026) : avec le suivi, le simulateur est dans « Mon épargne ».
    ...(suiviFinancierActive() ? [] : [{ cle: 'simulateur-epargne', vers: `/habitudes/simulateur-epargne${q}`, titre: en ? 'Savings simulator' : 'Simulateur d’épargne', detail: en ? 'Joy reserve and investing' : 'Réserve de joie et investissement', icone: 'pousse', ton: 'vert' } as Raccourci]),
    ...(suiviFinancierActive() ? [
      { cle: 'epargne', vers: `/habitudes/epargne${q}`, titre: en ? 'My savings' : 'Mon épargne', detail: en ? 'Goals, contributions and progress' : 'Objectifs, versements et progression', icone: 'pousse' as const, ton: 'vert' as const },
      { cle: 'compteurs', vers: `/habitudes/compteurs${q}`, titre: en ? 'My counters' : 'Mes compteurs', detail: en ? 'Tithe, offering, savings, living' : 'Dîme, offrande, épargne, pour vivre', icone: 'calendrier' as const, ton: 'orange' as const },
      { cle: 'dettes', vers: `/habitudes/dettes${q}`, titre: en ? 'My debt tracker' : 'Mon suivi des dettes', detail: en ? 'Balances and repayments' : 'Soldes et remboursements', icone: 'objectif' as const, ton: 'bleu' as const },
    ] : []),
    ...(engagements ? [{ cle: 'engagements', vers: `/habitudes/engagements${q}`, titre: en ? 'My commitments' : 'Mes engagements', detail: en ? 'What you chose to keep' : 'Ce que tu as choisi de tenir', icone: 'objectif' as SymboleTrait, ton: 'vert' as const }] : []),
    aide,
  ];
}
