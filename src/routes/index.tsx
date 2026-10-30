import '../styles-jardin-accueil.css';
import {Apparence} from '@/components/Apparence';
import {lireTailleResultat} from '@/components/LectureResultat';
import {ChoixRacines} from '@/components/ChoixRacines';
import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { compute, categorie } from '@/lib/racines';
import { texts, whatsappUrls, languageFrom, type Language } from '@/lib/test-texts';
import { chooseRoot, cleanSource, recordVisit, submitResult } from '@/lib/suivi-test';
import { ShareCard } from '@/components/ShareCard';
import { InviteCard } from '@/components/InviteCard';
import { IconeResultat } from '@/components/IconeResultat';
import { Icone } from '@/components/Icone';
import { EcouterQuestion } from '@/components/EcouterQuestion';
import { PenseeLivre, RepereParcours } from '@/components/RepereParcours';
import { memoriserRacineTest } from '@/lib/objectif';
import { strengthKind } from '@/lib/carte-partage';

/** Page du test, reliée à l'adresse : ?lang=en affiche la version anglaise, ?src=tt indique la provenance.
 * L'adresse courte /p, imprimée sur les images partagées, ouvre le test avec la provenance « partage ». */
export function TestPage({ defaultSource = null, defaultLanguage = 'fr' }: { defaultSource?: string | null; defaultLanguage?: Language } = {}) {
 const [search] = useSearchParams();
 // /en ouvre le test en anglais (adresse partagée, avec son aperçu WhatsApp anglais) ; ?lang= reste accepté.
 const language = languageFrom(search.get('lang') ?? defaultLanguage);
 const source = cleanSource(search.get('src')) ?? cleanSource(defaultSource);
 const next = language === 'fr' ? 'en' : 'fr';
 useEffect(() => {
  document.documentElement.lang = language;
  document.title = texts[language].tabTitle;
 }, [language]);
 const nextLink = `/?lang=${next}${source ? `&src=${source}` : ''}`;
 return <Index language={language} source={source} languageLink={<Link to={nextLink} className="link language-link">{texts[language].languageLink}</Link>} />;
}
function PrototypeButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
 return <button type="button" {...props} />;
}
function RootCard({ tag, k, total, language, explanation }: { tag: string; k: number; total: number; language: Language; explanation: string }) {
 const t = texts[language];
 const root = t.roots[k];
 if (!root) return null;
  return <div className="card result-hero"><div className="result-root-heading"><div><p className="tag">{tag}</p><h2>{root.n}</h2></div><p className="score-grand"><b>{total}</b> / 15</p></div><span className="cat-chip">{categorie(total, language)}</span><p className="muted">{explanation}</p><div className="quote-encart"><p className="result-auteur"><IconeResultat nom="format_quote" taille={18}/>Dr Justin Tshims</p><p className="quote">{t.quote(root.o ?? root.p)}</p><p className="src">{root.o && root.c ? t.openingSource(root.c) : t.quoteSource}</p></div></div>;
}
/** Racine forte (cahier n°4, §11 A) : la ou les racines au total le plus haut, sans note chiffrée.
 * Absente quand les sept racines sont au même niveau, toutes points d'appui, ou toutes à développer. */
function StrengthCard({ fortes, total, language }: { fortes: number[]; total: number; language: Language }) {
 const t = texts[language];
 const kind = strengthKind(total);
 const k = fortes[0];
 if (!kind || k === undefined) return null;
 const plusieurs = fortes.length > 1;
 const tag = kind === 'appui' ? (plusieurs ? t.strength.appuiPlusieurs : t.strength.appui) : (plusieurs ? t.strength.solidePlusieurs : t.strength.solide);
 return <div className="card result-strength"><p className="tag"><IconeResultat nom="psychiatry" taille={20}/>{tag}</p>
  {plusieurs
   ? <ul className="plain strength-list" role="list">{fortes.map(i => <li key={i}>{t.roots[i]?.n}</li>)}</ul>
   : <><h2>{t.roots[k]?.n}</h2><div className="strength-quote"><p className="quote">{t.quote(t.roots[k]?.p ?? '')}</p><p className="src">{t.quoteSource}</p></div></>}
  <p className="muted">{plusieurs ? t.resultHelp.strengthMany : t.resultHelp.strengthOne}</p>
 </div>;
}
function ResultBody({ answers, chosenRoot, onChoose, language, mantle = '' }: { answers: (number | null)[]; chosenRoot: number | null; onChoose: (k: number) => void; language: Language; mantle?: string }) {
   const t = texts[language];
   const R = t.roots;
  const [partageOuvert, setPartageOuvert] = useState(false);
  const r = compute(answers, t.reversed);
  if (!r) return null;
   // « Tout à développer » : chaque racine au minimum (3 / 15), après inversion des miroirs en FR V4.
   const allOne = r.t.every(total => total === 3);
   const allSupport = r.t.every(total => total >= 12);
   const freeChoice = allOne || allSupport || r.same;
   const needsChoice = freeChoice || r.faibles.length > 1;
   const indices = freeChoice ? R.map((_, k) => k) : r.faibles;
   const act = needsChoice ? (chosenRoot !== null && indices.includes(chosenRoot) ? chosenRoot : null) : r.faibles[0];
  const root = act === null || act === undefined ? undefined : R[act];
   const message = allOne
     ? t.allOne
     : allSupport
       ? t.allSupport
       : r.same
         ? t.equal
         : t.minimumTie;
  // Racine choisie, première action et, en cas d'égalité, l'inscription : ouverts sous la racine choisie (24/10/2026).
  const detail = root && act !== null && act !== undefined ? <>
    <RootCard language={language} tag={needsChoice ? t.chosen : t.suggested} k={act} total={r.t[act] ?? 3} explanation={needsChoice ? t.resultHelp.chosen : t.resultHelp.suggested} />
    <div className="card action-card result-action"><p className="tag"><IconeResultat nom="task_alt" taille={22}/>{t.firstAction}</p><div className="action-box"><p className="action">{root.a}</p><p className="src">{t.actionSource(root.j, root.n)}</p></div></div>
    {needsChoice && <a className="btn btn-link choix-continuer" href={`${import.meta.env.BASE_URL}connexion${language==='en'?'?lang=en':''}`}>{language==='en'?'Continue by creating an account':'Continuer en créant un compte'}</a>}
  </> : null;
  // Ordre du cahier n°4, §11 (rétabli le 22/10/2026) : racine forte, racine à fortifier, première action ;
  // puis le détail des 7 racines avec une barre par score, le partage et la suite.
  return <>
    {/* La racine forte ne dépend pas du choix fait en cas d'égalité en bas : elle s'affiche d'abord. */}
    {!r.same && !allSupport && <StrengthCard language={language} fortes={r.fortes} total={Math.max(...r.t)} />}
     {needsChoice && <><div className="result-choice-message"><IconeResultat nom={allSupport ? 'military_tech' : r.same ? 'spa' : 'balance'} taille={24}/><p>{message}</p></div><ChoixRacines language={language} indices={indices} totals={r.t} chosenRoot={chosenRoot} onChoose={onChoose} allSupport={allSupport} detail={detail} /></>}
     {!needsChoice && detail}
     {needsChoice && !root && <div className="result-choice-wait" role="status"><IconeResultat nom="hourglass_empty" taille={32}/><p>{language==='en'?'Choose a root above to discover your first action.':'Choisis une racine ci-dessus pour découvrir ta première action.'}</p></div>}
    {t.mantle && mantle.trim() && <div className="card manteau-resultat"><p className="tag">{t.mantle.resultTitle}</p><p className="quote">{t.quote(mantle.trim())}</p><p className="src">{t.mantle.source}</p><p className="muted">{t.mantle.kept}</p></div>}
    {root && <RepereParcours contexte="resultat" langue={language} />}
     <div className="card root-list-card"><p className="tag">{t.rootsTitle}<IconeResultat nom="analytics" taille={20}/></p><p>{t.summary}</p>
       
       <ul className="root-rows" role="list">{R.map((item, k) => {
         const total = r.t[k] ?? 3;
         return <li key={item.n} data-band={total >= 12 ? 'appui' : total <= 6 ? 'developper' : 'consolider'} className={['root-row',k===act?'is-start':'',!r.same&&!allSupport&&r.fortes.includes(k)&&strengthKind(total)?'is-appui':''].filter(Boolean).join(' ')}>
           <div className="root-row-top"><span className="root-num" aria-hidden="true">{k + 1}.</span><span className="root-summary-name">{item.n}</span><span className="root-score">{total} / 15</span></div>
           <span className="root-bar" aria-hidden="true"><i style={{ width: `${(total / 15) * 100}%` }} /></span>
           <div className="root-row-bottom"><span className="root-category">{k===act?<b>{language==='en'?'Priority':'Priorité'}</b>:null}{categorie(total, language)}</span><span className="root-percent" aria-hidden="true">{Math.round(total / 15 * 100)}%</span></div>
         </li>;
       })}</ul><div className="result-legend"><p>{language==='en'?'Reading guide':'Repères de lecture'}</p><dl>{t.categories.map((label,k)=><div key={label}><dt><span aria-hidden="true" data-band={k}/><b>{['3–6','7–11','12–15'][k]} :</b></dt><dd>{label}</dd></div>)}</dl></div><details className="result-method"><summary>{t.resultHelp.method}<IconeResultat nom="expand_more" taille={20}/></summary><p>{t.resultHelp.calculation}</p><p>{t.resultHelp.bands}</p><p>{t.resultHelp.close}</p></details>
     </div>
    {/* Image de partage repliée : elle ne s'affiche (et ne se dessine) que si la personne ouvre la section. */}
    {root && act !== null && act !== undefined && <details className="partage-repli" onToggle={e => setPartageOuvert(e.currentTarget.open)}><summary><span><IconeResultat nom="share" taille={22}/>{t.shareToggle}</span><IconeResultat nom="expand_more" taille={20}/></summary>{partageOuvert && <ShareCard editorial stitch language={language} totals={r.t} startRoot={act} />}</details>}
    {root && <div className="card result-next"><p className="tag">{t.further}</p><p className="more">{t.furtherText}</p><a className="btn btn-link" href={whatsappUrls[language]} target="_blank" rel="noopener noreferrer"><IconeResultat nom="chat" taille={20}/>{t.whatsappButton}</a>
      {/* Accord du 15/10/2026 : le résultat mène aussi à l'espace du site ; en anglais depuis le 18/10/2026 (page de connexion bilingue). */}
      <div className="result-espace"><p className="more">{t.espaceTexte}</p><a className="btn btn-link" href={`${import.meta.env.BASE_URL}connexion${language === 'en' ? '?lang=en' : ''}`}><IconeResultat nom="person_outline" taille={20}/>{t.espaceBouton}</a></div>
    </div>}
    {/* L'invitation ne dépend pas de la racine : visible même avant le choix en cas d'égalité (demande du 24/10/2026). */}
    <InviteCard langue={language} resultat />
    {act !== null && act !== undefined && <RememberRoot k={act} />}
 </>;
}
/** Garde sur cet appareil seulement la racine retenue, pour la proposer (sans l'imposer) comme objectif dans l'espace. */
function RememberRoot({ k }: { k: number }) {
  useEffect(() => { memoriserRacineTest(k); }, [k]);
  return null;
}
/** Temps pendant lequel le chiffre choisi reste visible avant la question suivante (ms). */
export const PAUSE_CHOIX = 350;
export function Index({ language = 'fr', languageLink, source = null }: { language?: Language; languageLink?: ReactNode; source?: string | null } = {}) {
 const t = texts[language];
 const [screen, setScreen] = useState<'home' | 'quiz' | 'result'>('home');
 const [tailleLecture]=useState(lireTailleResultat);
 const [answers, setAnswers] = useState<(number | null)[]>(Array(21).fill(null));
 const [i, setI] = useState(0);
  const [chosenRoot, setChosenRoot] = useState<number | null>(null);
 // Question libre sur le manteau : gardée seulement dans la page (ni enregistrée, ni envoyée).
 const [mantle, setMantle] = useState('');
 const question = useRef<HTMLParagraphElement>(null);
 const title = useRef<HTMLHeadingElement>(null);
 const focusNext = useRef(false);
 const passage = useRef<number | undefined>(undefined);
 useEffect(() => () => window.clearTimeout(passage.current), []);
 const visitRecorded = useRef(new Set<Language>());
 const savedResult = useRef<Promise<string | null> | null>(null);
 // Une ouverture comptée par chargement de la page et par langue affichée : passer au lien « English »
 // compte aussi une visite en anglais, pour que les tests terminés en anglais aient leurs visites.
 useEffect(() => {
  if (visitRecorded.current.has(language)) return;
  visitRecorded.current.add(language);
  void recordVisit(source, language);
 }, [language]);
 // Un enregistrement par test terminé.
 useEffect(() => {
  if (screen !== 'result' || savedResult.current) return;
  const complete = answers.filter((a): a is number => a !== null);
  if (complete.length !== 21) return;
  savedResult.current = submitResult(complete, source, language);
 }, [screen]);
 // En cas d'égalité, la racine choisie est enregistrée une fois le résultat sauvegardé.
 useEffect(() => {
  const pending = savedResult.current;
  if (chosenRoot === null || !pending) return;
  const k = chosenRoot;
  void pending.then(id => { if (id) void chooseRoot(id, k); });
 }, [chosenRoot]);
 useEffect(() => {
  window.scrollTo(0,0);
  if (screen === 'result') title.current?.focus();
 }, [screen]);
 useEffect(() => {
  if (focusNext.current) { question.current?.focus(); focusNext.current = false; }
 }, [i]);
 // Choisir une réponse passe aussitôt à la question suivante ; le bouton « Voir mon résultat » n'apparaît
 // qu'une fois les 21 réponses choisies (décision du 22/10/2026, remplace « Confirmer et suivant »).
 // Le chiffre choisi reste coloré un instant (PAUSE_CHOIX) avant la question suivante ; un autre choix pendant
 // ce temps remplace le premier et relance la pause.
 function answer(value: number) {
  setAnswers(previous => previous.map((a,k) => k === i ? value : a));
  window.clearTimeout(passage.current);
  if (i < 20) { const suivante = i + 1; passage.current = window.setTimeout(() => { focusNext.current = true; setI(suivante); }, PAUSE_CHOIX); }
 }
 function back() {
  window.clearTimeout(passage.current);
  if (i>0) setI(i-1);
 }
 // Mise en page des maquettes validées le 19/10/2026 (dossier « image app/corrigé », écrans 01, 02 et 03).
 const en = language === 'en';
 const racineEnCours = Math.floor(i/3);
 const barreTest = <header className="barre-haut">
  <PrototypeButton className="barre-retour" aria-label={en ? 'Back to the test home' : 'Revenir à l’accueil du test'} onClick={() => setScreen('home')}><Icone nom="fleche_gauche" taille={22} /></PrototypeButton>
  <div className="barre-titre"><span className="barre-marque">SÉNEVÉ</span><span>{t.homeTitle}</span></div>
 </header>;
 return <main className={`wrap${screen === 'home' ? ' jardin-accueil' : ''}`}>
  <section id="s-home" hidden={screen !== 'home'}>
   <header className="barre-haut home-head"><p className="brand logo-marque"><Icone nom="graine" taille={20} />{t.brand}</p>{languageLink}<Apparence langue={language} compact/></header>
   <div className="jardin-hero">
   {/* Photo au format d’origine ; tout ce qui suit est identique à l’accueil d’origine (demande du 23/10/2026). */}
   <div className="home-image"><img src={`${import.meta.env.BASE_URL}illustrations/seneve-pousse-photo-v1-720.webp`} srcSet={`${import.meta.env.BASE_URL}illustrations/seneve-pousse-photo-v1-360.webp 360w, ${import.meta.env.BASE_URL}illustrations/seneve-pousse-photo-v1-720.webp 720w`} sizes="(max-width:600px) calc(100vw - 40px), 560px" width={720} height={314} alt="" decoding="async" fetchPriority="high" /></div>
   <div className="jardin-message">
   <h1>{t.homeTitle}</h1>
   <h2 className="jardin-titre">{en ? <>Growth begins<br/><em>within.</em></> : <>Ce qui grandit<br/>commence<br/><em>à l’intérieur.</em></>}</h2>
   <p className="home-intro">{t.intro.split(/(Arrête de mendier des miracles|Stop Begging for Miracles)/).map((texte, index) => index % 2 ? <strong className="home-livre" key={index}>{texte}</strong> : texte)}</p>

   </div></div>
   <div className="home-reassure">{t.reassurance.map((item, k) => <span key={item} className="reassure-chip"><Icone nom={(['bouclier', 'liste', 'annuler'] as const)[k] ?? 'coche'} taille={22} />{item}</span>)}</div>
   <div className="home-card">
    <p className="home-kicker"><span className="point-or" aria-hidden="true" />{t.discover}</p>
    <ul className="plain home-steps" role="list" aria-label={t.discover}>{t.discoveries.map(item => <li key={item}>{item}</li>)}</ul>
   </div>
   {screen === 'home' && <details className="test-domaines"><summary>{en ? 'The 7 roots explored' : 'Les 7 racines explorées'}</summary><ol>{t.roots.map(root => <li key={root.n}>{root.n}</li>)}</ol></details>}
   <RepereParcours contexte="test" langue={language} />
   {t.opening && <figure className="home-ouverture"><blockquote className="quote">{t.quote(t.opening.text)}</blockquote><figcaption className="src">{t.opening.source}</figcaption></figure>}
   <p className="home-note quote-bloc">{t.instruction}</p>
   <div className="home-start">
    <PrototypeButton className="btn btn-fleche" id="start" onClick={() => setScreen('quiz')}>{t.start}<Icone nom="fleche" taille={20} /></PrototypeButton>
   </div>
   <p className="test-public-connexion"><a href={`${import.meta.env.BASE_URL}connexion${en ? '?lang=en' : ''}`}>{en ? 'Sign in' : 'Se connecter'}</a></p>
   <PenseeLivre langue={language} titre={en ? 'A guide from the book' : 'Un repère du livre'} />
   <p className="home-legal"><a className="link" href={`${import.meta.env.BASE_URL}confidentialite${en ? '?lang=en' : ''}`}>{en ? 'Privacy policy' : 'Confidentialité'}</a></p>
  </section>
  <section id="s-quiz" hidden={screen !== 'quiz'}>
   {barreTest}
   <div className="quiz-nav">
    {i > 0 ? <PrototypeButton className="link quiz-precedente" id="back" onClick={back}>{t.back}</PrototypeButton> : <span />}
    <span id="num" className="count-main">{t.questionCount(i+1)}</span>
   </div>
   <div className="quiz-racine-entete">
    <div><p className="quiz-racine-num" id="racine">{t.rootCount(racineEnCours+1)}</p>
    <h2 className="quiz-racine">{t.roots[racineEnCours]?.n}</h2></div>
    <span className="quiz-restantes" aria-label={t.remainingInRoot(3 - i % 3)}>{t.remaining(3 - i % 3)}</span>
   </div>
   {/* Une part par racine : elle se remplit question par question (3 questions par racine). */}
   <div className="segments" aria-hidden="true">
    {[0,1,2,3,4,5,6].map(k => <span key={k} className={k === racineEnCours ? 'segment-bloc is-current' : k < racineEnCours ? 'segment-bloc is-done' : 'segment-bloc'}><span className="segment"><i style={{ width: `${Math.min(1, Math.max(0, (i + 1 - 3*k) / 3)) * 100}%` }} /></span><b>{k+1}</b></span>)}
   </div>
   {i % 3 === 0 && t.roots[racineEnCours]?.s && <figure className="quiz-seuil"><blockquote className="quote">{t.quote(t.roots[racineEnCours]?.s ?? '')}</blockquote><figcaption className="src">{t.thresholdSource}</figcaption></figure>}
   <div className="quiz-card">
    <div className="quiz-card-haut"><span className="tag">{`Question ${i+1}`}</span><Icone nom="citation" taille={18} /></div>
    <p className="q" id="qtext" tabIndex={-1} ref={question}>{t.questions[i]}</p>
    {t.audioQuestions && screen === 'quiz' && <EcouterQuestion dossier={t.audioQuestions} n={i} langue={en ? 'en' : 'fr'} />}
    <p className="tap-hint"><Icone nom="graine" taille={16} />{t.tapHint}</p>
   </div>
   <div className="quiz-echelle"><span>{t.scaleTitle}</span><span>{t.scaleHint}</span></div>
   <div className="scale" id="scale" role="group" aria-label={t.answerGroup}>
    {[1,2,3,4,5].map(v => <div className="scale-option" key={v}><PrototypeButton className="scale-button" aria-pressed={answers[i]===v} aria-label={t.answerLabel(v)} onClick={() => answer(v)}>{v}</PrototypeButton>{'answerOptions' in t && <span className="scale-label" aria-hidden="true">{t.answerOptions[v - 1]}</span>}</div>)}
   </div>
   <div className="ends"><span>{t.never}</span><span>{t.always}</span></div>
   <div className="quiz-validation">
    {answers.every(a => a !== null) && t.mantle && <div className="quiz-manteau"><label htmlFor="manteau" className="quiz-manteau-question">{t.mantle.question}</label><textarea id="manteau" rows={3} maxLength={500} value={mantle} onChange={e => setMantle(e.target.value)} aria-describedby="manteau-aide" placeholder={t.mantle.label} /><p id="manteau-aide" className="muted">{t.mantle.hint}</p></div>}
    {answers.every(a => a !== null) && <PrototypeButton className="btn btn-fleche" onClick={() => setScreen('result')}>{t.seeResult}<Icone nom="fleche" taille={20} /></PrototypeButton>}
    <p className="quiz-confidentialite"><Icone nom="cadenas" taille={18} /><span>{t.privacyTest} <a className="link-inline" href={`${import.meta.env.BASE_URL}confidentialite${en ? '?lang=en' : ''}`}>{t.privacyLink}</a></span></p>
   </div>
  </section>
  <section id="s-result" data-lecture={tailleLecture} hidden={screen !== 'result'}>
   <header className="resultat-outils"><PrototypeButton className="result-retour" aria-label={en ? 'Back to the test home' : 'Revenir à l’accueil du test'} onClick={() => setScreen('home')}><Icone nom="fleche_gauche" taille={22}/></PrototypeButton><p className="result-brand"><Icone nom="graine" taille={24}/>SÉNEVÉ</p><Apparence langue={language} compact contraste/></header>
   <p className="resultat-puce">{t.resultBrand}</p><h1 id="rtitle" tabIndex={-1} ref={title}>{t.resultTitle}</h1>
    <div id="rbody">{screen === 'result' && <ResultBody language={language} answers={answers} chosenRoot={chosenRoot} onChoose={setChosenRoot} mantle={mantle} />}</div>
    <p className="muted result-final">{t.final}</p>
    <PrototypeButton className="link" id="again" onClick={() => { savedResult.current = null; setAnswers(Array(21).fill(null)); setChosenRoot(null); setMantle(''); setI(0); setScreen('home'); }}>{t.again}</PrototypeButton>
  </section>
 </main>;
}
