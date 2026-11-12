import '@/components/SimulateurEpargne.css';
import './habitudes-depenses.css';
import {useCallback,useEffect,useMemo,useState,type FormEvent} from 'react';
import {useSearchParams} from 'react-router-dom';
import {CadreHabitudes} from '@/components/CadreHabitudes';
import {ComptePrive} from '@/components/ComptePrive';
import {IconeHD} from '@/components/IconeHabitudes';
import {suiviFinancierActive} from '@/lib/habitudes-configuration';
import {chargerSuiviFinancier} from '@/lib/habitudes-finances-suivi';
import {chargerCompteursOuAbsents,disponibleCompteur,type Compteurs} from '@/lib/habitudes-finances-compteurs';
import {annulerDepense,CATEGORIES_DEPENSES,chargerDepenses,INFOS_CATEGORIES,moisPrecedent,moisSuivant,noterDepense,totauxDuMois,type CategorieDepense,type Depense} from '@/lib/habitudes-finances-depenses';
import {decimalesDevise,montantValidePourDevise} from '@/lib/devises';
import {garderFinance,lireFinance} from '@/lib/memoire-finance';
import {NotFound} from '@/routes/introuvable';

/** SÉNEVÉ Dépenses (décision de Dr Justin du 11/11/2026) :
 * - noter une dépense en quelques secondes : montant, catégorie, date, note facultative ;
 * - voir le total du mois par catégorie et l'écart avec le mois précédent, sans jugement ni budget imposé ;
 * - la dépense baisse aussi la caisse « Pour vivre » de SÉNEVÉ Compte quand elle la couvre ; sinon elle est notée seule. */
const aujourdhui=()=>new Intl.DateTimeFormat('en-CA').format(new Date());

export function RouteHabitudesDepenses(){
 return suiviFinancierActive()?<ComptePrive enfants={userId=><HabitudesDepenses userId={userId}/>}/>:<NotFound/>;
}

export function HabitudesDepenses({userId}:{userId:string}){
 const [q]=useSearchParams(),en=q.get('lang')==='en',langue=en?'en':'fr',l=(fr:string,english:string)=>en?english:fr;
 const suffixe=en?'?lang=en':'';
 // Mémoire de la visite (12/11/2026) : au retour, la dernière version s'affiche tout de suite, puis tout est relu.
 const [memoire]=useState(()=>lireFinance<{inscription:string;devisesSuivi:string[];cpt:Compteurs|null;depenses:Depense[]}>('depenses'));
 const [inscription,setInscription]=useState<string|null>(memoire?.inscription??null),[devisesSuivi,setDevisesSuivi]=useState<string[]>(memoire?.devisesSuivi??[]);
 const [cpt,setCpt]=useState<Compteurs|null>(memoire?.cpt??null),[depenses,setDepenses]=useState<Depense[]>(memoire?.depenses??[]);
 const [etat,setEtat]=useState<'chargement'|'pret'|'vide'|'erreur'>(memoire?'pret':'chargement');
 const [devise,setDevise]=useState(''),[mois,setMois]=useState(()=>aujourdhui().slice(0,7));
 const [ouvert,setOuvert]=useState(false),[montant,setMontant]=useState(''),[categorie,setCategorie]=useState<CategorieDepense|null>(null);
 const [date,setDate]=useState(aujourdhui),[note,setNote]=useState(''),[requete,setRequete]=useState(()=>crypto.randomUUID());
 const [busy,setBusy]=useState(false),[annonce,setAnnonce]=useState<{texte:string;erreur:boolean}|null>(null);

 const charger=useCallback(async()=>{
  try{
   const s=await chargerSuiviFinancier(null);if(!s){setEtat('vide');return;}
   setInscription(s.enrollment_id);setDevisesSuivi([...new Set(s.savings_goals.map(g=>g.currency))]);
   const [c,d]=await Promise.all([chargerCompteursOuAbsents(s.enrollment_id),chargerDepenses(s.enrollment_id)]);
   setCpt(c);setDepenses(d);setEtat('pret');
  }catch{setEtat(e=>e==='pret'?e:'erreur');}
 },[userId]);
 useEffect(()=>{void charger();},[charger]);
 useEffect(()=>{if(etat==='pret'&&inscription)garderFinance('depenses',{inscription,devisesSuivi,cpt,depenses});},[etat,inscription,devisesSuivi,cpt,depenses]);
 useEffect(()=>{document.title=l('SÉNEVÉ Dépenses','SÉNEVÉ Expenses');document.documentElement.lang=langue;},[langue]);

 const devises=useMemo(()=>{const s=new Set<string>();cpt?.moves.forEach(m=>s.add(m.currency));devisesSuivi.forEach(d=>s.add(d));depenses.forEach(d=>s.add(d.currency));return [...s];},[cpt,devisesSuivi,depenses]);
 const dev=devise&&devises.includes(devise)?devise:devises[0]??'USD';
 const dec=decimalesDevise(dev);
 const nombre=(c:number)=>new Intl.NumberFormat(en?'en-US':'fr-FR',{minimumFractionDigits:c%100===0?0:dec,maximumFractionDigits:dec}).format(c/100);
 const nomCat=(c:CategorieDepense)=>en?INFOS_CATEGORIES[c].en:INFOS_CATEGORIES[c].fr;
 const nomMois=(m:string)=>{const t=new Intl.DateTimeFormat(en?'en-GB':'fr-FR',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(m+'-01T00:00:00Z'));return t.charAt(0).toUpperCase()+t.slice(1);};
 const jourLisible=(iso:string)=>{const t=new Intl.DateTimeFormat(en?'en-GB':'fr-FR',{weekday:'long',day:'numeric',month:'long',timeZone:'UTC'}).format(new Date(iso+'T00:00:00Z'));return t.charAt(0).toUpperCase()+t.slice(1);};

 const ceMois=useMemo(()=>totauxDuMois(depenses,mois,dev),[depenses,mois,dev]);
 const avant=useMemo(()=>totauxDuMois(depenses,moisPrecedent(mois),dev),[depenses,mois,dev]);
 const categoriesTriees=CATEGORIES_DEPENSES.filter(c=>ceMois.parCategorie[c]>0).sort((a,b)=>ceMois.parCategorie[b]-ceMois.parCategorie[a]);
 const lignes=depenses.filter(d=>d.currency===dev&&d.date_locale.startsWith(mois));
 const parJour=useMemo(()=>{const m=new Map<string,Depense[]>();for(const d of lignes){const a=m.get(d.date_locale)??[];a.push(d);m.set(d.date_locale,a);}return [...m.entries()];},[lignes]);
 const vivre=cpt?disponibleCompteur(cpt,'vivre',dev):0;
 const moisCourant=aujourdhui().slice(0,7);
 const ecart=ceMois.total-avant.total;

 function ouvrirFormulaire(){setOuvert(o=>!o);setAnnonce(null);setMontant('');setCategorie(null);setNote('');setDate(aujourdhui());setRequete(crypto.randomUUID());}
 async function enregistrer(e:FormEvent){
  e.preventDefault();if(!inscription||busy)return;
  if(!montantValidePourDevise(montant,dev)||Number(montant)<=0){setAnnonce({texte:l('Écris un montant plus grand que 0, avec des chiffres seulement.','Enter an amount above 0, using digits only.'),erreur:true});return;}
  if(!categorie){setAnnonce({texte:l('Choisis une catégorie.','Choose a category.'),erreur:true});return;}
  setBusy(true);setAnnonce(null);
  try{
   const r=await noterDepense(inscription,categorie,montant,dev,date,note,requete);
   const [c,d]=await Promise.all([chargerCompteursOuAbsents(inscription),chargerDepenses(inscription)]);setCpt(c);setDepenses(d);
   const montantLisible=`${nombre(Math.round(Number(montant)*100))} ${dev}`;
   setAnnonce({erreur:false,texte:r.liee&&r.soldeVivre!==null
    ?l(`${montantLisible} notés en ${nomCat(categorie).toLowerCase()}. Ta caisse Pour vivre : ${nombre(Math.round(Number(r.soldeVivre)*100))} ${dev}.`,`${montantLisible} recorded as ${nomCat(categorie).toLowerCase()}. Your For living box: ${nombre(Math.round(Number(r.soldeVivre)*100))} ${dev}.`)
    :l(`${montantLisible} notés en ${nomCat(categorie).toLowerCase()}. Ta caisse Pour vivre n’avait pas assez ce jour-là : elle n’a pas été touchée.`,`${montantLisible} recorded as ${nomCat(categorie).toLowerCase()}. Your For living box did not have enough that day, so it was not changed.`)});
   setMois(date.slice(0,7));setMontant('');setCategorie(null);setNote('');setRequete(crypto.randomUUID());setOuvert(false);
  }catch{setAnnonce({texte:l('Rien n’a été noté. Vérifie le montant et réessaie.','Nothing was recorded. Check the amount and try again.'),erreur:true});}
  finally{setBusy(false);}
 }
 async function annuler(d:Depense){
  if(!inscription||busy)return;
  const texte=`${nombre(Math.round(Number(d.amount)*100))} ${d.currency} · ${nomCat(d.category)}`;
  if(!window.confirm(d.liee?l(`Annuler cette dépense (${texte}) ? L’argent revient dans ta caisse Pour vivre.`,`Cancel this expense (${texte})? The money goes back to your For living box.`):l(`Annuler cette dépense (${texte}) ?`,`Cancel this expense (${texte})?`)))return;
  setBusy(true);setAnnonce(null);
  try{await annulerDepense(inscription,d.expense_id);const [c,x]=await Promise.all([chargerCompteursOuAbsents(inscription),chargerDepenses(inscription)]);setCpt(c);setDepenses(x);setAnnonce({texte:l('Dépense annulée.','Expense cancelled.'),erreur:false});}
  catch{setAnnonce({texte:l('La dépense n’a pas pu être annulée. Réessaie.','The expense could not be cancelled. Try again.'),erreur:true});}
  finally{setBusy(false);}
 }
 const message=annonce?<p role={annonce.erreur?'alert':'status'} aria-live="polite" className={`dp-annonce ${annonce.erreur?'dp-annonce-erreur':''}`}><IconeHD nom={annonce.erreur?'info':'check_circle'} className="shrink-0 text-[18px]"/>{annonce.texte}</p>:null;

 return <CadreHabitudes titre={l('SÉNEVÉ Dépenses','SÉNEVÉ Expenses')} langue={langue} retour={`/espace${suffixe}`} retourLibelle={l('Revenir à ma journée','Back to my day')} liens={{aujourdhui:`/espace${suffixe}`}} actif="aujourdhui" cloche>
  <div className="dp-page sim-ios mx-auto flex w-full max-w-xl flex-col px-hd-margin pt-hd-space-md pb-hd-space-lg">
   <h1 className="dp-titre">{l('SÉNEVÉ Dépenses','SÉNEVÉ Expenses')}</h1>
   <p className="dp-intro">{l('Note ce que tu dépenses pour savoir où va ton argent. La dépense est aussi retirée de ta caisse « Pour vivre ».','Record what you spend to see where your money goes. The expense is also taken from your “For living” box.')}</p>

   {etat==='chargement'&&<p role="status" className="dp-carte-info">{l('Chargement…','Loading…')}</p>}
   {etat==='erreur'&&<p role="alert" className="dp-carte-info">{l('Tes dépenses ne sont pas disponibles pour le moment.','Your expenses are not available right now.')}</p>}
   {etat==='vide'&&<p className="dp-carte-info">{l('Le suivi des dépenses est disponible avec un accès actif à Habitudes & Défis.','Expense tracking is available with active Habits & Challenges access.')}</p>}

   {etat==='pret'&&<>
    {devises.length>1&&<div role="radiogroup" aria-label={l('Monnaie','Currency')} className="dp-devises">{devises.map(d=><button key={d} type="button" role="radio" aria-checked={d===dev} onClick={()=>setDevise(d)}>{d}</button>)}</div>}

    <section className="dp-heros" aria-labelledby="dp-total">
     <div className="dp-mois">
      <button type="button" onClick={()=>setMois(moisPrecedent(mois))} aria-label={l('Mois précédent','Previous month')}><IconeHD nom="chevron_left" className="text-[22px]"/></button>
      <span>{nomMois(mois)}</span>
      <button type="button" onClick={()=>setMois(moisSuivant(mois))} disabled={mois>=moisCourant} aria-label={l('Mois suivant','Next month')}><IconeHD nom="chevron_right" className="text-[22px]"/></button>
     </div>
     <small className="dp-heros-etiquette">{l('Dépensé ce mois','Spent this month')}</small>
     <b id="dp-total" className="dp-heros-total">{nombre(ceMois.total)} {dev}</b>
     <p className="dp-heros-ecart">{avant.total===0?l('Aucune dépense notée le mois précédent.','No expenses recorded the previous month.'):ecart===0?l('Autant que le mois précédent.','Same as the previous month.'):ecart>0?l(`${nombre(ecart)} ${dev} de plus que le mois précédent.`,`${nombre(ecart)} ${dev} more than the previous month.`):l(`${nombre(-ecart)} ${dev} de moins que le mois précédent.`,`${nombre(-ecart)} ${dev} less than the previous month.`)}</p>
     {ceMois.total>0&&<div className="dp-barre" aria-hidden="true">{categoriesTriees.map(c=><span key={c} style={{flexGrow:ceMois.parCategorie[c],background:INFOS_CATEGORIES[c].couleur}}/>)}</div>}
     <p className="dp-vivre"><IconeHD nom="location_on" className="text-[16px]"/>{l(`Caisse Pour vivre : ${nombre(vivre)} ${dev}`,`For living box: ${nombre(vivre)} ${dev}`)}</p>
    </section>

    <button type="button" className="dp-ajouter" aria-expanded={ouvert} aria-controls="dp-formulaire" onClick={ouvrirFormulaire}><IconeHD nom={ouvert?'close':'add'} className="text-[22px]"/>{ouvert?l('Fermer','Close'):l('Noter une dépense','Record an expense')}</button>
    {!ouvert&&message}

    {ouvert&&<form id="dp-formulaire" className="dp-formulaire" onSubmit={e=>void enregistrer(e)} noValidate>
     <label htmlFor="dp-montant" className="dp-montant-etiquette">{l('Montant','Amount')}</label>
     <div className="dp-montant" style={{['--dp-largeur' as string]:`${Math.max(1,montant.length)+0.6}ch`}}><input id="dp-montant" type="text" inputMode="decimal" autoComplete="off" maxLength={18} placeholder="0" value={montant} onChange={e=>setMontant(e.target.value.replace(',','.').replace(/[^\d.]/g,''))} autoFocus/><span>{dev}</span></div>
     <fieldset className="dp-categories"><legend>{l('Catégorie','Category')}</legend>
      <div role="radiogroup" aria-label={l('Catégorie','Category')}>{CATEGORIES_DEPENSES.map(c=><button key={c} type="button" role="radio" aria-checked={categorie===c} onClick={()=>setCategorie(c)} style={{['--teinte' as string]:INFOS_CATEGORIES[c].couleur}}><span aria-hidden="true"><IconeHD nom={INFOS_CATEGORIES[c].icone} className="text-[20px]"/></span>{nomCat(c)}</button>)}</div>
     </fieldset>
     <div className="sim-ios-groupe hd-classique dp-groupe">
      <div className="sim-ios-ligne"><label htmlFor="dp-date">{l('Date','Date')}</label><input id="dp-date" type="date" max={aujourdhui()} value={date} onChange={e=>setDate(e.target.value||aujourdhui())}/></div>
      <div className="sim-ios-ligne"><label htmlFor="dp-note">{l('Note','Note')}</label><input id="dp-note" type="text" maxLength={140} placeholder={l('Facultatif','Optional')} value={note} onChange={e=>setNote(e.target.value)}/></div>
     </div>
     {message}
     <button type="submit" disabled={busy} className="hd-classique sim-ios-bouton disabled:opacity-60">{busy?l('Enregistrement…','Saving…'):l('Enregistrer la dépense','Save expense')}</button>
    </form>}

    {categoriesTriees.length>0&&<>
     <h2 className="dp-section">{l('Par catégorie','By category')}</h2>
     <ul className="dp-liste">{categoriesTriees.map(c=>{const v=ceMois.parCategorie[c];return <li key={c}>
      <span className="dp-icone" style={{background:INFOS_CATEGORIES[c].couleur}} aria-hidden="true"><IconeHD nom={INFOS_CATEGORIES[c].icone} className="text-[18px]"/></span>
      <span className="dp-ligne-texte"><b>{nomCat(c)}</b><span className="dp-jauge" aria-hidden="true"><i style={{width:`${Math.round(v/ceMois.total*100)}%`,background:INFOS_CATEGORIES[c].couleur}}/></span></span>
      <span className="dp-ligne-montant"><b>{nombre(v)}</b><small>{Math.round(v/ceMois.total*100)} %</small></span>
     </li>;})}</ul>
    </>}

    <h2 className="dp-section">{l('Mes dépenses','My expenses')}</h2>
    {parJour.length===0?<p className="dp-vide"><IconeHD nom="receipt_long" className="text-[28px]"/>{l('Aucune dépense notée ce mois-ci.','No expenses recorded this month.')}</p>
    :parJour.map(([jour,liste])=><section key={jour} aria-label={jourLisible(jour)}>
     <h3 className="dp-jour">{jourLisible(jour)}</h3>
     <ul className="dp-liste">{liste.map(d=><li key={d.expense_id}>
      <span className="dp-icone" style={{background:INFOS_CATEGORIES[d.category].couleur}} aria-hidden="true"><IconeHD nom={INFOS_CATEGORIES[d.category].icone} className="text-[18px]"/></span>
      <span className="dp-ligne-texte"><b>{nomCat(d.category)}</b>{(d.note||!d.liee)&&<small>{[d.note,!d.liee?l('hors caisse Pour vivre','not taken from For living'):null].filter(Boolean).join(' · ')}</small>}</span>
      <span className="dp-ligne-montant"><b>{nombre(Math.round(Number(d.amount)*100))}</b><small>{d.currency}</small></span>
      <button type="button" className="dp-annuler" disabled={busy} onClick={()=>void annuler(d)} aria-label={l(`Annuler la dépense ${nomCat(d.category)}`,`Cancel the ${nomCat(d.category)} expense`)}><IconeHD nom="delete_outline" className="text-[20px]"/></button>
     </li>)}</ul>
    </section>)}
   </>}
  </div>
 </CadreHabitudes>;
}
