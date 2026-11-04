import {useCallback,useEffect,useRef,useState,type PointerEvent as EvtPointeur} from 'react';
import type {PDFDocumentLoadingTask,PDFDocumentProxy,RenderTask,TextLayer} from 'pdfjs-dist';
import {COULEURS,type Couleur} from '@/lib/bible';
import {basculerSignet,dansZone,ecrireCarnet,garderAnnotation,lireCarnet,zonesDepuisRectangles,type AnnotationLivre,type CarnetLivre,type Zone} from '@/lib/livre-annotations';
import {IconeBibliotheque as I} from './IconeBibliotheque';
import {IconeBible as B} from './IconeBible';

type Selection={zones:Zone[];extrait:string};
/** Lecture du livre PDF dans l'application (décisions du 04/11/2026) : page par page sans téléchargement,
 * plein écran, page suivante en glissant le doigt, et comme pour la Bible : surligner (4 couleurs), souligner,
 * noter et marquer une page. Le carnet reste sur ce téléphone. pdf.js n'est chargé qu'à l'ouverture. */
export function LecteurPdfLivre({url,cleMemoire,cleAnnotations,en,pageDemandee}:{url:string;cleMemoire:string;cleAnnotations:string;en:boolean;pageDemandee?:number}){
 const l=(fr:string,english:string)=>en?english:fr;
 const [doc,setDoc]=useState<PDFDocumentProxy|null>(null),[erreur,setErreur]=useState(false);
 const [page,setPage]=useState(()=>{if(pageDemandee)return pageDemandee;try{return Math.max(1,Number(localStorage.getItem(cleMemoire))||1);}catch{return 1;}});
 const [plein,setPlein]=useState(false),[largeur,setLargeur]=useState(0);
 const [carnet,setCarnet]=useState<CarnetLivre>(()=>lireCarnet(cleAnnotations));
 const [selection,setSelection]=useState<Selection|null>(null),[edition,setEdition]=useState<AnnotationLivre|null>(null),[liste,setListe]=useState(false);
 const toile=useRef<HTMLCanvasElement>(null),texte=useRef<HTMLDivElement>(null),cadre=useRef<HTMLDivElement>(null),zone=useRef<HTMLDivElement>(null),racine=useRef<HTMLElement>(null);
 const doigt=useRef<{x:number;y:number}|null>(null);
 const total=doc?.numPages??0;
 const changerCarnet=useCallback((c:CarnetLivre)=>{setCarnet(c);ecrireCarnet(cleAnnotations,c);},[cleAnnotations]);
 const aller=useCallback((n:number)=>{setSelection(null);window.getSelection()?.removeAllRanges();setPage(p=>{const max=doc?.numPages||p;return Math.min(Math.max(1,n),max);});},[doc]);

 useEffect(()=>{if(pageDemandee){setPage(doc?Math.min(pageDemandee,doc.numPages):pageDemandee);racine.current?.scrollIntoView({block:'start',behavior:'smooth'});}},[pageDemandee]); // eslint-disable-line react-hooks/exhaustive-deps
 useEffect(()=>{
  let actif=true,tache:PDFDocumentLoadingTask|null=null;setDoc(null);setErreur(false);
  void(async()=>{
   const pdfjs=await import('pdfjs-dist');
   pdfjs.GlobalWorkerOptions.workerSrc=(await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
   tache=pdfjs.getDocument({url});
   const d=await tache.promise;
   if(actif){setDoc(d);setPage(p=>Math.min(p,d.numPages));}
  })().catch(()=>{if(actif)setErreur(true);});
  return()=>{actif=false;void tache?.destroy();};
 },[url]);
 // Largeur disponible : suit l'écran, la rotation et le passage en plein écran.
 useEffect(()=>{const z=zone.current;if(!z||typeof ResizeObserver==='undefined')return;const o=new ResizeObserver(()=>setLargeur(Math.floor(z.clientWidth)));o.observe(z);setLargeur(Math.floor(z.clientWidth));return()=>o.disconnect();},[plein,doc]);
 useEffect(()=>{
  if(!doc||!toile.current||!texte.current||!largeur)return;
  let rendu:RenderTask|null=null,couche:TextLayer|null=null,actif=true;
  void(async()=>{
   const pdfjs=await import('pdfjs-dist');
   const p=await doc.getPage(page);if(!actif)return;
   const base=p.getViewport({scale:1});
   // En plein écran, la page entière tient dans la hauteur ; sinon elle prend toute la largeur.
   const hauteurDispo=plein?window.innerHeight-132:Infinity;
   const echelle=Math.min(largeur/base.width,hauteurDispo/base.height);
   const vue=p.getViewport({scale:echelle}),dpr=Math.min(2,window.devicePixelRatio||1),vueNette=p.getViewport({scale:echelle*dpr});
   const c=toile.current!,k=cadre.current!;
   c.width=Math.floor(vueNette.width);c.height=Math.floor(vueNette.height);
   k.style.width=c.style.width=`${Math.floor(vue.width)}px`;k.style.height=c.style.height=`${Math.floor(vue.height)}px`;
   rendu=p.render({canvas:c,viewport:vueNette});
   const t=texte.current!;t.replaceChildren();t.style.setProperty('--total-scale-factor',String(echelle));t.style.setProperty('--scale-round-x','1px');t.style.setProperty('--scale-round-y','1px');
   couche=new pdfjs.TextLayer({textContentSource:p.streamTextContent(),container:t,viewport:vue});
   await Promise.all([rendu.promise,couche.render()]);
  })().catch(()=>{/* rendu annulé en changeant de page */});
  try{localStorage.setItem(cleMemoire,String(page));}catch{/* page non retenue */}
  return()=>{actif=false;rendu?.cancel();couche?.cancel();};
 },[doc,page,largeur,plein,cleMemoire]);
 // Plein écran : vrai plein écran quand le navigateur le permet, sinon le lecteur couvre l'écran de l'application.
 useEffect(()=>{
  if(!plein)return;
  const el=racine.current;if(el?.requestFullscreen&&!document.fullscreenElement)void el.requestFullscreen().catch(()=>undefined);
  const sortie=()=>{if(!document.fullscreenElement)setPlein(false);};
  document.addEventListener('fullscreenchange',sortie);document.body.style.overflow='hidden';
  return()=>{document.removeEventListener('fullscreenchange',sortie);document.body.style.overflow='';if(document.fullscreenElement)void document.exitFullscreen().catch(()=>undefined);};
 },[plein]);
 useEffect(()=>{
  if(!plein)return;
  const touche=(e:KeyboardEvent)=>{if(e.key==='ArrowRight')aller(page+1);else if(e.key==='ArrowLeft')aller(page-1);else if(e.key==='Escape')setPlein(false);};
  window.addEventListener('keydown',touche);return()=>window.removeEventListener('keydown',touche);
 },[plein,page,aller]);
 // Sélection du texte : la barre « Surligner · Souligner · Noter » apparaît au-dessus du passage.
 useEffect(()=>{
  let minuterie=0;
  const lire=()=>{window.clearTimeout(minuterie);minuterie=window.setTimeout(()=>{
   const s=window.getSelection(),t=texte.current,c=cadre.current;
   if(!s||s.isCollapsed||!t||!c||!s.rangeCount||!t.contains(s.anchorNode)){setSelection(null);return;}
   const zones=zonesDepuisRectangles([...s.getRangeAt(0).getClientRects()],c.getBoundingClientRect()).filter(z=>z[1]>=-0.01&&z[1]<=1);
   const extrait=s.toString().replace(/\s+/g,' ').trim().slice(0,600);
   setSelection(zones.length&&extrait?{zones,extrait}:null);
  },180);};
  document.addEventListener('selectionchange',lire);
  return()=>{window.clearTimeout(minuterie);document.removeEventListener('selectionchange',lire);};
 },[]);
 function creer(changement:Partial<AnnotationLivre>,ouvrir=false){
  if(!selection)return;
  const a:AnnotationLivre={id:crypto.randomUUID(),page,zones:selection.zones,extrait:selection.extrait,modifie:'',...changement};
  window.getSelection()?.removeAllRanges();setSelection(null);
  if(ouvrir){setEdition(a);return;}
  changerCarnet(garderAnnotation(carnet,a));
 }
 function enregistrer(a:AnnotationLivre){changerCarnet(garderAnnotation(carnet,a));setEdition(null);}
 function supprimer(a:AnnotationLivre){changerCarnet({...carnet,annotations:carnet.annotations.filter(x=>x.id!==a.id)});setEdition(null);}
 // Toucher un passage annoté l'ouvre ; glisser le doigt à gauche ou à droite change de page.
 function poser(e:EvtPointeur){if(e.pointerType==='touch'||e.pointerType==='pen')doigt.current={x:e.clientX,y:e.clientY};}
 function lever(e:EvtPointeur){
  const d=doigt.current;doigt.current=null;
  const s=window.getSelection();if(s&&!s.isCollapsed)return;
  if(d){const dx=e.clientX-d.x,dy=e.clientY-d.y;if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.5){aller(page+(dx<0?1:-1));return;}}
  const r=cadre.current?.getBoundingClientRect();if(!r||!r.width)return;
  const x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;
  const touchee=carnet.annotations.find(a=>a.page===page&&a.zones.some(z=>dansZone(x,y,z)));
  if(touchee)setEdition(touchee);
 }
 if(erreur)return <p role="alert" className="lp-erreur">{l('Le livre ne peut pas s’ouvrir pour le moment. Vérifie ta connexion puis réessaie.','The book cannot open right now. Check your connection and try again.')}</p>;
 const signet=carnet.signets.includes(page);
 const annotationsPage=carnet.annotations.filter(a=>a.page===page);
 const nomCouleur=(c:Couleur)=>{const x=COULEURS.find(k=>k.id===c)!;return en?x.en:x.fr;};
 return <section ref={racine} className={`lp-lecteur${plein?' lp-plein':''}`} aria-label={l('Lecture du livre','Reading the book')}>
  {plein&&<div className="lp-barre-haut"><span>{total?l(`Page ${page} sur ${total}`,`Page ${page} of ${total}`):''}</span><button type="button" onClick={()=>setPlein(false)} aria-label={l('Quitter le plein écran','Exit full screen')}><B nom="fullscreen_exit" taille={22}/></button></div>}
  <div ref={zone} className="lp-zone">
   {doc&&!plein&&<button type="button" className="lp-agrandir" onClick={()=>setPlein(true)} aria-label={l('Lire en plein écran','Read full screen')}><B nom="fullscreen" taille={22}/></button>}
   {/* Flèches sur les bords, à mi-hauteur (demande de Dr Justin du 04/11/2026) : à gauche pour revenir, à droite pour avancer. */}
   {doc&&<button type="button" className="lp-cote lp-cote-gauche" onClick={()=>aller(page-1)} disabled={page<=1} aria-label={l('Page précédente','Previous page')}><I nom="arrow_back" taille={22}/></button>}
   {doc&&<button type="button" className="lp-cote lp-cote-droite" onClick={()=>aller(page+1)} disabled={page>=total} aria-label={l('Page suivante','Next page')}><I nom="east" taille={22}/></button>}
   <div ref={cadre} className="lp-page" onContextMenu={e=>e.preventDefault()} onPointerDown={poser} onPointerUp={lever} onPointerCancel={()=>{doigt.current=null;}}>
    {!doc&&<p role="status" className="lp-chargement">{l('Ouverture du livre…','Opening the book…')}</p>}
    <canvas ref={toile} aria-hidden="true"/>
    <div className="lp-marques" aria-hidden="true">{annotationsPage.flatMap(a=>a.zones.map((z,i)=><span key={a.id+i} className={`${a.couleur?`lp-surligne lp-c-${a.couleur}`:''}${a.souligne?' lp-souligne':''}${a.note&&i===a.zones.length-1?' lp-a-note':''}`} style={{left:`${z[0]*100}%`,top:`${z[1]*100}%`,width:`${z[2]*100}%`,height:`${z[3]*100}%`}}/>))}</div>
    <div ref={texte} className="lp-texte" aria-label={total?l(`Texte de la page ${page} sur ${total}`,`Text of page ${page} of ${total}`):undefined}/>
    {selection&&<div className="lp-outils" role="toolbar" aria-label={l('Annoter la sélection','Annotate the selection')} style={{top:`max(4px, calc(${selection.zones[0]![1]*100}% - 56px))`}}>
     {COULEURS.map(c=><button key={c.id} type="button" className={`lp-pastille lp-c-${c.id}`} onClick={()=>creer({couleur:c.id})} aria-label={l(`Surligner en ${c.fr.toLowerCase()}`,`Highlight in ${c.en.toLowerCase()}`)}/>)}
     <button type="button" onClick={()=>creer({souligne:true})} aria-label={l('Souligner','Underline')}><B nom="format_underlined" taille={20}/></button>
     <button type="button" onClick={()=>creer({couleur:'or'},true)} aria-label={l('Ajouter une note','Add a note')}><B nom="edit_note" taille={20}/></button>
    </div>}
   </div>
  </div>
  {doc&&<nav className="lp-commandes" aria-label={l('Pages et outils','Pages and tools')}>
   <label className="lp-numero"><span className="sr-only">{l('Aller à la page','Go to page')}</span><input type="number" inputMode="numeric" min={1} max={total} value={page} onChange={e=>aller(Number(e.target.value)||1)}/><span>/ {total}</span></label>
   <span className="lp-separateur" aria-hidden="true"/>
   <button type="button" aria-pressed={signet} className={signet?'lp-actif':undefined} onClick={()=>changerCarnet(basculerSignet(carnet,page))} aria-label={signet?l('Retirer le marque-page','Remove bookmark'):l('Marquer cette page','Bookmark this page')}><B nom="bookmark" taille={20}/></button>
   <button type="button" onClick={()=>setListe(true)} aria-label={l('Mes notes et marque-pages','My notes and bookmarks')}><B nom="draw" taille={20}/></button>
  </nav>}
  {doc&&!plein&&<p className="lp-astuce">{l('Glisse le doigt pour tourner les pages. Sélectionne un passage pour le surligner, le souligner ou le noter.','Swipe to turn pages. Select a passage to highlight, underline or add a note.')}</p>}
  {edition&&<div className="lp-feuille" role="dialog" aria-modal="true" aria-label={l('Annotation','Annotation')}>
   <div className="lp-feuille-corps">
    <blockquote>« {edition.extrait} »</blockquote>
    <div className="lp-couleurs" role="group" aria-label={l('Couleur','Colour')}>
     {COULEURS.map(c=><button key={c.id} type="button" className={`lp-pastille lp-c-${c.id}`} aria-pressed={edition.couleur===c.id} onClick={()=>setEdition({...edition,couleur:edition.couleur===c.id?undefined:c.id})} aria-label={nomCouleur(c.id)}/>)}
     <button type="button" aria-pressed={!!edition.souligne} onClick={()=>setEdition({...edition,souligne:!edition.souligne})} aria-label={l('Souligner','Underline')}><B nom="format_underlined" taille={20}/></button>
    </div>
    <label className="lp-note">{l('Ma note','My note')}<textarea rows={4} value={edition.note??''} onChange={e=>setEdition({...edition,note:e.target.value})} placeholder={l('Ce que ce passage me dit…','What this passage says to me…')}/></label>
    <div className="lp-feuille-actions">
     <button type="button" className="lp-principal" onClick={()=>enregistrer(edition)}>{l('Enregistrer','Save')}</button>
     <button type="button" onClick={()=>setEdition(null)}>{l('Annuler','Cancel')}</button>
     {carnet.annotations.some(a=>a.id===edition.id)&&<button type="button" className="lp-supprimer" onClick={()=>supprimer(edition)} aria-label={l('Supprimer cette annotation','Delete this annotation')}><B nom="delete" taille={20}/></button>}
    </div>
   </div>
  </div>}
  {liste&&<div className="lp-feuille" role="dialog" aria-modal="true" aria-label={l('Mes notes et marque-pages','My notes and bookmarks')}>
   <div className="lp-feuille-corps">
    <div className="lp-feuille-titre"><h2>{l('Mes notes et marque-pages','My notes and bookmarks')}</h2><button type="button" onClick={()=>setListe(false)} aria-label={l('Fermer','Close')}><B nom="close" taille={22}/></button></div>
    <p className="lp-astuce">{l('Gardés sur ce téléphone, comme dans la Bible.','Kept on this phone, as in the Bible.')}</p>
    {!carnet.annotations.length&&!carnet.signets.length?<p>{l('Rien pour l’instant. Sélectionne un passage du livre pour commencer.','Nothing yet. Select a passage of the book to begin.')}</p>:<ul className="lp-liste">
     {carnet.signets.map(p=><li key={'s'+p}><button type="button" onClick={()=>{setListe(false);aller(p);}}><B nom="bookmark" taille={18}/><span>{l(`Marque-page · page ${p}`,`Bookmark · page ${p}`)}</span></button></li>)}
     {carnet.annotations.map(a=><li key={a.id}><button type="button" onClick={()=>{setListe(false);aller(a.page);}}><span className={`lp-pastille-mini${a.couleur?` lp-c-${a.couleur}`:' lp-souligne-mini'}`} aria-hidden="true"/><span><strong>{l(`Page ${a.page}`,`Page ${a.page}`)}</strong> — « {a.extrait.slice(0,120)}{a.extrait.length>120?'…':''} »{a.note&&<em>{a.note}</em>}</span></button></li>)}
    </ul>}
   </div>
  </div>}
 </section>;
}
