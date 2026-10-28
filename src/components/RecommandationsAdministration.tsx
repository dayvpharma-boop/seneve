import {useEffect,useRef,useState} from 'react';
import {supabase} from '@/lib/supabase';
import {CATEGORIES_RECOMMANDATIONS,chargerRecommandations,enregistrerRecommandation,cleRecommandationEnAttente,lireRecommandationEnAttente,type Recommandation,type ContenuRecommandation,type EnregistrementRecommandation,type TransportRecommandations} from '@/lib/habitudes-recommandations-api';
import '@/styles-recommandations-administration.css';
const nouveau=(predication=false):ContenuRecommandation=>({categorie:predication?'predication':'lecture_personnelle',titre:'',auteur:'',langue:'fr',url:'',description:'',acces:'a_verifier',etat:'brouillon'});
type Edition={id:string;revision:number;contenu:ContenuRecommandation};
export function RecommandationsAdministration({authId,transport=supabase}:{authId:string;transport?:TransportRecommandations}){
 const initiale=lireRecommandationEnAttente(authId);
 const [lignes,setLignes]=useState<Recommandation[]|null>(null),[erreurListe,setErreurListe]=useState(false),[tour,setTour]=useState(0);
 const [edition,setEdition]=useState<Edition|null>(()=>initiale?{id:initiale.id,revision:initiale.revision,contenu:initiale.contenu}:null);
 const [attente,setAttente]=useState<EnregistrementRecommandation|null>(initiale),[valide,setValide]=useState(false),[busy,setBusy]=useState(false);
 const [erreur,setErreur]=useState(''),[message,setMessage]=useState(''),[retrait,setRetrait]=useState<Recommandation|null>(null);
 const verrou=useRef(false),titreChamp=useRef<HTMLInputElement>(null);
 useEffect(()=>{let actif=true;setErreurListe(false);
  void chargerRecommandations(transport,'fr',true).then(r=>{if(actif)setLignes(r);}).catch(()=>{if(actif)setErreurListe(true);});
  return()=>{actif=false;};
 },[transport,tour,authId]);
 useEffect(()=>{if(edition)titreChamp.current?.focus();},[edition?.id]);
 function ouvrir(r?:Recommandation,predication=false){
  setEdition(r?{id:r.id,revision:r.revision,contenu:{categorie:r.categorie,titre:r.titre,auteur:r.auteur,langue:r.langue,url:r.url,description:r.description,acces:r.acces,etat:r.etat}}:{id:crypto.randomUUID(),revision:0,contenu:nouveau(predication)});
  setValide(false);setErreur('');setMessage('');setRetrait(null);
 }
 function changer<K extends keyof ContenuRecommandation>(cle:K,valeur:ContenuRecommandation[K]){setEdition(e=>e?{...e,contenu:{...e.contenu,[cle]:valeur}}:e);setValide(false);}
 async function sauvegarder(etat:ContenuRecommandation['etat'],source=edition){
  if(verrou.current||!source)return;verrou.current=true;setBusy(true);setErreur('');setMessage('');
  let envoye=false;
  try{
   const s=attente??{id:source.id,revision:source.revision,evenement:crypto.randomUUID(),contenu:{...source.contenu,titre:source.contenu.titre.trim(),auteur:source.contenu.auteur.trim(),url:source.contenu.url.trim(),description:source.contenu.description.trim(),etat,valide}};
   // Persister avant l'envoi : le même clic peut être repris sans doublon.
   sessionStorage.setItem(cleRecommandationEnAttente(authId),JSON.stringify(s));setAttente(s);
   envoye=true;const r=await enregistrerRecommandation(transport,s);
   try{sessionStorage.removeItem(cleRecommandationEnAttente(authId));}catch{/* le même identifiant reste rejouable */}
   setAttente(null);setEdition(null);setRetrait(null);setValide(false);
   setMessage(r.etat==='publie'?'Recommandation publiée dans les lectures du jour.':r.etat==='retire'?'Recommandation retirée de l’affichage.':'Brouillon enregistré.');setTour(t=>t+1);
  }catch(e){
   const code=(e as {code?:string})?.code;
   if(!envoye||['40001','22023','23514','23502','42501'].includes(code??'')||e instanceof Error&&e.message==='Vérifie le titre, l’auteur et le lien HTTPS.'){
    try{sessionStorage.removeItem(cleRecommandationEnAttente(authId));}catch{/* rien */}setAttente(null);
   }
   setErreur(code==='40001'?'Cette fiche a été modifiée ailleurs. Actualise la liste et rouvre sa dernière version.':code==='42501'?'Ton compte n’a pas le droit de gérer ces recommandations.':e instanceof Error?e.message:'Enregistrement non confirmé. Réessaie la même demande.');
  }finally{verrou.current=false;setBusy(false);}
 }
 const bloque=busy||!!attente;
 return <section className="edition-admin recommandations-admin" id="recommandations-hd" aria-label="Gestion des livres et prédications">
  <header className="ed-titre"><div><p className="ed-surtitre">Habitudes & Défis</p><h1>Livres et prédications</h1><p>Ajoute tes liens, puis publie les recommandations que tu as vérifiées.</p></div></header>
  <div className="ed-actions"><button type="button" className="ed-principal" disabled={bloque} onClick={()=>ouvrir()}>Ajouter un livre</button><button type="button" disabled={bloque} onClick={()=>ouvrir(undefined,true)}>Ajouter une prédication</button><button type="button" disabled={busy} onClick={()=>setTour(t=>t+1)}>Actualiser la liste</button></div>
  {message&&<p role="status">{message}</p>}
  {erreur&&<p role="alert">{erreur}</p>}
  {attente&&<aside className="ra-information"><p>Un enregistrement attend sa confirmation. Réessaie avant de modifier une autre fiche.</p><button type="button" disabled={busy} onClick={()=>void sauvegarder(attente.contenu.etat,{id:attente.id,revision:attente.revision,contenu:attente.contenu})}>Réessayer l’enregistrement</button></aside>}
  {edition&&<form className="ra-formulaire" onSubmit={e=>{e.preventDefault();void sauvegarder('publie');}}>
   <h2>{edition.revision?'Modifier la recommandation':edition.contenu.categorie==='predication'?'Nouvelle prédication':'Nouveau livre'}</h2>
   <fieldset disabled={bloque}>
    <label>Titre<input ref={titreChamp} required maxLength={180} value={edition.contenu.titre} onChange={e=>changer('titre',e.target.value)}/></label>
    <label>Auteur ou prédicateur<input required maxLength={160} value={edition.contenu.auteur} onChange={e=>changer('auteur',e.target.value)}/></label>
    <label>Catégorie<select value={edition.contenu.categorie} onChange={e=>changer('categorie',e.target.value as ContenuRecommandation['categorie'])}>{CATEGORIES_RECOMMANDATIONS.map(([v,t])=><option key={v} value={v}>{t}</option>)}</select></label>
    <label>Langue<select value={edition.contenu.langue} onChange={e=>changer('langue',e.target.value as 'fr'|'en')}><option value="fr">Français</option><option value="en">English</option></select></label>
    <label>Lien du livre ou de la prédication<input type="url" required maxLength={2000} placeholder="https://…" value={edition.contenu.url} onChange={e=>changer('url',e.target.value)}/></label>
    <label>Accès<select value={edition.contenu.acces} onChange={e=>changer('acces',e.target.value as ContenuRecommandation['acces'])}><option value="a_verifier">À vérifier sur le site</option><option value="gratuit">Gratuit</option><option value="payant">Payant</option></select></label>
    <label className="ra-large">Pourquoi le recommander ? (facultatif)<textarea maxLength={600} rows={3} value={edition.contenu.description} onChange={e=>changer('description',e.target.value)}/></label>
    <label className="ra-large ra-validation"><input type="checkbox" checked={valide} onChange={e=>setValide(e.target.checked)}/>J’ai vérifié ce contenu et son lien vers une source autorisée. Je le valide pour les participants.</label>
   </fieldset>
   <p>Le lien s’ouvrira sur le site indiqué. Aucun livre, audio ou vidéo n’est recopié dans l’application.</p>
   <div className="ed-actions"><button type="submit" className="ed-principal" disabled={bloque||!valide}>Publier la recommandation</button><button type="button" disabled={bloque} onClick={()=>void sauvegarder('brouillon')}>Enregistrer en brouillon</button><button type="button" disabled={bloque} onClick={()=>{setEdition(null);setErreur('');}}>Fermer le formulaire</button></div>
  </form>}
  {retrait&&!attente&&<div className="ra-information" role="group" aria-label="Confirmer le retrait"><p>Retirer « {retrait.titre} » des recommandations visibles ? La fiche restera dans l’administration.</p><div className="ed-actions"><button type="button" disabled={busy} onClick={()=>void sauvegarder('retire',{id:retrait.id,revision:retrait.revision,contenu:retrait})}>Confirmer le retrait</button><button type="button" disabled={busy} onClick={()=>setRetrait(null)}>Garder publiée</button></div></div>}
  {erreurListe?<p role="alert">La liste n’a pas pu être actualisée. Utilise « Actualiser la liste » avant de modifier une fiche.</p>:lignes===null?<p role="status">Chargement des recommandations…</p>:!lignes.length?<p>Aucune recommandation enregistrée. Commence par ajouter un livre ou une prédication.</p>:<div className="ra-liste">{lignes.map(r=><article key={r.id}><div className="ra-identite"><h2>{r.titre}</h2><span className="ed-badge">{r.etat==='publie'?'Publiée':r.etat==='retire'?'Retirée':'Brouillon'}</span></div><p>{r.auteur} · {r.langue==='fr'?'Français':'English'} · {CATEGORIES_RECOMMANDATIONS.find(c=>c[0]===r.categorie)?.[1]}</p><a href={r.url} target="_blank" rel="noopener noreferrer">Vérifier le lien ↗</a>{r.description&&<p>{r.description}</p>}<div className="ed-actions"><button type="button" disabled={bloque} aria-label={'Modifier — '+r.titre} onClick={()=>ouvrir(r)}>Modifier</button>{r.etat==='publie'&&<button type="button" disabled={bloque} aria-label={'Retirer — '+r.titre} onClick={()=>{setRetrait(r);setEdition(null);setErreur('');}}>Retirer de l’affichage</button>}</div></article>)}</div>}
 </section>;
}

