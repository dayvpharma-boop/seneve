/** Planning de lecture, sans écriture ni validation d’activité.
 * Les dates sont des dates civiles déjà calculées dans le fuseau du participant.
 * Dans ce modèle, valide_au est inclusif ; tout adaptateur doit conserver cette convention.
 */
export type ContextePlanningHabitudes={participant_id:string;module_id:string;version:number;langue:string;date_locale:string;fuseau:string};
type VersionPlanning={module_id:string;version:number;langue:string};
export type ModelePlanningHabitude=VersionPlanning&{habit_key:string;libelle:string;heure_proposee:string|null;jours_iso:readonly number[]};
export type HorairePersonnelHabitude=VersionPlanning&{participant_id:string;habit_key:string;creneau_id:string;heure_locale:string;jours_iso:readonly number[];fuseau:string;valide_du:string;valide_au:string|null};
export type RendezVousHabitude={habit_key:string;creneau_id:string;libelle:string;heure_locale:string;origine:'proposition'|'personnel'};
function dateCivile(s:string){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||!Number.isFinite(Date.parse(s+'T00:00:00Z'))||new Date(s+'T00:00:00Z').toISOString().slice(0,10)!==s)throw new Error('Date civile invalide');
 return new Date(s+'T00:00:00Z');
}
function heure(s:string){if(!/^([01]\d|2[0-3]):[0-5]\d(?::00)?$/.test(s))throw new Error('Horaire invalide');return s.slice(0,5);}
function jours(j:readonly number[]){if(!j.length||j.length>7||j.some(n=>!Number.isInteger(n)||n<1||n>7)||new Set(j).size!==j.length)throw new Error('Jours de semaine invalides');}
function memeVersion(a:VersionPlanning,b:VersionPlanning){return a.module_id===b.module_id&&a.version===b.version&&a.langue===b.langue;}
export function planningHabitudesPourDate(ctx:ContextePlanningHabitudes,modeles:readonly ModelePlanningHabitude[],horaires:readonly HorairePersonnelHabitude[]){
 if(!ctx.participant_id||!ctx.module_id||!ctx.langue||!Number.isInteger(ctx.version)||ctx.version<1)throw new Error('Contexte de planning invalide');
 const date=dateCivile(ctx.date_locale),jour=date.getUTCDay()||7;
 new Intl.DateTimeFormat('fr',{timeZone:ctx.fuseau});
 const refs=new Map<string,ModelePlanningHabitude>();
 for(const m of modeles.filter(m=>memeVersion(m,ctx))){
  if(!m.habit_key||!m.libelle||refs.has(m.habit_key))throw new Error('Modèle de planning ambigu');jours(m.jours_iso);if(m.heure_proposee!==null)heure(m.heure_proposee);refs.set(m.habit_key,m);
 }
 const personnels=new Map<string,HorairePersonnelHabitude[]>();
 for(const h of horaires.filter(h=>memeVersion(h,ctx)&&h.participant_id===ctx.participant_id)){
  if(!refs.has(h.habit_key)||!h.creneau_id)throw new Error('Horaire sans modèle ou créneau');
  dateCivile(h.valide_du);if(h.valide_au!==null){dateCivile(h.valide_au);if(h.valide_au<h.valide_du)throw new Error('Période de planning invalide');}
  jours(h.jours_iso);heure(h.heure_locale);
  if(h.valide_du>ctx.date_locale||h.valide_au!==null&&h.valide_au<ctx.date_locale)continue;
  if(h.fuseau!==ctx.fuseau)throw new Error('Fuseau du planning incohérent');
  const groupe=personnels.get(h.habit_key)??[];
  if(groupe.some(x=>x.creneau_id===h.creneau_id))throw new Error('Périodes de planning superposées');
  groupe.push(h);personnels.set(h.habit_key,groupe);
 }
 const rendezVous:RendezVousHabitude[]=[];
 for(const m of refs.values()){
  const groupe=personnels.get(m.habit_key);
  if(groupe){
   // Un ensemble personnel remplace entièrement la proposition de cette habitude.
   for(const h of groupe)if(h.jours_iso.includes(jour))rendezVous.push({habit_key:m.habit_key,creneau_id:h.creneau_id,libelle:m.libelle,heure_locale:heure(h.heure_locale),origine:'personnel'});
  }else if(m.heure_proposee!==null&&m.jours_iso.includes(jour))rendezVous.push({habit_key:m.habit_key,creneau_id:'proposition',libelle:m.libelle,heure_locale:heure(m.heure_proposee),origine:'proposition'});
 }
 rendezVous.sort((a,b)=>a.heure_locale.localeCompare(b.heure_locale)||a.habit_key.localeCompare(b.habit_key)||a.creneau_id.localeCompare(b.creneau_id));
 const groupes=new Map<string,RendezVousHabitude[]>();for(const r of rendezVous)groupes.set(r.heure_locale,[...(groupes.get(r.heure_locale)??[]),r]);
 // Signalement seulement ; les durées inconnues, notamment de prière, ne sont jamais inventées.
 return {date_locale:ctx.date_locale,fuseau:ctx.fuseau,rendezVous,simultanes:[...groupes.values()].filter(g=>g.length>1)};
}
