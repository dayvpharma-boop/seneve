import type {Couleur} from './bible';

/** Surlignages, soulignements, notes et marque-pages du livre PDF (demande de Dr Justin du 04/11/2026),
 * sur le modèle de la Bible : gardés sur ce téléphone (localStorage), propres au compte et à la langue du livre.
 * Les zones sont relatives à la page (0 à 1), donc justes quelle que soit la taille de l'écran. */
export type Zone=[x:number,y:number,largeur:number,hauteur:number];
export type AnnotationLivre={id:string;page:number;zones:Zone[];extrait:string;couleur?:Couleur;souligne?:boolean;note?:string;modifie:string};
export type CarnetLivre={annotations:AnnotationLivre[];signets:number[]};
const VIDE:CarnetLivre={annotations:[],signets:[]};

export const cleCarnet=(userId:string,langue:'fr'|'en')=>`seneve:livre-annotations:v1:${userId}:${langue}`;
export function lireCarnet(cle:string):CarnetLivre{
 try{const c=JSON.parse(localStorage.getItem(cle)??'null') as Partial<CarnetLivre>|null;
  return {annotations:Array.isArray(c?.annotations)?c.annotations.filter(a=>a&&Number.isInteger(a.page)&&Array.isArray(a.zones)):[],signets:Array.isArray(c?.signets)?c.signets.filter(Number.isInteger):[]};}
 catch{return VIDE;}
}
export function ecrireCarnet(cle:string,c:CarnetLivre){try{localStorage.setItem(cle,JSON.stringify(c));}catch{/* stockage plein ou bloqué */}}
/** Une annotation disparaît quand il ne lui reste ni couleur, ni soulignement, ni note. */
export function garderAnnotation(c:CarnetLivre,a:AnnotationLivre):CarnetLivre{
 const autres=c.annotations.filter(x=>x.id!==a.id);
 const utile=!!a.couleur||!!a.souligne||!!a.note?.trim();
 return {...c,annotations:utile?[...autres,{...a,note:a.note?.trim()||undefined,modifie:new Date().toISOString()}].sort((x,y)=>x.page-y.page||x.zones[0]![1]-y.zones[0]![1]):autres};
}
export function basculerSignet(c:CarnetLivre,page:number):CarnetLivre{
 return {...c,signets:c.signets.includes(page)?c.signets.filter(p=>p!==page):[...c.signets,page].sort((a,b)=>a-b)};
}
/** Regroupe les rectangles d'une sélection par ligne (les navigateurs en renvoient souvent plusieurs par mot). */
export function zonesDepuisRectangles(rects:readonly {left:number;top:number;width:number;height:number}[],cadre:{left:number;top:number;width:number;height:number}):Zone[]{
 const lignes:Zone[]=[];
 for(const r of rects){
  if(r.width<1||r.height<1)continue;
  const z:Zone=[(r.left-cadre.left)/cadre.width,(r.top-cadre.top)/cadre.height,r.width/cadre.width,r.height/cadre.height];
  const meme=lignes.find(l=>Math.abs(l[1]-z[1])<z[3]*0.5&&Math.abs(l[3]-z[3])<z[3]*0.6);
  if(meme){const g=Math.min(meme[0],z[0]),d=Math.max(meme[0]+meme[2],z[0]+z[2]);meme[0]=g;meme[2]=d-g;}else lignes.push(z);
 }
 return lignes.map(z=>z.map(v=>Math.round(v*10000)/10000) as Zone);
}
export const dansZone=(x:number,y:number,z:Zone)=>x>=z[0]&&x<=z[0]+z[2]&&y>=z[1]-0.004&&y<=z[1]+z[3]+0.004;
