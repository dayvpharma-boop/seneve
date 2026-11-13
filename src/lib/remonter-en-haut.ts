/** Barre du bas (demande de Dr Justin du 13/11/2026) : toucher l'onglet de la page où l'on est déjà ramène en haut de la page,
 *  comme sur iPhone. Si l'adresse mène ailleurs (autre page, ou une vue intérieure comme un livre ouvert), on navigue normalement. */
export function dejaSurCettePage(lien:string,pathname:string,search:string):boolean{
 const cible=new URL(lien,'https://seneve.local');
 if(cible.pathname!==pathname)return false;
 const ici=new URLSearchParams(search);ici.delete('lang');
 const la=cible.searchParams;la.delete('lang');
 return ici.toString()===la.toString();
}

export function remonterEnHaut():void{
 const reduit=typeof window.matchMedia==='function'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const comportement:ScrollBehavior=reduit?'auto':'smooth';
 try{window.scrollTo({top:0,behavior:comportement});}catch{window.scrollTo(0,0);}
 // Certaines pages défilent dans un cadre intérieur : on le remonte aussi.
 document.querySelectorAll<HTMLElement>('main,[data-defile]').forEach(el=>{if(el.scrollTop>0){try{el.scrollTo({top:0,behavior:comportement});}catch{el.scrollTop=0;}}});
}
