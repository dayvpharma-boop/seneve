import type {SymboleTrait} from '@/components/IconeTrait';

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
  avantages:[['Tout Sénevé','Everything in Sénevé'],['Le livre PDF et audio inclus','The PDF and audio book included'],['Formations 30 et 90 jours incluses','30- and 90-day trainings included'],['Livres et prédications recommandés','Recommended books and sermons']]},
 {id:'accompagnement',icone:'arbre',nom:['Accompagnement','Mentoring'],accroche:['Un suivi humain, personnel','Personal, human follow-up'],mois:200,an:2000,bonusAn:[['Le livre papier dédicacé','A signed paper book'],['3 mois à offrir à des proches','3 months to give to others'],['Prix garanti pendant 12 mois','Price locked for 12 months']],places:['Places limitées','Limited places'],
  avantages:[['Tout Sénevé Plus','Everything in Sénevé Plus'],['Réponses prioritaires de l’équipe','Priority answers from the team'],['Bilan mensuel personnalisé','Personal monthly review']]},
];
/** Valeur des contenus compris dans Sénevé Plus s'ils étaient achetés séparément (catalogue actuel, en USD). */
export const VALEUR_SEPAREE_PLUS=89+39+2.99+4.99;
/** Économie de l'année par rapport à 12 mois payés au mois. */
export const economieAn=(f:Formule)=>f.an?f.mois*12-f.an:0;
export const prixAnnuelMensualise=(f:Formule)=>f.an?Math.round(f.an/12*100)/100:null;
