import { Link } from 'react-router-dom';
import { Icone } from '@/components/Icone';
import type { JourBilan } from '@/lib/progres';

/** Fin d'un parcours, d'après la maquette validée « Parcours accompli » (image app/corrigé/14-ecran) :
 *  le jardin du sénevé en trois étapes, le ruban des jours (réalisés, en partie, non faits) sans reproche,
 *  et un rappel du journal. Les jours restent cliquables pour relire chaque journée. */
const TEXTES = {
  fr: {
    puce: (n: number) => `Parcours accompli · ${n}/${n} jours`,
    acheve: (nom: string) => `Parcours terminé : ${nom}`,
    jardin: 'Le jardin du sénevé',
    compte: (r: number, t: number) => `${r}/${t} action${t > 1 ? 's' : ''} réalisée${r > 1 ? 's' : ''}`,
    bravo: (nom: string) => `Tu as terminé « ${nom} ». Bravo pour ta fidélité.`,
    etapes: ['En terre', 'Germe', 'Enraciné'],
    jour: (n: number) => `J${n}`,
    plage: (a: number, b: number) => (a === b ? `J${a}` : `J${a}–J${b}`),
    etiquetteJour: (n: number, etat: string) => `Jour ${n} : ${etat}`,
    etats: { realisee: 'réalisée', partielle: 'faite en partie', preparee: 'préparée', aucune: 'pas faite' },
    realisees: (n: number) => `${n} étape${n > 1 ? 's' : ''} réalisée${n > 1 ? 's' : ''}`,
    partielles: (n: number) => `${n} faite${n > 1 ? 's' : ''} en partie (sans reproche)`,
    note: 'Il ne fane jamais : une pause ne te fait rien perdre.',
    souvenir: 'Tes réflexions du parcours',
    prive: 'Ton journal est privé : personne de l’équipe ne le lit.',
    relire: 'Relire mes réflexions',
  },
  en: {
    puce: (n: number) => `Journey completed · ${n}/${n} days`,
    acheve: (nom: string) => `Journey completed: ${nom}`,
    jardin: 'The mustard seed garden',
    compte: (r: number, t: number) => `${r}/${t} action${t > 1 ? 's' : ''} completed`,
    bravo: (nom: string) => `You have finished “${nom}”. Well done for your faithfulness.`,
    etapes: ['In the soil', 'Sprouting', 'Rooted'],
    jour: (n: number) => `D${n}`,
    plage: (a: number, b: number) => (a === b ? `D${a}` : `D${a}–D${b}`),
    etiquetteJour: (n: number, etat: string) => `Day ${n}: ${etat}`,
    etats: { realisee: 'completed', partielle: 'partly done', preparee: 'prepared', aucune: 'not done' },
    realisees: (n: number) => `${n} step${n > 1 ? 's' : ''} completed`,
    partielles: (n: number) => `${n} partly done (no blame)`,
    note: 'It never withers: a pause makes you lose nothing.',
    souvenir: 'Your reflections from this journey',
    prive: 'Your journal is private: no one on the team reads it.',
    relire: 'Reread my reflections',
  },
} as const;

export function finParcoursTextes(langue?: string | null) { return TEXTES[langue === 'en' ? 'en' : 'fr']; }

function Jardin() {
  return <svg className="fp-illus" viewBox="0 0 340 130" fill="none" aria-hidden="true" focusable="false">
    <path d="M0 102 C80 94, 160 106, 340 98" stroke="#E8E2D3" strokeLinecap="round" strokeWidth="2" />
    <path d="M0 112 C90 108, 220 116, 340 110" stroke="#DFDACB" strokeLinecap="round" strokeWidth="1.5" />
    <path d="M48 94 C90 70, 130 80, 162 82" stroke="#CAC6C1" strokeDasharray="3 3" strokeWidth="1.2" />
    <path d="M174 78 C215 60, 240 68, 276 60" stroke="#CAC6C1" strokeDasharray="3 3" strokeWidth="1.2" />
    <circle cx="48" cy="95" fill="#755B00" r="4.5" />
    <path d="M48 99 V106 M45 104 L48 99 L51 104" stroke="#755B00" strokeLinecap="round" strokeWidth="1.2" />
    <path d="M168 96 V78" stroke="#584400" strokeLinecap="round" strokeWidth="2" />
    <path d="M168 84 C163 80, 159 81, 157 85" stroke="#755B00" strokeLinecap="round" strokeWidth="1.5" />
    <path d="M168 81 C173 78, 177 80, 179 84" stroke="#755B00" strokeLinecap="round" strokeWidth="1.5" />
    <path d="M168 96 L162 107 M168 96 L168 110 M168 96 L174 107" stroke="#755B00" strokeLinecap="round" strokeWidth="1.2" />
    <circle cx="284" cy="56" fill="#FED977" fillOpacity="0.32" r="30" />
    <circle cx="284" cy="56" fill="#FED977" fillOpacity="0.45" r="20" />
    <path d="M284 96 V40" stroke="var(--fp-tige)" strokeLinecap="round" strokeWidth="2.5" />
    <path d="M284 76 C270 72, 268 62, 275 60 C282 58, 284 72, 284 76 Z" fill="#584400" />
    <path d="M284 66 C298 62, 300 52, 293 50 C286 48, 284 62, 284 66 Z" fill="#584400" />
    <path d="M284 50 C272 46, 271 38, 278 36 C283 35, 284 46, 284 50 Z" fill="#584400" />
    <path d="M284 44 C294 40, 296 32, 290 30 C285 29, 284 40, 284 44 Z" fill="#584400" />
    <circle cx="284" cy="36" fill="#755B00" r="2.5" />
    <path d="M284 96 L273 115 M284 96 L280 120 M284 96 L288 120 M284 96 L295 114" stroke="var(--fp-tige)" strokeLinecap="round" strokeWidth="1.5" />
  </svg>;
}

export function FinParcours({ nom, total, jours, langue, jourChoisi, onChoisir, nomJour }: {
  nom: string; total: number; jours: JourBilan[]; langue?: string | null; jourChoisi?: number; onChoisir?: (jour: number) => void;
  /** Nom accessible d'un jour, le même que celui des tuiles de l'écran « Aujourd'hui ». */
  nomJour?: (jour: number, fait: boolean) => string;
}) {
  const T = finParcoursTextes(langue);
  const realisees = jours.filter(j => j.etat === 'realisee').length;
  const partielles = jours.filter(j => j.etat === 'partielle' || j.etat === 'preparee').length;
  const avecAction = jours.filter(j => j.etat !== null).length || total;
  const milieu = Math.max(2, Math.floor(total / 2));
  return <section className="fp-carte" aria-label={T.jardin}>
    <div className="fp-ligne"><p className="fp-etiquette">{T.jardin}</p><span className="fp-compte">{T.compte(realisees, avecAction)}</span></div>
    <h2 className="fp-titre">{T.bravo(nom)}</h2>
    <div className="fp-scene">
      <Jardin />
      <div className="fp-etapes" aria-hidden="true">
        <div><b>{T.jour(1)}</b><span>{T.etapes[0]}</span></div>
        <div><b>{T.plage(2, milieu)}</b><span>{T.etapes[1]}</span></div>
        <div className="is-fin"><b>{T.plage(milieu + 1, total)}</b><span>{T.etapes[2]}</span></div>
      </div>
    </div>
    <div className={total > 14 ? 'fp-ruban is-compact' : 'fp-ruban'} style={{ gridTemplateColumns: `repeat(${Math.min(total, 7)}, 1fr)` }}>
      {jours.map(j => {
        const etat = j.etat === 'realisee' ? 'realisee' : j.etat === 'partielle' || j.etat === 'preparee' ? j.etat : 'aucune';
        const dernier = j.jour === total && etat === 'realisee';
        const classe = ['fp-jour', `is-${etat}`, dernier && 'is-dernier', jourChoisi === j.jour && 'is-choisi'].filter(Boolean).join(' ');
        return <button type="button" key={j.jour} className={classe} aria-label={nomJour ? nomJour(j.jour, etat === 'realisee') : T.etiquetteJour(j.jour, T.etats[etat])} title={T.etiquetteJour(j.jour, T.etats[etat])} aria-pressed={jourChoisi === j.jour} onClick={() => onChoisir?.(j.jour)}>
          <span className="fp-case">{etat === 'realisee' ? <Icone nom={dernier ? 'verifie' : 'valide'} taille={16} /> : etat === 'aucune' ? null : <Icone nom="sablier" taille={16} />}</span>
          <span className="fp-num">{T.jour(j.jour)}</span>
        </button>;
      })}
    </div>
    <div className="fp-legende">
      <span><i className="fp-pastille is-realisee" />{T.realisees(realisees)}</span>
      {partielles > 0 && <span><i className="fp-pastille is-partielle" />{T.partielles(partielles)}</span>}
    </div>
    <p className="fp-mot">{T.note}</p>
  </section>;
}

/** Rappel du journal en fin de parcours (maquette « Mémoire intime », avec la vraie règle de confidentialité). */
export function FinParcoursJournal({ langue }: { langue?: string | null }) {
  const T = finParcoursTextes(langue);
  return <section className="fp-souvenir" aria-label={T.souvenir}>
    <p className="fp-souvenir-titre"><Icone nom="souvenir" taille={20} />{T.souvenir}</p>
    <p>{T.prive}</p>
    <Link className="fp-relire" to="/journal"><Icone nom="livre" taille={18} />{T.relire}</Link>
  </section>;
}
