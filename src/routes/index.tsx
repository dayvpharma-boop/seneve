import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { compute, categorie } from '@/lib/racines';
import { texts, whatsappUrls, languageFrom, type Language } from '@/lib/test-texts';
import { chooseRoot, cleanSource, recordVisit, submitResult } from '@/lib/suivi-test';

/** Page du test, reliée à l'adresse : ?lang=en affiche la version anglaise, ?src=tt indique la provenance. */
export function TestPage() {
 const [search] = useSearchParams();
 const language = languageFrom(search.get('lang'));
 const source = cleanSource(search.get('src'));
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
function RootCard({ tag, k, total, language }: { tag: string; k: number; total: number; language: Language }) {
 const t = texts[language];
 const root = t.roots[k];
 if (!root) return null;
  return <div className="card"><p className="tag">{tag}</p><h2>{root.n}</h2><p className="root-category">{categorie(total, language)}</p><p className="quote">{t.quote(root.p)}</p><p className="src">{t.quoteSource}</p></div>;
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
  return <>
     <div className="card root-summary"><p>{t.summary}</p>
       <ul className="root-summary-list">{R.map((item, k) => <li key={item.n} className="root-summary-row">
         <span className="root-summary-name">{item.n}</span><span className="root-score">{r.t[k]} / 15</span>
         <span className="root-category">{categorie(r.t[k] ?? 3, language)}</span>
       </li>)}</ul>
     </div>
     {needsChoice && <><p>{message}</p><RootChoices language={language} indices={indices} chosenRoot={chosenRoot} onChoose={onChoose} /></>}
     {root && act !== null && act !== undefined && <RootCard language={language} tag={needsChoice ? t.chosen : t.suggested} k={act} total={r.t[act] ?? 3} />}
    {root && <div className="card"><p className="tag">{t.firstAction}</p><p className="action">{root.a}</p><p className="src">{t.actionSource(root.j, root.n)}</p></div>}
    {root && <div className="card"><p className="tag">{t.further}</p><p className="more">{t.furtherText}</p><a className="btn btn-link" href={whatsappUrls[language]} target="_blank" rel="noopener noreferrer">{t.whatsappButton}</a></div>}
 </>;
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
   <p className="brand">{t.brand}</p><h1>{t.homeTitle}</h1>
   <p>{t.intro}</p>
   <p>{t.discover}</p>
   <ul className="plain">{t.discoveries.map(item => <li key={item}>{item}</li>)}</ul>
   <p className="muted">{t.instruction}</p>
   <PrototypeButton className="btn" id="start" onClick={() => setScreen('quiz')}>{t.start}</PrototypeButton>
    {languageLink}
  </section>
  <section id="s-quiz" hidden={screen !== 'quiz'}>
   <div className="count"><span id="racine">{t.rootCount(Math.floor(i/3)+1)}</span><span id="num">{t.questionCount(i+1)}</span></div>
   <div className="bar"><i id="prog" style={{ width: `${i/21*100}%` }} /></div>
   <p className="q" id="qtext" tabIndex={-1} ref={question}>{t.questions[i]}</p>
   <div className="scale" id="scale" role="group" aria-label={t.answerGroup}>
    {[1,2,3,4,5].map(v => <PrototypeButton key={v} className="scale-button" aria-pressed={answers[i]===v} aria-label={t.answerLabel(v)} onClick={() => answer(v)}>{v}</PrototypeButton>)}
   </div>
   <div className="ends"><span>{t.never}</span><span>{t.always}</span></div>
   <PrototypeButton className="link" id="back" hidden={i===0} onClick={back}>{t.back}</PrototypeButton>
  </section>
  <section id="s-result" hidden={screen !== 'result'}>
   <p className="brand">{t.resultBrand}</p><h1 id="rtitle" tabIndex={-1} ref={title}>{t.resultTitle}</h1>
    <div id="rbody">{screen === 'result' && <ResultBody language={language} answers={answers} chosenRoot={chosenRoot} onChoose={setChosenRoot} />}</div>
    <p className="muted">{t.final}</p>
    <PrototypeButton className="link" id="again" onClick={() => { savedResult.current = null; setAnswers(Array(21).fill(null)); setChosenRoot(null); setI(0); setScreen('home'); }}>{t.again}</PrototypeButton>
  </section>
 </main>;
}
