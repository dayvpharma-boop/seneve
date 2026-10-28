export type ContexteBilanHabitudes={type:'semaine'|'mois';numero:number;inscription:string};
/** Contexte de navigation uniquement ; les droits restent contrôlés par le journal côté serveur. */
export function contexteBilanHabitudes(params:URLSearchParams):ContexteBilanHabitudes|null{
 const type=params.get('bilan'),inscription=params.get('inscription')??'',n=params.get('periode')??'';
 if(params.get('depuis')!=='habitudes'||params.has('activite')||params.has('gratitude')||!['semaine','mois'].includes(type??'')||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(inscription)||!/^\d{1,2}$/.test(n))return null;
 const numero=Number(n);if(numero<1||numero>(type==='mois'?6:26))return null;
 return {type:type as 'semaine'|'mois',numero,inscription};
}
export const cleBrouillonBilan=(b:ContexteBilanHabitudes)=>`journal:bilan:${b.inscription}:${b.type}:${b.numero}`;
