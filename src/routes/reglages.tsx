import {Profil} from '@/routes/profil';

/** « Mes réglages » (maquette validée par Dr Justin le 31/10/2026) : une seule page de réglages, en lignes qui s'ouvrent
 *  sur place. Elle partage le chargement, la session et la copie hors connexion du profil.
 *  ?parcours=<inscription> ouvre directement « Mes horaires Habitudes & Défis ». */
export function Reglages(){return <Profil vue="reglages"/>;}
