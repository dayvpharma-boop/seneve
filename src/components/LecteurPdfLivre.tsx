import {useEffect,useRef,useState} from 'react';
import type {PDFDocumentLoadingTask,PDFDocumentProxy,RenderTask} from 'pdfjs-dist';
import {IconeBibliotheque as I} from './IconeBibliotheque';

/** Lecture du livre PDF page par page dans l'application, sans bouton de téléchargement (décision du 04/11/2026).
 * pdf.js n'est chargé qu'à l'ouverture du lecteur ; la page lue est retenue sur l'appareil. */
export function LecteurPdfLivre({url,cleMemoire,en}:{url:string;cleMemoire:string;en:boolean}){
 const l=(fr:string,english:string)=>en?english:fr;
 const [doc,setDoc]=useState<PDFDocumentProxy|null>(null),[erreur,setErreur]=useState(false);
 const [page,setPage]=useState(()=>{try{return Math.max(1,Number(localStorage.getItem(cleMemoire))||1);}catch{return 1;}});
 const toile=useRef<HTMLCanvasElement>(null),cadre=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  let actif=true,tache:PDFDocumentLoadingTask|null=null;setDoc(null);setErreur(false);
  void(async()=>{
   const pdfjs=await import('pdfjs-dist');
   pdfjs.GlobalWorkerOptions.workerSrc=(await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
   tache=pdfjs.getDocument({url,isEvalSupported:false});
   const d=await tache.promise;
   if(actif){setDoc(d);setPage(p=>Math.min(p,d.numPages));}
  })().catch(()=>{if(actif)setErreur(true);});
  return()=>{actif=false;void tache?.destroy();};
 },[url]);
 useEffect(()=>{
  if(!doc||!toile.current||!cadre.current)return;
  let rendu:RenderTask|null=null;
  void(async()=>{
   const p=await doc.getPage(page);
   const largeur=cadre.current!.clientWidth,base=p.getViewport({scale:1});
   const dpr=Math.min(2,window.devicePixelRatio||1),vue=p.getViewport({scale:largeur/base.width*dpr});
   const c=toile.current!;c.width=Math.floor(vue.width);c.height=Math.floor(vue.height);
   c.style.width=`${largeur}px`;c.style.height=`${Math.floor(vue.height/dpr)}px`;
   rendu=p.render({canvas:c,viewport:vue});await rendu.promise;
  })().catch(()=>{/* rendu annulé en changeant de page */});
  try{localStorage.setItem(cleMemoire,String(page));}catch{/* page non retenue */}
  return()=>{rendu?.cancel();};
 },[doc,page,cleMemoire]);
 if(erreur)return <p role="alert" className="lp-erreur">{l('Le livre ne peut pas s’ouvrir pour le moment. Vérifie ta connexion puis réessaie.','The book cannot open right now. Check your connection and try again.')}</p>;
 const total=doc?.numPages??0;
 const aller=(n:number)=>{setPage(Math.min(Math.max(1,n),total||1));cadre.current?.scrollIntoView({block:'start',behavior:'smooth'});};
 return <section className="lp-lecteur" aria-label={l('Lecture du livre','Reading the book')}>
  <div ref={cadre} className="lp-page" onContextMenu={e=>e.preventDefault()}>
   {!doc&&<p role="status" className="lp-chargement">{l('Ouverture du livre…','Opening the book…')}</p>}
   <canvas ref={toile} aria-label={total?l(`Page ${page} sur ${total}`,`Page ${page} of ${total}`):undefined} role="img"/>
  </div>
  {doc&&<nav className="lp-commandes" aria-label={l('Pages','Pages')}>
   <button type="button" onClick={()=>aller(page-1)} disabled={page<=1} aria-label={l('Page précédente','Previous page')}><I nom="arrow_back" taille={20}/></button>
   <label className="lp-numero"><span className="sr-only">{l('Aller à la page','Go to page')}</span><input type="number" inputMode="numeric" min={1} max={total} value={page} onChange={e=>aller(Number(e.target.value)||1)}/><span>/ {total}</span></label>
   <button type="button" onClick={()=>aller(page+1)} disabled={page>=total} aria-label={l('Page suivante','Next page')}><I nom="east" taille={20}/></button>
  </nav>}
 </section>;
}
