import {useCallback,useEffect,useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {retourPrecedent} from '@/lib/retour-precedent';
import {supabase} from '@/lib/supabase';
import {IconeTrait as T} from '@/components/IconeTrait';
import {BarreNav} from '@/components/BarreNav';
import {FORMULES,VALEUR_SEPAREE_PLUS,chargerMonAbonnement,economieAn,offreAbonnement,prixAnnuelMensualise,type MonAbonnement} from '@/lib/abonnements';
import './profil-v2.css';
import './abonnement.css';

/** « Mon abonnement », dans Mes réglages (maquette validée par Dr Justin le 04/11/2026). Les données viennent de
 * seneve.mon_abonnement() (seneve_063) ; un bouton d'achat n'apparaît que lorsque le produit Chariow existe. */
export function Abonnement(){
 const [params]=useSearchParams();const en=params.get('lang')==='en',langue=en?'en':'fr',l=(fr:string,english:string)=>en?english:fr,suffixe=en?'?lang=en':'';
 const [donnees,setDonnees]=useState<MonAbonnement|null>(null),[etat,setEtat]=useState<'chargement'|'pret'|'erreur'|'deconnecte'>('chargement');
 const [periode,setPeriode]=useState<'mois'|'an'>('mois');
 const charger=useCallback(()=>{setEtat('chargement');void supabase.auth.getSession().then(s=>{if(!s.data.session){setEtat('deconnecte');return;}return chargerMonAbonnement().then(d=>{setDonnees(d);setEtat('pret');});}).catch(()=>setEtat('erreur'));},[]);
 useEffect(()=>{charger();},[charger]);
 useEffect(()=>{document.title=`${l('Mon abonnement','My subscription')} — SÉNEVÉ`;document.documentElement.lang=langue;},[en]);
 const format=(d:Date)=>new Intl.DateTimeFormat(en?'en-GB':'fr-FR',{day:'numeric',month:'long',year:'numeric'}).format(d);
 const prix=(m:number)=>m===0?l('Gratuit','Free'):en?`$${m.toLocaleString('en-US',{maximumFractionDigits:2})}`:`${m.toLocaleString('fr-FR',{maximumFractionDigits:2})} $`;
 const tete=<><header className="pv-haut"><Link onClick={retourPrecedent} className="pv-rond" to={`/reglages${suffixe}`} aria-label={l('Revenir à mes réglages','Back to my settings')}><T nom="retour"/></Link></header>
  <p className="pv-surtitre">{l('Mes réglages','My settings')}</p>
  <h1 className="pv-titre">{l('Mon abonnement','My subscription')}</h1></>;
 if(etat!=='pret'||!donnees)return <main className="pf-page pv-page ab-page avec-nav">{tete}
  {etat==='chargement'?<p role="status" className="ab-vide">{l('Chargement de ton abonnement…','Loading your subscription…')}</p>
   :etat==='deconnecte'?<section className="ab-actuelle"><p className="ab-message">{l('Connecte-toi pour voir ton abonnement.','Sign in to see your subscription.')}</p><Link className="ab-bouton ab-principal" to={`/connexion${suffixe}`}>{l('Me connecter','Sign in')}</Link></section>
   :<section className="ab-actuelle" role="alert"><p className="ab-message">{l('Impossible de charger ton abonnement. Vérifie ta connexion, puis réessaie.','Unable to load your subscription. Check your connection, then try again.')}</p><button type="button" className="ab-bouton ab-principal" onClick={charger}>{l('Réessayer','Try again')}</button></section>}
  <BarreNav langue={langue} maquette iconesJournee/>
 </main>;

 const actuelle=donnees.formule,f=FORMULES.find(x=>x.id===actuelle)!;
 const maintenant=Date.now(),dateFin=donnees.fin?new Date(donnees.fin):null,dateDebut=donnees.debut?new Date(donnees.debut):null;
 const restants=dateFin?Math.max(0,Math.ceil((+dateFin-maintenant)/864e5)):null,total=dateFin&&dateDebut?Math.max(1,Math.round((+dateFin-+dateDebut)/864e5)):1;
 const termine=restants===0,bientot=!termine&&restants!==null&&restants<=7;
 return <main className="pf-page pv-page ab-page avec-nav">
  {tete}
  <p className="pv-intro">{l('De la graine à l’arbre : choisis la formule qui t’aide à avancer. Tu peux changer à tout moment.','From seed to tree: choose the plan that helps you grow. You can change at any time.')}</p>

  {/* 1. Formule actuelle */}
  <section className={`ab-actuelle${termine?' ab-terminee':bientot?' ab-bientot':''}`} aria-label={l('Ma formule actuelle','My current plan')}>
   <div className="ab-actuelle-haut"><span className="ab-icone"><T nom={f.icone} taille={26}/></span><div><span className="ab-etiquette">{l('Ta formule','Your plan')}{donnees.periode==='an'?l(' · à l’année',' · yearly'):donnees.periode==='mois'?l(' · au mois',' · monthly'):''}</span><h2>{l(...f.nom)}</h2></div><span className="ab-etat">{termine?l('Terminée','Ended'):l('Active','Active')}</span></div>
   {dateFin&&restants!==null&&(termine?<p className="ab-message">{l(`Ta formule s’est terminée le ${format(dateFin)}. Tout ce que tu as vécu est gardé : choisis une formule pour continuer.`,`Your plan ended on ${format(dateFin)}. Everything you have lived is kept: choose a plan to continue.`)}</p>
    :<><div className="ab-jauge" role="meter" aria-valuemin={0} aria-valuemax={total} aria-valuenow={restants} aria-label={l('Jours restants','Days left')}><span style={{width:`${Math.min(100,restants/total*100)}%`}}/></div>
     <p className="ab-message"><strong>{l(`${restants} jour${restants>1?'s':''} restant${restants>1?'s':''}`,`${restants} day${restants>1?'s':''} left`)}</strong> · {l(`jusqu’au ${format(dateFin)}`,`until ${format(dateFin)}`)}</p>
     {bientot&&<p className="ab-alerte">{l('Ta formule se termine bientôt. Rien n’est prélevé automatiquement : renouvelle quand tu veux.','Your plan ends soon. Nothing is charged automatically: renew whenever you like.')}</p>}</>)}
   <ul className="ab-inclus">{f.avantages.map(a=><li key={a[0]}><T nom="graine" taille={14}/>{l(...a)}</li>)}</ul>
   {(termine||bientot)&&<a className="ab-bouton ab-principal" href="#formules">{actuelle==='graine'?l('Choisir une formule','Choose a plan'):l('Renouveler','Renew')}</a>}
  </section>

  {/* 2. Les formules */}
  <h2 className="pv-surtitre" id="formules">{l('Les formules','Plans')}</h2>
  <div className="ab-periode" role="radiogroup" aria-label={l('Durée','Duration')}>
   <button type="button" role="radio" aria-checked={periode==='mois'} onClick={()=>setPeriode('mois')}>{l('Au mois','Monthly')}</button>
   <button type="button" role="radio" aria-checked={periode==='an'} onClick={()=>setPeriode('an')}>{l('À l’année','Yearly')}<span className="ab-cadeau">{l('2 mois offerts','2 months free')}</span></button>
  </div>
  <div className="ab-formules">
   {FORMULES.map(x=>{const annuel=periode==='an'&&x.an!==null,est=x.id===actuelle,lien=x.id==='graine'?null:donnees.liens[offreAbonnement(x.id,periode,langue)];
    return <article key={x.id} className={`ab-formule ab-${x.id}${est?' ab-courante':''}`} aria-label={l(...x.nom)}>
     {x.badge&&<span className="ab-badge">{l(...x.badge)}</span>}
     <div className="ab-formule-haut"><span className="ab-icone"><T nom={x.icone} taille={24}/></span><div><h3>{l(...x.nom)}</h3><p>{l(...x.accroche)}</p></div></div>
     <p className="ab-prix">{x.mois===0?<strong>{l('Gratuit','Free')}</strong>:annuel?<><strong>{prix(x.an!)}</strong><span>{l(' / an',' / year')}</span><small>{l(`soit ${prix(prixAnnuelMensualise(x)!)} par mois`,`i.e. ${prix(prixAnnuelMensualise(x)!)} a month`)}</small></>:<><strong>{prix(x.mois)}</strong><span>{l(' / mois',' / month')}</span></>}{x.mois===0&&<small>{l('1 mois','1 month')}</small>}</p>
     {annuel&&<div className="ab-bonus"><p className="ab-economie">{l(`Tu économises ${prix(economieAn(x))} par an`,`You save ${prix(economieAn(x))} a year`)}</p><p className="ab-bonus-titre"><T nom="ticket" taille={16}/>{l('Inclus avec l’année','Included with the year')}</p><ul>{x.bonusAn?.map(b=><li key={b[0]}><T nom="graine" taille={14}/>{l(...b)}</li>)}</ul></div>}
     {x.id==='plus'&&<p className="ab-valeur">{l(`Valeur des contenus achetés séparément : ${prix(Math.round(VALEUR_SEPAREE_PLUS))}`,`Value of the content bought separately: ${prix(Math.round(VALEUR_SEPAREE_PLUS))}`)}</p>}
     <ul>{x.avantages.map(a=><li key={a[0]}><T nom="graine" taille={14}/>{l(...a)}</li>)}</ul>
     {x.places&&<p className="ab-places">{l(...x.places)}</p>}
     {est&&!termine&&x.id==='graine'?<span className="ab-bouton ab-desactive">{l('Ta formule actuelle','Your current plan')}</span>
      :x.id==='graine'?null
      :x.id==='accompagnement'?<Link className="ab-bouton" to={`/aide?motif=accompagnement${en?'&lang=en':''}`}>{l('Demander une place','Ask for a place')}</Link>
      :lien?<a className={`ab-bouton${x.id==='plus'?' ab-principal':''}`} href={lien} target="_blank" rel="noopener noreferrer">{est?l('Renouveler','Renew'):l(`Choisir ${x.nom[0]}`,`Choose ${x.nom[1]}`)}</a>
      :<span className="ab-bouton ab-desactive">{l('Bientôt disponible','Coming soon')}</span>}
    </article>;})}
  </div>
  <p className="pv-note">{l('Paiement sécurisé par Chariow (Mobile Money ou carte), avec la même adresse e-mail que ton compte. Aucun prélèvement automatique : à la fin de la période, tu choisis de renouveler ou non. Ta progression est toujours gardée.','Secure payment with Chariow (Mobile Money or card), with the same email address as your account. No automatic charge: at the end of the period, you choose whether to renew. Your progress is always kept.')}</p>

  {/* 3. Offrir */}
  <section className="ab-offrir" aria-label={l('Offrir un abonnement','Give a subscription')}>
   <span className="ab-icone"><T nom="ticket" taille={24}/></span>
   <div><h2>{l('Offre un mois de Sénevé','Give a month of Sénevé')}</h2><p>{l('À un proche, à un membre de ton église, ou à quelqu’un qui ne peut pas payer : il reçoit un code et commence aussitôt.','To someone close, a member of your church, or someone who cannot pay: they receive a code and start right away.')}</p></div>
   <Link className="ab-bouton" to={`/aide?motif=offrir${en?'&lang=en':''}`}>{l('Offrir','Give')}</Link>
  </section>

  {/* 4. Mes achats */}
  <h2 className="pv-surtitre">{l('Mes achats','My purchases')}</h2>
  <div className="pv-groupe">{donnees.achats.length?donnees.achats.map(a=><div key={a.offre_id+a.le} className="ab-achat"><T nom="livre" taille={20}/><span>{a.produit}</span>{a.le&&<small>{l(`Acheté le ${format(new Date(a.le))}`,`Bought on ${format(new Date(a.le))}`)}</small>}</div>):<p className="ab-vide">{l('Aucun achat pour l’instant.','No purchases yet.')}</p>}</div>
  <p className="pv-note">{l('Une question sur un paiement ? ','A question about a payment? ')}<Link to={`/aide?motif=paiement${en?'&lang=en':''}`}>{l('Écrire à l’équipe','Write to the team')}</Link></p>
  <BarreNav langue={langue} maquette iconesJournee/>
 </main>;
}
