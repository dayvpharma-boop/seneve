import '@/components/SimulateurEpargne.css';
import {useCallback,useEffect,useMemo,useState} from 'react';
import {Link,useLocation,useSearchParams} from 'react-router-dom';
import {CadreHabitudes} from '@/components/CadreHabitudes';
import {ComptePrive} from '@/components/ComptePrive';
import {IconeHD} from '@/components/IconeHabitudes';
import {suiviFinancierActive} from '@/lib/habitudes-configuration';
import {chargerSuiviFinancier,type SuiviFinancier} from '@/lib/habitudes-finances-suivi';
import {chargerCompteurs,CompteursIndisponibles,disponibleCompteur,disponibleObjectif,noterRetraitEpargne,noterSortieCompteur,type Compteurs,type Enveloppe,type Motif} from '@/lib/habitudes-finances-compteurs';
import {decimalesDevise,montantValidePourDevise} from '@/lib/devises';
import {NotFound} from '@/routes/introuvable';
import {momentLisible} from '@/lib/date-heure-finances';

/** Page « Mes compteurs » (maquette validée le 07/11/2026, demande de Dr Justin) :
 * - le disponible de chaque caisse (dîme, offrande, Réserve de joie, pour investir, pour vivre) ;
 * - noter l'argent donné, dépensé ou investi, ou « tout utilisé » : la caisse repart de zéro ;
 * - l'historique n'est JAMAIS effacé : bilan de la semaine, du mois ou de l'année. Aucun argent ne bouge. */
type Caisse={cle:string;nom:string;sous:string;couleur:string;icone:string;enveloppe?:Enveloppe;goalId?:string};
type Ligne={id:string;date:string;creeLe?:string;signe:1|-1;centimes:number;motif:Motif|null;remise:boolean;origine:'repartition'|'versement'|'sortie'};
type Periode='semaine'|'mois'|'annee';
const aujourdhui=()=>new Intl.DateTimeFormat('en-CA').format(new Date());
const centimes=(v:string)=>Math.round(Number(v)*100);
const debutPeriode=(p:Periode)=>{const d=new Date();if(p==='annee')return `${d.getFullYear()}-01-01`;if(p==='mois')return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`;const j=(d.getDay()+6)%7;const l=new Date(d.getFullYear(),d.getMonth(),d.getDate()-j);return new Intl.DateTimeFormat('en-CA').format(l);};

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
 const [busy,setBusy]=useState(false),[annonce,setAnnonce]=useState<{zone:string;texte:string;erreur:boolean}|null>(etatNav?.message?{zone:'haut',texte:etatNav.message,erreur:false}:null);
 const suffixe=en?'?lang=en':'';
 const charger=useCallback(async()=>{
  try{
   const s=await chargerSuiviFinancier(null);if(!s){setEtat('vide');return;}
   setSuivi(s);
   try{setCpt(await chargerCompteurs(s.enrollment_id));setEtat('pret');}
   catch(e){if(e instanceof CompteursIndisponibles){setEtat('indisponible');return;}throw e;}
  }catch{setEtat('erreur');}
 },[userId]);
 useEffect(()=>{void charger();},[charger]);
 useEffect(()=>{document.title=l('Mes compteurs','My counters')+' — SÉNEVÉ';document.documentElement.lang=langue;},[langue]);
 const devises=useMemo(()=>{const s=new Set<string>();cpt?.moves.forEach(m=>s.add(m.currency));suivi?.savings_goals.forEach(g=>s.add(g.currency));return [...s];},[cpt,suivi]);
 const dev=devise&&devises.includes(devise)?devise:devises[0]??'USD';
 const dec=decimalesDevise(dev);
 const nombre=(c:number)=>new Intl.NumberFormat(en?'en-US':'fr-FR',{minimumFractionDigits:c%100===0?0:dec,maximumFractionDigits:dec}).format(c/100);
 const dateLisible=(iso:string)=>new Intl.DateTimeFormat(en?'en-GB':'fr-FR',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(iso+'T00:00:00Z'));
 const caisses:Caisse[]=[
  {cle:'dime',nom:l('Dîme','Tithe'),sous:l('à donner','to give'),couleur:'#b8862b',icone:'church',enveloppe:'dime'},
  {cle:'offrande',nom:l('Offrande','Offering'),sous:l('à donner','to give'),couleur:'#b05bd6',icone:'favorite',enveloppe:'offrande'},
  // Tous les objectifs d'épargne, « Autre objectif » compris (demande du 07/11/2026).
  ...(suivi?.savings_goals.filter(g=>g.currency===dev).map(g=>({cle:g.goal_id,nom:g.goal_type==='reserve_joie'?l('Réserve de joie','Family joy reserve'):g.goal_type==='epargne_investir'?l('Pour investir','For investing'):l('Autre objectif','Other goal'),sous:g.label,couleur:g.goal_type==='reserve_joie'?'#2f9e62':g.goal_type==='epargne_investir'?'#2f6fe0':'#c2410c',icone:g.goal_type==='reserve_joie'?'potted_plant':g.goal_type==='epargne_investir'?'pie_chart':'bookmark',goalId:g.goal_id}))??[]),
  {cle:'vivre',nom:l('Pour vivre','For living'),sous:l('dépenses de la maison','household spending'),couleur:'#a1a1a6',icone:'location_on',enveloppe:'vivre'},
 ];
 const lignesDe=(c:Caisse):Ligne[]=>{
  if(!cpt)return [];
  if(c.enveloppe)return cpt.moves.filter(m=>m.envelope===c.enveloppe&&m.currency===dev).map(m=>({id:m.move_id,date:m.date_locale,creeLe:m.created_at,signe:m.direction==='entree'?1:-1,centimes:centimes(m.amount),motif:m.motif,remise:m.remise_a_zero,origine:m.direction==='entree'?'repartition':'sortie'}));
  const g=suivi?.savings_goals.find(x=>x.goal_id===c.goalId);if(!g)return [];
  return [...g.entries.map(v=>({id:v.entry_id,date:v.date_locale,creeLe:v.created_at,signe:1 as const,centimes:centimes(v.amount),motif:null,remise:false,origine:'versement' as const})),...cpt.withdrawals.filter(w=>w.goal_id===g.goal_id).map(w=>({id:w.withdrawal_id,date:w.date_locale,creeLe:w.created_at,signe:-1 as const,centimes:centimes(w.amount),motif:w.motif,remise:w.remise_a_zero,origine:'sortie' as const}))].sort((a,b)=>a.date.localeCompare(b.date)||(a.creeLe??'').localeCompare(b.creeLe??''));
 };
 const dispo=(c:Caisse)=>{if(!cpt)return 0;if(c.enveloppe)return disponibleCompteur(cpt,c.enveloppe,dev);const g=suivi?.savings_goals.find(x=>x.goal_id===c.goalId);return g?disponibleObjectif(cpt,g.goal_id,g.entries):0;};
 const MOTIFS:[Motif,string][]=[['donne',l('Donné','Given')],['depense',l('Dépensé','Spent')],['investi',l('Investi','Invested')],['autre',l('Autre','Other')]];
 const nomMotif=(m:Motif|null)=>MOTIFS.find(x=>x[0]===m)?.[1].toLowerCase()??'';
 // Bilan de la période : ce qui est entré et ce qui est sorti, par motif. L'historique n'est jamais remis à zéro.
 const debut=debutPeriode(periode);
 const bilan=useMemo(()=>{const b={entre:0,donne:0,depense:0,investi:0,autre:0,dettes:0};for(const c of caisses)for(const x of lignesDe(c))if(x.date>=debut){if(x.signe===1)b.entre+=x.centimes;else b[x.motif??'autre']+=x.centimes;}for(const d of suivi?.debts??[])if(d.currency===dev)for(const p of d.payments)if(p.date_locale>=debut)b.dettes+=centimes(p.amount);return b;},[cpt,suivi,dev,debut,en]);
 function ouvrir(c:Caisse){setOuverte(o=>o===c.cle?'':c.cle);setMontant('');setMotif(c.enveloppe==='vivre'?'depense':c.goalId?'investi':'donne');setDate(aujourdhui());setAnnonce(null);}
 async function noter(c:Caisse,toutUtilise:boolean){
  if(!suivi||busy)return;const zone='caisse:'+c.cle;
  if(!toutUtilise&&(!montantValidePourDevise(montant,dev)||Number(montant)<=0)){setAnnonce({zone,texte:l('Écris un montant plus grand que 0, avec des chiffres seulement.','Enter an amount above 0, using digits only.'),erreur:true});return;}
  if(!toutUtilise&&Math.round(Number(montant)*100)>dispo(c)){setAnnonce({zone,texte:l('Le montant dépasse le disponible de cette caisse.','The amount is greater than what is available.'),erreur:true});return;}
  if(date>aujourdhui()){setAnnonce({zone,texte:l('Choisis une date qui n’est pas dans le futur.','Choose a date that is not in the future.'),erreur:true});return;}
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
 const PERIODES:[Periode,string][]=[['semaine',l('Cette semaine','This week')],['mois',l('Ce mois','This month')],['annee',l('Cette année','This year')]];
 return <CadreHabitudes titre={l('Mes compteurs','My counters')} langue={langue} retour={`/espace${suffixe}`} retourLibelle={l('Revenir à ma journée','Back to my day')} liens={{aujourdhui:`/espace${suffixe}`}} actif="aujourdhui" cloche>
  <div className="sim-ios mx-auto flex w-full max-w-xl flex-col px-hd-margin pt-hd-space-md pb-hd-space-lg" style={{background:'var(--ios-fond,#f2f2f7)'}}>
   <h1 className="mb-1 ml-1 text-[34px] font-bold leading-tight tracking-tight">{l('Mes compteurs','My counters')}</h1>
   <p className="hd-classique sim-ios-sous">{l('Chaque répartition remplit les caisses. Touche une caisse quand l’argent a été donné, dépensé ou investi. L’historique n’est jamais effacé.','Each allocation fills the counters. Tap one when the money has been given, spent or invested. History is never erased.')}</p>
   {message('haut')}
   {etat==='chargement'&&<p role="status" className="rounded-2xl bg-white p-4">{l('Chargement…','Loading…')}</p>}
   {etat==='erreur'&&<p role="alert" className="rounded-2xl bg-white p-4">{l('Tes compteurs ne sont pas disponibles pour le moment.','Your counters are not available right now.')}</p>}
   {etat==='vide'&&<p className="rounded-2xl bg-white p-4">{l('Les compteurs sont disponibles avec un accès actif à Habitudes & Défis.','Counters are available with active Habits & Challenges access.')}</p>}
   {etat==='indisponible'&&<p className="rounded-2xl bg-white p-4">{l('Les compteurs arrivent bientôt dans ton espace.','Counters are coming soon to your space.')}</p>}
   {etat==='pret'&&<>
    <Link to={`/habitudes/repartition?pour=epargne${en?'&lang=en':''}`} className="hd-classique mt-2 flex items-center gap-3.5 rounded-[20px] px-[18px] py-4 text-white" style={{textDecoration:'none',background:'linear-gradient(160deg,#5b4fe0,#49439b)'}}><IconeHD nom="payments" className="text-[24px]"/><span className="flex-1"><b className="block text-[17px]">{l('Quand je reçois de l’argent','When I receive money')}</b><small className="block text-sm opacity-85">{l('Répartir et remplir les caisses','Allocate and fill the counters')}</small></span><IconeHD nom="chevron_right" className="text-[22px] opacity-80"/></Link>
    {devises.length>1&&<div role="radiogroup" aria-label={l('Monnaie','Currency')} className="mt-3 flex gap-2 overflow-x-auto">{devises.map(d=><button key={d} type="button" role="radio" aria-checked={d===dev} onClick={()=>{setDevise(d);setOuverte('');}} className={`min-h-[36px] rounded-full px-3.5 text-sm font-medium ${d===dev?'bg-hd-on-surface text-white':'bg-white'}`}>{d}</button>)}</div>}
    <h2 className="hd-classique sim-ios-titre">{l('Mes caisses','My counters')} · {dev}</h2>
    <div className="flex flex-col gap-2.5">
     {caisses.map(c=>{const d=dispo(c),lignes=lignesDe(c),est=ouverte===c.cle,sorti=lignes.filter(x=>x.signe===-1).reduce((n,x)=>n+x.centimes,0);
      return <article key={c.cle} aria-labelledby={`hd-caisse-${c.cle}`} className="rounded-2xl bg-white px-4 py-3" style={est?{boxShadow:'0 0 0 2px var(--ios-accent,#5b4ee8)'}:undefined}>
       <h3 style={{margin:0}}><button type="button" aria-expanded={est} onClick={()=>ouvrir(c)} className="flex w-full items-center gap-3 text-left">
        <span aria-hidden="true" className="grid size-[30px] shrink-0 place-items-center rounded-lg text-white" style={{background:c.couleur}}><IconeHD nom={c.icone} className="text-[18px]"/></span>
        <span className="min-w-0 flex-1"><span id={`hd-caisse-${c.cle}`} className="block text-[16px] font-semibold">{c.nom}</span><small className="block text-[12px] font-normal text-hd-on-surface-variant">{c.sous}</small></span>
        <span className="text-right"><b className="block text-[17px] tabular-nums">{nombre(d)}</b><small className="block text-[11px] font-normal text-hd-on-surface-variant">{l(`${dev} disponibles`,`${dev} available`)}</small></span>
       </button></h3>
       {est&&<div className="mt-3">
        {d>0?<div className="rounded-xl px-2.5 pb-3 pt-1" style={{background:'var(--ios-fond,#f2f2f7)'}}>
         <h4 className="hd-classique sim-ios-titre" style={{marginTop:10}}>{l('Qu’est-ce que tu as fait de cet argent ?','What did you do with this money?')}</h4>
         <div role="radiogroup" aria-label={l('Motif','Reason')} className="flex flex-wrap gap-2">{MOTIFS.map(([m,n])=><button key={m} type="button" role="radio" aria-checked={motif===m} onClick={()=>setMotif(m)} className={`min-h-[36px] rounded-full px-3.5 text-sm font-medium ${motif===m?'bg-hd-on-surface text-white':'bg-white'}`}>{n}</button>)}</div>
         <div className="sim-ios-groupe hd-classique mt-3">
          <div className="sim-ios-ligne"><label htmlFor={`hd-utilise-${c.cle}`}>{l('Montant utilisé','Amount used')}</label><span className="flex items-center gap-1.5"><input id={`hd-utilise-${c.cle}`} type="number" inputMode="decimal" min={dec?0.01:1} step={dec?0.01:1} max={(d/100).toFixed(dec)} value={montant} onChange={e=>setMontant(e.target.value)} placeholder="0"/><span className="text-hd-on-surface-variant" style={{fontSize:15}}>{dev}</span></span></div>
          <div className="sim-ios-ligne"><label htmlFor={`hd-utilise-date-${c.cle}`}>{l('Date','Date')}</label><input id={`hd-utilise-date-${c.cle}`} type="date" max={aujourdhui()} value={date} onChange={e=>setDate(e.target.value)} style={{color:'var(--ios-accent,#5b4ee8)'}}/></div>
         </div>
         <button type="button" disabled={busy} onClick={()=>void noter(c,false)} className="hd-classique sim-ios-bouton disabled:opacity-60" style={{marginTop:12}}>{busy?l('Enregistrement…','Saving…'):montant&&Number(montant)>0?l(`Noter ${montant} ${dev} ${nomMotif(motif)}s`,`Record ${montant} ${dev} ${nomMotif(motif)}`):l('Noter ce montant','Record this amount')}</button>
         <button type="button" disabled={busy} onClick={()=>void noter(c,true)} className="hd-classique sim-ios-bouton disabled:opacity-60" style={{marginTop:10,background:'rgb(215 0 21 / .08)',color:'#d70015',fontWeight:500}}>{l('Tout utilisé : remettre la caisse à zéro','All used: reset this counter to zero')}</button>
         <p className="hd-classique sim-ios-note">{l(`Note les ${nombre(d)} ${dev} comme utilisés. La caisse repart de 0 ; l’historique reste.`,`Records the ${nombre(d)} ${dev} as used. The counter starts again from 0; history is kept.`)}</p>
        </div>:<p className="rounded-xl p-3 text-sm text-hd-on-surface-variant" style={{background:'var(--ios-fond,#f2f2f7)'}}>{l('La caisse est à zéro. Les prochaines répartitions la rempliront.','This counter is at zero. Your next allocations will fill it.')}</p>}
        {message('caisse:'+c.cle)}
        <div className="sim-ios-groupe hd-classique mt-3" style={{background:'var(--ios-fond,#f2f2f7)'}}><div className="sim-ios-ligne"><span style={{flex:1}}>{c.enveloppe&&c.enveloppe!=='vivre'?l('Donné depuis le début','Given since the start'):l('Utilisé depuis le début','Used since the start')}</span><b className="tabular-nums">{nombre(sorti)} {dev}</b></div></div>
        {lignes.length>0&&<><h4 className="hd-classique sim-ios-titre" style={{marginLeft:0}}>{l('Historique','History')}</h4>
         <ol className="sim-ios-groupe hd-classique" style={{background:'var(--ios-fond,#f2f2f7)',listStyle:'none',margin:0,padding:0}}>{[...lignes].reverse().flatMap(x=>{const li=<li key={x.id} className="sim-ios-ligne"><span style={{flex:1}}>{momentLisible(x.date,x.creeLe,en)} · {x.signe===1?(x.origine==='repartition'?l('répartition','allocation'):l('versement','contribution')):nomMotif(x.motif)}</span><b className="tabular-nums" style={{color:x.signe===1?'#2f9e62':'#d70015'}}>{x.signe===1?'+':'−'} {nombre(x.centimes)}</b></li>;return x.remise?[li,<li key={x.id+'-zero'} className="px-4 py-2 text-center text-xs text-hd-on-surface-variant">{l(`Caisse remise à zéro le ${dateLisible(x.date)}`,`Counter reset on ${dateLisible(x.date)}`)}</li>]:[li];})}</ol></>}
       </div>}
      </article>;})}
    </div>
    <section aria-labelledby="hd-bilan" className="mt-2">
     <h2 id="hd-bilan" className="hd-classique sim-ios-titre">{l('Mon bilan','My summary')} · {dev}</h2>
     <div role="radiogroup" aria-label={l('Période','Period')} className="hd-classique sim-ios-segment">{PERIODES.map(([p,n])=><button key={p} type="button" role="radio" aria-checked={periode===p} onClick={()=>setPeriode(p)}>{n}</button>)}</div>
     <div className="sim-ios-groupe hd-classique mt-3">
      {([['entre',l('Entré dans les caisses','Added to counters'),'#2f9e62'],['donne',l('Donné','Given'),'#b8862b'],['depense',l('Dépensé','Spent'),'#e0662f'],['investi',l('Investi','Invested'),'#2f6fe0'],['autre',l('Autre','Other'),'#a1a1a6'],['dettes',l('Remboursé sur les dettes','Repaid on debts'),'#7c3aed']] as const).map(([k,n,coul])=><div key={k} className="sim-ios-ligne"><span aria-hidden="true" className="size-3 rounded" style={{background:coul}}/><span style={{flex:1}}>{n}</span><b className="tabular-nums">{nombre(bilan[k])} {dev}</b></div>)}
     </div>
     <p className="hd-classique sim-ios-note">{l('Le bilan compte tout l’historique de la période, même après une remise à zéro, y compris les remboursements de dettes.','The summary counts the whole history of the period, even after a reset, including debt repayments.')}</p>
    </section>
   </>}
  </div>
 </CadreHabitudes>;
}
