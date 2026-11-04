import type {SymboleTrait} from '@/components/IconeTrait';
import {supabase} from './supabase';

/** Formules d'abonnement proposées à Dr Justin le 04/11/2026 (maquette, prix et noms à valider).
 * De la graine à l'arbre : chaque formule comprend la précédente. Aucun prélèvement automatique :
 * on renouvelle soi-même (cahier Habitudes & Défis, « aucun paiement automatique sans accord »). */
export type IdFormule='graine'|'senev'|'plus'|'accompagnement';
export type Formule={id:IdFormule;icone:SymboleTrait;nom:[string,string];accroche:[string,string];mois:number;an:number|null;avantages:[string,string][];badge?:[string,string];places?:[string,string];
 /** Avantages réservés à l'abonnement annuel, en plus des 2 mois offerts (proposition du 04/11/2026). */
 bonusAn?:[string,string][]};
export const FORMULES:readonly Formule[]=[
 {id:'graine',icone:'graine',nom:['Graine','Seed'],accroche:['Pour commencer, sans payer','To begin, free of charge'],mois:0,an:null,
  avantages:[['Habitudes & Défis : le 1er mois','Habits & Challenges: the 1st month'],['Test des 7 Racines','The 7 Roots Test'],['Bible, journal privé et rappels','Bible, private journal and reminders']]},
 {id:'senev',icone:'pousse',nom:['Sénevé','Sénevé'],accroche:['Pour avancer chaque jour','To grow every day'],mois:5,an:50,bonusAn:[['Le livre PDF offert','The PDF book, free'],['1 mois à offrir à un proche','1 month to give to someone'],['Prix garanti pendant 12 mois','Price locked for 12 months']],
  avantages:[['Habitudes & Défis en entier, mois après mois','Habits & Challenges in full, month after month'],['Bilans de la semaine et du mois','Weekly and monthly reviews'],['Coach pour comprendre et reprendre','Coach to understand and start again']]},
 {id:'plus',icone:'tige',nom:['Sénevé Plus','Sénevé Plus'],accroche:['Tout le contenu, en un seul abonnement','All the content, in one subscription'],mois:20,an:200,bonusAn:[['2 mois à offrir à des proches','2 months to give to others'],['Bilan annuel personnalisé','Personal yearly review'],['Prix garanti pendant 12 mois','Price locked for 12 months']],badge:['Le plus choisi','Most chosen'],
  // Liste détaillée à la demande de Dr Justin (04/11/2026) : à 20 $, chaque service est nommé, coach compris.
  avantages:[['Habitudes & Défis en entier, mois après mois','Habits & Challenges in full, month after month'],['Coach personnel : comprendre ses habitudes et reprendre après un écart','Personal coach: understand your habits and start again after a slip'],['Bilans de la semaine et du mois','Weekly and monthly reviews'],['Le livre « Arrête de mendier des miracles » en PDF, à lire dans l’application','The book “Stop Begging for Miracles” as a PDF, to read in the app'],['Le même livre en audio, à écouter partout','The same book as audio, to listen to anywhere'],['Formation 30 jours incluse','30-day training included'],['Formation 90 jours incluse','90-day training included'],['Livres et prédications recommandés chaque mois','Recommended books and sermons every month'],['Bible, journal privé, rappels et Test des 7 Racines','Bible, private journal, reminders and the 7 Roots Test']]},
 {id:'accompagnement',icone:'arbre',nom:['Accompagnement','Mentoring'],accroche:['Un suivi humain, personnel','Personal, human follow-up'],mois:200,an:2000,bonusAn:[['Le livre papier dédicacé','A signed paper book'],['3 mois à offrir à des proches','3 months to give to others'],['Prix garanti pendant 12 mois','Price locked for 12 months']],places:['Places limitées','Limited places'],
  avantages:[['Tout Sénevé Plus','Everything in Sénevé Plus'],['Réponses prioritaires de l’équipe','Priority answers from the team'],['Bilan mensuel personnalisé','Personal monthly review']]},
];
/** Valeur des contenus compris dans Sénevé Plus s'ils étaient achetés séparément (catalogue actuel, en USD). */
export const VALEUR_SEPAREE_PLUS=89+39+2.99+4.99;
/** Économie de l'année par rapport à 12 mois payés au mois. */
export const economieAn=(f:Formule)=>f.an?f.mois*12-f.an:0;
export const prixAnnuelMensualise=(f:Formule)=>f.an?Math.round(f.an/12*100)/100:null;

/** Ce que renvoie seneve.mon_abonnement() (seneve_063) : formule en cours ou la dernière, période payée
 * (ou le mois gratuit), achats hors abonnement, et liens Chariow déjà créés par Dr Justin. */
export type AchatAbonnement={offre_id:string;produit:string;type_offre:string;le:string};
export type MonAbonnement={formule:IdFormule;periode:'mois'|'an'|null;debut:string|null;fin:string|null;achats:AchatAbonnement[];liens:Record<string,string>};
const CODES:Record<Exclude<IdFormule,'graine'>,string>={senev:'SENEVE',plus:'PLUS',accompagnement:'ACCOMP'};
/** Offre Chariow d'une formule : ABONNEMENT_PLUS_AN_FR… */
export const offreAbonnement=(f:Exclude<IdFormule,'graine'>,periode:'mois'|'an',langue:'fr'|'en')=>`ABONNEMENT_${CODES[f]}_${periode==='an'?'AN':'MOIS'}_${langue.toUpperCase()}`;
export function lireMonAbonnement(d:unknown):MonAbonnement{
 const o=(d&&typeof d==='object'?d:{}) as Record<string,unknown>;
 const formule=FORMULES.some(f=>f.id===o.formule)?o.formule as IdFormule:'graine';
 const texte=(v:unknown)=>typeof v==='string'&&v?v:null;
 const achats=Array.isArray(o.achats)?o.achats.filter((a):a is AchatAbonnement=>!!a&&typeof a.offre_id==='string'&&typeof a.produit==='string'):[];
 const liens=o.liens&&typeof o.liens==='object'?Object.fromEntries(Object.entries(o.liens as Record<string,unknown>).filter((e):e is [string,string]=>typeof e[1]==='string'&&/^https:\/\//.test(e[1]))):{};
 return {formule,periode:o.periode==='an'||o.periode==='mois'?o.periode:null,debut:texte(o.debut),fin:texte(o.fin),achats,liens};
}
export async function chargerMonAbonnement():Promise<MonAbonnement>{
 const r=await supabase.rpc('mon_abonnement');
 if(r.error)throw r.error;
 return lireMonAbonnement(r.data);
}
