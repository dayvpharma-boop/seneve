/** Jour Habitudes & Défis calculé à partir des périodes d'accès — même règle que seneve.hd_debuts_mois côté serveur.
 * Mois 1 : commence à date_debut. Mois suivant : 30 jours plus tard, plus les jours de coupure quand l'abonnement a été
 * payé en retard (décision du 26/10/2026 : « il reprend où il était »). Sans coupure : jour = date - date_debut + 1. */
export type PeriodeHabitudes={mois:number;debut:string;fin_exclue:string};
export type DebutMois={mois:number;debut:string};
const JOUR=86400000;
const versJour=(iso:string)=>Date.parse(iso+'T00:00:00Z')/JOUR;
const versIso=(n:number)=>new Date(n*JOUR).toISOString().slice(0,10);
/** Date locale « AAAA-MM-JJ » d'un instant dans le fuseau du participant. */
export function dateLocale(instant:number,fuseau:string):string{
 const parts=new Intl.DateTimeFormat('en',{timeZone:fuseau,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(instant));
 const p=(t:string)=>parts.find(x=>x.type===t)!.value;
 return `${p('year')}-${p('month')}-${p('day')}`;
}
export function debutsMois(dateDebut:string,periodes:PeriodeHabitudes[],fuseau:string):DebutMois[]{
 const tri=[...periodes].sort((a,b)=>a.mois-b.mois);
 const res:DebutMois[]=[];let s=0,precMois:number|null=null,precFin=0;
 for(const p of tri){
  if(precMois===null)s=versJour(dateDebut)+30*(p.mois-1);
  else s=s+30*(p.mois-precMois)+Math.max(0,versJour(dateLocale(Date.parse(p.debut),fuseau))-precFin);
  res.push({mois:p.mois,debut:versIso(s)});
  precMois=p.mois;precFin=versJour(dateLocale(Date.parse(p.fin_exclue)-1,fuseau));
 }
 return res;
}
/** Jour du parcours pour une date locale ; calcul civil si aucune période n'est connue. */
export function jourHabitudes(dateDebut:string,debuts:DebutMois[],date:string):number{
 const m=[...debuts].sort((a,b)=>b.mois-a.mois).find(x=>x.debut<=date);
 return m?30*(m.mois-1)+(versJour(date)-versJour(m.debut))+1:versJour(date)-versJour(dateDebut)+1;
}
/** Date locale d'un jour du parcours. */
export function dateDuJourHabitudes(dateDebut:string,debuts:DebutMois[],jour:number):string{
 const mois=Math.floor((jour-1)/30)+1;
 const m=[...debuts].sort((a,b)=>b.mois-a.mois).find(x=>x.mois<=mois);
 return m?versIso(versJour(m.debut)+jour-30*(m.mois-1)-1):versIso(versJour(dateDebut)+jour-1);
}
/** Calendrier d'un parcours HD : même forme que calendrierHabitudes, le dernier jour étant celui où finit la dernière période. */
export function calendrierPeriodes(dateDebut:string,periodes:PeriodeHabitudes[],fuseau:string,dureeSansPeriode:number,now:Date=new Date()){
 const debuts=debutsMois(dateDebut,periodes,fuseau);
 const date_locale=dateLocale(+now,fuseau);
 const raw=jourHabitudes(dateDebut,debuts,date_locale);
 const derniere=[...periodes].sort((a,b)=>b.mois-a.mois)[0];
 const total=derniere?jourHabitudes(dateDebut,debuts,dateLocale(Date.parse(derniere.fin_exclue)-1,fuseau)):dureeSansPeriode;
 return {date_locale,raw,total,debuts,day:Math.max(1,Math.min(raw,total)),notStarted:raw<1,finished:raw>total,joursOuverts:Math.max(0,Math.min(raw,total))};
}
