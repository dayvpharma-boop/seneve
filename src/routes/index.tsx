import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { compute, categorie } from '@/lib/racines';
import { texts, whatsappUrls, languageFrom, type Language } from '@/lib/test-texts';
import { chooseRoot, cleanSource, recordVisit, submitResult } from '@/lib/suivi-test';
import { ShareCard } from '@/components/ShareCard';
import { InviteCard } from '@/components/InviteCard';
import { Icone } from '@/components/Icone';
import { memoriserRacineTest } from '@/lib/objectif';

/** Page du test, reliée à l'adresse : ?lang=en affiche la version anglaise, ?src=tt indique la provenance.
 * L'adresse courte /p, imprimée sur les images partagées, ouvre le test avec la provenance « partage ». */
export function TestPage({ defaultSource = null }: { defaultSource?: string | null } = {}) {
 const [search] = useSearchParams();
 const language = languageFrom(search.get('lang'));
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
function CheckIcon() {
 return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d="M5 12l4 4 10-10" /></svg>;
}
function RootCard({ tag, k, total, language }: { tag: string; k: number; total: number; language: Language }) {
 const t = texts[language];
 const root = t.roots[k];
 if (!root) return null;
  return <div className="card result-hero"><p className="tag">{tag}</p><h2>{root.n}</h2><span className="cat-chip">{categorie(total, language)}</span><p className="quote">{t.quote(root.p)}</p><p className="src">{t.quoteSource}</p></div>;
}
function RootChoices({ indices, chosenRoot, onChoose, language }: { indices: number[]; chosenRoot: number | null; onChoose: (k: number) => void; language: Language }) {
 const t = texts[language];
 return <div className="root-choices" role="radiogroup" aria-label={t.choose}>
      {indices.map((k,position) => <PrototypeButton key={k} className="root-choice" role="radio" aria-checked={chosenRoot===k} tabIndex={chosenRoot===k || (chosenRoot===null && position===0) ? 0 : -1} onClick={() => onChoose(k)} onKeyDown={event => {
      const direction = event.key==='ArrowDown' || event.key==='ArrowRight' ? 1 : event.key==='ArrowUp' || event.key==='ArrowLeft' ? -1 : 0;
      if (!direction && event.key!=='Home' && event.key!=='End') return;
      event.preventDefault();
       const next = event.key==='Home' ? 0 : event.key==='End' ? indices.length-1 : (position+direction+indices.length)%indices.length;
       const nextRoot = indices[next];
       if (nextRoot === undefined) return;
       onChoose(nextRoot);
      const buttons = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="radio"]');
      buttons?.[next]?.focus();
      }}>{t.roots[k]?.n}</PrototypeButton>)}
     </div>;
}
function ResultBody({ answers, chosenRoot, onChoose, language }: { answers: (number | null)[]; chosenRoot: number | null; onChoose: (k: number) => void; language: Language }) {
   const t = texts[language];
   const R = t.roots;
  const r = compute(answers);
  if (!r) return null;
   const allOne = answers.every(value => value === 1);
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
  // Ordre « Sentier » (14/10/2026) : d'abord la racine proposée, la première action et la suite WhatsApp,
  // puis le détail des 7 racines avec une barre par score, enfin le partage.
  return <>
     {needsChoice && <><p>{message}</p><RootChoices language={language} indices={indices} chosenRoot={chosenRoot} onChoose={onChoose} /></>}
     {root && act !== null && act !== undefined && <RootCard language={language} tag={needsChoice ? t.chosen : t.suggested} k={act} total={r.t[act] ?? 3} />}
    {root && <div className="card action-card result-action"><p className="tag">{t.firstAction}</p><div className="action-box"><Icone nom="livre" taille={22} /><p className="action">{root.a}</p></div><p className="src">{t.actionSource(root.j, root.n)}</p></div>}
    {root && <div className="card result-next"><p className="tag">{t.further}</p><p className="more">{t.furtherText}</p><a className="btn btn-link" href={whatsappUrls[language]} target="_blank" rel="noopener noreferrer">{t.whatsappButton}</a>
      {/* Accord du 15/10/2026 : le résultat mène aussi à l'espace du site. La page de connexion n'existe qu'en français pour l'instant. */}
      {language === 'fr' && <div className="result-espace"><p className="more">{t.espaceTexte}</p><a className="btn btn-link" href={`${import.meta.env.BASE_URL}connexion`}>{t.espaceBouton}</a></div>}
    </div>}
     <div className="card root-list-card"><p className="tag">{t.rootsTitle}</p><p>{t.summary}</p>
       <ul className="root-rows" role="list">{R.map((item, k) => {
         const total = r.t[k] ?? 3;
         return <li key={item.n} className={k === act ? 'root-row is-start' : 'root-row'}>
           <div className="root-row-top"><span className="root-summary-name">{item.n}</span><span className="root-score">{total} / 15</span></div>
           <span className="root-bar" aria-hidden="true"><i style={{ width: `${(total / 15) * 100}%` }} /></span>
           <span className="root-category">{categorie(total, language)}</span>
         </li>;
       })}</ul>
     </div>
    {root && act !== null && act !== undefined && <ShareCard language={language} totals={r.t} startRoot={act} />}
    {root && <InviteCard langue={language} />}
    {act !== null && act !== undefined && <RememberRoot k={act} />}
 </>;
}
/** Garde sur cet appareil seulement la racine retenue, pour la proposer (sans l'imposer) comme objectif dans l'espace. */
function RememberRoot({ k }: { k: number }) {
  useEffect(() => { memoriserRacineTest(k); }, [k]);
  return null;
}
export function Index({ language = 'fr', languageLink, source = null }: { language?: Language; languageLink?: ReactNode; source?: string | null } = {}) {
 const t = texts[language];
 const [screen, setScreen] = useState<'home' | 'quiz' | 'result'>('home');
 const [answers, setAnswers] = useState<(number | null)[]>(Array(21).fill(null));
 const [i, setI] = useState(0);
  const [chosenRoot, setChosenRoot] = useState<number | null>(null);
 const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
 const question = useRef<HTMLParagraphElement>(null);
 const title = useRef<HTMLHeadingElement>(null);
 const focusNext = useRef(false);
 const visitRecorded = useRef(false);
 const savedResult = useRef<Promise<string | null> | null>(null);
 useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
 // Une ouverture comptée par chargement de la page.
 useEffect(() => {
  if (visitRecorded.current) return;
  visitRecorded.current = true;
  void recordVisit(source, language);
 }, []);
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
 function answer(value: number) {
  if (timer.current) return;
  setAnswers(previous => previous.map((a,k) => k === i ? value : a));
  timer.current = setTimeout(() => {
   timer.current = null;
   if (i < 20) { focusNext.current = true; setI(i+1); } else setScreen('result');
  },160);
 }
 function back() {
  if (timer.current) { clearTimeout(timer.current); timer.current = null; }
  if (i>0) setI(i-1);
 }
 return <main className="wrap">
  <section id="s-home" hidden={screen !== 'home'}>
   <div className="home-head"><p className="brand">{t.brand}</p>{languageLink}</div>
   <h1>{t.homeTitle}</h1>
   <p className="home-intro">{t.intro}</p>
   <div className="home-reassure">{t.reassurance.map(item => <span key={item} className="reassure-chip"><CheckIcon />{item}</span>)}</div>
   <div className="home-card">
    <p className="home-kicker">{t.discover}</p>
    <ul className="plain home-steps" role="list">{t.discoveries.map(item => <li key={item}>{item}</li>)}</ul>
   </div>
   <p className="muted home-note">{t.instruction}</p>
   <div className="home-start">
    <PrototypeButton className="btn" id="start" onClick={() => setScreen('quiz')}>{t.start}</PrototypeButton>
   </div>
   <p className="home-legal"><a className="link" href={`${import.meta.env.BASE_URL}confidentialite`}>{language === 'en' ? 'Privacy policy (in French)' : 'Confidentialité'}</a></p>
  </section>
  <section id="s-quiz" hidden={screen !== 'quiz'}>
   <div className="count"><span id="num" className="count-main">{t.questionCount(i+1)}</span><span id="racine">{t.rootCount(Math.floor(i/3)+1)}</span></div>
   {/* Une part par racine : elle se remplit question par question (3 questions par racine). */}
   <div className="segments" aria-hidden="true">
    {[0,1,2,3,4,5,6].map(k => <span key={k} className="segment"><i style={{ width: `${Math.min(1, Math.max(0, (i + 1 - 3*k) / 3)) * 100}%` }} /></span>)}
   </div>
   <div className="quiz-card">
   <p className="q" id="qtext" tabIndex={-1} ref={question}>{t.questions[i]}</p>
   <div className="scale" id="scale" role="group" aria-label={t.answerGroup}>
    {[1,2,3,4,5].map(v => <PrototypeButton key={v} className="scale-button" aria-pressed={answers[i]===v} aria-label={t.answerLabel(v)} onClick={() => answer(v)}>{v}</PrototypeButton>)}
   </div>
   <div className="ends"><span>{t.never}</span><span>{t.always}</span></div>
   <p className="tap-hint">{t.tapHint}</p>
      <PrototypeButton className="link" id="back" hidden={i===0} onClick={back}>{t.back}</PrototypeButton>
   </div>
  </section>
  <section id="s-result" hidden={screen !== 'result'}>
   <p className="brand">{t.resultBrand}</p><h1 id="rtitle" tabIndex={-1} ref={title}>{t.resultTitle}</h1>
    <div id="rbody">{screen === 'result' && <ResultBody language={language} answers={answers} chosenRoot={chosenRoot} onChoose={setChosenRoot} />}</div>
    <p className="muted">{t.final}</p>
    <PrototypeButton className="link" id="again" onClick={() => { savedResult.current = null; setAnswers(Array(21).fill(null)); setChosenRoot(null); setI(0); setScreen('home'); }}>{t.again}</PrototypeButton>
  </section>
 </main>;
}
