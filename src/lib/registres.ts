import type {Dashboard} from '@/components/PilotageAdmin';
import type {StaffRequest} from './admin';

/** Export limité aux champs opérationnels, sans nom, contact ni contenu spirituel. */
export function csvRegistre(page:'demandes'|'participants'|'achats',rows:StaffRequest[]|Dashboard['relances']|Dashboard['achats']):string {
 const cell=(v:unknown)=>{let t=String(v??'');if(/^[\s]*[=+@-]/.test(t))t="'"+t;return '"'+t.replace(/"/g,'""')+'"';};
 const lignes:unknown[][]=page==='demandes'
 ?[['Référence','Création','Statut','Langue'],...(rows as StaffRequest[]).map(r=>[r.request_id,r.cree_le,r.etat,r.langue])]
 :page==='participants'
 ?[['Référence parcours','Programme','Jour atteint','Durée','Jours sans activité'],...(rows as Dashboard['relances']).map(r=>[r.enrollment_id,r.programme_id,r.jour,r.duree,r.jours_sans_activite])]
 :[['Référence paiement','Commande','Offre','Traitement','Réception'],...(rows as Dashboard['achats']).map(a=>[a.payment_event_id,a.id_evenement,a.offre_id,a.statut_traitement,a.recu_le])];
 return '\uFEFF'+lignes.map(l=>l.map(cell).join(';')).join('\r\n');
}
export function telechargerRegistre(page:'demandes'|'participants'|'achats',rows:StaffRequest[]|Dashboard['relances']|Dashboard['achats']) {
 const url=URL.createObjectURL(new Blob([csvRegistre(page,rows)],{type:'text/csv;charset=utf-8'}));
 const a=document.createElement('a');a.href=url;a.download=`seneve-${page}-${new Date().toISOString().slice(0,10)}.csv`;a.click();
 window.setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function pageRegistre<T>(rows:T[],page:number,taille=10){const pages=Math.max(1,Math.ceil(rows.length/taille)),courante=Math.min(Math.max(1,page),pages);return {pages,courante,rows:rows.slice((courante-1)*taille,courante*taille)};}
