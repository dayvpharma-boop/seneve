/** Règles candidates pour un service serveur. Ne jamais accepter les preuves ou
 * droits envoyés par un navigateur : ils doivent être lus dans la base autorisée.
 * Aucune durée de mois, facturation, inscription ni programmation automatique.
 */
export type CibleHabitude = Readonly<{
 participant_id:string; enrollment_id:string; programme_id:string; version:number;
 langue:string; occurrence_id:string; date_locale:string;
}>;
export type DroitHabitude = Readonly<{
 participant_id:string; enrollment_id:string; programme_id:string; version:number;
 langue:string; debut:string; fin_exclue:string;
 etat:'actif'|'revoque'; origine:'gratuit_valide'|'paiement_verifie';
}>;
export type AccesHabitude = Readonly<{
 cible:CibleHabitude; participant_authentifie:string|null;
 inscription_active:boolean; droit:DroitHabitude|null; maintenant:string;
}>;
function instant(s:string):number {
 // Require an explicit offset: no interpretation in a browser or host time zone.
 if(!/(Z|[+-]\d{2}:\d{2})$/.test(s))return NaN;
 return Date.parse(s);
}
export function verifierAccesHabitude(a:AccesHabitude): {autorise:boolean;motif:string} {
 const c=a.cible,d=a.droit;
 if(!a.participant_authentifie || a.participant_authentifie!==c.participant_id)return {autorise:false,motif:'compte_non_autorise'};
 if(!a.inscription_active)return {autorise:false,motif:'inscription_inactive'};
 if(!d || d.etat!=='actif')return {autorise:false,motif:'droit_absent_ou_revoque'};
 if(!['gratuit_valide','paiement_verifie'].includes(d.origine))return {autorise:false,motif:'preuve_absente'};
 if(['participant_id','enrollment_id','programme_id','version','langue'].some(k=>d[k as keyof DroitHabitude]!==c[k as keyof CibleHabitude]))return {autorise:false,motif:'droit_autre_parcours'};
 const now=instant(a.maintenant),debut=instant(d.debut),fin=instant(d.fin_exclue);
 if(![now,debut,fin].every(Number.isFinite)||fin<=debut)return {autorise:false,motif:'periode_invalide'};
 if(now<debut||now>=fin)return {autorise:false,motif:'hors_periode'};
 return {autorise:true,motif:'droit_actif'};
}
export type ContexteRappel = AccesHabitude & Readonly<{
 canal:'web_push'|'whatsapp'|'email'; consentement_valide:boolean; liaison_verifiee:boolean;
 creneau_utc:string; fin_creneau_utc:string; silence:boolean;
 etat_serveur:'non_commencee'|'preparee'|'partielle'|'realisee';
 deja_accepte_fournisseur:boolean;
}>;
export function verifierRappelHabitude(r:ContexteRappel):{envoyer:boolean;motif:string} {
 if(r.deja_accepte_fournisseur)return {envoyer:false,motif:'deja_accepte'};
 const acces=verifierAccesHabitude(r);
 if(!acces.autorise)return {envoyer:false,motif:acces.motif};
 if(!r.consentement_valide)return {envoyer:false,motif:'consentement_absent'};
 if(!r.liaison_verifiee)return {envoyer:false,motif:'canal_non_verifie'};
 if(r.silence)return {envoyer:false,motif:'heure_de_silence'};
 const now=instant(r.maintenant),debut=instant(r.creneau_utc),fin=instant(r.fin_creneau_utc);
 if(![now,debut,fin].every(Number.isFinite)||fin<=debut)return {envoyer:false,motif:'creneau_invalide'};
 if(now<debut||now>=fin)return {envoyer:false,motif:'hors_creneau'};
 if(!['non_commencee','preparee','partielle','realisee'].includes(r.etat_serveur))return {envoyer:false,motif:'etat_invalide'};
 if(r.etat_serveur==='realisee')return {envoyer:false,motif:'activite_realisee'};
 return {envoyer:true,motif:'eligible'};
}
export function cleRappelHabitude(c:CibleHabitude,canal:string,creneauUtc:string):string {
 const t=instant(creneauUtc);
 if(!Number.isFinite(t)||!['web_push','whatsapp','email'].includes(canal))throw new Error('Créneau ou canal invalide');
 if(!Number.isInteger(c.version)||c.version<1||!c.participant_id||!c.enrollment_id||!c.programme_id||!c.langue||!c.occurrence_id||!/^\d{4}-\d{2}-\d{2}$/.test(c.date_locale))throw new Error('Cible invalide');
 // JSON tuple avoids collisions if an identifier itself contains a separator.
 return JSON.stringify(['hd_rappel_v1',c.participant_id,c.enrollment_id,c.programme_id,c.version,c.langue,c.date_locale,c.occurrence_id,canal,new Date(t).toISOString()]);
}
