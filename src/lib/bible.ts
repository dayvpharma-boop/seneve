/** Bible de SÉNEVÉ : textes du domaine public (Louis Segond 1910, World English Bible) publiés par eBible.org,
 *  un fichier JSON par livre dans public/bible/<version>/ (chapitres → versets). Rien n'est réécrit ni résumé.
 *  Surlignages, notes, marque-pages et réglages restent sur ce téléphone (localStorage) : rien n'est envoyé à SÉNEVÉ. */

export type Version = 'lsg' | 'web';
export type Testament = 'at' | 'nt';
type Genre = 'pentateuque' | 'histoire' | 'sagesse' | 'prophetes' | 'evangile' | 'paul' | 'epitre' | 'prophetie';
export type Livre = { code: string; fr: string; en: string; chapitres: number; testament: Testament; genre: Genre };

export const VERSIONS: Record<Version, { nom: string; court: string; langue: 'fr' | 'en'; taille: string }> = {
  lsg: { nom: 'Louis Segond 1910', court: 'LSG 1910', langue: 'fr', taille: '4,2 Mo' },
  web: { nom: 'World English Bible', court: 'WEB', langue: 'en', taille: '3,9 Mo' },
};

const L = (code: string, fr: string, en: string, chapitres: number, testament: Testament, genre: Genre): Livre => ({ code, fr, en, chapitres, testament, genre });
export const LIVRES: readonly Livre[] = [
  L('GEN', 'Genèse', 'Genesis', 50, 'at', 'pentateuque'), L('EXO', 'Exode', 'Exodus', 40, 'at', 'pentateuque'),
  L('LEV', 'Lévitique', 'Leviticus', 27, 'at', 'pentateuque'), L('NUM', 'Nombres', 'Numbers', 36, 'at', 'pentateuque'),
  L('DEU', 'Deutéronome', 'Deuteronomy', 34, 'at', 'pentateuque'), L('JOS', 'Josué', 'Joshua', 24, 'at', 'histoire'),
  L('JDG', 'Juges', 'Judges', 21, 'at', 'histoire'), L('RUT', 'Ruth', 'Ruth', 4, 'at', 'histoire'),
  L('1SA', '1 Samuel', '1 Samuel', 31, 'at', 'histoire'), L('2SA', '2 Samuel', '2 Samuel', 24, 'at', 'histoire'),
  L('1KI', '1 Rois', '1 Kings', 22, 'at', 'histoire'), L('2KI', '2 Rois', '2 Kings', 25, 'at', 'histoire'),
  L('1CH', '1 Chroniques', '1 Chronicles', 29, 'at', 'histoire'), L('2CH', '2 Chroniques', '2 Chronicles', 36, 'at', 'histoire'),
  L('EZR', 'Esdras', 'Ezra', 10, 'at', 'histoire'), L('NEH', 'Néhémie', 'Nehemiah', 13, 'at', 'histoire'),
  L('EST', 'Esther', 'Esther', 10, 'at', 'histoire'), L('JOB', 'Job', 'Job', 42, 'at', 'sagesse'),
  L('PSA', 'Psaumes', 'Psalms', 150, 'at', 'sagesse'), L('PRO', 'Proverbes', 'Proverbs', 31, 'at', 'sagesse'),
  L('ECC', 'Ecclésiaste', 'Ecclesiastes', 12, 'at', 'sagesse'), L('SOL', 'Cantique des cantiques', 'Song of Solomon', 8, 'at', 'sagesse'),
  L('ISA', 'Ésaïe', 'Isaiah', 66, 'at', 'prophetes'), L('JER', 'Jérémie', 'Jeremiah', 52, 'at', 'prophetes'),
  L('LAM', 'Lamentations', 'Lamentations', 5, 'at', 'prophetes'), L('EZE', 'Ézéchiel', 'Ezekiel', 48, 'at', 'prophetes'),
  L('DAN', 'Daniel', 'Daniel', 12, 'at', 'prophetes'), L('HOS', 'Osée', 'Hosea', 14, 'at', 'prophetes'),
  L('JOE', 'Joël', 'Joel', 3, 'at', 'prophetes'), L('AMO', 'Amos', 'Amos', 9, 'at', 'prophetes'),
  L('OBA', 'Abdias', 'Obadiah', 1, 'at', 'prophetes'), L('JON', 'Jonas', 'Jonah', 4, 'at', 'prophetes'),
  L('MIC', 'Michée', 'Micah', 7, 'at', 'prophetes'), L('NAH', 'Nahum', 'Nahum', 3, 'at', 'prophetes'),
  L('HAB', 'Habacuc', 'Habakkuk', 3, 'at', 'prophetes'), L('ZEP', 'Sophonie', 'Zephaniah', 3, 'at', 'prophetes'),
  L('HAG', 'Aggée', 'Haggai', 2, 'at', 'prophetes'), L('ZEC', 'Zacharie', 'Zechariah', 14, 'at', 'prophetes'),
  L('MAL', 'Malachie', 'Malachi', 4, 'at', 'prophetes'),
  L('MAT', 'Matthieu', 'Matthew', 28, 'nt', 'evangile'), L('MAR', 'Marc', 'Mark', 16, 'nt', 'evangile'),
  L('LUK', 'Luc', 'Luke', 24, 'nt', 'evangile'), L('JOH', 'Jean', 'John', 21, 'nt', 'evangile'),
  L('ACT', 'Actes', 'Acts', 28, 'nt', 'histoire'), L('ROM', 'Romains', 'Romans', 16, 'nt', 'paul'),
  L('1CO', '1 Corinthiens', '1 Corinthians', 16, 'nt', 'paul'), L('2CO', '2 Corinthiens', '2 Corinthians', 13, 'nt', 'paul'),
  L('GAL', 'Galates', 'Galatians', 6, 'nt', 'paul'), L('EPH', 'Éphésiens', 'Ephesians', 6, 'nt', 'paul'),
  L('PHI', 'Philippiens', 'Philippians', 4, 'nt', 'paul'), L('COL', 'Colossiens', 'Colossians', 4, 'nt', 'paul'),
  L('1TH', '1 Thessaloniciens', '1 Thessalonians', 5, 'nt', 'paul'), L('2TH', '2 Thessaloniciens', '2 Thessalonians', 3, 'nt', 'paul'),
  L('1TI', '1 Timothée', '1 Timothy', 6, 'nt', 'paul'), L('2TI', '2 Timothée', '2 Timothy', 4, 'nt', 'paul'),
  L('TIT', 'Tite', 'Titus', 3, 'nt', 'paul'), L('PHM', 'Philémon', 'Philemon', 1, 'nt', 'paul'),
  L('HEB', 'Hébreux', 'Hebrews', 13, 'nt', 'epitre'), L('JAM', 'Jacques', 'James', 5, 'nt', 'epitre'),
  L('1PE', '1 Pierre', '1 Peter', 5, 'nt', 'epitre'), L('2PE', '2 Pierre', '2 Peter', 3, 'nt', 'epitre'),
  L('1JO', '1 Jean', '1 John', 5, 'nt', 'epitre'), L('2JO', '2 Jean', '2 John', 1, 'nt', 'epitre'),
  L('3JO', '3 Jean', '3 John', 1, 'nt', 'epitre'), L('JUD', 'Jude', 'Jude', 1, 'nt', 'epitre'),
  L('REV', 'Apocalypse', 'Revelation', 22, 'nt', 'prophetie'),
];

export const GENRES: Record<Genre, { fr: string; en: string }> = {
  pentateuque: { fr: 'Pentateuque', en: 'Pentateuch' }, histoire: { fr: 'Histoire', en: 'History' },
  sagesse: { fr: 'Poésie et sagesse', en: 'Poetry and wisdom' }, prophetes: { fr: 'Prophètes', en: 'Prophets' },
  evangile: { fr: 'Évangile', en: 'Gospel' }, paul: { fr: 'Épître de Paul', en: 'Letter of Paul' },
  epitre: { fr: 'Épître', en: 'Letter' }, prophetie: { fr: 'Prophétie', en: 'Prophecy' },
};

export function livreParCode(code: string | undefined | null): Livre | undefined {
  const c = (code ?? '').toUpperCase();
  return LIVRES.find(l => l.code === c);
}
export function nomLivre(livre: Livre, langue: 'fr' | 'en' = 'fr') { return langue === 'en' ? livre.en : livre.fr; }
export function nomReference(livre: Livre, chapitre: number, verset?: number, langue: 'fr' | 'en' = 'fr') {
  return `${nomLivre(livre, langue)} ${chapitre}${verset ? `:${verset}` : ''}`;
}

/* ---------- Références tapées par la personne (« Mt 6:33 », « 1 Jean 3 », « Psaume 23 ») ---------- */

const compacter = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[\s.'’-]/g, '');
const ALIAS: Record<string, string> = {
  gn: 'GEN', ex: 'EXO', lv: 'LEV', nb: 'NUM', dt: 'DEU', jg: 'JDG', rt: 'RUT', '1s': '1SA', '2s': '2SA', '1r': '1KI', '2r': '2KI',
  ne: 'NEH', jb: 'JOB', ps: 'PSA', psaume: 'PSA', psalm: 'PSA', pr: 'PRO', ec: 'ECC', ct: 'SOL', es: 'ISA', is: 'ISA', isaie: 'ISA',
  jr: 'JER', lm: 'LAM', ez: 'EZE', dn: 'DAN', os: 'HOS', jl: 'JOE', am: 'AMO', ab: 'OBA', jon: 'JON', mi: 'MIC', na: 'NAH',
  ha: 'HAB', so: 'ZEP', ag: 'HAG', za: 'ZEC', ml: 'MAL', mt: 'MAT', mc: 'MAR', mk: 'MAR', lc: 'LUK', lk: 'LUK', jn: 'JOH',
  ac: 'ACT', rm: 'ROM', ga: 'GAL', ep: 'EPH', ph: 'PHI', phil: 'PHI', phm: 'PHM', '1th': '1TH', '2th': '2TH', '1tm': '1TI',
  '2tm': '2TI', tt: 'TIT', he: 'HEB', jc: 'JAM', jas: 'JAM', '1p': '1PE', '2p': '2PE', '1jn': '1JO', '2jn': '2JO', '3jn': '3JO',
  jd: 'JUD', ap: 'REV', rev: 'REV', cantique: 'SOL', song: 'SOL',
};

export function trouverLivre(saisie: string): Livre | undefined {
  const s = compacter(saisie);
  if (s.length < 2) return undefined;
  const alias = ALIAS[s];
  if (alias) return livreParCode(alias);
  const exact = LIVRES.find(l => compacter(l.fr) === s || compacter(l.en) === s || l.code.toLowerCase() === s);
  if (exact) return exact;
  const candidats = LIVRES.filter(l => compacter(l.fr).startsWith(s) || compacter(l.en).startsWith(s));
  return candidats.length === 1 ? candidats[0] : undefined;
}

export type Reference = { livre: Livre; chapitre: number; verset?: number; fin?: number };
export type Analyse =
  | { type: 'aucune' }
  | { type: 'livre'; livre: Livre }
  | { type: 'reference'; ref: Reference }
  | { type: 'chapitre-introuvable'; livre: Livre; chapitre: number };

/** Reconnaît une référence. « aucune » : la saisie se cherche comme des mots. */
export function analyserReference(saisie: string): Analyse {
  const t = saisie.trim();
  const m = /^((?:[1-3]\s*)?[^\d:]+?)\s*(\d{1,3})(?:\s*[:.,]\s*(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?)?$/.exec(t);
  if (!m) {
    const livre = /\d/.test(t) ? undefined : trouverLivre(t);
    return livre && compacter(t).length >= 3 ? { type: 'livre', livre } : { type: 'aucune' };
  }
  const livre = trouverLivre(m[1] ?? '');
  if (!livre) return { type: 'aucune' };
  const chapitre = Number(m[2]);
  if (chapitre < 1 || chapitre > livre.chapitres) return { type: 'chapitre-introuvable', livre, chapitre };
  const verset = m[3] ? Number(m[3]) : undefined;
  const fin = m[4] ? Number(m[4]) : undefined;
  return { type: 'reference', ref: { livre, chapitre, verset, fin } };
}

/* ---------- Chargement des textes ---------- */

export const CACHE_BIBLE = 'seneve-bible-v1';
const urlLivre = (version: Version, code: string) => `${import.meta.env.BASE_URL}bible/${version}/${code}.json`;
const memoire = new Map<string, Promise<string[][]>>();

/** Un livre entier (chapitres → versets). En cas d'échec réseau, la copie téléchargée sur le téléphone sert de secours. */
export function chargerLivre(version: Version, code: string): Promise<string[][]> {
  const cle = `${version}/${code}`;
  const deja = memoire.get(cle);
  if (deja) return deja;
  const url = urlLivre(version, code);
  const promesse = (async () => {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`Texte indisponible (${r.status})`);
      return (await r.json()) as string[][];
    } catch (erreur) {
      if (typeof caches !== 'undefined') {
        const copie = await caches.match(url).catch(() => undefined);
        if (copie) return (await copie.json()) as string[][];
      }
      throw erreur;
    }
  })();
  promesse.catch(() => memoire.delete(cle));
  memoire.set(cle, promesse);
  return promesse;
}

/** Livres de cette version déjà enregistrés sur le téléphone (pour la lecture hors connexion). */
export async function livresTelecharges(version: Version): Promise<string[]> {
  if (typeof caches === 'undefined') return [];
  try {
    const cache = await caches.open(CACHE_BIBLE);
    const presents = await Promise.all(LIVRES.map(async l => ((await cache.match(urlLivre(version, l.code))) ? l.code : null)));
    return presents.filter((c): c is string => c !== null);
  } catch { return []; }
}

/** Enregistre les 66 livres d'une version sur le téléphone, un par un. */
export async function telechargerBible(version: Version, progres: (faits: number) => void): Promise<void> {
  if (typeof caches === 'undefined') throw new Error('Enregistrement indisponible sur ce navigateur');
  const cache = await caches.open(CACHE_BIBLE);
  let faits = 0;
  for (const l of LIVRES) {
    const url = urlLivre(version, l.code);
    if (!(await cache.match(url))) {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`Texte indisponible (${r.status})`);
      await cache.put(url, r);
    }
    progres(++faits);
  }
}

/* ---------- Recherche ---------- */

/** Minuscules sans accents, même longueur que le texte d'origine (les positions restent valables pour surligner). */
export function normaliser(s: string) {
  let r = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i] ?? '';
    r += c === '’' || c === '‘' ? "'" : (c.normalize('NFD')[0] ?? c).toLowerCase();
  }
  return r;
}
export function motsRecherche(requete: string) {
  return normaliser(requete).split(/[\s,;:.!?«»"]+/).filter(m => m.length >= 2);
}
/** Découpe un verset en morceaux, en marquant les mots cherchés. */
export function morceauxSurlignes(texte: string, mots: string[]): { t: string; trouve: boolean }[] {
  const n = normaliser(texte);
  const marques: boolean[] = new Array(texte.length).fill(false);
  for (const mot of mots) {
    for (let i = n.indexOf(mot); i >= 0; i = n.indexOf(mot, i + mot.length)) marques.fill(true, i, i + mot.length);
  }
  const morceaux: { t: string; trouve: boolean }[] = [];
  for (let i = 0; i < texte.length; i++) {
    const dernier = morceaux[morceaux.length - 1];
    if (dernier && dernier.trouve === marques[i]) dernier.t += texte[i];
    else morceaux.push({ t: texte[i] ?? '', trouve: Boolean(marques[i]) });
  }
  return morceaux;
}

export type Resultat = { livre: Livre; chapitre: number; verset: number; texte: string };
/** Livres téléchargés en même temps pendant une recherche (un par un, la première recherche prenait ~35 s). */
export const RECHERCHE_EN_PARALLELE = 6;

/** Cherche des versets contenant tous les mots. Plusieurs livres se téléchargent à la fois, mais ils sont
 *  lus dans l'ordre de la Bible pour garder les résultats en ordre : `etape` donne l'avancement. */
export async function rechercher(version: Version, requete: string, etape: (livresLus: number, resultats: Resultat[]) => void, annule: () => boolean) {
  const mots = motsRecherche(requete);
  const resultats: Resultat[] = [];
  if (mots.length === 0) { etape(LIVRES.length, resultats); return resultats; }
  const charges: Promise<string[][]>[] = [];
  const lancer = (i: number) => { if (i < LIVRES.length && !charges[i]) charges[i] = chargerLivre(version, LIVRES[i]!.code); };
  for (let i = 0; i < RECHERCHE_EN_PARALLELE; i++) lancer(i);
  let lus = 0;
  for (const [i, livre] of LIVRES.entries()) {
    if (annule()) return resultats;
    lancer(i);
    const chapitres = await charges[i]!;
    lancer(i + RECHERCHE_EN_PARALLELE);
    chapitres.forEach((versets, c) => versets.forEach((texte, v) => {
      const n = normaliser(texte);
      if (mots.every(m => n.includes(m))) resultats.push({ livre, chapitre: c + 1, verset: v + 1, texte });
    }));
    etape(++lus, resultats);
  }
  return resultats;
}

/* ---------- Ce qui reste sur ce téléphone ---------- */

function lire<T>(cle: string, defaut: T): T {
  try { const v = window.localStorage.getItem(cle); return v ? (JSON.parse(v) as T) : defaut; } catch { return defaut; }
}
function ecrire(cle: string, valeur: unknown) {
  try { window.localStorage.setItem(cle, JSON.stringify(valeur)); } catch { /* stockage plein ou bloqué : rien n'est conservé */ }
}

export type Couleur = 'or' | 'sauge' | 'ciel' | 'aurore';
export const COULEURS: { id: Couleur; fr: string; en: string }[] = [
  { id: 'or', fr: 'Or clair', en: 'Light gold' }, { id: 'sauge', fr: 'Vert sauge', en: 'Sage green' },
  { id: 'ciel', fr: 'Bleu pâle', en: 'Pale blue' }, { id: 'aurore', fr: 'Rose pâle', en: 'Pale pink' },
];
export type Annotation = { cle: string; livre: string; chapitre: number; verset: number; version: Version; extrait: string; couleur?: Couleur; note?: string; signet?: boolean; modifie: string };
const CLE_ANNOTATIONS = 'seneve:bible:annotations';
export const cleVerset = (livre: string, chapitre: number, verset: number) => `${livre}.${chapitre}.${verset}`;

export function lireAnnotations(): Record<string, Annotation> { return lire<Record<string, Annotation>>(CLE_ANNOTATIONS, {}); }
/** Met à jour l'annotation d'un verset ; elle disparaît quand il ne reste ni couleur, ni note, ni marque-page. */
export function annoter(base: Omit<Annotation, 'cle' | 'modifie'>, changement: Partial<Pick<Annotation, 'couleur' | 'note' | 'signet'>>) {
  const toutes = lireAnnotations();
  const cle = cleVerset(base.livre, base.chapitre, base.verset);
  const suivante: Annotation = { ...toutes[cle], ...base, ...changement, cle, modifie: new Date().toISOString() };
  if (!suivante.couleur) delete suivante.couleur;
  if (!suivante.note?.trim()) delete suivante.note;
  if (!suivante.signet) delete suivante.signet;
  if (!suivante.couleur && !suivante.note && !suivante.signet) delete toutes[cle];
  else toutes[cle] = suivante;
  ecrire(CLE_ANNOTATIONS, toutes);
  return toutes;
}
export function supprimerAnnotation(cle: string) {
  const toutes = lireAnnotations();
  delete toutes[cle];
  ecrire(CLE_ANNOTATIONS, toutes);
  return toutes;
}

export type Interligne = 'compact' | 'confortable' | 'aere';
export type Ambiance = 'ivoire' | 'sepia' | 'nocturne';
export type Reglages = { version: Version; taille: number; interligne: Interligne; ambiance: Ambiance; numeros: boolean };
export const TAILLES = [14, 16, 18, 20, 24] as const;
export const REGLAGES_DEFAUT: Omit<Reglages, 'version'> = { taille: 2, interligne: 'confortable', ambiance: 'ivoire', numeros: true };
export function lireReglages(langue: 'fr' | 'en'): Reglages {
  const r = lire<Partial<Reglages>>('seneve:bible:reglages', {});
  return {
    version: r.version === 'web' || r.version === 'lsg' ? r.version : langue === 'en' ? 'web' : 'lsg',
    taille: typeof r.taille === 'number' && r.taille >= 0 && r.taille < TAILLES.length ? r.taille : REGLAGES_DEFAUT.taille,
    interligne: r.interligne === 'compact' || r.interligne === 'aere' ? r.interligne : 'confortable',
    ambiance: r.ambiance === 'sepia' || r.ambiance === 'nocturne' ? r.ambiance : 'ivoire',
    numeros: r.numeros !== false,
  };
}
export function ecrireReglages(r: Reglages) { ecrire('seneve:bible:reglages', r); }

export type Position = { livre: string; chapitre: number; verset?: number };
export function lireDerniereLecture(): Position | null {
  const p = lire<Position | null>('seneve:bible:derniere', null);
  return p && livreParCode(p.livre) ? p : null;
}
export function noterLecture(p: Position) {
  ecrire('seneve:bible:derniere', p);
  const lus = new Set(lire<string[]>('seneve:bible:lus', []));
  lus.add(`${p.livre}.${p.chapitre}`);
  ecrire('seneve:bible:lus', [...lus]);
}
export function chapitresLus(): Set<string> { return new Set(lire<string[]>('seneve:bible:lus', [])); }

/** Passages des sept racines cités dans le Test des 7 Racines (index de la racine → passage). Les autres restent à confirmer avec le livre. */
export const PASSAGES_RACINES: Record<number, Reference & { fin: number }> = {
  0: { livre: livreParCode('MAT')!, chapitre: 6, verset: 25, fin: 34 },
  1: { livre: livreParCode('MAL')!, chapitre: 3, verset: 10, fin: 12 },
  5: { livre: livreParCode('LUK')!, chapitre: 16, verset: 10, fin: 13 },
};
