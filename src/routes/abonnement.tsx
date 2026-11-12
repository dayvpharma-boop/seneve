import {useCallback,useEffect,useState,type ReactNode} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {retourPrecedent} from '@/lib/retour-precedent';
import {supabase} from '@/lib/supabase';
import {IconeTrait as T} from '@/components/IconeTrait';
import {BarreNav} from '@/components/BarreNav';
import {FORMULES,VALEUR_SEPAREE_PLUS,chargerMonAbonnement,economieAn,offreAbonnement,prixAnnuelMensualise,type IdFormule,type MonAbonnement} from '@/lib/abonnements';
import './profil-v2.css';
import './abonnement.css';

/** Icônes au trait, dans l'esprit de SF Symbols (maquette v2 validée par Dr Justin le 08/11/2026). */
type Pictogramme='graine'|'pousse'|'tige'|'arbre'|'calendrier'|'bulles'|'graphe'|'pieces'|'compte'|'livre'|'casque'|'diplome'|'etoile'|'personne'|'cadenas'|'cadeau'|'recu'|'aide'|'coeur'|'eclair'|'appel'|'message'|'plan'|'cloche'|'coche'|'chevron';
const TRACES:Record<Pictogramme,ReactNode>={
 graine:<><path d="M12 3.5c3.6 3.4 5.6 7 4.6 10.4-.8 2.9-3.1 4.6-4.6 4.6s-3.8-1.7-4.6-4.6C6.4 10.5 8.4 6.9 12 3.5z"/><path d="M12 9v9.5"/></>,
 pousse:<><path d="M12 20.5V11"/><path d="M12 11C12 7 9 4.5 4.5 4.5 4.5 8.8 7.6 11 12 11z"/><path d="M12 13.5c0-3.5 2.7-6 7.5-6 0 4-3 6-7.5 6z"/></>,
 tige:<><path d="M12 21V6.5"/><path d="M12 13c-3.6 0-6.2-2-6.2-5.6 3.6 0 6.2 2 6.2 5.6z"/><path d="M12 9.5c0-3.4 2.3-5.8 6-5.8 0 3.4-2.4 5.8-6 5.8z"/><path d="M12 17.5c0-2.8 2.1-4.6 5.3-4.6 0 2.8-2.2 4.6-5.3 4.6z"/></>,
 arbre:<><path d="M12 21v-5.5M8.5 21h7"/><path d="M12 15.5c-4.4 0-7-2.6-7-6.2C5 5.7 8.1 3 12 3s7 2.7 7 6.3c0 3.6-2.6 6.2-7 6.2z"/><path d="M12 15.5l-2.5-3M12 13l2.6-3"/></>,
 calendrier:<><rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4M8 14h2M12 14h2"/></>,
 bulles:<><path d="M4 5.5h11a2 2 0 012 2v6a2 2 0 01-2 2H9l-4 3.5v-3.5H4a2 2 0 01-2-2v-6a2 2 0 012-2z"/><path d="M19 9h1a2 2 0 012 2v5.5a2 2 0 01-2 2h-1v3l-3.5-3"/></>,
 graphe:<path d="M4 20V4M4 20h16M8 15l3.5-4 3 2.5L19 8"/>,
 pieces:<><ellipse cx="9" cy="7" rx="5.5" ry="2.5"/><path d="M3.5 7v4c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5V7"/><path d="M9.5 16.4c.9 1.3 3.3 2.1 5.5 2.1 3 0 5.5-1.1 5.5-2.5v-4c0-1.2-1.8-2.2-4.3-2.4"/></>,
 compte:<><rect x="3" y="6" width="18" height="13" rx="3"/><path d="M3 10.5h18M7 15h4"/></>,
 livre:<><path d="M3 5.5C5.5 4 9 4 12 6c3-2 6.5-2 9-.5v13.5c-2.5-1.5-6-1.5-9 .5-3-2-6.5-2-9-.5z"/><path d="M12 6v13.5"/></>,
 casque:<><path d="M4 15.5V12a8 8 0 0116 0v3.5"/><rect x="3" y="14" width="4.5" height="6.5" rx="1.6"/><rect x="16.5" y="14" width="4.5" height="6.5" rx="1.6"/></>,
 diplome:<><path d="M2.5 9L12 4.5 21.5 9 12 13.5z"/><path d="M6.5 11v5c1.6 1.6 3.4 2.4 5.5 2.4s3.9-.8 5.5-2.4v-5M21.5 9v5.5"/></>,
 etoile:<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>,
 personne:<><circle cx="12" cy="8" r="3.8"/><path d="M4.5 20c.8-3.8 3.8-6 7.5-6s6.7 2.2 7.5 6"/></>,
 cadenas:<><rect x="5" y="10.5" width="14" height="10" rx="2.4"/><path d="M8 10.5V8a4 4 0 018 0v2.5"/></>,
 cadeau:<><rect x="3.5" y="9" width="17" height="11.5" rx="2.2"/><path d="M2.5 9h19M12 9v11.5M12 9C10 5 6 5 6 7.5S10 9 12 9zM12 9c2-4 6-4 6-1.5S14 9 12 9z"/></>,
 recu:<><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/></>,
 aide:<><circle cx="12" cy="12" r="9"/><path d="M9.6 9.3a2.5 2.5 0 014.8.9c0 1.7-2.4 2.2-2.4 3.8M12 17h0"/></>,
 coeur:<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0112 7.4 4.3 4.3 0 0119.5 10c0 5.4-7.5 10-7.5 10z"/>,
 eclair:<path d="M13 2.5L5 13.5h6l-1 8 8-11h-6z"/>,
 appel:<path d="M6.5 3.5h3l1.5 4-2 1.5a11 11 0 006 6l1.5-2 4 1.5v3a2 2 0 01-2 2C10.5 19.5 4.5 13.5 4.5 5.5a2 2 0 012-2z"/>,
 message:<path d="M4 4.5h16a1.5 1.5 0 011.5 1.5v10a1.5 1.5 0 01-1.5 1.5H9l-5 3.5V6A1.5 1.5 0 014 4.5z"/>,
 plan:<><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".8"/></>,
 cloche:<path d="M6 16.5V11a6 6 0 0112 0v5.5l1.5 2h-15zM10 20.5a2 2 0 004 0"/>,
 coche:<path d="M5 12.8l4.4 4.2L19 7.5"/>,
 chevron:<path d="M9.5 5.5l6 6.5-6 6.5"/>,
};
const Picto=({nom,taille=18}:{nom:Pictogramme;taille?:number})=><svg viewBox="0 0 24 24" width={taille} height={taille} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{TRACES[nom]}</svg>;
const Tuile=({nom,teinte,grande}:{nom:Pictogramme;teinte:string;grande?:boolean})=><span className={`ab-tuile ab-t-${teinte}${grande?' ab-tuile-grande':''}`} aria-hidden="true"><Picto nom={nom} taille={grande?30:18}/></span>;
const EMBLEME:Record<IdFormule,[Pictogramme,string]>={graine:['graine','vert'],senev:['pousse','violet'],plus:['tige','indigo'],accompagnement:['arbre','or']};
const Embleme=({id,petite}:{id:IdFormule;petite?:boolean})=>petite?<Tuile nom={EMBLEME[id][0]} teinte={EMBLEME[id][1]}/>:<Tuile nom={EMBLEME[id][0]} teinte={EMBLEME[id][1]} grande/>;

/** Icône et couleur d'un avantage, d'après ses mots (les textes restent ceux de FORMULES). */
const REPERES:[RegExp,Pictogramme,string][]=[
 [/Habitudes & Défis|Habits & Challenges/,'calendrier','violet'],[/habitude et un défi|habit and a challenge|adaptés|adapted/,'cloche','rouge'],
 [/Coach/,'bulles','cyan'],[/Bilans|bilan mensuel|reviews|monthly review/i,'graphe','bleu'],[/SÉNEVÉ Finance/,'pieces','vert'],[/SÉNEVÉ Compte|SÉNEVÉ Account/,'compte','menthe'],
 [/audio/i,'casque','rose'],[/livre|book/i,'livre','orange'],[/Formation|training/i,'diplome','bleu'],[/recommandés|Recommended/,'etoile','mauve'],
 [/accompagnateur attitré|dedicated mentor/,'personne','or'],[/plan de croissance|growth plan/,'plan','vert'],[/appel|call/i,'appel','vert'],[/WhatsApp/,'message','vert'],
 [/prioritaires|Priority/,'eclair','orange'],[/Prière|Prayer/,'coeur','rose'],[/Encouragements|encouragement/,'coeur','rouge'],[/Tout Sénevé Plus|Everything in Sénevé Plus/,'tige','indigo'],
 [/Nouveaux contenus|New content/,'etoile','mauve'],[/progression|progress/,'graphe','menthe'],[/7 Racines|7 Roots/,'graine','vert'],[/offrir|give|offert|free/i,'cadeau','orange'],[/Prix garanti|Price locked/,'cadenas','gris'],
];
const repere=(texte:string):[Pictogramme,string]=>{const r=REPERES.find(([re])=>re.test(texte));return r?[r[1],r[2]]:['coche','gris'];};
/** « Titre : précision » devient un titre en gras et une ligne en gris. */
const decouper=(texte:string):[string,string|null]=>{const i=texte.indexOf(' : ')>=0?texte.indexOf(' : '):texte.indexOf(': ');if(i<0)return [texte,null];const reste=texte.slice(i).replace(/^\s?:\s/,'');return [texte.slice(0,i),reste.charAt(0).toUpperCase()+reste.slice(1)];};
const Atout=({texte}:{texte:string})=>{const [nom,teinte]=repere(texte),[titre,detail]=decouper(texte);return <li><Tuile nom={nom} teinte={teinte}/><span><b>{titre}</b>{detail&&<small>{detail}</small>}</span></li>;};

/** Tableau comparatif : uniquement ce que FORMULES contient déjà. */
type Case='oui'|'non'|[string,string];
const COMPARER:{nom:[string,string];sous?:[string,string];cases:Case[]}[]=[
 {nom:['Habitudes & Défis','Habits & Challenges'],sous:['Parcours de 6 mois, un mois à la fois','6-month journey, one month at a time'],cases:[['Mois 1','Month 1'],['Mois 1 à 6','Months 1–6'],['Mois 1 à 6','Months 1–6'],['Mois 1 à 6','Months 1–6']]},
 {nom:['SÉNEVÉ Finance','SÉNEVÉ Finance'],cases:[['Mois 1','Month 1'],'oui','oui','oui']},
 {nom:['Coach et bilans','Coach and reviews'],cases:['non','oui','oui','oui']},
 {nom:['Livre PDF et audio','PDF and audio book'],cases:['non','non','oui','oui']},
 {nom:['Formations','Trainings'],cases:['non','non','oui','oui']},
 {nom:['Recommandations','Recommendations'],cases:['non','non','oui','oui']},
 {nom:['Accompagnateur','Mentor'],cases:['non','non','non','oui']},
];
const NB_VISIBLES=6;

/** « Mon abonnement », dans Mes réglages. Données : seneve.mon_abonnement() (seneve_063) ; un bouton d'achat
 * n'apparaît que lorsque le produit Chariow existe. Dessin v2 (style Réglages d'iPhone) validé le 08/11/2026. */
export function Abonnement(){
 const [params]=useSearchParams();const en=params.get('lang')==='en',langue=en?'en':'fr',l=(fr:string,english:string)=>en?english:fr,suffixe=en?'?lang=en':'';
 const [donnees,setDonnees]=useState<MonAbonnement|null>(null),[etat,setEtat]=useState<'chargement'|'pret'|'erreur'|'deconnecte'>('chargement');
 const [periode,setPeriode]=useState<'mois'|'an'>('mois'),[choix,setChoix]=useState<IdFormule|null>(null),[tout,setTout]=useState(false);
 const charger=useCallback(()=>{setEtat('chargement');void supabase.auth.getSession().then(s=>{if(!s.data.session){setEtat('deconnecte');return;}return chargerMonAbonnement().then(d=>{setDonnees(d);setEtat('pret');});}).catch(()=>setEtat('erreur'));},[]);
 useEffect(()=>{charger();},[charger]);
 useEffect(()=>{document.title=`${l('Mon abonnement','My subscription')} — SÉNEVÉ`;document.documentElement.lang=langue;},[en]);
 const format=(d:Date,annee=true)=>new Intl.DateTimeFormat(en?'en-GB':'fr-FR',annee?{day:'numeric',month:'long',year:'numeric'}:{day:'numeric',month:'long'}).format(d);
 const prix=(m:number)=>m===0?l('Gratuit','Free'):en?`$${m.toLocaleString('en-US',{maximumFractionDigits:2})}`:`${m.toLocaleString('fr-FR',{maximumFractionDigits:2})} $`;
 const tete=<><header className="pv-haut"><Link onClick={retourPrecedent} className="pv-rond" to={`/reglages${suffixe}`} aria-label={l('Revenir à mes réglages','Back to my settings')}><T nom="retour"/></Link></header>
  <p className="ab-retour">{l('Mes réglages','My settings')}</p>
  <h1 className="ab-titre">{l('Mon abonnement','My subscription')}</h1></>;
 if(etat!=='pret'||!donnees)return <main className="pf-page pv-page ab-page avec-nav">{tete}
  {etat==='chargement'?<p role="status" className="ab-vide">{l('Chargement de ton abonnement…','Loading your subscription…')}</p>
   :etat==='deconnecte'?<section className="ab-carte ab-message-carte"><p>{l('Connecte-toi pour voir ton abonnement.','Sign in to see your subscription.')}</p><Link className="ab-cta" to={`/connexion${suffixe}`}>{l('Me connecter','Sign in')}</Link></section>
   :<section className="ab-carte ab-message-carte" role="alert"><p>{l('Impossible de charger ton abonnement. Vérifie ta connexion, puis réessaie.','Unable to load your subscription. Check your connection, then try again.')}</p><button type="button" className="ab-cta" onClick={charger}>{l('Réessayer','Try again')}</button></section>}
  <BarreNav langue={langue} maquette iconesJournee/>
 </main>;

 const actuelle=donnees.formule,f=FORMULES.find(x=>x.id===actuelle)!;
 const maintenant=Date.now(),dateFin=donnees.fin?new Date(donnees.fin):null,dateDebut=donnees.debut?new Date(donnees.debut):null;
 const restants=dateFin?Math.max(0,Math.ceil((+dateFin-maintenant)/864e5)):null,total=dateFin&&dateDebut?Math.max(1,Math.round((+dateFin-+dateDebut)/864e5)):1;
 const termine=restants===0,bientot=!termine&&restants!==null&&restants<=7;
 const selection=choix??(actuelle==='graine'?'plus':actuelle),d=FORMULES.find(x=>x.id===selection)!;
 const annuel=periode==='an'&&d.an!==null,lien=d.id==='graine'?null:donnees.liens[offreAbonnement(d.id,periode,langue)];
 const avantages=tout?d.avantages:d.avantages.slice(0,NB_VISIBLES);
 const nomFormule=(id:IdFormule)=>l(...FORMULES.find(x=>x.id===id)!.nom);
 const contenuGraine=l('Ton mois gratuit comprend Habitudes & Défis, SÉNEVÉ Finance, le Test des 7 Racines, la Bible et ton journal.','Your free month includes Habits & Challenges, SÉNEVÉ Finance, the 7 Roots Test, the Bible and your journal.');

 return <main className="pf-page pv-page ab-page avec-nav">
  {tete}
  <p className="ab-intro">{l('Choisis ta formule. Tu peux en changer à tout moment.','Choose your plan. You can change it at any time.')}</p>

  {/* 1. Ta formule */}
  <section className={`ab-carte ab-encours${termine?' ab-terminee':bientot?' ab-bientot':''}`} aria-label={l('Ma formule actuelle','My current plan')}>
   <div className="ab-encours-haut"><Embleme id={f.id}/><div className="ab-encours-nom"><small>{l('Ta formule','Your plan')}</small><h2>{l(...f.nom)}</h2>{donnees.periode&&<span className="ab-duree">{donnees.periode==='an'?l('À l’année','Yearly'):l('Au mois','Monthly')}</span>}</div><span className="ab-etat"><i/>{termine?l('Terminée','Ended'):l('Active','Active')}</span></div>
   {dateFin&&restants!==null&&(termine?<p className="ab-pied-carte">{l(`Ta formule s’est terminée le ${format(dateFin)}. Tout ce que tu as vécu est gardé : choisis une formule pour continuer.`,`Your plan ended on ${format(dateFin)}. Everything you have lived is kept: choose a plan to continue.`)}</p>
    :<div className="ab-jauge-bloc"><p className="ab-chiffres"><b>{l(`Encore ${restants} jour${restants>1?'s':''}`,`${restants} day${restants>1?'s':''} left`)}</b><span>{l(`jusqu’au ${format(dateFin,false)}`,`until ${format(dateFin,false)}`)}</span></p>
     <div className="ab-jauge" role="meter" aria-valuemin={0} aria-valuemax={total} aria-valuenow={restants} aria-label={l('Jours restants','Days left')}><span style={{width:`${Math.min(100,restants/total*100)}%`}}/></div>
     {bientot&&<p className="ab-alerte">{l('Ta formule se termine bientôt. Rien n’est prélevé automatiquement : renouvelle quand tu veux.','Your plan ends soon. Nothing is charged automatically: renew whenever you like.')}</p>}</div>)}
   {actuelle==='graine'&&!termine&&<p className="ab-pied-carte">{contenuGraine}</p>}
   {(termine||bientot)&&<div className="ab-action"><a className="ab-cta" href="#formules">{actuelle==='graine'?l('Choisir une formule','Choose a plan'):l('Renouveler','Renew')}</a></div>}
  </section>

  {/* 2. Choisir une formule */}
  <h2 className="ab-section" id="formules">{l('Choisir une formule','Choose a plan')}</h2>
  <div className={`ab-periode ab-periode-${periode}`} role="radiogroup" aria-label={l('Durée','Duration')}><span className="ab-curseur" aria-hidden="true"/>
   <button type="button" role="radio" aria-checked={periode==='mois'} onClick={()=>setPeriode('mois')}>{l('Au mois','Monthly')}</button>
   <button type="button" role="radio" aria-checked={periode==='an'} onClick={()=>setPeriode('an')}>{l('À l’année','Yearly')} · <em>{l('2 mois offerts','2 months free')}</em></button>
  </div>
  <div className="ab-groupe ab-formules" role="radiogroup" aria-label={l('Formules','Plans')}>
   {FORMULES.map(x=>{const an=periode==='an'&&x.an!==null,est=x.id===actuelle;
    return <button key={x.id} type="button" role="radio" aria-checked={x.id===selection} className={`ab-f${x.id===selection?' ab-choisie':''}`} onClick={()=>{setChoix(x.id);setTout(false);}}>
     <span className="ab-radio" aria-hidden="true"/>
     <span className="ab-f-nom"><b>{l(...x.nom)}{x.badge&&<span className="ab-etiq ab-etiq-or">{l(...x.badge)}</span>}{x.places&&<span className="ab-etiq">{l(...x.places)}</span>}</b><small>{est?(termine?l('Ta dernière formule','Your last plan'):l('Ta formule actuelle','Your current plan')):l(...x.accroche)}</small></span>
     <span className="ab-f-prix"><b>{x.mois===0?l('Gratuit','Free'):prix(an?x.an!:x.mois)}</b><small>{x.mois===0?l('1 mois','1 month'):an?l('par an','a year'):l('par mois','a month')}</small></span>
    </button>;})}
  </div>

  {/* Détail de la formule choisie */}
  <section className={`ab-carte ab-detail ab-detail-${d.id}`} aria-label={nomFormule(d.id)}>
   <div className="ab-detail-tete"><Embleme id={d.id}/><div><h3>{l(...d.nom)}</h3><p>{l(...d.accroche)}</p></div></div>
   {d.mois>0&&<p className="ab-montant"><b>{prix(annuel?d.an!:d.mois)}</b><span>{annuel?l('par an','a year'):l('par mois','a month')}</span>{annuel&&<small>{l(`soit ${prix(prixAnnuelMensualise(d)!)} par mois`,`i.e. ${prix(prixAnnuelMensualise(d)!)} a month`)}</small>}</p>}
   {annuel&&<p className="ab-economie">{l(`Tu économises ${prix(economieAn(d))} par an`,`You save ${prix(economieAn(d))} a year`)}</p>}
   {d.id==='plus'&&<p className="ab-valeur">{l('Ces contenus vaudraient ','This content would cost ')}<b>{prix(Math.round(VALEUR_SEPAREE_PLUS))}</b>{l(' achetés séparément.',' bought separately.')}</p>}
   <ul className="ab-atouts">{avantages.map(a=><Atout key={a[0]} texte={l(...a)}/>)}</ul>
   {d.avantages.length>NB_VISIBLES&&<button type="button" className="ab-tout" onClick={()=>setTout(!tout)} aria-expanded={tout}>{tout?l('Voir moins','Show less'):l(`Voir les ${d.avantages.length} avantages`,`See all ${d.avantages.length} benefits`)}<Picto nom="chevron" taille={14}/></button>}
   {annuel&&d.bonusAn&&<><p className="ab-sous-titre">{l('Inclus avec l’année','Included with the year')}</p><ul className="ab-atouts">{d.bonusAn.map(b=><Atout key={b[0]} texte={l(...b)}/>)}</ul></>}
   <div className="ab-action">
    {d.id==='graine'?(actuelle==='graine'&&!termine?<span className="ab-cta ab-desactive">{l('Ta formule actuelle','Your current plan')}</span>:null)
     :d.id==='accompagnement'?<Link className="ab-cta" to={`/aide?motif=accompagnement${en?'&lang=en':''}`}>{l('Demander une place','Ask for a place')}</Link>
     :lien?<a className="ab-cta" href={lien} target="_blank" rel="noopener noreferrer">{d.id===actuelle?l('Renouveler','Renew'):l(`Choisir ${d.nom[0]}`,`Choose ${d.nom[1]}`)}</a>
     :<span className="ab-cta ab-desactive">{l('Bientôt disponible','Coming soon')}</span>}
    {d.id!=='graine'&&<small className="ab-rassure"><Picto nom="cadenas" taille={13}/>{l('Aucun prélèvement automatique','No automatic charge')}</small>}
   </div>
  </section>

  {/* 3. Comparer */}
  <h2 className="ab-section">{l('Comparer les formules','Compare plans')}</h2>
  <div className="ab-groupe ab-compare" role="table" aria-label={l('Ce que comprend chaque formule','What each plan includes')}>
   <div className="ab-ligne ab-ligne-tete" role="row"><span className="ab-lib" role="columnheader">{l('Inclus','Included')}</span>{FORMULES.map(x=><span key={x.id} className="ab-col" role="columnheader"><Embleme id={x.id} petite/>{x.id==='plus'?'Plus':x.id==='accompagnement'?l('Accomp.','Mentor'):l(...x.nom)}</span>)}</div>
   {COMPARER.map(r=><div key={r.nom[0]} className="ab-ligne" role="row"><span className="ab-lib" role="rowheader">{l(...r.nom)}{r.sous&&<small>{l(...r.sous)}</small>}</span>
    {r.cases.map((c,i)=><span key={i} className="ab-col" role="cell">{c==='oui'?<span className="ab-oui" aria-label={l('Inclus','Included')}><Picto nom="coche" taille={11}/></span>:c==='non'?<span className="ab-non" aria-label={l('Non inclus','Not included')}/>:<span className="ab-mois">{(([a,...b])=><>{a}<br/>{b.join(' ')}</>)(l(...c).split(' '))}</span>}</span>)}</div>)}
  </div>
  <p className="ab-pied">{l('Habitudes & Défis est un parcours de 6 mois. Avec Graine, tu vis le mois 1. Avec une formule payante, tu avances un mois à la fois : chaque mois payé ouvre le mois suivant, jusqu’au mois 6. Pour vivre les 6 mois, il faut donc 6 mois d’abonnement, ou l’année.','Habits & Challenges is a 6-month journey. With Seed, you live month 1. With a paid plan, you move forward one month at a time: each paid month opens the next one, up to month 6. To live all 6 months, you need 6 months of subscription, or the year.')}</p><p className="ab-pied">{l('À l’année, chaque formule payante offre 2 mois et des avantages en plus.','Yearly, each paid plan gives 2 months free and extra benefits.')}</p>

  {/* 4. Offrir */}
  <h2 className="ab-section">{l('Faire un cadeau','Give a gift')}</h2>
  <section className="ab-carte ab-offrir" aria-label={l('Offrir un abonnement','Give a subscription')}>
   <Tuile nom="cadeau" teinte="orange" grande/>
   <div><h3>{l('Offrir un mois de Sénevé','Give a month of Sénevé')}</h3><p>{l('À un proche, à ton église ou à quelqu’un qui ne peut pas payer. Il reçoit un code et commence aussitôt.','To someone close, your church or someone who cannot pay. They receive a code and start right away.')}</p>
    <Link className="ab-bouton-s" to={`/aide?motif=offrir${en?'&lang=en':''}`}>{l('Offrir','Give')}</Link></div>
  </section>

  {/* 5. Paiement et achats */}
  <h2 className="ab-section">{l('Paiement','Payment')}</h2>
  <div className="ab-groupe ab-liste">
   <div className="ab-l"><Tuile nom="cadenas" teinte="vert"/><span><b>{l('Paiement sécurisé','Secure payment')}</b><small>{l('Chariow · Mobile Money ou carte, avec l’e-mail de ton compte','Chariow · Mobile Money or card, with your account email')}</small></span></div>
   <Link className="ab-l" to={`/aide?motif=paiement${en?'&lang=en':''}`}><Tuile nom="aide" teinte="bleu"/><span><b>{l('Une question ?','A question?')}</b><small>{l('Écrire à l’équipe','Write to the team')}</small></span><span className="ab-chev"><Picto nom="chevron" taille={14}/></span></Link>
  </div>
  <h2 className="ab-section">{l('Mes achats','My purchases')}</h2>
  <div className="ab-groupe ab-liste">{donnees.achats.length?donnees.achats.map(a=><div key={a.offre_id+a.le} className="ab-l"><Tuile nom="recu" teinte="gris"/><span><b>{a.produit}</b>{a.le&&<small>{l(`Acheté le ${format(new Date(a.le))}`,`Bought on ${format(new Date(a.le))}`)}</small>}</span></div>)
   :<div className="ab-l"><Tuile nom="recu" teinte="gris"/><span><b>{l('Aucun achat pour l’instant','No purchases yet')}</b></span></div>}</div>
  <p className="ab-pied">{l('Aucun prélèvement automatique : à la fin de la période, tu choisis de renouveler ou non. Ta progression est toujours gardée.','No automatic charge: at the end of the period, you choose whether to renew. Your progress is always kept.')}</p>
  <BarreNav langue={langue} maquette iconesJournee/>
 </main>;
}
