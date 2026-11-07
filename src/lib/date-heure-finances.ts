/** Date et heure lisibles dans les historiques financiers (demande de Dr Justin du 07/11/2026).
 * - `dateLocale` : le jour choisi par la personne (« 7 novembre 2026 ») ;
 * - `createdAt` : le moment où la saisie a été faite, à l'heure du téléphone (« 14:32 »).
 * Si la saisie a été faite un autre jour que la date choisie, on le précise : « noté le 9 novembre à 10:05 ». */
const ISO=/^\d{4}-\d{2}-\d{2}$/;
export function jourLisible(iso:string,en:boolean,annee=true){
 if(!ISO.test(iso))return iso;
 return new Intl.DateTimeFormat(en?'en-GB':'fr-FR',{day:'numeric',month:'long',...(annee?{year:'numeric'}:{}),timeZone:'UTC'}).format(new Date(iso+'T00:00:00Z'));
}
export function momentLisible(dateLocale:string,createdAt:string|null|undefined,en:boolean){
 const jour=jourLisible(dateLocale,en);
 const t=createdAt?new Date(createdAt):null;
 if(!t||Number.isNaN(t.getTime()))return jour;
 const heure=new Intl.DateTimeFormat(en?'en-GB':'fr-FR',{hour:'2-digit',minute:'2-digit'}).format(t);
 const jourSaisie=new Intl.DateTimeFormat('en-CA').format(t);
 if(jourSaisie===dateLocale)return `${jour} · ${heure}`;
 const autreJour=jourLisible(jourSaisie,en,jourSaisie.slice(0,4)!==dateLocale.slice(0,4));
 return en?`${jour} · recorded ${autreJour} at ${heure}`:`${jour} · noté le ${autreJour} à ${heure}`;
}
