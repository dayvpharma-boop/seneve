import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { BarreNav } from '@/components/BarreNav';
import { IconeBible as I } from '@/components/IconeBible';
import { texts } from '@/lib/test-texts';
import {
  COULEURS, GENRES, LIVRES, PASSAGES_RACINES, REGLAGES_DEFAUT, TAILLES, VERSIONS, analyserReference, annoter, chapitresLus,
  chargerLivre, cleVerset, ecrireReglages, livreParCode, livresTelecharges, lireAnnotations, lireDerniereLecture, lireReglages,
  morceauxSurlignes, motsRecherche, nomLivre, nomReference, noterLecture, rechercher, telechargerBible,
  type Annotation, type Couleur, type Livre, type Reglages, type Resultat, type Testament, type Version,
} from '@/lib/bible';

/** Bible de SÉNEVÉ, d'après les maquettes Stitch du 22/10/2026 (accueil, livres, lecture, actions sur un verset, note,
 *  recherche, annotations, réglages, chargement, hors connexion, référence introuvable, aucun résultat).
 *  Le texte vient seulement des fichiers Louis Segond 1910 / World English Bible : aucun verset n'est écrit à la main ici,
 *  sauf les deux citations vérifiées mot pour mot (Matthieu 24:35 et 1 Pierre 1:25). */

type Langue = 'fr' | 'en';
function useLangue() {
  const [params] = useSearchParams();
  const langue: Langue = params.get('lang') === 'en' ? 'en' : 'fr';
  const t = useCallback((fr: string, en: string) => (langue === 'en' ? en : fr), [langue]);
  const lien = useCallback((chemin: string, extra?: Record<string, string>) => {
    const p = new URLSearchParams(extra);
    if (langue === 'en') p.set('lang', 'en');
    const q = p.toString();
    return q ? `${chemin}?${q}` : chemin;
  }, [langue]);
  return { langue, t, lien };
}
function useTitre(titre: string, langue: Langue) {
  useEffect(() => { document.title = `${titre} — SÉNEVÉ`; document.documentElement.lang = langue; }, [titre, langue]);
}
function useReglages(langue: Langue) {
  const [reglages, setReglages] = useState(() => lireReglages(langue));
  const changer = useCallback((r: Reglages) => { ecrireReglages(r); setReglages(r); }, []);
  return [reglages, changer] as const;
}
function useEnLigne() {
  const [enLigne, setEnLigne] = useState(() => typeof navigator === 'undefined' || navigator.onLine !== false);
  useEffect(() => {
    const maj = () => setEnLigne(navigator.onLine !== false);
    window.addEventListener('online', maj); window.addEventListener('offline', maj);
    return () => { window.removeEventListener('online', maj); window.removeEventListener('offline', maj); };
  }, []);
  return enLigne;
}
const urlChapitre = (livre: Livre, chapitre: number) => `/bible/${livre.code.toLowerCase()}/${chapitre}`;
/** Guillemets de la langue du texte : « … » en français, “…” en anglais. */
const ouvre = (v: Version) => (v === 'lsg' ? '« ' : '“');
const ferme = (v: Version) => (v === 'lsg' ? ' »' : '”');
const titreLivre = (livre: Livre, langue: Langue) => livre.genre === 'evangile' ? (langue === 'en' ? `Gospel of ${livre.en}` : `Évangile selon ${livre.fr}`) : nomLivre(livre, langue);

/** Graine qui germe, dessinée dans les maquettes (noir et or). */
function Embleme({ taille = 48, anime = false }: { taille?: number; anime?: boolean }) {
  return <span className={anime ? 'bb-embleme bb-anime' : 'bb-embleme'} style={{ width: taille + 24, height: taille + 24 }} aria-hidden="true">
    <svg className="bb-embleme-cercle" viewBox="0 0 120 120"><circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeDasharray="4 4" strokeWidth="1.5" /></svg>
    <svg width={taille} height={taille} viewBox="0 0 100 100">
      <path d="M42 66 C38 72, 34 78, 30 82" stroke="var(--bb-or)" strokeDasharray="1 1.5" strokeLinecap="round" strokeWidth="2.5" fill="none" />
      <ellipse cx="50" cy="63" fill="var(--bb-encre)" rx="14" ry="9" transform="rotate(-15 50 63)" />
      <path d="M50 58 C53 45, 62 30, 64 22 C61 36, 56 48, 50 58 Z" fill="var(--bb-or)" />
      <circle cx="64" cy="21" fill="var(--bb-or)" r="2.8" />
      <path d="M48 50 C44 43, 40 37, 43 32 C46 36, 48 44, 48 50 Z" fill="var(--bb-encre)" />
    </svg>
  </span>;
}

function Page({ titre, retour, enfants, classe = '', reglages, droite }: { titre: string; retour?: string; enfants: ReactNode; classe?: string; reglages?: Reglages; droite?: ReactNode }) {
  const { langue, t, lien } = useLangue();
  return <main className={`bb-page bb-ambiance-${reglages?.ambiance ?? 'ivoire'} ${classe}`}>
    <header className="bb-tete">
      {retour
        ? <Link className="bb-rond" to={retour} aria-label={t('Retour', 'Back')}><I nom="arrow_back" /></Link>
        : <img className="bb-logo" src={`${import.meta.env.BASE_URL}icons/icon.svg`} alt="" />}
      <div className="bb-tete-titre"><span>SÉNEVÉ</span><strong>{titre}</strong></div>
      {droite}
      <Link className="bb-profil" to={lien('/profil')} aria-label={t('Mon profil', 'My profile')}><I nom="person" taille={20} /></Link>
    </header>
    <div className="bb-contenu">{enfants}</div>
    <BarreNav langue={langue} maquette iconesJournee />
  </main>;
}

function Toast({ message }: { message: string }) {
  return message ? <p className="bb-toast" role="status">{message}</p> : <p className="bb-toast-vide" role="status" />;
}
function useToast() {
  const [message, setMessage] = useState('');
  const minuterie = useRef<number | undefined>(undefined);
  const montrer = useCallback((m: string) => {
    setMessage(m);
    window.clearTimeout(minuterie.current);
    minuterie.current = window.setTimeout(() => setMessage(''), 2600);
  }, []);
  useEffect(() => () => window.clearTimeout(minuterie.current), []);
  return [message, montrer] as const;
}

/** Premier verset d'un passage, lu dans le fichier de la version choisie. */
function useVerset(version: Version, livre: Livre | undefined, chapitre: number, verset: number) {
  const [texte, setTexte] = useState<string | null>(null);
  useEffect(() => {
    let actif = true;
    setTexte(null);
    if (livre) chargerLivre(version, livre.code).then(c => { if (actif) setTexte(c[chapitre - 1]?.[verset - 1] ?? null); }).catch(() => undefined);
    return () => { actif = false; };
  }, [version, livre, chapitre, verset]);
  return texte;
}

function MenuVersion({ reglages, changer }: { reglages: Reglages; changer: (r: Reglages) => void }) {
  const { t } = useLangue();
  const [ouvert, setOuvert] = useState(false);
  return <div className="bb-version">
    <button type="button" className="bb-puce-version" aria-expanded={ouvert} onClick={() => setOuvert(o => !o)}>
      {VERSIONS[reglages.version].nom}<I nom="expand_more" taille={18} />
    </button>
    {ouvert && <div className="bb-menu" role="menu" aria-label={t('Version de la Bible', 'Bible version')}>
      {(Object.keys(VERSIONS) as Version[]).map(v => <button key={v} type="button" role="menuitemradio" aria-checked={reglages.version === v} onClick={() => { changer({ ...reglages, version: v }); setOuvert(false); }}>
        <span><strong>{VERSIONS[v].nom}</strong><small>{v === 'lsg' ? t('Français · domaine public', 'French · public domain') : t('Anglais · domaine public', 'English · public domain')}</small></span>
        {reglages.version === v && <I nom="check" taille={18} />}
      </button>)}
    </div>}
  </div>;
}

function CarteTelechargement({ version }: { version: Version }) {
  const { t } = useLangue();
  const enLigne = useEnLigne();
  const [presents, setPresents] = useState<number | null>(null);
  const [encours, setEncours] = useState<number | null>(null);
  const [erreur, setErreur] = useState('');
  useEffect(() => { let actif = true; livresTelecharges(version).then(l => { if (actif) setPresents(l.length); }); return () => { actif = false; }; }, [version, encours]);
  async function lancer() {
    setErreur(''); setEncours(0);
    try { await telechargerBible(version, n => setEncours(n)); }
    catch { setErreur(t('Le téléchargement s’est interrompu. Les livres déjà enregistrés sont gardés ; tu peux reprendre.', 'The download stopped. Books already saved are kept; you can resume.')); }
    finally { setEncours(null); }
  }
  const complet = presents === LIVRES.length;
  return <section className="bb-carte bb-telechargement" aria-label={t('Lire hors connexion', 'Read offline')}>
    <div className="bb-ligne-icone"><span className="bb-icone-or"><I nom="download" /></span><div><span className="bb-etiquette">{VERSIONS[version].nom}</span><h2>{t('Lire hors connexion', 'Read offline')}</h2></div></div>
    {complet
      ? <p className="bb-ok"><I nom="offline_pin" taille={20} />{t('La Bible entière est enregistrée sur ce téléphone.', 'The whole Bible is saved on this phone.')}</p>
      : <>
        <p>{t('Enregistre l’Ancien et le Nouveau Testament sur ce téléphone pour lire sans réseau.', 'Save the Old and New Testaments on this phone to read without a network.')}</p>
        {encours !== null
          ? <p className="bb-progression" role="status"><span style={{ width: `${(encours / LIVRES.length) * 100}%` }} />{t(`Enregistrement… ${encours}/66 livres`, `Saving… ${encours}/66 books`)}</p>
          : <button type="button" className="bb-bouton-noir" disabled={!enLigne} onClick={() => void lancer()}><I nom="download" taille={20} />{enLigne ? t('Télécharger la Bible', 'Download the Bible') : t('Disponible au retour du réseau', 'Available when you are back online')}</button>}
        <p className="bb-petit">{t(`Environ ${VERSIONS[version].taille} sur le téléphone`, `About ${VERSIONS[version].taille} on the phone`)}{presents ? t(` · ${presents} livre${presents > 1 ? 's' : ''} déjà enregistré${presents > 1 ? 's' : ''}`, ` · ${presents} book${presents > 1 ? 's' : ''} already saved`) : ''}</p>
      </>}
    {erreur && <p className="bb-alerte" role="alert">{erreur}</p>}
  </section>;
}

function EtatHorsConnexion({ version }: { version: Version }) {
  const { langue, t, lien } = useLangue();
  const [livres, setLivres] = useState<string[] | null>(null);
  useEffect(() => { let actif = true; livresTelecharges(version).then(l => { if (actif) setLivres(l); }); return () => { actif = false; }; }, [version]);
  const derniere = lireDerniereLecture();
  const livreDerniere = livreParCode(derniere?.livre);
  return <div className="bb-hors-ligne">
    <p className="bb-bandeau"><I nom="cloud_off" taille={20} />{t('Mode hors connexion', 'Offline mode')}</p>
    <div className="bb-centre"><Embleme /><h1>{t('Tu es hors connexion.', 'You are offline.')}</h1><p>{t('Les livres enregistrés sur ce téléphone restent lisibles.', 'Books saved on this phone can still be read.')}</p></div>
    {derniere && livreDerniere && livres?.includes(livreDerniere.code) && <section className="bb-carte">
      <span className="bb-etiquette"><I nom="bookmark" taille={18} />{t('Reprendre', 'Resume')}</span>
      <h2>{nomReference(livreDerniere, derniere.chapitre, undefined, langue)}</h2>
      <Link className="bb-bouton-clair" to={lien(urlChapitre(livreDerniere, derniere.chapitre))}><I nom="menu_book" taille={20} />{t('Poursuivre la lecture', 'Continue reading')}<I nom="arrow_forward" taille={20} /></Link>
    </section>}
    <section className="bb-liste-livres-hl">
      <h2>{t('Disponibles sur ce téléphone', 'Available on this phone')}</h2>
      {livres === null ? null : livres.length === 0
        ? <p className="bb-petit">{t('Aucun livre n’est encore enregistré sur ce téléphone.', 'No book is saved on this phone yet.')}</p>
        : <ul>{livres.map(code => { const l = livreParCode(code)!; return <li key={code}><Link to={lien(urlChapitre(l, 1))}>{nomLivre(l, langue)}<span>{t(`${l.chapitres} chapitre${l.chapitres > 1 ? 's' : ''}`, `${l.chapitres} chapter${l.chapitres > 1 ? 's' : ''}`)}</span><I nom="offline_pin" taille={20} /></Link></li>; })}</ul>}
    </section>
    <CarteTelechargement version={version} />
    <p className="bb-rassurance"><I nom="lock" taille={20} />{t('Tes surlignages, notes et marque-pages sont enregistrés sur ce téléphone : ils restent disponibles.', 'Your highlights, notes and bookmarks are saved on this phone: they remain available.')}</p>
  </div>;
}

/* ============================== 1. Accueil ============================== */

export function BibleAccueil() {
  const { langue, t, lien } = useLangue();
  useTitre('Bible', langue);
  const navigate = useNavigate();
  const enLigne = useEnLigne();
  const [reglages, changer] = useReglages(langue);
  const [requete, setRequete] = useState('');
  const derniere = lireDerniereLecture();
  const livreDerniere = livreParCode(derniere?.livre) ?? livreParCode('MAT')!;
  const chapitreDerniere = derniere?.chapitre ?? 13;
  const versetDerniere = derniere ? derniere.verset ?? 1 : 31;
  const extrait = useVerset(reglages.version, livreDerniere, chapitreDerniere, versetDerniere);
  const annotations = Object.values(lireAnnotations());
  const racines = texts[langue].roots;
  return <Page titre="Bible" reglages={reglages} enfants={<>
    {!enLigne && <EtatHorsConnexion version={reglages.version} />}
    <section className="bb-intro">
      <div className="bb-ligne"><span className="bb-etiquette">{t('Bible', 'Bible')}</span><MenuVersion reglages={reglages} changer={changer} /></div>
      <div className="bb-ligne bb-base"><h1>Bible</h1><span className="bb-petit">{t('66 livres', '66 books')}</span></div>
      <form role="search" className="bb-recherche" onSubmit={e => { e.preventDefault(); if (requete.trim()) navigate(lien('/bible/recherche', { q: requete.trim() })); }}>
        <I nom="search" taille={20} />
        <input type="search" aria-label={t('Rechercher dans la Bible', 'Search the Bible')} placeholder={t('Rechercher un mot ou une référence (ex. Matthieu 6:33)', 'Search a word or a reference (e.g. Matthew 6:33)')} value={requete} onChange={e => setRequete(e.target.value)} />
      </form>
    </section>
    <section className="bb-carte bb-reprendre">
      <div className="bb-ligne"><span className="bb-puce-or"><I nom="auto_stories" taille={16} />{derniere ? t('Reprendre la lecture', 'Resume reading') : t('Pour commencer', 'To begin')}</span></div>
      <h2>{nomReference(livreDerniere, chapitreDerniere, undefined, langue)}</h2>
      <span className="bb-sous-ref">{derniere ? t(`Verset ${versetDerniere}`, `Verse ${versetDerniere}`) : t('La parabole du grain de sénevé · versets 31-32', 'The parable of the mustard seed · verses 31-32')}</span>
      {extrait && <blockquote className="bb-citation">{ouvre(reglages.version)}{extrait}{ferme(reglages.version)}</blockquote>}
      <Link className="bb-bouton-noir" to={lien(urlChapitre(livreDerniere, chapitreDerniere), { v: String(versetDerniere) })}>{derniere ? t('Continuer la lecture', 'Continue reading') : t('Ouvrir Matthieu 13', 'Open Matthew 13')}<I nom="arrow_forward" taille={18} /></Link>
    </section>
    <section className="bb-testaments">
      {(['at', 'nt'] as Testament[]).map(te => <Link key={te} to={lien('/bible/livres', { t: te })}>
        <span className="bb-ligne"><I nom={te === 'at' ? 'history_edu' : 'menu_book'} /><small>{te === 'at' ? t('39 livres', '39 books') : t('27 livres', '27 books')}</small></span>
        <strong>{te === 'at' ? t('Ancien', 'Old') : t('Nouveau', 'New')}</strong><span>Testament</span>
      </Link>)}
    </section>
    <section className="bb-racines" aria-labelledby="bb-racines-titre">
      <h2 id="bb-racines-titre"><I nom="psychology_alt" taille={20} />{t('Versets de tes racines', 'Verses for your roots')}</h2>
      <p className="bb-petit">{t('Passages cités dans le Test des 7 Racines. Les autres sont à confirmer avec le livre.', 'Passages cited in the 7 Roots Test. The others are to be confirmed with the book.')}</p>
      {racines.map((r, i) => { const p = PASSAGES_RACINES[i]; return p ? <CarteRacine key={r.n} numero={i + 1} nom={r.n} version={reglages.version} passage={p} /> : null; })}
      <div className="bb-carte bb-autres-racines">
        <div className="bb-ligne"><strong>{t('Autres racines', 'Other roots')}</strong><span className="bb-petit">{racines.length - Object.keys(PASSAGES_RACINES).length} / 7</span></div>
        <ul>{racines.map((r, i) => PASSAGES_RACINES[i] ? null : <li key={r.n}><span className="bb-numero">{i + 1}</span><span>{r.n}</span><em>{t('Référence à confirmer avec le livre', 'Reference to be confirmed with the book')}</em></li>)}</ul>
      </div>
    </section>
    <section className="bb-outils">
      <h2><I nom="bookmark_heart" taille={20} />{t('Outils personnels', 'Personal tools')}</h2>
      <Link to={lien('/bible/annotations')}><span className="bb-carre"><I nom="draw" taille={20} /></span><span><strong>{t('Mes surlignages et notes', 'My highlights and notes')}</strong><small>{t(`${annotations.filter(a => a.couleur || a.note).length} passage(s) annoté(s)`, `${annotations.filter(a => a.couleur || a.note).length} annotated passage(s)`)}</small></span><I nom="chevron_right" taille={20} /></Link>
      <Link to={lien('/bible/annotations', { onglet: 'signets' })}><span className="bb-carre"><I nom="bookmark" taille={20} /></span><span><strong>{t('Mes marque-pages', 'My bookmarks')}</strong><small>{t(`${annotations.filter(a => a.signet).length} marque-page(s)`, `${annotations.filter(a => a.signet).length} bookmark(s)`)}</small></span><I nom="chevron_right" taille={20} /></Link>
    </section>
    {enLigne && <CarteTelechargement version={reglages.version} />}
    <PiedBible version={reglages.version} />
  </>} />;
}

function CarteRacine({ numero, nom, version, passage }: { numero: number; nom: string; version: Version; passage: (typeof PASSAGES_RACINES)[number] }) {
  const { langue, t, lien } = useLangue();
  const texte = useVerset(version, passage.livre, passage.chapitre, passage.verset ?? 1);
  return <article className="bb-carte bb-racine">
    <div className="bb-ligne"><span className="bb-puce-claire">{t(`Racine n°${numero}`, `Root ${numero}`)}</span><span className="bb-ref-or">{nomReference(passage.livre, passage.chapitre, passage.verset, langue)}-{passage.fin} ({VERSIONS[version].court})</span></div>
    <h3>{nom}</h3>
    {texte && <blockquote className="bb-citation">{ouvre(version)}{texte} …{ferme(version)}</blockquote>}
    <Link className="bb-lien-chapitre" to={lien(urlChapitre(passage.livre, passage.chapitre), { v: String(passage.verset) })}>{t('Lire dans le chapitre', 'Read in the chapter')}<I nom="chevron_right" taille={18} /></Link>
  </article>;
}

function PiedBible({ version }: { version: Version }) {
  const { t } = useLangue();
  return <footer className="bb-pied">
    <span className="bb-etiquette"><I nom="verified_user" taille={16} />{t('Texte biblique', 'Bible text')}</span>
    <p>{version === 'lsg' ? t('Louis Segond (1910), domaine public, édition eBible.org. Le texte n’est ni modifié ni résumé.', 'Louis Segond (1910), public domain, eBible.org edition. The text is neither changed nor summarised.') : t('World English Bible, domaine public, édition eBible.org. Le texte n’est ni modifié ni résumé.', 'World English Bible, public domain, eBible.org edition. The text is neither changed nor summarised.')}</p>
  </footer>;
}

/* ============================== 2. Livres ============================== */

const CITATION_LIVRES: Record<Version, string> = {
  lsg: '« Le ciel et la terre passeront, mais mes paroles ne passeront point. »',
  web: '“Heaven and earth will pass away, but my words will not pass away.”',
};

export function BibleLivres() {
  const { langue, t, lien } = useLangue();
  useTitre(t('Livres de la Bible', 'Books of the Bible'), langue);
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [reglages] = useReglages(langue);
  const derniere = lireDerniereLecture();
  const demande = livreParCode(params.get('livre')) ?? livreParCode(derniere?.livre);
  const testament: Testament = params.get('t') === 'at' || params.get('t') === 'nt' ? params.get('t') as Testament : demande?.testament ?? 'nt';
  const [ouvert, setOuvert] = useState<string | null>(demande?.code ?? null);
  const [filtre, setFiltre] = useState('');
  const lus = useMemo(() => chapitresLus(), []);
  const refs = useRef<Record<string, HTMLDivElement | null>>({});
  const liste = LIVRES.filter(l => l.testament === testament && (!filtre || nomLivre(l, langue).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(filtre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''))));
  const lettres = [...new Set(LIVRES.filter(l => l.testament === testament).map(l => nomLivre(l, langue).replace(/^\d\s*/, '').normalize('NFD')[0]?.toUpperCase() ?? ''))].sort();
  useEffect(() => { if (demande) refs.current[demande.code]?.scrollIntoView?.({ block: 'center' }); }, [demande]);
  const choisirTestament = (te: Testament) => setParams(p => { const n = new URLSearchParams(p); n.set('t', te); n.delete('livre'); return n; });
  return <Page titre={t('Livres de la Bible', 'Books of the Bible')} retour={lien('/bible')} reglages={reglages} enfants={<>
    <section className="bb-intro">
      <div className="bb-ligne"><span className="bb-etiquette"><I nom="auto_stories" taille={16} />{t(`Canon biblique · ${VERSIONS[reglages.version].nom}`, `Biblical canon · ${VERSIONS[reglages.version].nom}`)}</span><span className="bb-puce-claire">{t('66 livres', '66 books')}</span></div>
      <h1>{t('Livres des Écritures', 'Books of Scripture')}</h1>
      <p className="bb-italique">{CITATION_LIVRES[reglages.version]} <span className="bb-petit">— {t('Matthieu 24:35', 'Matthew 24:35')}</span></p>
      <label className="bb-recherche"><I nom="search" taille={20} /><input type="search" aria-label={t('Chercher un livre', 'Find a book')} placeholder={t('Chercher un livre…', 'Find a book…')} value={filtre} onChange={e => setFiltre(e.target.value)} /></label>
    </section>
    <div className="bb-onglets" role="tablist" aria-label="Testament">
      {(['at', 'nt'] as Testament[]).map(te => <button key={te} type="button" role="tab" aria-selected={testament === te} onClick={() => choisirTestament(te)}>
        {te === 'at' ? t('Ancien Testament', 'Old Testament') : t('Nouveau Testament', 'New Testament')}<span>{te === 'at' ? 39 : 27}</span>
      </button>)}
    </div>
    <div className="bb-livres-zone">
      <div className="bb-livres">
        {liste.length === 0 && <p className="bb-petit">{t('Aucun livre ne porte ce nom dans ce Testament.', 'No book has this name in this Testament.')}</p>}
        {liste.map(l => {
          const numero = LIVRES.filter(x => x.testament === l.testament).indexOf(l) + 1;
          const nbLus = Array.from({ length: l.chapitres }, (_, c) => lus.has(`${l.code}.${c + 1}`)).filter(Boolean).length;
          const estOuvert = ouvert === l.code;
          const courant = derniere?.livre === l.code ? derniere.chapitre : undefined;
          return <div key={l.code} className={estOuvert ? 'bb-livre bb-livre-ouvert' : 'bb-livre'} ref={el => { refs.current[l.code] = el; }}>
            <button type="button" className="bb-livre-tete" aria-expanded={estOuvert} onClick={() => setOuvert(estOuvert ? null : l.code)}>
              <span className="bb-numero-rond">{String(numero).padStart(2, '0')}</span>
              <span className="bb-livre-nom"><strong>{nomLivre(l, langue)}</strong><small>{GENRES[l.genre][langue]} · {t(`${l.chapitres} chapitre${l.chapitres > 1 ? 's' : ''}`, `${l.chapitres} chapter${l.chapitres > 1 ? 's' : ''}`)}{nbLus ? t(` · ${nbLus} lu${nbLus > 1 ? 's' : ''}`, ` · ${nbLus} read`) : ''}</small></span>
              {nbLus === l.chapitres && <span className="bb-or"><I nom="verified_user" taille={20} /></span>}
              <I nom={estOuvert ? 'expand_more' : 'chevron_right'} taille={20} />
            </button>
            {estOuvert && <div className="bb-livre-corps">
              <span className="bb-etiquette">{t('Choisir un chapitre', 'Choose a chapter')}</span>
              <div className="bb-grille" role="list" aria-label={t(`Chapitres de ${nomLivre(l, langue)}`, `Chapters of ${nomLivre(l, langue)}`)}>
                {Array.from({ length: l.chapitres }, (_, c) => c + 1).map(c => <Link key={c} role="listitem" to={lien(urlChapitre(l, c))}
                  className={[courant === c && 'bb-courant', lus.has(`${l.code}.${c}`) && 'bb-lu'].filter(Boolean).join(' ') || undefined}
                  aria-label={t(`${nomLivre(l, langue)} ${c}${courant === c ? ', en cours' : lus.has(`${l.code}.${c}`) ? ', déjà lu' : ''}`, `${nomLivre(l, langue)} ${c}${courant === c ? ', in progress' : lus.has(`${l.code}.${c}`) ? ', already read' : ''}`)}>{c}</Link>)}
              </div>
              <div className="bb-legende"><span><i className="bb-point" />{t('Lu sur ce téléphone', 'Read on this phone')}</span><span><i className="bb-carre-noir" />{t('En cours', 'In progress')}</span></div>
              <button type="button" className="bb-bouton-noir" onClick={() => navigate(lien(urlChapitre(l, courant ?? 1)))}>{t(`Ouvrir ${nomLivre(l, langue)} ${courant ?? 1}`, `Open ${nomLivre(l, langue)} ${courant ?? 1}`)}<I nom="arrow_forward" taille={18} /></button>
            </div>}
          </div>;
        })}
      </div>
      <nav className="bb-alphabet" aria-label={t('Aller à une lettre', 'Jump to a letter')}>
        {lettres.map(lettre => <button key={lettre} type="button" onClick={() => {
          const cible = LIVRES.find(l => l.testament === testament && nomLivre(l, langue).replace(/^\d\s*/, '').normalize('NFD')[0]?.toUpperCase() === lettre);
          if (cible) { setFiltre(''); refs.current[cible.code]?.scrollIntoView?.({ block: 'start' }); }
        }}>{lettre}</button>)}
      </nav>
    </div>
    <PiedBible version={reglages.version} />
  </>} />;
}

/* ============================== 3. Lecture ============================== */

function precedentSuivant(livre: Livre, chapitre: number) {
  const i = LIVRES.indexOf(livre);
  const avant = chapitre > 1 ? { livre, chapitre: chapitre - 1 } : i > 0 ? { livre: LIVRES[i - 1]!, chapitre: LIVRES[i - 1]!.chapitres } : null;
  const apres = chapitre < livre.chapitres ? { livre, chapitre: chapitre + 1 } : i < LIVRES.length - 1 ? { livre: LIVRES[i + 1]!, chapitre: 1 } : null;
  return { avant, apres };
}
const HAUTEURS: Record<Reglages['interligne'], number> = { compact: 1.4, confortable: 1.75, aere: 2.1 };

export function BibleLecture() {
  const { langue, t, lien } = useLangue();
  const { livre: codeLivre, chapitre: chap } = useParams();
  const [params] = useSearchParams();
  const livre = livreParCode(codeLivre);
  const chapitre = Number(chap);
  const versetDemande = Number(params.get('v')) || undefined;
  const [reglages, changer] = useReglages(langue);
  const enLigne = useEnLigne();
  const [etat, setEtat] = useState<'chargement' | 'erreur' | string[]>('chargement');
  const [essai, setEssai] = useState(0);
  const [annotations, setAnnotations] = useState(lireAnnotations);
  const [choisi, setChoisi] = useState<number | null>(null);
  const [note, setNote] = useState<number | null>(null);
  const [reglagesOuverts, setReglagesOuverts] = useState(false);
  const [message, montrer] = useToast();
  const valide = livre && Number.isInteger(chapitre) && chapitre >= 1 && chapitre <= livre.chapitres;
  useTitre(livre ? nomReference(livre, chapitre, undefined, langue) : 'Bible', langue);

  useEffect(() => {
    if (!valide) return;
    let actif = true;
    setEtat('chargement'); setChoisi(null);
    chargerLivre(reglages.version, livre.code)
      .then(c => { if (actif) setEtat(c[chapitre - 1] ?? 'erreur'); })
      .catch(() => { if (actif) setEtat('erreur'); });
    return () => { actif = false; };
  }, [valide, livre, chapitre, reglages.version, essai]);

  const versets = Array.isArray(etat) ? etat : null;
  const versetHorsLimite = versets && versetDemande !== undefined && (versetDemande < 1 || versetDemande > versets.length);
  useEffect(() => {
    if (!versets || !livre || versetHorsLimite) return;
    noterLecture({ livre: livre.code, chapitre, verset: versetDemande });
    if (versetDemande) document.getElementById(`v${versetDemande}`)?.scrollIntoView?.({ block: 'center' });
  }, [versets, livre, chapitre, versetDemande, versetHorsLimite]);

  if (!valide || versetHorsLimite) return <Page titre="Bible" retour={lien('/bible')} reglages={reglages} enfants={<ReferenceIntrouvable saisie={livre ? nomReference(livre, chapitre || 0, versetDemande, langue) : `${codeLivre ?? ''} ${chap ?? ''}`} livre={livre} version={reglages.version} />} />;

  const { avant, apres } = precedentSuivant(livre, chapitre);
  const base = (v: number) => ({ livre: livre.code, chapitre, verset: v, version: reglages.version, extrait: versets?.[v - 1] ?? '' });
  const reference = (v?: number) => nomReference(livre, chapitre, v, langue);
  const titre = reference();
  const barre = <div className="bb-barre-lecture">
    <Link className="bb-rond" to={lien('/bible/livres', { livre: livre.code })} aria-label={t('Retour aux livres', 'Back to books')}><I nom="west" /></Link>
    <Link className="bb-choix-chapitre" to={lien('/bible/livres', { livre: livre.code })} aria-label={t(`Changer de livre ou de chapitre (${titre})`, `Change book or chapter (${titre})`)}>{titre}<I nom="expand_more" taille={20} /></Link>
    <button type="button" className="bb-rond bb-aa" onClick={() => setReglagesOuverts(true)} aria-label={t('Réglages de lecture', 'Reading settings')}>A<small>A</small></button>
    <Link className="bb-rond" to={lien('/bible/recherche')} aria-label={t('Rechercher dans la Bible', 'Search the Bible')}><I nom="search" /></Link>
  </div>;

  return <Page titre="Bible" reglages={reglages} classe="bb-page-lecture" enfants={<>
    {barre}
    {etat === 'chargement' && <Chargement titre={titre} version={reglages.version} />}
    {etat === 'erreur' && (enLigne
      ? <div className="bb-centre bb-erreur"><Embleme /><h1>{t('Ce chapitre ne peut pas être affiché pour le moment.', 'This chapter cannot be shown right now.')}</h1><button type="button" className="bb-bouton-noir" onClick={() => setEssai(e => e + 1)}><I nom="refresh" taille={20} />{t('Réessayer', 'Try again')}</button></div>
      : <EtatHorsConnexion version={reglages.version} />)}
    {versets && <>
      <div className="bb-entete-chapitre">
        <span className="bb-etiquette">{VERSIONS[reglages.version].nom}</span>
        <Embleme taille={36} />
        <span className="bb-puce-claire">{titreLivre(livre, langue)}</span>
        <h1>{t(`Chapitre ${chapitre}`, `Chapter ${chapitre}`)}</h1>
      </div>
      <article className="bb-texte" style={{ fontSize: TAILLES[reglages.taille], lineHeight: HAUTEURS[reglages.interligne] }} aria-label={titre}>
        {versets.map((texte, i) => {
          const v = i + 1;
          const a = annotations[cleVerset(livre.code, chapitre, v)];
          if (!texte) return null;
          return <p key={v} id={`v${v}`} role="button" tabIndex={0} aria-pressed={choisi === v}
            aria-label={t(`Verset ${v}`, `Verse ${v}`)}
            className={['bb-verset', a?.couleur && `bb-surligne-${a.couleur}`, choisi === v && 'bb-choisi', versetDemande === v && 'bb-demande'].filter(Boolean).join(' ')}
            onClick={() => setChoisi(v)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setChoisi(v); } }}>
            {reglages.numeros && <sup>{v}</sup>}
            <span>{texte}</span>
            {a?.note && <span className="bb-marque" title={t('Note', 'Note')}><I nom="edit_note" taille={16} /></span>}
            {a?.signet && <span className="bb-marque" title={t('Marque-page', 'Bookmark')}><I nom="bookmark_added" taille={16} /></span>}
          </p>;
        })}
      </article>
      <nav className="bb-suite" aria-label={t('Chapitres voisins', 'Nearby chapters')}>
        {avant ? <Link to={lien(urlChapitre(avant.livre, avant.chapitre))}><small><I nom="arrow_back" taille={16} />{t('Précédent', 'Previous')}</small><strong>{nomReference(avant.livre, avant.chapitre, undefined, langue)}</strong></Link> : <span />}
        {apres ? <Link to={lien(urlChapitre(apres.livre, apres.chapitre))} className="bb-a-droite"><small>{t('Suivant', 'Next')}<I nom="arrow_forward" taille={16} /></small><strong>{nomReference(apres.livre, apres.chapitre, undefined, langue)}</strong></Link> : <span />}
      </nav>
      <PiedBible version={reglages.version} />
    </>}
    {choisi !== null && versets && <FeuilleVerset reference={reference(choisi)} version={reglages.version} texte={versets[choisi - 1] ?? ''} annotation={annotations[cleVerset(livre.code, chapitre, choisi)]}
      fermer={() => setChoisi(null)}
      changer={changement => setAnnotations(annoter(base(choisi), changement))}
      annoterNote={() => { setNote(choisi); setChoisi(null); }} montrer={montrer} />}
    {note !== null && versets && <EditeurNote reference={reference(note)} version={reglages.version} texte={versets[note - 1] ?? ''} valeur={annotations[cleVerset(livre.code, chapitre, note)]?.note ?? ''}
      fermer={() => setNote(null)} enregistrer={v => { setAnnotations(annoter(base(note), { note: v })); setNote(null); montrer(v.trim() ? t('Note enregistrée sur ce téléphone', 'Note saved on this phone') : t('Note supprimée', 'Note deleted')); }} />}
    {reglagesOuverts && <FeuilleReglages reglages={reglages} apercu={versets?.[(choisi ?? versetDemande ?? 1) - 1] ?? versets?.[0] ?? ''} numero={choisi ?? versetDemande ?? 1}
      fermer={() => setReglagesOuverts(false)} appliquer={r => { changer(r); setReglagesOuverts(false); }} />}
    <Toast message={message} />
  </>} />;
}

function Chargement({ titre, version }: { titre: string; version: Version }) {
  const { t } = useLangue();
  return <div className="bb-chargement" aria-busy="true">
    <div className="bb-centre"><Embleme anime /><h1>{t('Ouverture du chapitre…', 'Opening the chapter…')}</h1><p>{t(`${titre} se charge.`, `${titre} is loading.`)}</p></div>
    <div className="bb-squelette" aria-hidden="true">{[0, 1, 2, 3].map(i => <div key={i}><span>{i + 1}</span><i /><i /></div>)}</div>
    <figure className="bb-citation-pied"><I nom="spa" taille={20} /><blockquote>{version === 'lsg' ? '« … mais la parole du Seigneur demeure éternellement. »' : '“… but the Lord’s word endures forever.”'}</blockquote><figcaption>{t('1 Pierre 1:25', '1 Peter 1:25')}</figcaption></figure>
  </div>;
}

function Feuille({ titre, etiquette, fermer, enfants, id }: { titre: string; etiquette: string; fermer: () => void; enfants: ReactNode; id: string }) {
  const { t } = useLangue();
  const bouton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    bouton.current?.focus();
    const echap = (e: KeyboardEvent) => { if (e.key === 'Escape') fermer(); };
    window.addEventListener('keydown', echap);
    return () => window.removeEventListener('keydown', echap);
  }, [fermer]);
  return <>
    <div className="bb-voile" onClick={fermer} aria-hidden="true" />
    <section className="bb-feuille" role="dialog" aria-modal="true" aria-labelledby={id}>
      <span className="bb-poignee" aria-hidden="true" />
      <div className="bb-feuille-tete"><div><span className="bb-etiquette"><i className="bb-point" />{etiquette}</span><h2 id={id}>{titre}</h2></div>
        <button ref={bouton} type="button" className="bb-rond bb-fermer" onClick={fermer} aria-label={t('Fermer', 'Close')}><I nom="close" /></button></div>
      {enfants}
    </section>
  </>;
}

function texteACopier(texte: string, reference: string, version: Version) { return `${ouvre(version)}${texte}${ferme(version)}\n${reference} · ${VERSIONS[version].nom}`; }

function FeuilleVerset({ reference, version, texte, annotation, fermer, changer, annoterNote, montrer }: {
  reference: string; version: Version; texte: string; annotation?: Annotation; fermer: () => void;
  changer: (c: Partial<Pick<Annotation, 'couleur' | 'signet'>>) => void; annoterNote: () => void; montrer: (m: string) => void;
}) {
  const { langue, t } = useLangue();
  const navigate = useNavigate();
  const copie = texteACopier(texte, reference, version);
  async function copier() {
    try { await navigator.clipboard.writeText(copie); montrer(t('Verset copié avec sa référence', 'Verse copied with its reference')); }
    catch { montrer(t('La copie n’est pas possible sur ce navigateur', 'Copying is not possible in this browser')); }
  }
  async function partager() {
    if (navigator.share) { try { await navigator.share({ title: reference, text: copie }); } catch { /* partage annulé */ } }
    else await copier();
  }
  function versJournal() {
    // Seule la citation publique voyage entre les pages ; le journal ajoute le brouillon du compte connecté.
    navigate(langue === 'en' ? '/journal?ecrire=1&lang=en' : '/journal?ecrire=1', { state: { citationBiblique: copie } });
  }
  const couleur = COULEURS.find(c => c.id === annotation?.couleur);
  return <Feuille id="bb-feuille-verset" etiquette={t('Verset', 'Verse')} titre={reference} fermer={fermer} enfants={<>
    <blockquote className="bb-apercu">{ouvre(version)}{texte.length > 160 ? `${texte.slice(0, 157)}…` : texte}{ferme(version)}</blockquote>
    <div className="bb-ligne"><span className="bb-etiquette-grise">{t('Couleur de surlignage', 'Highlight colour')}</span><span className="bb-ref-or">{couleur ? couleur[langue] : t('Aucune', 'None')}</span></div>
    <div className="bb-couleurs">
      {COULEURS.map(c => <button key={c.id} type="button" className={`bb-pastille bb-pastille-${c.id}`} aria-pressed={annotation?.couleur === c.id} aria-label={t(`Surligner en ${c.fr.toLowerCase()}`, `Highlight in ${c.en.toLowerCase()}`)} onClick={() => changer({ couleur: c.id as Couleur })}>{annotation?.couleur === c.id && <I nom="check" taille={22} />}</button>)}
      <button type="button" className="bb-pastille bb-pastille-aucune" aria-label={t('Retirer le surlignage', 'Remove highlight')} disabled={!annotation?.couleur} onClick={() => changer({ couleur: undefined })}><I nom="close" taille={20} /></button>
    </div>
    <div className="bb-actions">
      <button type="button" onClick={annoterNote}><span className="bb-rond-clair"><I nom="edit_note" taille={18} /></span><span><strong>{annotation?.note ? t('Modifier la note', 'Edit the note') : t('Annoter', 'Add a note')}</strong><small>{t('Pensée personnelle', 'Personal thought')}</small></span></button>
      <button type="button" onClick={() => void copier()}><span className="bb-rond-clair"><I nom="content_copy" taille={18} /></span><span><strong>{t('Copier', 'Copy')}</strong><small>{t('Avec la référence', 'With the reference')}</small></span></button>
      <button type="button" onClick={() => void partager()}><span className="bb-rond-clair"><I nom="share" taille={18} /></span><span><strong>{t('Partager', 'Share')}</strong><small>{t('Texte et référence', 'Text and reference')}</small></span></button>
      <button type="button" aria-pressed={Boolean(annotation?.signet)} onClick={() => { changer({ signet: !annotation?.signet }); montrer(annotation?.signet ? t('Marque-page retiré', 'Bookmark removed') : t('Marque-page ajouté', 'Bookmark added')); }}><span className="bb-rond-clair"><I nom={annotation?.signet ? 'bookmark_added' : 'bookmark'} taille={18} /></span><span><strong>{annotation?.signet ? t('Retirer le signet', 'Remove bookmark') : t('Signet', 'Bookmark')}</strong><small>{t('Repère de lecture', 'Reading marker')}</small></span></button>
    </div>
    <button type="button" className="bb-journal" onClick={versJournal}><I nom="history_edu" taille={22} /><span><strong>{t('Écrire dans mon journal', 'Write in my journal')}</strong><small>{t('Le verset est ajouté à ton brouillon', 'The verse is added to your draft')}</small></span><I nom="arrow_forward" taille={20} /></button>
  </>} />;
}

function EditeurNote({ reference, version, texte, valeur, fermer, enregistrer }: { reference: string; version: Version; texte: string; valeur: string; fermer: () => void; enregistrer: (v: string) => void }) {
  const { t } = useLangue();
  const [note, setNote] = useState(valeur);
  const champ = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { champ.current?.focus(); }, []);
  return <div className="bb-ecran" role="dialog" aria-modal="true" aria-labelledby="bb-note-titre">
    <header className="bb-tete">
      <button type="button" className="bb-rond" onClick={fermer} aria-label={t('Annuler', 'Cancel')}><I nom="close" /></button>
      <div className="bb-tete-titre"><span>SÉNEVÉ</span><strong id="bb-note-titre">{valeur ? t('Modifier la note', 'Edit the note') : t('Ajouter une note', 'Add a note')}</strong></div>
      <button type="button" className="bb-bouton-noir bb-petit-bouton" onClick={() => enregistrer(note)}>{t('Enregistrer', 'Save')}</button>
    </header>
    <form className="bb-contenu bb-note" onSubmit={e => { e.preventDefault(); enregistrer(note); }}>
      <div className="bb-ligne"><span className="bb-puce-claire"><i className="bb-point" />{t('Note personnelle', 'Personal note')}</span><span className="bb-petit"><I nom="offline_pin" taille={16} />{t('Sur ce téléphone', 'On this phone')}</span></div>
      <section className="bb-carte"><span className="bb-etiquette"><I nom="menu_book" taille={18} />{reference} · {VERSIONS[version].nom}</span><blockquote className="bb-citation">{ouvre(version)}{texte}{ferme(version)}</blockquote></section>
      <label className="bb-champ"><span className="bb-ligne"><strong>{t('Ta méditation sur ce passage', 'Your reflection on this passage')}</strong><small>{t(`${note.length} caractère${note.length > 1 ? 's' : ''}`, `${note.length} character${note.length > 1 ? 's' : ''}`)}</small></span>
        <textarea ref={champ} rows={7} maxLength={5000} value={note} onChange={e => setNote(e.target.value)} placeholder={t('Note ici ce que ce passage inspire à ton cœur, une décision ou une prière…', 'Write what this passage stirs in your heart, a decision or a prayer…')} />
      </label>
      <p className="bb-rassurance"><I nom="lock" taille={20} /><span><strong>{t('Ta note est enregistrée sur ce téléphone.', 'Your note is saved on this phone.')}</strong>{t(' Elle n’est pas envoyée à SÉNEVÉ et disparaît si tu effaces les données du navigateur.', ' It is not sent to SÉNEVÉ and disappears if you clear the browser data.')}</span></p>
      <button type="submit" className="bb-bouton-noir"><I nom="check" taille={20} />{t('Enregistrer la note', 'Save the note')}</button>
      {valeur && <button type="button" className="bb-bouton-texte" onClick={() => enregistrer('')}><I nom="delete" taille={18} />{t('Supprimer la note', 'Delete the note')}</button>}
      <button type="button" className="bb-bouton-texte" onClick={fermer}>{t('Annuler', 'Cancel')}</button>
    </form>
  </div>;
}

function FeuilleReglages({ reglages, apercu, numero, fermer, appliquer }: { reglages: Reglages; apercu: string; numero: number; fermer: () => void; appliquer: (r: Reglages) => void }) {
  const { t } = useLangue();
  const [r, setR] = useState(reglages);
  const radio = <K extends keyof Reglages>(cle: K, valeur: Reglages[K]) => ({ role: 'radio' as const, 'aria-checked': r[cle] === valeur, onClick: () => setR({ ...r, [cle]: valeur }) });
  return <Feuille id="bb-feuille-reglages" etiquette={t('Confort de lecture', 'Reading comfort')} titre={t('Réglages de lecture', 'Reading settings')} fermer={fermer} enfants={<div className={`bb-reglages bb-ambiance-${r.ambiance}`}>
    <span className="bb-etiquette-grise">{t('Aperçu en direct', 'Live preview')}</span>
    <p className="bb-apercu-direct" style={{ fontSize: TAILLES[r.taille], lineHeight: HAUTEURS[r.interligne] }}>{r.numeros && <sup>{numero}</sup>}{apercu}</p>
    <span className="bb-etiquette-grise" id="bb-r-version">{t('Version du texte', 'Text version')}</span>
    <div className="bb-choix-liste" role="radiogroup" aria-labelledby="bb-r-version">
      {(Object.keys(VERSIONS) as Version[]).map(v => <button key={v} type="button" {...radio('version', v)}><span><strong>{VERSIONS[v].nom}</strong><small>{v === 'lsg' ? t('Français · domaine public', 'French · public domain') : t('Anglais · domaine public', 'English · public domain')}</small></span>{r.version === v && <I nom="check" taille={18} />}</button>)}
    </div>
    <div className="bb-ligne"><span className="bb-etiquette-grise" id="bb-r-taille">{t('Taille des caractères', 'Text size')}</span><span className="bb-ref-or">{TAILLES[r.taille]} px</span></div>
    <div className="bb-taille">
      <button type="button" className="bb-rond-clair" disabled={r.taille === 0} onClick={() => setR({ ...r, taille: r.taille - 1 })} aria-label={t('Réduire la taille du texte', 'Smaller text')}>A−</button>
      <input type="range" min={0} max={TAILLES.length - 1} step={1} value={r.taille} onChange={e => setR({ ...r, taille: Number(e.target.value) })} aria-labelledby="bb-r-taille" aria-valuetext={`${TAILLES[r.taille]} px`} />
      <button type="button" className="bb-rond-clair" disabled={r.taille === TAILLES.length - 1} onClick={() => setR({ ...r, taille: r.taille + 1 })} aria-label={t('Agrandir la taille du texte', 'Larger text')}>A+</button>
    </div>
    <span className="bb-etiquette-grise" id="bb-r-interligne">{t('Interligne', 'Line spacing')}</span>
    <div className="bb-choix-trois" role="radiogroup" aria-labelledby="bb-r-interligne">
      <button type="button" {...radio('interligne', 'compact')}>{t('Compact', 'Compact')}</button>
      <button type="button" {...radio('interligne', 'confortable')}>{t('Confortable', 'Comfortable')}</button>
      <button type="button" {...radio('interligne', 'aere')}>{t('Aéré', 'Airy')}</button>
    </div>
    <span className="bb-etiquette-grise" id="bb-r-ambiance">{t('Ambiance', 'Theme')}</span>
    <div className="bb-choix-trois bb-ambiances" role="radiogroup" aria-labelledby="bb-r-ambiance">
      <button type="button" className="bb-am-ivoire" {...radio('ambiance', 'ivoire')}>{t('Ivoire', 'Ivory')}</button>
      <button type="button" className="bb-am-sepia" {...radio('ambiance', 'sepia')}>{t('Sépia', 'Sepia')}</button>
      <button type="button" className="bb-am-nocturne" {...radio('ambiance', 'nocturne')}>{t('Nocturne', 'Night')}</button>
    </div>
    <label className="bb-interrupteur"><span><strong>{t('Numéros de versets', 'Verse numbers')}</strong><small>{t('Petits repères dorés en tête de chaque verset', 'Small gold markers before each verse')}</small></span>
      <input type="checkbox" role="switch" checked={r.numeros} onChange={e => setR({ ...r, numeros: e.target.checked })} /></label>
    <button type="button" className="bb-bouton-noir" onClick={() => appliquer(r)}><I nom="bookmark_added" taille={20} />{t('Appliquer à la lecture', 'Apply to reading')}</button>
    <button type="button" className="bb-bouton-texte" onClick={() => setR({ ...REGLAGES_DEFAUT, version: r.version })}>{t('Rétablir les réglages par défaut', 'Restore default settings')}</button>
  </div>} />;
}

/* ============================== Référence introuvable ============================== */

function ReferenceIntrouvable({ saisie, livre, version, avecRecherche = true }: { saisie: string; livre?: Livre; version: Version; avecRecherche?: boolean }) {
  const { langue, t, lien } = useLangue();
  const navigate = useNavigate();
  const [valeur, setValeur] = useState(saisie);
  const matt = livreParCode('MAT')!;
  const phare = useVerset(version, matt, 13, 31);
  const phare2 = useVerset(version, matt, 6, 33);
  return <div className="bb-introuvable">
    {avecRecherche && <form role="search" className="bb-recherche bb-recherche-forte" onSubmit={e => { e.preventDefault(); if (valeur.trim()) navigate(lien('/bible/recherche', { q: valeur.trim() })); }}>
      <I nom="search" taille={22} /><input aria-label={t('Référence biblique', 'Bible reference')} value={valeur} onChange={e => setValeur(e.target.value)} />
      {valeur && <button type="button" className="bb-effacer" onClick={() => setValeur('')} aria-label={t('Effacer la saisie', 'Clear')}><I nom="close" taille={18} /></button>}
    </form>}
    <div className="bb-centre"><span className="bb-embleme-question" aria-hidden="true"><I nom="menu_book" taille={38} /><span><I nom="help" taille={16} /></span></span>
      <h1>{t('Cette référence n’existe pas.', 'This reference does not exist.')}</h1><p>{t('Vérifie le livre, le chapitre et le verset.', 'Check the book, chapter and verse.')}</p></div>
    <section className="bb-carte">
      <h2><I nom="lightbulb" taille={20} />{t('Rappels utiles', 'Helpful reminders')}</h2>
      <ul className="bb-puces">
        {livre && <li>{t(`Le livre de ${livre.fr} compte ${livre.chapitres} chapitre${livre.chapitres > 1 ? 's' : ''}.`, `The book of ${livre.en} has ${livre.chapitres} chapter${livre.chapitres > 1 ? 's' : ''}.`)}</li>}
        <li>{t('Les références s’écrivent : ', 'References are written: ')}<code>{t('[Livre] [Chapitre]:[Verset]', '[Book] [Chapter]:[Verse]')}</code><small>{t('Exemple : Matthieu 13:32 ou Jean 3:16', 'Example: Matthew 13:32 or John 3:16')}</small></li>
      </ul>
    </section>
    {livre && <Link className="bb-bouton-clair" to={lien(urlChapitre(livre, livre.chapitres))}><I nom="east" taille={20} /><span><strong>{t('Aller au dernier chapitre', 'Go to the last chapter')}</strong><small>{nomReference(livre, livre.chapitres, undefined, langue)}</small></span><I nom="chevron_right" taille={20} /></Link>}
    <Link className="bb-bouton-noir" to={lien('/bible/livres')}><I nom="menu_book" taille={20} />{t('Ouvrir la liste des livres', 'Open the list of books')}</Link>
    <section className="bb-phares">
      <span className="bb-etiquette">{t('Pour commencer', 'To begin')}</span>
      <Link to={lien(urlChapitre(matt, 13), { v: '31' })}><strong>{nomReference(matt, 13, 31, langue)}-32</strong>{phare && <em>{ouvre(version)}{phare}{ferme(version)}</em>}</Link>
      <Link to={lien(urlChapitre(matt, 6), { v: '33' })}><strong>{nomReference(matt, 6, 33, langue)}</strong>{phare2 && <em>{ouvre(version)}{phare2}{ferme(version)}</em>}</Link>
    </section>
  </div>;
}

/* ============================== 4. Recherche ============================== */

const PAR_PAGE = 100;
export function BibleRecherche() {
  const { langue, t, lien } = useLangue();
  useTitre(t('Recherche dans la Bible', 'Bible search'), langue);
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const [saisie, setSaisie] = useState(q);
  const [reglages] = useReglages(langue);
  const [filtre, setFiltre] = useState<'tout' | Testament>('tout');
  const [etat, setEtat] = useState<{ lus: number; resultats: Resultat[]; erreur: boolean }>({ lus: 0, resultats: [], erreur: false });
  const [annotations, setAnnotations] = useState(lireAnnotations);
  const [message, montrer] = useToast();
  const analyse = useMemo(() => analyserReference(q), [q]);
  const chercherMots = q.trim() !== '' && (analyse.type === 'aucune' || analyse.type === 'livre') && motsRecherche(q).length > 0;
  useEffect(() => { setSaisie(q); }, [q]);
  useEffect(() => {
    if (!chercherMots) return;
    let annule = false;
    setEtat({ lus: 0, resultats: [], erreur: false });
    rechercher(reglages.version, q, (lus, resultats) => { if (!annule) setEtat({ lus, resultats: [...resultats], erreur: false }); }, () => annule)
      .catch(() => { if (!annule) setEtat(e => ({ ...e, erreur: true })); });
    return () => { annule = true; };
  }, [q, chercherMots, reglages.version]);
  const lancer = (valeur: string) => setParams(p => { const n = new URLSearchParams(p); if (valeur.trim()) n.set('q', valeur.trim()); else n.delete('q'); return n; });
  const mots = motsRecherche(q);
  const fini = etat.lus === LIVRES.length;
  const compte = (te: 'tout' | Testament) => etat.resultats.filter(r => te === 'tout' || r.livre.testament === te).length;
  const visibles = etat.resultats.filter(r => filtre === 'tout' || r.livre.testament === filtre);
  const matt = livreParCode('MAT')!;
  const exemple = useVerset(reglages.version, matt, 6, 33);

  const formulaire = <form role="search" className="bb-recherche bb-recherche-forte" onSubmit={e => { e.preventDefault(); lancer(saisie); }}>
    <I nom="search" taille={22} />
    <input type="search" aria-label={t('Rechercher dans la Bible', 'Search the Bible')} placeholder={t('Rechercher un verset, un mot ou un livre…', 'Search a verse, a word or a book…')} value={saisie} onChange={e => setSaisie(e.target.value)} />
    {saisie && <button type="button" className="bb-effacer" onClick={() => { setSaisie(''); lancer(''); }} aria-label={t('Effacer la recherche', 'Clear the search')}><I nom="close" taille={18} /></button>}
  </form>;

  let corps: ReactNode;
  if (analyse.type === 'chapitre-introuvable') corps = <ReferenceIntrouvable key={q} saisie={q} livre={analyse.livre} version={reglages.version} avecRecherche={false} />;
  else if (!q.trim()) corps = <AideReference exemple={exemple} version={reglages.version} />;
  else corps = <>
    {analyse.type === 'reference' && <Raccourci libelle={t(`Aller à ${nomReference(analyse.ref.livre, analyse.ref.chapitre, analyse.ref.verset, langue)}${analyse.ref.fin ? `-${analyse.ref.fin}` : ''}`, `Go to ${nomReference(analyse.ref.livre, analyse.ref.chapitre, analyse.ref.verset, langue)}${analyse.ref.fin ? `-${analyse.ref.fin}` : ''}`)}
      vers={lien(urlChapitre(analyse.ref.livre, analyse.ref.chapitre), analyse.ref.verset ? { v: String(analyse.ref.verset) } : undefined)} />}
    {analyse.type === 'livre' && <Raccourci libelle={t(`Ouvrir ${nomLivre(analyse.livre, 'fr')}`, `Open ${nomLivre(analyse.livre, 'en')}`)} vers={lien('/bible/livres', { livre: analyse.livre.code })} />}
    {chercherMots && <>
      <div className="bb-filtres" role="group" aria-label={t('Filtrer les résultats', 'Filter results')}>
        {(['tout', 'at', 'nt'] as const).map(f => <button key={f} type="button" aria-pressed={filtre === f} onClick={() => setFiltre(f)}>{f === 'tout' ? t('Tout', 'All') : f === 'at' ? t('Ancien Testament', 'Old Testament') : t('Nouveau Testament', 'New Testament')}<span>{compte(f)}</span></button>)}
      </div>
      {etat.erreur
        ? <p className="bb-alerte" role="alert">{t('La recherche a besoin des 66 livres : connecte-toi, ou télécharge la Bible pour chercher hors connexion.', 'Search needs all 66 books: go online, or download the Bible to search offline.')}</p>
        : !fini
          ? <p className="bb-progression" role="status"><span style={{ width: `${(etat.lus / LIVRES.length) * 100}%` }} />{t(`Recherche dans les livres… ${etat.lus}/66`, `Searching the books… ${etat.lus}/66`)}</p>
          : null}
      {fini && etat.resultats.length === 0 ? <AucunResultat version={reglages.version} choisir={m => { setSaisie(m); lancer(m); }} /> : <>
        <div className="bb-ligne bb-base"><h1>{t(`${visibles.length} résultat${visibles.length > 1 ? 's' : ''}`, `${visibles.length} result${visibles.length > 1 ? 's' : ''}`)}</h1><span className="bb-etiquette">{VERSIONS[reglages.version].nom}</span></div>
        <ol className="bb-resultats">
          {visibles.slice(0, PAR_PAGE).map(r => {
            const reference = nomReference(r.livre, r.chapitre, r.verset, langue);
            const cle = cleVerset(r.livre.code, r.chapitre, r.verset);
            const signet = Boolean(annotations[cle]?.signet);
            return <li key={cle} className="bb-carte">
              <div className="bb-ligne"><span><strong>{reference}</strong><span className="bb-puce-claire">{titreLivre(r.livre, langue)}</span></span>
                <span className="bb-icones">
                  <button type="button" className="bb-rond" aria-pressed={signet} aria-label={signet ? t(`Retirer le marque-page de ${reference}`, `Remove bookmark from ${reference}`) : t(`Ajouter un marque-page à ${reference}`, `Bookmark ${reference}`)}
                    onClick={() => { setAnnotations(annoter({ livre: r.livre.code, chapitre: r.chapitre, verset: r.verset, version: reglages.version, extrait: r.texte }, { signet: !signet })); montrer(signet ? t('Marque-page retiré', 'Bookmark removed') : t('Marque-page ajouté', 'Bookmark added')); }}>
                    <I nom={signet ? 'bookmark_added' : 'bookmark'} taille={20} /></button>
                  <button type="button" className="bb-rond" aria-label={t(`Partager ${reference}`, `Share ${reference}`)} onClick={async () => {
                    const texte = texteACopier(r.texte, reference, reglages.version);
                    if (navigator.share) { try { await navigator.share({ title: reference, text: texte }); } catch { /* annulé */ } }
                    else { try { await navigator.clipboard.writeText(texte); montrer(t('Verset copié avec sa référence', 'Verse copied with its reference')); } catch { montrer(t('La copie n’est pas possible sur ce navigateur', 'Copying is not possible in this browser')); } }
                  }}><I nom="share" taille={20} /></button>
                </span></div>
              <blockquote className="bb-citation">{ouvre(reglages.version)}{morceauxSurlignes(r.texte, mots).map((m, i) => m.trouve ? <mark key={i}>{m.t}</mark> : <span key={i}>{m.t}</span>)} »</blockquote>
              <Link className="bb-lien-chapitre" to={lien(urlChapitre(r.livre, r.chapitre), { v: String(r.verset) })}>{t('Lire dans le contexte', 'Read in context')}<I nom="arrow_forward" taille={16} /></Link>
            </li>;
          })}
        </ol>
        {visibles.length > PAR_PAGE && <p className="bb-petit">{t(`Seuls les ${PAR_PAGE} premiers résultats sont affichés. Ajoute un mot pour affiner.`, `Only the first ${PAR_PAGE} results are shown. Add a word to narrow down.`)}</p>}
      </>}
    </>}
    <AideReference exemple={exemple} version={reglages.version} />
  </>;
  return <Page titre={t('Recherche dans les Écritures', 'Search the Scriptures')} retour={lien('/bible')} reglages={reglages} enfants={<>{formulaire}{corps}<Toast message={message} /></>} />;
}

function Raccourci({ libelle, vers }: { libelle: string; vers: string }) {
  const { t } = useLangue();
  return <div className="bb-carte bb-raccourci">
    <span className="bb-icone-or"><I nom="auto_stories" taille={18} /></span>
    <span><span className="bb-etiquette">{t('Raccourci de référence', 'Reference shortcut')}</span><strong>{libelle}</strong></span>
    <Link className="bb-bouton-clair bb-petit-bouton" to={vers}>{t('Accéder', 'Open')}<I nom="arrow_forward" taille={16} /></Link>
  </div>;
}

function AideReference({ exemple, version }: { exemple: string | null; version: Version }) {
  const { langue, t, lien } = useLangue();
  const matt = livreParCode('MAT')!;
  return <section className="bb-carte bb-aide-reference">
    <div className="bb-ligne-icone"><span className="bb-icone-or"><I nom="lightbulb" /></span><div><h2>{t('Tu cherches une référence précise ?', 'Looking for a precise reference?')}</h2><p>{t('Tape le nom d’un livre suivi du chapitre et du verset.', 'Type the name of a book followed by the chapter and verse.')}</p></div></div>
    <div className="bb-tuile"><span><strong>{nomReference(matt, 6, 33, langue)}</strong>{exemple && <em>{ouvre(version)}{exemple.length > 48 ? `${exemple.slice(0, 46)}…` : exemple}{ferme(version)}</em>}</span>
      <Link className="bb-bouton-noir bb-petit-bouton" to={lien(urlChapitre(matt, 6), { v: '33' })}>{t('Ouvrir le passage', 'Open the passage')}</Link></div>
  </section>;
}

function AucunResultat({ version, choisir }: { version: Version; choisir: (mot: string) => void }) {
  const { t, lien } = useLangue();
  const suggestions = version === 'lsg' ? ['sénevé', 'royaume', 'foi', 'fidèle', 'justice', 'prière'] : ['mustard', 'kingdom', 'faith', 'faithful', 'righteousness', 'prayer'];
  return <div className="bb-aucun">
    <div className="bb-centre"><Embleme /><h1>{t('Aucun résultat trouvé', 'No results found')}</h1><p>{t(`Aucun verset ne correspond à ta recherche dans la traduction ${VERSIONS[version].nom}.`, `No verse matches your search in the ${VERSIONS[version].nom} translation.`)}</p></div>
    <section className="bb-carte bb-conseils"><h2><I nom="lightbulb" taille={20} />{t('Conseils pour trouver un passage', 'Tips to find a passage')}</h2>
      <ul className="bb-puces"><li>{t('Vérifie l’orthographe des mots saisis.', 'Check the spelling of the words you typed.')}</li><li>{t('Essaie un mot plus simple ou un synonyme.', 'Try a simpler word or a synonym.')}</li><li>{t('Saisis directement une référence (ex. Matthieu 13:32).', 'Type a reference directly (e.g. Matthew 13:32).')}</li></ul></section>
    <span className="bb-etiquette-grise">{t('Essaie par exemple', 'Try for example')}</span>
    <div className="bb-mots">{suggestions.map(m => <button key={m} type="button" onClick={() => choisir(m)}>{m}</button>)}</div>
    <Link className="bb-bouton-noir" to={lien('/bible/livres')}><I nom="menu_book" taille={20} />{t('Parcourir les livres de la Bible', 'Browse the books of the Bible')}</Link>
  </div>;
}

/* ============================== 5. Annotations ============================== */

type Onglet = 'surlignages' | 'notes' | 'signets';
export function BibleAnnotations() {
  const { langue, t, lien } = useLangue();
  useTitre(t('Mes annotations', 'My annotations'), langue);
  const [params, setParams] = useSearchParams();
  const onglet: Onglet = params.get('onglet') === 'notes' || params.get('onglet') === 'signets' ? params.get('onglet') as Onglet : 'surlignages';
  const [reglages] = useReglages(langue);
  const [toutes, setToutes] = useState(lireAnnotations);
  const [couleur, setCouleur] = useState<Couleur | 'toutes'>('toutes');
  const [menu, setMenu] = useState<string | null>(null);
  const [note, setNote] = useState<Annotation | null>(null);
  const liste = Object.values(toutes).sort((a, b) => b.modifie.localeCompare(a.modifie));
  const parOnglet: Record<Onglet, Annotation[]> = { surlignages: liste.filter(a => a.couleur), notes: liste.filter(a => a.note), signets: liste.filter(a => a.signet) };
  const visibles = onglet === 'surlignages' && couleur !== 'toutes' ? parOnglet.surlignages.filter(a => a.couleur === couleur) : parOnglet[onglet];
  const derniere = lireDerniereLecture();
  const livreDerniere = livreParCode(derniere?.livre);
  const date = (iso: string) => new Intl.DateTimeFormat(langue === 'en' ? 'en-GB' : 'fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
  const choisirOnglet = (o: Onglet) => setParams(p => { const n = new URLSearchParams(p); if (o === 'surlignages') n.delete('onglet'); else n.set('onglet', o); return n; });
  const retirer = (a: Annotation) => {
    const base = { livre: a.livre, chapitre: a.chapitre, verset: a.verset, version: a.version, extrait: a.extrait };
    setToutes(onglet === 'surlignages' ? annoter(base, { couleur: undefined }) : onglet === 'notes' ? annoter(base, { note: '' }) : annoter(base, { signet: false }));
    setMenu(null);
  };
  return <Page titre={t('Mes annotations', 'My annotations')} retour={lien('/bible')} reglages={reglages} enfants={<>
    <section className="bb-intro"><span className="bb-etiquette"><I nom="bookmark_heart" taille={16} />{t('Sur ce téléphone', 'On this phone')}</span><h1>{t('Mes annotations', 'My annotations')}</h1></section>
    <div className="bb-onglets bb-onglets-trois" role="tablist" aria-label={t('Annotations', 'Annotations')}>
      {(['surlignages', 'notes', 'signets'] as Onglet[]).map(o => <button key={o} type="button" role="tab" aria-selected={onglet === o} onClick={() => choisirOnglet(o)}>
        {o === 'surlignages' ? t('Surlignages', 'Highlights') : o === 'notes' ? t('Notes', 'Notes') : t('Marque-pages', 'Bookmarks')}<span>{parOnglet[o].length}</span>
      </button>)}
    </div>
    {onglet === 'surlignages' && parOnglet.surlignages.length > 0 && <div className="bb-filtres" role="group" aria-label={t('Filtrer par couleur', 'Filter by colour')}>
      <button type="button" aria-pressed={couleur === 'toutes'} onClick={() => setCouleur('toutes')}>{t('Toutes', 'All')}<span>{parOnglet.surlignages.length}</span></button>
      {COULEURS.map(c => { const n = parOnglet.surlignages.filter(a => a.couleur === c.id).length; return n ? <button key={c.id} type="button" aria-pressed={couleur === c.id} onClick={() => setCouleur(c.id)}><i className={`bb-rond-couleur bb-pastille-${c.id}`} />{c[langue]}<span>{n}</span></button> : null; })}
    </div>}
    {visibles.length === 0
      ? <section className="bb-carte bb-vide"><span className="bb-icone-or bb-grande"><I nom="history_edu" taille={30} /></span>
        <h2>{onglet === 'signets' ? t('Aucun marque-page', 'No bookmarks') : onglet === 'notes' ? t('Aucune note', 'No notes') : t('Aucun surlignage', 'No highlights')}</h2>
        <p>{t('Touche un verset pendant ta lecture pour le surligner ou y ajouter une note.', 'Tap a verse while reading to highlight it or add a note.')}</p>
        <Link className="bb-bouton-noir" to={livreDerniere && derniere ? lien(urlChapitre(livreDerniere, derniere.chapitre)) : lien('/bible')}>{livreDerniere && derniere ? t(`Reprendre la lecture de ${nomReference(livreDerniere, derniere.chapitre)}`, `Resume reading ${nomReference(livreDerniere, derniere.chapitre, undefined, 'en')}`) : t('Ouvrir la Bible', 'Open the Bible')}<I nom="arrow_forward" taille={18} /></Link></section>
      : <ul className="bb-annotations">{visibles.map(a => {
        const livre = livreParCode(a.livre);
        if (!livre) return null;
        const reference = nomReference(livre, a.chapitre, a.verset, langue);
        const coul = COULEURS.find(c => c.id === a.couleur);
        return <li key={a.cle} className={`bb-carte bb-annotation ${a.couleur ? `bb-bord-${a.couleur}` : ''}`}>
          <div className="bb-ligne"><span><strong>{reference}</strong><span className="bb-puce-claire">{VERSIONS[a.version].court}</span><small className="bb-date">{date(a.modifie)}</small></span>
            <span className="bb-menu-zone">
              <button type="button" className="bb-rond" aria-expanded={menu === a.cle} aria-label={t(`Options pour ${reference}`, `Options for ${reference}`)} onClick={() => setMenu(menu === a.cle ? null : a.cle)}><I nom="more_vert" /></button>
              {menu === a.cle && <div className="bb-menu" role="menu">
                {onglet === 'surlignages' && <div className="bb-couleurs bb-couleurs-menu" role="group" aria-label={t('Changer la couleur', 'Change the colour')}>{COULEURS.map(c => <button key={c.id} type="button" className={`bb-pastille bb-pastille-${c.id}`} aria-pressed={a.couleur === c.id} aria-label={c[langue]} onClick={() => { setToutes(annoter({ livre: a.livre, chapitre: a.chapitre, verset: a.verset, version: a.version, extrait: a.extrait }, { couleur: c.id })); setMenu(null); }} />)}</div>}
                <Link role="menuitem" to={lien(urlChapitre(livre, a.chapitre), { v: String(a.verset) })}><I nom="auto_stories" taille={20} />{t('Ouvrir dans la Bible', 'Open in the Bible')}</Link>
                <button type="button" role="menuitem" onClick={() => { setNote(a); setMenu(null); }}><I nom="edit_note" taille={20} />{a.note ? t('Modifier la note', 'Edit the note') : t('Ajouter une note', 'Add a note')}</button>
                <button type="button" role="menuitem" className="bb-danger" onClick={() => retirer(a)}><I nom="delete" taille={20} />{onglet === 'surlignages' ? t('Retirer le surlignage', 'Remove highlight') : onglet === 'notes' ? t('Supprimer la note', 'Delete the note') : t('Retirer le marque-page', 'Remove bookmark')}</button>
              </div>}
            </span></div>
          <blockquote className="bb-citation"><mark className={a.couleur ? `bb-fond-${a.couleur}` : 'bb-fond-aucun'}>{ouvre(a.version)}{a.extrait}{ferme(a.version)}</mark></blockquote>
          {a.note && <div className="bb-note-perso"><span className="bb-etiquette"><I nom="edit_note" taille={16} />{t('Note personnelle', 'Personal note')}</span><p>{a.note}</p></div>}
          <div className="bb-ligne">{coul ? <span className="bb-petit"><i className={`bb-rond-couleur bb-pastille-${coul.id}`} />{coul[langue]}</span> : <span />}
            <Link className="bb-lien-chapitre" to={lien(urlChapitre(livre, a.chapitre), { v: String(a.verset) })}>{t('Lire le chapitre', 'Read the chapter')}<I nom="arrow_forward" taille={16} /></Link></div>
        </li>;
      })}</ul>}
    <p className="bb-rassurance"><I nom="lock" taille={20} />{t('Tes surlignages, notes et marque-pages sont enregistrés sur ce téléphone uniquement. Ils ne sont pas envoyés à SÉNEVÉ.', 'Your highlights, notes and bookmarks are saved on this phone only. They are not sent to SÉNEVÉ.')}</p>
    {note && <EditeurNote reference={nomReference(livreParCode(note.livre)!, note.chapitre, note.verset, langue)} version={note.version} texte={note.extrait} valeur={note.note ?? ''} fermer={() => setNote(null)}
      enregistrer={v => { setToutes(annoter({ livre: note.livre, chapitre: note.chapitre, verset: note.verset, version: note.version, extrait: note.extrait }, { note: v })); setNote(null); }} />}
  </>} />;
}
