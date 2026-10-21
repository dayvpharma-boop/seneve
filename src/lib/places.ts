// Places financées (décisions de Dr Justin du 16/10/2026) : Sénevé Continuité, code personnel,
// le financeur ne voit que le nombre de places utilisées.

export type ResultatCode = {
  resultat: 'ok' | 'code_invalide' | 'code_deja_utilise' | 'code_expire' | 'deja_une_place' | 'deja_utilise_par_toi' | 'trop_d_essais';
  mois?: number;
  date_debut?: string;
  commence_maintenant?: boolean;
};

export type Convention = {
  convention_id: string; organisation: string; nb_places: number; mois_par_place: number; valide_jusqu_au: string;
  etat: 'active' | 'close'; note: string | null; cree_le: string; utilisees: number; libres: number; annulees: number;
};

export type CodePlace = { code: string; etat: 'libre' | 'utilise' | 'annule' };

const TEXTES = {
  fr: {
    titre: 'Place offerte',
    intro: 'Une organisation t’a offert une place Sénevé Continuité ? Saisis ici le code reçu.',
    champ: 'Code de place',
    bouton: 'Utiliser ce code',
    attente: 'Un instant…',
    mois: (n: number) => (n > 1 ? `${n} mois offerts` : '1 mois offert'),
    okMaintenant: (n: string) => `C’est fait : ${n}. Ton parcours Sénevé Continuité commence aujourd’hui.`,
    okPlusTard: (n: string, d: string) => `C’est fait : ${n}. Ton prochain mois Sénevé Continuité commencera le ${d}.`,
    code_invalide: 'Ce code n’est pas valable. Vérifie-le et réessaie.',
    code_deja_utilise: 'Ce code a déjà été utilisé.',
    code_expire: 'Ce code n’est plus valable : sa date limite est dépassée.',
    deja_une_place: 'Tu as déjà une place offerte par cette organisation.',
    deja_utilise_par_toi: 'Tu as déjà utilisé ce code : ta place est dans ton espace.',
    trop_d_essais: 'Trop d’essais. Réessaie dans une heure.',
    erreur: 'Le code n’a pas pu être vérifié pour le moment. Réessaie.',
    locale: 'fr-FR',
  },
  en: {
    titre: 'Sponsored place',
    intro: 'Has an organisation offered you a Sénevé Continuité place? Enter the code you received here.',
    champ: 'Place code',
    bouton: 'Use this code',
    attente: 'One moment…',
    mois: (n: number) => (n > 1 ? `${n} months offered` : '1 month offered'),
    okMaintenant: (n: string) => `Done: ${n}. Your Sénevé Continuité journey starts today.`,
    okPlusTard: (n: string, d: string) => `Done: ${n}. Your next Sénevé Continuité month will start on ${d}.`,
    code_invalide: 'This code is not valid. Check it and try again.',
    code_deja_utilise: 'This code has already been used.',
    code_expire: 'This code is no longer valid: its deadline has passed.',
    deja_une_place: 'You already have a place offered by this organisation.',
    deja_utilise_par_toi: 'You have already used this code: your place is in your space.',
    trop_d_essais: 'Too many attempts. Try again in an hour.',
    erreur: 'The code could not be checked right now. Try again.',
    locale: 'en-GB',
  },
} as const;

export function textesPlace(langue: string) { return TEXTES[langue === 'en' ? 'en' : 'fr']; }

/** Message affiché au participant après la saisie d'un code. */
export function messageCode(r: ResultatCode, langue: string): { ok: boolean; texte: string } {
  const T = textesPlace(langue);
  if (r.resultat === 'ok') {
    const n = T.mois(r.mois ?? 1);
    if (r.commence_maintenant || !r.date_debut) return { ok: true, texte: T.okMaintenant(n) };
    const d = new Intl.DateTimeFormat(T.locale, { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${r.date_debut}T00:00:00Z`));
    return { ok: true, texte: T.okPlusTard(n, d) };
  }
  if (r.resultat === 'deja_utilise_par_toi') return { ok: true, texte: T.deja_utilise_par_toi };
  return { ok: false, texte: T[r.resultat] ?? T.erreur };
}

/** Fichier CSV des codes encore libres, à transmettre à l'organisation. */
export function csvCodesLibres(organisation: string, codes: CodePlace[]): string {
  const echappe = (s: string) => `"${s.replace(/"/g, '""')}"`;
  return ['organisation;code', ...codes.filter(c => c.etat === 'libre').map(c => `${echappe(organisation)};${c.code}`)].join('\n');
}
