import '@/components/SimulateurEpargne.css';
import {useCallback,useEffect,useMemo,useState,type FormEvent} from 'react';
import {Link,useLocation,useSearchParams} from 'react-router-dom';
import {CadreHabitudes} from '@/components/CadreHabitudes';
import {ComptePrive} from '@/components/ComptePrive';
import {IconeHD} from '@/components/IconeHabitudes';
import {suiviFinancierActive} from '@/lib/habitudes-configuration';
import {chargerSuiviFinancier,type SuiviFinancier} from '@/lib/habitudes-finances-suivi';
import {supabase} from '@/lib/supabase';
import {chargerBenefices,type Benefices} from '@/lib/habitudes-finances-benefices';
import {CATEGORIES_DEPENSES,chargerDepenses,INFOS_CATEGORIES,type CategorieDepense,type Depense} from '@/lib/habitudes-finances-depenses';
import {CalendrierPlage,nbJours,type Plage} from '@/components/CalendrierPlage';
import {chargerCompteurs,EffacementImpossible,effacerJours,effacerJoursCaisse,CompteursIndisponibles,effacerBilan,type QuoiEffacer,disponibleCompteur,disponibleCompteurAu,disponibleObjectif,disponibleObjectifAu,estMasquee,noterRetraitEpargne,noterSortieCompteur,type Compteurs,type Enveloppe,type Motif} from '@/lib/habitudes-finances-compteurs';
import {decimalesDevise,montantValidePourDevise} from '@/lib/devises';
import {NotFound} from '@/routes/introuvable';
import {momentLisible} from '@/lib/date-heure-finances';

/** Page « Mes compteurs » (maquette validée le 07/11/2026, demande de Dr Justin) :
 * - le disponible de chaque caisse (dîme, offrande, Réserve de joie, pour investir, pour vivre) ;
 * - noter l'argent donné, dépensé ou investi, ou « tout utilisé » : la caisse repart de zéro ;
 * - l'historique n'est JAMAIS effacé : bilan de la semaine, du mois ou de l'année. Aucun argent ne bouge. */
type Caisse={cle:string;nom:string;sous:string;couleur:string;icone:string;enveloppe?:Enveloppe;goalId?:string};
type Ligne={id:string;date:string;creeLe?:string;signe:1|-1;centimes:number;motif:Motif|null;remise:boolean;origine:'repartition'|'versement'|'sortie'};
type Periode='semaine'|'mois'|'annee'|'tout';
const aujourdhui=()=>new Intl.DateTimeFormat('en-CA').format(new Date());
const centimes=(v:string)=>Math.round(Number(v)*100);
const debutPeriode=(p:Periode)=>{if(p==='tout')return '0001-01-01';const d=new Date();if(p==='annee')return `${d.getFullYear()}-01-01`;if(p==='mois')return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`;const j=(d.getDay()+6)%7;const l=new Date(d.getFullYear(),d.getMonth(),d.getDate()-j);return new Intl.DateTimeFormat('en-CA').format(l);};

export function RouteHabitudesCompteurs(){
 return suiviFinancierActive()?<ComptePrive enfants={userId=><HabitudesCompteurs userId={userId}/>}/>:<NotFound/>;
}

export function HabitudesCompteurs({userId}:{userId:string}){
 const [q]=useSearchParams(),en=q.get('lang')==='en',langue=en?'en':'fr',l=(fr:string,english:string)=>en?english:fr;
 const etatNav=useLocation().state as {message?:string}|null;
 const [suivi,setSuivi]=useState<SuiviFinancier|null>(null),[cpt,setCpt]=useState<Compteurs|null>(null);
 const [etat,setEtat]=useState<'chargement'|'pret'|'vide'|'indisponible'|'erreur'>('chargement');
 const [devise,setDevise]=useState(''),[periode,setPeriode]=useState<Periode>('mois');
 const [ouverte,setOuverte]=useState(''),[motif,setMotif]=useState<Motif>('donne'),[montant,setMontant]=useState(''),[date,setDate]=useState(aujourdhui);
 // « Encaissé » et « Pas encore réparti » en tête du bilan (12/11/2026) : facultatifs, la page reste utilisable sans eux.
 const [recettes,setRecettes]=useState<Benefices|null>(null);
 // Détail des dépenses de SÉNEVÉ Dépenses (catégorie, note) dans l'historique et le bilan (12/11/2026), facultatif.
 const [depenses,setDepenses]=useState<Depense[]>([]);
 const [busy,setBusy]=useState(false),[annonce,setAnnonce]=useState<{zone:string;texte:string;erreur:boolean}|null>(etatNav?.message?{zone:'haut',texte:etatNav.message,erreur:false}:null);
 const suffixe=en?'?lang=en':'';
 const charger=useCallback(async()=>{
  try{
   const s=await chargerSuiviFinancier(null);if(!s){setEtat('vide');return;}
   setSuivi(s);
   void chargerBenefices(s.enrollment_id).then(setRecettes).catch(()=>setRecettes(null));
   void chargerDepenses(s.enrollment_id).then(setDepenses).catch(()=>setDepenses([]));
   try{setCpt(await chargerCompteurs(s.enrollment_id));setEtat('pret');}
   catch(e){if(e instanceof CompteursIndisponibles){setEtat('indisponible');return;}throw e;}
  }catch{setEtat('erreur');}
 },[userId]);
 useEffect(()=>{void charger();},[charger]);
 useEffect(()=>{document.title=l('SÉNEVÉ Compte','SÉNEVÉ Account');document.documentElement.lang=langue;},[langue]);
 const devises=useMemo(()=>{const s=new Set<string>();cpt?.moves.forEach(m=>s.add(m.currency));suivi?.savings_goals.forEach(g=>s.add(g.currency));return [...s];},[cpt,suivi]);
 const dev=devise&&devises.includes(devise)?devise:devises[0]??'USD';
 const dec=decimalesDevise(dev);
 const nombre=(c:number)=>new Intl.NumberFormat(en?'en-US':'fr-FR',{minimumFractionDigits:c%100===0?0:dec,maximumFractionDigits:dec}).format(c/100);
 const dateLisible=(iso:string)=>new Intl.DateTimeFormat(en?'en-GB':'fr-FR',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(iso+'T00:00:00Z'));
 const caisses:Caisse[]=[
  {cle:'dime',nom:l('Dîme','Tithe'),sous:l('à donner','to give'),couleur:'#b8862b',icone:'church',enveloppe:'dime'},
  {cle:'offrande',nom:l('Offrande','Offering'),sous:l('à donner','to give'),couleur:'#b05bd6',icone:'favorite',enveloppe:'offrande'},
  // Tous les objectifs d'épargne, « Autre objectif » compris (demande du 07/11/2026).
  ...(suivi?.savings_goals.filter(g=>g.currency===dev).map(g=>({cle:g.goal_id,nom:g.goal_type==='reserve_joie'?l('Réserve de joie','Family joy reserve'):g.goal_type==='epargne_investir'?l('Pour investir','For investing'):l('Autre objectif','Other goal'),sous:g.label,couleur:g.goal_type==='reserve_joie'?'#ff9500':g.goal_type==='epargne_investir'?'#34c759':'#5856d6',icone:g.goal_type==='reserve_joie'?'potted_plant':g.goal_type==='epargne_investir'?'pie_chart':'bookmark',goalId:g.goal_id}))??[]),
  {cle:'vivre',nom:l('Pour vivre','For living'),sous:l('dépenses de la maison','household spending'),couleur:'#a1a1a6',icone:'location_on',enveloppe:'vivre'},
 ];
 const lignesDe=(c:Caisse):Ligne[]=>{
  if(!cpt)return [];
  if(c.enveloppe)return cpt.moves.filter(m=>m.envelope===c.enveloppe&&m.currency===dev&&!estMasquee(cpt,m.move_id)).map(m=>({id:m.move_id,date:m.date_locale,creeLe:m.created_at,signe:m.direction==='entree'?1:-1,centimes:centimes(m.amount),motif:m.motif,remise:m.remise_a_zero,origine:m.direction==='entree'?'repartition':'sortie'}));
  const g=[...(suivi?.savings_goals??[]),...(suivi?.archived_goals??[])].find(x=>x.goal_id===c.goalId);if(!g)return [];
  return [...g.entries.filter(v=>!estMasquee(cpt,v.entry_id)).map(v=>({id:v.entry_id,date:v.date_locale,creeLe:v.created_at,signe:1 as const,centimes:centimes(v.amount),motif:null,remise:false,origine:'versement' as const})),...cpt.withdrawals.filter(w=>w.goal_id===g.goal_id&&!estMasquee(cpt,w.withdrawal_id)).map(w=>({id:w.withdrawal_id,date:w.date_locale,creeLe:w.created_at,signe:-1 as const,centimes:centimes(w.amount),motif:w.motif,remise:w.remise_a_zero,origine:'sortie' as const}))].sort((a,b)=>a.date.localeCompare(b.date)||(a.creeLe??'').localeCompare(b.creeLe??''));
 };
 const dispo=(c:Caisse)=>{if(!cpt)return 0;if(c.enveloppe)return disponibleCompteur(cpt,c.enveloppe,dev);const g=suivi?.savings_goals.find(x=>x.goal_id===c.goalId);return g?disponibleObjectif(cpt,g.goal_id,g.entries):0;};
 // Ce qui peut sortir à la date choisie sans rendre la caisse négative ce jour-là ou plus tard (même règle que le serveur).
 const dispoAu=(c:Caisse,jour:string)=>{if(!cpt)return 0;if(c.enveloppe)return disponibleCompteurAu(cpt,c.enveloppe,dev,jour);const g=suivi?.savings_goals.find(x=>x.goal_id===c.goalId);return g?disponibleObjectifAu(cpt,g.goal_id,g.entries,jour):0;};
 const MOTIFS:[Motif,string][]=[['donne',l('Donné','Given')],['depense',l('Dépensé','Spent')],['investi',l('Investi','Invested')],['autre',l('Autre','Other')]];
 const nomMotif=(m:Motif|null)=>MOTIFS.find(x=>x[0]===m)?.[1].toLowerCase()??'';
 // Bilan de la période : ce qui est entré et ce qui est sorti, par motif. L'historique n'est jamais remis à zéro.
 const debut=debutPeriode(periode);
 // Le bilan compte aussi les objectifs et dettes supprimés (mis de côté) : l'historique n'est jamais perdu.
 const caissesSupprimees:Caisse[]=(suivi?.archived_goals??[]).filter(g=>g.currency===dev).map(g=>({cle:g.goal_id,nom:g.label,sous:'',couleur:'',icone:'',goalId:g.goal_id}));
 const bilan=useMemo(()=>{const b={entre:0,donne:0,depense:0,investi:0,autre:0,dettes:0};for(const c of [...caisses,...caissesSupprimees])for(const x of lignesDe(c))if(x.date>=debut){if(x.signe===1)b.entre+=x.centimes;else b[x.motif??'autre']+=x.centimes;}for(const d of [...(suivi?.debts??[]),...(suivi?.archived_debts??[])])if(d.currency===dev)for(const p of d.payments)if(p.date_locale>=debut&&!estMasquee(cpt,p.payment_id))b.dettes+=centimes(p.amount);return b;},[cpt,suivi,dev,debut,en]);
 const encaisse=recettes?[...recettes.ventes.filter(v=>v.currency===dev&&v.date_locale>=debut).map(v=>v.gross),...recettes.revenus.filter(v=>v.currency===dev&&v.date_locale>=debut).map(v=>v.amount)].reduce((t,v)=>t+centimes(v),0):null;
 const depenseParSortie=new Map(depenses.filter(d=>d.move_id).map(d=>[d.move_id as string,d]));
 const nomCategorie=(c:CategorieDepense)=>en?INFOS_CATEGORIES[c].en:INFOS_CATEGORIES[c].fr;
 const pasReparti=recettes?.resteARepartir?.[dev]!==undefined?centimes(recettes.resteARepartir[dev]!):null;
 function ouvrir(c:Caisse){setOuverte(o=>o===c.cle?'':c.cle);setMontant('');setMotif(c.goalId?'investi':'donne');setDate(aujourdhui());setAnnonce(null);}
 async function noter(c:Caisse,toutUtilise:boolean){
  if(!suivi||busy)return;const zone='caisse:'+c.cle;
  if(!toutUtilise&&(!montantValidePourDevise(montant,dev)||Number(montant)<=0)){setAnnonce({zone,texte:l('Écris un montant plus grand que 0, avec des chiffres seulement.','Enter an amount above 0, using digits only.'),erreur:true});return;}
  if(date>aujourdhui()){setAnnonce({zone,texte:l('Choisis une date qui n’est pas dans le futur.','Choose a date that is not in the future.'),erreur:true});return;}
  const auJour=dispoAu(c,date);
  if(toutUtilise&&auJour<=0){setAnnonce({zone,texte:l(`Rien n’était disponible dans cette caisse le ${dateLisible(date)}.`,`Nothing was available in this counter on ${dateLisible(date)}.`),erreur:true});return;}
  if(!toutUtilise&&Math.round(Number(montant)*100)>auJour){setAnnonce({zone,texte:auJour<dispo(c)?l(`Le ${dateLisible(date)}, cette caisse n’avait que ${nombre(auJour)} ${dev} de disponible. Choisis une date plus récente ou un montant plus petit.`,`On ${dateLisible(date)}, this counter only had ${nombre(auJour)} ${dev} available. Choose a later date or a smaller amount.`):l('Le montant dépasse le disponible de cette caisse.','The amount is greater than what is available.'),erreur:true});return;}
  setBusy(true);setAnnonce(null);
  try{
   const id=crypto.randomUUID();
   const r=c.enveloppe?await noterSortieCompteur(suivi.enrollment_id,c.enveloppe,motif,toutUtilise?null:montant,dev,date,toutUtilise,id):await noterRetraitEpargne(suivi.enrollment_id,c.goalId!,motif,toutUtilise?null:montant,dev,date,toutUtilise,id);
   setMontant('');
   setCpt(await chargerCompteurs(suivi.enrollment_id));
   setAnnonce({zone,texte:toutUtilise?l(`Caisse remise à zéro : ${nombre(centimes(r.amount))} ${dev} notés comme ${nomMotif(motif)}s. L’historique reste.`,`Counter reset to zero: ${nombre(centimes(r.amount))} ${dev} recorded as ${nomMotif(motif)}. History is kept.`):l(`${nombre(centimes(r.amount))} ${dev} notés. Il reste ${nombre(centimes(r.balance))} ${dev}.`,`${nombre(centimes(r.amount))} ${dev} recorded. ${nombre(centimes(r.balance))} ${dev} left.`),erreur:false});
  }catch{setAnnonce({zone,texte:l('Rien n’a été noté. Vérifie le montant et réessaie.','Nothing was recorded. Check the amount and try again.'),erreur:true});}
  finally{setBusy(false);}
 }
 const message=(zone:string)=>annonce?.zone===zone?<p role={annonce.erreur?'alert':'status'} aria-live="polite" className={`mt-2.5 flex items-start gap-2 rounded-xl p-3 text-sm ${annonce.erreur?'bg-red-50 text-red-800':'bg-emerald-50 text-emerald-900'}`}><IconeHD nom={annonce.erreur?'info':'check_circle'} className="shrink-0 text-[18px]"/>{annonce.texte}</p>:null;
const PERIODES:[Periode,string][]=[['semaine',l('Semaine','Week')],['mois',l('Mois','Month')],['annee',l('Année','Year')],['tout',l('Tout','All')]];
 // Effacer le bilan (demande de Dr Justin du 08/11/2026) : une ligne à la fois, ou tout, avec confirmation.
 const [modifier,setModifier]=useState(false);
 const [aEffacer,setAEffacer]=useState<{quoi:Exclude<QuoiEffacer,'tout'>;nom:string;nb:number;centimes:number}|null>(null);
 const [toutEffacer,setToutEffacer]=useState(false);
 // « Effacer des jours » (décision de Dr Justin du 11/11/2026) : la personne choisit un jour ou une suite de jours dans un calendrier ;
 // seules les données de ces jours sont effacées, tout le reste reste intact.
 const [plage,setPlage]=useState<Plage|null>(null);
 // « Effacer des jours dans cette caisse » (12/11/2026) : remplace « Tout utilisé : remettre la caisse à zéro ».
 // Calendrier, résumé de ce qui sera effacé, puis un avertissement à confirmer avant toute suppression.
 const [caisseEffacer,setCaisseEffacer]=useState<Caisse|null>(null),[plageCaisse,setPlageCaisse]=useState<Plage|null>(null),[confirmerCaisse,setConfirmerCaisse]=useState(false),[erreurCaisse,setErreurCaisse]=useState('');
 const libelleEffacer=!plage?'':plage.du===plage.au?l(`le ${dateLisible(plage.du)}`,`on ${dateLisible(plage.du)}`):l(`du ${dateLisible(plage.du)} au ${dateLisible(plage.au)} (${nbJours(plage)} jours)`,`from ${dateLisible(plage.du)} to ${dateLisible(plage.au)} (${nbJours(plage)} days)`);
 const [compte,setCompte]=useState<{email:string;motDePasse:boolean}|null>(null);
 const [email,setEmail]=useState(''),[motDePasse,setMotDePasse]=useState(''),[mot,setMot]=useState(''),[erreurEffacer,setErreurEffacer]=useState('');
 const depuis=periode==='tout'?null:debut;
 const libellePeriode=periode==='tout'?l('sur tout l’historique','over the whole history'):periode==='annee'?l('pour cette année','for this year'):periode==='mois'?l('pour ce mois','for this month'):l('pour cette semaine','for this week');
 const nombreDe=(quoi:Exclude<QuoiEffacer,'tout'>)=>{let n=0;if(quoi==='dettes'){for(const d of [...(suivi?.debts??[]),...(suivi?.archived_debts??[])])if(d.currency===dev)for(const p of d.payments)if(p.date_locale>=debut&&!estMasquee(cpt,p.payment_id))n++;return n;}
  for(const c of [...caisses,...caissesSupprimees])for(const x of lignesDe(c))if(x.date>=debut&&x.signe===-1&&(x.motif??'autre')===quoi)n++;return n;};
 async function relireTout(){if(!suivi)return;void chargerBenefices(suivi.enrollment_id).then(setRecettes).catch(()=>setRecettes(null));void chargerDepenses(suivi.enrollment_id).then(setDepenses).catch(()=>setDepenses([]));setSuivi(await chargerSuiviFinancier(suivi.enrollment_id)??suivi);setCpt(await chargerCompteurs(suivi.enrollment_id));}
 async function effacerLigne(){
  if(!aEffacer||!suivi||busy)return;setBusy(true);
  try{await effacerBilan(suivi.enrollment_id,dev,depuis,aEffacer.quoi,null);const nom=aEffacer.nom;setAEffacer(null);await relireTout();setAnnonce({zone:'bilan',texte:l(`« ${nom} » est effacé ${libellePeriode}.`,`“${nom}” is erased ${libellePeriode}.`),erreur:false});}
  catch(e){setAEffacer(null);setAnnonce({zone:'bilan',texte:/négative/.test(String((e as {message?:string})?.message))?l('Cet effacement rendrait une caisse négative. Choisis une période plus longue.','This would make a counter negative. Choose a longer period.'):l('L’effacement n’a pas pu se faire. Réessaie.','Erasing did not work. Try again.'),erreur:true});}
  finally{setBusy(false);}
 }
 async function ouvrirToutEffacer(){
  setErreurEffacer('');setMotDePasse('');setMot('');setPlage(null);setToutEffacer(true);
  try{const {data}=await supabase.auth.getUser();const u=data.user;const avecMotDePasse=!!u?.identities?.some(i=>i.provider==='email');setCompte({email:u?.email??'',motDePasse:avecMotDePasse});setEmail('');}
  catch{setCompte({email:'',motDePasse:false});}
 }
 async function confirmerToutEffacer(e:FormEvent){
  e.preventDefault();if(!suivi||busy||!compte)return;setErreurEffacer('');
  if(!plage){setErreurEffacer(l('Choisis d’abord les jours à effacer dans le calendrier.','First choose the days to erase in the calendar.'));return;}
  if(compte.motDePasse){
   if(email.trim().toLowerCase()!==compte.email.toLowerCase()||!motDePasse){setErreurEffacer(l('Écris l’e-mail de ton compte et ton mot de passe.','Enter your account e-mail and your password.'));return;}
  }else if(mot.trim().toUpperCase()!=='EFFACER'){setErreurEffacer(l('Écris EFFACER pour confirmer.','Type EFFACER to confirm.'));return;}
  setBusy(true);
  try{
   if(compte.motDePasse){const {data,error}=await supabase.auth.signInWithPassword({email:compte.email,password:motDePasse});if(error||!data.user){setErreurEffacer(l('E-mail ou mot de passe incorrect.','Wrong e-mail or password.'));return;}}
   // Effacement réel des seuls jours choisis (11/11/2026) : le reste de l'historique ne change pas.
   await effacerJours(suivi.enrollment_id,dev,plage.du,plage.au);
   setToutEffacer(false);setModifier(false);setMotDePasse('');await relireTout();
   setAnnonce({zone:'bilan',texte:l(`Tout ce qui a été noté ${libelleEffacer}, en ${dev}, est effacé. Les autres jours n’ont pas changé.`,`Everything recorded ${libelleEffacer}, in ${dev}, is erased. Other days did not change.`),erreur:false});
  }catch(err){setErreurEffacer(err instanceof EffacementImpossible?l('Rien n’a été effacé : de l’argent entré ces jours-là a déjà été utilisé plus tard. Ajoute aussi les jours suivants, jusqu’à la dépense ou la répartition concernée.','Nothing was erased: money recorded on these days was already used later. Also include the following days, up to the related expense or allocation.'):l('L’effacement n’a pas pu se faire. Réessaie.','Erasing did not work. Try again.'));}
  finally{setBusy(false);}
 }
 return <CadreHabitudes titre={l('SÉNEVÉ Compte','SÉNEVÉ Account')} langue={langue} retour={`/espace${suffixe}`} retourLibelle={l('Revenir à ma journée','Back to my day')} liens={{aujourdhui:`/espace${suffixe}`}} actif="aujourdhui" cloche>
  <div className="finance-cartes-lisibles sim-ios mx-auto flex w-full max-w-xl flex-col px-hd-margin pt-hd-space-md pb-hd-space-lg" style={{background:'var(--ios-fond,#f2f2f7)'}}>
   <h1 className="mb-1 ml-1 text-[34px] font-bold leading-tight tracking-tight">{l('SÉNEVÉ Compte','SÉNEVÉ Account')}</h1>
   <p className="hd-classique sim-ios-sous">{l('Chaque répartition remplit les caisses. Touche une caisse quand l’argent a été donné, dépensé ou investi. La remise à zéro garde l’historique ; seul « Modifier » dans Mon bilan l’efface.','Each allocation fills the counters. Tap one when the money has been given, spent or invested. A reset keeps the history; only “Edit” in My summary erases it.')}</p>
   {message('haut')}
   {etat==='chargement'&&<p role="status" className="rounded-2xl bg-white p-4">{l('Chargement…','Loading…')}</p>}
   {etat==='erreur'&&<p role="alert" className="rounded-2xl bg-white p-4">{l('Tes compteurs ne sont pas disponibles pour le moment.','Your counters are not available right now.')}</p>}
   {etat==='vide'&&<p className="rounded-2xl bg-white p-4">{l('Les compteurs sont disponibles avec un accès actif à Habitudes & Défis.','Counters are available with active Habits & Challenges access.')}</p>}
   {etat==='indisponible'&&<p className="rounded-2xl bg-white p-4">{l('Les compteurs arrivent bientôt dans ton espace.','Counters are coming soon to your space.')}</p>}
   {etat==='pret'&&<>
    <Link to={`/habitudes/repartition?pour=epargne${en?'&lang=en':''}`} className="hd-classique mt-2 flex items-center gap-3.5 rounded-[20px] bg-white px-[18px] py-4 text-hd-on-surface" style={{textDecoration:'none'}}><span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-xl text-white" style={{background:'#5b4ee8'}}><IconeHD nom="payments" className="text-[24px]"/></span><span className="flex-1"><b className="block text-[17px]">{l('Quand je reçois de l’argent','When I receive money')}</b><small className="block text-sm text-hd-on-surface-variant">{l('Répartir et remplir les caisses','Allocate and fill the counters')}</small></span><IconeHD nom="chevron_right" className="text-[22px] text-hd-on-surface-variant"/></Link>
    {devises.length>1&&<div role="radiogroup" aria-label={l('Monnaie','Currency')} className="mt-3 flex gap-2 overflow-x-auto">{devises.map(d=><button key={d} type="button" role="radio" aria-checked={d===dev} onClick={()=>{setDevise(d);setOuverte('');}} className={`min-h-[36px] rounded-full px-3.5 text-sm font-medium ${d===dev?'bg-hd-on-surface text-white':'bg-white'}`}>{d}</button>)}</div>}
    <h2 className="hd-classique sim-ios-titre">{l('Mes caisses','My cash boxes')} · {dev}</h2>
    <div className="flex flex-col gap-2.5">
     {caisses.map(c=>{const d=dispo(c),lignes=lignesDe(c),est=ouverte===c.cle,sorti=lignes.filter(x=>x.signe===-1).reduce((n,x)=>n+x.centimes,0);
      return <article key={c.cle} aria-labelledby={`hd-caisse-${c.cle}`} className="rounded-2xl bg-white px-4 py-3" style={est?{boxShadow:'0 0 0 2px var(--ios-accent,#5b4ee8)'}:undefined}>
       <h3 style={{margin:0}}><button type="button" aria-expanded={est} onClick={()=>ouvrir(c)} className="flex w-full items-center gap-3 text-left">
        <span aria-hidden="true" className="grid size-[30px] shrink-0 place-items-center rounded-lg text-white" style={{background:c.couleur}}><IconeHD nom={c.icone} className="text-[18px]"/></span>
        <span className="min-w-0 flex-1"><span id={`hd-caisse-${c.cle}`} className="block text-[16px] font-semibold">{c.nom}</span><small className="block text-[12px] font-normal text-hd-on-surface-variant">{c.sous}</small></span>
        <span className="text-right"><b className="block text-[17px] tabular-nums">{nombre(d)}</b><small className="block text-[11px] font-normal text-hd-on-surface-variant">{l(`${dev} disponibles`,`${dev} available`)}</small></span>
       </button></h3>
       {/* Dernières dépenses visibles directement sous « Pour vivre » dans Mes caisses (demande du 12/11/2026). */}
       {c.cle==='vivre'&&!est&&(()=>{const recentes=depenses.filter(x=>x.currency===dev).slice(0,3);if(!recentes.length)return null;return <div className="mt-2.5 border-t pt-1.5" style={{borderColor:'rgb(60 60 67 / .12)'}}>
        <ul style={{listStyle:'none',margin:0,padding:0}} aria-label={l('Dernières dépenses','Latest expenses')}>{recentes.map(x=><li key={x.expense_id} className="flex items-center gap-2.5 py-1.5" style={{minHeight:36}}>
         <span aria-hidden="true" className="grid size-[22px] shrink-0 place-items-center rounded-md text-white" style={{background:INFOS_CATEGORIES[x.category].couleur}}><IconeHD nom={INFOS_CATEGORIES[x.category].icone} className="text-[14px]"/></span>
         <span className="min-w-0 flex-1 truncate text-[14px]">{nomCategorie(x.category)}{x.note?<span className="text-hd-on-surface-variant"> · {x.note}</span>:null}<small className="ml-1.5 text-[12px] text-hd-on-surface-variant">{new Intl.DateTimeFormat(en?'en-GB':'fr-FR',{day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(x.date_locale+'T00:00:00Z'))}</small></span>
         <b className="shrink-0 text-[14px] tabular-nums" style={{color:'#d70015'}}>− {nombre(centimes(x.amount))}</b>
        </li>)}</ul>
        <Link to={`/habitudes/depenses${suffixe}`} className="flex items-center justify-between py-1.5 text-[14px] font-medium" style={{color:'var(--ios-accent,#5b4ee8)',minHeight:36}}>{l('Voir toutes mes dépenses','See all my expenses')}<IconeHD nom="chevron_right" className="text-[18px]"/></Link>
       </div>;})()}
       {est&&<div className="mt-3">
        {d>0?<div className="rounded-xl px-2.5 pb-3 pt-1" style={{background:'var(--ios-fond,#f2f2f7)'}}>
         <h4 className="hd-classique sim-ios-titre" style={{marginTop:10}}>{l('Qu’est-ce que tu as fait de cet argent ?','What did you do with this money?')}</h4>
         {/* « Pour vivre » : les dépenses se notent seulement dans SÉNEVÉ Dépenses, qui les retire de cette caisse (décision du 12/11/2026). */}
         {c.enveloppe==='vivre'&&<Link to={`/habitudes/depenses${suffixe}`} className="mb-2.5 flex items-center gap-2.5 rounded-xl bg-white px-3 py-2.5 text-[14px]" style={{minHeight:44}}><span aria-hidden="true" className="grid size-[26px] shrink-0 place-items-center rounded-md text-white" style={{background:'#ff3b30'}}><IconeHD nom="receipt_long" className="text-[16px]"/></span><span className="flex-1">{l('Une dépense de la maison ? Note-la dans ','A household expense? Record it in ')}<b style={{color:'var(--ios-accent,#5b4ee8)'}}>SÉNEVÉ {l('Dépenses','Expenses')}</b></span><IconeHD nom="chevron_right" className="text-[18px] text-hd-on-surface-variant"/></Link>}
         <div role="radiogroup" aria-label={l('Motif','Reason')} className="flex flex-wrap gap-2">{MOTIFS.filter(([m])=>!(c.enveloppe==='vivre'&&m==='depense')).map(([m,n])=><button key={m} type="button" role="radio" aria-checked={motif===m} onClick={()=>setMotif(m)} className={`min-h-[36px] rounded-full px-3.5 text-sm font-medium ${motif===m?'bg-hd-on-surface text-white':'bg-white'}`}>{n}</button>)}</div>
         <div className="sim-ios-groupe hd-classique mt-3">
          <div className="sim-ios-ligne"><label htmlFor={`hd-utilise-${c.cle}`}>{l('Montant utilisé','Amount used')}</label><span className="flex items-center gap-1.5"><input id={`hd-utilise-${c.cle}`} type="number" inputMode="decimal" min={dec?0.01:1} step={dec?0.01:1} max={(dispoAu(c,date)/100).toFixed(dec)} value={montant} onChange={e=>setMontant(e.target.value)} placeholder="0"/><span className="text-hd-on-surface-variant" style={{fontSize:15}}>{dev}</span></span></div>
          <div className="sim-ios-ligne"><label htmlFor={`hd-utilise-date-${c.cle}`}>{l('Date','Date')}</label><input id={`hd-utilise-date-${c.cle}`} type="date" max={aujourdhui()} value={date} onChange={e=>setDate(e.target.value)} style={{color:'var(--ios-accent,#5b4ee8)'}}/></div>
         </div>
         <button type="button" disabled={busy} onClick={()=>void noter(c,false)} className="hd-classique sim-ios-bouton disabled:opacity-60" style={{marginTop:12}}>{busy?l('Enregistrement…','Saving…'):montant&&Number(montant)>0?l(`Noter ${montant} ${dev} ${nomMotif(motif)}s`,`Record ${montant} ${dev} ${nomMotif(motif)}`):l('Noter ce montant','Record this amount')}</button>
        </div>:<p className="rounded-xl p-3 text-sm text-hd-on-surface-variant" style={{background:'var(--ios-fond,#f2f2f7)'}}>{l('La caisse est à zéro. Les prochaines répartitions la rempliront.','This counter is at zero. Your next allocations will fill it.')}</p>}
        {message('caisse:'+c.cle)}
        <div className="sim-ios-groupe hd-classique mt-3" style={{background:'var(--ios-fond,#f2f2f7)'}}><div className="sim-ios-ligne"><span style={{flex:1}}>{c.enveloppe&&c.enveloppe!=='vivre'?l('Donné depuis le début','Given since the start'):l('Utilisé depuis le début','Used since the start')}</span><b className="tabular-nums">{nombre(sorti)} {dev}</b></div></div>
        {lignes.length>0&&<button type="button" disabled={busy} onClick={()=>{setCaisseEffacer(c);setPlageCaisse(null);setConfirmerCaisse(false);setErreurCaisse('');}} className="hd-classique sim-ios-bouton disabled:opacity-60" style={{marginTop:10,background:'rgb(215 0 21 / .08)',color:'#d70015',fontWeight:500}}>{l('Effacer des jours dans cette caisse…','Erase days in this counter…')}</button>}
        {lignes.length>0&&<><h4 className="hd-classique sim-ios-titre" style={{marginLeft:0}}>{l('Historique','History')}</h4>
         <ol className="sim-ios-groupe hd-classique" style={{background:'var(--ios-fond,#f2f2f7)',listStyle:'none',margin:0,padding:0}}>{[...lignes].reverse().flatMap(x=>{const li=<li key={x.id} className="sim-ios-ligne"><span style={{flex:1}}>{momentLisible(x.date,x.creeLe,en)} · {x.signe===1?(x.origine==='repartition'?l('répartition','allocation'):l('versement','contribution')):nomMotif(x.motif)}{(()=>{const d=x.signe===-1?depenseParSortie.get(x.id):undefined;return d?<small className="block text-[12.5px] text-hd-on-surface-variant"><span aria-hidden="true" className="mr-1.5 inline-block size-2 rounded-full align-middle" style={{background:INFOS_CATEGORIES[d.category].couleur}}/>{nomCategorie(d.category)}{d.note?` · ${d.note}`:''}</small>:null;})()}</span><b className="tabular-nums" style={{color:x.signe===1?'#2f9e62':'#d70015'}}>{x.signe===1?'+':'−'} {nombre(x.centimes)}</b></li>;return x.remise?[li,<li key={x.id+'-zero'} className="px-4 py-2 text-center text-xs text-hd-on-surface-variant">{l(`Caisse remise à zéro le ${dateLisible(x.date)}`,`Counter reset on ${dateLisible(x.date)}`)}</li>]:[li];})}</ol></>}
       </div>}
      </article>;})}
    </div>
    <section aria-labelledby="hd-bilan" className="mt-2">
     <div className="flex items-end justify-between"><h2 id="hd-bilan" className="hd-classique sim-ios-titre">{l('Mon bilan','My summary')} · {dev}</h2><button type="button" onClick={()=>{setModifier(v=>!v);setAnnonce(null);}} style={{color:'var(--ios-accent,#5b4ee8)',fontSize:15,minHeight:44,marginBottom:-6,paddingLeft:12}}>{modifier?l('Terminé','Done'):l('Modifier','Edit')}</button></div>
     <div role="radiogroup" aria-label={l('Période','Period')} className="hd-classique sim-ios-segment">{PERIODES.map(([p,n])=><button key={p} type="button" role="radio" aria-checked={periode===p} onClick={()=>setPeriode(p)}>{n}</button>)}</div>
     <div className="sim-ios-groupe hd-classique mt-3">
      {encaisse!==null&&<div className="sim-ios-ligne" style={modifier?{opacity:.45}:undefined}><span aria-hidden="true" className="size-3 rounded" style={{background:'#3a3a3c'}}/><span style={{flex:1}}><span className="block">{l('Encaissé','Received')}</span><small className="block text-[12px] font-normal text-hd-on-surface-variant">{l('montant exact reçu, sans rien enlever','exact amount received, nothing deducted')}</small></span><b className="tabular-nums">{nombre(encaisse)} {dev}</b></div>}
      {pasReparti!==null&&<div className="sim-ios-ligne" style={modifier?{opacity:.45}:undefined}><span aria-hidden="true" className="size-3 rounded" style={{background:'#ff9500'}}/><span style={{flex:1}}><span className="block">{l('Pas encore réparti','Not yet allocated')}</span><small className="block text-[12px] font-normal text-hd-on-surface-variant">{l('à ce jour','as of today')}</small></span><b className="tabular-nums">{nombre(pasReparti)} {dev}</b></div>}
      {([['entre',l('Entré dans les caisses','Added to counters'),'#2f9e62'],['donne',l('Donné','Given'),'#b8862b'],['depense',l('Dépensé','Spent'),'#e0662f'],['investi',l('Investi','Invested'),'#2f6fe0'],['autre',l('Autre','Other'),'#a1a1a6'],['dettes',l('Remboursé sur les dettes','Repaid on debts'),'#7c3aed']] as const).map(([k,n,coul])=><div key={k} className="sim-ios-ligne" style={modifier&&k==='entre'?{opacity:.45}:undefined}>{modifier&&k!=='entre'&&<button type="button" aria-label={l(`Effacer : ${n}`,`Erase: ${n}`)} disabled={bilan[k]===0||busy} onClick={()=>setAEffacer({quoi:k,nom:n,nb:nombreDe(k),centimes:bilan[k]})} className="-my-[11px] -ml-[11px] grid size-[44px] shrink-0 place-items-center disabled:opacity-30"><span aria-hidden="true" className="grid size-[22px] place-items-center rounded-full" style={{background:'#d70015',color:'#fff',fontWeight:700,lineHeight:1}}>−</span></button>}<span aria-hidden="true" className="size-3 rounded" style={{background:coul}}/><span style={{flex:1}}>{n}</span><b className="tabular-nums">{nombre(bilan[k])} {dev}</b></div>)}
     </div>
     {message('bilan')}
     {modifier?<>
      <p className="hd-classique sim-ios-note">{l('Le bouton − retire une ligne de l’historique et du bilan pour la période choisie, sans changer tes caisses ni tes dettes. Pour vraiment effacer des jours (un jour, quelques jours, un mois…), utilise « Effacer des jours ».','The − button removes a line from history and the summary for the chosen period, without changing your counters or debts. To really erase days (one day, a few days, a month…), use “Erase days”. To really start again from zero, use “Reset everything”.')}</p>
      <button type="button" disabled={busy} onClick={()=>void ouvrirToutEffacer()} className="hd-classique sim-ios-bouton" style={{marginTop:14,background:'rgb(215 0 21 / .08)',color:'#d70015'}}>{l('Effacer des jours…','Erase days…')}</button>
     </>:<><Link to={`/habitudes/rapport${suffixe}`} className="hd-classique sim-ios-bouton flex items-center justify-center gap-2" style={{marginTop:12,background:'rgb(118 118 128 / .12)',color:'var(--ios-accent,#5b4ee8)',textDecoration:'none'}}><IconeHD nom="description" className="text-[20px]"/>{l('Voir le rapport (PDF, Word)','See the report (PDF, Word)')}</Link><p className="hd-classique sim-ios-note">{l('Le bilan compte tout l’historique de la période, même après une remise à zéro, y compris les remboursements de dettes. « Modifier » permet de l’effacer.','The summary counts the whole history of the period, even after a reset, including debt repayments. “Edit” lets you erase it.')}</p></>}
    </section>
    {aEffacer&&<div className="fixed inset-0 z-[60] grid place-items-center px-8" role="alertdialog" aria-modal="true" aria-labelledby="hd-effacer-titre">
     <button type="button" aria-label={l('Fermer','Close')} className="absolute inset-0 bg-black/30" onClick={()=>setAEffacer(null)}/>
     <div className="hd-classique relative w-full max-w-[290px] overflow-hidden rounded-[14px] text-center shadow-[0_10px_40px_rgba(0,0,0,.25)]" style={{background:'rgb(242 242 247 / .97)'}}>
      <div className="px-4 pb-3.5 pt-4"><h2 id="hd-effacer-titre" style={{margin:'0 0 6px',fontSize:17,fontWeight:600}}>{l(`Effacer « ${aEffacer.nom} » ?`,`Erase “${aEffacer.nom}”?`)}</h2>
       <p style={{margin:'0 0 6px',fontSize:13,lineHeight:1.4}}>{l(`${aEffacer.nb} ligne${aEffacer.nb>1?'s':''} (${nombre(aEffacer.centimes)} ${dev}), ${libellePeriode}.`,`${aEffacer.nb} line${aEffacer.nb>1?'s':''} (${nombre(aEffacer.centimes)} ${dev}), ${libellePeriode}.`)}</p>
       <p style={{margin:'0 0 6px',fontSize:13,lineHeight:1.4}}>{(aEffacer.nb>1?l('Elles disparaissent de l’historique et du bilan. ','They disappear from history and the summary. '):l('Elle disparaît de l’historique et du bilan. ','It disappears from history and the summary. '))+(aEffacer.quoi==='dettes'?l('Tes dettes ne changent pas : ce qui a été remboursé reste remboursé.','Your debts do not change: what was repaid stays repaid.'):l('Tes caisses ne changent pas : l’argent utilisé reste utilisé.','Your counters do not change: money used stays used.'))}</p>
       <p style={{margin:0,fontSize:13,fontWeight:600}}>{l('On ne peut pas revenir en arrière.','This cannot be undone.')}</p></div>
      <button type="button" disabled={busy} onClick={()=>void effacerLigne()} className="block w-full border-t border-black/20 py-3 text-[17px] font-semibold" style={{color:'#d70015'}}>{busy?l('Effacement…','Erasing…'):l(`Effacer ${nombre(aEffacer.centimes)} ${dev}`,`Erase ${nombre(aEffacer.centimes)} ${dev}`)}</button>
      <button type="button" autoFocus onClick={()=>setAEffacer(null)} className="block w-full border-t border-black/20 py-3 text-[17px]" style={{color:'var(--ios-accent,#5b4ee8)'}}>{l('Annuler','Cancel')}</button>
     </div>
    </div>}
    {caisseEffacer&&(()=>{const c=caisseEffacer,dans=plageCaisse?lignesDe(c).filter(x=>x.date>=plageCaisse.du&&x.date<=plageCaisse.au):[];const plus=dans.filter(x=>x.signe===1).reduce((n,x)=>n+x.centimes,0),moins=dans.filter(x=>x.signe===-1).reduce((n,x)=>n+x.centimes,0);
     const quand=!plageCaisse?'':plageCaisse.du===plageCaisse.au?l(`le ${dateLisible(plageCaisse.du)}`,`on ${dateLisible(plageCaisse.du)}`):l(`du ${dateLisible(plageCaisse.du)} au ${dateLisible(plageCaisse.au)} (${nbJours(plageCaisse)} jours)`,`from ${dateLisible(plageCaisse.du)} to ${dateLisible(plageCaisse.au)} (${nbJours(plageCaisse)} days)`);
     async function effacerCaisse(){if(!suivi||!plageCaisse||busy)return;setBusy(true);setErreurCaisse('');
      try{await effacerJoursCaisse(suivi.enrollment_id,dev,c.enveloppe??null,c.goalId??null,plageCaisse.du,plageCaisse.au);const nom=c.nom+(c.goalId?` · ${c.sous}`:'');setCaisseEffacer(null);setConfirmerCaisse(false);await relireTout();setAnnonce({zone:'caisse:'+c.cle,texte:l(`${nom} : les opérations ${quand} sont effacées. Les autres jours n’ont pas changé.`,`${nom}: operations ${quand} are erased. Other days did not change.`),erreur:false});}
      catch(err){setConfirmerCaisse(false);setErreurCaisse(err instanceof EffacementImpossible?l('Rien n’a été effacé : de l’argent entré ces jours-là a déjà été utilisé plus tard dans cette caisse. Ajoute aussi les jours suivants.','Nothing was erased: money recorded on these days was already used later in this counter. Also include the following days.'):l('L’effacement n’a pas pu se faire. Réessaie.','Erasing did not work. Try again.'));}
      finally{setBusy(false);}}
     return <div className="fixed inset-0 z-[60] flex flex-col justify-end" role="dialog" aria-modal="true" aria-labelledby="hd-caisse-effacer-titre">
     <button type="button" aria-label={l('Fermer','Close')} className="absolute inset-0 bg-black/30" onClick={()=>setCaisseEffacer(null)}/>
     <div className="sim-ios hd-classique relative max-h-[90vh] overflow-y-auto rounded-t-[14px] px-4 pb-8 pt-2" style={{background:'var(--ios-fond,#f2f2f7)'}}>
      <div aria-hidden="true" className="mx-auto mb-2.5 h-[5px] w-9 rounded-full bg-[#c7c7cc]"/>
      <div className="mb-2 grid grid-cols-[1fr_auto_1fr] items-center"><button type="button" onClick={()=>setCaisseEffacer(null)} className="justify-self-start text-[17px]" style={{color:'var(--ios-accent,#5b4ee8)',minHeight:44}}>{l('Annuler','Cancel')}</button><h2 id="hd-caisse-effacer-titre" style={{margin:0,fontSize:17,fontWeight:600,textAlign:'center'}}>{l('Effacer des jours','Erase days')}<small className="block text-[12px] font-normal text-hd-on-surface-variant">{c.nom}{c.goalId?` · ${c.sous}`:''}</small></h2><span/></div>
      <CalendrierPlage valeur={plageCaisse} changer={p=>{setPlageCaisse(p);setErreurCaisse('');}} langue={langue}/>
      {plageCaisse&&<div className="mt-3 rounded-[14px] p-3.5 text-sm leading-relaxed" style={{background:'#fde8ea',color:'#9b0011'}}>
       {dans.length===0?l(`Aucune opération dans cette caisse ${quand}.`,`No operation in this counter ${quand}.`):<>
        <b>{l(`Dans cette caisse seulement, ${quand} :`,`In this counter only, ${quand}:`)}</b>
        <ul style={{margin:'6px 0',paddingLeft:18,listStyle:'disc'}}><li>{l(`${dans.length} opération${dans.length>1?'s':''} effacée${dans.length>1?'s':''}`,`${dans.length} operation${dans.length>1?'s':''} erased`)}{plus>0?l(` · entrées : + ${nombre(plus)} ${dev}`,` · entries: + ${nombre(plus)} ${dev}`):''}{moins>0?l(` · sorties : − ${nombre(moins)} ${dev}`,` · exits: − ${nombre(moins)} ${dev}`):''} ;</li>
         {c.enveloppe==='vivre'&&<li>{l('les dépenses de SÉNEVÉ Dépenses de ces jours sont effacées aussi ;','SÉNEVÉ Expenses entries on these days are erased too;')}</li>}
         <li>{l('les autres caisses et les autres jours ne changent pas.','other counters and other days do not change.')}</li></ul>
        <b>{l('On ne peut pas revenir en arrière.','This cannot be undone.')}</b></>}
      </div>}
      {erreurCaisse&&<p role="alert" className="mt-3 rounded-[14px] bg-white p-3 text-sm" style={{color:'#d70015'}}>{erreurCaisse}</p>}
      <button type="button" disabled={busy||!plageCaisse||dans.length===0} onClick={()=>setConfirmerCaisse(true)} className="sim-ios-bouton disabled:opacity-60" style={{marginTop:14,background:'#d70015'}}>{!plageCaisse?l('Choisis les jours','Choose the days'):plageCaisse.du===plageCaisse.au?l('Effacer ce jour','Erase this day'):l(`Effacer ces ${nbJours(plageCaisse)} jours`,`Erase these ${nbJours(plageCaisse)} days`)}</button>
     </div>
     {confirmerCaisse&&<div className="fixed inset-0 z-[70] grid place-items-center bg-black/40 px-8" role="alertdialog" aria-modal="true" aria-labelledby="hd-caisse-confirmer-titre" aria-describedby="hd-caisse-confirmer-texte">
      <div className="w-full max-w-[290px] overflow-hidden rounded-[14px] text-center" style={{background:'rgb(242 242 247 / .97)'}}>
       <div className="px-4 pb-4 pt-5"><h3 id="hd-caisse-confirmer-titre" style={{margin:'0 0 4px',fontSize:17,fontWeight:600}}>{l('Effacer vraiment ?','Really erase?')}</h3>
        <p id="hd-caisse-confirmer-texte" style={{margin:0,fontSize:13,lineHeight:1.4}}>{l(`${dans.length} opération${dans.length>1?'s':''} de « ${c.nom} » ${quand} vont être effacée${dans.length>1?'s':''}. On ne peut pas revenir en arrière.`,`${dans.length} operation${dans.length>1?'s':''} of “${c.nom}” ${quand} will be erased. This cannot be undone.`)}</p></div>
       <div className="grid grid-cols-2 border-t" style={{borderColor:'rgb(60 60 67 / .29)'}}>
        <button type="button" autoFocus onClick={()=>setConfirmerCaisse(false)} className="min-h-[44px] border-r text-[17px]" style={{borderColor:'rgb(60 60 67 / .29)',color:'var(--ios-accent,#5b4ee8)'}}>{l('Annuler','Cancel')}</button>
        <button type="button" disabled={busy} onClick={()=>void effacerCaisse()} className="min-h-[44px] text-[17px] font-semibold" style={{color:'#d70015'}}>{busy?l('Effacement…','Erasing…'):l('Oui, effacer','Yes, erase')}</button>
       </div>
      </div>
     </div>}
    </div>;})()}
    {toutEffacer&&<div className="fixed inset-0 z-[60] flex flex-col justify-end" role="dialog" aria-modal="true" aria-labelledby="hd-tout-effacer-titre">
     <button type="button" aria-label={l('Fermer','Close')} className="absolute inset-0 bg-black/30" onClick={()=>setToutEffacer(false)}/>
     <form onSubmit={e=>void confirmerToutEffacer(e)} noValidate className="sim-ios hd-classique relative max-h-[90vh] overflow-y-auto rounded-t-[14px] px-4 pb-8 pt-2" style={{background:'var(--ios-fond,#f2f2f7)'}}>
      <div aria-hidden="true" className="mx-auto mb-2.5 h-[5px] w-9 rounded-full bg-[#c7c7cc]"/>
      <div className="mb-2 grid grid-cols-[1fr_auto_1fr] items-center"><button type="button" onClick={()=>setToutEffacer(false)} className="justify-self-start text-[17px]" style={{color:'var(--ios-accent,#5b4ee8)',minHeight:44}}>{l('Annuler','Cancel')}</button><h2 id="hd-tout-effacer-titre" style={{margin:0,fontSize:17,fontWeight:600}}>{l('Effacer des jours','Erase days')}</h2><span/></div>
      <CalendrierPlage valeur={plage} changer={setPlage} langue={langue}/>
      {plage&&<div className="mt-3 rounded-[14px] p-3.5 text-sm leading-relaxed" style={{background:'#fde8ea',color:'#9b0011'}}><b>{l(`Seulement ${libelleEffacer}, en ${dev} :`,`Only ${libelleEffacer}, in ${dev}:`)}</b>
       <ul style={{margin:'6px 0',paddingLeft:18,listStyle:'disc'}}><li>{l('les entrées et sorties des caisses (dîme, offrande, pour vivre) de ces jours sont effacées ;','counter entries and exits (tithe, offering, living) on these days are erased;')}</li><li>{l('les versements et retraits de tes objectifs de ces jours sont effacés ;','your goals’ contributions and withdrawals on these days are erased;')}</li><li>{l('les remboursements de dettes de ces jours sont effacés : une dette qui n’est plus soldée redevient en cours ;','debt repayments on these days are erased: a debt that is no longer paid off becomes open again;')}</li><li>{l('les dépenses de SÉNEVÉ Dépenses de ces jours sont effacées ;','SÉNEVÉ Expenses entries on these days are erased;')}</li><li>{l('les encaissements, les répartitions et les paiements de charges de ces jours sont effacés : le « Solde à répartir » est recalculé.','receipts, allocations and cost payments on these days are erased: the “Balance to allocate” is recalculated.')}</li></ul>
       <b>{l('Tous les autres jours restent intacts.','All other days stay intact.')}</b> 
       {l('Tes objectifs, tes dettes et tes charges restent, avec leur nom et leur montant prévu.','Your goals, debts and business costs remain, with their names and planned amounts.')} <b>{l('On ne peut pas revenir en arrière.','This cannot be undone.')}</b></div>}
      {!compte&&<p role="status" className="sim-ios-note">{l('Vérification de ton compte…','Checking your account…')}</p>}
      {compte?.motDePasse&&<><h3 className="sim-ios-titre">{l('Pour confirmer, écris ton e-mail et ton mot de passe','To confirm, enter your e-mail and password')}</h3>
       <div className="sim-ios-groupe"><div className="sim-ios-ligne"><label htmlFor="hd-effacer-email">{l('E-mail','E-mail')}</label><input id="hd-effacer-email" type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} placeholder={l('ton e-mail','your e-mail')} style={{width:'60%',textAlign:'right'}}/></div>
        <div className="sim-ios-ligne"><label htmlFor="hd-effacer-mdp">{l('Mot de passe','Password')}</label><input id="hd-effacer-mdp" type="password" autoComplete="current-password" value={motDePasse} onChange={e=>setMotDePasse(e.target.value)} placeholder="••••••••" style={{width:'60%',textAlign:'right'}}/></div></div></>}
      {compte&&!compte.motDePasse&&<><h3 className="sim-ios-titre">{l('Ton compte n’a pas de mot de passe (connexion Google) : écris EFFACER','Your account has no password (Google sign-in): type EFFACER')}</h3>
       <div className="sim-ios-groupe"><div className="sim-ios-ligne"><label htmlFor="hd-effacer-mot">{l('Confirmation','Confirmation')}</label><input id="hd-effacer-mot" autoComplete="off" value={mot} onChange={e=>setMot(e.target.value)} placeholder="EFFACER" style={{width:'55%',textAlign:'right'}}/></div></div></>}
      {erreurEffacer&&<p role="alert" className="sim-ios-alerte">{erreurEffacer}</p>}
      <button type="submit" disabled={busy||!compte||!plage} className="sim-ios-bouton disabled:opacity-60" style={{marginTop:14,background:'#d70015'}}>{busy?l('Effacement…','Erasing…'):!plage?l('Choisis les jours','Choose the days'):plage.du===plage.au?l('Effacer ce jour','Erase this day'):l(`Effacer ces ${nbJours(plage)} jours`,`Erase these ${nbJours(plage)} days`)}</button>
     </form>
    </div>}
   </>}
  </div>
 </CadreHabitudes>;
}
